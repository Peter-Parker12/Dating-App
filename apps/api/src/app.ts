import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import argon2 from "argon2";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createReadStream, mkdirSync, existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KycStatus } from "@prisma/client";
import type { Server as IOServer } from "socket.io";
import { prisma } from "./db.js";
import { maskContacts } from "./mask.js";
import { listProvinces, listWards, resolveAddress } from "./geo.js";
import { normalizeVnPhone } from "./validators.js";
import { actorFor, bookingsOverlap, canComplete, canTransition, chatOpen, isInPast } from "./bookingRules.js";
import { averageRating, canReviewBooking, ratingBreakdown, withinEditWindow } from "./reviewRules.js";
import { isPubliclyVisible, isStaff, mayAct, mayReview, sniffImage, submitBlocker } from "./kycRules.js";
import { demoteBlocker, promoteBlocker, roleAfterDemotion } from "./staffRules.js";
import { invalidateEmailConfig, readStoredEmail, resolveEmailConfig, type StoredEmail } from "./emailConfig.js";
import { encryptSecret } from "./secrets.js";
import { DAYS, normalizeSlots, slotsForDay } from "./schedule.js";
import { checkOtpState, generateOtp, hashOtp, otpMatches, OTP_MAX_ATTEMPTS, OTP_MAX_PER_HOUR, OTP_TTL_MS, resendWaitMs } from "./otp.js";
import { createNotifier, sendEmail, sendEmailStrict, sendSms } from "./notify.js";
import { otpEmail, otpSms, testEmail } from "./mailTemplates.js";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve("uploads");
const COOKIE = "session";

interface Session {
  id: string;
  role: "CUSTOMER" | "TALENT" | "ADMIN" | "MODERATOR";
}
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: Session;
    user: Session;
  }
}
declare module "fastify" {
  interface FastifyRequest {
    kyc: KycStatus;
  }
}

