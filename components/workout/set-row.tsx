"use client";

import { useState } from "react";
import { Check } from "lucide-react";
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
  lastTime,
  onComplete,
  disabled,
}: {
  setIndex: number;
  initial?: SetRowValue;
  lastTime?: { reps: number; weightKg: number } | null;
  onComplete: (v: SetRowValue) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [reps, setReps] = useState<string>(initial?.reps?.toString() ?? "");
  const [weight, setWeight] = useState<string>(initial?.weightKg?.toString() ?? "");
  const [rpe, setRpe] = useState<string>(initial?.rpe?.toString() ?? "");
  const [done, setDone] = useState(false);
  const t = useT();

  async function complete() {
    if (disabled || done) return;
    const v: SetRowValue = {
      reps: reps ? Number(reps) : null,
      weightKg: weight ? Number(weight) : null,
      rpe: rpe ? Number(rpe) : null,
    };
    setDone(true);
    await onComplete(v);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[28px_1fr_1fr_56px_44px] gap-2 items-center py-2 border-b border-[color:var(--border)] transition",
        done && "opacity-60",
      )}
    >
      <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">#{setIndex + 1}</div>
      <input
        inputMode="decimal"
        placeholder={lastTime ? lastTime.weightKg.toString() : t("set.kg")}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        disabled={done || disabled}
        className="bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <input
        inputMode="numeric"
        placeholder={lastTime ? lastTime.reps.toString() : t("set.reps")}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        disabled={done || disabled}
        className="bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <input
        inputMode="numeric"
        placeholder={t("set.rpe")}
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        disabled={done || disabled}
        className="bg-transparent border-b border-[color:var(--border-visible)] py-2 px-1 font-mono text-base text-[color:var(--text-secondary)] focus:outline-none focus:border-[color:var(--accent)]"
      />
      <button
        type="button"
        onClick={complete}
        disabled={done || disabled}
        className={cn(
          "min-h-[44px] min-w-[44px] flex items-center justify-center transition",
          done
            ? "bg-[color:var(--success)] text-white"
            : "bg-transparent border border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)]",
        )}
      >
        <Check size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
