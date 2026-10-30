"use client";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function Profile() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const { refresh } = useAuth();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!me) return <p>{t("common.loading")}</p>;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/verification", { method: "POST", body: new FormData(e.currentTarget), credentials: "same-origin" });
      if (!res.ok) throw new ApiError(res.status, "upload");
      await refresh();
    } catch { setErr(t("auth.error")); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
      <div className="card text-sm"><div className="font-bold">{me.name}</div><div className="text-muted">{me.email}</div></div>
      {me.role !== "ADMIN" && (
        <div className="card space-y-3">
          <h2 className="font-bold">{t("profile.verify")}</h2>
          <div className="text-sm">{t("profile.status")}: <b>{t(`idStatus.${me.idStatus}` as Key)}</b></div>
          {me.idStatus !== "APPROVED" && me.idStatus !== "PENDING" && (
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div><label className="label">{t("profile.idImage")}</label><input required type="file" name="idImage" accept="image/jpeg,image/png,image/webp" className="input" /></div>
              <div><label className="label">{t("profile.selfie")}</label><input required type="file" name="selfie" accept="image/jpeg,image/png,image/webp" className="input" /></div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button className="btn-primary w-full" disabled={busy}>{t("profile.submit")}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
