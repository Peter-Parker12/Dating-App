import { describe, expect, it } from "vitest";
import { listProvinces, listWards, resolveAddress } from "./geo.js";
import { normalizeVnPhone } from "./validators.js";

describe("normalizeVnPhone", () => {
  it("accepts common formats and normalizes", () => {
    expect(normalizeVnPhone("0912345678")).toBe("0912345678");
    expect(normalizeVnPhone("091 234 5678")).toBe("0912345678");
    expect(normalizeVnPhone("+84 912-345-678")).toBe("0912345678");
    expect(normalizeVnPhone("84912345678")).toBe("0912345678");
  });
  it("rejects invalid numbers", () => {
    for (const bad of ["", "12345", "0212345678", "09123456789", "abcdefghij", "0112345678"]) expect(normalizeVnPhone(bad)).toBeNull();
  });
});

describe("vn address data", () => {
  it("has the 34 post-merger provinces and 3321 wards", () => {
    expect(listProvinces()).toHaveLength(34);
    const total = listProvinces().reduce((n, p) => n + (listWards(p.code)?.length ?? 0), 0);
    expect(total).toBe(3321);
  });
  it("resolves a ward only under its own province", () => {
    const [p1, p2] = listProvinces();
    const w = listWards(p1.code)![0];
    expect(resolveAddress(p1.code, w.code)).toEqual({ province: p1.name, ward: w.name });
    expect(resolveAddress(p2.code, w.code)).toBeNull();
    expect(listWards(999999)).toBeNull();
  });
});
