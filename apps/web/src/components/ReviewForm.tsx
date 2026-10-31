"use client";
import { useState } from "react";
import { api, type Booking } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { StarInput } from "./Stars";

export default function ReviewForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const { t } = useI18n();
  const existing = booking.review;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setBusy(true); setErr("");
    try {
      if (existing) await api(`/reviews/${existing.id}`, { method: "PUT", json: { rating, comment } });
      else await api(`/bookings/${booking.id}/review`, { method: "POST", json: { rating, comment } });
      onDone();
    } catch (e) {
      setErr((e as Error).message === "edit_window_closed" ? t("rev.closed") : t("auth.error"));
    }
    setBusy(false);
  };

  return (
    <div className="mt-2 space-y-2 rounded-md bg-brand-50 p-3">
      <div><div className="label">{t("rev.rating")}</div><StarInput value={rating} onChange={setRating} /></div>
      <div><label className="label">{t("rev.comment")}</label><textarea className="input" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-primary !py-1.5" disabled={!rating || busy} onClick={() => void submit()}>{t("rev.submit")}</button>
        <button className="btn-ghost !py-1.5" onClick={onDone}>{t("rev.cancel")}</button>
      </div>
    </div>
  );
}
