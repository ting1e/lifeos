"use client";

import { useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import {
  BodyCompositionCharts,
  type BodySample,
} from "@/components/charts/body-composition-charts";
import { Card, CardLabel } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";
import { ymdLocal, todayKey } from "@/lib/utils/day";

type Range = "7" | "15" | "30" | "90" | "all";

type DayKcal = { date: string; kcal: number };
type DayVolume = { date: string; volume: number };
type RecSample = { date: string; score: number };

export function AnalysisCharts({
  bmSamples,
  kcalByDay,
  volumeByDay,
  recSamples,
  whoopEnabled,
  kcalTarget,
}: {
  bmSamples: BodySample[];
  kcalByDay: DayKcal[];
  volumeByDay: DayVolume[];
  recSamples: RecSample[];
  whoopEnabled: boolean;
  kcalTarget: number;
}) {
  const t = useT();
  const [range, setRange] = useState<Range>("30");

  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
  const inRange = (dateStr: string) => new Date(dateStr).getTime() >= cutoff;

  const filteredBm = bmSamples.filter((s) => inRange(s.recordedAt));
  const kcalSeries = kcalByDay.filter((d) => inRange(d.date));

  const volumeSeries = volumeByDay.filter((d) => inRange(d.date));

  const volMap = new Map(volumeSeries.map((d) => [d.date, d.volume]));
  const today = todayKey();
  const fillStart = range === "all"
    ? (volumeByDay[0]?.date ?? today)
    : ymdLocal(new Date(cutoff));
  const filledVolumeSeries: DayVolume[] = [];
  {
    const iter = new Date(fillStart + "T00:00:00");
    const end = new Date(today + "T00:00:00");
    while (iter.getTime() <= end.getTime()) {
      const ds = ymdLocal(iter);
      filledVolumeSeries.push({ date: ds, volume: volMap.get(ds) ?? 0 });
      iter.setDate(iter.getDate() + 1);
    }
  }

  const recSeries = recSamples.filter((d) => inRange(d.date));

  const ranges: Array<{ key: Range; label: string }> = [
    { key: "7", label: t("anal.range7") },
    { key: "15", label: t("anal.range15") },
    { key: "30", label: t("anal.range30") },
    { key: "90", label: t("anal.range90") },
    { key: "all", label: t("anal.rangeAll") },
  ];
  const activeRangeLabel = ranges.find((r) => r.key === range)!.label;

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

      <BodyCompositionCharts samples={filteredBm} />

      <Card>
        <CardLabel>{t("anal.kcal")}</CardLabel>
        {kcalSeries.length > 0 ? (
          <BarChart
            data={kcalSeries}
            xKey="date"
            yKey="kcal"
            referenceLine={kcalTarget}
          />
        ) : (
          noData
        )}
      </Card>

      {whoopEnabled && (
        <Card>
          <CardLabel>{`${t("anal.recovery")} · ${activeRangeLabel}`}</CardLabel>
          {recSeries.length > 0 ? (
            <LineChart
              data={recSeries}
              xKey="date"
              yKey="score"
              color="var(--success)"
            />
          ) : (
            <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
              {t("anal.noWhoopRecoveryData")}
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardLabel>{t("anal.workoutVolume")}</CardLabel>
        {volumeByDay.length > 0 ? (
          <BarChart data={filledVolumeSeries} xKey="date" yKey="volume" />
        ) : (
          <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
            {t("anal.noWorkouts")}
          </div>
        )}
      </Card>
    </>
  );
}
