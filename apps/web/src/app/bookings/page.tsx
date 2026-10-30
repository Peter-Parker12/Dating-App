"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Booking } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function Bookings() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const [items, setItems] = useState<Booking[] | null>(null);
  const load = useCallback(() => api<Booking[]>("/bookings").then(setItems).catch(() => setItems([])), []);
  useEffect(() => { if (me) void load(); }, [me, load]);
  if (!me) return <p>{t("common.loading")}</p>;

  const act = async (id: string, status: string) => { await api(`/bookings/${id}/status`, { method: "POST", json: { status } }); await load(); };

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
            <div className="text-sm text-muted">{b.activity} · {new Date(b.date).toLocaleDateString()} {b.startTime} · {b.hours} {t("common.hours")} · {b.place}</div>
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
                <button className="btn-ghost !py-1.5" onClick={() => void act(b.id, "COMPLETED")}>{t("bookings.complete")}</button>
              </>)}
              {b.status === "COMPLETED" && <Link href={`/chat/${b.id}`} className="btn-ghost !py-1.5">{t("bookings.chat")}</Link>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
