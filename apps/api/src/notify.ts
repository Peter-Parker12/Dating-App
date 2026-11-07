import nodemailer from "nodemailer";
import type { Server as IOServer } from "socket.io";
import { prisma } from "./db.js";
import { resolveEmailConfig, type EmailConfig } from "./emailConfig.js";

type Locale = "vi" | "en";

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

export const otpMessage = (locale: Locale, code: string) =>
  locale === "vi"
    ? { subject: "Mã xác minh Cùng Đi", text: `Mã xác minh của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.` }
    : { subject: "Your Cùng Đi verification code", text: `Your verification code is ${code}. It expires in 10 minutes. Never share this code with anyone.` };

export type NotificationType =
  | "KYC_SUBMITTED" | "KYC_APPROVED" | "KYC_REJECTED" | "KYC_NEW_SUBMISSION"
  | "ACCOUNT_SUSPENDED" | "ACCOUNT_REACTIVATED" | "ROLE_MODERATOR" | "ROLE_MEMBER";

const emailTexts: Record<Locale, Record<NotificationType, (d: Record<string, string>) => { subject: string; text: string }>> = {
  vi: {
    KYC_SUBMITTED: () => ({ subject: "Đã nhận hồ sơ xác minh", text: "Chúng tôi đã nhận hồ sơ xác minh của bạn. Đội ngũ quản trị sẽ kiểm tra và phản hồi sớm." }),
    KYC_APPROVED: () => ({ subject: "Tài khoản đã được xác minh", text: "Chúc mừng! Tài khoản của bạn đã được duyệt. Bạn có thể đặt lịch, nhắn tin và sử dụng đầy đủ tính năng." }),
    KYC_REJECTED: (d) => ({ subject: "Hồ sơ xác minh chưa được duyệt", text: `Hồ sơ xác minh của bạn chưa được duyệt. Lý do: ${d.reason ?? ""}\nVui lòng cập nhật và gửi lại trong mục Xác minh.` }),
    KYC_NEW_SUBMISSION: (d) => ({ subject: "Có hồ sơ xác minh mới", text: `${d.name ?? "Một người dùng"} vừa gửi hồ sơ xác minh.` }),
    ACCOUNT_SUSPENDED: () => ({ subject: "Tài khoản bị tạm khoá", text: "Tài khoản của bạn đã bị tạm khoá. Vui lòng liên hệ hỗ trợ nếu bạn cho rằng đây là nhầm lẫn." }),
    ACCOUNT_REACTIVATED: () => ({ subject: "Tài khoản đã được mở khoá", text: "Tài khoản của bạn đã được mở khoá. Bạn có thể đăng nhập lại." }),
    ROLE_MODERATOR: () => ({ subject: "Bạn là điều hành viên", text: "Bạn đã được cấp quyền điều hành viên: có thể xem xét và duyệt hồ sơ xác minh trong mục Duyệt hồ sơ." }),
    ROLE_MEMBER: () => ({ subject: "Quyền điều hành viên đã bị gỡ", text: "Quyền điều hành viên của bạn đã được gỡ. Tài khoản trở lại như thành viên thường." }),
  },
  en: {
    KYC_SUBMITTED: () => ({ subject: "Verification received", text: "We received your verification documents. Our team will review them shortly." }),
    KYC_APPROVED: () => ({ subject: "Your account is verified", text: "Congratulations! Your account has been approved. You can now book, chat and use every feature." }),
    KYC_REJECTED: (d) => ({ subject: "Verification not approved", text: `Your verification was not approved. Reason: ${d.reason ?? ""}\nPlease update your documents and resubmit from the Verification page.` }),
    KYC_NEW_SUBMISSION: (d) => ({ subject: "New verification to review", text: `${d.name ?? "A user"} submitted verification documents.` }),
    ACCOUNT_SUSPENDED: () => ({ subject: "Account suspended", text: "Your account has been suspended. Contact support if you think this is a mistake." }),
    ACCOUNT_REACTIVATED: () => ({ subject: "Account reactivated", text: "Your account has been reactivated. You can log in again." }),
    ROLE_MODERATOR: () => ({ subject: "You are now a moderator", text: "You have been made a moderator: you can review and approve verification submissions in the Review section." }),
    ROLE_MEMBER: () => ({ subject: "Moderator access removed", text: "Your moderator access has been removed. Your account is back to a regular member." }),
  },
};

/** Creates an in-app notification, pushes it over the socket and emails the user (best effort). */
export function createNotifier(getIO: () => IOServer | null) {
  return async function notifyUser(
    userId: string,
    type: NotificationType,
    data: Record<string, string> = {},
    opts: { email?: boolean } = { email: true },
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
    if (!user) return;
    const n = await prisma.notification.create({ data: { userId, type, data } });
    getIO()?.to(`user:${userId}`).emit("notification", n);
    if (opts.email !== false) {
      const locale: Locale = user.locale === "en" ? "en" : "vi";
      const m = emailTexts[locale][type](data);
      try {
        await sendEmail(user.email, m.subject, m.text);
      } catch (e) {
        console.error("notification email failed", (e as Error).message);
      }
    }
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
