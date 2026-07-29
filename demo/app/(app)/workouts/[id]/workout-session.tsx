"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import { useDemoStore, generateId } from "@/lib/demo/store";
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
  bodyPart: string | null;
  equipment: string | null;
  target: string | null;
  muscleGroup: string | null;
  secondaryMuscles: string[] | null;
  instructionsEn: string | null;
  instructionsTr: string | null;
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
  locale: "tr" | "en";
  initialExercises: WorkoutExercise[];
  existingSets: ExistingSet[];
  ended: boolean;
}) {
  const t = useT();
  const { state, update } = useDemoStore();
  const [exList, setExList] = useState<WorkoutExercise[]>(initialExercises);
  const [localSets, setLocalSets] = useState<ExistingSet[]>(existingSets);
  const [restOpen, setRestOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);

  function addSet(exId: string, idx: number, v: SetRowValue) {
    update((prev) => ({
      workoutSets: [
        ...prev.workoutSets,
        {
          id: generateId(),
          workoutId,
          exerciseId: exId,
          setIndex: idx,
          reps: v.reps,
          weightKg: v.weightKg != null ? String(v.weightKg) : null,
          rpe: v.rpe,
          completedAt: new Date(),
        },
      ],
    }));
    setLocalSets((s) => [
      ...s,
      { exerciseId: exId, setIndex: idx, reps: v.reps, weightKg: v.weightKg, rpe: v.rpe },
    ]);
    setRestOpen(true);
  }

  function endWorkout() {
    update((prev) => ({
      workouts: prev.workouts.map((w) =>
        w.id === workoutId ? { ...w, endedAt: new Date() } : w,
      ),
    }));
  }

  function pickExercise(exerciseId: string, _name: string) {
    setPickerOpen(false);
    const match = state.exercises.find((e) => e.id === exerciseId);
    if (!match) return;
    const next: WorkoutExercise = {
      exerciseId: match.id,
      nameEn: match.nameEn,
      nameTr: match.nameTr,
      bodyPart: match.bodyPart,
      equipment: match.equipment,
      target: match.target,
      muscleGroup: match.muscleGroup,
      secondaryMuscles: (match.secondaryMuscles as string[] | null) ?? null,
      instructionsEn: match.instructionsEn,
      instructionsTr: match.instructionsTr,
      imageUrl: match.imageUrl,
      gifUrl: match.gifUrl,
      targetSets: null,
      targetReps: null,
      targetWeightKg: null,
    };
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
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      target: ex.target,
      muscleGroup: ex.muscleGroup,
      secondaryMuscles: ex.secondaryMuscles,
      instructionsEn: ex.instructionsEn,
      instructionsTr: ex.instructionsTr,
      imageUrl: ex.imageUrl,
      gifUrl: ex.gifUrl,
    });
  }

  return (
    <div className="space-y-6">
      {exList.length === 0 && (
        <Card>
          <div className="font-mono text-base text-[color:var(--text-secondary)] text-center py-6">
            {t("ex.freeSessionInline")}
          </div>
        </Card>
      )}

      {exList.map((ex) => {
        const done = setsByExercise.get(ex.exerciseId) ?? [];
        const targetSets = ex.targetSets ?? 3;
        const rows = Array.from({ length: Math.max(targetSets, done.length + 1) });
        const displayName = locale === "tr" ? ex.nameTr ?? ex.nameEn : ex.nameEn;
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
                    TARGET {ex.targetSets ?? "?"} × {ex.targetReps ?? "?"}{" "}
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
          {t("ex.addExerciseFromLibrary")}
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
