"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { useDemoStore, generateId } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExercisePicker } from "@/components/workout/exercise-picker";

export type EditorExercise = {
  id: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  notes: string | null;
  exerciseId: string;
  name: string;
  subtitle: string;
  gifUrl: string | null;
};

export type EditorDay = {
  id: string;
  dayIndex: number;
  name: string;
  exercises: EditorExercise[];
};

type Status = "idle" | "saving" | "saved";

export function ProgramEditor({
  programId,
  initialName,
  initialDescription,
  initialDays,
}: {
  programId: string;
  initialName: string;
  initialDescription: string;
  initialDays: EditorDay[];
}) {
  const t = useT();
  const { update } = useDemoStore();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [days, setDays] = useState<EditorDay[]>(initialDays);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);

  function flash(label: string) {
    setStatus("saved");
    setStatusMsg(label);
    setTimeout(() => {
      setStatus((s) => (s === "saved" ? "idle" : s));
    }, 1200);
  }

  // ----- program-level edits -----
  function saveProgramField(field: "name" | "description", value: string) {
    update((prev) => ({
      programs: prev.programs.map((p) =>
        p.id === programId
          ? {
              ...p,
              [field]: field === "description" ? (value || null) : value,
            }
          : p,
      ),
    }));
    flash(`${field} saved`);
  }

  // ----- days -----
  function addDay() {
    const nextName = `Day ${days.length + 1}`;
    const id = generateId();
    const dayIndex = days.length;
    update((prev) => ({
      programDays: [
        ...prev.programDays,
        { id, programId, dayIndex, name: nextName },
      ],
    }));
    setDays((prev) => [
      ...prev,
      { id, dayIndex, name: nextName, exercises: [] },
    ]);
    flash("day added");
  }

  function renameDay(dayId: string, newName: string) {
    update((prev) => ({
      programDays: prev.programDays.map((d) =>
        d.id === dayId ? { ...d, name: newName } : d,
      ),
    }));
    flash("day renamed");
  }

  function deleteDay(dayId: string) {
    update((prev) => ({
      programDays: prev.programDays.filter((d) => d.id !== dayId),
      programExercises: prev.programExercises.filter((pe) => pe.programDayId !== dayId),
    }));
    setDays((prev) => prev.filter((d) => d.id !== dayId));
    flash("day deleted");
  }

  // ----- exercises -----
  function addExerciseToDay(dayId: string, exerciseId: string, name: string) {
    const id = generateId();
    const dayState = days.find((d) => d.id === dayId);
    const orderIndex = dayState ? dayState.exercises.length : 0;
    update((prev) => ({
      programExercises: [
        ...prev.programExercises,
        {
          id,
          programDayId: dayId,
          exerciseId,
          orderIndex,
          targetSets: 3,
          targetReps: 10,
          targetWeightKg: null,
          notes: null,
        },
      ],
    }));
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  id,
                  orderIndex,
                  targetSets: 3,
                  targetReps: 10,
                  targetWeightKg: null,
                  notes: null,
                  exerciseId,
                  name,
                  subtitle: "",
                  gifUrl: null,
                },
              ],
            }
          : d,
      ),
    );
    flash("exercise added");
  }

  function updateExercise(
    dayId: string,
    exId: string,
    field: "targetSets" | "targetReps" | "targetWeightKg" | "notes",
    raw: string,
  ) {
    const parsed =
      field === "notes"
        ? raw.trim() === ""
          ? null
          : raw
        : raw.trim() === ""
          ? null
          : Number(raw);
    if (field !== "notes" && parsed !== null && Number.isNaN(parsed as number)) {
      return;
    }
    setDays((prev) =>
      prev.map((d) =>
        d.id !== dayId
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id !== exId
                  ? e
                  : {
                      ...e,
                      [field]:
                        field === "notes"
                          ? (parsed as string | null)
                          : (parsed as number | null),
                    },
              ),
            },
      ),
    );
    update((prev) => ({
      programExercises: prev.programExercises.map((pe) =>
        pe.id !== exId
          ? pe
          : field === "notes"
            ? { ...pe, notes: parsed as string | null }
            : field === "targetWeightKg"
              ? { ...pe, targetWeightKg: parsed != null ? String(parsed) : null }
              : { ...pe, [field]: parsed as number | null },
      ),
    }));
    flash(`${field} saved`);
  }

  function deleteExercise(dayId: string, exId: string) {
    update((prev) => ({
      programExercises: prev.programExercises.filter((pe) => pe.id !== exId),
    }));
    setDays((prev) =>
      prev.map((d) =>
        d.id !== dayId
          ? d
          : { ...d, exercises: d.exercises.filter((e) => e.id !== exId) },
      ),
    );
    flash("exercise removed");
  }

  function StatusBadge() {
    if (status === "idle") return null;
    const color =
      status === "saved"
        ? "var(--success)"
        : "var(--text-secondary)";
    return (
      <span
        className="font-mono text-[13px] uppercase tracking-[0.08em]"
        style={{ color }}
      >
        {statusMsg}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link
            href={`/programs/${programId}`}
            className="mono-label hover:text-[color:var(--text-display)]"
          >
            {t("work.back")}
          </Link>
          <div className="mono-label mt-2">{t("prog.editingLabel")}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge />
          <Link href={`/programs/${programId}`} className="btn btn--outline btn--sm">
            {t("prog.doneButton")}
          </Link>
        </div>
      </header>

      <Card className="space-y-5">
        <div>
          <div className="mono-label mb-1">{t("prog.nameLabel")}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name !== initialName) saveProgramField("name", name.trim());
            }}
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-display text-3xl text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("prog.descriptionLabel")}</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== initialDescription) {
                saveProgramField("description", description);
              }
            }}
            rows={2}
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {days.map((day) => (
          <Card key={day.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="mono-label shrink-0">{t("prog.dayLabel")} {day.dayIndex + 1}</div>
              <input
                defaultValue={day.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== day.name) {
                    setDays((prev) =>
                      prev.map((d) => (d.id === day.id ? { ...d, name: v } : d)),
                    );
                    renameDay(day.id, v);
                  }
                }}
                className="flex-1 bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-display text-xl text-[color:var(--text-display)] focus:outline-none"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      t("prog.deleteDayConfirmation", { day: day.name, count: day.exercises.length }),
                    )
                  ) {
                    deleteDay(day.id);
                  }
                }}
                aria-label="delete day"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </Button>
            </div>

            <ul className="space-y-2">
              {day.exercises.map((ex) => (
                <li
                  key={ex.id}
                  className="grid grid-cols-[56px_1fr_auto] gap-3 items-center p-2 border border-[color:var(--border)]"
                >
                  {ex.gifUrl ? (
                    <Image
                      src={ex.gifUrl}
                      alt={ex.name}
                      width={112}
                      height={112}
                      unoptimized
                      className="w-14 h-14 object-cover border border-[color:var(--border)]"
                    />
                  ) : (
                    <div className="w-14 h-14 dot-grid-subtle border border-[color:var(--border)]" />
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="font-body text-base text-[color:var(--text-display)] truncate">
                      {ex.name}
                    </div>
                    {ex.subtitle && (
                      <div className="mono-label truncate">{ex.subtitle}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <NumField
                        label={t("prog.sets")}
                        value={ex.targetSets}
                        onCommit={(v) =>
                          updateExercise(day.id, ex.id, "targetSets", v)
                        }
                      />
                      <NumField
                        label={t("prog.reps")}
                        value={ex.targetReps}
                        onCommit={(v) =>
                          updateExercise(day.id, ex.id, "targetReps", v)
                        }
                      />
                      <NumField
                        label={t("prog.kg")}
                        value={ex.targetWeightKg}
                        step="0.5"
                        onCommit={(v) =>
                          updateExercise(day.id, ex.id, "targetWeightKg", v)
                        }
                      />
                    </div>
                    <input
                      defaultValue={ex.notes ?? ""}
                      placeholder={t("prog.notesPlaceholder")}
                      onBlur={(e) =>
                        updateExercise(day.id, ex.id, "notes", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-[13px] text-[color:var(--text-secondary)] focus:outline-none placeholder:text-[color:var(--text-disabled)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteExercise(day.id, ex.id)}
                    aria-label="remove exercise"
                    className="self-start text-[color:var(--text-disabled)] hover:text-[color:var(--accent)] p-2"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
              {day.exercises.length === 0 && (
                <li className="font-mono text-[13px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em] py-2">
                  {t("prog.noExercisesYetInline")}
                </li>
              )}
            </ul>

            <button
              type="button"
              onClick={() => setPickerDayId(day.id)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[color:var(--border-visible)] hover:border-[color:var(--text-display)] font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
              {t("prog.addExerciseButton")}
            </button>
          </Card>
        ))}

        <button
          type="button"
          onClick={addDay}
          className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[color:var(--border-visible)] hover:border-[color:var(--text-display)] font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
          {t("prog.addDayButton")}
        </button>
      </div>

      <ExercisePicker
        open={pickerDayId !== null}
        onClose={() => setPickerDayId(null)}
        onPick={(exerciseId, name) => {
          if (!pickerDayId) return;
          addExerciseToDay(pickerDayId, exerciseId, name);
          setPickerDayId(null);
        }}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  step = "1",
  onCommit,
}: {
  label: string;
  value: number | null;
  step?: string;
  onCommit: (raw: string) => void;
}) {
  return (
    <label className="inline-flex items-baseline gap-1">
      <span className="mono-label">{label}</span>
      <input
        type="number"
        step={step}
        min={0}
        defaultValue={value ?? ""}
        onBlur={(e) => {
          const next = e.target.value;
          const current = value ?? "";
          if (next !== String(current)) onCommit(next);
        }}
        className="w-14 bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-[14px] text-[color:var(--text-display)] tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}
