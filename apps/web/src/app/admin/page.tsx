"use client";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface Pending { id: string; name: string; email: string; role: string }
interface Sos { id: string; lat: number | null; lng: number | null; status: "OPEN" | "RESOLVED"; createdAt: string; user: { name: string; email: string } }
interface AdminUser { id: string; name: string; email: string; role: string; status: "ACTIVE" | "SUSPENDED"; idStatus: string }

export default function Admin() {
  const { t } = useI18n();
  const { me } = useRequireAuth("ADMIN");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sos, setSos] = useState<Sos[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const load = useCallback(async () => {
    const [p, s, u] = await Promise.all([api<Pending[]>("/admin/verifications"), api<Sos[]>("/admin/sos"), api<AdminUser[]>("/admin/users")]);
    setPending(p); setSos(s); setUsers(u);
  }, []);
  useEffect(() => {
    if (!me) return;
    void load();
    const socket = io({ path: "/socket.io" });
    socket.on("sos", () => void load());
    return () => { socket.disconnect(); };
  }, [me, load]);
  if (!me) return <p>{t("common.loading")}</p>;

  const review = async (id: string, approve: boolean) => { await api(`/admin/verifications/${id}`, { method: "POST", json: { approve } }); await load(); };
  const resolve = async (id: string) => { await api(`/admin/sos/${id}/resolve`, { method: "POST" }); await load(); };
  const setStatus = async (id: string, status: string) => { await api(`/admin/users/${id}/status`, { method: "POST", json: { status } }); await load(); };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.sos")}</h2>
        {sos.length === 0 && <p className="text-slate-500">{t("admin.none")}</p>}
        {sos.map((s) => (
          <div key={s.id} className={`card flex flex-wrap items-center justify-between gap-2 ${s.status === "OPEN" ? "border-red-300" : ""}`}>
            <div className="text-sm">
              <b>{s.user.name}</b> ({s.user.email}) · {new Date(s.createdAt).toLocaleString()}
              {s.lat != null && s.lng != null && (
                <> · <a className="text-brand-600 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}>map</a></>
              )}
            </div>
            {s.status === "OPEN" ? <button className="btn-primary !py-1.5" onClick={() => void resolve(s.id)}>{t("admin.resolve")}</button> : <span className="text-xs text-slate-500">✓</span>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.verifications")}</h2>
        {pending.length === 0 && <p className="text-slate-500">{t("admin.none")}</p>}
        {pending.map((p) => (
          <div key={p.id} className="card space-y-2">
            <div className="text-sm"><b>{p.name}</b> ({p.email}) · {p.role}</div>
            <div className="flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="ID" src={`/api/admin/verifications/${p.id}/id`} className="h-40 rounded-lg border object-contain" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Selfie" src={`/api/admin/verifications/${p.id}/selfie`} className="h-40 rounded-lg border object-contain" />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary !py-1.5" onClick={() => void review(p.id, true)}>{t("admin.approve")}</button>
              <button className="btn-ghost !py-1.5" onClick={() => void review(p.id, false)}>{t("admin.reject")}</button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.users")}</h2>
        <div className="card divide-y divide-rose-100 !p-0">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <div className="min-w-0 truncate"><b>{u.name}</b> · {u.email} · {u.role}</div>
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
