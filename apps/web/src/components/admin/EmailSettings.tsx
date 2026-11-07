"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

interface Loaded {
  source: "db" | "env" | "none"; host: string; port: number; secure: boolean; user: string; from: string;
  hasPassword: boolean; passwordUnreadable: boolean;
}

export default function EmailSettings() {
  const { t } = useI18n();
  const { me } = useAuth();
  const [info, setInfo] = useState<Loaded | null>(null);
  const [f, setF] = useState({ host: "", port: "587", secure: false, user: "", pass: "", from: "", clearPassword: false });
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api<Loaded>("/admin/settings/email");
    setInfo(d);
    setF({ host: d.host, port: String(d.port), secure: d.secure, user: d.user, pass: "", from: d.from, clearPassword: false });
  }, []);
  useEffect(() => { void load().catch(() => {}); }, [load]);
  useEffect(() => { if (me && !testTo) setTestTo(me.email); }, [me, testTo]);
  if (!info) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await api("/admin/settings/email", { method: "PUT", json: {
        host: f.host, port: Number(f.port), secure: f.secure, user: f.user || undefined,
        pass: f.pass || undefined, clearPassword: f.clearPassword || undefined, from: f.from,
      } });
      await load(); setMsg({ ok: true, text: t("admin.emailSaved") });
    } catch (x) {
      setMsg({ ok: false, text: x instanceof ApiError && x.code === "invalid" ? t("admin.emailInvalid") : t("auth.error") });
    }
    setBusy(false);
  };
  const reset = async () => { await api("/admin/settings/email", { method: "DELETE" }); await load(); setMsg(null); };
  const test = async () => {
    setBusy(true); setMsg(null);
    try { await api("/admin/settings/email/test", { method: "POST", json: { to: testTo } }); setMsg({ ok: true, text: t("admin.emailTestOk") }); }
    catch (x) {
      const code = x instanceof ApiError ? x.code : "";
      const detail = x instanceof ApiError && x.detail ? `: ${x.detail}` : "";
      setMsg({ ok: false, text: code === "not_configured" ? t("admin.emailNotConfigured") : `${t("admin.emailFailed")}${detail}` });
    }
    setBusy(false);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{t("admin.emailTitle")}</h2>
      <form onSubmit={(e) => void save(e)} className="card space-y-3">
        <p className="text-sm text-muted">{t("admin.emailIntro")}</p>
        <p className={`text-xs font-bold ${info.source === "none" ? "text-red-600" : "text-emerald-600"}`}>{t(`admin.emailSource.${info.source}` as Key)}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <div><label className="label">{t("admin.smtpHost")}</label><input required className="input" placeholder="smtp.example.com" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} /></div>
          <div><label className="label">{t("admin.smtpPort")}</label><input required type="number" min={1} max={65535} className="input" value={f.port} onChange={(e) => setF({ ...f, port: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.secure} onChange={(e) => setF({ ...f, secure: e.target.checked })} />{t("admin.smtpSecure")}</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">{t("admin.smtpUser")}</label><input autoComplete="off" className="input" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} /></div>
          <div><label className="label">{t("admin.smtpPass")}</label>
            <input type="password" autoComplete="new-password" className="input" disabled={f.clearPassword}
              placeholder={info.hasPassword ? t("admin.smtpPassKeep") : ""} value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
            {info.passwordUnreadable && <p className="mt-1 text-xs text-red-600">{t("admin.smtpPassUnreadable")}</p>}
            {info.hasPassword && (
              <label className="mt-1 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={f.clearPassword} onChange={(e) => setF({ ...f, clearPassword: e.target.checked, pass: "" })} />{t("admin.smtpClearPass")}</label>
            )}
          </div>
        </div>
        <div><label className="label">{t("admin.smtpFrom")}</label><input required className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /><p className="mt-1 text-xs text-muted">{t("admin.smtpFromHint")}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary !py-2" disabled={busy}>{t("admin.emailSave")}</button>
          {info.source === "db" && <button type="button" className="btn-ghost !py-2" disabled={busy} onClick={() => void reset()}>{t("admin.emailReset")}</button>}
        </div>
        <div className="border-t border-line pt-3">
          <label className="label">{t("admin.emailTestTo")}</label>
          <div className="flex flex-wrap gap-2">
            <input type="email" className="input min-w-0 flex-1" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <button type="button" className="btn-soft !py-2" disabled={busy || !testTo} onClick={() => void test()}>{t("admin.emailTest")}</button>
          </div>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`} role="status">{msg.text}</p>}
      </form>
    </section>
  );
}
