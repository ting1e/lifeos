"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/client";

type Value = number | "all";

export function DayRangeSelector({
  value,
  onChange,
  options,
  label,
}: {
  value: Value;
  onChange: (value: Value) => void;
  options: { value: Value; label: string }[];
  label: string;
}) {
  const t = useT();
  const inputId = useId();
  const errorId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const custom = !options.some((option) => option.value === value);
  const buttonClass = (active: boolean) =>
    `font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
      active
        ? "border-[color:var(--text-display)] text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
        : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]"
    }`;

  function apply() {
    const days = Number(draft);
    if (!/^\d+$/.test(draft) || !Number.isInteger(days) || days < 1 || days > 3650) {
      setError(true);
      return;
    }
    onChange(days);
    setEditing(false);
    setError(false);
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1 min-w-0">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={buttonClass(value === option.value)}
          onClick={() => {
            onChange(option.value);
            setEditing(false);
            setError(false);
          }}
        >
          {option.label}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={custom}
        aria-expanded={editing}
        className={buttonClass(custom)}
        onClick={() => {
          setDraft(typeof value === "number" && value > 0 ? String(value) : "30");
          setError(false);
          setEditing(!editing);
        }}
      >
        {t("range.custom")}
        {custom && typeof value === "number" ? ` · ${t("proj.days", { days: value })}` : ""}
      </button>
      {editing && (
        <>
          <label htmlFor={inputId} className="sr-only">{label} · {t("range.days")}</label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            step={1}
            value={draft}
            autoFocus
            aria-invalid={error}
            aria-describedby={error ? errorId : undefined}
            className="w-20 min-w-0 border border-[color:var(--border-visible)] bg-[color:var(--surface)] px-2 py-1 font-mono text-[12px]"
            onChange={(event) => { setDraft(event.target.value); setError(false); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); apply(); }
              if (event.key === "Escape") setEditing(false);
            }}
          />
          <button type="button" className={buttonClass(false)} onClick={apply}>
            {t("range.apply")}
          </button>
          {error && <span id={errorId} role="alert" className="w-full text-xs text-[color:var(--accent)]">{t("range.invalid")}</span>}
        </>
      )}
    </div>
  );
}
