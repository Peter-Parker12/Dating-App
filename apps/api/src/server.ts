import { Server } from "socket.io";
import { buildApp } from "./app.js";
import { prisma } from "./db.js";
import { actorFor, chatOpen } from "./bookingRules.js";
import { mayAct } from "./kycRules.js";
import { deliveryMode } from "./notify.js";

let io: Server | null = null;
const app = buildApp(() => io);

io = new Server(app.server, { path: "/socket.io", serveClient: false });

io.use(async (socket, next) => {
  try {
    const raw = socket.handshake.headers.cookie ?? "";
    const token = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith("session="))?.slice(8);
    if (!token) return next(new Error("unauthorized"));
    const payload = app.jwt.verify<{ id: string }>(token);
    const u = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!u || u.status !== "ACTIVE") return next(new Error("unauthorized"));
    socket.data.user = { id: u.id, role: u.role };
    socket.join(`user:${u.id}`);
    if (u.role === "ADMIN") socket.join("admins");
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join", async (bookingId: string, ack?: (ok: boolean) => void) => {
    const b = typeof bookingId === "string" ? await prisma.booking.findUnique({ where: { id: bookingId } }) : null;
    // Re-read the account on every join so a revoked or unapproved account cannot enter chat rooms.
    const u = await prisma.user.findUnique({ where: { id: socket.data.user.id }, select: { role: true, kycStatus: true, status: true } });
    const ok = !!b && !!u && u.status === "ACTIVE" && mayAct(u.role, u.kycStatus) && !!actorFor(socket.data.user.id, b) && chatOpen(b.status);
    if (ok) socket.join(`booking:${bookingId}`);
    ack?.(ok);
  });
});

if (deliveryMode.email === "console" || deliveryMode.sms === "console")
  console.warn(`[notify] email=${deliveryMode.email} sms=${deliveryMode.sms}: codes and notifications are only logged, not delivered. Configure SMTP_*/TWILIO_* for real delivery.`);

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});
