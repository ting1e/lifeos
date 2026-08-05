"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Moon,
  Sun,
  Apple,
  type LucideIcon,
} from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/client";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { bcp47For } from "@/lib/utils";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

type Entry = {
  id: string;
  name: string;
  meal: Meal;
  kcal: string | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  consumedAt: Date | string;
  photoPath: string | null;
};

type RecentDay = {
  date: string; // YYYY-MM-DD local
  totals: { kcal: number; p: number; c: number; f: number };
  byMeal: Record<Meal, Entry[]>;
};

type Props = {
  days: RecentDay[];
  todayKey: string;
  kcalTarget?: number;
};

const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
};

function parts(ymd: string, bcp47: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    dayName: dt.toLocaleDateString(bcp47, { weekday: "short" }).toUpperCase(),
    dayLong: dt.toLocaleDateString(bcp47, { weekday: "long" }),
    dom: String(d).padStart(2, "0"),
    mon: dt.toLocaleDateString(bcp47, { month: "short" }).toUpperCase(),
  };
}

export function RecentHistory({ days, todayKey, kcalTarget }: Props) {
  const t = useT();
  const locale = useLocale();
  const bcp47 = bcp47For(locale);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const mealLabels: Record<Meal, string> = {
    breakfast: t("meal.breakfast"),
    lunch: t("meal.lunch"),
    dinner: t("meal.dinner"),
    snack: t("meal.snacks"),
  };

  if (days.length === 0) {
    return (
      <div className="font-mono text-base text-[color:var(--text-secondary)] py-6 text-center">
        {t("food.noRecentEntries")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const isToday = d.date === todayKey;
        const isOpen = openKey === d.date;
        const p = parts(d.date, bcp47);
        return (
          <div
            key={d.date}
            className={`border ${
              isToday ? "border-[color:var(--accent)]" : "border-[color:var(--border)]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : d.date)}
              className="w-full px-3 py-3 flex items-center gap-3 hover:bg-[color:var(--border)]"
            >
              <div className="flex flex-col items-center justify-center w-12 shrink-0">
                <span
                  className={`font-mono text-[12px] uppercase tracking-[0.1em] ${
                    isToday
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--text-secondary)]"
                  }`}
                >
                  {p.dayName}
                </span>
                <span className="font-display text-3xl leading-none text-[color:var(--text-display)]">
                  {p.dom}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-disabled)]">
                  {p.mon}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left ml-2">
                <div className="font-display text-xl text-[color:var(--text-display)]">
                  {p.dayLong}
                  {isToday && (
                    <span className="ml-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--accent)] align-middle">
                      · {t("common.today")}
                    </span>
                  )}
                </div>
                <div className="font-mono text-[14px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                  {Math.round(d.totals.kcal)} {t("food.kcal")} · P{Math.round(
                    d.totals.p,
                  )} · C{Math.round(d.totals.c)} · F{Math.round(d.totals.f)}
                  {kcalTarget && kcalTarget > 0 && d.totals.kcal > kcalTarget && (
                    <span className="ml-2 text-[color:var(--accent)]">
                      +{Math.round(d.totals.kcal - kcalTarget)}
                    </span>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
              ) : (
                <ChevronDown size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-[color:var(--border)] px-3 py-3 space-y-4">
                {MEAL_ORDER.map((meal) => {
                  const items = d.byMeal[meal] ?? [];
                  if (items.length === 0) return null;
                  const Icon = MEAL_ICONS[meal];
                  return (
                    <div key={meal}>
                      <div className="flex items-center gap-1.5 mono-label mb-2">
                        <Icon size={11} strokeWidth={1.75} />
                        {mealLabels[meal]} · {items.length} {t("food.items")}
                      </div>
                      <ul>
                        {items.map((e) => (
                          <li
                            key={e.id}
                            className="border-b border-[color:var(--border)] last:border-0"
                          >
                            <Link
                              href={`/food/${e.id}/edit`}
                              className="grid grid-cols-[auto_1fr_auto] gap-3 items-center py-2 hover:bg-[color:var(--surface)] -mx-2 px-2"
                              aria-label={t("food.edit")}
                            >
                              {e.photoPath ? (
                                <ZoomableImage
                                  src={`/api/uploads/${e.photoPath}`}
                                  className="w-10 h-10 object-cover border border-[color:var(--border)] shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 dot-grid-subtle border border-[color:var(--border)] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="font-body text-[color:var(--text-display)] truncate">
                                  {e.name}
                                </div>
                                <div className="font-mono text-[12px] text-[color:var(--text-secondary)] mt-0.5 tabular-nums">
                                  P{Math.round(Number(e.proteinG ?? 0))} · C{Math.round(
                                    Number(e.carbsG ?? 0),
                                  )} · F{Math.round(Number(e.fatG ?? 0))}
                                  <span className="text-[color:var(--text-disabled)] ml-2">
                                    {new Date(e.consumedAt).toLocaleTimeString(
                                      bcp47,
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono text-base text-[color:var(--text-display)] tabular-nums">
                                  {Math.round(Number(e.kcal ?? 0))}
                                </div>
                                <div className="mono-label">{t("food.kcal")}</div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
