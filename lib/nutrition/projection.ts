import { bmr, tdee, type Activity, type Sex } from "./index";

const KCAL_PER_KG = 7700;

export type ProjectionInput = {
  sex: Sex;
  heightCm: number;
  age: number;
  activity: Activity;
  startWeightKg: number;
  dailyKcalIntake: number;
  days: number;
  startDate?: Date; // anchor date at local midnight; defaults to today
};

export type ProjectionPoint = {
  day: number;
  date: string; // YYYY-MM-DD, daily cadence from the start date (default today)
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

// Iteratively step a Losertown-style weight projection. Each day, recompute
// BMR from the current weight, derive maintenance, then move weight by the
// energy gap. Stable for both deficit and surplus.
export function projectWeight(input: ProjectionInput): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let weight = input.startWeightKg;
  const start = input.startDate ?? todayYMD();

  for (let d = 0; d <= input.days; d++) {
    const b = bmr({
      sex: input.sex,
      weightKg: weight,
      heightCm: input.heightCm,
      age: input.age,
    });
    const maint = tdee(b, input.activity);
    const dailyDeficit = maint - input.dailyKcalIntake;
    points.push({
      day: d,
      date: fmt(addDays(start, d)),
      weightKg: Math.round(weight * 100) / 100,
      maintenanceKcal: Math.round(maint * 10) / 10,
      dailyDeficitKcal: Math.round(dailyDeficit * 10) / 10,
    });

    // step
    weight = weight - dailyDeficit / KCAL_PER_KG;
    if (weight < 30) break; // safety stop
  }

  return points;
}

// Linear projection from an observed weekly rate. Returns the same shape as
// projectWeight so daysToTarget can be reused.
export function projectWeightByTrend(
  startWeightKg: number,
  weeklyRateKg: number,
  days: number,
  startDate?: Date,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const start = startDate ?? todayYMD();
  const dailyRateKg = weeklyRateKg / 7;
  for (let d = 0; d <= days; d++) {
    points.push({
      day: d,
      date: fmt(addDays(start, d)),
      weightKg: Math.round((startWeightKg + dailyRateKg * d) * 100) / 100,
      maintenanceKcal: 0,
      dailyDeficitKcal: Math.round((weeklyRateKg * 7700) / 7),
    });
  }
  return points;
}

// First day where projected weight crosses the target (downward or upward).
// Returns null if it never crosses within the projection window.
export function daysToTarget(
  points: ProjectionPoint[],
  targetKg: number,
): number | null {
  if (points.length < 2) return null;
  const startsBelow = points[0].weightKg < targetKg;
  for (let i = 1; i < points.length; i++) {
    const crossed = startsBelow
      ? points[i].weightKg >= targetKg
      : points[i].weightKg <= targetKg;
    if (crossed) return points[i].day;
  }
  return null;
}
