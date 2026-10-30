"use client";
import { CheckCircle2, Heart, Smile, Sparkles, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  const values = [
    [CheckCircle2, t("footer.v1")], [Users, t("footer.v2")], [Smile, t("footer.v3")],
    [Heart, t("footer.v4")], [Sparkles, t("footer.v5")],
  ] as const;
  return (
    <footer className="mt-6 pb-28 pt-8 text-center md:pb-12">
      <ul className="mx-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-ink">
        {values.map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-1.5"><Icon size={16} className="text-brand-500" />{label}</li>
        ))}
      </ul>
      <p className="font-script text-xl font-bold text-brand-500">{t("footer.script")} ♡</p>
      <p className="mt-1 text-xs text-muted">© 2026 {t("brand")}</p>
    </footer>
  );
}
