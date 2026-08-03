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
  disabled,
  onSave,
  onDelete,
}: {
  setIndex: number;
  initial?: SetRowValue;
  setId?: string;
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
  const t = useT();

  function scheduleSave() {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
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
    }, 600);
  }

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
