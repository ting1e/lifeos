"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { DayBars, type DayPoint } from "@/components/nothing/day-bars";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDayRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    out.push(dayKey(d));
  }
  return out;
}

function fillSeries(
  range: string[],
  byDate: Map<string, number>,
): DayPoint[] {
  return range.map((date) => ({ date, value: byDate.get(date) ?? null }));
}

function avg(values: (number | null)[]): number | null {
  const real = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

export function WhoopHistory({ days = 30 }: { days?: number }) {
  const { state } = useDemoStore();
  const range = buildDayRange(days);
  const since = new Date(Date.now() - days * 86_400_000);

  const recRows = state.whoopRecovery.filter((r) => r.date >= range[0]);
  const sleepRows = state.whoopSleep.filter((s) => new Date(s.start) >= since);
  const strainRows = state.whoopStrain.filter((s) => s.date >= range[0]);
  const wkRows = state.whoopWorkouts.filter(
    (w) => new Date(w.start) >= since,
  );

  if (
    recRows.length === 0 &&
    sleepRows.length === 0 &&
    strainRows.length === 0 &&
    wkRows.length === 0
  ) {
    return (
      <Card>
        <CardLabel>HISTORY · {days}D</CardLabel>
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em] mt-2">
          → no historical data yet. run a deep sync to backfill.
        </div>
      </Card>
    );
  }

  const recoveryByDate = new Map<string, number>();
  for (const r of recRows) if (r.score != null) recoveryByDate.set(r.date, r.score);

  const strainByDate = new Map<string, number>();
  for (const s of strainRows) {
    if (s.score != null) strainByDate.set(s.date, Number(s.score));
  }

  const sleepByDate = new Map<string, number>();
  for (const s of sleepRows) {
    const hours =
      (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000;
    const dk = dayKey(new Date(s.start));
    const existing = sleepByDate.get(dk);
    if (existing == null || hours > existing) sleepByDate.set(dk, hours);
  }

  const workoutsByDate = new Map<string, number>();
  for (const w of wkRows) {
    const dk = dayKey(new Date(w.start));
    workoutsByDate.set(dk, (workoutsByDate.get(dk) ?? 0) + 1);
  }

  const recoverySeries = fillSeries(range, recoveryByDate);
  const sleepSeries = fillSeries(range, sleepByDate);
  const strainSeries = fillSeries(range, strainByDate);
  const workoutSeries = fillSeries(range, workoutsByDate);

  const recoveryAvg = avg(recoverySeries.map((d) => d.value));
  const sleepAvg = avg(sleepSeries.map((d) => d.value));
  const strainAvg = avg(strainSeries.map((d) => d.value));
  const workoutTotal = workoutSeries.reduce(
    (a, d) => a + (d.value ?? 0),
    0,
  );

  return (
    <Card className="space-y-6">
      <div className="flex items-baseline justify-between">
        <CardLabel>HISTORY · {days}D</CardLabel>
        <div className="font-mono text-[12px] tracking-[0.08em] text-[color:var(--text-disabled)] uppercase">
          {range[0]} → {range[range.length - 1]}
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
        <MonoStat
          label="AVG RECOVERY"
          value={recoveryAvg != null ? recoveryAvg.toFixed(0) : "—"}
          unit="%"
        />
        <MonoStat
          label="AVG SLEEP"
          value={sleepAvg != null ? sleepAvg.toFixed(1) : "—"}
          unit="h"
        />
        <MonoStat
          label="AVG STRAIN"
          value={strainAvg != null ? strainAvg.toFixed(1) : "—"}
        />
        <MonoStat label="WORKOUTS" value={workoutTotal} />
      </section>

      <section className="space-y-5">
        <div>
          <div className="mono-label mb-2">RECOVERY · DAILY</div>
          <DayBars days={recoverySeries} max={100} mode="score" unit="%" />
        </div>
        <div>
          <div className="mono-label mb-2">SLEEP · DAILY HOURS</div>
          <DayBars days={sleepSeries} max={10} mode="value" unit="h" />
        </div>
        <div>
          <div className="mono-label mb-2">STRAIN · DAILY</div>
          <DayBars days={strainSeries} max={21} mode="value" />
        </div>
        <div>
          <div className="mono-label mb-2">WORKOUTS · COUNT</div>
          <DayBars days={workoutSeries} max={4} mode="value" />
        </div>
      </section>
    </Card>
  );
}
