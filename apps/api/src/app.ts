import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import argon2 from "argon2";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createWriteStream, createReadStream, mkdirSync, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import type { Server as IOServer } from "socket.io";
import { prisma } from "./db.js";
import { maskContacts } from "./mask.js";
import { actorFor, canTransition, chatOpen } from "./bookingRules.js";
import { averageRating, canReviewBooking, ratingBreakdown, withinEditWindow } from "./reviewRules.js";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve("uploads");
const COOKIE = "session";

interface Session {
  id: string;
  role: "CUSTOMER" | "TALENT" | "ADMIN";
}
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: Session;
    user: Session;
  }
}

export function buildApp(getIO: () => IOServer | null = () => null) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test", trustProxy: true });
  mkdirSync(UPLOAD_DIR, { recursive: true });

  app.register(cookie);
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    cookie: { cookieName: COOKIE, signed: false },
    sign: { expiresIn: "7d" },
  });
  app.register(rateLimit, { global: false });
  app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 2 } });

  const auth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { status: true, role: true } });
    if (!u || u.status !== "ACTIVE") return reply.code(401).send({ error: "unauthorized" });
    req.user.role = u.role;
  };
  const adminOnly = async (req: FastifyRequest, reply: FastifyReply) => {
    await auth(req, reply);
    if (!reply.sent && req.user.role !== "ADMIN") return reply.code(403).send({ error: "forbidden" });
  };

  const setSession = (reply: FastifyReply, s: Session) =>
    reply.setCookie(COOKIE, app.jwt.sign(s), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

  const publicUser = (u: { id: string; email: string; name: string; role: string; locale: string; idStatus: string }) => ({
    id: u.id, email: u.email, name: u.name, role: u.role, locale: u.locale, idStatus: u.idStatus,
  });

  app.get("/api/health", async () => ({ ok: true }));

  // ---------- auth ----------
  const registerSchema = z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(80),
    role: z.enum(["CUSTOMER", "TALENT"]).default("CUSTOMER"),
    locale: z.enum(["vi", "en"]).default("vi"),
  });
  app.post("/api/auth/register", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    if (await prisma.user.findUnique({ where: { email: p.data.email } }))
      return reply.code(409).send({ error: "email_taken" });
    const user = await prisma.user.create({
      data: {
        email: p.data.email, name: p.data.name, role: p.data.role, locale: p.data.locale,
        passwordHash: await argon2.hash(p.data.password),
      },
    });
    setSession(reply, { id: user.id, role: user.role });
    return publicUser(user);
  });

  app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = z.object({ email: z.string().email().toLowerCase(), password: z.string() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const user = await prisma.user.findUnique({ where: { email: p.data.email } });
    if (!user || user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, p.data.password)))
      return reply.code(401).send({ error: "bad_credentials" });
    setSession(reply, { id: user.id, role: user.role });
    return publicUser(user);
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/me", { preHandler: auth }, async (req) => {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, include: { talent: true } });
    return { ...publicUser(u), talent: u.talent };
  });

  // ---------- activities ----------
  app.get("/api/activities", async () => prisma.activity.findMany({ orderBy: { slug: "asc" } }));

  // ---------- talents ----------
  const publicTalent = (t: {
    userId: string; displayName: string; gender: string; age: number; bio: string; heightCm: number | null;
    style: string; languages: string[]; hourlyPrice: number; photos: string[]; activities: string[];
    availability: string; district: string; sticker: string; availableNow: boolean; ratingAvg: number; ratingCount: number; user?: { idStatus: string };
  }) => ({
    id: t.userId, displayName: t.displayName, gender: t.gender, age: t.age, bio: t.bio, heightCm: t.heightCm,
    style: t.style, languages: t.languages, hourlyPrice: t.hourlyPrice, photos: t.photos,
    activities: t.activities, availability: t.availability, district: t.district,
    sticker: t.sticker, availableNow: t.availableNow, ratingAvg: t.ratingAvg, ratingCount: t.ratingCount, verified: t.user?.idStatus === "APPROVED",
  });

  const listQuery = z.object({
    gender: z.string().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    activity: z.string().optional(),
    q: z.string().max(60).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(["name", "rating"]).optional(),
  });
  app.get("/api/talents", async (req, reply) => {
    const p = listQuery.safeParse(req.query);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const { gender, minPrice, maxPrice, activity, q, minRating, sort } = p.data;
    const rows = await prisma.talentProfile.findMany({
      where: {
        published: true,
        user: { status: "ACTIVE" },
        ...(gender ? { gender } : {}),
        ...(activity ? { activities: { has: activity } } : {}),
        ...(q ? { displayName: { contains: q, mode: "insensitive" as const } } : {}),
        ...(minRating ? { ratingAvg: { gte: minRating }, ratingCount: { gt: 0 } } : {}),
        hourlyPrice: { gte: minPrice ?? 0, ...(maxPrice !== undefined ? { lte: maxPrice } : {}) },
      },
      include: { user: { select: { idStatus: true } } },
      orderBy: sort === "rating" ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { displayName: "asc" }] : { displayName: "asc" },
    });
    return rows.map(publicTalent);
  });

  app.get("/api/talents/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = await prisma.talentProfile.findUnique({ where: { userId: id }, include: { user: { select: { idStatus: true, status: true } } } });
    if (!t || !t.published || t.user.status !== "ACTIVE") return reply.code(404).send({ error: "not_found" });
    return publicTalent(t);
  });

  const profileSchema = z.object({
    displayName: z.string().trim().min(1).max(60),
    gender: z.enum(["female", "male", "other"]),
    age: z.number().int().min(18).max(80),
    bio: z.string().max(1000).default(""),
    heightCm: z.number().int().min(100).max(230).nullable().optional(),
    style: z.string().max(100).default(""),
    languages: z.array(z.string().max(30)).max(8).default([]),
    hourlyPrice: z.number().int().min(0).max(100_000_000),
    activities: z.array(z.string()).max(12).default([]),
    availability: z.string().max(300).default(""),
    district: z.string().max(60).default(""),
    sticker: z.string().max(40).default(""),
    availableNow: z.boolean().default(false),
    published: z.boolean().default(true),
  });
  app.put("/api/talent/profile", { preHandler: auth }, async (req, reply) => {
    if (req.user.role !== "TALENT") return reply.code(403).send({ error: "forbidden" });
    const p = profileSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const data = { ...p.data, heightCm: p.data.heightCm ?? null };
    const t = await prisma.talentProfile.upsert({
      where: { userId: req.user.id }, create: { userId: req.user.id, photos: [], ...data }, update: data,
    });
    return publicTalent(t);
  });

  // ---------- saved ----------
  app.get("/api/saved", { preHandler: auth }, async (req) => {
    const rows = await prisma.savedTalent.findMany({
      where: { userId: req.user.id },
      include: { talent: { include: { user: { select: { idStatus: true } } } } },
    });
    return rows.map((r) => publicTalent(r.talent));
  });
  app.put("/api/saved/:talentId", { preHandler: auth }, async (req, reply) => {
    const { talentId } = req.params as { talentId: string };
    if (!(await prisma.talentProfile.findUnique({ where: { userId: talentId } })))
      return reply.code(404).send({ error: "not_found" });
    await prisma.savedTalent.upsert({
      where: { userId_talentId: { userId: req.user.id, talentId } }, create: { userId: req.user.id, talentId }, update: {},
    });
    return { ok: true };
  });
  app.delete("/api/saved/:talentId", { preHandler: auth }, async (req) => {
    const { talentId } = req.params as { talentId: string };
    await prisma.savedTalent.deleteMany({ where: { userId: req.user.id, talentId } });
    return { ok: true };
  });

  // ---------- bookings ----------
  const bookingSchema = z.object({
    talentId: z.string(),
    activity: z.string().min(1).max(40),
    date: z.coerce.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    hours: z.number().int().min(1).max(12),
    place: z.string().trim().min(3).max(200),
    note: z.string().max(500).default(""),
    conductAccepted: z.literal(true),
  });
  app.post("/api/bookings", { preHandler: auth }, async (req, reply) => {
    if (req.user.role !== "CUSTOMER") return reply.code(403).send({ error: "forbidden" });
    const p = bookingSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const d = p.data;
    if (d.date.getTime() < Date.now() - 24 * 3600 * 1000) return reply.code(400).send({ error: "date_in_past" });
    const talent = await prisma.talentProfile.findUnique({ where: { userId: d.talentId }, include: { user: true } });
    if (!talent || !talent.published || talent.user.status !== "ACTIVE") return reply.code(404).send({ error: "not_found" });
    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id, talentId: d.talentId, activity: d.activity, date: d.date,
        startTime: d.startTime, hours: d.hours, place: d.place, note: d.note,
        acks: { create: { userId: req.user.id } },
      },
    });
    return booking;
  });

  const bookingInclude = {
    review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    customer: { select: { id: true, name: true } },
    talent: { select: { id: true, name: true, talent: { select: { displayName: true, photos: true } } } },
  } as const;

  app.get("/api/bookings", { preHandler: auth }, async (req) => {
    return prisma.booking.findMany({
      where: { OR: [{ customerId: req.user.id }, { talentId: req.user.id }] },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/api/bookings/:id/status", { preHandler: auth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b) return reply.code(404).send({ error: "not_found" });
    const actor = actorFor(req.user.id, b);
    if (!actor) return reply.code(404).send({ error: "not_found" });
    if (!canTransition(actor, b.status, p.data.status)) return reply.code(409).send({ error: "bad_transition" });
    return prisma.booking.update({ where: { id }, data: { status: p.data.status } });
  });

  // ---------- chat ----------
  async function loadChatBooking(userId: string, bookingId: string) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b || !actorFor(userId, b)) return null;
    return b;
  }
  app.get("/api/bookings/:id/messages", { preHandler: auth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = await loadChatBooking(req.user.id, id);
    if (!b) return reply.code(404).send({ error: "not_found" });
    if (!chatOpen(b.status)) return reply.code(403).send({ error: "chat_locked" });
    return prisma.message.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" }, take: 500 });
  });
  app.post("/api/bookings/:id/messages", { preHandler: auth, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ body: z.string().trim().min(1).max(1000) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const b = await loadChatBooking(req.user.id, id);
    if (!b) return reply.code(404).send({ error: "not_found" });
    if (!chatOpen(b.status)) return reply.code(403).send({ error: "chat_locked" });
    const masked = maskContacts(p.data.body);
    const msg = await prisma.message.create({
      data: { bookingId: id, senderId: req.user.id, body: masked.text, flagged: masked.flagged },
    });
    getIO()?.to(`booking:${id}`).emit("message", msg);
    return msg;
  });

  // ---------- reviews ----------
  async function recalcRating(talentId: string) {
    const rows = await prisma.review.findMany({ where: { talentId, hidden: false }, select: { rating: true } });
    const { avg, count } = averageRating(rows.map((r) => r.rating));
    await prisma.talentProfile.update({ where: { userId: talentId }, data: { ratingAvg: avg, ratingCount: count } });
  }

  const reviewBody = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).default(""),
  });

  app.post("/api/bookings/:id/review", { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = reviewBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const b = await prisma.booking.findUnique({ where: { id }, include: { review: true } });
    if (!b || b.customerId !== req.user.id) return reply.code(404).send({ error: "not_found" });
    if (!canReviewBooking(b.status)) return reply.code(409).send({ error: "booking_not_completed" });
    if (b.review) return reply.code(409).send({ error: "already_reviewed" });
    const review = await prisma.review.create({
      data: { bookingId: id, talentId: b.talentId, customerId: req.user.id, rating: p.data.rating, comment: maskContacts(p.data.comment).text },
    });
    await recalcRating(b.talentId);
    return review;
  });

  app.put("/api/reviews/:id", { preHandler: auth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = reviewBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r || r.customerId !== req.user.id) return reply.code(404).send({ error: "not_found" });
    if (!withinEditWindow(r.createdAt)) return reply.code(403).send({ error: "edit_window_closed" });
    const updated = await prisma.review.update({
      where: { id }, data: { rating: p.data.rating, comment: maskContacts(p.data.comment).text },
    });
    await recalcRating(r.talentId);
    return updated;
  });

  app.post("/api/reviews/:id/reply", { preHandler: auth, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ reply: z.string().trim().min(1).max(500) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r || r.talentId !== req.user.id) return reply.code(404).send({ error: "not_found" });
    if (r.reply) return reply.code(409).send({ error: "already_replied" });
    return prisma.review.update({ where: { id }, data: { reply: maskContacts(p.data.reply).text, repliedAt: new Date() } });
  });

  app.get("/api/talents/:id/reviews", async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = z.object({ page: z.coerce.number().int().min(1).default(1) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "invalid" });
    const where = { talentId: id, hidden: false };
    const [rows, all] = await Promise.all([
      prisma.review.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (q.data.page - 1) * 10, take: 10,
        include: { customer: { select: { name: true } } },
      }),
      prisma.review.findMany({ where, select: { rating: true } }),
    ]);
    const ratings = all.map((r) => r.rating);
    return {
      ...averageRating(ratings),
      breakdown: ratingBreakdown(ratings),
      reviews: rows.map((r) => ({
        id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, repliedAt: r.repliedAt,
        createdAt: r.createdAt, author: r.customer.name.trim().split(/\s+/).pop() ?? "",
      })),
    };
  });

  app.post("/api/reviews/:id/report", { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ reason: z.string().trim().max(200).default("") }).safeParse(req.body ?? {});
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r || r.hidden) return reply.code(404).send({ error: "not_found" });
    await prisma.reviewReport.upsert({
      where: { reviewId_userId: { reviewId: id, userId: req.user.id } },
      create: { reviewId: id, userId: req.user.id, reason: p.data.reason }, update: { reason: p.data.reason },
    });
    return { ok: true };
  });

  // ---------- ID verification ----------
  app.post("/api/verification", { preHandler: auth }, async (req, reply) => {
    const keys: Record<string, string> = {};
    for await (const part of req.parts()) {
      if (part.type !== "file") continue;
      if (!["idImage", "selfie"].includes(part.fieldname)) { part.file.resume(); continue; }
      if (!["image/jpeg", "image/png", "image/webp"].includes(part.mimetype)) {
        part.file.resume();
        return reply.code(400).send({ error: "bad_file_type" });
      }
      const key = `${randomUUID()}${part.mimetype === "image/png" ? ".png" : part.mimetype === "image/webp" ? ".webp" : ".jpg"}`;
      await pipeline(part.file, createWriteStream(path.join(UPLOAD_DIR, key)));
      if (part.file.truncated) return reply.code(413).send({ error: "file_too_large" });
      keys[part.fieldname] = key;
    }
    if (!keys.idImage || !keys.selfie) return reply.code(400).send({ error: "both_images_required" });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { idImageKey: keys.idImage, selfieKey: keys.selfie, idStatus: "PENDING" },
    });
    return { idStatus: "PENDING" };
  });

  // ---------- SOS ----------
  app.post("/api/sos", { preHandler: auth, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = z.object({
      bookingId: z.string().optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    if (p.data.bookingId) {
      const b = await prisma.booking.findUnique({ where: { id: p.data.bookingId } });
      if (!b || !actorFor(req.user.id, b)) return reply.code(404).send({ error: "not_found" });
    }
    const alert = await prisma.sosAlert.create({
      data: { userId: req.user.id, bookingId: p.data.bookingId, lat: p.data.lat, lng: p.data.lng },
    });
    getIO()?.to("admins").emit("sos", alert);
    return alert;
  });

  // ---------- admin ----------
  app.get("/api/admin/verifications", { preHandler: adminOnly }, async () =>
    prisma.user.findMany({
      where: { idStatus: "PENDING" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }));

  app.get("/api/admin/verifications/:userId/:kind", { preHandler: adminOnly }, async (req, reply) => {
    const { userId, kind } = req.params as { userId: string; kind: string };
    const u = await prisma.user.findUnique({ where: { id: userId } });
    const key = kind === "id" ? u?.idImageKey : kind === "selfie" ? u?.selfieKey : null;
    if (!key || !existsSync(path.join(UPLOAD_DIR, key))) return reply.code(404).send({ error: "not_found" });
    const ext = path.extname(key);
    reply.header("Cache-Control", "private, no-store");
    reply.type(ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
    return reply.send(createReadStream(path.join(UPLOAD_DIR, key)));
  });

  app.post("/api/admin/verifications/:userId", { preHandler: adminOnly }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const p = z.object({ approve: z.boolean() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.idStatus !== "PENDING") return reply.code(409).send({ error: "not_pending" });
    await prisma.user.update({ where: { id: userId }, data: { idStatus: p.data.approve ? "APPROVED" : "REJECTED" } });
    return { ok: true };
  });

  app.get("/api/admin/sos", { preHandler: adminOnly }, async () =>
    prisma.sosAlert.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    }));
  app.post("/api/admin/sos/:id/resolve", { preHandler: adminOnly }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.sosAlert.update({ where: { id }, data: { status: "RESOLVED" } });
  });

  app.get("/api/admin/reviews", { preHandler: adminOnly }, async () => {
    const rows = await prisma.review.findMany({
      where: { OR: [{ reports: { some: {} } }, { hidden: true }] },
      include: {
        customer: { select: { name: true, email: true } },
        talent: { select: { displayName: true } },
        reports: { select: { reason: true } },
      },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    return rows.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, hidden: r.hidden, createdAt: r.createdAt,
      customer: r.customer, talent: r.talent.displayName, reports: r.reports.map((x) => x.reason),
    }));
  });
  app.post("/api/admin/reviews/:id/hidden", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ hidden: z.boolean() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r) return reply.code(404).send({ error: "not_found" });
    await prisma.review.update({ where: { id }, data: { hidden: p.data.hidden } });
    await recalcRating(r.talentId);
    return { ok: true };
  });

  app.get("/api/admin/users", { preHandler: adminOnly }, async () =>
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, idStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 200,
    }));
  app.post("/api/admin/users/:id/status", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    if (id === req.user.id) return reply.code(400).send({ error: "cannot_suspend_self" });
    await prisma.user.update({ where: { id }, data: { status: p.data.status } });
    return { ok: true };
  });

  return app;
}