export function buildApp(getIO: () => IOServer | null = () => null) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test", trustProxy: true });
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const notifyUser = createNotifier(getIO);
  const otpSecret = () => process.env.JWT_SECRET ?? "dev-secret-change-me";

  app.register(cookie);
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    cookie: { cookieName: COOKIE, signed: false },
    sign: { expiresIn: "7d" },
  });
  app.register(rateLimit, { global: false });
  app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

  app.decorateRequest("kyc", "PENDING");
  const auth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { status: true, role: true, kycStatus: true } });
    if (!u || u.status !== "ACTIVE") return reply.code(401).send({ error: "unauthorized" });
    req.user.role = u.role;
    req.kyc = u.kycStatus;
  };
  /** Everything except viewing profiles requires an approved account (admins are exempt). */
  const approved = async (req: FastifyRequest, reply: FastifyReply) => {
    await auth(req, reply);
    if (!reply.sent && !mayAct(req.user.role, req.kyc)) return reply.code(403).send({ error: "kyc_required", kyc: req.kyc });
  };
  const adminOnly = async (req: FastifyRequest, reply: FastifyReply) => {
    await auth(req, reply);
    if (!reply.sent && req.user.role !== "ADMIN") return reply.code(403).send({ error: "forbidden" });
  };

  /** Admins and moderators: reviewing verification submissions. */
  const staffOnly = async (req: FastifyRequest, reply: FastifyReply) => {
    await auth(req, reply);
    if (!reply.sent && !isStaff(req.user.role)) return reply.code(403).send({ error: "forbidden" });
  };

  const setSession = (reply: FastifyReply, s: Session) =>
    reply.setCookie(COOKIE, app.jwt.sign(s), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

  const publicUser = (u: { id: string; email: string; name: string; role: string; gender: string | null; locale: string; kycStatus: string }) => ({
    id: u.id, email: u.email, name: u.name, role: u.role, gender: u.gender, locale: u.locale, kycStatus: u.kycStatus,
  });

  app.get("/api/health", async () => ({ ok: true }));

  // ---------- auth ----------
  const registerSchema = z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(2).max(80),
    phone: z.string().transform((v, ctx) => {
      const n = normalizeVnPhone(v);
      if (!n) ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return n ?? "";
    }),
    gender: z.enum(["female", "male"]),
    provinceCode: z.number().int(),
    wardCode: z.number().int(),
    addressLine: z.string().trim().min(5).max(120),
    locale: z.enum(["vi", "en"]).default("vi"),
  });
  app.post("/api/auth/register", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const addr = resolveAddress(p.data.provinceCode, p.data.wardCode);
    if (!addr) return reply.code(400).send({ error: "invalid_address" });
    if (await prisma.user.findUnique({ where: { email: p.data.email } }))
      return reply.code(409).send({ error: "email_taken" });
    if (await prisma.user.findUnique({ where: { phone: p.data.phone } }))
      return reply.code(409).send({ error: "phone_taken" });
    try {
      const user = await prisma.user.create({
        data: {
          email: p.data.email, name: p.data.name, gender: p.data.gender, locale: p.data.locale,
          phone: p.data.phone, provinceCode: p.data.provinceCode, province: addr.province,
          wardCode: p.data.wardCode, ward: addr.ward, addressLine: p.data.addressLine,
          // Women sign up as customers, men as talents; the role is never taken from the client.
          role: p.data.gender === "female" ? "CUSTOMER" : "TALENT",
          passwordHash: await argon2.hash(p.data.password),
        },
      });
      setSession(reply, { id: user.id, role: user.role });
      return publicUser(user);
    } catch (e) {
      // Concurrent signup raced past the checks above.
      if ((e as { code?: string }).code === "P2002") return reply.code(409).send({ error: "email_or_phone_taken" });
      throw e;
    }
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
    // Contact details are only ever returned to their owner.
    return {
      ...publicUser(u), phone: u.phone, province: u.province, ward: u.ward, addressLine: u.addressLine, talent: u.talent,
      emailVerified: !!u.emailVerifiedAt, phoneVerified: !!u.phoneVerifiedAt,
      hasId: !!u.idImageKey, hasStudentCard: !!u.studentCardKey, hasProfileImage: !!u.profileImageKey,
      kycRejectReason: u.kycRejectReason, kycSubmittedAt: u.kycSubmittedAt,
      lookingFor: u.lookingFor, lookingForNote: u.lookingForNote,
    };
  });

  // ---------- address data (post-2025 structure: province -> ward) ----------
  app.get("/api/geo/provinces", async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=86400");
    return listProvinces();
  });
  app.get("/api/geo/provinces/:code/wards", async (req, reply) => {
    const wards = listWards(Number((req.params as { code: string }).code));
    if (!wards) return reply.code(404).send({ error: "not_found" });
    reply.header("Cache-Control", "public, max-age=86400");
    return wards;
  });

  // ---------- activities ----------
  app.get("/api/activities", async () => prisma.activity.findMany({ orderBy: { slug: "asc" } }));

  // ---------- talents ----------
  const publicTalent = (t: {
    userId: string; displayName: string; gender: string; age: number; bio: string; heightCm: number | null;
    style: string; languages: string[]; hourlyPrice: number; photos: string[]; activities: string[];
    availability: string; district: string; sticker: string; availableNow: boolean; ratingAvg: number; ratingCount: number; schedule: string[]; user?: { kycStatus: string; profileImageKey: string | null };
  }) => ({
    id: t.userId, displayName: t.displayName, gender: t.gender, age: t.age, bio: t.bio, heightCm: t.heightCm,
    style: t.style, languages: t.languages, hourlyPrice: t.hourlyPrice,
    photos: t.photos.length ? t.photos : t.user?.profileImageKey ? [`/api/users/${t.userId}/avatar`] : [],
    activities: t.activities, availability: t.availability, district: t.district,
    sticker: t.sticker, availableNow: t.availableNow, ratingAvg: t.ratingAvg, ratingCount: t.ratingCount, schedule: t.schedule, verified: t.user?.kycStatus === "APPROVED",
  });

  const listQuery = z.object({
    gender: z.string().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    activity: z.string().optional(),
    q: z.string().max(60).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    day: z.enum(DAYS).optional(),
    sort: z.enum(["name", "rating"]).optional(),
  });
  app.get("/api/talents", async (req, reply) => {
    const p = listQuery.safeParse(req.query);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const { gender, minPrice, maxPrice, activity, q, minRating, sort, day } = p.data;
    const rows = await prisma.talentProfile.findMany({
      where: {
        published: true,
        user: { status: "ACTIVE", kycStatus: "APPROVED" as const },
        ...(gender ? { gender } : {}),
        ...(activity ? { activities: { has: activity } } : {}),
        ...(q ? { displayName: { contains: q, mode: "insensitive" as const } } : {}),
        ...(minRating ? { ratingAvg: { gte: minRating }, ratingCount: { gt: 0 } } : {}),
        ...(day ? { schedule: { hasSome: slotsForDay(day) } } : {}),
        hourlyPrice: { gte: minPrice ?? 0, ...(maxPrice !== undefined ? { lte: maxPrice } : {}) },
      },
      include: { user: { select: { kycStatus: true, profileImageKey: true } } },
      orderBy: sort === "rating" ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { displayName: "asc" }] : { displayName: "asc" },
    });
    return rows.map(publicTalent);
  });

  app.get("/api/talents/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = await prisma.talentProfile.findUnique({ where: { userId: id }, include: { user: { select: { kycStatus: true, status: true, profileImageKey: true } } } });
    if (!t || !t.published || t.user.status !== "ACTIVE" || !isPubliclyVisible(t.user.kycStatus)) return reply.code(404).send({ error: "not_found" });
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
    schedule: z.array(z.string()).max(21).default([]),
    published: z.boolean().default(true),
  });
  app.put("/api/talent/profile", { preHandler: approved }, async (req, reply) => {
    if (req.user.role !== "TALENT") return reply.code(403).send({ error: "forbidden" });
    const p = profileSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const schedule = normalizeSlots(p.data.schedule);
    if (!schedule) return reply.code(400).send({ error: "invalid_schedule" });
    const data = { ...p.data, schedule, heightCm: p.data.heightCm ?? null };
    const t = await prisma.talentProfile.upsert({
      where: { userId: req.user.id }, create: { userId: req.user.id, photos: [], ...data }, update: data,
    });
    return publicTalent(t);
  });

  // ---------- customers: what they are looking for ----------
  app.put("/api/me/preferences", { preHandler: approved }, async (req, reply) => {
    if (req.user.role !== "CUSTOMER") return reply.code(403).send({ error: "forbidden" });
    const p = z.object({
      lookingFor: z.array(z.string().max(40)).max(12),
      lookingForNote: z.string().trim().max(200).default(""),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const known = new Set((await prisma.activity.findMany({ select: { slug: true } })).map((a) => a.slug));
    const lookingFor = [...new Set(p.data.lookingFor)];
    if (!lookingFor.every((a) => known.has(a))) return reply.code(400).send({ error: "invalid_activity" });
    // Same masking as chat, so a note cannot be used to leak phone numbers or links.
    const u = await prisma.user.update({
      where: { id: req.user.id }, data: { lookingFor, lookingForNote: maskContacts(p.data.lookingForNote).text },
    });
    return { lookingFor: u.lookingFor, lookingForNote: u.lookingForNote };
  });

  /**
   * Approved talents (and staff) can browse customers who said what they are looking for.
   * Only coarse, non-identifying details are shared: given name, province, activities and note.
   */
  app.get("/api/customers", { preHandler: approved }, async (req, reply) => {
    if (req.user.role !== "TALENT" && !isStaff(req.user.role)) return reply.code(403).send({ error: "forbidden" });
    const q = z.object({ activity: z.string().max(40).optional() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "invalid" });
    const rows = await prisma.user.findMany({
      where: {
        role: "CUSTOMER", status: "ACTIVE", kycStatus: "APPROVED",
        lookingFor: q.data.activity ? { has: q.data.activity } : { isEmpty: false },
      },
      select: { id: true, name: true, province: true, lookingFor: true, lookingForNote: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    return rows.map((r) => ({
      id: r.id, firstName: r.name.trim().split(/\s+/).pop() ?? "", province: r.province,
      lookingFor: r.lookingFor, note: r.lookingForNote, since: r.createdAt,
    }));
  });

  // ---------- saved ----------
  app.get("/api/saved", { preHandler: approved }, async (req) => {
    const rows = await prisma.savedTalent.findMany({
      where: { userId: req.user.id },
      include: { talent: { include: { user: { select: { kycStatus: true, profileImageKey: true } } } } },
    });
    return rows.map((r) => publicTalent(r.talent));
  });
  app.put("/api/saved/:talentId", { preHandler: approved }, async (req, reply) => {
    const { talentId } = req.params as { talentId: string };
    if (!(await prisma.talentProfile.findUnique({ where: { userId: talentId } })))
      return reply.code(404).send({ error: "not_found" });
    await prisma.savedTalent.upsert({
      where: { userId_talentId: { userId: req.user.id, talentId } }, create: { userId: req.user.id, talentId }, update: {},
    });
    return { ok: true };
  });
  app.delete("/api/saved/:talentId", { preHandler: approved }, async (req) => {
    const { talentId } = req.params as { talentId: string };
    await prisma.savedTalent.deleteMany({ where: { userId: req.user.id, talentId } });
    return { ok: true };
  });

  // ---------- bookings ----------
  const givenName = (full: string) => full.trim().split(/\s+/).pop() ?? "";
  const DAY_MS = 24 * 3600 * 1000;

  /** Everything a booking notification or email needs, with the activity in both languages. */
  async function bookingNoticeData(
    b: { id: string; activity: string; date: Date; startTime: string; hours: number; place: string },
    name: string, extra: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    const a = await prisma.activity.findUnique({ where: { slug: b.activity } });
    return {
      bookingId: b.id, name, activityVi: a?.nameVi ?? b.activity, activityEn: a?.nameEn ?? b.activity,
      date: b.date.toISOString().slice(0, 10), time: b.startTime, hours: String(b.hours), place: b.place, ...extra,
    };
  }
  /** Active bookings of a user within a day of the given one (enough to find any time overlap). */
  const nearbyActive = (where: { customerId?: string; talentId?: string }, statuses: ("PENDING" | "ACCEPTED")[], date: Date, excludeId?: string) =>
    prisma.booking.findMany({
      where: { ...where, status: { in: statuses }, date: { gte: new Date(date.getTime() - DAY_MS), lte: new Date(date.getTime() + DAY_MS) }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });

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
  app.post("/api/bookings", { preHandler: approved }, async (req, reply) => {
    if (req.user.role !== "CUSTOMER") return reply.code(403).send({ error: "forbidden" });
    const p = bookingSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues });
    const d = p.data;
    if (isInPast(d)) return reply.code(400).send({ error: "date_in_past" });
    const talent = await prisma.talentProfile.findUnique({ where: { userId: d.talentId }, include: { user: true } });
    // Talents who are not approved are hidden from the site, so they cannot be booked by guessing an id either.
    if (!talent || !talent.published || talent.user.status !== "ACTIVE" || !isPubliclyVisible(talent.user.kycStatus))
      return reply.code(404).send({ error: "not_found" });
    const mine = await nearbyActive({ customerId: req.user.id, talentId: d.talentId }, ["PENDING", "ACCEPTED"], d.date);
    if (mine.some((x) => bookingsOverlap(x, d))) return reply.code(409).send({ error: "duplicate_booking" });
    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id, talentId: d.talentId, activity: d.activity, date: d.date,
        startTime: d.startTime, hours: d.hours, place: d.place, note: d.note,
        acks: { create: { userId: req.user.id } },
      },
    });
    const customer = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { name: true } });
    await notifyUser(d.talentId, "BOOKING_REQUESTED", await bookingNoticeData(booking, givenName(customer.name)));
    return booking;
  });

  const bookingInclude = {
    review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    customer: { select: { id: true, name: true } },
    talent: { select: { id: true, name: true, talent: { select: { displayName: true, photos: true } } } },
  } as const;

  app.get("/api/bookings", { preHandler: approved }, async (req) => {
    return prisma.booking.findMany({
      where: { OR: [{ customerId: req.user.id }, { talentId: req.user.id }] },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/api/bookings/:id/status", { preHandler: approved }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b) return reply.code(404).send({ error: "not_found" });
    const actor = actorFor(req.user.id, b);
    if (!actor) return reply.code(404).send({ error: "not_found" });
    if (!canTransition(actor, b.status, p.data.status)) return reply.code(409).send({ error: "bad_transition" });
    if (p.data.status === "COMPLETED" && !canComplete(b)) return reply.code(409).send({ error: "too_early" });
    if (p.data.status === "ACCEPTED") {
      // A talent cannot accept two meetups that overlap in time.
      const taken = await nearbyActive({ talentId: b.talentId }, ["ACCEPTED"], b.date, b.id);
      if (taken.some((x) => bookingsOverlap(x, b))) return reply.code(409).send({ error: "time_conflict" });
    }
    // Compare-and-set, so two quick clicks (or both parties at once) cannot apply the same transition twice.
    const res = await prisma.booking.updateMany({ where: { id, status: b.status }, data: { status: p.data.status } });
    if (res.count === 0) return reply.code(409).send({ error: "bad_transition" });

    const [customer, talent] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: b.customerId }, select: { name: true } }),
      prisma.talentProfile.findUnique({ where: { userId: b.talentId }, select: { displayName: true } }),
    ]);
    const talentName = talent?.displayName ?? (await prisma.user.findUniqueOrThrow({ where: { id: b.talentId }, select: { name: true } })).name;
    const customerName = givenName(customer.name);
    switch (p.data.status) {
      case "ACCEPTED": await notifyUser(b.customerId, "BOOKING_ACCEPTED", await bookingNoticeData(b, talentName)); break;
      case "DECLINED": await notifyUser(b.customerId, "BOOKING_DECLINED", await bookingNoticeData(b, talentName)); break;
      case "CANCELLED": await notifyUser(b.talentId, "BOOKING_CANCELLED", await bookingNoticeData(b, customerName)); break;
      case "COMPLETED":
        if (actor === "talent") await notifyUser(b.customerId, "BOOKING_COMPLETED", await bookingNoticeData(b, talentName, { role: "customer" }));
        else await notifyUser(b.talentId, "BOOKING_COMPLETED", await bookingNoticeData(b, customerName, { role: "talent" }));
        break;
    }
    return prisma.booking.findUniqueOrThrow({ where: { id } });
  });

  // ---------- chat ----------
  async function loadChatBooking(userId: string, bookingId: string) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b || !actorFor(userId, b)) return null;
    return b;
  }
  app.get("/api/bookings/:id/messages", { preHandler: approved }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = await loadChatBooking(req.user.id, id);
    if (!b) return reply.code(404).send({ error: "not_found" });
    if (!chatOpen(b.status)) return reply.code(403).send({ error: "chat_locked" });
    return prisma.message.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" }, take: 500 });
  });
  app.post("/api/bookings/:id/messages", { preHandler: approved, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
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

  app.post("/api/bookings/:id/review", { preHandler: approved, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
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
    const author = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { name: true } });
    await notifyUser(b.talentId, "REVIEW_RECEIVED", { bookingId: id, name: givenName(author.name), rating: String(p.data.rating) }, { email: false });
    return review;
  });

  app.put("/api/reviews/:id", { preHandler: approved }, async (req, reply) => {
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

  app.post("/api/reviews/:id/reply", { preHandler: approved, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ reply: z.string().trim().min(1).max(500) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r || r.talentId !== req.user.id) return reply.code(404).send({ error: "not_found" });
    if (r.reply) return reply.code(409).send({ error: "already_replied" });
    const updated = await prisma.review.update({ where: { id }, data: { reply: maskContacts(p.data.reply).text, repliedAt: new Date() } });
    const me = await prisma.talentProfile.findUnique({ where: { userId: req.user.id }, select: { displayName: true } });
    await notifyUser(r.customerId, "REVIEW_REPLIED", { bookingId: r.bookingId, name: me?.displayName ?? "" }, { email: false });
    return updated;
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

  app.post("/api/reviews/:id/report", { preHandler: approved, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
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

  // ---------- KYC: email / phone OTP ----------
  const channelParam = z.enum(["email", "phone"]);
  const channelOf = (c: "email" | "phone") => (c === "email" ? ("EMAIL" as const) : ("PHONE" as const));

  app.post("/api/verify/:channel/send", { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const ch = channelParam.safeParse((req.params as { channel: string }).channel);
    if (!ch.success) return reply.code(404).send({ error: "not_found" });
    const channel = channelOf(ch.data);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    const target = ch.data === "email" ? u.email : u.phone;
    if (!target) return reply.code(400).send({ error: "no_target" });
    if (ch.data === "email" ? u.emailVerifiedAt : u.phoneVerifiedAt) return reply.code(409).send({ error: "already_verified" });

    const last = await prisma.otpCode.findFirst({ where: { userId: u.id, channel }, orderBy: { createdAt: "desc" } });
    const wait = resendWaitMs(last?.createdAt ?? null);
    if (wait > 0) return reply.code(429).send({ error: "too_soon", retryAfterMs: wait });
    const sentLastHour = await prisma.otpCode.count({ where: { userId: u.id, channel, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (sentLastHour >= OTP_MAX_PER_HOUR) return reply.code(429).send({ error: "too_many" });

    const code = generateOtp();
    const row = await prisma.otpCode.create({
      data: { userId: u.id, channel, target, codeHash: hashOtp(code, otpSecret(), u.id, channel, target), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    try {
      const locale = u.locale === "en" ? "en" : "vi";
      if (ch.data === "email") { const m = otpEmail(locale, u.name, code); await sendEmail(target, m.subject, m.text); }
      else await sendSms(target, otpSms(locale, code));
    } catch (e) {
      await prisma.otpCode.delete({ where: { id: row.id } });
      req.log.error({ err: (e as Error).message }, "otp delivery failed");
      return reply.code(502).send({ error: "send_failed" });
    }
    // The code itself is never returned to the client.
    return { sent: true, expiresInSec: OTP_TTL_MS / 1000, resendInSec: 60 };
  });

  app.post("/api/verify/:channel/confirm", { preHandler: auth, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const ch = channelParam.safeParse((req.params as { channel: string }).channel);
    const body = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!ch.success) return reply.code(404).send({ error: "not_found" });
    if (!body.success) return reply.code(400).send({ error: "invalid" });
    const channel = channelOf(ch.data);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    const target = ch.data === "email" ? u.email : u.phone;
    const row = target ? await prisma.otpCode.findFirst({ where: { userId: u.id, channel, target, usedAt: null }, orderBy: { createdAt: "desc" } }) : null;
    if (!row) return reply.code(400).send({ error: "no_code" });
    const state = checkOtpState(row);
    if (state !== "ok") return reply.code(state === "locked" ? 429 : 400).send({ error: `code_${state}` });
    if (!otpMatches(body.data.code, row.codeHash, otpSecret(), u.id, channel, row.target)) {
      const updated = await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      return reply.code(400).send({ error: "wrong_code", attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts) });
    }
    await prisma.otpCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await prisma.user.update({ where: { id: u.id }, data: ch.data === "email" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() } });
    return { verified: true };
  });

  // ---------- KYC: documents ----------
  // Each document is uploaded on its own (so the browser can send them in parallel, in the background, and
  // retry one without resending the others). Submitting for review is then a tiny request.
  const DOC_COLUMN = { id: "idImageKey", student: "studentCardKey", profile: "profileImageKey" } as const;
  type DocKind = keyof typeof DOC_COLUMN;
  const docKind = (v: unknown): DocKind | null => (typeof v === "string" && v in DOC_COLUMN ? (v as DocKind) : null);
  const removeFile = (key: string | null | undefined) => (key ? unlink(path.join(UPLOAD_DIR, key)).catch(() => {}) : Promise.resolve());
  const sendImage = (reply: FastifyReply, key: string) => {
    const ext = path.extname(key);
    reply.header("Cache-Control", "private, no-store");
    reply.type(ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
    return reply.send(createReadStream(path.join(UPLOAD_DIR, key)));
  };

  app.post("/api/kyc/documents/:kind", { preHandler: auth, config: { rateLimit: { max: 40, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (isStaff(req.user.role)) return reply.code(400).send({ error: "staff_exempt" });
    const kind = docKind((req.params as { kind: string }).kind);
    if (!kind) return reply.code(404).send({ error: "not_found" });
    const column = DOC_COLUMN[kind];

    let buf: Buffer;
    try {
      const part = await req.file();
      if (!part) return reply.code(400).send({ error: "no_file" });
      buf = await part.toBuffer();
    } catch (e) {
      if ((e as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") return reply.code(413).send({ error: "file_too_large" });
      throw e;
    }
    const ext = sniffImage(buf);
    if (!ext) return reply.code(400).send({ error: "bad_file_type" });

    const before = (await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } }))[column];
    const key = `${randomUUID()}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, key), buf);
    // Only replace while the account can still change its documents, atomically, so a concurrent
    // submit for review cannot have its files swapped out from under the admin.
    const res = await prisma.user.updateMany({ where: { id: req.user.id, kycStatus: { in: ["PENDING", "REJECTED"] } }, data: { [column]: key } });
    if (res.count === 0) { await removeFile(key); return reply.code(409).send({ error: "not_allowed" }); }
    await removeFile(before);   // replaced documents are deleted so old personal data does not linger
    return { kind, uploaded: true };
  });

  app.delete("/api/kyc/documents/:kind", { preHandler: auth }, async (req, reply) => {
    const kind = docKind((req.params as { kind: string }).kind);
    if (!kind) return reply.code(404).send({ error: "not_found" });
    const column = DOC_COLUMN[kind];
    const before = (await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } }))[column];
    const res = await prisma.user.updateMany({ where: { id: req.user.id, kycStatus: { in: ["PENDING", "REJECTED"] } }, data: { [column]: null } });
    if (res.count === 0) return reply.code(409).send({ error: "not_allowed" });
    await removeFile(before);
    return { kind, uploaded: false };
  });

  /** A user can look at their own uploaded documents (for the preview on the verification page). */
  app.get("/api/kyc/documents/:kind", { preHandler: auth }, async (req, reply) => {
    const kind = docKind((req.params as { kind: string }).kind);
    if (!kind) return reply.code(404).send({ error: "not_found" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    const key = u[DOC_COLUMN[kind]];
    if (!key || !existsSync(path.join(UPLOAD_DIR, key))) return reply.code(404).send({ error: "not_found" });
    return sendImage(reply, key);
  });

  app.post("/api/kyc/submit", { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (isStaff(req.user.role)) return reply.code(400).send({ error: "staff_exempt" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    const blocker = submitBlocker({
      kyc: u.kycStatus, emailVerified: !!u.emailVerifiedAt, phoneVerified: !!u.phoneVerifiedAt,
      hasId: !!u.idImageKey, hasStudentCard: !!u.studentCardKey, hasProfileImage: !!u.profileImageKey,
    });
    if (blocker) return reply.code(blocker === "not_allowed" ? 409 : 400).send({ error: blocker });
    const res = await prisma.user.updateMany({
      where: { id: u.id, kycStatus: { in: ["PENDING", "REJECTED"] } },
      data: { kycStatus: "IN_REVIEW", kycSubmittedAt: new Date(), kycRejectReason: null },
    });
    if (res.count === 0) return reply.code(409).send({ error: "not_allowed" });

    // Notifications only write a row and push a socket event here; the emails go out in the background,
    // so a slow or unreachable mail server never holds up this response.
    await notifyUser(u.id, "KYC_SUBMITTED");
    const reviewers = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "MODERATOR"] }, status: "ACTIVE" }, select: { id: true } });
    await Promise.all(reviewers.map((a) => notifyUser(a.id, "KYC_NEW_SUBMISSION", { name: u.name }, { email: false })));
    return { kycStatus: "IN_REVIEW" };
  });

  /** Talent profile photos fall back to the approved profile image. Customers' images are never public. */
  app.get("/api/users/:id/avatar", async (req, reply) => {
    const { id } = req.params as { id: string };
    const u = await prisma.user.findUnique({ where: { id }, select: { role: true, kycStatus: true, profileImageKey: true, status: true } });
    const key = u?.profileImageKey;
    if (!u || !key || u.role !== "TALENT" || u.status !== "ACTIVE" || !isPubliclyVisible(u.kycStatus) || !existsSync(path.join(UPLOAD_DIR, key)))
      return reply.code(404).send({ error: "not_found" });
    const ext = path.extname(key);
    reply.header("Cache-Control", "public, max-age=300");
    reply.type(ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
    return reply.send(createReadStream(path.join(UPLOAD_DIR, key)));
  });

  // ---------- notifications ----------
  app.get("/api/notifications", { preHandler: auth }, async (req) => {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    return { unread, items };
  });
  app.post("/api/notifications/read-all", { preHandler: auth }, async (req) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  });
  app.post("/api/notifications/:id/read", { preHandler: auth }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.notification.updateMany({ where: { id, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
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
  app.get("/api/admin/kyc", { preHandler: staffOnly }, async () => {
    const rows = await prisma.user.findMany({
      where: { kycStatus: "IN_REVIEW" }, orderBy: { kycSubmittedAt: "asc" },
      select: {
        id: true, name: true, email: true, phone: true, gender: true, role: true,
        province: true, ward: true, addressLine: true, createdAt: true, kycSubmittedAt: true,
        emailVerifiedAt: true, phoneVerifiedAt: true,
      },
    });
    return rows.map(({ emailVerifiedAt, phoneVerifiedAt, ...r }) => ({ ...r, emailVerified: !!emailVerifiedAt, phoneVerified: !!phoneVerifiedAt }));
  });

  app.get("/api/admin/kyc/:userId/:kind", { preHandler: staffOnly }, async (req, reply) => {
    const { userId, kind } = req.params as { userId: string; kind: string };
    const u = await prisma.user.findUnique({ where: { id: userId } });
    const key = kind === "id" ? u?.idImageKey : kind === "student" ? u?.studentCardKey : kind === "profile" ? u?.profileImageKey : null;
    if (!key || !existsSync(path.join(UPLOAD_DIR, key))) return reply.code(404).send({ error: "not_found" });
    const ext = path.extname(key);
    reply.header("Cache-Control", "private, no-store");
    reply.type(ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
    return reply.send(createReadStream(path.join(UPLOAD_DIR, key)));
  });

  app.post("/api/admin/kyc/:userId", { preHandler: staffOnly }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const p = z.discriminatedUnion("approve", [
      z.object({ approve: z.literal(true) }),
      z.object({ approve: z.literal(false), reason: z.string().trim().min(3).max(300) }),
    ]).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    if (userId === req.user.id) return reply.code(403).send({ error: "cannot_review_self" });
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u || !mayReview(u.kycStatus)) return reply.code(409).send({ error: "not_in_review" });
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: p.data.approve ? "APPROVED" : "REJECTED", kycReviewedAt: new Date(), kycReviewedBy: req.user.id,
        kycRejectReason: p.data.approve ? null : p.data.reason,
      },
    });
    if (p.data.approve) await notifyUser(userId, "KYC_APPROVED");
    else await notifyUser(userId, "KYC_REJECTED", { reason: p.data.reason });
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

  app.get("/api/admin/users", { preHandler: adminOnly }, async () => {
    const rows = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, kycStatus: true, createdAt: true, emailVerifiedAt: true },
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return rows.map(({ emailVerifiedAt, ...r }) => ({ ...r, emailVerified: !!emailVerifiedAt }));
  });

  app.post("/api/admin/users/:id/role", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ role: z.enum(["MODERATOR", "MEMBER"]) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    const t = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true, gender: true, emailVerifiedAt: true } });
    if (!t) return reply.code(404).send({ error: "not_found" });
    const target = { id: t.id, role: t.role, active: t.status === "ACTIVE", emailVerified: !!t.emailVerifiedAt };
    const block = p.data.role === "MODERATOR" ? promoteBlocker(req.user, target) : demoteBlocker(req.user, target);
    if (block) return reply.code(block === "not_admin" ? 403 : 409).send({ error: block });
    const role = p.data.role === "MODERATOR" ? ("MODERATOR" as const) : roleAfterDemotion(t.gender);
    await prisma.user.update({ where: { id }, data: { role } });
    await notifyUser(id, p.data.role === "MODERATOR" ? "ROLE_MODERATOR" : "ROLE_MEMBER");
    return { ok: true, role };
  });

  // ---------- admin: email (SMTP) settings ----------
  const emailBody = z.object({
    host: z.string().trim().min(1).max(253).regex(/^[A-Za-z0-9.-]+$/, "host"),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim().max(200).optional(),
    pass: z.string().max(500).optional(),
    clearPassword: z.boolean().optional(),
    from: z.string().trim().min(3).max(200).refine((v) => v.includes("@"), "from"),
  });

  app.get("/api/admin/settings/email", { preHandler: adminOnly }, async () => {
    const { cfg, source } = await resolveEmailConfig();
    const stored = await readStoredEmail();
    // The password is never sent back, only whether one is set.
    return {
      source,
      host: cfg?.host ?? "", port: cfg?.port ?? 587, secure: cfg?.secure ?? false, user: cfg?.user ?? "", from: cfg?.from ?? "",
      hasPassword: !!cfg?.pass, passwordUnreadable: !!stored?.passEnc && !cfg?.pass,
    };
  });

  app.put("/api/admin/settings/email", { preHandler: adminOnly }, async (req, reply) => {
    const p = emailBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid", issues: p.error.issues.map((i) => i.path.join(".")) });
    const prev = await readStoredEmail();
    let passEnc: string | undefined = prev?.passEnc;
    if (p.data.clearPassword) passEnc = undefined;
    if (p.data.pass) passEnc = encryptSecret(p.data.pass);
    const value: StoredEmail = { host: p.data.host, port: p.data.port, secure: p.data.secure, user: p.data.user || undefined, passEnc, from: p.data.from };
    await prisma.setting.upsert({ where: { key: "email" }, create: { key: "email", value, updatedBy: req.user.id }, update: { value, updatedBy: req.user.id } });
    invalidateEmailConfig();
    return { ok: true };
  });

  app.delete("/api/admin/settings/email", { preHandler: adminOnly }, async () => {
    await prisma.setting.deleteMany({ where: { key: "email" } });
    invalidateEmailConfig();
    return { ok: true };
  });

  app.post("/api/admin/settings/email/test", { preHandler: adminOnly, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = z.object({ to: z.string().email() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    try {
      const me = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { name: true, locale: true } });
      const m = testEmail(me.locale === "en" ? "en" : "vi", me.name);
      await sendEmailStrict(p.data.to, m.subject, m.text);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "not_configured") return reply.code(400).send({ error: "not_configured" });
      return reply.code(502).send({ error: "smtp_failed", detail: msg.slice(0, 200) });
    }
  });
  app.post("/api/admin/users/:id/status", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid" });
    if (id === req.user.id) return reply.code(400).send({ error: "cannot_suspend_self" });
    const target = await prisma.user.findUnique({ where: { id }, select: { status: true } });
    if (!target) return reply.code(404).send({ error: "not_found" });
    await prisma.user.update({ where: { id }, data: { status: p.data.status } });
    if (target.status !== p.data.status) await notifyUser(id, p.data.status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REACTIVATED");
    return { ok: true };
  });

  return app;
}
