"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type ReviewSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Stars } from "./Stars";

/** Public reviews for a talent. The owning talent can reply; any logged-in customer can report. */
export default function ReviewList({ talentId }: { talentId: string }) {
  const { t } = useI18n();
  const { me } = useAuth();
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = useCallback(() => api<ReviewSummary>(`/talents/${talentId}/reviews`).then(setData).catch(() => setData({ avg: 0, count: 0, breakdown: [0, 0, 0, 0, 0], reviews: [] })), [talentId]);
  useEffect(() => { void load(); }, [load]);
  if (!data) return null;

  const isOwner = me?.id === talentId;
  const sendReply = async (id: string) => {
    if (!text.trim()) return;
    await api(`/reviews/${id}/reply`, { method: "POST", json: { reply: text } });
    setReplying(null); setText(""); await load();
  };
  const report = async (id: string) => {
    await api(`/reviews/${id}/report`, { method: "POST", json: {} }).catch(() => {});
    setReported((s) => new Set(s).add(id));
  };

  return (
    <section className="space-y-4">
      <h2 className="section-title">{t("rev.title")} {data.count > 0 && <span>{data.avg.toFixed(1)} ★ ({data.count})</span>}</h2>
      {data.count === 0 ? <p className="text-muted">{t("rev.none")}</p> : (
        <>
          <div className="grid gap-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-3 font-bold text-ink">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(data.breakdown[n - 1] / data.count) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-muted">{data.breakdown[n - 1]}</span>
              </div>
            ))}
          </div>
          <ul className="grid gap-3">
            {data.reviews.map((r) => (
              <li key={r.id} className="rounded-md border border-line bg-white p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><b className="text-ink">{r.author}</b><Stars value={r.rating} /></div>
                  <time className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</time>
                </div>
                {r.comment && <p className="mt-1.5 whitespace-pre-line text-sm">{r.comment}</p>}
                {r.reply && (
                  <div className="mt-2 rounded-[10px] bg-brand-50 p-2.5 text-sm">
                    <div className="text-xs font-bold text-brand-600">{t("rev.replyBy")}</div>
                    {r.reply}
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-xs">
                  {isOwner && !r.reply && replying !== r.id && (
                    <button className="font-bold text-brand-600" onClick={() => { setReplying(r.id); setText(""); }}>{t("rev.reply")}</button>
                  )}
                  {me && !isOwner && me.role === "CUSTOMER" && (
                    reported.has(r.id) ? <span className="text-muted">{t("rev.reported")}</span>
                      : <button className="text-muted hover:text-brand-600" onClick={() => void report(r.id)}>{t("rev.report")}</button>
                  )}
                </div>
                {replying === r.id && (
                  <div className="mt-2 flex gap-2">
                    <input className="input" maxLength={500} placeholder={t("rev.replyPh")} value={text} onChange={(e) => setText(e.target.value)} />
                    <button className="btn-primary !py-2" onClick={() => void sendReply(r.id)}>{t("rev.reply")}</button>
                    <button className="btn-ghost !py-2" onClick={() => setReplying(null)}>{t("rev.cancel")}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
