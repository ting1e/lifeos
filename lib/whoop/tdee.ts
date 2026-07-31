import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { whoopStrain } from "@/lib/db/schema";
import { ymdLocal } from "@/lib/utils/day";

const KJ_PER_KCAL = 4.184;

/**
 * Whoop reports each day's total energy expenditure as kilojoules on the
 * strain/cycle record. Average the last N days (default 14) to get a
 * personalized TDEE that's far more accurate than Mifflin-St Jeor + activity
 * factor. Returns null if fewer than `minSamples` days of data are available.
 */
export async function getMeasuredTdee(
  userId: string,
  opts: { lookbackDays?: number; minSamples?: number } = {},
): Promise<{ kcal: number; samples: number; sinceDate: string } | null> {
  const lookback = opts.lookbackDays ?? 14;
  const minSamples = opts.minSamples ?? 3;
  const since = new Date(Date.now() - lookback * 86_400_000);
  const sinceStr = ymdLocal(since);

  const rows = await db
    .select({ kj: whoopStrain.kilojoules })
    .from(whoopStrain)
    .where(and(eq(whoopStrain.userId, userId), gte(whoopStrain.date, sinceStr)));

  const valid = rows
    .map((r) => (r.kj == null ? null : Number(r.kj)))
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);

  if (valid.length < minSamples) return null;
  const avgKj = valid.reduce((a, b) => a + b, 0) / valid.length;
  return {
    kcal: Math.round(avgKj / KJ_PER_KCAL),
    samples: valid.length,
    sinceDate: sinceStr,
  };
}
