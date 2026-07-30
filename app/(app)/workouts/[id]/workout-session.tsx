"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Info } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { SetRow, type SetRowValue } from "@/components/workout/set-row";
import { RestTimer } from "@/components/workout/rest-timer";
import { Card } from "@/components/ui/card";
import {
  ExerciseDetailDrawer,
  type ExerciseDetail,
} from "@/components/workout/exercise-detail";
import { ExercisePicker } from "@/components/workout/exercise-picker";

export type WorkoutExercise = {
  exerciseId: string;
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
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
};

type ExistingSet = {
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
};

export function WorkoutSession({
  workoutId,
  locale,
  initialExercises,
  existingSets,
  ended,
}: {
  workoutId: string;
  locale: "tr" | "en" | "zh";
  initialExercises: WorkoutExercise[];
  existingSets: ExistingSet[];
  ended: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [exList, setExList] = useState<WorkoutExercise[]>(initialExercises);
  const [localSets, setLocalSets] = useState<ExistingSet[]>(existingSets);
  const [restOpen, setRestOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);

  async function addSet(exId: string, idx: number, v: SetRowValue) {
    await fetch(`/api/workouts/${workoutId}/sets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        exerciseId: exId,
        setIndex: idx,
        reps: v.reps,
        weightKg: v.weightKg,
        rpe: v.rpe,
      }),
    });
    setLocalSets((s) => [
      ...s,
      { exerciseId: exId, setIndex: idx, reps: v.reps, weightKg: v.weightKg, rpe: v.rpe },
    ]);
    setRestOpen(true);
  }

  async function endWorkout() {
    await fetch(`/api/workouts/${workoutId}`, { method: "PATCH" });
    router.refresh();
  }

  async function pickExercise(exerciseId: string, _name: string) {
    setPickerOpen(false);
    // Fetch full detail to add to list
    const r = await fetch(`/api/exercises?q=${encodeURIComponent(_name)}&limit=5`);
    const j = await r.json();
    const found = (j.exercises as WorkoutExercise[] | undefined)?.find(
      (e) => e.exerciseId === undefined && (e as unknown as { id: string }).id === exerciseId,
    );
    // The picker query returns full Exercise rows with `id` field; normalize.
    const all = (j.exercises ?? []) as Array<Record<string, unknown>>;
    const match = all.find((row) => row.id === exerciseId);
    if (!match) return;
    const next: WorkoutExercise = {
      exerciseId: match.id as string,
      nameEn: match.nameEn as string,
      nameTr: (match.nameTr as string | null) ?? null,
      nameZh: (match.nameZh as string | null) ?? null,
      bodyPart: (match.bodyPart as string | null) ?? null,
      equipment: (match.equipment as string | null) ?? null,
      target: (match.target as string | null) ?? null,
      muscleGroup: (match.muscleGroup as string | null) ?? null,
      secondaryMuscles: (match.secondaryMuscles as string[] | null) ?? null,
      instructionsEn: (match.instructionsEn as string | null) ?? null,
      instructionsTr: (match.instructionsTr as string | null) ?? null,
      instructionsZh: (match.instructionsZh as string | null) ?? null,
      instructionStepsEn: (match.instructionStepsEn as string[] | null) ?? null,
      instructionStepsTr: (match.instructionStepsTr as string[] | null) ?? null,
      instructionStepsZh: (match.instructionStepsZh as string[] | null) ?? null,
      imageUrl: (match.imageUrl as string | null) ?? null,
      gifUrl: (match.gifUrl as string | null) ?? null,
      targetSets: null,
      targetReps: null,
      targetWeightKg: null,
    };
    void found; // silence unused
    if (exList.some((e) => e.exerciseId === next.exerciseId)) return;
    setExList((list) => [...list, next]);
  }

  const setsByExercise = useMemo(() => {
    const m = new Map<string, ExistingSet[]>();
    for (const s of localSets) {
      const arr = m.get(s.exerciseId) ?? [];
      arr.push(s);
      m.set(s.exerciseId, arr);
    }
    return m;
  }, [localSets]);

  function openDetail(ex: WorkoutExercise) {
    setDetail({
      id: ex.exerciseId,
      nameEn: ex.nameEn,
      nameTr: ex.nameTr,
      nameZh: ex.nameZh,
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      target: ex.target,
      muscleGroup: ex.muscleGroup,
      secondaryMuscles: ex.secondaryMuscles,
      instructionsEn: ex.instructionsEn,
      instructionsTr: ex.instructionsTr,
      instructionsZh: ex.instructionsZh,
      instructionStepsEn: ex.instructionStepsEn,
      instructionStepsTr: ex.instructionStepsTr,
      instructionStepsZh: ex.instructionStepsZh,
      imageUrl: ex.imageUrl,
      gifUrl: ex.gifUrl,
    });
  }

  return (
    <div className="space-y-6">
      {exList.length === 0 && (
        <Card>
          <div className="font-mono text-base text-[color:var(--text-secondary)] text-center py-6">
            {t("ex.freeSession")}
          </div>
        </Card>
      )}

      {exList.map((ex) => {
        const done = setsByExercise.get(ex.exerciseId) ?? [];
        const targetSets = ex.targetSets ?? 3;
        const rows = Array.from({ length: Math.max(targetSets, done.length + 1) });
        const displayName = locale === "tr" ? ex.nameTr ?? ex.nameEn : locale === "zh" ? ex.nameZh ?? ex.nameEn : ex.nameEn;
        return (
          <Card key={ex.exerciseId} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
              <button
                type="button"
                onClick={() => openDetail(ex)}
                aria-label="view details"
                className="relative group"
              >
                {ex.gifUrl ? (
                  <Image
                    src={ex.gifUrl}
                    alt={displayName}
                    width={400}
                    height={400}
                    className="w-full md:w-[180px] aspect-square object-cover border border-[color:var(--border-visible)]"
                    unoptimized
                  />
                ) : (
                  <div className="w-full md:w-[180px] aspect-square dot-grid border border-[color:var(--border)]" />
                )}
                <div className="absolute top-2 right-2 bg-[color:var(--surface)]/90 border border-[color:var(--border-visible)] p-1.5 opacity-90 group-hover:opacity-100 transition">
                  <Info size={14} strokeWidth={1.5} className="text-[color:var(--text-display)]" />
                </div>
              </button>

              <div className="space-y-2">
                <div>
                  <button
                    type="button"
                    onClick={() => openDetail(ex)}
                    className="font-display text-2xl md:text-3xl text-left text-[color:var(--text-display)] hover:text-[color:var(--accent)] transition"
                  >
                    {displayName}
                  </button>
                  <div className="mono-label mt-1">
                    {[ex.target, ex.bodyPart, ex.equipment]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                {(ex.targetSets || ex.targetReps || ex.targetWeightKg) && (
                  <div className="mono-label">
                    {t("ex.target")} {ex.targetSets ?? "?"} × {ex.targetReps ?? "?"}{" "}
                    {ex.targetWeightKg ? `@ ${ex.targetWeightKg}kg` : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-0">
              {rows.map((_, i) => {
                const existing = done[i];
                return (
                  <SetRow
                    key={i}
                    setIndex={i}
                    initial={
                      existing
                        ? {
                            reps: existing.reps,
                            weightKg: existing.weightKg,
                            rpe: existing.rpe,
                          }
                        : undefined
                    }
                    lastTime={
                      ex.targetReps && ex.targetWeightKg
                        ? { reps: ex.targetReps, weightKg: ex.targetWeightKg }
                        : null
                    }
                    disabled={ended || Boolean(existing)}
                    onComplete={(v) => addSet(ex.exerciseId, i, v)}
                  />
                );
              })}
            </div>
          </Card>
        );
      })}

      {!ended && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full border border-dashed border-[color:var(--border-visible)] dot-grid-subtle py-5 font-mono text-[13px] uppercase tracking-[0.12em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] hover:border-[color:var(--text-display)] transition"
        >
          {t("ex.addExerciseLibrary")}
        </button>
      )}

      {!ended && (
        <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-5xl mx-auto bg-[color:var(--surface)] border border-[color:var(--border-visible)] p-4 flex items-center justify-between gap-4 pointer-events-auto">
            <div className="flex items-center gap-4">
              {restOpen ? (
                <RestTimer seconds={90} onDone={() => setRestOpen(false)} />
              ) : (
                <button
                  onClick={() => setRestOpen(true)}
                  className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]"
                >
                  {t("ex.restTimer")}
                </button>
              )}
            </div>
            <Button variant="accent" onClick={endWorkout}>
              {t("ex.endSession")}
            </Button>
          </div>
        </div>
      )}

      <ExerciseDetailDrawer
        exercise={detail}
        open={detail !== null}
        onClose={() => setDetail(null)}
        locale={locale}
      />
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pickExercise}
      />
    </div>
  );
}
