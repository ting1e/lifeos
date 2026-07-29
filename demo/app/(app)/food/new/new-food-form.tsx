"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  FoodNameAutocomplete,
  type FoodSuggestion,
} from "@/components/food/name-autocomplete";
import { useT } from "@/lib/i18n/client";

export function NewFoodForm() {
  const router = useRouter();
  const t = useT();
  const { update } = useDemoStore();
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("snack");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [busy, setBusy] = useState(false);
  const [error] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      update((prev) => ({
        foodEntries: [
          {
            id: generateId(),
            userId: DEMO_USER_ID,
            consumedAt: new Date(),
            meal,
            name,
            kcal: kcal ? String(kcal) : null,
            proteinG: p ? String(p) : null,
            carbsG: c ? String(c) : null,
            fatG: f ? String(f) : null,
            photoPath: null,
            aiEstimate: null,
            source: "manual",
          },
          ...prev.foodEntries,
        ],
      }));
      router.push("/food");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="font-mono text-[13px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em]">
        Demo: photo upload + AI estimate run via fal.ai in the self-hosted version.
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mono-label mb-1">{t("food.meal")}</div>
          <Select value={meal} onChange={(e) => setMeal(e.target.value as never)}>
            <option value="breakfast">{t("meal.breakfastLower")}</option>
            <option value="lunch">{t("meal.lunchLower")}</option>
            <option value="dinner">{t("meal.dinnerLower")}</option>
            <option value="snack">{t("meal.snackLower")}</option>
          </Select>
        </div>
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("food.name")}</div>
          <FoodNameAutocomplete
            value={name}
            onChange={setName}
            onPick={(s: FoodSuggestion) => {
              setName(s.name);
              if (s.kcal != null) setKcal(String(Math.round(s.kcal)));
              if (s.proteinG != null) setP(String(Math.round(s.proteinG)));
              if (s.carbsG != null) setC(String(Math.round(s.carbsG)));
              if (s.fatG != null) setF(String(Math.round(s.fatG)));
              if (s.meal) setMeal(s.meal);
            }}
            disabled={busy}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.kcal")}</div>
          <Input
            type="number"
            inputMode="numeric"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.proteinG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.carbsG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={c}
            onChange={(e) => setC(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.fatG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={f}
            onChange={(e) => setF(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="font-mono text-[13px] text-[color:var(--accent)]">{error}</div>}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !name}>
          {busy ? t("common.busy") : `${t("common.save")} →`}
        </Button>
      </div>
    </form>
  );
}
