import { eq, inArray } from "drizzle-orm";
import fs from "node:fs/promises";
import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  foodEntries,
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
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await requireSession();
  const userId = user.id;

  const [p] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const bodyMetricsRows = await db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId));
  const programsRows = await db.select().from(programs).where(eq(programs.userId, userId));

  const programIds = programsRows.map((r) => r.id);
  const programDaysRows =
    programIds.length > 0
      ? await db.select().from(programDays).where(inArray(programDays.programId, programIds))
      : [];
  const programDayIds = programDaysRows.map((r) => r.id);
  const programExercisesRows =
    programDayIds.length > 0
      ? await db.select().from(programExercises).where(inArray(programExercises.programDayId, programDayIds))
      : [];

  const workoutsRows = await db.select().from(workouts).where(eq(workouts.userId, userId));
  const workoutIds = workoutsRows.map((r) => r.id);
  const workoutSetsRows =
    workoutIds.length > 0
      ? await db.select().from(workoutSets).where(inArray(workoutSets.workoutId, workoutIds))
      : [];

  const foodEntriesRows = await db.select().from(foodEntries).where(eq(foodEntries.userId, userId));
  const foodPreferencesRows = await db.select().from(foodPreferences).where(eq(foodPreferences.userId, userId));
  const pantryItemsRows = await db.select().from(pantryItems).where(eq(pantryItems.userId, userId));
  const mealPlansRows = await db.select().from(mealPlans).where(eq(mealPlans.userId, userId));
  const mealPlanIds = mealPlansRows.map((r) => r.id);
  const shoppingListsRows =
    mealPlanIds.length > 0
      ? await db.select().from(shoppingLists).where(inArray(shoppingLists.mealPlanId, mealPlanIds))
      : [];

  const whoopRecoveryRows = await db.select().from(whoopRecovery).where(eq(whoopRecovery.userId, userId));
  const whoopSleepRows = await db.select().from(whoopSleep).where(eq(whoopSleep.userId, userId));
  const whoopStrainRows = await db.select().from(whoopStrain).where(eq(whoopStrain.userId, userId));
  const whoopWorkoutsRows = await db.select().from(whoopWorkouts).where(eq(whoopWorkouts.userId, userId));

  const photos: Record<string, string> = {};
  for (const entry of foodEntriesRows) {
    if (entry.photoPath && !photos[entry.photoPath]) {
      try {
        const buf = await fs.readFile(uploadPath(entry.photoPath));
        photos[entry.photoPath] = buf.toString("base64");
      } catch {
        // file missing — skip
      }
    }
  }

  const profileExport = p
    ? (() => {
        const { userId: _u, healthSyncToken: _t, updatedAt: _u2, ...rest } = p;
        return rest;
      })()
    : null;

  const stripUserId = <T extends { userId: string | null }>({ userId: _u, ...rest }: T) => rest;

  const exportData = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    data: {
      profile: profileExport,
      bodyMetrics: bodyMetricsRows.map(stripUserId),
      programs: programsRows.map(stripUserId),
      programDays: programDaysRows,
      programExercises: programExercisesRows,
      workouts: workoutsRows.map(stripUserId),
      workoutSets: workoutSetsRows,
      foodEntries: foodEntriesRows.map(stripUserId),
      foodPreferences: foodPreferencesRows.map(stripUserId),
      pantryItems: pantryItemsRows.map(stripUserId),
      mealPlans: mealPlansRows.map(stripUserId),
      shoppingLists: shoppingListsRows,
      whoopRecovery: whoopRecoveryRows.map(stripUserId),
      whoopSleep: whoopSleepRows.map(stripUserId),
      whoopStrain: whoopStrainRows.map(stripUserId),
      whoopWorkouts: whoopWorkoutsRows.map(stripUserId),
    },
    photos: Object.keys(photos).length > 0 ? photos : undefined,
  };

  const json = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(json, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="lifeos-export-${date}.json"`,
    },
  });
}
