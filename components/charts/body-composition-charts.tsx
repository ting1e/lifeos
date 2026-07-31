"use client";

import { useState } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardLabel } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";

export type BodySample = {
  recordedAt: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  muscleMassKg: string | null;
  leanBodyMassKg: string | null;
};

type Range = "30" | "90" | "all";

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function BodyCompositionCharts({ samples }: { samples: BodySample[] }) {
  const t = useT();
  const [range, setRange] = useState<Range>("90");

  const cutoff =
    range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;

  const filtered = samples.filter(
    (s) => new Date(s.recordedAt).getTime() >= cutoff,
  );

  const weightByDay = new Map<string, number>();
  for (const b of filtered) {
    if (b.weightKg == null) continue;
    const k = dayKey(b.recordedAt);
    const w = Number(b.weightKg);
    weightByDay.set(k, Math.min(weightByDay.get(k) ?? Infinity, w));
  }
  const weightSeries = Array.from(weightByDay.entries())
    .sort()
    .map(([date, weight]) => ({ date, weight }));

  const bodyFatByDay = new Map<string, number>();
  for (const b of filtered) {
    if (b.bodyFatPct == null) continue;
    const k = dayKey(b.recordedAt);
    const f = Number(b.bodyFatPct);
    bodyFatByDay.set(k, Math.min(bodyFatByDay.get(k) ?? Infinity, f));
  }
  const bodyFatSeries = Array.from(bodyFatByDay.entries())
    .sort()
    .map(([date, bodyFat]) => ({ date, bodyFat }));

  const muscleByDay = new Map<string, number>();
  for (const b of filtered) {
    if (b.muscleMassKg == null) continue;
    const k = dayKey(b.recordedAt);
    const m = Number(b.muscleMassKg);
    muscleByDay.set(k, Math.max(muscleByDay.get(k) ?? -Infinity, m));
  }
  const muscleSeries = Array.from(muscleByDay.entries())
    .sort()
    .map(([date, muscle]) => ({ date, muscle }));

  const leanByDay = new Map<string, number>();
  for (const b of filtered) {
    if (b.leanBodyMassKg == null) continue;
    const k = dayKey(b.recordedAt);
    const l = Number(b.leanBodyMassKg);
    leanByDay.set(k, Math.max(leanByDay.get(k) ?? -Infinity, l));
  }
  const leanSeries = Array.from(leanByDay.entries())
    .sort()
    .map(([date, lean]) => ({ date, lean }));

  const ranges: Array<{ key: Range; label: string }> = [
    { key: "30", label: t("anal.range30") },
    { key: "90", label: t("anal.range90") },
    { key: "all", label: t("anal.rangeAll") },
  ];

  const noData = (
    <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
      {t("anal.noData")}
    </div>
  );

  return (
    <>
      <div className="flex gap-2">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`font-mono text-[13px] uppercase tracking-[0.1em] px-3 py-1.5 border ${
              range === r.key
                ? "border-[color:var(--text-display)] text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
                : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card>
        <CardLabel>{t("anal.weight")}</CardLabel>
        {weightSeries.length > 0 ? (
          <LineChart data={weightSeries} xKey="date" yKey="weight" />
        ) : (
          noData
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.bodyFat")}</CardLabel>
        {bodyFatSeries.length > 0 ? (
          <LineChart
            data={bodyFatSeries}
            xKey="date"
            yKey="bodyFat"
            color="var(--accent)"
          />
        ) : (
          noData
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.leanBodyMass")}</CardLabel>
        {leanSeries.length > 0 ? (
          <LineChart
            data={leanSeries}
            xKey="date"
            yKey="lean"
            color="var(--text-display)"
          />
        ) : (
          noData
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.muscleMass")}</CardLabel>
        {muscleSeries.length > 0 ? (
          <LineChart
            data={muscleSeries}
            xKey="date"
            yKey="muscle"
            color="var(--success)"
          />
        ) : (
          noData
        )}
      </Card>
    </>
  );
}
