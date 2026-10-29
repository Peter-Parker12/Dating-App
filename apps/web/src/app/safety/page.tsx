"use client";
import { useI18n, type Key } from "@/lib/i18n";

const items: Key[] = ["safety.s1", "safety.s2", "safety.s3", "safety.s4"];

export default function Safety() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("safety.title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((k) => <div key={k} className="card text-sm">{t(k)}</div>)}
      </div>
    </div>
  );
}
