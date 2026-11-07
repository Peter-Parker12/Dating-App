"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ShieldX } from "lucide-react";
import { api, apiForm, ApiError } from "@/lib/api";
import { useAuth, type Me } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Channel = "email" | "phone";
const DOCS = [
  { field: "idImage", label: "verify.idImage", has: "hasId" },
  { field: "studentCard", label: "verify.studentCard", has: "hasStudentCard" },
  { field: "profileImage", label: "verify.profileImage", has: "hasProfileImage" },
] as const;

const ERRORS: Record<string, Key> = {
  too_soon: "verify.tooSoon", too_many: "verify.tooMany", send_failed: "verify.sendFailed", no_code: "verify.noCode",
  code_expired: "verify.codeExpired", code_locked: "verify.codeLocked", code_used: "verify.noCode",
  bad_file_type: "verify.badType", file_too_large: "verify.tooLarge", missing_documents: "verify.needDocs",
  email_unverified: "verify.needSteps", phone_unverified: "verify.needSteps",
};

function OtpStep({ channel, me, onVerified }: { channel: Channel; me: Me; onVerified: () => void }) {
  const { t } = useI18n();
  const verified = channel === "email" ? me.emailVerified : me.phoneVerified;
  const target = channel === "email" ? me.email : me.phone;
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [cool, setCool] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cool <= 0) return;
    const h = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(h);
  }, [cool]);

  const fail = (e: unknown) => {
    if (!(e instanceof ApiError)) return setMsg(t("auth.error"));
    setMsg(e.code === "wrong_code" ? t("verify.wrongCode") : t(ERRORS[e.code] ?? "auth.error"));
  };
  const send = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ resendInSec: number }>(`/verify/${channel}/send`, { method: "POST" });
      setSent(true); setCool(r.resendInSec);
    } catch (e) { fail(e); }
    setBusy(false);
  };
  const confirm = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try { await api(`/verify/${channel}/confirm`, { method: "POST", json: { code } }); onVerified(); }
    catch (x) { fail(x); }
    setBusy(false);
  };

  return (
    <div className="card space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-ink">{t(channel === "email" ? "verify.step1" : "verify.step2")}</h2>
        {verified && <span className="chip-green"><CheckCircle2 size={13} /> {t("verify.verified")}</span>}
      </div>
      <p className="text-sm text-muted">{target}</p>
      {!verified && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-soft !py-2" disabled={busy || cool > 0} onClick={() => void send()}>
              {cool > 0 ? `${t("verify.resendIn")} ${cool}s` : sent ? t("verify.resend") : t("verify.sendCode")}
            </button>
          </div>
          {sent && (
            <form onSubmit={(e) => void confirm(e)} className="flex gap-2">
              <input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required
                placeholder={t("verify.code")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              <button className="btn-primary !py-2" disabled={busy || code.length !== 6}>{t("verify.confirm")}</button>
            </form>
          )}
          {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
        </>
      )}
    </div>
  );
}

export default function Verify() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const { refresh } = useAuth();
  const [files, setFiles] = useState<Partial<Record<(typeof DOCS)[number]["field"], File>>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  if (!me) return <p>{t("common.loading")}</p>;
  if (me.role === "ADMIN") return <p className="text-muted">-</p>;

  const pick = (field: (typeof DOCS)[number]["field"], f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    urls.current.push(url);
    setFiles((c) => ({ ...c, [field]: f }));
    setPreviews((c) => ({ ...c, [field]: url }));
  };

  const stepsDone = me.emailVerified && me.phoneVerified;
  const docsReady = DOCS.every((d) => files[d.field] || me[d.has]);
  const canSubmit = stepsDone && docsReady && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const fd = new FormData();
    for (const d of DOCS) if (files[d.field]) fd.append(d.field, files[d.field]!);
    try { await apiForm("/kyc/submit", fd); setFiles({}); setPreviews({}); await refresh(); }
    catch (x) { setMsg(x instanceof ApiError ? t(ERRORS[x.code] ?? "auth.error") : t("auth.error")); }
    setBusy(false);
  };

  if (me.kycStatus === "APPROVED") {
    return (
      <div className="card mx-auto max-w-lg space-y-3 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
        <h1 className="text-xl font-bold">{t("verify.approved")}</h1>
        <p className="text-sm text-muted">{t("verify.approvedHint")}</p>
        <Link href={me.role === "TALENT" ? "/talent" : "/explore"} className="btn-primary">{t("verify.explore")}</Link>
      </div>
    );
  }
  if (me.kycStatus === "IN_REVIEW") {
    return (
      <div className="card mx-auto max-w-lg space-y-3 text-center">
        <Clock size={40} className="mx-auto text-brand-500" />
        <h1 className="text-xl font-bold">{t("verify.inReview")}</h1>
        <p className="text-sm text-muted">{t("verify.inReviewHint")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="section-title">{t("verify.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("verify.intro")}</p>
      </div>
      {me.kycStatus === "REJECTED" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm" role="alert">
          <div className="flex items-center gap-2 font-bold text-red-700"><ShieldX size={16} /> {t("verify.rejected")}</div>
          {me.kycRejectReason && <p className="mt-1 text-ink"><b>{t("kyc.reason")}:</b> {me.kycRejectReason}</p>}
          <p className="mt-1 text-muted">{t("verify.resubmitHint")}</p>
        </div>
      )}
      <OtpStep channel="email" me={me} onVerified={() => void refresh()} />
      <OtpStep channel="phone" me={me} onVerified={() => void refresh()} />
      <form onSubmit={(e) => void submit(e)} className="card space-y-3">
        <h2 className="font-bold text-ink">{t("verify.step3")}</h2>
        <p className="text-xs text-muted">{t("verify.docsHint")}</p>
        {DOCS.map((d) => (
          <div key={d.field}>
            <label className="label" htmlFor={d.field}>{t(d.label)}</label>
            <div className="flex items-center gap-3">
              {previews[d.field] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={previews[d.field]} alt="" className="h-16 w-16 rounded-md border border-line object-cover" />}
              <div className="min-w-0 flex-1">
                <input id={d.field} type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(e) => pick(d.field, e.target.files?.[0])} />
                {me[d.has] && !files[d.field] && <p className="mt-1 text-xs text-emerald-600">✓ {t("verify.uploaded")}. {t("verify.replaceHint")}</p>}
              </div>
            </div>
          </div>
        ))}
        {!stepsDone && <p className="text-xs text-muted">{t("verify.needSteps")}</p>}
        {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
        <button className="btn-primary w-full" disabled={!canSubmit}>{t("verify.submit")}</button>
      </form>
    </div>
  );
}
