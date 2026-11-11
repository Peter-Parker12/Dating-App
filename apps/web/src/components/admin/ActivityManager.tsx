"use client";
import { useCallback, useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, type Activity } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ACTIVITY_ICONS, ICON_KEYS, iconByKey } from "@/components/activityIcons";

interface Row extends Activity { usage: { talents: number; customers: number; bookings: number } }
interface Draft { nameVi: string; nameEn: string; icon: string }
const EMPTY: Draft = { nameVi: "", nameEn: "", icon: "sparkles" };

function IconPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("act.icon")} className="flex flex-wrap gap-1.5">
      {ICON_KEYS.map((k) => {
        const Icon = ACTIVITY_ICONS[k];
        return (
          <button key={k} type="button" role="radio" aria-checked={value === k} aria-label={k} onClick={() => onChange(k)}
            className={`flex h-9 w-9 items-center justify-center rounded-md border ${value === k ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-brand-500 hover:border-brand-300"}`}>
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}

function Fields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div><label className="label" htmlFor={`${id}-vi`}>{t("act.nameVi")}</label><input id={`${id}-vi`} className="input" maxLength={40} value={draft.nameVi} onChange={(e) => onChange({ ...draft, nameVi: e.target.value })} /></div>
        <div><label className="label" htmlFor={`${id}-en`}>{t("act.nameEn")}</label><input id={`${id}-en`} className="input" maxLength={40} value={draft.nameEn} onChange={(e) => onChange({ ...draft, nameEn: e.target.value })} /></div>
      </div>
      <div><div className="label">{t("act.icon")}</div><IconPicker value={draft.icon} onChange={(icon) => onChange({ ...draft, icon })} /></div>
    </div>
  );
}

/** Admins create and manage the activity groups users can add to their profile. */
export default function ActivityManager() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => api<Row[]>("/admin/activities").then(setRows).catch(() => setRows([])), []);
  useEffect(() => { void load(); }, [load]);

  const describe = (x: unknown): string => {
    if (!(x instanceof ApiError)) return t("auth.error");
    if (x.code === "name_taken") return t("act.nameTaken");
    if (x.code === "in_use") return t("act.inUse");
    if (x.code === "invalid") return t("act.invalid");
    return t("auth.error");
  };
  const valid = (d: Draft) => d.nameVi.trim().length >= 2 && d.nameEn.trim().length >= 2;

  const create = async () => {
    setMsg(null);
    try { await api("/admin/activities", { method: "POST", json: draft }); setDraft(EMPTY); setMsg({ ok: true, text: t("act.created") }); await load(); }
    catch (x) { setMsg({ ok: false, text: describe(x) }); }
  };
  const save = async (a: Row) => {
    setMsg(null);
    try { await api(`/admin/activities/${a.slug}`, { method: "PUT", json: { ...edit, active: a.active } }); setEditing(null); await load(); }
    catch (x) { setMsg({ ok: false, text: describe(x) }); }
  };
  const toggle = async (a: Row) => {
    await api(`/admin/activities/${a.slug}`, { method: "PUT", json: { nameVi: a.nameVi, nameEn: a.nameEn, icon: a.icon, active: !a.active } }).catch(() => {}); await load();
  };
  const move = async (a: Row, direction: "up" | "down") => { await api(`/admin/activities/${a.slug}/move`, { method: "POST", json: { direction } }).catch(() => {}); await load(); };
  const remove = async (a: Row) => {
    if (!window.confirm(t("act.confirmDelete"))) return;
    setMsg(null);
    try { await api(`/admin/activities/${a.slug}`, { method: "DELETE" }); await load(); } catch (x) { setMsg({ ok: false, text: describe(x) }); }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{t("act.title")}</h2>
      <p className="text-sm text-muted">{t("act.intro")}</p>

      <div className="card space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={15} /> {t("act.new")}</h3>
        <Fields draft={draft} onChange={setDraft} />
        <button className="btn-primary !py-2" disabled={!valid(draft)} onClick={() => void create()}>{t("act.add")}</button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`} role="status">{msg.text}</p>}

      {rows && (
        <ul className="card divide-y divide-line !p-0">
          {rows.map((a, i) => {
            const Icon = iconByKey(a.icon);
            const used = a.usage.talents + a.usage.customers + a.usage.bookings > 0;
            return (
              <li key={a.slug} className={`px-4 py-3 ${a.active ? "" : "bg-brand-50/60"}`}>
                {editing === a.slug ? (
                  <div className="space-y-3">
                    <Fields draft={edit} onChange={setEdit} />
                    <div className="flex gap-2">
                      <button className="btn-primary !py-1.5" disabled={!valid(edit)} onClick={() => void save(a)}>{t("look.save")}</button>
                      <button className="btn-ghost !py-1.5" onClick={() => setEditing(null)}>{t("admin.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.active ? "bg-brand-100 text-brand-500" : "bg-slate-100 text-slate-400"}`}><Icon size={19} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-ink">{locale === "vi" ? a.nameVi : a.nameEn} {!a.active && <span className="chip-pink ml-1">{t("act.hidden")}</span>}</div>
                      <div className="truncate text-xs text-muted">{locale === "vi" ? a.nameEn : a.nameVi} · {a.slug}</div>
                      <div className="text-xs text-muted">{a.usage.talents} {t("act.talents")} · {a.usage.customers} {t("act.customers")} · {a.usage.bookings} {t("act.bookings")}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost !px-2 !py-1.5" aria-label={t("act.up")} disabled={i === 0} onClick={() => void move(a, "up")}><ArrowUp size={14} /></button>
                      <button className="btn-ghost !px-2 !py-1.5" aria-label={t("act.down")} disabled={i === rows.length - 1} onClick={() => void move(a, "down")}><ArrowDown size={14} /></button>
                      <button className="btn-ghost !px-2 !py-1.5" aria-label={t("act.edit")} onClick={() => { setEditing(a.slug); setEdit({ nameVi: a.nameVi, nameEn: a.nameEn, icon: a.icon }); }}><Pencil size={14} /></button>
                      <button className="btn-ghost !px-2 !py-1.5" aria-label={a.active ? t("act.hide") : t("act.show")} title={a.active ? t("act.hide") : t("act.show")} onClick={() => void toggle(a)}>{a.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      <button className="btn-ghost !px-2 !py-1.5" aria-label={t("act.delete")} title={used ? t("act.inUse") : t("act.delete")} disabled={used} onClick={() => void remove(a)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
