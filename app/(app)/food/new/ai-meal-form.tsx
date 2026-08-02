"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus, Mic, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PhotoDrop } from "@/components/food/photo-drop";
import { HistoryMatchHint } from "@/components/food/history-match-hint";
import { ParsedItemsEditor } from "@/components/food/parsed-items-editor";
import { useMealParse } from "@/components/food/use-meal-parse";
import { useT } from "@/lib/i18n/client";
import { isoForDate, todayKey, mealForNow } from "@/lib/utils/day";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_OPTIONS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AiMealForm({ initialDate }: { initialDate?: string } = {}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();

  const [date, setDate] = useState<string>(initialDate ?? today);
  const [defaultMeal, setDefaultMeal] = useState<Meal>(mealForNow());
  const [saving, setSaving] = useState(false);
  const [libBusy, setLibBusy] = useState(false);
  const [libSaved, setLibSaved] = useState(false);

  const {
    text,
    setText,
    parsing,
    parse,
    streaming,
    result,
    setResult,
    updateItem,
    removeItem,
    status,
    setStatus,
    error,
    aiHint,
    fail,
    photoPath,
    photoPreviewUrl,
    photoUploading,
    photoDropKey,
    uploadPhoto,
    removePhoto,
    recording,
    transcribing,
    startRecording,
    stopRecording,
  } = useMealParse(defaultMeal);

  // ---- save to food log ----
  async function saveAll() {
    if (!result || result.items.length === 0) return;
    setSaving(true);
    setStatus(t("common.saving"));
    try {
      const consumedAt = isoForDate(date);
      for (const it of result.items) {
        const name = it.quantity ? `${it.name} — ${it.quantity}` : it.name;
        const r = await fetch("/api/food", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            meal: result.meal,
            name,
            kcal: Math.round(it.kcal),
            protein_g: Number(it.protein_g.toFixed(1)),
            carbs_g: Number(it.carbs_g.toFixed(1)),
            fat_g: Number(it.fat_g.toFixed(1)),
            photoPath: photoPath ?? undefined,
            consumedAt,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error ?? `http_${r.status}`);
        }
      }
      router.push(date === today ? "/food" : `/food?day=${date}`);
      router.refresh();
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setSaving(false);
    }
  }

  // ---- save all items to library ----
  async function saveAllToLibrary() {
    if (!result || result.items.length === 0) return;
    setLibBusy(true);
    setLibSaved(false);
    try {
      for (const it of result.items) {
        const name = it.quantity ? `${it.name} — ${it.quantity}` : it.name;
        await fetch("/api/food-library", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            kcal: Math.round(it.kcal),
            protein_g: Number(it.protein_g.toFixed(1)),
            carbs_g: Number(it.carbs_g.toFixed(1)),
            fat_g: Number(it.fat_g.toFixed(1)),
            photoPath: photoPath ?? undefined,
          }),
        });
      }
      setLibSaved(true);
    } finally {
      setLibBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles
          size={16}
          strokeWidth={1.5}
          className="text-[color:var(--accent)]"
        />
        <div className="mono-label">{t("food.aiAutolog")}</div>
      </div>

      {photoPath && photoPreviewUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreviewUrl}
            alt=""
            className="max-h-48 object-contain border border-[color:var(--border)]"
          />
          <button
            type="button"
            onClick={removePhoto}
            aria-label="remove photo"
            className="absolute -top-2 -right-2 bg-[color:var(--surface)] border border-[color:var(--border)] p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <PhotoDrop key={photoDropKey} onUpload={uploadPhoto} onError={(msg) => fail(msg)} disabled={parsing || saving || photoUploading} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[200px_200px_1fr] gap-4">
        <div>
          <div className="mono-label mb-1">{t("food.defaultMeal")}</div>
          <Select
            value={defaultMeal}
            onChange={(e) => setDefaultMeal(e.target.value as Meal)}
          >
            {MEAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t(`meal.${m}Lower` as const)}
              </option>
            ))}
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
        <div>
          <div className="mono-label mb-1">{t("food.describe")}</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t("food.aiPlaceholder")}
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
          />
          {!result && <HistoryMatchHint text={text} mealHint={defaultMeal} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={parsing || saving || transcribing}
            className="btn btn--outline btn--sm"
          >
            <Mic size={14} strokeWidth={1.5} className="mr-2" />
            {transcribing ? t("food.transcribing") : t("food.recordVoice")}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="btn btn--danger btn--sm"
          >
            <Square size={12} strokeWidth={2} className="mr-2 fill-current" />
            {t("common.stop")}
          </button>
        )}
        <Button
          type="button"
          variant="accent"
          onClick={parse}
          disabled={parsing || saving || recording || transcribing || photoUploading || (!photoPath && text.trim().length < 2)}
        >
          {parsing ? t("food.parsing") : t("food.parseWithAi")}
        </Button>
        {status && !error && (
          <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {status}
          </span>
        )}
        {streaming && !error && (
          <div className="font-mono text-[12px] leading-relaxed text-[color:var(--text-secondary)] max-h-32 overflow-y-auto whitespace-pre-wrap border-l-2 border-[color:var(--accent)] pl-3">
            {streaming}
          </div>
        )}
        {error && (
          <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
            {t("food.errPrefix")} · {error}
          </span>
        )}
        {error && aiHint && (
          <span className="font-mono text-[13px] text-[color:var(--text-secondary)]">
            {t("common.checkAiConfig")}
          </span>
        )}
      </div>

      {result && (
        <div className="space-y-3 pt-2 border-t border-[color:var(--border)]">
          <div className="flex items-baseline justify-between">
            <div className="mono-label">{t("food.preview")} · {t(`meal.${result.meal as Meal}` as const)}</div>
            <div className="font-mono text-[13px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em]">
              {result.confidence != null
                ? t("food.confidence", { n: (result.confidence * 100).toFixed(0) })
                : ""}
            </div>
          </div>

          <div>
            <div className="mono-label mb-1">{t("food.saveAs")}</div>
            <Select
              value={result.meal}
              onChange={(e) =>
                setResult((prev) => (prev ? { ...prev, meal: e.target.value } : prev))
              }
            >
              {MEAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t(`meal.${m}Lower` as const)}
                </option>
              ))}
            </Select>
          </div>

          <ParsedItemsEditor
            items={result.items}
            onUpdate={updateItem}
            onRemove={removeItem}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveAllToLibrary}
                disabled={libBusy || saving || result.items.length === 0}
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
            <Button
              type="button"
              variant="accent"
              onClick={saveAll}
              disabled={saving || result.items.length === 0}
            >
              {saving ? t("common.saving") : t("food.saveItems", { n: result.items.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
