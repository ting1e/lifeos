"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { projectWeight, weeksToTarget } from "@/lib/nutrition/projection";
import type { Activity, Sex } from "@/lib/nutrition";
import { useT } from "@/lib/i18n/client";

type Props = {
  sex: Sex;
  heightCm: number;
  age: number;
  activity: Activity;
  startWeightKg: number;
  dailyKcalIntake: number;
  goalWeightKg?: number | null;
};

const HORIZONS = [
  { label: "8W", weeks: 8 },
  { label: "26W", weeks: 26 },
  { label: "52W", weeks: 52 },
];

export function WeightProjection(props: Props) {
  const [weeks, setWeeks] = useState(8);
  const t = useT();

  const ok =
    props.heightCm > 0 &&
    props.age > 0 &&
    props.startWeightKg > 0 &&
    props.dailyKcalIntake > 0;

  const points = useMemo(() => {
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

  const end = points[points.length - 1];
  const delta = end.weightKg - points[0].weightKg;
  const direction = delta < 0 ? "down" : delta > 0 ? "up" : "flat";
  const chartData = points.map((p) => ({
    label: p.week === 0 ? t("proj.now") : `W${p.week}`,
    weight: p.weightKg,
  }));

  const targetWeeks =
    props.goalWeightKg && props.goalWeightKg > 0
      ? weeksToTarget(points, props.goalWeightKg)
      : null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardLabel className="flex items-center gap-1.5 mb-0">
          {direction === "down" ? (
            <TrendingDown size={12} strokeWidth={1.75} />
          ) : (
            <TrendingUp size={12} strokeWidth={1.75} />
          )}
          {t("proj.title")} · {props.dailyKcalIntake} {t("proj.kcalPerDay")}
        </CardLabel>
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

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {t("proj.now")}
          </div>
          <div className="font-display text-3xl">{points[0].weightKg.toFixed(1)}</div>
          <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">kg</div>
        </div>
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {t("proj.inWeeks", { weeks })}
          </div>
          <div className="font-display text-3xl">{end.weightKg.toFixed(1)}</div>
          <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} kg
          </div>
        </div>
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {t("proj.deficit")}
          </div>
          <div className="font-display text-3xl">
            {Math.round(points[0].dailyDeficitKcal)}
          </div>
          <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
            {t("proj.deficitUnit")}
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
    </Card>
  );
}
