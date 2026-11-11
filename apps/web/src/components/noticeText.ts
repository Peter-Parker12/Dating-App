import type { Notice } from "@/lib/api";
import type { Key, Locale } from "@/lib/i18n";
import { formatDay } from "@/lib/dates";

/** Notifications are stored as a type plus data, and rendered in the viewer's language. */
export function noticeText(n: Notice, t: (k: Key) => string, locale: Locale = "vi"): string {
  const d = n.data ?? {};
  const base = t(`notif.${n.type}` as Key);
  if (n.type === "KYC_REJECTED" && d.reason) return `${base} ${d.reason}`;
  if (n.type === "KYC_NEW_SUBMISSION" && d.name) return `${base} ${d.name}`;
  // Booking and review notices are templates: {name}, {activity}, {when}, {rating}
  return base
    .replace("{name}", d.name ?? "")
    .replace("{activity}", (locale === "vi" ? d.activityVi : d.activityEn) ?? d.activityVi ?? "")
    .replace("{when}", d.date ? `${d.time ?? ""}, ${formatDay(d.date, locale)}` : "")
    .replace("{rating}", d.rating ?? "");
}

/** Where tapping a notification should lead. */
export function noticeHref(n: Notice): string | null {
  if (n.type.startsWith("BOOKING_") || n.type === "REVIEW_REPLIED") return "/bookings";
  if (n.type === "REVIEW_RECEIVED") return "/talent";
  if (n.type === "KYC_NEW_SUBMISSION" || n.type === "ROLE_MODERATOR") return "/admin";
  if (n.type.startsWith("KYC_")) return "/verify";
  return null;
}
