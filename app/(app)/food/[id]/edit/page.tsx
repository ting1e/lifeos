import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { foodEntries } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { EditFoodForm } from "./edit-food-form";

export const dynamic = "force-dynamic";

export default async function EditFoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;
  const t = tFor(await getLocale());

  const [entry] = await db
    .select()
    .from(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, user.id)))
    .limit(1);

  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("food.editEntry")}</div>
        <h1 className="font-display text-4xl mt-1">{t("food.editTitle")}</h1>
      </header>

      <Card>
        <EditFoodForm
          id={entry.id}
          initial={{
            meal: entry.meal,
            name: entry.name,
            kcal: entry.kcal != null ? Number(entry.kcal) : null,
            protein_g: entry.proteinG != null ? Number(entry.proteinG) : null,
            carbs_g: entry.carbsG != null ? Number(entry.carbsG) : null,
            fat_g: entry.fatG != null ? Number(entry.fatG) : null,
            consumedAt: entry.consumedAt.toISOString(),
          }}
        />
      </Card>
    </div>
  );
}
