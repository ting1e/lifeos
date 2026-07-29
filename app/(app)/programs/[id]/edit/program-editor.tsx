"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
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

type Status = "idle" | "saving" | "saved" | "error";

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
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [days, setDays] = useState<EditorDay[]>(initialDays);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);

  async function fire(
    fn: () => Promise<void>,
    label?: string,
  ): Promise<void> {
    setStatus("saving");
    setStatusMsg(label ?? "saving…");
    try {
      await fn();
      setStatus("saved");
      setStatusMsg("saved");
      setTimeout(() => {
        setStatus((s) => (s === "saved" ? "idle" : s));
      }, 1200);
    } catch (e) {
      setStatus("error");
      setStatusMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function api(path: string, init: RequestInit): Promise<unknown> {
    const r = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error ?? `http_${r.status}`);
    }
    return r.json().catch(() => ({}));
  }

  // ----- program-level edits -----
  async function saveProgramField(field: "name" | "description", value: string) {
    await fire(
      () =>
        api(`/api/programs/${programId}`, {
          method: "PATCH",
          body: JSON.stringify({ [field]: value || (field === "description" ? null : value) }),
        }) as Promise<void>,
      `${field} saved`,
    );
  }

  // ----- days -----
  async function addDay() {
    const nextName = `${t("prog.day")} ${days.length + 1}`;
    await fire(async () => {
      const res = (await api(`/api/programs/${programId}/days`, {
        method: "POST",
        body: JSON.stringify({ name: nextName }),
      })) as { id: string; dayIndex: number };
      setDays((prev) => [
        ...prev,
        { id: res.id, dayIndex: res.dayIndex, name: nextName, exercises: [] },
      ]);
    }, t("prog.dayAdded"));
  }

  async function renameDay(dayId: string, name: string) {
    await fire(
      () =>
        api(`/api/program-days/${dayId}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }) as Promise<void>,
      t("prog.dayRenamed"),
    );
  }

  async function deleteDay(dayId: string) {
    await fire(async () => {
      await api(`/api/program-days/${dayId}`, { method: "DELETE" });
      setDays((prev) => prev.filter((d) => d.id !== dayId));
    }, t("prog.dayDeleted"));
  }

  // ----- exercises -----
  async function addExerciseToDay(dayId: string, exerciseId: string, name: string) {
    await fire(async () => {
      const res = (await api(`/api/program-days/${dayId}/exercises`, {
        method: "POST",
        body: JSON.stringify({
          exerciseId,
          targetSets: 3,
          targetReps: 10,
        }),
      })) as { id: string; orderIndex: number };
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                exercises: [
                  ...d.exercises,
                  {
                    id: res.id,
                    orderIndex: res.orderIndex,
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
    }, t("prog.exerciseAdded"));
  }

  async function updateExercise(
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
    // Optimistic local update
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
    await fire(
      () =>
        api(`/api/program-exercises/${exId}`, {
          method: "PATCH",
          body: JSON.stringify({ [field]: parsed }),
        }) as Promise<void>,
      `${field} saved`,
    );
  }

  async function deleteExercise(dayId: string, exId: string) {
    await fire(async () => {
      await api(`/api/program-exercises/${exId}`, { method: "DELETE" });
      setDays((prev) =>
        prev.map((d) =>
          d.id !== dayId
            ? d
            : { ...d, exercises: d.exercises.filter((e) => e.id !== exId) },
        ),
      );
    }, t("prog.exerciseRemoved"));
  }

  function StatusBadge() {
    if (status === "idle") return null;
    const color =
      status === "error"
        ? "var(--accent)"
        : status === "saved"
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
            {t("prog.back")}
          </Link>
          <div className="mono-label mt-2">{t("prog.editing")}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge />
          <Link href={`/programs/${programId}`} className="btn btn--outline btn--sm">
            {t("prog.done")}
          </Link>
        </div>
      </header>

      <Card className="space-y-5">
        <div>
          <div className="mono-label mb-1">{t("prog.name")}</div>
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
          <div className="mono-label mb-1">{t("prog.description")}</div>
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
              <div className="mono-label shrink-0">{t("prog.day")} {day.dayIndex + 1}</div>
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
                      t("prog.deleteDay", { day: day.name, count: String(day.exercises.length) }),
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
                  {t("prog.noExercisesYet")}
                </li>
              )}
            </ul>

            <button
              type="button"
              onClick={() => setPickerDayId(day.id)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[color:var(--border-visible)] hover:border-[color:var(--text-display)] font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
              {t("prog.addExercise")}
            </button>
          </Card>
        ))}

        <button
          type="button"
          onClick={addDay}
          className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[color:var(--border-visible)] hover:border-[color:var(--text-display)] font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
          {t("prog.addDay")}
        </button>
      </div>

      <ExercisePicker
        open={pickerDayId !== null}
        onClose={() => setPickerDayId(null)}
        onPick={async (exerciseId, name) => {
          if (!pickerDayId) return;
          await addExerciseToDay(pickerDayId, exerciseId, name);
          setPickerDayId(null);
          router.refresh();
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
