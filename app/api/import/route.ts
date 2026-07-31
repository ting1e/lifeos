import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  foodEntries,
  foodLibrary,
  foodPreferences,
  mealPlans,
  pantryItems,
  profile,
  programDays,
  programExercises,
  programs,
  shoppingLists,
  whoopRecovery,
  whoopSleep,
  whoopStrain,
  whoopWorkouts,
  workoutSets,
  workouts,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { writeUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

function ts(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return new Date();
}
function tsOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return null;
}
function dateOnly(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.includes("T") ? v.slice(0, 10) : v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(req: NextRequest) {
  const { user } = await requireSession();
  const userId = user.id;

  const mode = new URL(req.url).searchParams.get("mode") ?? "merge";
  if (mode !== "merge" && mode !== "replace") {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!isObj(body) || !isObj(body.data)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const data = body.data;
  const stats: Record<string, number | boolean> = {};

  const photoMapping: Record<string, string> = {};
  let photosImported = 0;
  if (isObj(body.photos)) {
    for (const [oldName, b64] of Object.entries(body.photos)) {
      if (typeof b64 !== "string") continue;
      try {
        const rawExt = path.extname(oldName).slice(1) || "jpg";
        const ext = rawExt === "blob" ? "jpg" : rawExt;
        const newName = await writeUpload(Buffer.from(b64, "base64"), ext);
        photoMapping[oldName] = newName;
        photosImported++;
      } catch (e) {
        console.error("[import] photo write failed:", oldName, e);
      }
    }
  }
  stats.photos = photosImported;

  try {
    await db.transaction(async (tx) => {
      if (mode === "replace") {
        await tx.delete(programs).where(eq(programs.userId, userId));
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        await tx.delete(workouts).where(eq(workouts.userId, userId));
        await tx.delete(bodyMetrics).where(eq(bodyMetrics.userId, userId));
        await tx.delete(foodEntries).where(eq(foodEntries.userId, userId));
        await tx.delete(foodPreferences).where(eq(foodPreferences.userId, userId));
        await tx.delete(foodLibrary).where(eq(foodLibrary.userId, userId));
        await tx.delete(pantryItems).where(eq(pantryItems.userId, userId));
        await tx.delete(whoopRecovery).where(eq(whoopRecovery.userId, userId));
        await tx.delete(whoopSleep).where(eq(whoopSleep.userId, userId));
        await tx.delete(whoopStrain).where(eq(whoopStrain.userId, userId));
        await tx.delete(whoopWorkouts).where(eq(whoopWorkouts.userId, userId));
      }

      if (isObj(data.profile)) {
        const p = data.profile;
        await tx
          .insert(profile)
          .values({
            userId,
            displayName: (p.displayName as string | null) ?? null,
            heightCm: (p.heightCm as string | null) ?? null,
            weightKg: (p.weightKg as string | null) ?? null,
            age: (p.age as number | null) ?? null,
            sex: (p.sex as "m" | "f" | null) ?? null,
            activityLevel: (p.activityLevel as "sedentary" | "light" | "moderate" | "active" | "very_active" | null) ?? null,
            goal: (p.goal as "cut" | "maintain" | "bulk" | null) ?? null,
            targetWeightKg: (p.targetWeightKg as string | null) ?? null,
            whoopEnabled: (p.whoopEnabled as boolean | null) ?? true,
            aiBaseUrl: (p.aiBaseUrl as string | null) ?? null,
            aiApiKey: (p.aiApiKey as string | null) ?? null,
            aiTextModel: (p.aiTextModel as string | null) ?? null,
            aiImageModel: (p.aiImageModel as string | null) ?? null,
            aiAudioModel: (p.aiAudioModel as string | null) ?? null,
            navSettings: (p.navSettings as unknown | null) ?? null,
          })
          .onConflictDoUpdate({
            target: profile.userId,
            set: {
              displayName: sql`COALESCE(excluded."display_name", "profile"."display_name")`,
              heightCm: sql`COALESCE(excluded."height_cm", "profile"."height_cm")`,
              weightKg: sql`COALESCE(excluded."weight_kg", "profile"."weight_kg")`,
              age: sql`COALESCE(excluded."age", "profile"."age")`,
              sex: sql`COALESCE(excluded."sex", "profile"."sex")`,
              activityLevel: sql`COALESCE(excluded."activity_level", "profile"."activity_level")`,
              goal: sql`COALESCE(excluded."goal", "profile"."goal")`,
              targetWeightKg: sql`COALESCE(excluded."target_weight_kg", "profile"."target_weight_kg")`,
              whoopEnabled: sql`COALESCE(excluded."whoop_enabled", "profile"."whoop_enabled")`,
              aiBaseUrl: sql`COALESCE(excluded."ai_base_url", "profile"."ai_base_url")`,
              aiApiKey: sql`COALESCE(excluded."ai_api_key", "profile"."ai_api_key")`,
              aiTextModel: sql`COALESCE(excluded."ai_text_model", "profile"."ai_text_model")`,
              aiImageModel: sql`COALESCE(excluded."ai_image_model", "profile"."ai_image_model")`,
              aiAudioModel: sql`COALESCE(excluded."ai_audio_model", "profile"."ai_audio_model")`,
              navSettings: sql`COALESCE(excluded."nav_settings", "profile"."nav_settings")`,
            },
          });
        stats.profile = true;
      }

      if (Array.isArray(data.bodyMetrics)) {
        const rows = data.bodyMetrics
          .filter(isObj)
          .filter((r) => r.recordedAt != null)
          .map((r) => ({
            userId,
            recordedAt: ts(r.recordedAt),
            weightKg: (r.weightKg as string | null) ?? null,
            bodyFatPct: (r.bodyFatPct as string | null) ?? null,
            muscleMassKg: (r.muscleMassKg as string | null) ?? null,
            leanBodyMassKg: (r.leanBodyMassKg as string | null) ?? null,
            source: (r.source as "manual" | "whoop" | "apple_health" | null) ?? "manual",
          }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(bodyMetrics)
            .values(batch)
            .onConflictDoUpdate({
              target: [bodyMetrics.userId, bodyMetrics.recordedAt, bodyMetrics.source],
              set: {
                weightKg: sql`COALESCE(excluded."weight_kg", "body_metrics"."weight_kg")`,
                bodyFatPct: sql`COALESCE(excluded."body_fat_pct", "body_metrics"."body_fat_pct")`,
                muscleMassKg: sql`COALESCE(excluded."muscle_mass_kg", "body_metrics"."muscle_mass_kg")`,
                leanBodyMassKg: sql`COALESCE(excluded."lean_body_mass_kg", "body_metrics"."lean_body_mass_kg")`,
              },
            });
        }
        stats.bodyMetrics = rows.length;
      }

      if (Array.isArray(data.foodPreferences)) {
        const rows = data.foodPreferences
          .filter(isObj)
          .filter((r) => r.kind != null && r.label != null)
          .map((r) => ({
            userId,
            kind: r.kind as "liked" | "disliked" | "allergy",
            label: r.label as string,
          }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(foodPreferences)
            .values(batch)
            .onConflictDoNothing({
              target: [foodPreferences.userId, foodPreferences.kind, foodPreferences.label],
            });
        }
        stats.foodPreferences = rows.length;
      }

      if (Array.isArray(data.pantryItems)) {
        let existingPantry = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ name: pantryItems.name })
            .from(pantryItems)
            .where(eq(pantryItems.userId, userId));
          existingPantry = new Set(existing.map((r) => r.name));
        }
        const rows = data.pantryItems
          .filter(isObj)
          .map((r) => ({
            userId,
            name: (r.name as string) ?? "unknown",
            qty: (r.qty as string | null) ?? null,
            unit: (r.unit as string | null) ?? null,
            expiresAt: dateOnly(r.expiresAt),
          }))
          .filter((r) => !existingPantry.has(r.name));
        for (const batch of chunks(rows, 500)) {
          await tx.insert(pantryItems).values(batch);
        }
        stats.pantryItems = rows.length;
      }

      if (Array.isArray(data.foodLibrary)) {
        let existingLib = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ name: foodLibrary.name })
            .from(foodLibrary)
            .where(eq(foodLibrary.userId, userId));
          existingLib = new Set(existing.map((r) => r.name));
        }
        const libRows = data.foodLibrary
          .filter(isObj)
          .map((r) => {
            const oldPhoto = r.photoPath as string | undefined;
            return {
              userId,
              name: (r.name as string) ?? "unknown",
              kcal: (r.kcal as string | null) ?? null,
              proteinG: (r.proteinG as string | null) ?? null,
              carbsG: (r.carbsG as string | null) ?? null,
              fatG: (r.fatG as string | null) ?? null,
              photoPath: oldPhoto ? (photoMapping[oldPhoto] ?? null) : null,
            };
          })
          .filter((r) => !existingLib.has(r.name));
        for (const batch of chunks(libRows, 500)) {
          await tx.insert(foodLibrary).values(batch);
        }
        stats.foodLibrary = libRows.length;
      }

      const programIdMap: Record<string, string> = {};
      if (Array.isArray(data.programs)) {
        let existingProgramNames = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ name: programs.name })
            .from(programs)
            .where(eq(programs.userId, userId));
          existingProgramNames = new Set(existing.map((r) => r.name));
        }
        const rows = data.programs.filter(isObj).flatMap((r) => {
          const name = (r.name as string) ?? "imported program";
          if (mode === "merge" && existingProgramNames.has(name)) return [];
          const oldId = (r.id as string) ?? randomUUID();
          const newId = randomUUID();
          programIdMap[oldId] = newId;
          return [{
            id: newId,
            userId,
            name,
            description: (r.description as string | null) ?? null,
            isTemplate: (r.isTemplate as boolean | null) ?? false,
            createdAt: ts(r.createdAt),
          }];
        });
        for (const batch of chunks(rows, 500)) {
          await tx.insert(programs).values(batch);
        }
        stats.programs = rows.length;
      }

      const programDayIdMap: Record<string, string> = {};
      if (Array.isArray(data.programDays)) {
        const rows = data.programDays.filter(isObj).flatMap((r) => {
          const oldProgramId = r.programId as string | undefined;
          const newProgramId = oldProgramId ? (programIdMap[oldProgramId] ?? null) : null;
          if (!newProgramId) return [];
          const oldId = (r.id as string) ?? randomUUID();
          const newId = randomUUID();
          programDayIdMap[oldId] = newId;
          return [{
            id: newId,
            programId: newProgramId,
            dayIndex: (r.dayIndex as number) ?? 0,
            name: (r.name as string) ?? "Day",
          }];
        });
        for (const batch of chunks(rows, 500)) {
          await tx.insert(programDays).values(batch);
        }
        stats.programDays = rows.length;
      }

      if (Array.isArray(data.programExercises)) {
        const rows = data.programExercises.filter(isObj).map((r) => {
          const oldDayId = r.programDayId as string | undefined;
          const newId = randomUUID();
          return {
            id: newId,
            programDayId: oldDayId ? (programDayIdMap[oldDayId] ?? null) : null,
            exerciseId: (r.exerciseId as string) ?? "",
            orderIndex: (r.orderIndex as number) ?? 0,
            targetSets: (r.targetSets as number | null) ?? null,
            targetReps: (r.targetReps as number | null) ?? null,
            targetWeightKg: (r.targetWeightKg as string | null) ?? null,
            notes: (r.notes as string | null) ?? null,
          };
        }).filter((r) => r.programDayId !== null) as {
          id: string; programDayId: string; exerciseId: string; orderIndex: number;
          targetSets: number | null; targetReps: number | null; targetWeightKg: string | null; notes: string | null;
        }[];
        for (const batch of chunks(rows, 500)) {
          await tx.insert(programExercises).values(batch);
        }
        stats.programExercises = rows.length;
      }

      const workoutIdMap: Record<string, string> = {};
      if (Array.isArray(data.workouts)) {
        let existingWorkoutStarts = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ startedAt: workouts.startedAt })
            .from(workouts)
            .where(eq(workouts.userId, userId));
          existingWorkoutStarts = new Set(existing.map((r) => r.startedAt.toISOString()));
        }
        const rows = data.workouts.filter(isObj).flatMap((r) => {
          const startedAt = ts(r.startedAt);
          if (mode === "merge" && existingWorkoutStarts.has(startedAt.toISOString())) return [];
          const oldId = (r.id as string) ?? randomUUID();
          const newId = randomUUID();
          workoutIdMap[oldId] = newId;
          const oldProgramId = r.programId as string | undefined;
          const oldProgramDayId = r.programDayId as string | undefined;
          return [{
            id: newId,
            userId,
            programId: oldProgramId ? (programIdMap[oldProgramId] ?? null) : null,
            programDayId: oldProgramDayId ? (programDayIdMap[oldProgramDayId] ?? null) : null,
            startedAt,
            endedAt: tsOrNull(r.endedAt),
            notes: (r.notes as string | null) ?? null,
            source: (r.source as "manual" | "whoop" | null) ?? "manual",
          }];
        });
        for (const batch of chunks(rows, 500)) {
          await tx.insert(workouts).values(batch);
        }
        stats.workouts = rows.length;
      }

      if (Array.isArray(data.workoutSets)) {
        const rows = data.workoutSets.filter(isObj).map((r) => {
          const oldWorkoutId = r.workoutId as string | undefined;
          return {
            workoutId: oldWorkoutId ? (workoutIdMap[oldWorkoutId] ?? null) : null,
            exerciseId: (r.exerciseId as string) ?? "",
            setIndex: (r.setIndex as number) ?? 0,
            reps: (r.reps as number | null) ?? null,
            weightKg: (r.weightKg as string | null) ?? null,
            rpe: (r.rpe as number | null) ?? null,
            completedAt: ts(r.completedAt),
          };
        }).filter((r) => r.workoutId !== null) as {
          workoutId: string; exerciseId: string; setIndex: number;
          reps: number | null; weightKg: string | null; rpe: number | null; completedAt: Date;
        }[];
        for (const batch of chunks(rows, 500)) {
          await tx.insert(workoutSets).values(batch);
        }
        stats.workoutSets = rows.length;
      }

      const mealPlanIdMap: Record<string, string> = {};
      if (Array.isArray(data.mealPlans)) {
        let existingMealPlanStarts = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ startsOn: mealPlans.startsOn })
            .from(mealPlans)
            .where(eq(mealPlans.userId, userId));
          existingMealPlanStarts = new Set(existing.map((r) => r.startsOn));
        }
        const rows = data.mealPlans.filter(isObj).flatMap((r) => {
          const startsOn = dateOnly(r.startsOn) ?? new Date().toISOString().slice(0, 10);
          if (mode === "merge" && existingMealPlanStarts.has(startsOn)) return [];
          const oldId = (r.id as string) ?? randomUUID();
          const newId = randomUUID();
          mealPlanIdMap[oldId] = newId;
          return [{
            id: newId,
            userId,
            startsOn,
            endsOn: dateOnly(r.endsOn) ?? new Date().toISOString().slice(0, 10),
            goalSnapshot: r.goalSnapshot ?? null,
            plan: r.plan ?? null,
            createdAt: ts(r.createdAt),
          }];
        });
        for (const batch of chunks(rows, 200)) {
          await tx.insert(mealPlans).values(batch);
        }
        stats.mealPlans = rows.length;
      }

      if (Array.isArray(data.shoppingLists)) {
        const rows = data.shoppingLists.filter(isObj).map((r) => {
          const oldMealPlanId = r.mealPlanId as string | undefined;
          return {
            mealPlanId: oldMealPlanId ? (mealPlanIdMap[oldMealPlanId] ?? null) : null,
            items: r.items ?? [],
            createdAt: ts(r.createdAt),
          };
        }).filter((r) => r.mealPlanId !== null) as {
          mealPlanId: string; items: unknown; createdAt: Date;
        }[];
        for (const batch of chunks(rows, 200)) {
          await tx.insert(shoppingLists).values(batch);
        }
        stats.shoppingLists = rows.length;
      }

      if (Array.isArray(data.foodEntries)) {
        let existingFoodKeys = new Set<string>();
        if (mode === "merge") {
          const existing = await tx
            .select({ consumedAt: foodEntries.consumedAt, name: foodEntries.name })
            .from(foodEntries)
            .where(eq(foodEntries.userId, userId));
          existingFoodKeys = new Set(existing.map((r) => `${r.consumedAt.toISOString()}|${r.name}`));
        }
        const rows = data.foodEntries
          .filter(isObj)
          .map((r) => {
            const oldPhoto = r.photoPath as string | undefined;
            const consumedAt = ts(r.consumedAt);
            const name = (r.name as string) ?? "unknown";
            return {
              row: {
                userId,
                consumedAt,
                meal: (r.meal as "breakfast" | "lunch" | "dinner" | "snack" | null) ?? "snack",
                name,
                kcal: (r.kcal as string | null) ?? null,
                proteinG: (r.proteinG as string | null) ?? null,
                carbsG: (r.carbsG as string | null) ?? null,
                fatG: (r.fatG as string | null) ?? null,
                photoPath: oldPhoto ? (photoMapping[oldPhoto] ?? null) : null,
                aiEstimate: r.aiEstimate ?? null,
                source: (r.source as "manual" | "ai_photo" | null) ?? "manual",
              },
              dedupKey: `${consumedAt.toISOString()}|${name}`,
            };
          })
          .filter((r) => !existingFoodKeys.has(r.dedupKey))
          .map((r) => r.row);
        for (const batch of chunks(rows, 500)) {
          await tx.insert(foodEntries).values(batch);
        }
        stats.foodEntries = rows.length;
      }

      if (Array.isArray(data.whoopRecovery)) {
        const rows = data.whoopRecovery.filter(isObj).filter((r) => r.date != null).map((r) => ({
          userId,
          date: dateOnly(r.date)!,
          score: (r.score as number | null) ?? null,
          hrvMs: (r.hrvMs as string | null) ?? null,
          rhr: (r.rhr as number | null) ?? null,
          raw: r.raw ?? null,
        }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(whoopRecovery)
            .values(batch)
            .onConflictDoUpdate({
              target: [whoopRecovery.userId, whoopRecovery.date],
              set: {
                score: sql`COALESCE(excluded."score", "whoop_recovery"."score")`,
                hrvMs: sql`COALESCE(excluded."hrv_ms", "whoop_recovery"."hrv_ms")`,
                rhr: sql`COALESCE(excluded."rhr", "whoop_recovery"."rhr")`,
                raw: sql`COALESCE(excluded."raw", "whoop_recovery"."raw")`,
              },
            });
        }
        stats.whoopRecovery = rows.length;
      }

      if (Array.isArray(data.whoopSleep)) {
        const rows = data.whoopSleep.filter(isObj).filter((r) => r.start != null).map((r) => ({
          userId,
          start: ts(r.start),
          end: ts(r.end),
          score: (r.score as number | null) ?? null,
          performancePct: (r.performancePct as string | null) ?? null,
          raw: r.raw ?? null,
        }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(whoopSleep)
            .values(batch)
            .onConflictDoUpdate({
              target: [whoopSleep.userId, whoopSleep.start],
              set: {
                end: sql`excluded."end"`,
                score: sql`COALESCE(excluded."score", "whoop_sleep"."score")`,
                performancePct: sql`COALESCE(excluded."performance_pct", "whoop_sleep"."performance_pct")`,
                raw: sql`COALESCE(excluded."raw", "whoop_sleep"."raw")`,
              },
            });
        }
        stats.whoopSleep = rows.length;
      }

      if (Array.isArray(data.whoopStrain)) {
        const rows = data.whoopStrain.filter(isObj).filter((r) => r.date != null).map((r) => ({
          userId,
          date: dateOnly(r.date)!,
          score: (r.score as string | null) ?? null,
          avgHr: (r.avgHr as number | null) ?? null,
          maxHr: (r.maxHr as number | null) ?? null,
          kilojoules: (r.kilojoules as string | null) ?? null,
          raw: r.raw ?? null,
        }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(whoopStrain)
            .values(batch)
            .onConflictDoUpdate({
              target: [whoopStrain.userId, whoopStrain.date],
              set: {
                score: sql`COALESCE(excluded."score", "whoop_strain"."score")`,
                avgHr: sql`COALESCE(excluded."avg_hr", "whoop_strain"."avg_hr")`,
                maxHr: sql`COALESCE(excluded."max_hr", "whoop_strain"."max_hr")`,
                kilojoules: sql`COALESCE(excluded."kilojoules", "whoop_strain"."kilojoules")`,
                raw: sql`COALESCE(excluded."raw", "whoop_strain"."raw")`,
              },
            });
        }
        stats.whoopStrain = rows.length;
      }

      if (Array.isArray(data.whoopWorkouts)) {
        const rows = data.whoopWorkouts.filter(isObj).map((r) => ({
          userId,
          whoopId: (r.whoopId as string) ?? randomUUID(),
          sport: (r.sport as string | null) ?? null,
          start: ts(r.start),
          end: ts(r.end),
          strain: (r.strain as string | null) ?? null,
          hrZones: r.hrZones ?? null,
          raw: r.raw ?? null,
        }));
        for (const batch of chunks(rows, 500)) {
          await tx
            .insert(whoopWorkouts)
            .values(batch)
            .onConflictDoNothing({ target: whoopWorkouts.whoopId });
        }
        stats.whoopWorkouts = rows.length;
      }
    });
  } catch (e) {
    console.error("[import] transaction failed:", e);
    return NextResponse.json(
      { error: "import_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  return NextResponse.json({ imported: stats });
}
