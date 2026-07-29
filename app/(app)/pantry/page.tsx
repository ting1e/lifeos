import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pantryItems } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card, CardLabel } from "@/components/ui/card";
import { PantryForm } from "./pantry-form";
import { PantryList } from "./pantry-list";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const items = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, user.id))
    .orderBy(desc(pantryItems.updatedAt));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("pantry.inventory")}</div>
        <h1 className="font-display text-4xl mt-1">{t("pantry.title")}</h1>
      </header>

      <Card>
        <CardLabel>{t("pantry.addItem")}</CardLabel>
        <PantryForm />
      </Card>

      <Card>
        <CardLabel>{t("pantry.onHand")}</CardLabel>
        <PantryList
          initial={items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty ? Number(i.qty) : null,
            unit: i.unit,
          }))}
        />
      </Card>
    </div>
  );
}
