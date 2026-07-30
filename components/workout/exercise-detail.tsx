"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { trCatalog } from "@/lib/i18n/exercise-zh";

export type ExerciseDetail = {
  id: string;
  nameEn: string;
  nameTr: string | null;
  nameZh: string | null;
  bodyPart: string | null;
  equipment: string | null;
  target: string | null;
  muscleGroup: string | null;
  secondaryMuscles: string[] | null;
  instructionsEn: string | null;
  instructionsTr: string | null;
  instructionsZh: string | null;
  instructionStepsEn?: string[] | null;
  instructionStepsTr?: string[] | null;
  instructionStepsZh?: string[] | null;
  imageUrl: string | null;
  gifUrl: string | null;
};

export function ExerciseDetailDrawer({
  exercise,
  open,
  onClose,
  locale = "tr",
}: {
  exercise: ExerciseDetail | null;
  open: boolean;
  onClose: () => void;
  locale?: "tr" | "en" | "zh";
}) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !exercise) return null;

  // Prefer the structured instruction_steps arrays from the dataset; fall back
  // to the legacy paragraph (split by sentence) if those aren't populated.
  const structured =
    locale === "tr"
      ? exercise.instructionStepsTr ?? exercise.instructionStepsEn ?? null
      : locale === "zh"
        ? exercise.instructionStepsZh ?? exercise.instructionStepsEn ?? null
        : exercise.instructionStepsEn ?? null;
  const instructionsText =
    locale === "tr"
      ? exercise.instructionsTr ?? exercise.instructionsEn
      : locale === "zh"
        ? exercise.instructionsZh ?? exercise.instructionsEn
        : exercise.instructionsEn;
  const steps =
    structured && structured.length > 0
      ? structured
      : instructionsText
        ? instructionsText
            .split(/(?<=[.!?。！？])\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
  const name =
    locale === "tr"
      ? exercise.nameTr ?? exercise.nameEn
      : locale === "zh"
        ? exercise.nameZh ?? exercise.nameEn
        : exercise.nameEn;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <button
        type="button"
        aria-label={t("exDetail.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 dot-grid-subtle"
      />
      <div className="relative w-full md:max-w-2xl max-h-[90dvh] overflow-y-auto bg-[color:var(--surface)] border-t md:border border-[color:var(--border-visible)] safe-bottom">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[color:var(--surface)] border-b border-[color:var(--border)]">
          <div className="mono-label">{t("exDetail.title")}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("exDetail.close")}
            className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] min-h-[44px] min-w-[44px] -mr-3 flex items-center justify-center"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {exercise.gifUrl ? (
            <Image
              src={exercise.gifUrl}
              alt={name}
              width={800}
              height={800}
              className="w-full max-w-md mx-auto aspect-square object-cover border border-[color:var(--border)]"
              unoptimized
            />
          ) : (
            <div className="aspect-square dot-grid border border-[color:var(--border)]" />
          )}

          <div>
            <h2 className="font-display text-3xl text-[color:var(--text-display)] leading-tight">
              {name}
            </h2>
            <div className="mono-label mt-2">
              {[trCatalog("target", exercise.target, locale), trCatalog("bodyPart", exercise.bodyPart, locale), trCatalog("equipment", exercise.equipment, locale)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          {steps.length > 0 && (
            <div>
              <div className="mono-label mb-2">{t("exDetail.instructions")}</div>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[24px_1fr] gap-3 font-body text-base text-[color:var(--text-primary)]"
                  >
                    <span className="font-mono text-[13px] text-[color:var(--text-disabled)] pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
            <div>
              <div className="mono-label mb-2">{t("exDetail.secondaryMuscles")}</div>
              <div className="flex flex-wrap gap-2">
                {exercise.secondaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] border border-[color:var(--border-visible)] px-2 py-1"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
