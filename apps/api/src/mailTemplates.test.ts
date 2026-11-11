import { describe, expect, it } from "vitest";
import { notificationEmail, otpEmail, otpSms, testEmail, type NotificationType } from "./mailTemplates.js";

const TYPES: NotificationType[] = ["KYC_SUBMITTED", "KYC_APPROVED", "KYC_REJECTED", "KYC_NEW_SUBMISSION", "ACCOUNT_SUSPENDED", "ACCOUNT_REACTIVATED", "ROLE_MODERATOR", "ROLE_MEMBER"];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe("email wording", () => {
  it("OTP email is formal, personal and contains the code", () => {
    const vi = otpEmail("vi", "Nguyễn Thu Hà", "123456");
    expect(vi.subject).toBe("[Cùng Đi] Mã xác minh tài khoản");
    expect(vi.text.startsWith("Kính gửi Nguyễn Thu Hà,")).toBe(true);
    expect(vi.text).toContain("123456");
    expect(vi.text).toContain("Trân trọng,\nĐội ngũ Cùng Đi");
    const en = otpEmail("en", "Thu Ha", "654321");
    expect(en.text.startsWith("Dear Thu Ha,")).toBe(true);
    expect(en.text).toContain("Kind regards,\nThe Cùng Đi Team");
    expect(en.text).toContain("654321");
  });
  it("every notification exists in both languages with a branded subject, greeting and signature", () => {
    for (const locale of ["vi", "en"] as const) for (const type of TYPES) {
      const m = notificationEmail(locale, type, "An", { reason: "Ảnh mờ", name: "Bình" });
      expect(m.subject.startsWith("[Cùng Đi] ")).toBe(true);
      expect(m.subject.length).toBeGreaterThan(14);
      expect(m.text).toMatch(locale === "vi" ? /^Kính gửi An,/ : /^Dear An,/);
      expect(m.text).toContain(locale === "vi" ? "Đội ngũ Cùng Đi" : "The Cùng Đi Team");
      expect(m.text).not.toMatch(EMOJI);
      expect(m.text).not.toContain("undefined");
    }
  });
  it("rejection includes the reason, and falls back when missing", () => {
    expect(notificationEmail("vi", "KYC_REJECTED", "An", { reason: "Ảnh thẻ bị mờ" }).text).toContain("Lý do: Ảnh thẻ bị mờ");
    expect(notificationEmail("en", "KYC_REJECTED", "An", {}).text).toContain("Reason: None given");
  });
  it("names cannot break the layout, and a missing name falls back to a formal address", () => {
    expect(otpEmail("en", "Evil\n\nName   X", "111111").text.split("\n")[0]).toBe("Dear Evil Name X,");
    expect(otpEmail("vi", "", "111111").text.startsWith("Kính gửi Quý khách,")).toBe(true);
  });
  it("SMS stays short and ASCII-safe for SMS gateways", () => {
    for (const l of ["vi", "en"] as const) {
      const s = otpSms(l, "123456");
      expect(s).toContain("123456");
      expect(s.length).toBeLessThan(120);
      expect(/^[\x20-\x7E]+$/.test(s)).toBe(true);
    }
  });
  it("test email names the admin", () => {
    expect(testEmail("vi", "Admin").text.startsWith("Kính gửi Admin,")).toBe(true);
  });
});
