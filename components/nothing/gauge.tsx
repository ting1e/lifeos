"use client";

export function Gauge({
  value,
  max = 100,
  size = 140,
  label,
  unit,
  accentByValue = false,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  unit?: string;
  accentByValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = accentByValue
    ? pct < 0.33
      ? "var(--accent)"
      : pct < 0.66
        ? "var(--warning)"
        : "var(--success)"
    : "var(--text-display)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-visible)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-3xl tabular-nums text-[color:var(--text-display)]">
          {Math.round(value)}
        </div>
        {unit && (
          <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)]">
            {unit}
          </div>
        )}
        {label && (
          <div className="mono-label mt-1">{label}</div>
        )}
      </div>
    </div>
  );
}
