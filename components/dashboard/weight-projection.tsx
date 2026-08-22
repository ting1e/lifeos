"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import {
  projectWeight,
  projectWeightByTrend,
  daysToTarget,
  type ProjectionPoint,
} from "@/lib/nutrition/projection";
import type { Activity, Sex } from "@/lib/nutrition";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";
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

// 0 = projection from today only (original behavior); N = history window of
// the last N days with the projection anchored at its earliest record.
type RangeKey = 0 | 7 | 15 | 30 | 90;

// Future projection horizon in days (counted from today, not from the anchor).
const HORIZONS = [30, 60, 120, 240];

const RANGES: Array<{ key: RangeKey; labelKey: DictKey }> = [
  { key: 0, labelKey: "common.today" },
  { key: 7, labelKey: "anal.range7" },
  { key: 15, labelKey: "anal.range15" },
  { key: 30, labelKey: "anal.range30" },
  { key: 90, labelKey: "anal.range90" },
];

function dailyMinMap(samples: { date: string; weightKg: number }[]) {
  const dailyMin = new Map<string, number>();
  for (const s of samples) {
    dailyMin.set(s.date, Math.min(dailyMin.get(s.date) ?? Infinity, s.weightKg));
  }
  return dailyMin;
}

// Linear regression over the last `backDays + 1` calendar days (inclusive),
// returned as a weekly rate. Same method the original 14-day trend used
// (backDays = 13 covers the 14-day window ending today).
function calcTrend(
  samples: { date: string; weightKg: number }[] | undefined,
  backDays: number,
) {
  if (!samples || samples.length === 0) return null;

  const dailyMin = dailyMinMap(samples);
  const today = todayKey();
  const todayDate = new Date(today + "T00:00:00");

  const regPoints: { x: number; y: number }[] = [];
  for (let i = backDays; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const ds = ymdLocal(d);
    const w = dailyMin.get(ds);
    if (w != null) {
      regPoints.push({ x: backDays - i, y: w });
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

function shortDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// Weight at a day offset from the projection anchor (points are daily; the
// safety stop can shorten the array, so clamp the index).
function weightAtDay(points: ProjectionPoint[], day: number): number {
  return points[Math.min(day, points.length - 1)].weightKg;
}

export function WeightProjection(props: Props) {
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState<Mode>("intake");
  const [range, setRange] = useState<RangeKey>(0);
  const t = useT();

  const ok =
    props.heightCm > 0 &&
    props.age > 0 &&
    props.startWeightKg > 0 &&
    props.dailyKcalIntake > 0;

  // "Today" mode keeps the original 14-day regression window.
  const trendToday = useMemo(() => calcTrend(props.weightSamples, 13), [props.weightSamples]);

  // Range mode: daily-min history inside [today - range, today]; the earliest
  // record in the window anchors both history and projection.
  const history = useMemo(() => {
    if (range === 0 || !props.weightSamples || props.weightSamples.length === 0) return null;
    const today = todayKey();
    const todayDate = new Date(today + "T00:00:00");
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - range);
    const startKey = ymdLocal(startDate);

    const dailyMin = new Map<string, number>();
    for (const s of props.weightSamples) {
      if (s.date < startKey || s.date > today) continue;
      dailyMin.set(s.date, Math.min(dailyMin.get(s.date) ?? Infinity, s.weightKg));
    }
    if (dailyMin.size === 0) return null;

    const anchorDate = Array.from(dailyMin.keys()).sort()[0];
    const anchorStart = new Date(anchorDate + "T00:00:00");
    const anchorToToday = Math.round(
      (todayDate.getTime() - anchorStart.getTime()) / 86_400_000,
    );
    return {
      dailyMin,
      anchorDate,
      anchorWeight: dailyMin.get(anchorDate)!,
      anchorToToday,
    };
  }, [range, props.weightSamples]);

  // No records in the selected window -> fall back to today mode.
  const activeRange: RangeKey = range !== 0 && history ? range : 0;

  const trendWindow = useMemo(
    () => (activeRange !== 0 ? calcTrend(props.weightSamples, activeRange) : null),
    [activeRange, props.weightSamples],
  );

  const anchorStart = useMemo(
    () => (history ? new Date(history.anchorDate + "T00:00:00") : null),
    [history],
  );

  // Total projection length: history (anchor -> today) + future horizon. The
  // horizon counts from today, not from the anchor.
  const projectionDays = (history?.anchorToToday ?? 0) + days;

  const intakePoints = useMemo(() => {
    if (!ok) return [];
    if (activeRange === 0 || !history || !anchorStart) {
      return projectWeight({
        sex: props.sex,
        heightCm: props.heightCm,
        age: props.age,
        activity: props.activity,
        startWeightKg: props.startWeightKg,
        dailyKcalIntake: props.dailyKcalIntake,
        days: projectionDays,
      });
    }
    return projectWeight({
      sex: props.sex,
      heightCm: props.heightCm,
      age: props.age,
      activity: props.activity,
      startWeightKg: history.anchorWeight,
      dailyKcalIntake: props.dailyKcalIntake,
      days: projectionDays,
      startDate: anchorStart,
    });
  }, [
    ok,
    props.sex,
    props.heightCm,
    props.age,
    props.activity,
    props.startWeightKg,
    props.dailyKcalIntake,
    projectionDays,
    activeRange,
    history,
    anchorStart,
  ]);

  const trendPoints = useMemo(() => {
    if (activeRange === 0) {
      if (!trendToday) return [];
      return projectWeightByTrend(props.startWeightKg, trendToday.weeklyRate, projectionDays);
    }
    if (!trendWindow || !history || !anchorStart) return [];
    return projectWeightByTrend(
      history.anchorWeight,
      trendWindow.weeklyRate,
      projectionDays,
      anchorStart,
    );
  }, [
    activeRange,
    trendToday,
    trendWindow,
    history,
    anchorStart,
    props.startWeightKg,
    projectionDays,
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

  const rate = activeRange === 0 ? trendToday : trendWindow;
  const showTrendError = mode === "trend" && !rate;
  const points = mode === "intake" ? intakePoints : trendPoints;
  const hasData = points.length > 0;

  // One row per day from the anchor (today, or the earliest record of the
  // selected window) to today + days, so the future horizon always shows the
  // full 30/60/120 days beyond today. Range mode overlays the actual weight
  // history (null on days without a record) with the projection; today mode
  // renders the projection alone.
  const rows: Array<Record<string, string | number | null>> = [];
  if (hasData) {
    const anchor = anchorStart ?? new Date(todayKey() + "T00:00:00");
    const gridEnd = new Date(todayKey() + "T00:00:00");
    gridEnd.setDate(gridEnd.getDate() + days);
    const iter = new Date(anchor);
    let day = 0;
    while (iter.getTime() <= gridEnd.getTime()) {
      const ds = ymdLocal(iter);
      rows.push({
        label: shortDateLabel(ds),
        weight:
          activeRange !== 0 && history ? (history.dailyMin.get(ds) ?? null) : null,
        projected: weightAtDay(points, day),
      });
      iter.setDate(iter.getDate() + 1);
      day++;
    }
  }

  // End of the future horizon, counted from today.
  const anchorToToday = history?.anchorToToday ?? 0;
  const endWeight = hasData ? weightAtDay(points, anchorToToday + days) : null;
  const startWeight = points[0]?.weightKg ?? 0;
  const delta = endWeight != null ? endWeight - startWeight : 0;
  const direction: "down" | "up" | "flat" =
    mode === "trend"
      ? (rate?.weeklyRate ?? 0) < 0
        ? "down"
        : (rate?.weeklyRate ?? 0) > 0
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
      : rate
        ? `${rate.weeklyRate >= 0 ? "+" : ""}${rate.weeklyRate.toFixed(1)} ${t("proj.perWeek")}`
        : "";

  const directionColor =
    direction === "down"
      ? "var(--success)"
      : direction === "up"
        ? "var(--warning)"
        : "var(--text-display)";

  // Target crossing day, expressed relative to today (<= 0 means the
  // projection crossed it within the historical window).
  const targetCross =
    props.goalWeightKg && props.goalWeightKg > 0 && hasData
      ? daysToTarget(points, props.goalWeightKg)
      : null;
  const targetDays = targetCross != null ? targetCross - anchorToToday : null;

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

  const rangeBtn = (r: RangeKey, label: string) => (
    <button
      type="button"
      onClick={() => setRange(r)}
      className={`font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
        range === r
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
        <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] min-w-16">
              {t("proj.history")}
            </span>
            {RANGES.map((r) => (
              <span key={r.key}>{rangeBtn(r.key, t(r.labelKey))}</span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] min-w-16">
              {t("proj.future")}
            </span>
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setDays(h)}
                className={`font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
                  days === h
                    ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
                    : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)]"
                }`}
              >
                {t("proj.days", { days: h })}
              </button>
            ))}
          </div>
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
                {activeRange !== 0 ? t("proj.start") : t("proj.now")}
              </div>
              <div className="font-display text-3xl">{startWeight.toFixed(1)}</div>
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
                {activeRange !== 0 && history ? `${shortDateLabel(history.anchorDate)} · ` : ""}kg
              </div>
            </div>
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                {t("proj.inDays", { days })}
              </div>
              <div className="font-display text-3xl">{endWeight?.toFixed(1) ?? "-"}</div>
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
                  : `${(rate?.weeklyRate ?? 0) >= 0 ? "+" : ""}${(rate?.weeklyRate ?? 0).toFixed(1)}`}
              </div>
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)]">
                {mode === "intake" ? t("proj.deficitUnit") : t("proj.perWeek")}
              </div>
            </div>
          </div>

          {activeRange !== 0 && history ? (
            <LineChart
              data={rows}
              xKey="label"
              yKey="weight"
              secondaryKey="projected"
              height={180}
              color="var(--text-display)"
              secondaryColor={directionColor}
              connectNulls
            />
          ) : (
            <LineChart
              data={rows}
              xKey="label"
              yKey="projected"
              height={180}
              color={directionColor}
            />
          )}

          {targetDays != null && targetDays > 0 && props.goalWeightKg && (
            <div className="mt-3 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--accent)] border-t border-[color:var(--border)] pt-3">
              <Target size={12} strokeWidth={1.75} />
              {t("proj.targetReached", {
                kg: props.goalWeightKg.toFixed(1),
                day: targetDays,
              })}
            </div>
          )}
          {targetDays != null && targetDays <= 0 && props.goalWeightKg && (
            <div className="mt-3 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--accent)] border-t border-[color:var(--border)] pt-3">
              <Target size={12} strokeWidth={1.75} />
              {t("proj.targetReachedAlready", { kg: props.goalWeightKg.toFixed(1) })}
            </div>
          )}
          {targetDays == null && props.goalWeightKg && props.goalWeightKg > 0 && (
            <div className="mt-3 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] border-t border-[color:var(--border)] pt-3">
              {t("proj.targetNotReached", { kg: props.goalWeightKg.toFixed(1), days })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
