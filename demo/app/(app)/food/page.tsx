"use client";

import Link from "next/link";
import {
  Apple,
  Coffee,
  Droplet,
  Drumstick,
  Flame,
  Moon,
  Sun,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MacroBar } from "@/components/food/macro-bar";
import { MonoStat } from "@/components/nothing/mono-stat";
import type { FoodEntry } from "@/lib/db/schema";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
};

export default function FoodPage() {
  const t = useT();
  const { state } = useDemoStore();

  const MEAL_LABELS: Record<Meal, string> = {
    breakfast: t("meal.breakfast"),
    lunch: t("meal.lunch"),
    dinner: t("meal.dinner"),
    snack: t("meal.snacks"),
  };
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const today: FoodEntry[] = state.foodEntries
    .filter((e) => new Date(e.consumedAt) >= startOfDay)
    .sort((a, b) => +new Date(a.consumedAt) - +new Date(b.consumedAt));

  const kcal = today.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  const p = today.reduce((a, e) => a + Number(e.proteinG ?? 0), 0);
  const c = today.reduce((a, e) => a + Number(e.carbsG ?? 0), 0);
  const f = today.reduce((a, e) => a + Number(e.fatG ?? 0), 0);

  const byMeal = new Map<Meal, FoodEntry[]>();
  for (const m of MEAL_ORDER) byMeal.set(m, []);
  for (const e of today) {
    const m = (e.meal as Meal) ?? "snack";
    byMeal.get(m)?.push(e);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t("food.foodLog")}</div>
          <h1 className="font-display text-5xl mt-1">{t("food.title")}</h1>
        </div>
        <Link href="/food/new">
          <Button>{t("food.log")}</Button>
        </Link>
      </header>

      <Card>
        <CardLabel className="flex items-center gap-1.5">
          <UtensilsCrossed size={12} strokeWidth={1.75} />
          {t("food.totals")}
        </CardLabel>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MonoStat
            label="KCAL"
            value={Math.round(kcal)}
            icon={<Flame size={12} strokeWidth={1.75} />}
          />
          <MonoStat
            label={t("food.protein")}
            value={Math.round(p)}
            unit="g"
            icon={<Drumstick size={12} strokeWidth={1.75} />}
          />
          <MonoStat
            label={t("food.carbs")}
            value={Math.round(c)}
            unit="g"
            icon={<Wheat size={12} strokeWidth={1.75} />}
          />
          <MonoStat
            label={t("food.fat")}
            value={Math.round(f)}
            unit="g"
            icon={<Droplet size={12} strokeWidth={1.75} />}
          />
        </div>
        <MacroBar protein={p} carbs={c} fat={f} />
      </Card>

      <section className="space-y-5">
        {today.length === 0 ? (
          <Card>
            <div className="font-mono text-base text-[color:var(--text-secondary)] py-6 text-center">
              {t("food.noEntries")} —{" "}
              <Link href="/food/new" className="text-[color:var(--accent)]">
                {t("food.addOne")}
              </Link>
            </div>
          </Card>
        ) : (
          MEAL_ORDER.map((meal) => {
            const items = byMeal.get(meal) ?? [];
            if (items.length === 0) return null;
            const mealKcal = items.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
            const mealP = items.reduce((a, e) => a + Number(e.proteinG ?? 0), 0);
            const mealC = items.reduce((a, e) => a + Number(e.carbsG ?? 0), 0);
            const mealF = items.reduce((a, e) => a + Number(e.fatG ?? 0), 0);
            const MealIcon = MEAL_ICONS[meal];
            return (
              <Card key={meal}>
                <div className="flex items-baseline justify-between mb-2 gap-3">
                  <CardLabel className="mb-0 flex items-center gap-1.5">
                    <MealIcon size={12} strokeWidth={1.75} />
                    {MEAL_LABELS[meal]} · {items.length} {t("food.items")}
                  </CardLabel>
                  <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] tabular-nums">
                    {Math.round(mealKcal)} kcal · P{Math.round(mealP)} C{Math.round(mealC)} F{Math.round(mealF)}
                  </div>
                </div>
                <ul>
                  {items.map((e) => (
                    <li
                      key={e.id}
                      className="grid grid-cols-[1fr_auto] gap-3 py-3 border-b border-[color:var(--border)] last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="font-body text-[color:var(--text-display)] truncate">
                          {e.name}
                        </div>
                        <div className="font-mono text-[12px] text-[color:var(--text-secondary)] mt-1 tabular-nums">
                          P{Math.round(Number(e.proteinG ?? 0))} · C{Math.round(Number(e.carbsG ?? 0))} · F{Math.round(Number(e.fatG ?? 0))}
                          <span className="text-[color:var(--text-disabled)] ml-2">
                            {new Date(e.consumedAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-2xl text-[color:var(--text-display)] tabular-nums">
                          {Math.round(Number(e.kcal ?? 0))}
                        </div>
                        <div className="mono-label">KCAL</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
