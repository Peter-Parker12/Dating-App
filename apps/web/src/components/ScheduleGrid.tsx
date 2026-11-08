"use client";
import { BLOCKS, DAYS } from "@/lib/schedule";
import { useI18n, type Key } from "@/lib/i18n";

/** Weekly availability: 7 days x 3 time blocks. Editable when onChange is given, otherwise display-only. */
export default function ScheduleGrid({ value, onChange }: { value: string[]; onChange?: (next: string[]) => void }) {
  const { t } = useI18n();
  const on = new Set(value);
  const toggle = (slot: string) => {
    if (!onChange) return;
    const next = new Set(on);
    if (next.has(slot)) next.delete(slot); else next.add(slot);
    onChange([...next]);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[19rem] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr><th className="w-14" />{DAYS.map((d) => <th key={d} className="pb-0.5 font-bold text-muted">{t(`day.${d}` as Key)}</th>)}</tr>
        </thead>
        <tbody>
          {BLOCKS.map((b) => (
            <tr key={b}>
              <th className="pr-1 text-left font-bold text-muted">{t(`block.${b}` as Key)}</th>
              {DAYS.map((d) => {
                const slot = `${d}:${b}`;
                const active = on.has(slot);
                const cell = `block h-8 w-full rounded-md border ${active ? "border-brand-500 bg-brand-500" : "border-line bg-brand-50"}`;
                return (
                  <td key={d}>
                    {onChange
                      ? <button type="button" aria-pressed={active} aria-label={`${t(`day.${d}` as Key)} ${t(`block.${b}` as Key)}`} onClick={() => toggle(slot)} className={`${cell} transition hover:border-brand-400`} />
                      : <span className={cell} aria-label={active ? `${t(`day.${d}` as Key)} ${t(`block.${b}` as Key)}` : undefined} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
