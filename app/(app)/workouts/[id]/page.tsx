import Link from "next/link";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  exercises,
  profile,
  programExercises,
  programs,
  programDays,
  workouts,
  workoutSets,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { bcp47For } from "@/lib/utils";
import { notFound } from "next/navigation";
import { WorkoutSession, type WorkoutExercise } from "./workout-session";
import { DeleteWorkoutButton } from "./delete-workout-button";
import { EditProvider } from "./workout-edit-context";
import { WorkoutEditButton } from "./workout-edit-button";
import { WhoopStrainCard } from "@/components/workout/whoop-strain-card";

export const dynamic = "force-dynamic";

export default async function WorkoutDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const locale = await getLocale();
  const t = tFor(locale);
  const { id } = await params;

  const [w] = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  if (!w || w.userId !== user.id) return notFound();

  // Resolve program + day names (FKs use ON DELETE SET NULL, so ids may dangle).
  let progName: string | null = null;
  let dayInfo: { name: string; dayIndex: number } | null = null;
  if (w.programId) {
    const [p] = await db
      .select({ name: programs.name })
      .from(programs)
      .where(eq(programs.id, w.programId))
      .limit(1);
    progName = p?.name ?? null;
  }
  if (w.programDayId) {
    const [d] = await db
      .select({ name: programDays.name, dayIndex: programDays.dayIndex })
      .from(programDays)
      .where(eq(programDays.id, w.programDayId))
      .limit(1);
    dayInfo = d ? { name: d.name, dayIndex: d.dayIndex } : null;
  }

  const [prof] = await db.select({ whoopEnabled: profile.whoopEnabled }).from(profile).where(eq(profile.userId, user.id)).limit(1);
  const whoopEnabled = prof?.whoopEnabled ?? true;

  // Planned exercises (from program day)
  let planned: WorkoutExercise[] = [];
  if (w.programDayId) {
    const rows = await db
      .select({
        exerciseId: programExercises.exerciseId,
        orderIndex: programExercises.orderIndex,
        targetSets: programExercises.targetSets,
        targetReps: programExercises.targetReps,
        targetWeightKg: programExercises.targetWeightKg,
        nameEn: exercises.nameEn,
        nameTr: exercises.nameTr,
        nameZh: exercises.nameZh,
        bodyPart: exercises.bodyPart,
        equipment: exercises.equipment,
        target: exercises.target,
        muscleGroup: exercises.muscleGroup,
        secondaryMuscles: exercises.secondaryMuscles,
        instructionsEn: exercises.instructionsEn,
        instructionsTr: exercises.instructionsTr,
        instructionsZh: exercises.instructionsZh,
        instructionStepsEn: exercises.instructionStepsEn,
        instructionStepsTr: exercises.instructionStepsTr,
        instructionStepsZh: exercises.instructionStepsZh,
        imageUrl: exercises.imageUrl,
        gifUrl: exercises.gifUrl,
      })
      .from(programExercises)
      .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
      .where(eq(programExercises.programDayId, w.programDayId));
    planned = rows
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((r) => ({
        exerciseId: r.exerciseId,
        nameEn: r.nameEn,
        nameTr: r.nameTr,
        nameZh: r.nameZh,
        bodyPart: r.bodyPart,
        equipment: r.equipment,
        target: r.target,
        muscleGroup: r.muscleGroup,
        secondaryMuscles: r.secondaryMuscles ?? null,
        instructionsEn: r.instructionsEn,
        instructionsTr: r.instructionsTr,
        instructionsZh: r.instructionsZh,
        instructionStepsEn: (r.instructionStepsEn as string[] | null) ?? null,
        instructionStepsTr: (r.instructionStepsTr as string[] | null) ?? null,
        instructionStepsZh: (r.instructionStepsZh as string[] | null) ?? null,
        imageUrl: r.imageUrl,
        gifUrl: r.gifUrl,
        targetSets: r.targetSets,
        targetReps: r.targetReps,
        targetWeightKg: r.targetWeightKg ? Number(r.targetWeightKg) : null,
      }));
  }

  // Sets already logged
  const sets = await db.select().from(workoutSets).where(eq(workoutSets.workoutId, w.id));

  // Last performance per planned exercise: from the most recent previous
  // workout on the same program + day that logged this exercise. Used to
  // prefill per-set weights (one per weighted set last time) and first-set
  // reps (average of all sets).
  const lastPerformance: Record<
    string,
    { weights: number[]; avgReps: number | null }
  > = {};
  if (w.programId && w.programDayId && planned.length > 0) {
    const hist = await db
      .select({
        workoutId: workoutSets.workoutId,
        exerciseId: workoutSets.exerciseId,
        setIndex: workoutSets.setIndex,
        reps: workoutSets.reps,
        weightKg: workoutSets.weightKg,
      })
      .from(workoutSets)
      .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
      .where(
        and(
          eq(workouts.userId, user.id),
          eq(workouts.programId, w.programId),
          eq(workouts.programDayId, w.programDayId),
          ne(workouts.id, w.id),
          inArray(workoutSets.exerciseId, planned.map((p) => p.exerciseId)),
        ),
      )
      .orderBy(desc(workouts.startedAt), workoutSets.setIndex);

    const grouped = new Map<string, typeof hist>();
    for (const row of hist) {
      const arr = grouped.get(row.exerciseId) ?? [];
      arr.push(row);
      grouped.set(row.exerciseId, arr);
    }
    for (const [exId, rows] of grouped) {
      // Rows are ordered most-recent-workout first, so rows[0] belongs to the
      // latest previous workout that logged this exercise.
      const latestWorkoutId = rows[0].workoutId;
      const sessionSets = rows
        .filter((r) => r.workoutId === latestWorkoutId)
        .sort((a, b) => a.setIndex - b.setIndex);
      const weights = sessionSets
        .filter((s) => s.weightKg != null)
        .map((s) => Number(s.weightKg));
      const repsValues = sessionSets
        .map((s) => s.reps)
        .filter((r): r is number => r != null);
      lastPerformance[exId] = {
        weights,
        avgReps: repsValues.length
          ? Math.round(repsValues.reduce((a, b) => a + b, 0) / repsValues.length)
          : null,
      };
    }
  }

  // For sets logged against exercises that aren't in `planned` (i.e. ad-hoc adds),
  // we still need their meta to display. Fetch any extras.
  const seenIds = new Set(planned.map((p) => p.exerciseId));
  const adhocIds = Array.from(new Set(sets.map((s) => s.exerciseId))).filter(
    (id) => !seenIds.has(id),
  );
  let adhoc: WorkoutExercise[] = [];
  if (adhocIds.length > 0) {
    const all = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.id, adhocIds));
    adhoc = all.map((r) => ({
      exerciseId: r.id,
      nameEn: r.nameEn,
      nameTr: r.nameTr,
      nameZh: r.nameZh,
      bodyPart: r.bodyPart,
      equipment: r.equipment,
      target: r.target,
      muscleGroup: r.muscleGroup,
      secondaryMuscles: (r.secondaryMuscles as string[] | null) ?? null,
      instructionsEn: r.instructionsEn,
      instructionsTr: r.instructionsTr,
      instructionsZh: r.instructionsZh,
      instructionStepsEn: (r.instructionStepsEn as string[] | null) ?? null,
      instructionStepsTr: (r.instructionStepsTr as string[] | null) ?? null,
      instructionStepsZh: (r.instructionStepsZh as string[] | null) ?? null,
      imageUrl: r.imageUrl,
      gifUrl: r.gifUrl,
      targetSets: null,
      targetReps: null,
      targetWeightKg: null,
    }));
  }

  const initialExercises = [...planned, ...adhoc];

  return (
    <EditProvider>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/workouts"
              className="mono-label hover:text-[color:var(--text-display)]"
            >
              {t("work.back")}
            </Link>
            <h1 className="font-display text-3xl md:text-4xl mt-2">
              {new Date(w.startedAt).toLocaleString(bcp47For(locale), {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </h1>
            {(progName || dayInfo) && (
              <div className="mono-label mt-1 flex items-center gap-1.5">
                {progName && (
                  <span className="text-[color:var(--text-secondary)]">{progName}</span>
                )}
                {dayInfo && (
                  <span>
                    <span className="text-[color:var(--text-disabled)]">·</span>{" "}
                    {t("prog.day")} {dayInfo.dayIndex + 1} {dayInfo.name}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="mono-label">
              {w.endedAt ? t("work.completed") : t("work.inProgress")}
            </div>
            {w.endedAt && <WorkoutEditButton />}
            <DeleteWorkoutButton workoutId={w.id} />
          </div>
        </header>

        <WorkoutSession
          workoutId={w.id}
          locale={locale}
          initialExercises={initialExercises}
          lastPerformance={lastPerformance}
          existingSets={sets.map((s) => ({
            id: s.id,
            exerciseId: s.exerciseId,
            setIndex: s.setIndex,
            reps: s.reps,
            weightKg: s.weightKg ? Number(s.weightKg) : null,
            rpe: s.rpe,
          }))}
          ended={Boolean(w.endedAt)}
        />

        {whoopEnabled && <WhoopStrainCard workoutId={w.id} />}
      </div>
    </EditProvider>
  );
}
