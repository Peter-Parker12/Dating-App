import { describe, expect, it } from "vitest";
import { isValidSlot, normalizeSlots, slotsForDay } from "./schedule.js";

describe("schedule slots", () => {
  it("accepts only day:block pairs", () => {
    expect(isValidSlot("mon:evening")).toBe(true);
    for (const bad of ["mon", "mon:night", "monday:evening", "evening:mon", "", "mon:evening:x"]) expect(isValidSlot(bad)).toBe(false);
  });
  it("dedupes and sorts into week order", () => {
    expect(normalizeSlots(["sun:evening", "mon:morning", "mon:morning", "mon:evening"])).toEqual(["mon:morning", "mon:evening", "sun:evening"]);
    expect(normalizeSlots([])).toEqual([]);
  });
  it("rejects the whole list if any slot is invalid", () => {
    expect(normalizeSlots(["mon:morning", "xyz"])).toBeNull();
  });
  it("lists a day's three blocks", () => {
    expect(slotsForDay("sat")).toEqual(["sat:morning", "sat:afternoon", "sat:evening"]);
  });
});
