import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MonoStat({
  label,
  value,
  unit,
  className,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
  accent?: boolean;
  /**
   * Optional leading glyph rendered next to the label. Sized to match the
   * mono-label line-height (12px). Pass a lucide icon directly.
   */
  icon?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="mono-label flex items-center gap-1.5">
        {icon && (
          <span
            className="inline-flex items-center justify-center text-[color:var(--text-secondary)]"
            aria-hidden
          >
            {icon}
          </span>
        )}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div
          className={cn(
            "font-mono text-3xl md:text-4xl tabular-nums leading-none",
            accent ? "text-[color:var(--accent)]" : "text-[color:var(--text-display)]",
          )}
        >
          {value}
        </div>
        {unit && (
          <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]">
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}
