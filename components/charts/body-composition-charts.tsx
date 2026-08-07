"use client";

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

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function BodyCompositionCharts({ samples }: { samples: BodySample[] }) {
  const t = useT();

  const weightMinByDay = new Map<string, number>();
  const weightMaxByDay = new Map<string, number>();
  for (const b of samples) {
    if (b.weightKg == null) continue;
    const k = dayKey(b.recordedAt);
    const w = Number(b.weightKg);
    weightMinByDay.set(k, Math.min(weightMinByDay.get(k) ?? Infinity, w));
    weightMaxByDay.set(k, Math.max(weightMaxByDay.get(k) ?? -Infinity, w));
  }
  const weightSeries = Array.from(weightMinByDay.keys())
    .sort()
    .map((date) => ({
      date,
      weight: weightMinByDay.get(date)!,
      maxWeight: weightMaxByDay.get(date)!,
    }));

  const bodyFatByDay = new Map<string, number>();
  for (const b of samples) {
    if (b.bodyFatPct == null) continue;
    const k = dayKey(b.recordedAt);
    const f = Number(b.bodyFatPct);
    bodyFatByDay.set(k, Math.min(bodyFatByDay.get(k) ?? Infinity, f));
  }
  const bodyFatSeries = Array.from(bodyFatByDay.entries())
    .sort()
    .map(([date, bodyFat]) => ({ date, bodyFat }));

  const muscleByDay = new Map<string, number>();
  for (const b of samples) {
    if (b.muscleMassKg == null) continue;
    const k = dayKey(b.recordedAt);
    const m = Number(b.muscleMassKg);
    muscleByDay.set(k, Math.max(muscleByDay.get(k) ?? -Infinity, m));
  }
  const muscleSeries = Array.from(muscleByDay.entries())
    .sort()
    .map(([date, muscle]) => ({ date, muscle }));

  const leanByDay = new Map<string, number>();
  for (const b of samples) {
    if (b.leanBodyMassKg == null) continue;
    const k = dayKey(b.recordedAt);
    const l = Number(b.leanBodyMassKg);
    leanByDay.set(k, Math.max(leanByDay.get(k) ?? -Infinity, l));
  }
  const leanSeries = Array.from(leanByDay.entries())
    .sort()
    .map(([date, lean]) => ({ date, lean }));

  const noData = (
    <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
      {t("anal.noData")}
    </div>
  );

  return (
    <>
      <Card>
        <CardLabel>{t("anal.weight")}</CardLabel>
        {weightSeries.length > 0 ? (
          <LineChart data={weightSeries} xKey="date" yKey="weight" secondaryKey="maxWeight" />
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
