import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  whoopRecovery,
  whoopSleep,
  whoopStrain,
  whoopWorkouts,
} from "@/lib/db/schema";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { DayBars, type DayPoint } from "@/components/nothing/day-bars";
import { getLocale, tFor } from "@/lib/i18n/server";
import { ymdLocal } from "@/lib/utils/day";

function buildDayRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    out.push(ymdLocal(d));
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

export async function WhoopHistory({
  userId,
  days = 30,
}: {
  userId: string;
  days?: number;
}) {
  const t = tFor(await getLocale());
  const range = buildDayRange(days);
  const since = new Date(Date.now() - days * 86_400_000);

  const [recRows, sleepRows, strainRows, wkRows] = await Promise.all([
    db
      .select({ date: whoopRecovery.date, score: whoopRecovery.score })
      .from(whoopRecovery)
      .where(
        and(
          eq(whoopRecovery.userId, userId),
          gte(whoopRecovery.date, range[0]),
        ),
      )
      .orderBy(desc(whoopRecovery.date)),
    db
      .select({ start: whoopSleep.start, end: whoopSleep.end })
      .from(whoopSleep)
      .where(and(eq(whoopSleep.userId, userId), gte(whoopSleep.start, since)))
      .orderBy(desc(whoopSleep.start)),
    db
      .select({ date: whoopStrain.date, score: whoopStrain.score })
      .from(whoopStrain)
      .where(
        and(eq(whoopStrain.userId, userId), gte(whoopStrain.date, range[0])),
      )
      .orderBy(desc(whoopStrain.date)),
    db
      .select({ start: whoopWorkouts.start })
      .from(whoopWorkouts)
      .where(
        and(eq(whoopWorkouts.userId, userId), gte(whoopWorkouts.start, since)),
      ),
  ]);

  if (
    recRows.length === 0 &&
    sleepRows.length === 0 &&
    strainRows.length === 0 &&
    wkRows.length === 0
  ) {
    return (
      <Card>
        <CardLabel>{t("whoopHistory.history", { days })}</CardLabel>
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em] mt-2">
          {t("whoopHistory.noData")}
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
    // Multiple sleeps in a day: keep the longest.
    const dk = ymdLocal(new Date(s.start));
    const existing = sleepByDate.get(dk);
    if (existing == null || hours > existing) sleepByDate.set(dk, hours);
  }

  const workoutsByDate = new Map<string, number>();
  for (const w of wkRows) {
    const dk = ymdLocal(new Date(w.start));
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
        <CardLabel>{t("whoopHistory.history", { days })}</CardLabel>
        <div className="font-mono text-[12px] tracking-[0.08em] text-[color:var(--text-disabled)] uppercase">
          {range[0]} → {range[range.length - 1]}
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
        <MonoStat
          label={t("whoopHistory.avgRecovery")}
          value={recoveryAvg != null ? recoveryAvg.toFixed(0) : "—"}
          unit="%"
        />
        <MonoStat
          label={t("whoopHistory.avgSleep")}
          value={sleepAvg != null ? sleepAvg.toFixed(1) : "—"}
          unit="h"
        />
        <MonoStat
          label={t("whoopHistory.avgStrain")}
          value={strainAvg != null ? strainAvg.toFixed(1) : "—"}
        />
        <MonoStat label={t("whoopHistory.workouts")} value={workoutTotal} />
      </section>

      <section className="space-y-5">
        <div>
          <div className="mono-label mb-2">{t("whoopHistory.recoveryDaily")}</div>
          <DayBars days={recoverySeries} max={100} mode="score" unit="%" />
        </div>
        <div>
          <div className="mono-label mb-2">{t("whoopHistory.sleepDaily")}</div>
          <DayBars days={sleepSeries} max={10} mode="value" unit="h" />
        </div>
        <div>
          <div className="mono-label mb-2">{t("whoopHistory.strainDaily")}</div>
          <DayBars days={strainSeries} max={21} mode="value" />
        </div>
        <div>
          <div className="mono-label mb-2">{t("whoopHistory.workoutsCount")}</div>
          <DayBars days={workoutSeries} max={4} mode="value" />
        </div>
      </section>
    </Card>
  );
}
