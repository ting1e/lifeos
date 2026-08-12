"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { projectWeight, projectWeightByTrend, weeksToTarget } from "@/lib/nutrition/projection";
import type { Activity, Sex } from "@/lib/nutrition";
import { useT } from "@/lib/i18n/client";
import { ymdLocal, todayKey } from "@/lib/utils/day";

type Props = {
  sex: Sex;
  heightCm: number;
  age: number;
  activity: Activity;
  startWeightKg: number;
  dailyKcalIntake: number;
  goalWeightKg?: number | null;
  weightSamples?: { date: string; weightKg: number }[];
};

type Mode = "intake" | "trend";

const HORIZONS = [
  { label: "8W", weeks: 8 },
  { label: "16W", weeks: 16 },
  { label: "32W", weeks: 32 },
];

function calcTrend(samples: { date: string; weightKg: number }[] | undefined) {
  if (!samples || samples.length === 0) return null;

  const dailyMin = new Map<string, number>();
  for (const s of samples) {
    dailyMin.set(s.date, Math.min(dailyMin.get(s.date) ?? Infinity, s.weightKg));
  }

  const today = todayKey();
  const todayDate = new Date(today + "T00:00:00");

  const regPoints: { x: number; y: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const ds = ymdLocal(d);
    const w = dailyMin.get(ds);
    if (w != null) {
      regPoints.push({ x: 13 - i, y: w });
    }
  }

  if (regPoints.length < 2) return null;

  const n = regPoints.length;
  const xMean = regPoints.reduce((a, p) => a + p.x, 0) / n;
  const yMean = regPoints.reduce((a, p) => a + p.y, 0) / n;
  const num = regPoints.reduce((a, p) => a + (p.x - xMean) * (p.y - yMean), 0);
  const den = regPoints.reduce((a, p) => a + (p.x - xMean) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;

  return { weeklyRate: slope * 7 };
}

export function WeightProjection(props: Props) {
  const [weeks, setWeeks] = useState(8);
  const [mode, setMode] = useState<Mode>("intake");
  const t = useT();

  const ok =
    props.heightCm > 0 &&
    props.age > 0 &&
    props.startWeightKg > 0 &&
    props.dailyKcalIntake > 0;

  const trend = useMemo(() => calcTrend(props.weightSamples), [props.weightSamples]);

  const intakePoints = useMemo(() => {
    if (!ok) return [];
    return projectWeight({
      sex: props.sex,
      heightCm: props.heightCm,
      age: props.age,
      activity: props.activity,
      startWeightKg: props.startWeightKg,
      dailyKcalIntake: props.dailyKcalIntake,
      weeks,
    });
  }, [
    ok,
    props.sex,
    props.heightCm,
    props.age,
    props.activity,
    props.startWeightKg,
    props.dailyKcalIntake,
    weeks,
  ]);

  const trendPoints = useMemo(() => {
    if (!trend) return [];
    return projectWeightByTrend(props.startWeightKg, trend.weeklyRate, weeks);
  }, [trend, props.startWeightKg, weeks]);

  if (!ok) {
    return (
      <Card>
        <CardLabel className="flex items-center gap-1.5">
          <TrendingDown size={12} strokeWidth={1.75} />
          {t("proj.title")}
        </CardLabel>
        <div className="font-mono text-base text-[color:var(--text-secondary)]">
          {t("proj.needProfile")}
        </div>
      </Card>
    );
  }

  const showTrendError = mode === "trend" && !trend;
  const points = mode === "intake" ? intakePoints : trendPoints;
  const hasData = points.length > 0;

  const end = hasData ? points[points.length - 1] : null;
  const startWeight = points[0]?.weightKg ?? 0;
  const delta = end ? end.weightKg - points[0].weightKg : 0;
  const direction: "down" | "up" | "flat" =
    mode === "trend"
      ? (trend?.weeklyRate ?? 0) < 0
        ? "down"
        : (trend?.weeklyRate ?? 0) > 0
          ? "up"
          : "flat"
      : delta < 0
        ? "down"
        : delta > 0
          ? "up"
          : "flat";

  const infoText =
    mode === "intake"
      ? `${props.dailyKcalIntake} ${t("proj.kcalPerDay")}`
      : trend
        ? `${trend.weeklyRate >= 0 ? "+" : ""}${trend.weeklyRate.toFixed(1)} ${t("proj.perWeek")}`
        : "";

  const chartData = hasData
    ? points.map((p) => ({
        label: p.week === 0 ? t("proj.now") : `W${p.week}`,
        weight: p.weightKg,
      }))
    : [];

  const targetWeeks =
    props.goalWeightKg && props.goalWeightKg > 0 && hasData
      ? weeksToTarget(points, props.goalWeightKg)
      : null;

  const modeBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
        mode === m
          ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
          : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardLabel className="flex items-center gap-1.5 mb-0">
            {direction === "down" ? (
              <TrendingDown size={12} strokeWidth={1.75} />
            ) : (
              <TrendingUp size={12} strokeWidth={1.75} />
            )}
            {t("proj.title")}
          </CardLabel>
          {modeBtn("intake", t("proj.standardIntake"))}
          {modeBtn("trend", t("proj.weeklyTrend"))}
          {infoText && (
            <span className="font-mono text-[12px] text-[color:var(--text-secondary)]">
              · {infoText}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {HORIZONS.map((h) => (
            <button
              key={h.weeks}
              onClick={() => setWeeks(h.weeks)}
              className={`font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
                weeks === h.weeks
                  ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
                  : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)]"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {showTrendError ? (
        <div className="font-mono text-base text-[color:var(--text-secondary)]">
          {t("proj.needMoreData")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                {t("proj.now")}
              </div>
              <div className="font-display text-3xl">{startWeight.toFixed(1)}</div>
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">kg</div>
            </div>
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                {t("proj.inWeeks", { weeks })}
              </div>
              <div className="font-display text-3xl">{end?.weightKg.toFixed(1) ?? "-"}</div>
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)} kg
              </div>
            </div>
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                {mode === "intake" ? t("proj.deficit") : t("proj.perWeek")}
              </div>
              <div className="font-display text-3xl">
                {mode === "intake"
                  ? Math.round(points[0]?.dailyDeficitKcal ?? 0)
                  : `${(trend?.weeklyRate ?? 0) >= 0 ? "+" : ""}${(trend?.weeklyRate ?? 0).toFixed(1)}`}
              </div>
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
                {mode === "intake" ? t("proj.deficitUnit") : t("proj.perWeek")}
              </div>
            </div>
          </div>

          <LineChart
            data={chartData}
            xKey="label"
            yKey="weight"
            height={180}
            color={
              direction === "down"
                ? "var(--success)"
                : direction === "up"
                  ? "var(--warning)"
                  : "var(--text-display)"
            }
          />

          {targetWeeks != null && props.goalWeightKg && (
            <div className="mt-3 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--accent)] border-t border-[color:var(--border)] pt-3">
              <Target size={12} strokeWidth={1.75} />
              {t("proj.targetReached", {
                kg: props.goalWeightKg.toFixed(1),
                week: targetWeeks,
              })}
            </div>
          )}
          {targetWeeks == null && props.goalWeightKg && props.goalWeightKg > 0 && (
            <div className="mt-3 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] border-t border-[color:var(--border)] pt-3">
              {t("proj.targetNotReached", { kg: props.goalWeightKg.toFixed(1), weeks })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
