"use client";
import Link from "next/link";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { vnd, type Talent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function TalentCard({ talent, saved, onToggleSave }: {
  talent: Talent; saved?: boolean; onToggleSave?: () => void;
}) {
  const { t } = useI18n();
  const photo = talent.photos[0];
  return (
    <div className="group page-enter flex flex-col rounded-lg border border-line bg-white p-2.5 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-md">
      <Link href={`/talent/${talent.id}`} className="relative block aspect-[4/4.3] overflow-hidden rounded-[16px] bg-brand-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={talent.displayName} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl font-black text-brand-300">{talent.displayName.charAt(0)}</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/45 to-transparent" />
        {talent.verified && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur">
            <BadgeCheck size={13} className="text-blue-500" /> {t("talent.verified")}
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-[0.95rem] font-extrabold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.3)]">
          {vnd(talent.hourlyPrice)} <small className="text-[0.72rem] font-medium opacity-90">{t("talent.perHour")}</small>
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3.5">
        <Link href={`/talent/${talent.id}`} className="text-lg font-extrabold leading-snug text-ink hover:text-brand-600">
          {talent.displayName}, {talent.age}
        </Link>
        <div className="mb-2 mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-brand-400" />{talent.style || "-"}</span>
        </div>
        <p className="mb-2.5 line-clamp-2 text-sm">{talent.bio}</p>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {talent.languages.slice(0, 3).map((l) => <span key={l} className="tag">{l}</span>)}
        </div>
        <div className="mt-auto flex gap-2">
          {onToggleSave && (
            <button onClick={onToggleSave} aria-label={saved ? t("talent.saved") : t("talent.save")} className="btn-ghost !px-3.5 !py-2">
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
            </button>
          )}
          <Link href={`/book/${talent.id}`} className="btn-primary flex-1 !py-2">{t("talent.book")}</Link>
        </div>
      </div>
    </div>
  );
}
