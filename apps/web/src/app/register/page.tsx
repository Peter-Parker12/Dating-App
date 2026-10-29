"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function Register() {
  const { t, locale } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "CUSTOMER" });
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      await api("/auth/register", { method: "POST", json: { ...f, locale } });
      await refresh(); router.push(f.role === "TALENT" ? "/talent" : "/explore");
    } catch (x) { setErr(x instanceof ApiError && x.status === 409 ? t("auth.taken") : t("auth.error")); }
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="card mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-bold">{t("nav.register")}</h1>
      <div><label className="label">{t("auth.name")}</label><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">{t("auth.email")}</label><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><label className="label">{t("auth.password")}</label><input required minLength={8} type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <div><label className="label">{t("auth.role")}</label>
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="CUSTOMER">{t("auth.customer")}</option><option value="TALENT">{t("auth.talent")}</option>
        </select></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn-primary w-full">{t("auth.submitRegister")}</button>
      <p className="text-center text-sm"><Link className="text-brand-600 underline" href="/login">{t("nav.login")}</Link></p>
    </form>
  );
}
