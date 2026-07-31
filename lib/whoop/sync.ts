import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  whoopRecovery,
  whoopSleep,
  whoopStrain,
  whoopWorkouts,
} from "@/lib/db/schema";
import {
  fetchBodyMeasurement,
  fetchCycles,
  fetchRecovery,
  fetchSleep,
  fetchWorkouts,
} from "./api";
import { ymdLocal } from "@/lib/utils/day";

function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(+d) ? null : d;
}

function dayString(iso: string | undefined): string {
  return ymdLocal(iso ? new Date(iso) : new Date());
}

export type SyncResult = {
  recovery: number;
  sleep: number;
  strain: number;
  workouts: number;
  errors: Record<string, string>;
  sinceDays: number;
};

export async function syncAll(userId: string, sinceDays = 30): Promise<SyncResult> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const errors: Record<string, string> = {};

  // Body measurement (single row endpoint usually). Optional; not fatal.
  try {
    const body = await fetchBodyMeasurement(userId);
    const w = body?.weight_kilogram ?? body?.weight_kg;
    if (typeof w === "number") {
      await db.insert(bodyMetrics).values({
        userId,
        weightKg: String(w),
        source: "whoop",
      });
    }
  } catch (e) {
    errors.body = e instanceof Error ? e.message : String(e);
  }

  // Recovery
  let recs: Awaited<ReturnType<typeof fetchRecovery>> = [];
  try {
    recs = await fetchRecovery(userId, since);
  } catch (e) {
    errors.recovery = e instanceof Error ? e.message : String(e);
  }
  for (const r of recs) {
    const date = dayString(r?.created_at ?? r?.score?.recovery_date);
    await db
      .insert(whoopRecovery)
      .values({
        userId,
        date,
        score: r?.score?.recovery_score ?? null,
        hrvMs: r?.score?.hrv_rmssd_milli ? String(r.score.hrv_rmssd_milli) : null,
        rhr: r?.score?.resting_heart_rate ?? null,
        raw: r,
      })
      .onConflictDoUpdate({
        target: [whoopRecovery.userId, whoopRecovery.date],
        set: {
          score: r?.score?.recovery_score ?? null,
          hrvMs: r?.score?.hrv_rmssd_milli ? String(r.score.hrv_rmssd_milli) : null,
          rhr: r?.score?.resting_heart_rate ?? null,
          raw: r,
        },
      });
  }

  // Sleep
  let sleeps: Awaited<ReturnType<typeof fetchSleep>> = [];
  try {
    sleeps = await fetchSleep(userId, since);
  } catch (e) {
    errors.sleep = e instanceof Error ? e.message : String(e);
  }
  for (const s of sleeps) {
    const start = toDate(s?.start);
    const end = toDate(s?.end);
    if (!start || !end) continue;
    await db
      .insert(whoopSleep)
      .values({
        userId,
        start,
        end,
        score: s?.score?.sleep_performance_percentage ?? null,
        performancePct: s?.score?.sleep_performance_percentage
          ? String(s.score.sleep_performance_percentage)
          : null,
        raw: s,
      })
      .onConflictDoUpdate({
        target: [whoopSleep.userId, whoopSleep.start],
        set: {
          end,
          score: s?.score?.sleep_performance_percentage ?? null,
          performancePct: s?.score?.sleep_performance_percentage
            ? String(s.score.sleep_performance_percentage)
            : null,
          raw: s,
        },
      });
  }

  // Strain — from cycles. v2 cycle.score has { strain, kilojoule }. avg/max HR
  // are no longer on the cycle; they belong to workouts. Keep the columns for
  // legacy rows but write null when missing.
  let cycles: Awaited<ReturnType<typeof fetchCycles>> = [];
  try {
    cycles = await fetchCycles(userId, since);
  } catch (e) {
    errors.strain = e instanceof Error ? e.message : String(e);
  }
  for (const c of cycles) {
    const date = dayString(c?.start);
    await db
      .insert(whoopStrain)
      .values({
        userId,
        date,
        score: c?.score?.strain ? String(c.score.strain) : null,
        avgHr: c?.score?.average_heart_rate ?? null,
        maxHr: c?.score?.max_heart_rate ?? null,
        kilojoules: c?.score?.kilojoule ? String(c.score.kilojoule) : null,
        raw: c,
      })
      .onConflictDoUpdate({
        target: [whoopStrain.userId, whoopStrain.date],
        set: {
          score: c?.score?.strain ? String(c.score.strain) : null,
          avgHr: c?.score?.average_heart_rate ?? null,
          maxHr: c?.score?.max_heart_rate ?? null,
          kilojoules: c?.score?.kilojoule ? String(c.score.kilojoule) : null,
          raw: c,
        },
      });
  }

  // Workouts. v2 ids are UUID strings; the zone breakdown is now `zone_durations`.
  let wks: Awaited<ReturnType<typeof fetchWorkouts>> = [];
  try {
    wks = await fetchWorkouts(userId, since);
  } catch (e) {
    errors.workouts = e instanceof Error ? e.message : String(e);
  }
  for (const w of wks) {
    const whoopId = String(w?.id ?? "");
    if (!whoopId) continue;
    const start = toDate(w?.start);
    const end = toDate(w?.end);
    if (!start || !end) continue;
    const zones = w?.score?.zone_durations ?? w?.score?.zone_duration ?? null;
    await db
      .insert(whoopWorkouts)
      .values({
        userId,
        whoopId,
        sport: w?.sport_name ?? null,
        start,
        end,
        strain: w?.score?.strain ? String(w.score.strain) : null,
        hrZones: zones,
        raw: w,
      })
      .onConflictDoUpdate({
        target: whoopWorkouts.whoopId,
        set: {
          sport: w?.sport_name ?? null,
          end,
          strain: w?.score?.strain ? String(w.score.strain) : null,
          hrZones: zones,
          raw: w,
        },
      });
  }

  return {
    recovery: recs.length,
    sleep: sleeps.length,
    strain: cycles.length,
    workouts: wks.length,
    errors,
    sinceDays,
  };
}
