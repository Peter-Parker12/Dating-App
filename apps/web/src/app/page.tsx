"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Heart, IdCard, Lock, MapPin, ShieldCheck, Smile, Bell } from "lucide-react";
import { api, type Activity, type Talent } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";

const steps: [Key, Key][] = [["home.step1", "home.step1d"], ["home.step2", "home.step2d"], ["home.step3", "home.step3d"]];

export default function Home() {
  const { t } = useI18n();
  const [talents, setTalents] = useState<Talent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => {
    void api<Talent[]>("/talents").then(setTalents).catch(() => {});
    void api<Activity[]>("/activities").then(setActivities).catch(() => {});
  }, []);

  const features = [
    [CalendarCheck, "home.f1"], [Heart, "home.f2"], [ShieldCheck, "home.f3"], [Smile, "home.f4"],
  ] as const;
  const reasons = [
    [IdCard, "home.r1", "home.r1d", false], [Lock, "home.r2", "home.r2d", false],
    [MapPin, "home.r4", "home.r4d", false], [Bell, "home.r3", "home.r3d", true],
  ] as const;
  const stats: [string, Key][] = [
    [String(talents.length || "-"), "home.stat1"], [String(activities.length || "-"), "home.stat2"], ["1-tap", "home.stat3"],
  ];
  const posters = talents.filter((x) => x.photos[0]).slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-10 pb-4 pt-2 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
            <Heart size={14} fill="currentColor" /> {t("home.eyebrow")}
          </span>
          <h1 className="mt-4 text-[clamp(2.6rem,5.4vw,4.2rem)] font-black leading-[1.05] tracking-[-0.035em]">
            {t("brand").split(" ").slice(0, -1).join(" ")} <span className="text-brand-500">{t("brand").split(" ").slice(-1)}</span>
          </h1>
          <p className="my-2 origin-left -rotate-3 font-script text-[clamp(1.7rem,3vw,2.3rem)] font-bold text-brand-600">{t("home.script")}</p>
          <p className="max-w-xl text-[1.02rem]">{t("home.sub")}</p>
          <ul className="my-6 flex flex-wrap gap-x-6 gap-y-2">
            {features.map(([Icon, k]) => (
              <li key={k} className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-brand-100 text-brand-500"><Icon size={18} /></span>
                {t(k)}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary btn-lg">{t("home.cta")} <ArrowRight size={18} /></Link>
            <Link href="/safety" className="btn-ghost btn-lg"><ShieldCheck size={18} /> {t("home.cta2")}</Link>
          </div>
          <div className="mt-8 flex gap-8 border-t border-dashed border-line-strong pt-5">
            {stats.map(([v, k]) => (
              <div key={k}><strong className="block text-2xl font-black text-ink">{v}</strong><span className="text-xs text-muted">{t(k)}</span></div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md px-2 py-6">
          <div className="rotate-2 rounded-xl bg-white p-2.5 shadow-lg transition-transform duration-500 hover:rotate-0">
            <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-[24px]">
              {posters.length ? posters.map((x, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={x.id} src={x.photos[0]} alt={x.displayName}
                  className={`w-full object-cover ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`} />
              )) : <div className="col-span-2 aspect-[16/10] bg-brand-100" />}
            </div>
          </div>
          <div className="absolute -left-1 top-2 -rotate-6 rounded-2xl rounded-bl-sm bg-white px-4 py-2 font-script text-lg font-bold text-brand-600 shadow-md">{t("home.script")}</div>
          <Heart className="absolute -right-1 top-1/3 animate-bounce text-brand-400" size={28} fill="currentColor" />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="card !p-6 bg-grad-soft">
          <h2 className="section-title"><span>{t("home.steps")}</span></h2>
          <p className="section-script">{t("home.stepsScript")}</p>
          <ol className="mt-5 grid gap-4">
            {steps.map(([a, b], i) => (
              <li key={a} className="flex items-start gap-3.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-grad-primary font-extrabold text-white shadow-[0_4px_12px_rgba(244,63,122,.3)]">{i + 1}</span>
                <div><strong className="text-[0.96rem] text-ink">{t(a)}</strong><p className="text-sm text-muted">{t(b)}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card !p-6 bg-grad-soft">
          <h2 className="section-title">{t("home.whyPre")} <span>{t("brand")}</span>?</h2>
          <ul className="mt-4 grid gap-4">
            {reasons.map(([Icon, a, b, red]) => (
              <li key={a} className="flex items-start gap-3.5">
                <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl ${red ? "bg-red-50 text-red-500" : "bg-brand-100 text-brand-500"}`}><Icon size={18} /></span>
                <div><strong className="text-[0.96rem] text-ink">{t(a)}</strong><p className="text-sm text-muted">{t(b)}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
