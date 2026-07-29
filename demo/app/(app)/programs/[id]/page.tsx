"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { useDemoStore, DEMO_USER_ID } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { StartDayForm } from "./start-day-form";
import { DeleteProgramButton } from "./delete-program-button";

export default function ProgramDetail() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useDemoStore();

  const p = state.programs.find((x) => x.id === id);

  if (!p) {
    return (
      <div className="font-mono text-base text-[color:var(--text-secondary)] py-12 text-center">
        {t("prog.programNotFound")}{" "}
        <Link href="/programs" className="text-[color:var(--accent)]">
          {t("common.backLower")}
        </Link>
      </div>
    );
  }

  const days = state.programDays
    .filter((d) => d.programId === p.id)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const dayContent = days.map((d) => {
    const exs = state.programExercises
      .filter((pe) => pe.programDayId === d.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((pe) => {
        const ex = state.exercises.find((e) => e.id === pe.exerciseId);
        return {
          id: pe.id,
          orderIndex: pe.orderIndex,
          targetSets: pe.targetSets,
          targetReps: pe.targetReps,
          targetWeightKg: pe.targetWeightKg,
          notes: pe.notes,
          exerciseId: pe.exerciseId,
          name: ex?.nameEn ?? pe.exerciseId,
          nameEn: ex?.nameEn ?? pe.exerciseId,
          bodyPart: ex?.bodyPart ?? null,
          equipment: ex?.equipment ?? null,
          target: ex?.target ?? null,
          gifUrl: ex?.gifUrl ?? null,
          imageUrl: ex?.imageUrl ?? null,
        };
      });
    return { day: d, exs };
  });

  const canEdit = !p.isTemplate && p.userId === DEMO_USER_ID;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link href="/programs" className="mono-label hover:text-[color:var(--text-display)]">
            {t("prog.editBackLink")}
          </Link>
          <h1 className="font-display text-5xl mt-2 break-words">{p.name}</h1>
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
              {t("prog.editButton")}
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
                <div className="mono-label">{t("prog.dayLabel")} {day.dayIndex + 1}</div>
                <div className="font-display text-2xl mt-1">{day.name}</div>
              </div>
              <StartDayForm programId={p.id} programDayId={day.id} />
            </div>

            <ul className="space-y-2">
              {exs.map((e) => {
                const media = e.gifUrl ?? e.imageUrl;
                const displayName = e.name ?? e.nameEn;
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
                        {[e.target, e.bodyPart, e.equipment].filter(Boolean).join(" · ")}
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
