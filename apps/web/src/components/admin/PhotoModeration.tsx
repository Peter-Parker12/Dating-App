"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Item {
  id: string; kind: "PROFILE" | "GALLERY"; hidden: boolean; hiddenReason: string | null; createdAt: string;
  owner: { id: string; name: string; role: string }; reports: number; reasons: string[];
}

/** Admins and moderators review reported (or the latest) photos and remove the ones that break the rules. */
export default function PhotoModeration() {
  const { t } = useI18n();
  const [view, setView] = useState<"reported" | "recent">("reported");
  const [items, setItems] = useState<Item[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => api<Item[]>(`/admin/photos?view=${view}`).then(setItems).catch(() => setItems([])), [view]);
  useEffect(() => { void load(); }, [load]);

  const hide = async (id: string) => {
    setErr("");
    try { await api(`/admin/photos/${id}/hidden`, { method: "POST", json: { hidden: true, reason } }); setRemoving(null); setReason(""); await load(); }
    catch { setErr(t("auth.error")); }
  };
  const restore = async (id: string) => { await api(`/admin/photos/${id}/hidden`, { method: "POST", json: { hidden: false } }).catch(() => {}); await load(); };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">{t("admin.photos")}</h2>
        <div className="flex gap-1.5">
          {(["reported", "recent"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${view === v ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>
              {t(v === "reported" ? "admin.photosReported" : "admin.photosRecent")}
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {items === null ? null : items.length === 0 ? <p className="text-muted">{t("admin.photoNone")}</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className={`card !p-2 space-y-1.5 ${p.hidden ? "border-red-300" : p.reports ? "border-amber-300" : ""}`}>
              <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt="" loading="lazy" className={`aspect-square w-full rounded-md object-cover ${p.hidden ? "opacity-40" : ""}`} />
              </a>
              <div className="text-xs"><b>{p.owner.name}</b> · {p.owner.role} · {p.kind}</div>
              {p.reports > 0 && <div className="text-xs text-amber-700">⚑ {p.reports} {t("admin.photoReports")}{p.reasons.length ? `: ${p.reasons.join("; ")}` : ""}</div>}
              {p.hidden && <div className="text-xs text-red-600">{p.hiddenReason}</div>}
              {removing === p.id ? (
                <div className="space-y-1">
                  <input className="input !py-1.5 text-xs" placeholder={t("admin.photoReason")} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex gap-1.5">
                    <button className="btn-primary !px-3 !py-1 !text-xs" disabled={reason.trim().length < 3} onClick={() => void hide(p.id)}>{t("admin.photoRemove")}</button>
                    <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => { setRemoving(null); setReason(""); }}>{t("admin.cancel")}</button>
                  </div>
                </div>
              ) : p.hidden
                ? <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => void restore(p.id)}>{t("admin.photoRestore")}</button>
                : <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => { setRemoving(p.id); setReason(""); }}>{t("admin.photoRemove")}</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
