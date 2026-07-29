"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDemoStore, DEMO_USER_ID } from "@/lib/demo/store";
import { ProgramEditor, type EditorDay } from "./program-editor";

export default function ProgramEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useDemoStore();

  const p = state.programs.find((x) => x.id === id);

  if (!p || p.isTemplate || p.userId !== DEMO_USER_ID) {
    return (
      <div className="font-mono text-base text-[color:var(--text-secondary)] py-12 text-center">
        not editable —{" "}
        <Link href="/programs" className="text-[color:var(--accent)]">
          back
        </Link>
      </div>
    );
  }

  const days = state.programDays
    .filter((d) => d.programId === p.id)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const editorDays: EditorDay[] = days.map((d) => {
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
          targetWeightKg: pe.targetWeightKg ? Number(pe.targetWeightKg) : null,
          notes: pe.notes,
          exerciseId: pe.exerciseId,
          name: ex?.nameEn ?? pe.exerciseId,
          subtitle: [ex?.target, ex?.bodyPart, ex?.equipment]
            .filter(Boolean)
            .join(" · "),
          gifUrl: ex?.gifUrl ?? null,
        };
      });
    return {
      id: d.id,
      dayIndex: d.dayIndex,
      name: d.name,
      exercises: exs,
    };
  });

  return (
    <ProgramEditor
      programId={p.id}
      initialName={p.name}
      initialDescription={p.description ?? ""}
      initialDays={editorDays}
    />
  );
}
