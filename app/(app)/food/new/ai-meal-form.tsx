"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Sparkles, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PhotoDrop } from "@/components/food/photo-drop";
import { HistoryMatchHint } from "@/components/food/history-match-hint";
import { useT } from "@/lib/i18n/client";
import { isAiError } from "@/lib/ai/ai-error";
import { readAiStream } from "@/lib/ai/sse";
import { isoForDate, todayKey } from "@/lib/utils/day";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

type ParsedItem = {
  name: string;
  quantity?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
};

type ParseResult = {
  meal: Meal;
  items: ParsedItem[];
  confidence?: number;
  search_used?: boolean;
};

const MEAL_OPTIONS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AiMealForm({ initialDate }: { initialDate?: string } = {}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();

  // Map server error codes to user-friendly i18n messages.
  function friendlyError(msg: string): string {
    switch (msg) {
      case "parse_failed":
        return t("food.errParseFailed");
      case "upload_failed":
        return t("food.errUploadFailed");
      case "heic_conversion_failed":
        return t("food.errHeicFailed");
      default:
        return msg;
    }
  }

  // Set a friendly error message and flag whether it is an AI analysis
  // error (so the "check AI configuration" hint can be shown).
  function fail(rawMsg: string) {
    setError(friendlyError(rawMsg));
    setAiHint(isAiError(rawMsg));
  }
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [defaultMeal, setDefaultMeal] = useState<Meal>("breakfast");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);

  // ---- photo ----
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDropKey, setPhotoDropKey] = useState(0);

  // ---- photo ----
  async function uploadPhoto(file: File) {
    setPhotoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/food/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? t("food.errUploadFailed"));
      setPhotoPath(data.name);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      setPhotoUploading(false);
    }
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
    setPhotoDropKey((k) => k + 1);
  }

  // ---- voice recording ----
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function pickMime(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  }

  async function startRecording() {
    setError(null);
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size < 1000) {
          setAiHint(false);
          setError(t("food.recordingEmpty"));
          return;
        }
        setTranscribing(true);
        setStatus(t("food.transcribingStatus"));
        try {
          const fd = new FormData();
          const ext = type.includes("mp4")
            ? "m4a"
            : type.includes("ogg")
              ? "ogg"
              : type.includes("wav")
                ? "wav"
                : "webm";
          fd.append("audio", blob, `voice.${ext}`);
          const r = await fetch("/api/food/transcribe", { method: "POST", body: fd });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error ?? `http_${r.status}`);
          const transcribed = (data.text ?? "").trim();
          if (!transcribed) {
            setAiHint(false);
            setError(t("food.transcribeEmpty"));
            return;
          }
          setText((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
          setStatus(t("food.transcribedStatus"));
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      setRecording(true);
      setStatus(t("food.recordingStatus"));
    } catch (e) {
      setAiHint(false);
      setError(
        e instanceof Error
          ? t("food.micBlocked", { msg: e.message })
          : t("food.micDenied"),
      );
    }
  }

  function stopRecording() {
    mrRef.current?.stop();
    mrRef.current = null;
    setRecording(false);
  }

  // ---- parse ----
  async function parse() {
    if (!photoPath && !text.trim()) return;
    setParsing(true);
    setError(null);
    setStatus(photoPath ? t("food.analyzingPhoto") : t("food.aiThinking"));
    setResult(null);
    setStreaming("");
    try {
      const r = await fetch("/api/food/parse-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          photoPath: photoPath ?? undefined,
          defaultMeal,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      const data = (await readAiStream(r, {
        onChunk: (text) => setStreaming((p) => p + text),
      })) as { parsed: ParseResult };
      setResult(data.parsed);
      setStreaming("");
      setStatus(
        t(data.parsed.search_used ? "food.parsedNItemsWeb" : "food.parsedNItems", {
          n: data.parsed.items.length,
        }),
      );
      // Clear photo + text for next entry
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPath(null);
      setPhotoPreviewUrl(null);
      setPhotoDropKey((k) => k + 1);
      setText("");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setParsing(false);
    }
  }

  // ---- inline edits on the parsed preview ----
  function updateItem(i: number, patch: Partial<ParsedItem>) {
    setResult((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }
        : prev,
    );
  }
  function removeItem(i: number) {
    setResult((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev,
    );
  }

  // ---- save ----
  async function saveAll() {
    if (!result || result.items.length === 0) return;
    setSaving(true);
    setError(null);
    setStatus(t("common.saving"));
    try {
      const consumedAt = isoForDate(date);
      for (const it of result.items) {
        const r = await fetch("/api/food", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            meal: result.meal,
            name: it.quantity ? `${it.name} — ${it.quantity}` : it.name,
            kcal: Math.round(it.kcal),
            protein_g: Number(it.protein_g.toFixed(1)),
            carbs_g: Number(it.carbs_g.toFixed(1)),
            fat_g: Number(it.fat_g.toFixed(1)),
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

  const totals = result?.items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal || 0),
      p: acc.p + (it.protein_g || 0),
      c: acc.c + (it.carbs_g || 0),
      f: acc.f + (it.fat_g || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

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
            <div className="mono-label">{t("food.preview")} · {t(`meal.${result.meal}` as const)}</div>
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
                setResult((prev) => (prev ? { ...prev, meal: e.target.value as Meal } : prev))
              }
            >
              {MEAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t(`meal.${m}Lower` as const)}
                </option>
              ))}
            </Select>
          </div>

          <ul className="space-y-2">
            {result.items.map((it, i) => (
              <li
                key={i}
                className="border border-[color:var(--border)] p-3 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1 min-w-0">
                    <input
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-body text-lg text-[color:var(--text-display)] focus:outline-none"
                    />
                    {it.quantity && (
                      <div className="font-mono text-[13px] text-[color:var(--text-secondary)] tracking-[0.04em]">
                        {it.quantity}
                      </div>
                    )}
                    {it.notes && (
                      <div className="font-mono text-[12px] text-[color:var(--text-disabled)] italic">
                        {it.notes}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label="remove"
                    className="text-[color:var(--text-disabled)] hover:text-[color:var(--accent)] p-1"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <NumCell
                    label={t("food.kcal")}
                    value={it.kcal}
                    onChange={(v) => updateItem(i, { kcal: v })}
                  />
                  <NumCell
                    label={t("food.proteinG")}
                    unit="g"
                    value={it.protein_g}
                    onChange={(v) => updateItem(i, { protein_g: v })}
                  />
                  <NumCell
                    label={t("food.carbsG")}
                    unit="g"
                    value={it.carbs_g}
                    onChange={(v) => updateItem(i, { carbs_g: v })}
                  />
                  <NumCell
                    label={t("food.fatG")}
                    unit="g"
                    value={it.fat_g}
                    onChange={(v) => updateItem(i, { fat_g: v })}
                  />
                </div>
              </li>
            ))}
          </ul>

          {totals && result.items.length > 0 && (
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-[color:var(--border)]">
              <Totals label={t("food.totalKcal")} value={Math.round(totals.kcal)} />
              <Totals label={t("food.totalP")} value={Math.round(totals.p)} unit="g" />
              <Totals label={t("food.totalC")} value={Math.round(totals.c)} unit="g" />
              <Totals label={t("food.totalF")} value={Math.round(totals.f)} unit="g" />
            </div>
          )}

          <div className="flex justify-end pt-1">
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

function NumCell({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          step={label === "KCAL" ? "1" : "0.1"}
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-base text-[color:var(--text-display)] tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="font-mono text-[12px] text-[color:var(--text-secondary)]">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function Totals({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="font-mono text-xl text-[color:var(--text-display)] tabular-nums">
        {value}
        {unit ? <span className="text-[color:var(--text-secondary)] text-[13px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}
