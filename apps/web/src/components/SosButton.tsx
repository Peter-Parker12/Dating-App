"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SosButton() {
  const { me } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!me || me.role === "ADMIN") return null;

  const send = async () => {
    if (!window.confirm(t("sos.confirm"))) return;
    setBusy(true);
    const coords = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { timeout: 5000 },
      );
    });
    try {
      await api("/sos", { method: "POST", json: coords });
      window.alert(t("sos.sent"));
    } catch {
      window.alert(t("auth.error"));
    }
    setBusy(false);
  };

  return (
    <button onClick={() => void send()} disabled={busy}
      className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-red-600 text-sm font-extrabold text-white shadow-lg hover:bg-red-700 disabled:opacity-60 md:bottom-6"
      aria-label="SOS">
      {t("sos.button")}
    </button>
  );
}
