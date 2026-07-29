"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { ExerciseLibrary } from "./exercise-library";

export default function ExercisesPage() {
  const t = useT();
  const { state } = useDemoStore();
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState("");

  const bodyParts = useMemo(() => {
    const set = new Set<string>();
    for (const e of state.exercises) if (e.bodyPart) set.add(e.bodyPart);
    return Array.from(set).sort();
  }, [state.exercises]);

  const rows = useMemo(() => {
    const lo = q.trim().toLowerCase();
    return state.exercises
      .filter((e) => (lo ? e.nameEn.toLowerCase().includes(lo) : true))
      .filter((e) => (bodyPart ? e.bodyPart === bodyPart : true))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 60);
  }, [state.exercises, q, bodyPart]);

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("common.libraryCount", { count: state.exercises.length })}</div>
        <h1 className="font-display text-5xl mt-1">{t("ex.libraryPage")}</h1>
      </header>

      <form
        className="flex flex-wrap gap-3 items-end"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex-1 min-w-48">
          <div className="mono-label mb-1">{t("ex.search")}</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("ex.searchPlaceholder")}
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("ex.bodyPartLabel")}</div>
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-lg text-[color:var(--text-display)]"
          >
            <option value="">{t("ex.allLabel")}</option>
            {bodyParts.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </form>

      <ExerciseLibrary
        locale="en"
        rows={rows.map((ex) => ({
          id: ex.id,
          nameEn: ex.nameEn,
          nameTr: ex.nameTr,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          target: ex.target,
          muscleGroup: ex.muscleGroup,
          secondaryMuscles: (ex.secondaryMuscles as string[] | null) ?? null,
          instructionsEn: ex.instructionsEn,
          instructionsTr: ex.instructionsTr,
          instructionStepsEn: (ex.instructionStepsEn as string[] | null) ?? null,
          instructionStepsTr: (ex.instructionStepsTr as string[] | null) ?? null,
          imageUrl: ex.imageUrl,
          gifUrl: ex.gifUrl,
        }))}
      />
    </div>
  );
}
