"use client";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface Pending {
  id: string; name: string; email: string; phone: string | null; gender: string | null; role: string;
  province: string | null; ward: string | null; addressLine: string | null; kycSubmittedAt: string | null;
  emailVerified: boolean; phoneVerified: boolean;
}
interface Sos { id: string; lat: number | null; lng: number | null; status: "OPEN" | "RESOLVED"; createdAt: string; user: { name: string; email: string } }
interface AdminReview { id: string; rating: number; comment: string; hidden: boolean; talent: string; customer: { name: string; email: string }; reports: string[] }
interface AdminUser { id: string; name: string; email: string; role: string; status: "ACTIVE" | "SUSPENDED"; kycStatus: string }

export default function Admin() {
  const { t } = useI18n();
  const { me } = useRequireAuth("ADMIN");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sos, setSos] = useState<Sos[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [kycErr, setKycErr] = useState("");

  const load = useCallback(async () => {
    const [p, s, u, r] = await Promise.all([api<Pending[]>("/admin/kyc"), api<Sos[]>("/admin/sos"), api<AdminUser[]>("/admin/users"), api<AdminReview[]>("/admin/reviews")]);
    setPending(p); setSos(s); setUsers(u); setReviews(r);
  }, []);
  useEffect(() => {
    if (!me) return;
    void load();
    const socket = io({ path: "/socket.io" });
    socket.on("sos", () => void load());
    socket.on("notification", () => void load());
    return () => { socket.disconnect(); };
  }, [me, load]);
  if (!me) return <p>{t("common.loading")}</p>;

  const review = async (id: string, approve: boolean) => {
    setKycErr("");
    try {
      await api(`/admin/kyc/${id}`, { method: "POST", json: approve ? { approve: true } : { approve: false, reason } });
      setRejecting(null); setReason(""); await load();
    } catch { setKycErr(t("auth.error")); }
  };
  const resolve = async (id: string) => { await api(`/admin/sos/${id}/resolve`, { method: "POST" }); await load(); };
  const setHidden = async (id: string, hidden: boolean) => { await api(`/admin/reviews/${id}/hidden`, { method: "POST", json: { hidden } }); await load(); };
  const setStatus = async (id: string, status: string) => { await api(`/admin/users/${id}/status`, { method: "POST", json: { status } }); await load(); };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.sos")}</h2>
        {sos.length === 0 && <p className="text-muted">{t("admin.none")}</p>}
        {sos.map((s) => (
          <div key={s.id} className={`card flex flex-wrap items-center justify-between gap-2 ${s.status === "OPEN" ? "border-red-300" : ""}`}>
            <div className="text-sm">
              <b>{s.user.name}</b> ({s.user.email}) · {new Date(s.createdAt).toLocaleString()}
              {s.lat != null && s.lng != null && (
                <> · <a className="text-brand-600 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}>map</a></>
              )}
            </div>
            {s.status === "OPEN" ? <button className="btn-primary !py-1.5" onClick={() => void resolve(s.id)}>{t("admin.resolve")}</button> : <span className="text-xs text-muted">✓</span>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.kyc")} {pending.length > 0 && <span className="chip-pink">{pending.length}</span>}</h2>
        {pending.length === 0 && <p className="text-muted">{t("admin.kycEmpty")}</p>}
        {kycErr && <p className="text-sm text-red-600" role="alert">{kycErr}</p>}
        {pending.map((p) => (
          <div key={p.id} className="card space-y-3">
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <div><b>{p.name}</b> · {p.role} · {p.gender ?? "-"}</div>
              <div className="text-muted">{t("admin.submitted")}: {p.kycSubmittedAt ? new Date(p.kycSubmittedAt).toLocaleString() : "-"}</div>
              <div>{p.email} <span className={p.emailVerified ? "text-emerald-600" : "font-bold text-red-600"}>({p.emailVerified ? t("admin.verifiedYes") : t("admin.verifiedNo")})</span></div>
              <div>{p.phone ?? "-"} <span className={p.phoneVerified ? "text-emerald-600" : "font-bold text-red-600"}>({p.phoneVerified ? t("admin.verifiedYes") : t("admin.verifiedNo")})</span></div>
              <div className="sm:col-span-2">{[p.addressLine, p.ward, p.province].filter(Boolean).join(", ") || "-"}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([["id", "admin.docId"], ["student", "admin.docStudent"], ["profile", "admin.docProfile"]] as const).map(([kind, label]) => (
                <a key={kind} href={`/api/admin/kyc/${p.id}/${kind}`} target="_blank" rel="noreferrer" className="block">
                  <div className="mb-1 text-xs font-bold text-muted">{t(label)}</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={t(label)} src={`/api/admin/kyc/${p.id}/${kind}`} className="aspect-[4/3] w-full rounded-lg border border-line bg-brand-50 object-contain" />
                </a>
              ))}
            </div>
            {rejecting === p.id ? (
              <div className="space-y-2">
                <label className="label">{t("admin.rejectReason")}</label>
                <textarea className="input" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-primary !py-1.5" disabled={reason.trim().length < 3} onClick={() => void review(p.id, false)}>{t("admin.confirmReject")}</button>
                  <button className="btn-ghost !py-1.5" onClick={() => { setRejecting(null); setReason(""); }}>{t("admin.cancel")}</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="btn-primary !py-1.5" disabled={!p.emailVerified || !p.phoneVerified} onClick={() => void review(p.id, true)}>{t("admin.approve")}</button>
                <button className="btn-ghost !py-1.5" onClick={() => { setRejecting(p.id); setReason(""); }}>{t("admin.reject")}</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.reviews")}</h2>
        {reviews.length === 0 && <p className="text-muted">{t("admin.none")}</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 text-sm">
              <b>{r.talent}</b> · {r.rating}★ · {r.customer.name} ({r.customer.email})
              <p className="mt-1">{r.comment || "-"}</p>
              {r.reports.length > 0 && <p className="mt-1 text-xs text-red-600">⚑ {r.reports.length}: {r.reports.filter(Boolean).join("; ")}</p>}
            </div>
            <button className="btn-ghost !py-1.5" onClick={() => void setHidden(r.id, !r.hidden)}>{r.hidden ? t("admin.unhide") : t("admin.hide")}</button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.users")}</h2>
        <div className="card divide-y divide-line !p-0">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <div className="min-w-0 truncate"><b>{u.name}</b> · {u.email} · {u.role} · {u.kycStatus}</div>
              {u.id !== me.id && (
                <button className="btn-ghost !px-3 !py-1" onClick={() => void setStatus(u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                  {u.status === "ACTIVE" ? t("admin.suspend") : t("admin.activate")}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
