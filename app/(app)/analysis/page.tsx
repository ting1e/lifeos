import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  foodEntries,
  profile,
  whoopRecovery,
  workouts,
  workoutSets,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { AnalysisCharts } from "@/components/charts/analysis-charts";
import { WeeklyInsights } from "./weekly-insights";
import { getKcalTargetsForUser } from "@/lib/nutrition/targets";
import { ymdLocal } from "@/lib/utils/day";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const [prof] = await db
    .select({ whoopEnabled: profile.whoopEnabled })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);
  const whoopEnabled = prof?.whoopEnabled ?? true;

  // kcal target (same logic as dashboard)
  const { kcalTarget } = await getKcalTargetsForUser(user.id);

  // Body metrics (all time)
  const bm = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, user.id))
    .orderBy(bodyMetrics.recordedAt);
  const bmSamples = bm.map((b) => ({
    recordedAt: ymdLocal(new Date(b.recordedAt)),
    weightKg: b.weightKg,
    bodyFatPct: b.bodyFatPct,
    muscleMassKg: b.muscleMassKg,
    leanBodyMassKg: b.leanBodyMassKg,
  }));

  // Kcal per day (all time)
  const fe = await db
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.userId, user.id));
  const kcalMap = new Map<string, number>();
  for (const e of fe) {
    const k = ymdLocal(new Date(e.consumedAt));
    kcalMap.set(k, (kcalMap.get(k) ?? 0) + Number(e.kcal ?? 0));
  }
  const kcalByDay = Array.from(kcalMap.entries())
    .sort()
    .map(([date, kcal]) => ({ date, kcal: Math.round(kcal) }));

  // Workout volume per day (all time)
  const ws = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, user.id));
  const wsById = new Map(ws.map((w) => [w.id, w]));
  const sets = ws.length > 0 ? await db.select().from(workoutSets) : [];
  const volMap = new Map<string, number>();
  for (const s of sets) {
    const w = wsById.get(s.workoutId);
    if (!w) continue;
    const k = ymdLocal(new Date(w.startedAt));
    const vol = (s.reps ?? 0) * Number(s.weightKg ?? 0);
    volMap.set(k, (volMap.get(k) ?? 0) + vol);
  }
  const volumeByDay = Array.from(volMap.entries())
    .sort()
    .map(([date, volume]) => ({ date, volume }));

  // Recovery (all time)
  const recs = whoopEnabled
    ? await db
        .select()
        .from(whoopRecovery)
        .where(eq(whoopRecovery.userId, user.id))
        .orderBy(whoopRecovery.date)
    : [];
  const recSamples = recs.map((r) => ({ date: r.date, score: r.score ?? 0 }));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("anal.trendsInsights")}</div>
        <h1 className="font-display text-4xl mt-1">{t("anal.title")}</h1>
      </header>

      <WeeklyInsights />

      <AnalysisCharts
        bmSamples={bmSamples}
        kcalByDay={kcalByDay}
        volumeByDay={volumeByDay}
        recSamples={recSamples}
        whoopEnabled={whoopEnabled}
        kcalTarget={kcalTarget}
      />
    </div>
  );
}
