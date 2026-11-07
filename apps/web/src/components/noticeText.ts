import type { Notice } from "@/lib/api";
import type { Key } from "@/lib/i18n";

/** Notifications are stored as a type plus data, and rendered in the viewer's language. */
export function noticeText(n: Notice, t: (k: Key) => string): string {
  const base = t(`notif.${n.type}` as Key);
  if (n.type === "KYC_REJECTED" && n.data?.reason) return `${base} ${n.data.reason}`;
  if (n.type === "KYC_NEW_SUBMISSION" && n.data?.name) return `${base} ${n.data.name}`;
  return base;
}
