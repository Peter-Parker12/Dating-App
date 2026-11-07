import { prisma } from "./db.js";
import { decryptSecret } from "./secrets.js";

export interface EmailConfig { host: string; port: number; secure: boolean; user?: string; pass?: string; from: string }
export type EmailSource = "db" | "env" | "none";

/** Shape saved in the Setting table; the password is only ever stored encrypted. */
export type StoredEmail = { host: string; port: number; secure: boolean; user?: string; passEnc?: string; from: string };

const TTL_MS = 15_000;
let cache: { at: number; value: { cfg: EmailConfig | null; source: EmailSource } } | null = null;
export const invalidateEmailConfig = () => { cache = null; };

export async function readStoredEmail(): Promise<StoredEmail | null> {
  const row = await prisma.setting.findUnique({ where: { key: "email" } });
  return (row?.value as StoredEmail | undefined) ?? null;
}

function fromEnv(): EmailConfig | null {
  if (!process.env.SMTP_HOST) return null;
  return {
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || undefined, pass: process.env.SMTP_PASS || undefined,
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "",
  };
}

/** Admin-saved settings win; the SMTP_* environment variables are the fallback. */
export async function resolveEmailConfig(): Promise<{ cfg: EmailConfig | null; source: EmailSource }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: { cfg: EmailConfig | null; source: EmailSource };
  const stored = await readStoredEmail();
  if (stored) {
    const pass = stored.passEnc ? decryptSecret(stored.passEnc) : null;
    if (stored.passEnc && pass === null) console.warn("[email] stored SMTP password cannot be decrypted (SETTINGS_KEY/JWT_SECRET changed?); re-enter it in the admin settings");
    value = { cfg: { host: stored.host, port: stored.port, secure: stored.secure, user: stored.user, pass: pass ?? undefined, from: stored.from }, source: "db" };
  } else {
    const env = fromEnv();
    value = { cfg: env, source: env ? "env" : "none" };
  }
  cache = { at: Date.now(), value };
  return value;
}
