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

/** All users are in Vietnam: booking times are local (UTC+7) and the booking date is stored as UTC midnight. */
const VN_OFFSET_MIN = 7 * 60;

interface Slot { date: Date; startTime: string; hours: number }

const clock = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** The instant the booking starts. */
export function bookingStart(b: Pick<Slot, "date" | "startTime">): Date {
  return new Date(b.date.getTime() + (clock(b.startTime) - VN_OFFSET_MIN) * 60_000);
}

/** Start and end in minutes on a shared timeline (handles bookings that run past midnight). */
export function bookingInterval(b: Slot): [number, number] {
  const start = Math.floor(b.date.getTime() / 60_000) + clock(b.startTime);
  return [start, start + b.hours * 60];
}

/** Back-to-back bookings (one ends exactly when the next starts) do not overlap. */
export function bookingsOverlap(a: Slot, b: Slot): boolean {
  const [a0, a1] = bookingInterval(a);
  const [b0, b1] = bookingInterval(b);
  return a0 < b1 && b0 < a1;
}

/** A meetup can only be marked completed once it has started, so reviews cannot be left for meetings that never happened. */
export function canComplete(b: Pick<Slot, "date" | "startTime">, now: Date = new Date()): boolean {
  return now.getTime() >= bookingStart(b).getTime();
}

export function isInPast(b: Pick<Slot, "date" | "startTime">, now: Date = new Date()): boolean {
  return bookingStart(b).getTime() < now.getTime();
}
