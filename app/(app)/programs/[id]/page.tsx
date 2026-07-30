import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exercises, programDays, programExercises, programs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { trCatalog } from "@/lib/i18n/exercise-zh";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StartDayForm } from "./start-day-form";
import { DeleteProgramButton } from "./delete-program-button";

export const dynamic = "force-dynamic";

export default async function ProgramDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const locale = await getLocale();
  const t = tFor(locale);
  const { id } = await params;
  const [p] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!p) return notFound();
  if (p.userId && p.userId !== user.id) return notFound();

  const days = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programId, p.id))
    .orderBy(asc(programDays.dayIndex));

  // UI is English-only — always show the English exercise name.
  void user;
  const localeNameCol = exercises.nameEn;

  const dayContent = await Promise.all(
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
          imageUrl: exercises.imageUrl,
        })
        .from(programExercises)
        .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
        .where(eq(programExercises.programDayId, d.id))
        .orderBy(asc(programExercises.orderIndex));
      return { day: d, exs };
    }),
  );

  const canEdit = !p.isTemplate && p.userId === user.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link href="/programs" className="mono-label hover:text-[color:var(--text-display)]">
            {t("prog.backToPrograms")}
          </Link>
          <h1 className="font-display text-4xl mt-2 break-words">{p.name}</h1>
          {p.description && (
            <p className="font-body text-[color:var(--text-secondary)] mt-2 max-w-prose">
              {p.description}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href={`/programs/${p.id}/edit`} className="btn btn--outline btn--sm">
              <Pencil size={14} strokeWidth={1.5} className="mr-2" />
              {t("prog.edit")}
            </Link>
            <DeleteProgramButton programId={p.id} programName={p.name} />
          </div>
        )}
      </header>

      <div className="space-y-4">
        {dayContent.map(({ day, exs }) => (
          <Card key={day.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="mono-label">{t("prog.day")} {day.dayIndex + 1}</div>
                <div className="font-display text-2xl mt-1">{day.name}</div>
              </div>
              <StartDayForm programId={p.id} programDayId={day.id} />
            </div>

            <ul className="space-y-2">
              {exs.map((e) => {
                const media = e.gifUrl ?? e.imageUrl;
                const displayName = locale === "zh" ? (e.nameZh ?? e.nameEn) : e.nameEn;
                return (
                  <li
                    key={e.id}
                    className="grid grid-cols-[64px_1fr_auto] gap-3 items-center p-2 border border-[color:var(--border)] bg-[color:var(--surface-raised)]/30"
                  >
                    {media ? (
                      <Image
                        src={media}
                        alt={displayName}
                        width={128}
                        height={128}
                        unoptimized
                        className="w-16 h-16 object-cover border border-[color:var(--border)] bg-[color:var(--surface)]"
                      />
                    ) : (
                      <div className="w-16 h-16 dot-grid-subtle border border-[color:var(--border)]" />
                    )}
                    <div className="min-w-0">
                      <div className="font-body text-base text-[color:var(--text-display)] truncate">
                        {displayName}
                      </div>
                      <div className="mono-label mt-0.5 truncate">
                        {[trCatalog("target", e.target, locale), trCatalog("bodyPart", e.bodyPart, locale), trCatalog("equipment", e.equipment, locale)].filter(Boolean).join(" · ")}
                      </div>
                      {e.notes && (
                        <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1 truncate">
                          {e.notes}
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-[14px] text-[color:var(--text-display)] tabular-nums text-right whitespace-nowrap">
                      {e.targetSets ?? "?"} × {e.targetReps ?? "?"}
                      {e.targetWeightKg ? (
                        <div className="text-[color:var(--text-secondary)]">
                          @ {e.targetWeightKg}kg
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
