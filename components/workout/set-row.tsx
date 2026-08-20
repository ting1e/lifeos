"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export type SetRowValue = {
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
};

export function SetRow({
  setIndex,
  initial,
  setId,
  ready = true,
  sync,
  disabled,
  onSave,
  onDelete,
}: {
  setIndex: number;
  initial?: SetRowValue;
  setId?: string;
  ready?: boolean;
  sync?: { setId: string; value: SetRowValue };
  disabled?: boolean;
  onSave: (v: SetRowValue, setId: string | undefined) => void | Promise<string | undefined>;
  onDelete?: (setId: string) => void | Promise<void>;
}) {
  const [reps, setReps] = useState<string>(initial?.reps?.toString() ?? "");
  const [weight, setWeight] = useState<string>(initial?.weightKg?.toString() ?? "");
  const [rpe, setRpe] = useState<string>(initial?.rpe?.toString() ?? "");
  const [saved, setSaved] = useState(false);

  // Refs mirror the latest input values so the debounced timeout reads
  // up-to-date data instead of the stale closure captured at call time
  // (React state hasn't applied yet when onChange fires → scheduleSave).
  const repsRef = useRef(reps);
  const weightRef = useRef(weight);
  const rpeRef = useRef(rpe);
  const currentSetId = useRef<string | undefined>(setId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFired = useRef<string>("");
  const autoSaved = useRef(false);
  const dirty = useRef(false);
  const t = useT();

  async function saveNow() {
    const r = repsRef.current;
    const w = weightRef.current;
    const p = rpeRef.current;
    const snapshot = JSON.stringify({ reps: r, weight: w, rpe: p });
    if (snapshot === lastFired.current) return;
    lastFired.current = snapshot;
    const v: SetRowValue = {
      reps: r ? Number(r) : null,
      weightKg: w ? Number(w) : null,
      rpe: p ? Number(p) : null,
    };
    // If the row has no values at all and a set was previously created,
    // delete it instead of saving an empty set.
    if (v.reps === null && v.weightKg === null && v.rpe === null) {
      if (currentSetId.current && onDelete) {
        await onDelete(currentSetId.current);
        currentSetId.current = undefined;
        lastFired.current = "";
      }
      return;
    }
    const newId = await onSave(v, currentSetId.current);
    if (newId) currentSetId.current = newId;
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function scheduleSave() {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      await saveNow();
    }, 600);
  }

  // Adopt authoritative server data (re-fetched on re-entry / foreground).
  // The set id is always adopted so saves target the right row; values are
  // only adopted while the user hasn't edited this row, so in-flight input
  // is never clobbered.
  const syncKey = sync ? `${sync.setId}:${JSON.stringify(sync.value)}` : null;
  useEffect(() => {
    if (!sync) return;
    currentSetId.current = sync.setId;
    if (dirty.current) return;
    const r = sync.value.reps?.toString() ?? "";
    const w = sync.value.weightKg?.toString() ?? "";
    const p = sync.value.rpe?.toString() ?? "";
    if (
      repsRef.current === r &&
      weightRef.current === w &&
      rpeRef.current === p &&
      lastFired.current !== ""
    ) {
      return;
    }
    setReps(r);
    setWeight(w);
    setRpe(p);
    repsRef.current = r;
    weightRef.current = w;
    rpeRef.current = p;
    lastFired.current = JSON.stringify({ reps: r, weight: w, rpe: p });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  // Auto-save prefilled values (last-time suggestion / program target) once
  // after the initial server sync, so they are persisted even if the user
  // never edits the row. Waiting for `ready` avoids creating duplicates when
  // this row was mounted from a stale client router cache that didn't know
  // the set already exists.
  useEffect(() => {
    if (
      !ready ||
      autoSaved.current ||
      disabled ||
      currentSetId.current ||
      setId ||
      !initial ||
      (initial.reps === null && initial.weightKg === null && initial.rpe === null)
    ) {
      return;
    }
    autoSaved.current = true;
    void saveNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Flush pending save on unmount.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const r = repsRef.current;
        const w = weightRef.current;
        const p = rpeRef.current;
        const v: SetRowValue = {
          reps: r ? Number(r) : null,
          weightKg: w ? Number(w) : null,
          rpe: p ? Number(p) : null,
        };
        if (v.reps !== null || v.weightKg !== null || v.rpe !== null) {
          void onSave(v, currentSetId.current);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSaved = saved && !disabled;

  return (
    <div
      className={cn(
        "grid grid-cols-[28px_1fr_1fr_56px_36px] gap-2 items-center py-2 border-b border-[color:var(--border)] transition",
        showSaved && "opacity-60",
      )}
    >
      <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">#{setIndex + 1}</div>
      <input
        inputMode="decimal"
        placeholder={t("set.kg")}
        value={weight}
        onChange={(e) => {
          setWeight(e.target.value);
          weightRef.current = e.target.value;
          dirty.current = true;
          scheduleSave();
        }}
        disabled={disabled}
        className="w-full min-w-0 bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <input
        inputMode="numeric"
        placeholder={t("set.reps")}
        value={reps}
        onChange={(e) => {
          setReps(e.target.value);
          repsRef.current = e.target.value;
          dirty.current = true;
          scheduleSave();
        }}
        disabled={disabled}
        className="w-full min-w-0 bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <input
        inputMode="numeric"
        placeholder={t("set.rpe")}
        value={rpe}
        onChange={(e) => {
          setRpe(e.target.value);
          rpeRef.current = e.target.value;
          dirty.current = true;
          scheduleSave();
        }}
        disabled={disabled}
        className="w-full min-w-0 bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-base text-[color:var(--text-secondary)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <div className="flex items-center justify-center min-h-[36px] text-[color:var(--text-secondary)]">
        {showSaved ? (
          <span className="font-mono text-[11px] text-[color:var(--success)]">✓</span>
        ) : (
          <span className="font-mono text-[11px] text-[color:var(--text-disabled)] opacity-0">·</span>
        )}
      </div>
    </div>
  );
}
