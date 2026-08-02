"use client";

import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { ParsedItem } from "./use-meal-parse";

/**
 * Renders the editable parsed-items list + macro totals.
 * Shared by AiMealForm and LibraryAiForm.
 */
export function ParsedItemsEditor({
  items,
  onUpdate,
  onRemove,
}: {
  items: ParsedItem[];
  onUpdate: (i: number, patch: Partial<ParsedItem>) => void;
  onRemove: (i: number) => void;
}) {
  const t = useT();
  const totals = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal || 0),
      p: acc.p + (it.protein_g || 0),
      c: acc.c + (it.carbs_g || 0),
      f: acc.f + (it.fat_g || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  return (
    <>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="border border-[color:var(--border)] p-3 space-y-2"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1 min-w-0">
                <input
                  value={it.name}
                  onChange={(e) => onUpdate(i, { name: e.target.value })}
                  className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-body text-lg text-[color:var(--text-display)] focus:outline-none"
                />
                {it.quantity && (
                  <div className="font-mono text-[13px] text-[color:var(--text-secondary)] tracking-[0.04em]">
                    {it.quantity}
                  </div>
                )}
                {it.notes && (
                  <div className="font-mono text-[12px] text-[color:var(--text-disabled)] italic">
                    {it.notes}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="remove"
                className="text-[color:var(--text-disabled)] hover:text-[color:var(--accent)] p-1"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <NumCell
                label={t("food.kcal")}
                step="1"
                value={it.kcal}
                onChange={(v) => onUpdate(i, { kcal: v })}
              />
              <NumCell
                label={t("food.proteinG")}
                unit="g"
                value={it.protein_g}
                onChange={(v) => onUpdate(i, { protein_g: v })}
              />
              <NumCell
                label={t("food.carbsG")}
                unit="g"
                value={it.carbs_g}
                onChange={(v) => onUpdate(i, { carbs_g: v })}
              />
              <NumCell
                label={t("food.fatG")}
                unit="g"
                value={it.fat_g}
                onChange={(v) => onUpdate(i, { fat_g: v })}
              />
            </div>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-[color:var(--border)]">
          <Totals label={t("food.totalKcal")} value={Math.round(totals.kcal)} />
          <Totals label={t("food.totalP")} value={Math.round(totals.p)} unit="g" />
          <Totals label={t("food.totalC")} value={Math.round(totals.c)} unit="g" />
          <Totals label={t("food.totalF")} value={Math.round(totals.f)} unit="g" />
        </div>
      )}
    </>
  );
}

function NumCell({
  label,
  unit,
  step = "0.1",
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  step?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          step={step}
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-base text-[color:var(--text-display)] tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="font-mono text-[12px] text-[color:var(--text-secondary)]">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function Totals({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="font-mono text-xl text-[color:var(--text-display)] tabular-nums">
        {value}
        {unit ? <span className="text-[color:var(--text-secondary)] text-[13px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}
