"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Activity } from "@/lib/api";
import { useAuth, type Me } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/** Customers pick what they're looking for; approved talents can see it (given name and province only). */
export default function LookingFor({ me }: { me: Me }) {
  const { t, locale } = useI18n();
  const { refresh } = useAuth();
  const [acts, setActs] = useState<Activity[]>([]);
  const [picked, setPicked] = useState<string[]>(me.lookingFor);
  const [note, setNote] = useState(me.lookingForNote);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<Activity[]>("/activities").then(setActs).catch(() => {}); }, []);

  const toggle = (slug: string) => setPicked((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : [...c, slug]));
  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await api<{ lookingForNote: string }>("/me/preferences", { method: "PUT", json: { lookingFor: picked, lookingForNote: note } });
      setNote(r.lookingForNote); await refresh(); setMsg({ ok: true, text: t("look.saved") });
    } catch { setMsg({ ok: false, text: t("auth.error") }); }
    setBusy(false);
  };

  return (
    <form onSubmit={(e) => void save(e)} className="card space-y-3">
      <h2 className="font-bold">{t("look.title")}</h2>
      <p className="text-xs text-muted">{t("look.intro")}</p>
      <div className="flex flex-wrap gap-2">
        {acts.map((a) => (
          <button type="button" key={a.slug} aria-pressed={picked.includes(a.slug)} onClick={() => toggle(a.slug)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${picked.includes(a.slug) ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong bg-white"}`}>
            {locale === "vi" ? a.nameVi : a.nameEn}
          </button>
        ))}
      </div>
      <div><label className="label">{t("look.note")}</label><textarea className="input" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <p className="text-xs text-muted">{t("look.hidden")}</p>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`} role="status">{msg.text}</p>}
      <button className="btn-primary" disabled={busy}>{t("look.save")}</button>
    </form>
  );
}
