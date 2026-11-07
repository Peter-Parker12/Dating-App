import { describe, expect, it } from "vitest";
import { checkOtpState, generateOtp, hashOtp, otpMatches, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, resendWaitMs } from "./otp.js";
import { isPubliclyVisible, mayAct, mayResubmit, mayReview, sniffImage, submitBlocker } from "./kycRules.js";

describe("kyc rules", () => {
  it("only approved users may act; admins are exempt", () => {
    expect(mayAct("CUSTOMER", "APPROVED")).toBe(true);
    for (const s of ["PENDING", "IN_REVIEW", "REJECTED"] as const) {
      expect(mayAct("CUSTOMER", s)).toBe(false);
      expect(mayAct("TALENT", s)).toBe(false);
      expect(mayAct("ADMIN", s)).toBe(true);
    }
  });
  it("only approved users are publicly visible", () => {
    expect(isPubliclyVisible("APPROVED")).toBe(true);
    expect(isPubliclyVisible("IN_REVIEW")).toBe(false);
  });
  it("resubmission is allowed when pending or rejected only", () => {
    expect(mayResubmit("PENDING")).toBe(true);
    expect(mayResubmit("REJECTED")).toBe(true);
    expect(mayResubmit("IN_REVIEW")).toBe(false);
    expect(mayResubmit("APPROVED")).toBe(false);
  });
  it("review is only possible while in review", () => {
    expect(mayReview("IN_REVIEW")).toBe(true);
    expect(mayReview("PENDING")).toBe(false);
  });
  it("submission needs verified email, phone and all three images", () => {
    const ok = { kyc: "PENDING", emailVerified: true, phoneVerified: true, hasId: true, hasStudentCard: true, hasProfileImage: true } as const;
    expect(submitBlocker(ok)).toBeNull();
    expect(submitBlocker({ ...ok, kyc: "REJECTED" })).toBeNull();
    expect(submitBlocker({ ...ok, kyc: "IN_REVIEW" })).toBe("not_allowed");
    expect(submitBlocker({ ...ok, emailVerified: false })).toBe("email_unverified");
    expect(submitBlocker({ ...ok, phoneVerified: false })).toBe("phone_unverified");
    expect(submitBlocker({ ...ok, hasStudentCard: false })).toBe("missing_documents");
    expect(submitBlocker({ ...ok, hasProfileImage: false })).toBe("missing_documents");
    expect(submitBlocker({ ...ok, hasId: false })).toBe("missing_documents");
  });
  it("sniffs real image types and rejects others", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpg");
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe("webp");
    expect(sniffImage(Buffer.from("<html>not an image</html>"))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
});

describe("otp", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("matches only the right code, user, channel and target", () => {
    const h = hashOtp("123456", "secret", "u1", "EMAIL", "a@x.com");
    expect(otpMatches("123456", h, "secret", "u1", "EMAIL", "a@x.com")).toBe(true);
    expect(otpMatches("123457", h, "secret", "u1", "EMAIL", "a@x.com")).toBe(false);
    expect(otpMatches("123456", h, "secret", "u2", "EMAIL", "a@x.com")).toBe(false);
    expect(otpMatches("123456", h, "secret", "u1", "PHONE", "a@x.com")).toBe(false);
    expect(otpMatches("123456", h, "other", "u1", "EMAIL", "a@x.com")).toBe(false);
    expect(otpMatches("123456", "not-hex", "secret", "u1", "EMAIL", "a@x.com")).toBe(false);
  });
  it("tracks expiry, reuse and attempt limit", () => {
    const now = new Date("2030-01-01T00:10:00Z");
    const base = { expiresAt: new Date("2030-01-01T00:20:00Z"), usedAt: null, attempts: 0 };
    expect(checkOtpState(base, now)).toBe("ok");
    expect(checkOtpState({ ...base, expiresAt: new Date("2030-01-01T00:09:00Z") }, now)).toBe("expired");
    expect(checkOtpState({ ...base, usedAt: now }, now)).toBe("used");
    expect(checkOtpState({ ...base, attempts: OTP_MAX_ATTEMPTS }, now)).toBe("locked");
  });
  it("enforces the resend cooldown", () => {
    const now = new Date("2030-01-01T00:00:30Z");
    expect(resendWaitMs(null, now)).toBe(0);
    expect(resendWaitMs(new Date("2030-01-01T00:00:00Z"), now)).toBe(OTP_RESEND_COOLDOWN_MS - 30_000);
    expect(resendWaitMs(new Date("2029-12-31T23:00:00Z"), now)).toBe(0);
  });
});
