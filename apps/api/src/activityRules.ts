/** Icons an admin can choose for an activity. The web app maps each key to an icon (apps/web/src/components/activityIcons.ts). */
export const ACTIVITY_ICON_KEYS = [
  "coffee", "book-open", "landmark", "party-popper", "users", "dumbbell", "message-circle", "utensils",
  "film", "plane", "gamepad", "music", "camera", "shopping-bag", "heart", "sparkles",
  "mic", "palette", "bike", "briefcase", "graduation-cap", "footprints", "tree", "waves",
] as const;

/** "Cà phê & ăn uống" / "Coffee" -> a URL-safe, accent-free id such as "coffee". */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
  return slug || "activity";
}

/** Appends -2, -3, ... until the slug is not taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, 36)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();

/** Names must be unique (case-insensitive) in each language, ignoring the activity being edited. */
export function nameConflict(
  existing: { slug: string; nameVi: string; nameEn: string }[],
  candidate: { nameVi: string; nameEn: string },
  ignoreSlug?: string,
): "nameVi" | "nameEn" | null {
  for (const a of existing) {
    if (a.slug === ignoreSlug) continue;
    if (norm(a.nameVi) === norm(candidate.nameVi)) return "nameVi";
    if (norm(a.nameEn) === norm(candidate.nameEn)) return "nameEn";
  }
  return null;
}

export const usageTotal = (u: { talents: number; customers: number; bookings: number }) => u.talents + u.customers + u.bookings;

/** An activity can only be deleted when nothing refers to it; otherwise it should be hidden instead. */
export const canDeleteActivity = (u: { talents: number; customers: number; bookings: number }): boolean => usageTotal(u) === 0;

/** Moves one item up or down in a list; returns the new order of slugs (unchanged at the ends). */
export function moveSlug(order: string[], slug: string, direction: "up" | "down"): string[] {
  const i = order.indexOf(slug);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * New picks must be active activities; ones the user already has stay allowed even if the admin has since
 * hidden them, so saving an unrelated field never fails.
 */
export function invalidPicks(picked: string[], all: { slug: string; active: boolean }[], alreadyHad: string[] = []): string[] {
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  return picked.filter((slug) => {
    const a = bySlug.get(slug);
    return !a || (!a.active && !alreadyHad.includes(slug));
  });
}
