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
import { DayRangeSelector } from "@/components/ui/day-range-selector";

type Range = number | "all";

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
  const [range, setRange] = useState<Range>(30);

  const today = todayKey();
  const start = new Date(today + "T00:00:00");
  if (range !== "all") start.setDate(start.getDate() - range + 1);
  const cutoff = ymdLocal(start);
  const inRange = (dateStr: string) =>
    (range === "all" || dateStr >= cutoff) && dateStr <= today;

  const filteredBm = bmSamples.filter((s) => inRange(s.recordedAt));
  const kcalSeries = kcalByDay.filter((d) => inRange(d.date));

  const volumeSeries = volumeByDay.filter((d) => inRange(d.date));

  const volMap = new Map(volumeSeries.map((d) => [d.date, d.volume]));
  const fillStart = range === "all"
    ? (volumeByDay[0]?.date ?? today)
    : cutoff;
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

  const ranges: Array<{ value: Range; label: string }> = [
    { value: 7, label: t("anal.range7") },
    { value: 30, label: t("anal.range30") },
    { value: 90, label: t("anal.range90") },
    { value: "all", label: t("anal.rangeAll") },
  ];
  const activeRangeLabel = range === "all" ? t("anal.rangeAll") : t("proj.days", { days: range });

  const noData = (
    <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
      {t("anal.noData")}
    </div>
  );

  return (
    <>
      <DayRangeSelector label={t("anal.title")} value={range} onChange={setRange} options={ranges} />

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
