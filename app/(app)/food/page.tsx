import Link from "next/link";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
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
import { db } from "@/lib/db/client";
import { foodEntries } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MacroBar } from "@/components/food/macro-bar";
import { MonoStat } from "@/components/nothing/mono-stat";
import { DayNav } from "@/components/dashboard/day-nav";
import { RecentHistory } from "@/components/food/recent-history";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { todayKey, ymdLocal } from "@/lib/utils/day";
import { bcp47For } from "@/lib/utils";
import { getKcalTargetsForUser } from "@/lib/nutrition/targets";

export const dynamic = "force-dynamic";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
};

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const locale = await getLocale();
  const t = tFor(locale);
  const today = todayKey();
  const selectedKey =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : today;
  const isToday = selectedKey === today;

  const dayStart = new Date(`${selectedKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const entries = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, user.id),
        gte(foodEntries.consumedAt, dayStart),
        lt(foodEntries.consumedAt, dayEnd),
      ),
    )
    .orderBy(asc(foodEntries.consumedAt));

  const kcal = entries.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  const p = entries.reduce((a, e) => a + Number(e.proteinG ?? 0), 0);
  const c = entries.reduce((a, e) => a + Number(e.carbsG ?? 0), 0);
  const f = entries.reduce((a, e) => a + Number(e.fatG ?? 0), 0);

  const byMeal = new Map<Meal, typeof entries>();
  for (const m of MEAL_ORDER) byMeal.set(m, []);
  for (const e of entries) {
    const m = (e.meal as Meal) ?? "snack";
    byMeal.get(m)?.push(e);
  }

  const mealLabels: Record<Meal, string> = {
    breakfast: t("meal.breakfast"),
    lunch: t("meal.lunch"),
    dinner: t("meal.dinner"),
    snack: t("meal.snacks"),
  };

  // Last 7 days (relative to today, not selectedKey)
  const nowMid = new Date();
  nowMid.setHours(0, 0, 0, 0);
  const rangeStart = new Date(nowMid);
  rangeStart.setDate(rangeStart.getDate() - 6);
  const rangeEnd = new Date(nowMid);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const recentEntries = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, user.id),
        gte(foodEntries.consumedAt, rangeStart),
        lt(foodEntries.consumedAt, rangeEnd),
      ),
    )
    .orderBy(desc(foodEntries.consumedAt));

  // Group by local day, newest first
  const recentByDay = new Map<string, typeof recentEntries>();
  for (const e of recentEntries) {
    const key = ymdLocal(new Date(e.consumedAt));
    if (!recentByDay.has(key)) recentByDay.set(key, []);
    recentByDay.get(key)!.push(e);
  }
  const recentDays = Array.from(recentByDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => {
      const byMeal: Record<Meal, typeof items> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      };
      for (const e of items) {
        const m = (e.meal as Meal) ?? "snack";
        byMeal[m]?.push(e);
      }
      return {
        date,
        totals: {
          kcal: items.reduce((a, e) => a + Number(e.kcal ?? 0), 0),
          p: items.reduce((a, e) => a + Number(e.proteinG ?? 0), 0),
          c: items.reduce((a, e) => a + Number(e.carbsG ?? 0), 0),
          f: items.reduce((a, e) => a + Number(e.fatG ?? 0), 0),
        },
        byMeal,
      };
    });

  // Compute kcal target (same logic as dashboard)
  const { kcalTarget } = await getKcalTargetsForUser(user.id);

  const dayTitle = isToday
    ? t("food.title")
    : dayStart.toLocaleDateString(bcp47For(locale), {
        weekday: "long",
        day: "2-digit",
        month: "short",
      });

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="mono-label">
            {t("food.foodLog")}
            {!isToday && (
              <span className="ml-2 text-[color:var(--accent)]">{t("dash.viewing")}</span>
            )}
          </div>
          <h1 className="font-display text-4xl mt-1 truncate">{dayTitle}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DayNav selected={selectedKey} today={today} basePath="/food" />
          <Link href={isToday ? "/food/new" : `/food/new?day=${selectedKey}`}>
            <Button>{t("food.log")}</Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardLabel className="flex items-center gap-1.5">
          <UtensilsCrossed size={12} strokeWidth={1.75} />
          {t("food.totals")}
        </CardLabel>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MonoStat
            label={t("food.kcal")}
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
        {entries.length === 0 ? (
          <Card>
            <div className="font-mono text-base text-[color:var(--text-secondary)] py-6 text-center">
              {t("food.noEntries")}{" "}
              <Link
                href={isToday ? "/food/new" : `/food/new?day=${selectedKey}`}
                className="text-[color:var(--accent)]"
              >
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
                    {mealLabels[meal]} · {items.length} {t("food.items")}
                  </CardLabel>
                  <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] tabular-nums">
                    {Math.round(mealKcal)} {t("food.kcal")} · P{Math.round(mealP)} C{Math.round(mealC)} F{Math.round(mealF)}
                  </div>
                </div>
                <ul>
                  {items.map((e) => (
                    <li key={e.id} className="border-b border-[color:var(--border)] last:border-0">
                      <Link
                        href={`/food/${e.id}/edit`}
                        className="grid grid-cols-[auto_1fr_auto] gap-3 items-center py-3 hover:bg-[color:var(--surface)] -mx-2 px-2"
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
                          <div className="font-mono text-[12px] text-[color:var(--text-secondary)] mt-1 tabular-nums">
                            P{Math.round(Number(e.proteinG ?? 0))} · C{Math.round(Number(e.carbsG ?? 0))} · F{Math.round(Number(e.fatG ?? 0))}
                            <span className="text-[color:var(--text-disabled)] ml-2">
                              {new Date(e.consumedAt).toLocaleTimeString(bcp47For(locale), {
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
                          <div className="mono-label">{t("food.kcal")}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <div className="mono-label">{t("food.recent7d")}</div>
        <RecentHistory days={recentDays} todayKey={today} kcalTarget={kcalTarget} />
      </section>
    </div>
  );
}
