"use client";

import { Card, CardLabel } from "@/components/ui/card";
import { AiMealForm } from "./ai-meal-form";
import { NewFoodForm } from "./new-food-form";
import { useT } from "@/lib/i18n/client";

export default function NewFoodPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("food.logEntry")}</div>
        <h1 className="font-display text-5xl mt-1">{t("food.newMeal")}</h1>
      </header>

      <Card>
        <AiMealForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">{t("food.orPhotoManual")}</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>{t("food.singleItem")}</CardLabel>
        <NewFoodForm />
      </Card>
    </div>
  );
}
