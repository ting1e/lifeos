import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bodyMetrics, profile } from "@/lib/db/schema";
import { getMeasuredTdee } from "@/lib/whoop/tdee";
import {
  type Activity,
  type Goal,
  type KcalTargets,
  type Sex,
  computeKcalTargets,
} from "./index";

/**
 * Fetch the user's profile + latest body-metric weight + measured (Whoop)
 * TDEE, then compute all kcal/macro targets in one place. Every page/route
 * that needs the kcal target should call this instead of re-deriving the
 * BMR → TDEE → recommendedKcal → macroSplit chain inline.
 */
export async function getKcalTargetsForUser(
  userId: string,
): Promise<KcalTargets> {
  const [prof] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  const [recentWeight] = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.recordedAt))
    .limit(1);

  const whoopEnabled = prof?.whoopEnabled ?? true;
  const measured = whoopEnabled ? await getMeasuredTdee(userId) : null;

  const weightKg = Number(prof?.weightKg ?? recentWeight?.weightKg ?? 0);
  const heightCm = Number(prof?.heightCm ?? 0);
  const age = prof?.age ?? 0;
  const sex: Sex = (prof?.sex as Sex) ?? "m";
  const activity: Activity = (prof?.activityLevel as Activity) ?? "moderate";
  const goal: Goal = (prof?.goal as Goal) ?? "maintain";

  return computeKcalTargets({
    weightKg,
    heightCm,
    age,
    sex,
    activity,
    goal,
    measuredTdeeKcal: measured?.kcal,
    measuredSamples: measured?.samples,
  });
}
