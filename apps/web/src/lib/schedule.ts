// Same slot format as the API (apps/api/src/schedule.ts): "<day>:<block>", e.g. "mon:evening".
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const BLOCKS = ["morning", "afternoon", "evening"] as const;
export type Day = (typeof DAYS)[number];
