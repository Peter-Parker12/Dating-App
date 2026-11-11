"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, vnd, type Activity, type Talent } from "@/lib/api";
import { isApproved, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import Avatar from "@/components/Avatar";
import { Flag } from "lucide-react";
import ReviewList from "@/components/ReviewList";
import ScheduleGrid from "@/components/ScheduleGrid";
import { Stars } from "@/components/Stars";

export default function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const [talent, setTalent] = useState<Talent | null | undefined>(undefined);
  const [acts, setActs] = useState<Activity[]>([]);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(0);
  const [reportMsg, setReportMsg] = useState("");

  useEffect(() => {
    void api<Talent>(`/talents/${id}`).then(setTalent).catch(() => setTalent(null));
    void api<Activity[]>("/activities").then(setActs).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (me?.role !== "CUSTOMER" || !isApproved(me)) return;
    void api<Talent[]>("/saved").then((s) => setSaved(s.some((x) => x.id === id))).catch(() => {});
  }, [me, id]);

  const reportPhoto = async (src: string) => {
    const reason = window.prompt(t("photos.reportAsk")) ;
    if (reason === null) return;
    try { await api(`${src.replace("/api", "")}/report`, { method: "POST", json: { reason } }); setReportMsg(t("photos.reported")); } catch {}
  };

  if (talent === undefined) return <p>{t("common.loading")}</p>;
  if (talent === null) return <p>404</p>;

  const actName = (slug: string) => { const a = acts.find((x) => x.slug === slug); return a ? (locale === "vi" ? a.nameVi : a.nameEn) : slug; };
  const rows: [string, string][] = [
    [t("talent.age"), String(talent.age)],
    [t("talent.height"), talent.heightCm ? `${talent.heightCm} cm` : "-"],
    [t("talent.style"), talent.style || "-"],
    [t("talent.languages"), talent.languages.join(", ") || "-"],
  ];

  return (
    <div className="space-y-6">
    <div className="card !p-4 md:!p-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-2">
        <div className="relative">
          {talent.photos.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.photos[active] ?? talent.photos[0]} alt={talent.displayName} className="aspect-[4/4.3] w-full rounded-[20px] object-cover" />
          ) : <Avatar talent={talent} className="aspect-[4/4.3] w-full !rounded-[20px] text-7xl" />}
          {isApproved(me) && me?.id !== talent.id && (talent.photos[active] ?? "").startsWith("/api/photos/") && (
            <button type="button" onClick={() => void reportPhoto(talent.photos[active])} className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-muted shadow hover:text-red-600">
              <Flag size={12} /> {t("photos.report")}
            </button>
          )}
        </div>
        {reportMsg && <p className="text-xs text-emerald-600" role="status">{reportMsg}</p>}
        {talent.photos.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {talent.photos.map((src, i) => (
              <button key={src} type="button" onClick={() => setActive(i)} aria-label={`${talent.displayName} ${i + 1}`} aria-current={i === active}
                className={`overflow-hidden rounded-xl border-2 ${i === active ? "border-brand-500" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          {talent.verified && <span className="chip-green mb-2">✓ {t("talent.verified")}</span>}
          <h1 className="text-3xl font-black">{talent.displayName}, {talent.age}</h1>
          {talent.ratingCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-sm"><Stars value={talent.ratingAvg} /> <b className="text-ink">{talent.ratingAvg.toFixed(2)}</b> <span className="text-muted">({talent.ratingCount})</span></div>
          )}
          <div className="mt-1 text-lg font-extrabold text-brand-600">{vnd(talent.hourlyPrice)} <span className="text-sm font-medium text-muted">{t("talent.perHour")}</span></div>
        </div>
        {talent.bio && <p className="whitespace-pre-line rounded-md bg-brand-50 p-3 text-sm italic">{talent.bio}</p>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (<div key={k}><dt className="text-xs font-bold text-muted">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>))}
        </dl>
        <div>
          <div className="mb-1.5 text-xs font-bold text-muted">{t("sched.title")}</div>
          {talent.schedule.length ? <ScheduleGrid value={talent.schedule} /> : <p className="text-sm text-muted">{t("sched.none")}</p>}
          {talent.availability && <p className="mt-1.5 text-sm">{talent.availability}</p>}
        </div>
        <div>
          <div className="mb-1.5 text-xs font-bold text-muted">{t("talent.activities")}</div>
          <div className="flex flex-wrap gap-2">{talent.activities.map((a) => <span key={a} className="chip-pink">{actName(a)}</span>)}</div>
        </div>
        <div className="flex gap-2 pt-2">
          {me?.role === "CUSTOMER" && isApproved(me) && (
            <button className="btn-ghost flex-1" onClick={async () => { await api(`/saved/${id}`, { method: saved ? "DELETE" : "PUT" }); setSaved(!saved); }}>
              {saved ? `♥ ${t("talent.saved")}` : `♡ ${t("talent.save")}`}
            </button>
          )}
          <Link href={me ? `/book/${id}` : "/login"} className="btn-primary flex-1">{t("talent.book")}</Link>
        </div>
      </div>
    </div>
    <div className="card !p-4 md:!p-6"><ReviewList talentId={id} /></div>
    </div>
  );
}
