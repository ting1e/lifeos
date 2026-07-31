import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { foodLibrary } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card, CardLabel } from "@/components/ui/card";
import { LibraryAiForm } from "./library-ai-form";
import { LibraryManualForm } from "./library-manual-form";
import { LibraryList } from "./library-list";

export const dynamic = "force-dynamic";

export default async function FoodLibraryPage() {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const items = await db
    .select()
    .from(foodLibrary)
    .where(eq(foodLibrary.userId, user.id))
    .orderBy(desc(foodLibrary.updatedAt));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("foodLibrary.templates")}</div>
        <h1 className="font-display text-4xl mt-1">{t("foodLibrary.title")}</h1>
      </header>

      <Card>
        <LibraryAiForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">{t("food.orPhotoManual")}</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>{t("foodLibrary.manualAdd")}</CardLabel>
        <LibraryManualForm />
      </Card>

      <Card>
        <CardLabel>{t("foodLibrary.saved")}</CardLabel>
        <LibraryList
          initial={items.map((i) => ({
            id: i.id,
            name: i.name,
            kcal: i.kcal ? Number(i.kcal) : null,
            proteinG: i.proteinG ? Number(i.proteinG) : null,
            carbsG: i.carbsG ? Number(i.carbsG) : null,
            fatG: i.fatG ? Number(i.fatG) : null,
            photoPath: i.photoPath,
          }))}
        />
      </Card>
    </div>
  );
}
