import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  foodEntries,
  profile,
  whoopRecovery,
  whoopSleep,
  workouts,
  workoutSets,
} from "@/lib/db/schema";
import { chatJson } from "@/lib/ai/client";
import { weeklyInsightsPrompt } from "@/lib/ai/prompts";
import { InsightsSchema } from "@/lib/ai/schemas";
import { bmr, recommendedKcal, tdee } from "@/lib/nutrition";
import { getMeasuredTdee } from "@/lib/whoop/tdee";

export const runtime = "nodejs";
export const maxDuration = 60;

function dayKey(d: Date) {
  // Local-time YYYY-MM-DD. toISOString() emits UTC and shifts the date for
  // users east of UTC, which broke matching against the local-built days[] array.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function POST() {
  const { user } = await requireSession();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);
  const whoopEnabled = p?.whoopEnabled ?? true;

  // Last 7 days inclusive of today: window = [today-6 .. today].
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const fe = await db
    .select()
    .from(foodEntries)
    .where(and(eq(foodEntries.userId, user.id), gte(foodEntries.consumedAt, start)));
  const kByDay = new Map<string, number>();
  const pByDay = new Map<string, number>();
  for (const e of fe) {
    const k = dayKey(new Date(e.consumedAt));
    kByDay.set(k, (kByDay.get(k) ?? 0) + Number(e.kcal ?? 0));
    pByDay.set(k, (pByDay.get(k) ?? 0) + Number(e.proteinG ?? 0));
  }
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKey(d);
  });
  const dailyKcal = days.map((d) => Math.round(kByDay.get(d) ?? 0));
  const proteinDaily = days.map((d) => Math.round(pByDay.get(d) ?? 0));

  const ws = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, user.id), gte(workouts.startedAt, start)));
  const wIds = ws.map((w) => w.id);
  let totalVolume = 0;
  if (wIds.length > 0) {
    const sets = await db.select().from(workoutSets);
    for (const s of sets) {
      if (!wIds.includes(s.workoutId)) continue;
      totalVolume += (s.reps ?? 0) * Number(s.weightKg ?? 0);
    }
  }

  const recs = whoopEnabled
    ? await db
        .select()
        .from(whoopRecovery)
        .where(and(eq(whoopRecovery.userId, user.id), gte(whoopRecovery.date, dayKey(start))))
        .orderBy(asc(whoopRecovery.date))
    : [];
  const recoveryScores = recs.map((r) => r.score ?? 0);

  const sleeps = whoopEnabled
    ? await db
        .select()
        .from(whoopSleep)
        .where(and(eq(whoopSleep.userId, user.id), gte(whoopSleep.start, start)))
        .orderBy(asc(whoopSleep.start))
    : [];
  const sleepHours = sleeps.map(
    (s) => (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000,
  );

  const [latestWeight] = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, user.id))
    .orderBy(desc(bodyMetrics.recordedAt))
    .limit(1);
  const [earliestWeight] = await db
    .select()
    .from(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, user.id), gte(bodyMetrics.recordedAt, start)))
    .orderBy(asc(bodyMetrics.recordedAt))
    .limit(1);

  let target = 0;
  if (p?.weightKg && p?.heightCm && p?.age) {
    const formulaTdee = tdee(
      bmr({
        sex: p.sex ?? "m",
        weightKg: Number(p.weightKg),
        heightCm: Number(p.heightCm),
        age: p.age,
      }),
      p.activityLevel ?? "moderate",
    );
    const measured = whoopEnabled ? await getMeasuredTdee(user.id) : null;
    const td = measured?.kcal ?? formulaTdee;
    target = Math.round(recommendedKcal(td, p.goal ?? "maintain"));
  }

  const { system, prompt } = weeklyInsightsPrompt({
    locale: user.locale,
    weekStart: days[0],
    weekEnd: days[6],
    kcalTarget: target,
    dailyKcal,
    proteinDaily,
    workoutCount: ws.length,
    workoutVolumeKg: totalVolume,
    recoveryScores,
    sleepHours,
    bodyWeightStart: earliestWeight?.weightKg ? Number(earliestWeight.weightKg) : null,
    bodyWeightEnd: latestWeight?.weightKg ? Number(latestWeight.weightKg) : null,
    goal: p?.goal ?? "maintain",
  });

  try {
    const out = await chatJson({
      userId: user.id,
      kind: "insights",
      system,
      prompt,
      schema: InsightsSchema,
      temperature: 0.4,
    });
    return NextResponse.json({ insights: out });
  } catch (e) {
    console.error("[insights/weekly]", e);
    return NextResponse.json(
      { error: "insights_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
