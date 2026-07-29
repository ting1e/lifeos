"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PhotoDrop } from "@/components/food/photo-drop";
import { FoodNameAutocomplete } from "@/components/food/name-autocomplete";
import type { FoodSuggestion } from "@/app/api/food/suggest/route";
import { useT } from "@/lib/i18n/client";
import { isoForDate, todayKey } from "@/lib/utils/day";

type EstimateResult = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
};

export function NewFoodForm({ initialDate }: { initialDate?: string } = {}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("snack");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/food/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "upload_failed");
      setPhotoPath(data.name);
      // Now ask for AI estimate
      const er = await fetch("/api/food/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      });
      const est = await er.json();
      if (!er.ok) {
        setError("AI estimate failed — fill manually.");
      } else {
        const e: EstimateResult = est.estimate;
        setName(e.name ?? "");
        setKcal(String(Math.round(e.kcal)));
        setP(String(Math.round(e.protein_g)));
        setC(String(Math.round(e.carbs_g)));
        setF(String(Math.round(e.fat_g)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
          photoPath,
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
      <PhotoDrop onUpload={uploadPhoto} disabled={busy} />

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
