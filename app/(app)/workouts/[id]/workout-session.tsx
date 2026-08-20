"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Info } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { trCatalog } from "@/lib/i18n/exercise-zh";
import { Button } from "@/components/ui/button";
import { SetRow, type SetRowValue } from "@/components/workout/set-row";
import { RestTimer } from "@/components/workout/rest-timer";
import { Card } from "@/components/ui/card";
import {
  ExerciseDetailDrawer,
  type ExerciseDetail,
} from "@/components/workout/exercise-detail";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { useEdit } from "./workout-edit-context";

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
  id: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
};

export type LastPerformance = {
  weights: number[];
  avgReps: number | null;
};

export function WorkoutSession({
  workoutId,
  locale,
  initialExercises,
  lastPerformance,
  existingSets,
  ended,
}: {
  workoutId: string;
  locale: "tr" | "en" | "zh";
  initialExercises: WorkoutExercise[];
  lastPerformance?: Record<string, LastPerformance>;
  existingSets: ExistingSet[];
  ended: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [exList, setExList] = useState<WorkoutExercise[]>(initialExercises);
  const [localSets, setLocalSets] = useState<ExistingSet[]>(existingSets);
  const [synced, setSynced] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const { editing } = useEdit();

  // Sets deleted in this session: filtered out of re-fetch responses so a
  // response that raced with the DELETE cannot resurrect them.
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // The Next.js client Router Cache serves a stale RSC payload when this page
  // is restored via back/forward navigation (e.g. the PWA back gesture), so
  // the server can hold newer sets than the props we mounted with. Re-fetch
  // the authoritative sets on mount and when the app returns to the
  // foreground, then let SetRow adopt them.
  const refetchSets = useCallback(async () => {
    try {
      const res = await fetch(`/api/workouts/${workoutId}/sets`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const serverSets = ((data?.sets ?? []) as ExistingSet[]).filter(
        (s) => !deletedIdsRef.current.has(s.id),
      );
      setLocalSets((prev) => {
        // Server is the source of truth; keep client-created rows that the
        // response raced with (created after the request was sent).
        const extras = prev.filter(
          (p) => !serverSets.some((s) => s.id === p.id),
        );
        return [...serverSets, ...extras];
      });
    } catch {
      // Offline / transient failure: keep the current data.
    } finally {
      setSynced(true);
    }
  }, [workoutId]);

  useEffect(() => {
    void refetchSets();
  }, [refetchSets]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refetchSets();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetchSets]);

  // In-progress workouts are always editable. Completed workouts require
  // explicitly entering edit mode via the EDIT button in the page header.
  const canEdit = !ended || editing;

  async function saveSet(
    exId: string,
    idx: number,
    v: SetRowValue,
    setId: string | undefined,
  ): Promise<string | undefined> {
    if (setId) {
      // Update existing set row.
      const res = await fetch(`/api/workout-sets/${setId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reps: v.reps,
          weightKg: v.weightKg,
          rpe: v.rpe,
        }),
      });
      if (res.ok) {
        setLocalSets((s) =>
          s.map((row) =>
            row.id === setId
              ? { ...row, reps: v.reps, weightKg: v.weightKg, rpe: v.rpe }
              : row,
          ),
        );
        return setId;
      }
      if (res.status !== 404) {
        // Transient failure: keep the id so the next save retries the update.
        return setId;
      }
      // 404: the referenced set no longer exists (deleted elsewhere or via a
      // stale reference). Drop the dead row and recreate below.
      deletedIdsRef.current.add(setId);
      setLocalSets((s) => s.filter((row) => row.id !== setId));
    }
    // Create new set row.
    const res = await fetch(`/api/workouts/${workoutId}/sets`, {
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
    const data = await res.json();
    const newId = data?.id as string | undefined;
    if (newId) {
      setLocalSets((s) => [
        ...s,
        {
          id: newId,
          exerciseId: exId,
          setIndex: idx,
          reps: v.reps,
          weightKg: v.weightKg,
          rpe: v.rpe,
        },
      ]);
    }
    return newId;
  }

  async function deleteSet(setId: string) {
    deletedIdsRef.current.add(setId);
    await fetch(`/api/workout-sets/${setId}`, { method: "DELETE" });
    setLocalSets((s) => s.filter((row) => row.id !== setId));
  }

  async function endWorkout() {
    await fetch(`/api/workouts/${workoutId}`, { method: "PATCH" });
    router.refresh();
  }

  async function pickExercise(exerciseId: string, _name: string, _gifUrl: string | null) {
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
    for (const arr of m.values()) arr.sort((a, b) => a.setIndex - b.setIndex);
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
        const lastPerf = lastPerformance?.[ex.exerciseId];
        const targetSets = ex.targetSets ?? 3;
        // `done` is sorted by setIndex, which can have gaps after deletions,
        // so cover the highest logged index too.
        const lastSetIndex = done.length > 0 ? done[done.length - 1].setIndex : -1;
        const rows = Array.from({
          length: Math.max(
            targetSets,
            done.length + 1,
            lastPerf?.weights.length ?? 0,
            lastSetIndex + 1,
          ),
        });
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
                    {[trCatalog("target", ex.target, locale), trCatalog("bodyPart", ex.bodyPart, locale), trCatalog("equipment", ex.equipment, locale)]
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
                // Match rows to sets by setIndex, not position: after a
                // mid-workout deletion the remaining indexes have gaps, and a
                // positional lookup would mis-assign rows (and re-create
                // sets for indexes that are already logged).
                const existing = done.find((s) => s.setIndex === i);
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
                        : {
                            reps: i === 0 ? (lastPerf?.avgReps ?? null) : null,
                            // Target weight only prefill the planned rows;
                            // beyond the plan (the "+1" growth row) rows stay
                            // empty, otherwise auto-save would keep creating
                            // sets forever.
                            weightKg: lastPerf
                              ? (lastPerf.weights[i] ?? null)
                              : i < targetSets
                                ? (ex.targetWeightKg ?? null)
                                : null,
                            rpe: null,
                          }
                    }
                    setId={existing?.id}
                    ready={synced}
                    sync={
                      existing
                        ? {
                            setId: existing.id,
                            value: {
                              reps: existing.reps,
                              weightKg: existing.weightKg,
                              rpe: existing.rpe,
                            },
                          }
                        : undefined
                    }
                    disabled={!canEdit}
                    onSave={(v, sid) => saveSet(ex.exerciseId, i, v, sid)}
                    onDelete={deleteSet}
                  />
                );
              })}
            </div>
          </Card>
        );
      })}

      {canEdit && (
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
