import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { AiMealForm } from "./ai-meal-form";
import { NewFoodForm } from "./new-food-form";
import { getLocale, tFor } from "@/lib/i18n/server";
import { ymdLocal } from "@/lib/utils/day";

export default async function NewFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const t = tFor(await getLocale());
  const todayKey = ymdLocal(new Date());
  const initialDate =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : todayKey;
  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("food.logEntry")}</div>
        <h1 className="font-display text-4xl mt-1">{t("food.newMeal")}</h1>
      </header>

      <Card>
        <AiMealForm initialDate={initialDate} />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">{t("food.orPhotoManual")}</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>{t("food.singleItem")}</CardLabel>
        <NewFoodForm initialDate={initialDate} />
      </Card>
    </div>
  );
}
