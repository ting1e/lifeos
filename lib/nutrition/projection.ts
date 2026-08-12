import { bmr, tdee, type Activity, type Sex } from "./index";

const KCAL_PER_KG = 7700;

export type ProjectionInput = {
  sex: Sex;
  heightCm: number;
  age: number;
  activity: Activity;
  startWeightKg: number;
  dailyKcalIntake: number;
  weeks: number;
};

export type ProjectionPoint = {
  week: number;
  date: string; // YYYY-MM-DD, weekly cadence from "today"
  weightKg: number;
  maintenanceKcal: number;
  dailyDeficitKcal: number;
};

function todayYMD(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Iteratively step a Losertown-style weight projection. Each week, recompute
// BMR from the current weight, derive maintenance, then move weight by the
// energy gap. Stable for both deficit and surplus.
export function projectWeight(input: ProjectionInput): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let weight = input.startWeightKg;
  const start = todayYMD();

  for (let w = 0; w <= input.weeks; w++) {
    const b = bmr({
      sex: input.sex,
      weightKg: weight,
      heightCm: input.heightCm,
      age: input.age,
    });
    const maint = tdee(b, input.activity);
    const dailyDeficit = maint - input.dailyKcalIntake;
    points.push({
      week: w,
      date: fmt(addDays(start, w * 7)),
      weightKg: Math.round(weight * 100) / 100,
      maintenanceKcal: Math.round(maint * 10) / 10,
      dailyDeficitKcal: Math.round(dailyDeficit * 10) / 10,
    });

    // step
    const weeklyDeficit = dailyDeficit * 7;
    weight = weight - weeklyDeficit / KCAL_PER_KG;
    if (weight < 30) break; // safety stop
  }

  return points;
}

// Linear projection from an observed weekly rate. Returns the same shape as
// projectWeight so weeksToTarget can be reused.
export function projectWeightByTrend(
  startWeightKg: number,
  weeklyRateKg: number,
  weeks: number,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const start = todayYMD();
  for (let w = 0; w <= weeks; w++) {
    points.push({
      week: w,
      date: fmt(addDays(start, w * 7)),
      weightKg: Math.round((startWeightKg + weeklyRateKg * w) * 100) / 100,
      maintenanceKcal: 0,
      dailyDeficitKcal: Math.round((weeklyRateKg * 7700) / 7),
    });
  }
  return points;
}

// First week where projected weight crosses the target (downward or upward).
// Returns null if it never crosses within the projection window.
export function weeksToTarget(
  points: ProjectionPoint[],
  targetKg: number,
): number | null {
  if (points.length < 2) return null;
  const startsBelow = points[0].weightKg < targetKg;
  for (let i = 1; i < points.length; i++) {
    const crossed = startsBelow
      ? points[i].weightKg >= targetKg
      : points[i].weightKg <= targetKg;
    if (crossed) return points[i].week;
  }
  return null;
}
