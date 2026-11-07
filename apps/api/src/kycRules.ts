import type { KycStatus, Role } from "@prisma/client";

/** Staff (admins and moderators) review other people's KYC. */
export const isStaff = (role: Role): boolean => role === "ADMIN" || role === "MODERATOR";

/** Staff are exempt from KYC; everyone else must be approved before acting. */
export function mayAct(role: Role, kyc: KycStatus): boolean {
  return isStaff(role) || kyc === "APPROVED";
}

/** Only approved users appear publicly (Explore, profile pages). */
export function isPubliclyVisible(kyc: KycStatus): boolean {
  return kyc === "APPROVED";
}

/** Users can (re)submit while pending or after a rejection, never while in review or once approved. */
export function mayResubmit(kyc: KycStatus): boolean {
  return kyc === "PENDING" || kyc === "REJECTED";
}

export interface SubmitState {
  kyc: KycStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasId: boolean;
  hasStudentCard: boolean;
  hasProfileImage: boolean;
}

export type SubmitBlock = "not_allowed" | "email_unverified" | "phone_unverified" | "missing_documents";

export function submitBlocker(s: SubmitState): SubmitBlock | null {
  if (!mayResubmit(s.kyc)) return "not_allowed";
  if (!s.emailVerified) return "email_unverified";
  if (!s.phoneVerified) return "phone_unverified";
  if (!s.hasId || !s.hasStudentCard || !s.hasProfileImage) return "missing_documents";
  return null;
}

export function mayReview(kyc: KycStatus): boolean {
  return kyc === "IN_REVIEW";
}

/** Detects the real image type from magic bytes, so a renamed file is not trusted. */
export function sniffImage(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
