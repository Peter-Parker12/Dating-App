"use client";
import { useEffect, useState } from "react";
import { api, type Notice } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { noticeText } from "@/components/noticeText";

export default function Notifications() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const [items, setItems] = useState<Notice[] | null>(null);
  useEffect(() => {
    if (!me) return;
    void api<{ items: Notice[] }>("/notifications").then((d) => setItems(d.items)).catch(() => setItems([]));
    void api("/notifications/read-all", { method: "POST" }).catch(() => {});
  }, [me]);
  if (!me || items === null) return <p>{t("common.loading")}</p>;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="section-title">{t("notif.title")}</h1>
      {items.length === 0 ? <p className="text-muted">{t("notif.empty")}</p> : (
        <ul className="grid gap-2.5">
          {items.map((n) => (
            <li key={n.id} className={`card !p-3.5 ${n.readAt ? "" : "border-brand-300"}`}>
              <p className="text-sm text-ink">{noticeText(n, t)}</p>
              <time className="text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
