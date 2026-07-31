"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FoodNameAutocomplete } from "@/components/food/name-autocomplete";
import { LibraryPicker } from "@/components/food/library-picker";
import type { FoodSuggestion } from "@/app/api/food/suggest/route";
import { useT } from "@/lib/i18n/client";
import { isoForDate, todayKey, mealForNow } from "@/lib/utils/day";

export function NewFoodForm({ initialDate }: { initialDate?: string } = {}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">(mealForNow());
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [libSaved, setLibSaved] = useState(false);
  const [libBusy, setLibBusy] = useState(false);

  async function saveToLibrary() {
    if (!name.trim()) return;
    setLibBusy(true);
    setLibSaved(false);
    try {
      const r = await fetch("/api/food-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          kcal: kcal ? Number(kcal) : null,
          protein_g: p ? Number(p) : null,
          carbs_g: c ? Number(c) : null,
          fat_g: f ? Number(f) : null,
          photoPath: photoPath ?? undefined,
        }),
      });
      if (r.ok) setLibSaved(true);
    } finally {
      setLibBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/food", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meal,
          name,
          kcal: kcal ? Number(kcal) : null,
          protein_g: p ? Number(p) : null,
          carbs_g: c ? Number(c) : null,
          fat_g: f ? Number(f) : null,
          photoPath: photoPath ?? undefined,
          consumedAt: isoForDate(date),
        }),
      });
      if (r.ok) router.push(date === today ? "/food" : `/food?day=${date}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
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
        <div>
          <div className="mono-label mb-1">
            {t("common.date")}
            {date !== today && (
              <span className="ml-2 text-[color:var(--accent)]">· {t("dash.viewing")}</span>
            )}
          </div>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
          />
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
              setPhotoPath(s.photoPath ?? null);
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveToLibrary}
            disabled={libBusy || !name.trim()}
            className="btn btn--outline btn--sm"
          >
            <BookPlus size={14} strokeWidth={1.5} className="mr-2" />
            {libBusy ? t("common.busy") : t("food.saveToLibrary")}
          </button>
          <LibraryPicker
            onPick={(item) => {
              setName(item.name);
              if (item.kcal != null) setKcal(String(Math.round(item.kcal)));
              if (item.proteinG != null) setP(String(Math.round(item.proteinG)));
              if (item.carbsG != null) setC(String(Math.round(item.carbsG)));
              if (item.fatG != null) setF(String(Math.round(item.fatG)));
              setPhotoPath(item.photoPath);
            }}
            disabled={busy}
          />
          {libSaved && (
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
              ✓ {t("food.savedToLibrary")}
            </span>
          )}
        </div>
        <Button type="submit" disabled={busy || !name}>
          {busy ? t("common.busy") : `${t("common.save")} →`}
        </Button>
      </div>
    </form>
  );
}
