"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, ShieldX, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth, type Me } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { DOC_KINDS, useUploads, type DocKind, type Slot } from "@/lib/uploads";

type Channel = "email" | "phone";
const DOC_LABEL: Record<DocKind, Key> = { id: "verify.idImage", student: "verify.studentCard", profile: "verify.profileImage" };

const ERRORS: Record<string, Key> = {
  too_soon: "verify.tooSoon", too_many: "verify.tooMany", send_failed: "verify.sendFailed", no_code: "verify.noCode",
  code_expired: "verify.codeExpired", code_locked: "verify.codeLocked", code_used: "verify.noCode",
  missing_documents: "verify.needDocs",
  contact_unverified: "verify.needSteps",
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

const UPLOAD_ERRORS: Record<string, Key> = {
  network: "verify.err.network", file_too_large: "verify.err.file_too_large", bad_file_type: "verify.err.bad_file_type", not_allowed: "verify.err.not_allowed",
};

function DocRow({ kind }: { kind: DocKind }) {
  const { t } = useI18n();
  const { slots, pick, retry, remove } = useUploads();
  const slot: Slot = slots[kind];
  const working = slot.phase === "compressing" || slot.phase === "uploading";
  return (
    <div>
      <label className="label" htmlFor={`doc-${kind}`}>{t(DOC_LABEL[kind])}</label>
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-brand-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {slot.preview ? <img src={slot.preview} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input id={`doc-${kind}`} type="file" accept="image/jpeg,image/png,image/webp" className="input"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(kind, f); e.target.value = ""; }} />
          {working && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${slot.phase === "compressing" ? 5 : slot.progress}%` }} /></div>
              <p className="mt-0.5 text-xs text-muted">{slot.phase === "compressing" ? t("verify.compressing") : `${t("verify.uploading")} ${slot.progress}%`}</p>
            </div>
          )}
          {slot.phase === "done" && (
            <p className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> {t("verify.uploaded")}
              <button type="button" onClick={() => void remove(kind)} className="inline-flex items-center gap-1 text-muted hover:text-red-600"><Trash2 size={12} />{t("verify.removeDoc")}</button>
            </p>
          )}
          {slot.phase === "error" && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-red-600" role="alert">
              {t("verify.uploadFailed")}: {t(UPLOAD_ERRORS[slot.error ?? ""] ?? "verify.err.error")}
              <button type="button" onClick={() => retry(kind)} className="inline-flex items-center gap-1 font-bold"><RotateCcw size={12} />{t("verify.retry")}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Verify() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const { refresh } = useAuth();
  const { slots, retry, submitQueued, submitError, requestSubmit, cancelSubmit, busy, progress } = useUploads();

  if (!me) return <p>{t("common.loading")}</p>;
  if (me.role === "ADMIN" || me.role === "MODERATOR") return <p className="text-muted">-</p>;

  const stepsDone = me.emailVerified || me.phoneVerified;
  // Photos that are still compressing or uploading count as chosen: they are submitted automatically when done.
  const docsChosen = DOC_KINDS.every((k) => slots[k].phase === "done" || slots[k].phase === "compressing" || slots[k].phase === "uploading");
  const canSubmit = stepsDone && docsChosen;

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
        <Link href="/explore" className="btn-primary">{t("verify.browse")}</Link>
      </div>
    );
  }
  // The user pressed submit while photos are still uploading: show "pending" right away and let them browse.
  if (submitQueued) {
    return (
      <div className="card mx-auto max-w-lg space-y-4 text-center">
        <Clock size={40} className="mx-auto text-brand-500" />
        <h1 className="text-xl font-bold">{t("verify.queuedTitle")}</h1>
        <p className="text-sm text-muted">{t("verify.queuedBody")}</p>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-grad-primary transition-all" style={{ width: `${busy ? progress : 100}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold text-brand-600">{busy ? `${t("verify.uploading")} ${progress}%` : t("verify.queuedDone")}</p>
        </div>
        <ul className="space-y-1 text-left text-xs">
          {DOC_KINDS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="text-ink">{t(DOC_LABEL[k])}</span>
              <span className={slots[k].phase === "done" ? "text-emerald-600" : slots[k].phase === "error" ? "text-red-600" : "text-muted"}>
                {slots[k].phase === "done" ? `✓ ${t("verify.uploaded")}` : slots[k].phase === "error" ? t("verify.uploadFailed") : slots[k].phase === "compressing" ? t("verify.compressing") : `${slots[k].progress}%`}
              </span>
            </li>
          ))}
        </ul>
        {DOC_KINDS.some((k) => slots[k].phase === "error") && (
          <button className="btn-soft" onClick={() => DOC_KINDS.forEach((k) => { if (slots[k].phase === "error") retry(k); })}>{t("verify.retry")}</button>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/explore" className="btn-primary">{t("verify.browse")}</Link>
          <button className="btn-ghost" onClick={cancelSubmit}>{t("verify.cancelSubmit")}</button>
        </div>
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
      <p className="rounded-md bg-brand-100 p-2.5 text-sm font-semibold text-brand-700">{t("verify.either")}</p>
      <OtpStep channel="email" me={me} onVerified={() => void refresh()} />
      <OtpStep channel="phone" me={me} onVerified={() => void refresh()} />
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (canSubmit) requestSubmit(); }} className="card space-y-3">
        <h2 className="font-bold text-ink">{t("verify.step3")}</h2>
        <p className="text-xs text-muted">{t("verify.docsHint")}</p>
        {DOC_KINDS.map((k) => <DocRow key={k} kind={k} />)}
        {!stepsDone && <p className="text-xs text-muted">{t("verify.needSteps")}</p>}
        {busy && stepsDone && <p className="text-xs text-muted">{t("verify.submitHint")}</p>}
        {submitError && <p className="text-sm text-red-600" role="alert">{t(ERRORS[submitError] ?? "verify.submitFailed")}</p>}
        <button className="btn-primary w-full" disabled={!canSubmit}>{t("verify.submit")}</button>
      </form>
    </div>
  );
}
