"use client";

import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { WeeklyInsights } from "./weekly-insights";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AnalysisPage() {
  const t = useT();
  const { state } = useDemoStore();
  const since90 = new Date(Date.now() - 90 * 86_400_000);
  const since14 = new Date(Date.now() - 14 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  // Weight series 90d
  const bm = state.bodyMetrics
    .filter((b) => new Date(b.recordedAt) >= since90)
    .sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
  const weightSeries = bm
    .filter((b) => b.weightKg != null)
    .map((b) => ({ date: dayKey(new Date(b.recordedAt)), weight: Number(b.weightKg) }));

  // Kcal per day, last 14
  const fe = state.foodEntries.filter(
    (e) => new Date(e.consumedAt) >= since14,
  );
  const kcalByDay = new Map<string, number>();
  for (const e of fe) {
    const k = dayKey(new Date(e.consumedAt));
    kcalByDay.set(k, (kcalByDay.get(k) ?? 0) + Number(e.kcal ?? 0));
  }
  const kcalSeries = Array.from(kcalByDay.entries())
    .sort()
    .map(([date, kcal]) => ({ date, kcal: Math.round(kcal) }));

  // Workout volume per body part last 30
  const ws = state.workouts.filter(
    (w) => new Date(w.startedAt) >= since30,
  );
  const wsIds = ws.map((w) => w.id);
  let volumeByMuscle: Array<{ muscle: string; volume: number }> = [];
  if (wsIds.length > 0) {
    const filtered = state.workoutSets.filter((s) => wsIds.includes(s.workoutId));
    const map = new Map<string, number>();
    for (const s of filtered) {
      const vol = (s.reps ?? 0) * Number(s.weightKg ?? 0);
      map.set("total", (map.get("total") ?? 0) + vol);
    }
    volumeByMuscle = Array.from(map.entries()).map(([muscle, volume]) => ({ muscle, volume }));
  }

  // Recovery last 30
  const recs = state.whoopRecovery
    .filter((r) => r.date >= dayKey(since30))
    .sort((a, b) => a.date.localeCompare(b.date));
  const recSeries = recs.map((r) => ({ date: r.date, score: r.score ?? 0 }));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("anal.trendsInsights")}</div>
        <h1 className="font-display text-5xl mt-1">{t("anal.title")}</h1>
      </header>

      <WeeklyInsights />

      <Card>
        <CardLabel>{t("anal.weight90d")}</CardLabel>
        {weightSeries.length > 0 ? (
          <LineChart data={weightSeries} xKey="date" yKey="weight" />
        ) : (
          <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">{t("anal.noData")}</div>
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.kcal14d")}</CardLabel>
        {kcalSeries.length > 0 ? (
          <BarChart data={kcalSeries} xKey="date" yKey="kcal" />
        ) : (
          <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">{t("anal.noData")}</div>
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.recovery30d")}</CardLabel>
        {recSeries.length > 0 ? (
          <LineChart data={recSeries} xKey="date" yKey="score" color="var(--success)" />
        ) : (
          <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">
            {t("anal.noWhoopRecoveryData")}
          </div>
        )}
      </Card>

      <Card>
        <CardLabel>{t("anal.workoutVolume30d")}</CardLabel>
        {volumeByMuscle.length > 0 ? (
          <BarChart data={volumeByMuscle} xKey="muscle" yKey="volume" />
        ) : (
          <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">{t("anal.noWorkouts")}</div>
        )}
      </Card>
    </div>
  );
}
