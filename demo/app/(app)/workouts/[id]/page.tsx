"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { WorkoutSession, type WorkoutExercise } from "./workout-session";
import { WhoopStrainCard } from "@/components/workout/whoop-strain-card";

export default function WorkoutDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useT();
  const { state } = useDemoStore();

  const w = state.workouts.find((x) => x.id === id);

  if (!w) {
    return (
      <div className="font-mono text-base text-[color:var(--text-secondary)] py-12 text-center">
        {t("work.workoutNotFound")}{" "}
        <Link href="/workouts" className="text-[color:var(--accent)]">
          {t("common.backLower")}
        </Link>
      </div>
    );
  }

  // Planned exercises (from program day)
  let planned: WorkoutExercise[] = [];
  if (w.programDayId) {
    const rows = state.programExercises
      .filter((pe) => pe.programDayId === w.programDayId)
      .map((pe) => {
        const ex = state.exercises.find((e) => e.id === pe.exerciseId);
        return { pe, ex };
      })
      .filter((r) => r.ex)
      .sort((a, b) => a.pe.orderIndex - b.pe.orderIndex);
    planned = rows.map((r) => ({
      exerciseId: r.pe.exerciseId,
      nameEn: r.ex!.nameEn,
      nameTr: r.ex!.nameTr,
      bodyPart: r.ex!.bodyPart,
      equipment: r.ex!.equipment,
      target: r.ex!.target,
      muscleGroup: r.ex!.muscleGroup,
      secondaryMuscles: (r.ex!.secondaryMuscles as string[] | null) ?? null,
      instructionsEn: r.ex!.instructionsEn,
      instructionsTr: r.ex!.instructionsTr,
      imageUrl: r.ex!.imageUrl,
      gifUrl: r.ex!.gifUrl,
      targetSets: r.pe.targetSets,
      targetReps: r.pe.targetReps,
      targetWeightKg: r.pe.targetWeightKg ? Number(r.pe.targetWeightKg) : null,
    }));
  }

  const sets = state.workoutSets.filter((s) => s.workoutId === w.id);

  const seenIds = new Set(planned.map((p) => p.exerciseId));
  const adhocIds = Array.from(new Set(sets.map((s) => s.exerciseId))).filter(
    (eid) => !seenIds.has(eid),
  );
  const adhoc: WorkoutExercise[] = adhocIds
    .map((aid) => state.exercises.find((e) => e.id === aid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((r) => ({
      exerciseId: r.id,
      nameEn: r.nameEn,
      nameTr: r.nameTr,
      bodyPart: r.bodyPart,
      equipment: r.equipment,
      target: r.target,
      muscleGroup: r.muscleGroup,
      secondaryMuscles: (r.secondaryMuscles as string[] | null) ?? null,
      instructionsEn: r.instructionsEn,
      instructionsTr: r.instructionsTr,
      imageUrl: r.imageUrl,
      gifUrl: r.gifUrl,
      targetSets: null,
      targetReps: null,
      targetWeightKg: null,
    }));

  const initialExercises = [...planned, ...adhoc];

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <Link
            href="/workouts"
            className="mono-label hover:text-[color:var(--text-display)]"
          >
            {t("work.back")}
          </Link>
          <h1 className="font-display text-4xl md:text-5xl mt-2">
            {new Date(w.startedAt).toLocaleString("en-US", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </h1>
        </div>
        <div className="text-right">
          <div className="mono-label">
            {w.endedAt ? t("work.completed") : t("work.inProgress")}
          </div>
        </div>
      </header>

      <WorkoutSession
        workoutId={w.id}
        locale="en"
        initialExercises={initialExercises}
        existingSets={sets.map((s) => ({
          exerciseId: s.exerciseId,
          setIndex: s.setIndex,
          reps: s.reps,
          weightKg: s.weightKg ? Number(s.weightKg) : null,
          rpe: s.rpe,
        }))}
        ended={Boolean(w.endedAt)}
      />

      <WhoopStrainCard workoutId={w.id} />
    </div>
  );
}
