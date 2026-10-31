"use client";
import Link from "next/link";
import { BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import { vnd, type Talent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function TalentCard({ talent, saved, onToggleSave, actLabel = (a: string) => a }: {
  talent: Talent; saved?: boolean; onToggleSave?: () => void; actLabel?: (slug: string) => string;
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
        {talent.availableNow && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur">
            <span className="h-[7px] w-[7px] rounded-full bg-emerald-500" /> {t("talent.now")}
          </span>
        )}
        {talent.sticker && (
          <span className="absolute right-2.5 top-11 max-w-[70%] rotate-[4deg] rounded-[14px] rounded-br-[4px] bg-white/95 px-3 py-1.5 font-script text-lg font-bold leading-tight text-brand-600 shadow-[0_6px_16px_rgba(0,0,0,.12)]">
            {talent.sticker}
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-[0.95rem] font-extrabold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.3)]">
          {vnd(talent.hourlyPrice)} <small className="text-[0.72rem] font-medium opacity-90">{t("talent.perHour")}</small>
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3.5">
        <Link href={`/talent/${talent.id}`} className="text-lg font-extrabold leading-snug text-ink hover:text-brand-600">
          {talent.displayName}, {talent.age}
          {talent.verified && <BadgeCheck size={16} className="ml-1 inline align-[-2px] text-blue-500" aria-label={t("talent.verified")} />}
        </Link>
        <div className="mb-2 mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-brand-400" />{talent.district || talent.style || "-"}</span>
          {talent.ratingCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={12} fill="currentColor" className="text-gold" />
              <b className="text-ink">{talent.ratingAvg.toFixed(2)}</b> ({talent.ratingCount})
            </span>
          )}
        </div>
        <p className="mb-2.5 line-clamp-2 text-sm">“{talent.bio}”</p>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {talent.activities.slice(0, 2).map((a) => <span key={a} className="tag">{actLabel(a)}</span>)}
          {talent.activities.length > 2 && <span className="tag">+{talent.activities.length - 2}</span>}
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
