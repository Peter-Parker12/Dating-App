import { describe, expect, it } from "vitest";
import { actorFor, canTransition, chatOpen } from "./bookingRules.js";

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
