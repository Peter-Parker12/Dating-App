import nodemailer from "nodemailer";
import type { Server as IOServer } from "socket.io";
import { prisma } from "./db.js";
import { resolveEmailConfig, type EmailConfig } from "./emailConfig.js";
import { notificationEmail, type Locale, type NotificationType } from "./mailTemplates.js";

export type { NotificationType };


/**
 * Delivery drivers. Email uses the SMTP settings an admin saved in the UI, falling back to the SMTP_*
 * environment variables. With neither configured, messages (including OTP codes) are written to the
 * server log instead of being sent, which is meant for development only.
 */
const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

const transporters = new Map<string, nodemailer.Transporter>();
function transporterFor(cfg: EmailConfig) {
  const key = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass]);
  let t = transporters.get(key);
  if (!t) {
    transporters.clear();
    t = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    });
    transporters.set(key, t);
  }
  return t;
}

export async function getDeliveryMode() {
  const { source } = await resolveEmailConfig();
  return { email: source === "none" ? ("console" as const) : source, sms: twilioConfigured ? ("twilio" as const) : ("console" as const) };
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const { cfg } = await resolveEmailConfig();
  if (!cfg) {
    console.log(`[email:console] to=${to} subject=${subject}\n${text}`);
    return;
  }
  await transporterFor(cfg).sendMail({ from: cfg.from, to, subject, text });
}

/** Used by the admin "send test email" button: never falls back to the log, so failures are visible. */
export async function sendEmailStrict(to: string, subject: string, text: string): Promise<void> {
  const { cfg } = await resolveEmailConfig();
  if (!cfg) throw new Error("not_configured");
  await transporterFor(cfg).sendMail({ from: cfg.from, to, subject, text });
}

export async function sendSms(to: string, text: string): Promise<void> {
  if (!twilioConfigured) {
    console.log(`[sms:console] to=${to} text=${text}`);
    return;
  }
  // Twilio expects E.164, our numbers are stored in national form (0912345678).
  const e164 = to.startsWith("0") ? `+84${to.slice(1)}` : to;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: e164, From: process.env.TWILIO_FROM!, Body: text }),
  });
  if (!res.ok) throw new Error(`sms_failed_${res.status}`);
}

/** Creates an in-app notification, pushes it over the socket and emails the user (best effort). */
export function createNotifier(getIO: () => IOServer | null) {
  return async function notifyUser(
    userId: string,
    type: NotificationType,
    data: Record<string, string> = {},
    opts: { email?: boolean } = { email: true },
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, locale: true, name: true } });
    if (!user) return;
    const n = await prisma.notification.create({ data: { userId, type, data } });
    getIO()?.to(`user:${userId}`).emit("notification", n);
    if (opts.email !== false) {
      const locale: Locale = user.locale === "en" ? "en" : "vi";
      const m = notificationEmail(locale, type, user.name, data);
      try {
        await sendEmail(user.email, m.subject, m.text);
      } catch (e) {
        console.error("notification email failed", (e as Error).message);
      }
    }
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
