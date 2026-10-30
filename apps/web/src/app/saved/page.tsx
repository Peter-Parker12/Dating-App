"use client";
import { useEffect, useState } from "react";
import { api, type Talent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";
import TalentCard from "@/components/TalentCard";

export default function Saved() {
  const { t } = useI18n();
  const { me } = useRequireAuth("CUSTOMER");
  const [items, setItems] = useState<Talent[] | null>(null);
  useEffect(() => { if (me) void api<Talent[]>("/saved").then(setItems).catch(() => setItems([])); }, [me]);
  if (!me || items === null) return <p>{t("common.loading")}</p>;
  const remove = async (id: string) => { await api(`/saved/${id}`, { method: "DELETE" }); setItems(items.filter((x) => x.id !== id)); };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("saved.title")}</h1>
      {items.length === 0 ? <p className="text-muted">{t("saved.empty")}</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => <TalentCard key={x.id} talent={x} saved onToggleSave={() => void remove(x.id)} />)}
        </div>
      )}
    </div>
  );
}
