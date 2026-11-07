import { describe, expect, it } from "vitest";
import { demoteBlocker, promoteBlocker, roleAfterDemotion } from "./staffRules.js";
import { isStaff, mayAct } from "./kycRules.js";
import { decryptSecret, encryptSecret } from "./secrets.js";

const admin = { id: "a", role: "ADMIN" as const };
const user = { id: "u", role: "CUSTOMER" as const, active: true, emailVerified: true };

describe("staff roles", () => {
  it("moderators and admins are staff and exempt from KYC", () => {
    expect(isStaff("MODERATOR")).toBe(true);
    expect(isStaff("TALENT")).toBe(false);
    expect(mayAct("MODERATOR", "PENDING")).toBe(true);
    expect(mayAct("CUSTOMER", "PENDING")).toBe(false);
  });
  it("only an admin can promote, and only eligible accounts", () => {
    expect(promoteBlocker(admin, user)).toBeNull();
    expect(promoteBlocker({ id: "m", role: "MODERATOR" }, user)).toBe("not_admin");
    expect(promoteBlocker({ id: "u", role: "ADMIN" }, { ...user, id: "u" })).toBe("self");
    expect(promoteBlocker(admin, { ...user, role: "ADMIN" })).toBe("target_admin");
    expect(promoteBlocker(admin, { ...user, role: "MODERATOR" })).toBe("already_moderator");
    expect(promoteBlocker(admin, { ...user, active: false })).toBe("inactive");
    expect(promoteBlocker(admin, { ...user, emailVerified: false })).toBe("email_unverified");
  });
  it("only an admin can demote, and only moderators", () => {
    const mod = { ...user, role: "MODERATOR" as const };
    expect(demoteBlocker(admin, mod)).toBeNull();
    expect(demoteBlocker(admin, user)).toBe("not_moderator");
    expect(demoteBlocker({ id: "m", role: "MODERATOR" }, mod)).toBe("not_admin");
    expect(demoteBlocker(admin, { ...mod, role: "ADMIN" })).toBe("target_admin");
  });
  it("demotion restores the sign-up role from gender", () => {
    expect(roleAfterDemotion("female")).toBe("CUSTOMER");
    expect(roleAfterDemotion("male")).toBe("TALENT");
    expect(roleAfterDemotion(null)).toBe("CUSTOMER");
  });
});

describe("secrets", () => {
  it("an empty SETTINGS_KEY falls back to JWT_SECRET instead of becoming the key", () => {
    const saved = { k: process.env.SETTINGS_KEY, j: process.env.JWT_SECRET };
    try {
      process.env.JWT_SECRET = "jwt-A"; process.env.SETTINGS_KEY = "";
      const enc = encryptSecret("pw");
      process.env.SETTINGS_KEY = "";                 // still empty: decrypts with the JWT_SECRET-derived key
      expect(decryptSecret(enc)).toBe("pw");
      process.env.JWT_SECRET = "jwt-B";              // different fallback key must not decrypt it
      expect(decryptSecret(enc)).toBeNull();
    } finally {
      if (saved.k === undefined) delete process.env.SETTINGS_KEY; else process.env.SETTINGS_KEY = saved.k;
      if (saved.j === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = saved.j;
    }
  });
  it("round-trips and never stores plain text", () => {
    const enc = encryptSecret("smtp-pass-123");
    expect(enc).not.toContain("smtp-pass-123");
    expect(decryptSecret(enc)).toBe("smtp-pass-123");
  });
  it("uses a fresh IV each time and rejects tampering", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
    const [iv, tag, data] = encryptSecret("hello").split(".");
    const flipped = Buffer.from(data, "base64"); flipped[0] ^= 1;
    expect(decryptSecret([iv, tag, flipped.toString("base64")].join("."))).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
  });
});
