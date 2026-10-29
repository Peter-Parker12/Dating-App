"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function Login() {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      await api("/auth/login", { method: "POST", json: { email, password } });
      await refresh(); router.push("/explore");
    } catch (x) { setErr(x instanceof ApiError && x.status === 401 ? t("auth.badCreds") : t("auth.error")); }
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="card mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-bold">{t("nav.login")}</h1>
      <div><label className="label">{t("auth.email")}</label><input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">{t("auth.password")}</label><input required type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn-primary w-full">{t("auth.submitLogin")}</button>
      <p className="text-center text-sm"><Link className="text-brand-600 underline" href="/register">{t("nav.register")}</Link></p>
    </form>
  );
}
