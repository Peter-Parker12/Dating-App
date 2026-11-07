"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { io } from "socket.io-client";
import { api, type Notice } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { noticeText } from "./noticeText";

export default function NotificationBell() {
  const { me, refresh } = useAuth();
  const { t } = useI18n();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ unread: number; items: Notice[] }>("/notifications");
      setUnread(d.unread); setItems(d.items.slice(0, 5));
    } catch {}
  }, []);

  const userId = me?.id;
  useEffect(() => {
    if (!userId) return;
    void load();
    const socket = io({ path: "/socket.io" });
    socket.on("notification", (n: Notice) => {
      void load();
      // A status change (approved / rejected / suspended) changes what the account may do.
      if (n.type.startsWith("KYC_") || n.type.startsWith("ACCOUNT_")) void refresh();
    });
    return () => { socket.disconnect(); };
  }, [userId, load, refresh]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!me) return null;
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) { await api("/notifications/read-all", { method: "POST" }).catch(() => {}); setUnread(0); }
  };

  return (
    <div ref={box} className="relative">
      <button onClick={() => void toggle()} aria-label={t("notif.title")} aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-brand-50 text-brand-600 hover:bg-brand-100">
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-line bg-white p-2 shadow-lg">
          {items.length === 0 ? <p className="p-3 text-sm text-muted">{t("notif.empty")}</p> : (
            <ul className="divide-y divide-line">
              {items.map((n) => (
                <li key={n.id} className="px-2 py-2 text-sm"><p className="text-ink">{noticeText(n, t)}</p>
                  <time className="text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</time></li>
              ))}
            </ul>
          )}
          <Link href="/notifications" onClick={() => setOpen(false)} className="mt-1 block rounded-md p-2 text-center text-sm font-bold text-brand-600 hover:bg-brand-50">{t("notif.seeAll")}</Link>
        </div>
      )}
    </div>
  );
}
