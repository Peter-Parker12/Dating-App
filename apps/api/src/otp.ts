import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_PER_HOUR = 5;

export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Codes are stored as an HMAC bound to the user, channel and target, never in clear text. */
export function hashOtp(code: string, secret: string, userId: string, channel: string, target: string): string {
  return createHmac("sha256", secret).update(`${userId}|${channel}|${target}|${code}`).digest("hex");
}

export function otpMatches(code: string, storedHash: string, secret: string, userId: string, channel: string, target: string): boolean {
  const a = Buffer.from(hashOtp(code, secret, userId, channel, target), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type OtpCheck = "ok" | "expired" | "used" | "locked" | "wrong";

export function checkOtpState(
  row: { expiresAt: Date; usedAt: Date | null; attempts: number },
  now: Date = new Date(),
): "ok" | "expired" | "used" | "locked" {
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= now.getTime()) return "expired";
  if (row.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  return "ok";
}

export function resendWaitMs(lastCreatedAt: Date | null, now: Date = new Date()): number {
  if (!lastCreatedAt) return 0;
  return Math.max(0, OTP_RESEND_COOLDOWN_MS - (now.getTime() - lastCreatedAt.getTime()));
}
