"use client";
import Link from "next/link";
import { vnd, type Talent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Avatar from "./Avatar";

export default function TalentCard({ talent, saved, onToggleSave }: {
  talent: Talent; saved?: boolean; onToggleSave?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col gap-3">
      <Link href={`/talent/${talent.id}`} className="flex items-center gap-3">
        <Avatar talent={talent} className="h-16 w-16 text-2xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{talent.displayName}, {talent.age}</span>
            {talent.verified && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ {t("talent.verified")}</span>}
          </div>
          <div className="truncate text-xs text-slate-500">{talent.style}</div>
          <div className="text-sm font-semibold text-brand-600">{vnd(talent.hourlyPrice)} {t("talent.perHour")}</div>
        </div>
      </Link>
      <div className="flex gap-2">
        {onToggleSave && (
          <button onClick={onToggleSave} className="btn-ghost flex-1 !py-2">{saved ? `♥ ${t("talent.saved")}` : `♡ ${t("talent.save")}`}</button>
        )}
        <Link href={`/book/${talent.id}`} className="btn-primary flex-1 !py-2">{t("talent.book")}</Link>
      </div>
    </div>
  );
}
