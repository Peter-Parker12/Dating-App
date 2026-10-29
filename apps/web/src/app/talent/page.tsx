"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Activity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function TalentDashboard() {
  const { t, locale } = useI18n();
  const { me } = useRequireAuth("TALENT");
  const { refresh } = useAuth();
  const [acts, setActs] = useState<Activity[]>([]);
  const [f, setF] = useState({
    displayName: "", gender: "female", age: 20, bio: "", heightCm: "", style: "", languages: "",
    hourlyPrice: 100000, activities: [] as string[], availability: "", published: true,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => { void api<Activity[]>("/activities").then(setActs).catch(() => {}); }, []);
  useEffect(() => {
    if (!me) return;
    const p = me.talent;
    setF((cur) => p ? {
      displayName: p.displayName, gender: p.gender, age: p.age, bio: p.bio, heightCm: p.heightCm ? String(p.heightCm) : "",
      style: p.style, languages: p.languages.join(", "), hourlyPrice: p.hourlyPrice, activities: p.activities,
      availability: p.availability, published: p.published,
    } : { ...cur, displayName: me.name });
  }, [me]);
  if (!me) return <p>{t("common.loading")}</p>;

  const save = async (e: FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      await api("/talent/profile", { method: "PUT", json: {
        ...f, heightCm: f.heightCm ? Number(f.heightCm) : null,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
      } });
      await refresh(); setMsg(t("talentdash.saved"));
    } catch { setMsg(t("auth.error")); }
  };
  const toggleAct = (slug: string) => setF((c) => ({ ...c, activities: c.activities.includes(slug) ? c.activities.filter((s) => s !== slug) : [...c.activities, slug] }));

  return (
    <form onSubmit={(e) => void save(e)} className="card mx-auto max-w-lg space-y-3">
      <h1 className="text-2xl font-bold">{t("talentdash.title")}</h1>
      <div><label className="label">{t("talentdash.name")}</label><input required className="input" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">{t("explore.gender")}</label>
          <select className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="female">{t("explore.female")}</option><option value="male">{t("explore.male")}</option><option value="other">{t("explore.other")}</option>
          </select></div>
        <div><label className="label">{t("talent.age")}</label><input type="number" min={18} max={80} className="input" value={f.age} onChange={(e) => setF({ ...f, age: Number(e.target.value) })} /></div>
        <div><label className="label">{t("talentdash.height")}</label><input type="number" className="input" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} /></div>
      </div>
      <div><label className="label">{t("talentdash.bio")}</label><textarea rows={4} maxLength={1000} className="input" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
      <div><label className="label">{t("talent.style")}</label><input className="input" value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })} /></div>
      <div><label className="label">{t("talentdash.langs")}</label><input className="input" value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} /></div>
      <div><label className="label">{t("talentdash.price")}</label><input type="number" min={0} step={10000} className="input" value={f.hourlyPrice} onChange={(e) => setF({ ...f, hourlyPrice: Number(e.target.value) })} /></div>
      <div><label className="label">{t("talent.availability")}</label><input className="input" value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })} /></div>
      <div>
        <div className="label">{t("talent.activities")}</div>
        <div className="flex flex-wrap gap-2">
          {acts.map((a) => (
            <button type="button" key={a.slug} onClick={() => toggleAct(a.slug)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${f.activities.includes(a.slug) ? "border-brand-600 bg-brand-600 text-white" : "border-rose-200 bg-white"}`}>
              {locale === "vi" ? a.nameVi : a.nameEn}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />{t("talentdash.published")}</label>
      {msg && <p className="text-sm text-brand-700">{msg}</p>}
      <button className="btn-primary w-full">{t("talentdash.save")}</button>
    </form>
  );
}
