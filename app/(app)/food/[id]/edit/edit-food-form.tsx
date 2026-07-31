"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { isAiError } from "@/lib/ai/ai-error";
import { isoForDate, todayKey, ymdLocal } from "@/lib/utils/day";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

type Initial = {
  meal: Meal;
  name: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  consumedAt: string; // ISO
  photoPath: string | null;
};

export function EditFoodForm({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();

  const [meal, setMeal] = useState<Meal>(initial.meal);
  const [name, setName] = useState<string>(initial.name);
  const [kcal, setKcal] = useState<string>(
    initial.kcal != null ? String(Math.round(initial.kcal)) : "",
  );
  const [p, setP] = useState<string>(
    initial.protein_g != null ? String(Math.round(initial.protein_g)) : "",
  );
  const [c, setC] = useState<string>(
    initial.carbs_g != null ? String(Math.round(initial.carbs_g)) : "",
  );
  const [f, setF] = useState<string>(
    initial.fat_g != null ? String(Math.round(initial.fat_g)) : "",
  );
  const [date, setDate] = useState<string>(ymdLocal(new Date(initial.consumedAt)));

  const [aiText, setAiText] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [libBusy, setLibBusy] = useState(false);
  const [libSaved, setLibSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reEstimate() {
    if (aiText.trim().length < 2) return;
    setParsing(true);
    setAiError(null);
    setAiStatus(t("food.aiThinking"));
    try {
      const r = await fetch("/api/food/parse-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: aiText.trim(),
          defaultMeal: meal,
          existing: {
            name,
            kcal: kcal ? Number(kcal) : null,
            protein_g: p ? Number(p) : null,
            carbs_g: c ? Number(c) : null,
            fat_g: f ? Number(f) : null,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `http_${r.status}`);
      const parsed = data.parsed;
      if (!parsed?.items?.length) throw new Error("no_items");

      // Aggregate all parsed items into one entry — user is editing a single line.
      const items = parsed.items as Array<{
        name: string;
        kcal: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        quantity?: string;
      }>;
      const totalKcal = items.reduce((a, it) => a + (it.kcal || 0), 0);
      const totalP = items.reduce((a, it) => a + (it.protein_g || 0), 0);
      const totalC = items.reduce((a, it) => a + (it.carbs_g || 0), 0);
      const totalF = items.reduce((a, it) => a + (it.fat_g || 0), 0);
      const combinedName =
        items.length === 1
          ? items[0].quantity
            ? `${items[0].name} — ${items[0].quantity}`
            : items[0].name
          : items.map((it) => it.name).join(" + ");

      setName(combinedName);
      setKcal(String(Math.round(totalKcal)));
      setP(String(Math.round(totalP)));
      setC(String(Math.round(totalC)));
      setF(String(Math.round(totalF)));
      if (parsed.meal) setMeal(parsed.meal);
      setAiStatus(t("food.aiUpdated"));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
      setAiStatus(null);
    } finally {
      setParsing(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/food/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meal,
          name,
          kcal: kcal ? Number(kcal) : null,
          protein_g: p ? Number(p) : null,
          carbs_g: c ? Number(c) : null,
          fat_g: f ? Number(f) : null,
          consumedAt: isoForDate(date),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      router.push(date === today ? "/food" : `/food?day=${date}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

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
          photoPath: initial.photoPath ?? undefined,
        }),
      });
      if (r.ok) setLibSaved(true);
    } finally {
      setLibBusy(false);
    }
  }

  async function del() {
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/food/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      router.push(date === today ? "/food" : `/food?day=${date}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {initial.photoPath && (
        <div className="pb-5 border-b border-[color:var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/${initial.photoPath}`}
            alt=""
            className="max-h-48 object-contain border border-[color:var(--border)]"
          />
        </div>
      )}
      <div className="space-y-3 pb-5 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2">
          <Sparkles
            size={16}
            strokeWidth={1.5}
            className="text-[color:var(--accent)]"
          />
          <div className="mono-label">{t("food.aiReestimate")}</div>
        </div>
        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          rows={3}
          placeholder={t("food.aiReestimatePlaceholder")}
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="accent"
            onClick={reEstimate}
            disabled={parsing || saving || deleting || aiText.trim().length < 2}
          >
            {parsing ? t("food.parsing") : t("food.parseWithAi")}
          </Button>
          {aiStatus && !aiError && (
            <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
              {aiStatus}
            </span>
          )}
          {aiError && (
            <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
              ERR · {aiError}
            </span>
          )}
          {aiError && isAiError(aiError) && (
            <span className="font-mono text-[13px] text-[color:var(--text-secondary)]">
              {t("common.checkAiConfig")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mono-label mb-1">{t("food.meal")}</div>
          <Select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
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
          <Input value={name} onChange={(e) => setName(e.target.value)} />
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

      {error && (
        <div className="font-mono text-[13px] text-[color:var(--accent)]">
          ERR · {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="danger"
            onClick={del}
            disabled={saving || deleting}
          >
            <Trash2 size={14} strokeWidth={1.5} className="mr-2" />
            {deleting ? t("common.busy") : t("common.delete")}
          </Button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveToLibrary}
              disabled={libBusy || !name.trim() || saving || deleting}
              className="btn btn--outline btn--sm"
            >
              <BookPlus size={14} strokeWidth={1.5} className="mr-2" />
              {libBusy ? t("common.busy") : t("food.saveToLibrary")}
            </button>
            {libSaved && (
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
                ✓ {t("food.savedToLibrary")}
              </span>
            )}
          </div>
        </div>
        <Button type="submit" disabled={saving || deleting || !name}>
          {saving ? t("common.saving") : `${t("common.save")} →`}
        </Button>
      </div>
    </form>
  );
}
