"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, vnd, type Activity, type Talent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

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
    <div className="card space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-4xl font-bold text-brand-600">{talent.displayName.charAt(0)}</div>
        <div>
          <h1 className="text-2xl font-bold">{talent.displayName}</h1>
          {talent.verified && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">✓ {t("talent.verified")}</span>}
          <div className="mt-1 font-semibold text-brand-600">{vnd(talent.hourlyPrice)} {t("talent.perHour")}</div>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-700">{talent.bio}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (<div key={k}><dt className="text-xs font-semibold text-slate-500">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <div>
        <div className="mb-1 text-xs font-semibold text-slate-500">{t("talent.activities")}</div>
        <div className="flex flex-wrap gap-2">{talent.activities.map((a) => <span key={a} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{actName(a)}</span>)}</div>
      </div>
      <div className="flex gap-2">
        {me?.role === "CUSTOMER" && (
          <button className="btn-ghost flex-1" onClick={async () => { await api(`/saved/${id}`, { method: saved ? "DELETE" : "PUT" }); setSaved(!saved); }}>
            {saved ? `♥ ${t("talent.saved")}` : `♡ ${t("talent.save")}`}
          </button>
        )}
        <Link href={me ? `/book/${id}` : "/login"} className="btn-primary flex-1">{t("talent.book")}</Link>
      </div>
    </div>
  );
}
