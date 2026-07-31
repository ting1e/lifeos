"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, History } from "lucide-react";
import type { FoodSuggestion } from "@/app/api/food/suggest/route";
import { useT } from "@/lib/i18n/client";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

type Props = {
  text: string;
  mealHint: Meal;
  // Soft single-item gate — hide the hint when the text obviously describes
  // a multi-item meal (long, contains "and", commas, line breaks).
  // We still fetch on shorter inputs because that's where re-logging wins.
};

function looksLikeSingleItem(t: string): boolean {
  const s = t.trim();
  if (s.length < 2) return false;
  if (s.length > 60) return false;
  if (/[\n,;]/.test(s)) return false;
  if (/\b(and|ve|with|ile)\b/i.test(s)) return false;
  return true;
}

export function HistoryMatchHint({ text, mealHint }: Props) {
  const router = useRouter();
  const t = useT();
  const [items, setItems] = useState<FoodSuggestion[]>([]);
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!looksLikeSingleItem(text)) {
      setItems([]);
      return;
    }
    const ac = new AbortController();
    const q = text.trim();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/food/suggest?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!r.ok) return;
        const data = (await r.json()) as { suggestions: FoodSuggestion[] };
        setItems(data.suggestions.slice(0, 3));
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [text]);

  async function log(s: FoodSuggestion) {
    setLogging(true);
    setErr(null);
    try {
      const r = await fetch("/api/food", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meal: s.meal ?? mealHint,
          name: s.name,
          kcal: s.kcal,
          protein_g: s.proteinG,
          carbs_g: s.carbsG,
          fat_g: s.fatG,
        }),
      });
      if (!r.ok) throw new Error(`http_${r.status}`);
      router.push("/food");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setLogging(false);
    }
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
                <span>{s.kcal ?? "?"} {t("food.kcal")}</span>
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
      {err && (
        <div className="font-mono text-[12px] text-[color:var(--accent)]">ERR · {err}</div>
      )}
    </div>
  );
}
