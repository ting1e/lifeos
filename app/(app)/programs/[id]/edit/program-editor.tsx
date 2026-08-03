"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useT } from "@/lib/i18n/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  const confirm = useConfirm();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [days, setDays] = useState<EditorDay[]>(initialDays);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  // Track the last value persisted to the server so onBlur only PATCHes
  // when the field actually changed since the last successful save.
  const [lastSavedName, setLastSavedName] = useState(initialName);
  const [lastSavedDesc, setLastSavedDesc] = useState(initialDescription);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function fire(
    fn: () => Promise<void>,
    label?: string,
  ): Promise<void> {
    setStatus("saving");
    setStatusMsg(label ?? t("common.saving"));
    try {
      await fn();
      setStatus("saved");
      setStatusMsg(t("common.saved"));
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
    await fire(async () => {
      await api(`/api/programs/${programId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value || (field === "description" ? null : value) }),
      });
      if (field === "name") setLastSavedName(value);
      else setLastSavedDesc(value);
    });
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
  async function addExerciseToDay(dayId: string, exerciseId: string, name: string, gifUrl: string | null) {
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
                    gifUrl,
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
    await fire(() =>
      api(`/api/program-exercises/${exId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: parsed }),
      }) as Promise<void>,
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

  function handleDragEnd(dayId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    const oldIndex = day.exercises.findIndex((e) => e.id === active.id);
    const newIndex = day.exercises.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Repack orderIndex = 0..n-1 after the move so the sequence stays compact
    // (also closes gaps left by earlier deletions).
    const reordered = arrayMove(day.exercises, oldIndex, newIndex).map(
      (e, i) => ({ ...e, orderIndex: i }),
    );
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, exercises: reordered } : d)),
    );
    // Compare each element's NEW orderIndex against its OWN old one (not the
    // old orderIndex of whatever element used to occupy this position — that
    // would false-negative on adjacent swaps when the sequence is compact).
    const oldOrderById = new Map(
      day.exercises.map((e) => [e.id, e.orderIndex]),
    );
    const changes = reordered
      .filter((e) => e.orderIndex !== oldOrderById.get(e.id))
      .map((e) => ({ id: e.id, orderIndex: e.orderIndex }));
    if (changes.length === 0) return;
    fire(
      async () => {
        await Promise.all(
          changes.map((c) =>
            api(`/api/program-exercises/${c.id}`, {
              method: "PATCH",
              body: JSON.stringify({ orderIndex: c.orderIndex }),
            }),
          ),
        );
      },
      t("prog.exerciseReordered"),
    );
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
              if (name.trim() && name !== lastSavedName) saveProgramField("name", name.trim());
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
              if (description !== lastSavedDesc) {
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
                onClick={async () => {
                  if (
                    await confirm({
                      message: t("prog.deleteDay", { day: day.name, count: String(day.exercises.length) }),
                      danger: true,
                    })
                  ) {
                    deleteDay(day.id);
                  }
                }}
                aria-label="delete day"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </Button>
            </div>

            {day.exercises.length === 0 ? (
              <ul className="space-y-2">
                <li className="font-mono text-[13px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em] py-2">
                  {t("prog.noExercisesYet")}
                </li>
              </ul>
            ) : (
              <DndContext
                id={`dnd-day-${day.id}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(day.id, e)}
              >
                <SortableContext
                  items={day.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {day.exercises.map((ex) => (
                      <SortableExerciseRow
                        key={ex.id}
                        dayId={day.id}
                        ex={ex}
                        onUpdate={updateExercise}
                        onDelete={deleteExercise}
                        removeLabel={t("prog.exerciseRemoved")}
                        notesLabel={t("prog.notesPlaceholder")}
                        setsLabel={t("prog.sets")}
                        repsLabel={t("prog.reps")}
                        kgLabel={t("prog.kg")}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

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
        onPick={async (exerciseId, name, gifUrl) => {
          if (!pickerDayId) return;
          await addExerciseToDay(pickerDayId, exerciseId, name, gifUrl);
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
  // Local input value mirrors the persisted prop but allows free typing of
  // intermediate states (e.g. "1.", "") without snapping back. We commit to
  // the server via a debounce so each keystroke doesn't fire a PATCH.
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommitted = useRef(value != null ? String(value) : "");

  useEffect(() => {
    const persisted = value != null ? String(value) : "";
    if (persisted !== lastCommitted.current) {
      lastCommitted.current = persisted;
      setDraft(persisted);
    }
  }, [value]);

  function scheduleCommit(raw: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (raw !== lastCommitted.current) {
        lastCommitted.current = raw;
        onCommit(raw);
      }
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (draft !== lastCommitted.current) onCommit(draft);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="inline-flex items-baseline gap-1">
      <span className="mono-label">{label}</span>
      <input
        type="number"
        step={step}
        min={0}
        value={draft}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          scheduleCommit(next);
        }}
        onBlur={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          if (draft !== lastCommitted.current) {
            lastCommitted.current = draft;
            onCommit(draft);
          }
        }}
        className="w-14 bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-[14px] text-[color:var(--text-display)] tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

function NotesField({
  value,
  placeholder,
  onCommit,
}: {
  value: string | null;
  placeholder: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommitted = useRef(value ?? "");

  useEffect(() => {
    const persisted = value ?? "";
    if (persisted !== lastCommitted.current) {
      lastCommitted.current = persisted;
      setDraft(persisted);
    }
  }, [value]);

  function scheduleCommit(raw: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (raw !== lastCommitted.current) {
        lastCommitted.current = raw;
        onCommit(raw);
      }
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (draft !== lastCommitted.current) onCommit(draft);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        setDraft(e.target.value);
        scheduleCommit(e.target.value);
      }}
      onBlur={() => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        if (draft !== lastCommitted.current) {
          lastCommitted.current = draft;
          onCommit(draft);
        }
      }}
      className="w-full bg-transparent border-b border-[color:var(--border)] focus:border-[color:var(--accent)] py-1 font-mono text-[13px] text-[color:var(--text-secondary)] focus:outline-none placeholder:text-[color:var(--text-disabled)]"
    />
  );
}

function SortableExerciseRow({
  dayId,
  ex,
  onUpdate,
  onDelete,
  removeLabel,
  notesLabel,
  setsLabel,
  repsLabel,
  kgLabel,
}: {
  dayId: string;
  ex: EditorExercise;
  onUpdate: (
    dayId: string,
    exId: string,
    field: "targetSets" | "targetReps" | "targetWeightKg" | "notes",
    raw: string,
  ) => void;
  onDelete: (dayId: string, exId: string) => void;
  removeLabel: string;
  notesLabel: string;
  setsLabel: string;
  repsLabel: string;
  kgLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
      className="grid grid-cols-[56px_1fr_auto] gap-3 items-center p-2 border border-[color:var(--border)] touch-none cursor-grab active:cursor-grabbing select-none"
    >
      {ex.gifUrl ? (
        <Image
          src={ex.gifUrl}
          alt={ex.name}
          width={112}
          height={112}
          unoptimized
          className="w-14 h-14 object-cover border border-[color:var(--border)] pointer-events-none"
        />
      ) : (
        <div className="w-14 h-14 dot-grid-subtle border border-[color:var(--border)] pointer-events-none" />
      )}
      <div className="min-w-0 space-y-1">
        <div className="font-body text-base text-[color:var(--text-display)] truncate">
          {ex.name}
        </div>
        {ex.subtitle && <div className="mono-label truncate">{ex.subtitle}</div>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <NumField
            label={setsLabel}
            value={ex.targetSets}
            onCommit={(v) => onUpdate(dayId, ex.id, "targetSets", v)}
          />
          <NumField
            label={repsLabel}
            value={ex.targetReps}
            onCommit={(v) => onUpdate(dayId, ex.id, "targetReps", v)}
          />
          <NumField
            label={kgLabel}
            value={ex.targetWeightKg}
            step="0.5"
            onCommit={(v) => onUpdate(dayId, ex.id, "targetWeightKg", v)}
          />
        </div>
        <NotesField
          value={ex.notes}
          placeholder={notesLabel}
          onCommit={(v) => onUpdate(dayId, ex.id, "notes", v)}
        />
      </div>
      <div className="flex flex-col items-center self-start">
        <span
          aria-hidden
          className="text-[color:var(--text-disabled)] p-1.5 pointer-events-none"
        >
          <GripVertical size={16} strokeWidth={1.5} />
        </span>
        <button
          type="button"
          onClick={() => onDelete(dayId, ex.id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={removeLabel}
          className="text-[color:var(--text-disabled)] hover:text-[color:var(--accent)] p-1.5"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </li>
  );
}
