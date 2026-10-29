"use client";
import Link from "next/link";
import { useI18n, type Key } from "@/lib/i18n";

const steps: [Key, Key][] = [["home.step1", "home.step1d"], ["home.step2", "home.step2d"], ["home.step3", "home.step3d"]];
const reasons: [Key, Key][] = [["home.r1", "home.r1d"], ["home.r2", "home.r2d"], ["home.r3", "home.r3d"], ["home.r4", "home.r4d"]];

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold md:text-5xl">{t("home.title")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-rose-50">{t("home.sub")}</p>
        <Link href="/explore" className="btn mt-6 bg-white text-brand-700 hover:bg-rose-50">{t("home.cta")}</Link>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {steps.map(([a, b], i) => (
          <div key={a} className="card">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600">{i + 1}</div>
            <h3 className="font-bold">{t(a)}</h3>
            <p className="text-sm text-slate-600">{t(b)}</p>
          </div>
        ))}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold">{t("home.why")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {reasons.map(([a, b]) => (
            <div key={a} className="card">
              <h3 className="font-bold">{t(a)}</h3>
              <p className="text-sm text-slate-600">{t(b)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
