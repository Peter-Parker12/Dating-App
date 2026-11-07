import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts secrets stored in the database (for example the SMTP password) with AES-256-GCM.
 * The key comes from SETTINGS_KEY, falling back to JWT_SECRET; changing it makes old values unreadable.
 */
// `||` rather than `??`: Docker Compose passes unset variables as empty strings, which must not become the key.
const key = () => createHash("sha256").update(process.env.SETTINGS_KEY || process.env.JWT_SECRET || "dev-secret-change-me").digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

/** Returns null when the value is malformed or was encrypted with a different key. */
export function decryptSecret(stored: string): string | null {
  try {
    const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
    if (!iv || !tag || !enc) return null;
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
