import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  exercises,
  profile,
  programExercises,
  workouts,
  workoutSets,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { bcp47For } from "@/lib/utils";
import { notFound } from "next/navigation";
import { WorkoutSession, type WorkoutExercise } from "./workout-session";
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
        bodyPart: exercises.bodyPart,
        equipment: exercises.equipment,
        target: exercises.target,
        muscleGroup: exercises.muscleGroup,
        secondaryMuscles: exercises.secondaryMuscles,
        instructionsEn: exercises.instructionsEn,
        instructionsTr: exercises.instructionsTr,
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
        bodyPart: r.bodyPart,
        equipment: r.equipment,
        target: r.target,
        muscleGroup: r.muscleGroup,
        secondaryMuscles: r.secondaryMuscles ?? null,
        instructionsEn: r.instructionsEn,
        instructionsTr: r.instructionsTr,
        imageUrl: r.imageUrl,
        gifUrl: r.gifUrl,
        targetSets: r.targetSets,
        targetReps: r.targetReps,
        targetWeightKg: r.targetWeightKg ? Number(r.targetWeightKg) : null,
      }));
  }

  // Sets already logged
  const sets = await db.select().from(workoutSets).where(eq(workoutSets.workoutId, w.id));

  // For sets logged against exercises that aren't in `planned` (i.e. ad-hoc adds),
  // we still need their meta to display. Fetch any extras.
  const seenIds = new Set(planned.map((p) => p.exerciseId));
  const adhocIds = Array.from(new Set(sets.map((s) => s.exerciseId))).filter(
    (id) => !seenIds.has(id),
  );
  let adhoc: WorkoutExercise[] = [];
  if (adhocIds.length > 0) {
    const rows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, adhocIds[0]));
    // Multi-id select: loop because drizzle's `inArray` may not be imported here; keep it simple.
    const all: typeof rows = [];
    for (const id of adhocIds) {
      const r = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
      if (r[0]) all.push(r[0]);
    }
    adhoc = all.map((r) => ({
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
  }

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
            {new Date(w.startedAt).toLocaleString(bcp47For(locale), {
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
        locale={locale}
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

      {whoopEnabled && <WhoopStrainCard workoutId={w.id} />}
    </div>
  );
}
