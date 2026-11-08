"use client";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api, type Activity, type CustomerCard } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { activityIcon } from "@/components/activityIcons";

export default function Customers() {
  const { t, locale } = useI18n();
  const { me } = useRequireAuth(["TALENT", "ADMIN", "MODERATOR"], { approved: true });
  const [acts, setActs] = useState<Activity[]>([]);
  const [activity, setActivity] = useState("");
  const [items, setItems] = useState<CustomerCard[] | null>(null);

  useEffect(() => { if (me) void api<Activity[]>("/activities").then(setActs).catch(() => {}); }, [me]);
  useEffect(() => {
    if (!me) return;
    void api<CustomerCard[]>(`/customers${activity ? `?activity=${activity}` : ""}`).then(setItems).catch(() => setItems([]));
  }, [me, activity]);

  if (!me) return <p>{t("common.loading")}</p>;
  const label = (slug: string) => { const a = acts.find((x) => x.slug === slug); return a ? (locale === "vi" ? a.nameVi : a.nameEn) : slug; };

  return (
    <div className="space-y-5">
      <div><h1 className="section-title">{t("cust.title")}</h1><p className="text-sm text-muted">{t("cust.sub")}</p></div>
      <div className="flex flex-wrap gap-2">
        {[{ slug: "", name: t("explore.all") }, ...acts.map((a) => ({ slug: a.slug, name: label(a.slug) }))].map((a) => {
          const Icon = activityIcon(a.slug || "all");
          return (
            <button key={a.slug || "all"} onClick={() => setActivity(a.slug)} aria-pressed={activity === a.slug}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${activity === a.slug ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink hover:border-brand-300"}`}>
              <Icon size={15} /> {a.name}
            </button>
          );
        })}
      </div>
      {items === null ? <p>{t("common.loading")}</p> : items.length === 0 ? <p className="text-muted">{t("cust.empty")}</p> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {items.map((c) => (
            <div key={c.id} className="card space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-black text-brand-600">{c.firstName.charAt(0)}</span>
                <div className="min-w-0">
                  <div className="truncate font-extrabold text-ink">{c.firstName}</div>
                  {c.province && <div className="flex items-center gap-1 text-xs text-muted"><MapPin size={12} className="text-brand-400" />{c.province}</div>}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-bold text-muted">{t("cust.lookingFor")}</div>
                <div className="flex flex-wrap gap-1.5">{c.lookingFor.map((a) => <span key={a} className="chip-pink">{label(a)}</span>)}</div>
              </div>
              {c.note && <p className="rounded-md bg-brand-50 p-2.5 text-sm italic">“{c.note}”</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
