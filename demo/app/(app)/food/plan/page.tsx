"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { GeneratePlanForm } from "./generate-plan-form";
import { HandMeasureLegend } from "@/components/food/hand-measure-legend";
import { PlanWeek } from "@/components/food/plan-week";
import { ShoppingChecklist } from "@/components/food/shopping-checklist";
import { useT, useLocale } from "@/lib/i18n/client";

type MealItem = {
  name: string;
  portion?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
type DayPlan = {
  date: string;
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
  totals?: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
};
type PlanShape = {
  starts_on: string;
  ends_on: string;
  days: DayPlan[];
};

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function rangeLabel(starts: string, ends: string, bcp47: string): string {
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt
      .toLocaleDateString(bcp47, { day: "2-digit", month: "short" })
      .toUpperCase();
  };
  return `${fmt(starts)} → ${fmt(ends)}`;
}

export default function MealPlanPage() {
  const t = useT();
  const locale = useLocale();
  const bcp47 = locale === "tr" ? "tr-TR" : "en-US";
  const { state } = useDemoStore();

  const latest = [...state.mealPlans].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  )[0];
  const list = latest
    ? state.shoppingLists.filter((s) => s.mealPlanId === latest.id)
    : [];

  const plan = (latest?.plan ?? null) as PlanShape | null;
  const shoppingRow = list[0];
  const todayKey = ymdLocal(new Date());

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("plan.aiMealPlanner")}</div>
        <h1 className="font-display text-5xl mt-1">{t("plan.title")}</h1>
      </header>

      <Card>
        <CardLabel>{t("plan.generate")}</CardLabel>
        <GeneratePlanForm />
      </Card>

      {plan && (
        <>
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="mono-label">
                {t("plan.week")} · {rangeLabel(plan.starts_on, plan.ends_on, bcp47)}
              </div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-disabled)]">
                {t(plan.days.length === 1 ? "plan.daysCountOne" : "plan.daysCountMany", {
                  n: plan.days.length,
                })}
              </div>
            </div>
            <PlanWeek days={plan.days} todayKey={todayKey} />
          </div>

          <HandMeasureLegend />

          {shoppingRow && (
            <Card>
              <CardLabel>{t("plan.shoppingList")}</CardLabel>
              <div className="mt-3">
                <ShoppingChecklist shoppingListId={shoppingRow.id} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
