import type { BookingStatus } from "@prisma/client";

export const EDIT_WINDOW_MS = 7 * 24 * 3600 * 1000;

export function canReviewBooking(status: BookingStatus): boolean {
  return status === "COMPLETED";
}

export function withinEditWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() <= EDIT_WINDOW_MS;
}

export function averageRating(ratings: number[]): { avg: number; count: number } {
  if (ratings.length === 0) return { avg: 0, count: 0 };
  const sum = ratings.reduce((a, b) => a + b, 0);
  return { avg: Math.round((sum / ratings.length) * 100) / 100, count: ratings.length };
}

/** Count of reviews per star, index 0 = 1 star ... index 4 = 5 stars. */
export function ratingBreakdown(ratings: number[]): number[] {
  const out = [0, 0, 0, 0, 0];
  for (const r of ratings) if (r >= 1 && r <= 5) out[r - 1]++;
  return out;
}
