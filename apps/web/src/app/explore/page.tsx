"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Activity, type Talent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import TalentCard from "@/components/TalentCard";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("explore.title")}</h1>
      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <label className="label">{t("explore.activity")}</label>
          <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="">{t("explore.all")}</option>
            {activities.map((a) => <option key={a.slug} value={a.slug}>{locale === "vi" ? a.nameVi : a.nameEn}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t("explore.maxPrice")}</label>
          <input className="input" type="number" min={0} step={10000} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
      </div>
      {talents === null ? <p>{t("common.loading")}</p> : talents.length === 0 ? <p className="text-slate-500">{t("explore.empty")}</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {talents.map((x) => (
            <TalentCard key={x.id} talent={x} saved={saved.has(x.id)} onToggleSave={me?.role === "CUSTOMER" ? () => void toggle(x.id) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
