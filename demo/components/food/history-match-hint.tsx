"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, History } from "lucide-react";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import type { FoodSuggestion } from "./name-autocomplete";
import { useT } from "@/lib/i18n/client";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function looksLikeSingleItem(t: string): boolean {
  const s = t.trim();
  if (s.length < 2) return false;
  if (s.length > 60) return false;
  if (/[\n,;]/.test(s)) return false;
  if (/\b(and|ve|with|ile)\b/i.test(s)) return false;
  return true;
}

export function HistoryMatchHint({ text, mealHint }: { text: string; mealHint: Meal }) {
  const router = useRouter();
  const t = useT();
  const { state, update } = useDemoStore();
  const [logging, setLogging] = useState(false);

  const items = useMemo<FoodSuggestion[]>(() => {
    if (!looksLikeSingleItem(text)) return [];
    const q = text.trim().toLowerCase();
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
      .slice(0, 3);
  }, [text, state.foodEntries]);

  function log(s: FoodSuggestion) {
    setLogging(true);
    update((prev) => ({
      foodEntries: [
        {
          id: generateId(),
          userId: DEMO_USER_ID,
          consumedAt: new Date(),
          meal: s.meal ?? mealHint,
          name: s.name,
          kcal: s.kcal == null ? null : String(s.kcal),
          proteinG: s.proteinG == null ? null : String(s.proteinG),
          carbsG: s.carbsG == null ? null : String(s.carbsG),
          fatG: s.fatG == null ? null : String(s.fatG),
          photoPath: null,
          aiEstimate: null,
          source: "manual",
        },
        ...prev.foodEntries,
      ],
    }));
    router.push("/food");
  }

  if (items.length === 0) return null;

  return (
    <div className="border border-[color:var(--accent)] bg-[color:var(--surface)] p-3 space-y-2">
      <div className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
        <Sparkles size={11} strokeWidth={1.75} />
        {t("food.fromHistorySkipAi")}
      </div>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.name + s.lastUsed} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-body text-base text-[color:var(--text-display)] truncate">
                {s.name}
              </div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] flex flex-wrap gap-x-3">
                <span>{s.kcal ?? "?"} KCAL</span>
                <span>
                  {s.proteinG ?? "?"}P · {s.carbsG ?? "?"}C · {s.fatG ?? "?"}F
                </span>
                <span className="flex items-center gap-1">
                  <History size={10} strokeWidth={1.75} />
                  {s.uses}×
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => log(s)}
              disabled={logging}
              className="font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-[color:var(--surface)] disabled:opacity-50"
            >
              {logging ? "…" : `${t("common.log")} →`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
