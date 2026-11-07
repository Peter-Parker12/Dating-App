import { readFileSync } from "node:fs";

// Vietnam's administrative units after the 2025 merger: 34 provinces/cities and their
// commune-level units (phường / xã / đặc khu). The district level no longer exists.
interface Province { code: number; name: string; wards: [number, string][] }

const provinces: Province[] = JSON.parse(readFileSync(new URL("../data/vn-admin.json", import.meta.url), "utf8"));
const byCode = new Map(provinces.map((p) => [p.code, p]));

export const listProvinces = () => provinces.map((p) => ({ code: p.code, name: p.name }));

export function listWards(provinceCode: number) {
  return byCode.get(provinceCode)?.wards.map(([code, name]) => ({ code, name })) ?? null;
}

/** Returns canonical names if the ward belongs to the province, otherwise null. */
export function resolveAddress(provinceCode: number, wardCode: number) {
  const p = byCode.get(provinceCode);
  const w = p?.wards.find(([code]) => code === wardCode);
  return p && w ? { province: p.name, ward: w[1] } : null;
}
