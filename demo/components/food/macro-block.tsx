import { Droplet, Drumstick, Wheat } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";

type MacroProps = {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  kcalTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
};

// One macro tile: icon + label + big number + target + horizontal progress bar.
function MacroTile({
  label,
  value,
  target,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  target: number | null | undefined;
  unit: string;
  color: string;
  icon: React.ReactNode;
}) {
  const safeTarget = target && target > 0 ? target : null;
  const pct = safeTarget ? Math.min(100, (value / safeTarget) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="mono-label flex items-center gap-1.5">
        <span style={{ color }} aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono text-5xl md:text-6xl leading-none tabular-nums"
          style={{ color }}
        >
          {Math.round(value)}
        </span>
        <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]">
          {unit}
        </span>
        {safeTarget && (
          <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-[color:var(--text-disabled)] ml-auto">
            / {Math.round(safeTarget)}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-[color:var(--border)] overflow-hidden">
        <div
          className="h-full transition-[width]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function MacroBlock({
  protein,
  carbs,
  fat,
  kcal,
  kcalTarget,
  proteinTarget,
  carbsTarget,
  fatTarget,
}: MacroProps) {
  const kcalSafe = kcalTarget && kcalTarget > 0 ? kcalTarget : null;
  const kcalPct = kcalSafe ? Math.min(100, (kcal / kcalSafe) * 100) : 0;
  const overTarget = kcalSafe ? kcal > kcalSafe : false;

  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const totalKcal = Math.max(1, pKcal + cKcal + fKcal);
  const pPct = (pKcal / totalKcal) * 100;
  const cPct = (cKcal / totalKcal) * 100;
  const fPct = (fKcal / totalKcal) * 100;

  const remaining = (val: number, target: number | null | undefined) => {
    if (!target || target <= 0) return null;
    return Math.max(0, Math.round(target - val));
  };
  const pRem = remaining(protein, proteinTarget);
  const cRem = remaining(carbs, carbsTarget);
  const fRem = remaining(fat, fatTarget);
  const kcalRem = remaining(kcal, kcalTarget);

  return (
    <Card className="flex flex-col gap-5 h-full">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <CardLabel className="mb-0">TODAY'S MACROS</CardLabel>
        <div className="font-mono text-[13px] uppercase tracking-[0.08em] tabular-nums">
          <span
            className={
              overTarget
                ? "text-[color:var(--accent)]"
                : "text-[color:var(--text-display)]"
            }
          >
            {Math.round(kcal)}
          </span>
          {kcalSafe && (
            <span className="text-[color:var(--text-secondary)]">
              {" "}
              / {Math.round(kcalSafe)} kcal · {Math.round(kcalPct)}%
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <MacroTile
          label="PROTEIN"
          value={protein}
          target={proteinTarget}
          unit="g"
          color="var(--success)"
          icon={<Drumstick size={14} strokeWidth={1.75} />}
        />
        <MacroTile
          label="CARBS"
          value={carbs}
          target={carbsTarget}
          unit="g"
          color="var(--warning)"
          icon={<Wheat size={14} strokeWidth={1.75} />}
        />
        <MacroTile
          label="FAT"
          value={fat}
          target={fatTarget}
          unit="g"
          color="var(--accent)"
          icon={<Droplet size={14} strokeWidth={1.75} />}
        />
      </div>

      <div className="mt-auto space-y-3 pt-4 border-t border-[color:var(--border)]">
        <div className="mono-label flex items-center justify-between">
          <span>DISTRIBUTION · BY KCAL</span>
          <span className="text-[color:var(--text-disabled)]">
            P {Math.round(pPct)}% · C {Math.round(cPct)}% · F {Math.round(fPct)}%
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden">
          <div style={{ width: `${pPct}%`, background: "var(--success)" }} />
          <div style={{ width: `${cPct}%`, background: "var(--warning)" }} />
          <div style={{ width: `${fPct}%`, background: "var(--accent)" }} />
        </div>

        {(pRem !== null || cRem !== null || fRem !== null || kcalRem !== null) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 font-mono text-[13px] uppercase tracking-[0.08em] tabular-nums">
            <RemainingCell label="KCAL LEFT" value={kcalRem} />
            <RemainingCell label="P LEFT" value={pRem} unit="g" color="var(--success)" />
            <RemainingCell label="C LEFT" value={cRem} unit="g" color="var(--warning)" />
            <RemainingCell label="F LEFT" value={fRem} unit="g" color="var(--accent)" />
          </div>
        )}
      </div>
    </Card>
  );
}

function RemainingCell({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | null;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[color:var(--text-disabled)]">{label}</span>
      <span
        className="text-lg"
        style={{ color: color ?? "var(--text-display)" }}
      >
        {value == null ? "—" : value}
        {unit && value != null ? (
          <span className="text-[12px] text-[color:var(--text-secondary)] ml-1">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}
