"use client";
import { use, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type Activity } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

const CONDUCT: Key[] = ["book.c1", "book.c2", "book.c3", "book.c4"];

export default function Book({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { me } = useRequireAuth("CUSTOMER");
  const router = useRouter();
  const [acts, setActs] = useState<Activity[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ activity: "cafe", date: "", startTime: "19:00", hours: 2, place: "", note: "" });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void api<Activity[]>("/activities").then(setActs).catch(() => {}); }, []);
  if (!me) return <p>{t("common.loading")}</p>;

  const next = (e: FormEvent) => { e.preventDefault(); setStep(2); };
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await api("/bookings", { method: "POST", json: { talentId: id, ...f, conductAccepted: true } });
      window.alert(t("book.done"));
      router.push("/bookings");
    } catch { setErr(t("auth.error")); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{t("book.title")}</h1>
      <div className="flex gap-2 text-xs font-bold">
        <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"}`}>1. {t("book.info")}</span>
        <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"}`}>2. {t("book.conduct")}</span>
      </div>
      {step === 1 ? (
        <form onSubmit={next} className="card space-y-3">
          <div><label className="label">{t("book.activity")}</label>
            <select className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}>
              {acts.map((a) => <option key={a.slug} value={a.slug}>{locale === "vi" ? a.nameVi : a.nameEn}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{t("book.date")}</label><input required type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><label className="label">{t("book.time")}</label><input required type="time" className="input" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></div>
          </div>
          <div><label className="label">{t("book.hours")}</label><input type="number" min={1} max={12} className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></div>
          <div><label className="label">{t("book.place")}</label><input required minLength={3} className="input" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></div>
          <div><label className="label">{t("book.note")}</label><textarea maxLength={500} rows={3} className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <button className="btn-primary w-full">{t("book.next")}</button>
        </form>
      ) : (
        <div className="card space-y-3">
          <h2 className="font-bold">{t("book.conductTitle")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{CONDUCT.map((k) => <li key={k}>{t(k)}</li>)}</ul>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{t("book.agree")}</label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setStep(1)}>{t("book.back")}</button>
            <button className="btn-primary flex-1" disabled={!agree || busy} onClick={() => void submit()}>{t("book.send")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
