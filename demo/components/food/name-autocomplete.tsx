"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { History, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";

export type FoodSuggestion = {
  name: string;
  uses: number;
  lastUsed: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: FoodSuggestion) => void;
  disabled?: boolean;
};

function ago(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function FoodNameAutocomplete({ value, onChange, onPick, disabled }: Props) {
  const t = useT();
  const { state } = useDemoStore();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo<FoodSuggestion[]>(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    const groups = new Map<string, FoodSuggestion>();
    for (const e of state.foodEntries) {
      if (!e.name.toLowerCase().includes(q)) continue;
      const n = norm(e.name);
      const consumed =
        e.consumedAt instanceof Date ? e.consumedAt.toISOString() : String(e.consumedAt);
      const prev = groups.get(n);
      if (!prev) {
        groups.set(n, {
          name: e.name,
          uses: 1,
          lastUsed: consumed,
          kcal: e.kcal == null ? null : Number(e.kcal),
          proteinG: e.proteinG == null ? null : Number(e.proteinG),
          carbsG: e.carbsG == null ? null : Number(e.carbsG),
          fatG: e.fatG == null ? null : Number(e.fatG),
          meal: e.meal,
        });
      } else {
        prev.uses += 1;
        if (consumed > prev.lastUsed) {
          prev.lastUsed = consumed;
          prev.name = e.name;
          prev.kcal = e.kcal == null ? prev.kcal : Number(e.kcal);
          prev.proteinG = e.proteinG == null ? prev.proteinG : Number(e.proteinG);
          prev.carbsG = e.carbsG == null ? prev.carbsG : Number(e.carbsG);
          prev.fatG = e.fatG == null ? prev.fatG : Number(e.fatG);
          prev.meal = e.meal;
        }
      }
    }
    return Array.from(groups.values())
      .sort(
        (a, b) =>
          b.uses - a.uses ||
          (a.lastUsed < b.lastUsed ? 1 : a.lastUsed > b.lastUsed ? -1 : 0),
      )
      .slice(0, 8);
  }, [value, state.foodEntries]);

  const exact = useMemo(() => {
    const q = value.trim().toLowerCase();
    return suggestions.find((s) => norm(s.name) === q) ?? null;
  }, [value, suggestions]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(s: FoodSuggestion) {
    onPick(s);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        required
        autoComplete="off"
      />

      {exact && (
        <button
          type="button"
          onClick={() => pick(exact)}
          className="mt-1 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-[color:var(--surface)]"
        >
          <Sparkles size={10} strokeWidth={1.75} />
          {t("food.matchKcalUse", { kcal: exact.kcal ?? "?" })}
        </button>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-[color:var(--surface)] border border-[color:var(--border-visible)] shadow-lg max-h-80 overflow-y-auto">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] px-3 py-2 border-b border-[color:var(--border)] flex items-center gap-1.5">
            <History size={10} strokeWidth={1.75} />
            {t("food.fromHistory")} · {suggestions.length}
          </div>
          {suggestions.map((s) => (
            <button
              key={s.name + s.lastUsed}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2 border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--border)] focus:bg-[color:var(--border)] focus:outline-none"
            >
              <div className="font-body text-base text-[color:var(--text-display)] line-clamp-1">
                {s.name}
              </div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-0.5 flex flex-wrap gap-x-3">
                <span>{s.kcal ?? "?"} KCAL</span>
                <span>{s.proteinG ?? "?"}P</span>
                <span>{s.carbsG ?? "?"}C</span>
                <span>{s.fatG ?? "?"}F</span>
                <span className="text-[color:var(--accent)]">
                  {s.uses}× · {ago(s.lastUsed)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
