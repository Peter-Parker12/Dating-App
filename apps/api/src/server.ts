import { Server } from "socket.io";
import { buildApp } from "./app.js";
import { prisma } from "./db.js";
import { actorFor, chatOpen } from "./bookingRules.js";

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
    if (u.role === "ADMIN") socket.join("admins");
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join", async (bookingId: string, ack?: (ok: boolean) => void) => {
    const b = typeof bookingId === "string" ? await prisma.booking.findUnique({ where: { id: bookingId } }) : null;
    const ok = !!b && !!actorFor(socket.data.user.id, b) && chatOpen(b.status);
    if (ok) socket.join(`booking:${bookingId}`);
    ack?.(ok);
  });
});

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});
