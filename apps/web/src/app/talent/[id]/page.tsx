"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, vnd, type Activity, type Talent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import Avatar from "@/components/Avatar";
import ReviewList from "@/components/ReviewList";
import { Stars } from "@/components/Stars";

export default function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const [talent, setTalent] = useState<Talent | null | undefined>(undefined);
  const [acts, setActs] = useState<Activity[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api<Talent>(`/talents/${id}`).then(setTalent).catch(() => setTalent(null));
    void api<Activity[]>("/activities").then(setActs).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (me?.role !== "CUSTOMER") return;
    void api<Talent[]>("/saved").then((s) => setSaved(s.some((x) => x.id === id))).catch(() => {});
  }, [me, id]);

  if (talent === undefined) return <p>{t("common.loading")}</p>;
  if (talent === null) return <p>404</p>;

  const actName = (slug: string) => { const a = acts.find((x) => x.slug === slug); return a ? (locale === "vi" ? a.nameVi : a.nameEn) : slug; };
  const rows: [string, string][] = [
    [t("talent.age"), String(talent.age)],
    [t("talent.height"), talent.heightCm ? `${talent.heightCm} cm` : "-"],
    [t("talent.style"), talent.style || "-"],
    [t("talent.languages"), talent.languages.join(", ") || "-"],
    [t("talent.availability"), talent.availability || "-"],
  ];

  return (
    <div className="space-y-6">
    <div className="card !p-4 md:!p-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-2">
        <Avatar talent={talent} className="aspect-[4/4.3] w-full !rounded-[20px] text-7xl" />
        {talent.photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {talent.photos.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={talent.displayName} className="aspect-square w-full rounded-xl object-cover" />
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
        <p className="whitespace-pre-line rounded-md bg-brand-50 p-3 text-sm italic">{talent.bio}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (<div key={k}><dt className="text-xs font-bold text-muted">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>))}
        </dl>
        <div>
          <div className="mb-1.5 text-xs font-bold text-muted">{t("talent.activities")}</div>
          <div className="flex flex-wrap gap-2">{talent.activities.map((a) => <span key={a} className="chip-pink">{actName(a)}</span>)}</div>
        </div>
        <div className="flex gap-2 pt-2">
          {me?.role === "CUSTOMER" && (
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
