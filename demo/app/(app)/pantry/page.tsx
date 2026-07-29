"use client";

import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { PantryForm } from "./pantry-form";
import { PantryList } from "./pantry-list";

export default function PantryPage() {
  const t = useT();
  const { state } = useDemoStore();
  const items = [...state.pantryItems].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("pantry.inventory")}</div>
        <h1 className="font-display text-5xl mt-1">{t("pantry.title")}</h1>
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
