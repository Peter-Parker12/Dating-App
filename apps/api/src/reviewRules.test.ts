import { describe, expect, it } from "vitest";
import { averageRating, canReviewBooking, EDIT_WINDOW_MS, ratingBreakdown, withinEditWindow } from "./reviewRules.js";

describe("review rules", () => {
  it("only completed bookings can be reviewed", () => {
    expect(canReviewBooking("COMPLETED")).toBe(true);
    for (const s of ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"] as const) expect(canReviewBooking(s)).toBe(false);
  });
  it("edit window is 7 days", () => {
    const now = new Date("2030-01-10T00:00:00Z");
    expect(withinEditWindow(new Date(now.getTime() - EDIT_WINDOW_MS + 1000), now)).toBe(true);
    expect(withinEditWindow(new Date(now.getTime() - EDIT_WINDOW_MS - 1000), now)).toBe(false);
  });
  it("averages to two decimals", () => {
    expect(averageRating([5, 4, 4])).toEqual({ avg: 4.33, count: 3 });
    expect(averageRating([])).toEqual({ avg: 0, count: 0 });
  });
  it("breaks down per star", () => {
    expect(ratingBreakdown([5, 5, 3, 1, 9])).toEqual([1, 0, 1, 0, 2]);
  });
});
