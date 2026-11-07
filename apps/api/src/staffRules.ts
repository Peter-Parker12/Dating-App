import type { Role } from "@prisma/client";

/** A demoted moderator goes back to the role their gender maps to at sign-up. */
export function roleAfterDemotion(gender: string | null): Role {
  return gender === "male" ? "TALENT" : "CUSTOMER";
}

export type RoleChangeBlock =
  | "not_admin" | "self" | "target_admin" | "inactive" | "email_unverified" | "already_moderator" | "not_moderator";

interface Target { id: string; role: Role; active: boolean; emailVerified: boolean }

/** Only admins promote, never themselves or another admin, and only active accounts with a verified email. */
export function promoteBlocker(actor: { id: string; role: Role }, t: Target): RoleChangeBlock | null {
  if (actor.role !== "ADMIN") return "not_admin";
  if (actor.id === t.id) return "self";
  if (t.role === "ADMIN") return "target_admin";
  if (t.role === "MODERATOR") return "already_moderator";
  if (!t.active) return "inactive";
  if (!t.emailVerified) return "email_unverified";
  return null;
}

export function demoteBlocker(actor: { id: string; role: Role }, t: Target): RoleChangeBlock | null {
  if (actor.role !== "ADMIN") return "not_admin";
  if (actor.id === t.id) return "self";
  if (t.role === "ADMIN") return "target_admin";
  if (t.role !== "MODERATOR") return "not_moderator";
  return null;
}
