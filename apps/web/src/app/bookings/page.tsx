"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Activity, type Booking } from "@/lib/api";
import { bookingStarted, formatDay } from "@/lib/dates";
import type { Key } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import ReviewForm from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function Bookings() {
  const { t, locale } = useI18n();
  const { me } = useRequireAuth(undefined, { approved: true });
  const [acts, setActs] = useState<Activity[]>([]);
  const [err, setErr] = useState<{ id: string; text: string } | null>(null);
  const [items, setItems] = useState<Booking[] | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const load = useCallback(() => api<Booking[]>("/bookings").then(setItems).catch(() => setItems([])), []);
  useEffect(() => { if (me) { void load(); void api<Activity[]>("/activities").then(setActs).catch(() => {}); } }, [me, load]);
  if (!me) return <p>{t("common.loading")}</p>;

  const actLabel = (slug: string) => { const a = acts.find((x) => x.slug === slug); return a ? (locale === "vi" ? a.nameVi : a.nameEn) : slug; };
  const act = async (id: string, status: string) => {
    setErr(null);
    try { await api(`/bookings/${id}/status`, { method: "POST", json: { status } }); }
    catch (x) {
      const code = x instanceof ApiError ? x.code : "error";
      const known: Record<string, Key> = { time_conflict: "bookings.err.time_conflict", too_early: "bookings.err.too_early", bad_transition: "bookings.err.bad_transition" };
      setErr({ id, text: t(known[code] ?? "bookings.err.error") });
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("bookings.title")}</h1>
      {items === null ? <p>{t("common.loading")}</p> : items.length === 0 ? <p className="text-muted">{t("bookings.empty")}</p> : items.map((b) => {
        const mine = me.id === b.customerId ? "customer" : "talent";
        const other = mine === "customer" ? (b.talent.talent?.displayName ?? b.talent.name) : b.customer.name;
        return (
          <div key={b.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold">{other}</div>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">{t(`status.${b.status}`)}</span>
            </div>
            <div className="text-sm text-muted">{actLabel(b.activity)} · {formatDay(b.date, locale)} {b.startTime} · {b.hours} {t("common.hours")} · {b.place}</div>
            {b.note && <div className="text-xs text-muted">{b.note}</div>}
            <div className="flex flex-wrap gap-2">
              {mine === "talent" && b.status === "PENDING" && (<>
                <button className="btn-primary !py-1.5" onClick={() => void act(b.id, "ACCEPTED")}>{t("bookings.accept")}</button>
                <button className="btn-ghost !py-1.5" onClick={() => void act(b.id, "DECLINED")}>{t("bookings.decline")}</button>
              </>)}
              {mine === "customer" && (b.status === "PENDING" || b.status === "ACCEPTED") && (
                <button className="btn-ghost !py-1.5" onClick={() => void act(b.id, "CANCELLED")}>{t("bookings.cancel")}</button>
              )}
              {b.status === "ACCEPTED" && (<>
                <Link href={`/chat/${b.id}`} className="btn-primary !py-1.5">{t("bookings.chat")}</Link>
                <button className="btn-ghost !py-1.5" disabled={!bookingStarted(b)} title={bookingStarted(b) ? undefined : t("bookings.err.too_early")} onClick={() => void act(b.id, "COMPLETED")}>{t("bookings.complete")}</button>
              </>)}
              {b.status === "COMPLETED" && <Link href={`/chat/${b.id}`} className="btn-ghost !py-1.5">{t("bookings.chat")}</Link>}
              {b.status === "COMPLETED" && mine === "customer" && reviewing !== b.id && (
                <button className="btn-soft !py-1.5" onClick={() => setReviewing(b.id)}>{b.review ? t("rev.edit") : t("rev.write")}</button>
              )}
            </div>
            {err?.id === b.id && <p className="text-sm text-red-600" role="alert">{err.text}</p>}
            {b.review && reviewing !== b.id && <div className="flex items-center gap-2 text-xs text-muted"><Stars value={b.review.rating} /> {t("rev.reviewed")}</div>}
            {reviewing === b.id && <ReviewForm booking={b} onDone={() => { setReviewing(null); void load(); }} />}
          </div>
        );
      })}
    </div>
  );
}
