import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { exercises, programDays, programExercises, programs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import { trCatalog } from "@/lib/i18n/exercise-zh";
import { ProgramEditor, type EditorDay } from "./program-editor";

export const dynamic = "force-dynamic";

export default async function ProgramEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  const [p] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!p) return notFound();
  // Only the owner can edit. Templates (userId = null) are read-only.
  if (p.isTemplate || p.userId !== user.id) return notFound();

  const days = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programId, p.id))
    .orderBy(asc(programDays.dayIndex));

  void user;
  const locale = await getLocale();
  const localeNameCol = exercises.nameEn;

  const editorDays: EditorDay[] = await Promise.all(
    days.map(async (d) => {
      const exs = await db
        .select({
          id: programExercises.id,
          orderIndex: programExercises.orderIndex,
          targetSets: programExercises.targetSets,
          targetReps: programExercises.targetReps,
          targetWeightKg: programExercises.targetWeightKg,
          notes: programExercises.notes,
          exerciseId: exercises.id,
          name: localeNameCol,
          nameEn: exercises.nameEn,
          nameZh: exercises.nameZh,
          bodyPart: exercises.bodyPart,
          equipment: exercises.equipment,
          target: exercises.target,
          gifUrl: exercises.gifUrl,
        })
        .from(programExercises)
        .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
        .where(eq(programExercises.programDayId, d.id))
        .orderBy(asc(programExercises.orderIndex));
      return {
        id: d.id,
        dayIndex: d.dayIndex,
        name: d.name,
        exercises: exs.map((e) => ({
          id: e.id,
          orderIndex: e.orderIndex,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeightKg: e.targetWeightKg ? Number(e.targetWeightKg) : null,
          notes: e.notes,
          exerciseId: e.exerciseId,
          name: locale === "zh" ? (e.nameZh ?? e.nameEn) : (e.name ?? e.nameEn),
          subtitle: [trCatalog("target", e.target, locale), trCatalog("bodyPart", e.bodyPart, locale), trCatalog("equipment", e.equipment, locale)].filter(Boolean).join(" · "),
          gifUrl: e.gifUrl,
        })),
      };
    }),
  );

  return (
    <ProgramEditor
      programId={p.id}
      initialName={p.name}
      initialDescription={p.description ?? ""}
      initialDays={editorDays}
    />
  );
}
