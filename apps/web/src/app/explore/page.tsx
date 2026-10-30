"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Activity, type Talent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import TalentCard from "@/components/TalentCard";
import { activityIcon } from "@/components/activityIcons";

export default function Explore() {
  const { t, locale } = useI18n();
  const { me } = useAuth();
  const [talents, setTalents] = useState<Talent[] | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [gender, setGender] = useState("");
  const [activity, setActivity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { void api<Activity[]>("/activities").then(setActivities).catch(() => {}); }, []);
  useEffect(() => {
    if (me?.role !== "CUSTOMER") return;
    void api<Talent[]>("/saved").then((s) => setSaved(new Set(s.map((x) => x.id)))).catch(() => {});
  }, [me]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (activity) params.set("activity", activity);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (q) params.set("q", q);
    const h = setTimeout(() => void api<Talent[]>(`/talents?${params}`).then(setTalents).catch(() => setTalents([])), 200);
    return () => clearTimeout(h);
  }, [gender, activity, maxPrice, q]);

  const toggle = useCallback(async (id: string) => {
    const has = saved.has(id);
    await api(`/saved/${id}`, { method: has ? "DELETE" : "PUT" });
    setSaved((s) => { const n = new Set(s); if (has) n.delete(id); else n.add(id); return n; });
  }, [saved]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">{t("explore.title")}</h1>
        <p className="section-script">{t("explore.script")}</p>
      </div>
      <div className="card !p-5 space-y-4">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {[{ slug: "", label: t("explore.all") }, ...activities.map((a) => ({ slug: a.slug, label: locale === "vi" ? a.nameVi : a.nameEn }))].map((a) => {
            const Icon = activityIcon(a.slug || "all");
            const on = activity === a.slug;
            return (
              <button key={a.slug || "all"} onClick={() => setActivity(a.slug)}
                className={`flex flex-col items-center justify-center gap-2 rounded-md border-[1.5px] px-1.5 py-3.5 text-center text-xs font-semibold leading-tight transition ${on ? "border-brand-500 bg-brand-500 text-white shadow-btn" : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm"}`}>
                <Icon size={22} className={on ? "text-white" : "text-brand-500"} />
                {a.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">{t("explore.search")}</label><input className="input" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div>
            <label className="label">{t("explore.gender")}</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t("explore.all")}</option>
              <option value="female">{t("explore.female")}</option>
              <option value="male">{t("explore.male")}</option>
              <option value="other">{t("explore.other")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("explore.maxPrice")}</label>
            <input className="input" type="number" min={0} step={10000} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        </div>
      </div>
      {talents === null ? <p>{t("common.loading")}</p> : talents.length === 0 ? <p className="text-muted">{t("explore.empty")}</p> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {talents.map((x) => (
            <TalentCard key={x.id} talent={x} saved={saved.has(x.id)} onToggleSave={me?.role === "CUSTOMER" ? () => void toggle(x.id) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
