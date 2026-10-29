import type { BookingStatus, Role } from "@prisma/client";

export type Actor = "customer" | "talent";

const ALLOWED: Record<Actor, Partial<Record<BookingStatus, BookingStatus[]>>> = {
  talent: {
    PENDING: ["ACCEPTED", "DECLINED"],
    ACCEPTED: ["COMPLETED"],
  },
  customer: {
    PENDING: ["CANCELLED"],
    ACCEPTED: ["CANCELLED", "COMPLETED"],
  },
};

export function canTransition(actor: Actor, from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED[actor][from]?.includes(to) ?? false;
}

export function actorFor(userId: string, b: { customerId: string; talentId: string }): Actor | null {
  if (b.customerId === userId) return "customer";
  if (b.talentId === userId) return "talent";
  return null;
}

export function chatOpen(status: BookingStatus): boolean {
  return status === "ACCEPTED" || status === "COMPLETED";
}

export type { Role };
