"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

interface Unit { code: number; name: string }

const PHONE_RE = /^0(3|5|7|8|9)\d{8}$/;
const normalizePhone = (v: string) => v.trim().replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");

export default function Register() {
  const { t, locale } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", gender: "female", password: "", provinceCode: "", wardCode: "", addressLine: "" });
  const [provinces, setProvinces] = useState<Unit[]>([]);
  const [wards, setWards] = useState<Unit[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void api<Unit[]>("/geo/provinces").then(setProvinces).catch(() => {}); }, []);

  const pickProvince = async (code: string) => {
    setF((c) => ({ ...c, provinceCode: code, wardCode: "" }));
    setWards([]);
    if (!code) return;
    setWardsLoading(true);
    try { setWards(await api<Unit[]>(`/geo/provinces/${code}/wards`)); } catch { setErr(t("auth.error")); }
    setWardsLoading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    if (!f.name.trim() || !f.email || !f.phone || !f.password || !f.provinceCode || !f.wardCode || !f.addressLine.trim()) return setErr(t("auth.required"));
    if (!PHONE_RE.test(normalizePhone(f.phone))) return setErr(t("auth.badPhone"));
    if (f.addressLine.trim().length < 5) return setErr(t("auth.shortAddress"));
    setBusy(true);
    try {
      await api("/auth/register", { method: "POST", json: {
        name: f.name, email: f.email, phone: f.phone, gender: f.gender, password: f.password,
        provinceCode: Number(f.provinceCode), wardCode: Number(f.wardCode), addressLine: f.addressLine, locale,
      } });
      await refresh(); router.push("/verify");
    } catch (x) {
      const code = x instanceof ApiError ? x.code : "";
      const msg: Record<string, Key> = {
        email_taken: "auth.taken", phone_taken: "auth.phoneTaken", email_or_phone_taken: "auth.phoneTaken",
        invalid_address: "auth.badAddress",
      };
      setErr(t(msg[code] ?? "auth.error"));
    }
    setBusy(false);
  };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={(e) => void submit(e)} className="card mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-bold">{t("nav.register")}</h1>
      <div><label className="label">{t("auth.name")}</label><input required autoComplete="name" className="input" value={f.name} onChange={set("name")} /></div>
      <div><label className="label">{t("auth.email")}</label><input required type="email" autoComplete="email" className="input" value={f.email} onChange={set("email")} /></div>
      <div><label className="label">{t("auth.phone")}</label><input required type="tel" inputMode="tel" autoComplete="tel" placeholder={t("auth.phonePh")} className="input" value={f.phone} onChange={set("phone")} /></div>
      <div><label className="label">{t("auth.gender")}</label>
        <select required className="input" value={f.gender} onChange={set("gender")}>
          <option value="female">{t("auth.female")}</option><option value="male">{t("auth.male")}</option>
        </select>
        <p className="mt-1 text-xs text-muted">{t("auth.genderHint")}</p></div>
      <fieldset className="space-y-3 rounded-md border border-line p-3">
        <legend className="px-1 text-xs font-bold text-muted">{t("profile.address")}</legend>
        <div><label className="label">{t("auth.province")}</label>
          <select required className="input" value={f.provinceCode} onChange={(e) => void pickProvince(e.target.value)}>
            <option value="">{t("auth.pickProvince")}</option>
            {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select></div>
        <div><label className="label">{t("auth.ward")}</label>
          <select required className="input" disabled={!f.provinceCode || wardsLoading} value={f.wardCode} onChange={set("wardCode")}>
            <option value="">{wardsLoading ? t("auth.loadingWards") : t("auth.pickWard")}</option>
            {wards.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select></div>
        <div><label className="label">{t("auth.addressLine")}</label><input required minLength={5} maxLength={120} autoComplete="street-address" placeholder={t("auth.addressPh")} className="input" value={f.addressLine} onChange={set("addressLine")} /></div>
        <p className="text-xs text-muted">{t("auth.addressHint")}</p>
      </fieldset>
      <div><label className="label">{t("auth.password")}</label><input required minLength={8} type="password" autoComplete="new-password" className="input" value={f.password} onChange={set("password")} /></div>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{t("auth.submitRegister")}</button>
      <p className="text-center text-sm"><Link className="text-brand-600 underline" href="/login">{t("nav.login")}</Link></p>
    </form>
  );
}
