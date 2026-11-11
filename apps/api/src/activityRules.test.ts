import { describe, expect, it } from "vitest";
import { ACTIVITY_ICON_KEYS, canDeleteActivity, invalidPicks, moveSlug, nameConflict, slugify, uniqueSlug } from "./activityRules.js";

describe("slugify / uniqueSlug", () => {
  it("makes accent-free url-safe slugs", () => {
    expect(slugify("Coffee & Dining")).toBe("coffee-dining");
    expect(slugify("Đi lễ chùa")).toBe("di-le-chua");
    expect(slugify("  Gym / Chạy bộ!! ")).toBe("gym-chay-bo");
    expect(slugify("!!!")).toBe("activity");
    expect(slugify("x".repeat(80)).length).toBeLessThanOrEqual(40);
  });
  it("avoids collisions", () => {
    expect(uniqueSlug("coffee", ["gym"])).toBe("coffee");
    expect(uniqueSlug("coffee", ["coffee"])).toBe("coffee-2");
    expect(uniqueSlug("coffee", ["coffee", "coffee-2", "coffee-3"])).toBe("coffee-4");
  });
});

describe("nameConflict", () => {
  const existing = [{ slug: "cafe", nameVi: "Cà phê", nameEn: "Coffee" }, { slug: "gym", nameVi: "Tập gym", nameEn: "Gym" }];
  it("detects duplicates case-insensitively in either language", () => {
    expect(nameConflict(existing, { nameVi: "Du lịch", nameEn: "Travel" })).toBeNull();
    expect(nameConflict(existing, { nameVi: "cà phê", nameEn: "Cafe" })).toBe("nameVi");
    expect(nameConflict(existing, { nameVi: "Du lịch", nameEn: " COFFEE " })).toBe("nameEn");
  });
  it("ignores the activity being edited", () => {
    expect(nameConflict(existing, { nameVi: "Cà phê", nameEn: "Coffee" }, "cafe")).toBeNull();
  });
});

describe("deleting, ordering, picking", () => {
  it("only unused activities can be deleted", () => {
    expect(canDeleteActivity({ talents: 0, customers: 0, bookings: 0 })).toBe(true);
    expect(canDeleteActivity({ talents: 0, customers: 0, bookings: 1 })).toBe(false);
    expect(canDeleteActivity({ talents: 2, customers: 0, bookings: 0 })).toBe(false);
  });
  it("moves an item up or down and stops at the ends", () => {
    const o = ["a", "b", "c"];
    expect(moveSlug(o, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveSlug(o, "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveSlug(o, "a", "up")).toEqual(o);
    expect(moveSlug(o, "c", "down")).toEqual(o);
    expect(moveSlug(o, "zzz", "up")).toEqual(o);
  });
  it("accepts only active activities as new picks, but keeps ones the user already had", () => {
    const all = [{ slug: "a", active: true }, { slug: "b", active: false }];
    expect(invalidPicks(["a"], all)).toEqual([]);
    expect(invalidPicks(["a", "b"], all)).toEqual(["b"]);
    expect(invalidPicks(["a", "b"], all, ["b"])).toEqual([]);
    expect(invalidPicks(["nope"], all, ["nope"])).toEqual(["nope"]);
  });
  it("has unique icon keys", () => {
    expect(new Set(ACTIVITY_ICON_KEYS).size).toBe(ACTIVITY_ICON_KEYS.length);
  });
});
