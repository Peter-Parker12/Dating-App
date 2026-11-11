import { describe, expect, it } from "vitest";
import { actorFor, bookingStart, bookingsOverlap, canComplete, canTransition, chatOpen, isInPast } from "./bookingRules.js";

describe("booking rules", () => {
  it("talent accepts or declines pending only", () => {
    expect(canTransition("talent", "PENDING", "ACCEPTED")).toBe(true);
    expect(canTransition("talent", "PENDING", "DECLINED")).toBe(true);
    expect(canTransition("talent", "DECLINED", "ACCEPTED")).toBe(false);
  });
  it("customer cannot accept", () => {
    expect(canTransition("customer", "PENDING", "ACCEPTED")).toBe(false);
    expect(canTransition("customer", "PENDING", "CANCELLED")).toBe(true);
  });
  it("identifies actor", () => {
    const b = { customerId: "c", talentId: "t" };
    expect(actorFor("c", b)).toBe("customer");
    expect(actorFor("t", b)).toBe("talent");
    expect(actorFor("x", b)).toBeNull();
  });
  it("chat opens only after accept", () => {
    expect(chatOpen("PENDING")).toBe(false);
    expect(chatOpen("ACCEPTED")).toBe(true);
  });
});

describe("booking times", () => {
  const day = new Date("2030-03-10T00:00:00Z");          // the booking date is stored as UTC midnight
  const at = (startTime: string, hours: number, date = day) => ({ date, startTime, hours });

  it("starts at the local (UTC+7) time", () => {
    expect(bookingStart(at("19:00", 2)).toISOString()).toBe("2030-03-10T12:00:00.000Z");
  });
  it("detects overlapping meetups and allows back-to-back ones", () => {
    expect(bookingsOverlap(at("19:00", 2), at("20:00", 2))).toBe(true);
    expect(bookingsOverlap(at("19:00", 2), at("19:00", 1))).toBe(true);
    expect(bookingsOverlap(at("19:00", 2), at("21:00", 1))).toBe(false);   // starts exactly when the first ends
    expect(bookingsOverlap(at("19:00", 2), at("08:00", 2))).toBe(false);
  });
  it("handles meetups that run past midnight", () => {
    const late = at("23:00", 3);                                            // ends 02:00 the next day
    const nextDay = new Date("2030-03-11T00:00:00Z");
    expect(bookingsOverlap(late, at("01:00", 1, nextDay))).toBe(true);
    expect(bookingsOverlap(late, at("02:00", 1, nextDay))).toBe(false);
    expect(bookingsOverlap(late, at("08:00", 1, day))).toBe(false);
  });
  it("cannot be completed before it starts", () => {
    const b = at("19:00", 2);                                               // starts 2030-03-10T12:00Z
    expect(canComplete(b, new Date("2030-03-10T11:59:00Z"))).toBe(false);
    expect(canComplete(b, new Date("2030-03-10T12:00:00Z"))).toBe(true);
    expect(canComplete(b, new Date("2030-03-11T00:00:00Z"))).toBe(true);
  });
  it("knows whether a start time is already in the past", () => {
    expect(isInPast(at("19:00", 2), new Date("2030-03-10T13:00:00Z"))).toBe(true);
    expect(isInPast(at("19:00", 2), new Date("2030-03-09T13:00:00Z"))).toBe(false);
  });
});
