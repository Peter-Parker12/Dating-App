const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2030-03-10" -> "10/03/2030" (vi) or "10 March 2030" (en). Booking dates are plain calendar days. */
export function formatDay(iso: string, locale: "vi" | "en"): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return locale === "vi" ? `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/** Booking times are Vietnam local time (UTC+7) and the date is stored as UTC midnight (same rule as the API). */
export function bookingStarted(b: { date: string; startTime: string }, now = Date.now()): boolean {
  const [h, m] = b.startTime.split(":").map(Number);
  return now >= new Date(b.date).getTime() + (h * 60 + m - 7 * 60) * 60_000;
}
