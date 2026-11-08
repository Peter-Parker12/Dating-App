export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const BLOCKS = ["morning", "afternoon", "evening"] as const;
export type Day = (typeof DAYS)[number];

const VALID = new Set(DAYS.flatMap((d) => BLOCKS.map((b) => `${d}:${b}`)));

export const isValidSlot = (s: string): boolean => VALID.has(s);

/** Returns the slots deduplicated and in week order, or null if any slot is invalid. */
export function normalizeSlots(slots: string[]): string[] | null {
  if (!slots.every(isValidSlot)) return null;
  const set = new Set(slots);
  return [...VALID].filter((s) => set.has(s));
}

export const slotsForDay = (day: Day): string[] => BLOCKS.map((b) => `${day}:${b}`);
