// BMI, BMR (Mifflin-St Jeor), TDEE.

export type Sex = "m" | "f";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "cut" | "maintain" | "bulk";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obese";
}

// Mifflin-St Jeor
export function bmr(args: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * args.weightKg + 6.25 * args.heightCm - 5 * args.age;
  return args.sex === "m" ? base + 5 : base - 161;
}

export function tdee(b: number, activity: Activity): number {
  return b * ACTIVITY_FACTOR[activity];
}

export function recommendedKcal(t: number, goal: Goal): number {
  if (goal === "cut") return t - 500;
  if (goal === "bulk") return t + 300;
  return t;
}

export function macroSplit(kcal: number, weightKg: number, goal: Goal) {
  // Protein 2g/kg cut, 1.8g/kg maintain, 1.6g/kg bulk
  const proteinPerKg = goal === "cut" ? 2.0 : goal === "maintain" ? 1.8 : 1.6;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatKcal = kcal * (goal === "cut" ? 0.3 : 0.28);
  const fatG = Math.round(fatKcal / 9);
  const proteinKcal = proteinG * 4;
  const carbsKcal = Math.max(0, kcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);
  return { proteinG, fatG, carbsG };
}

// Epley 1RM estimate
export function epley1rm(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export type KcalTargets = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goal: Goal;
  bmi: number;
  bmr: number;
  formulaTdee: number;
  computedTdee: number;
  tdeeSource: "whoop" | "formula";
  measuredSamples: number | null;
  kcalTarget: number;
  macroTargets: { proteinG: number; fatG: number; carbsG: number } | null;
};

export function computeKcalTargets(args: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goal: Goal;
  measuredTdeeKcal?: number | null;
  measuredSamples?: number | null;
}): KcalTargets {
  const { weightKg, heightCm, age, sex, activity, goal, measuredTdeeKcal, measuredSamples } = args;
  const bmiVal = weightKg && heightCm ? bmi(weightKg, heightCm) : 0;
  const bmrVal = weightKg && heightCm && age ? bmr({ sex, weightKg, heightCm, age }) : 0;
  const formulaTdee = bmrVal ? tdee(bmrVal, activity) : 0;
  const useMeasured = measuredTdeeKcal != null && measuredTdeeKcal > 0;
  const computedTdee = useMeasured ? measuredTdeeKcal! : formulaTdee;
  const tdeeSource: "whoop" | "formula" = useMeasured ? "whoop" : "formula";
  const kcalTarget = computedTdee ? Math.round(recommendedKcal(computedTdee, goal)) : 0;
  const macroTargets = kcalTarget > 0 && weightKg > 0 ? macroSplit(kcalTarget, weightKg, goal) : null;
  return {
    weightKg,
    heightCm,
    age,
    sex,
    activity,
    goal,
    bmi: bmiVal,
    bmr: bmrVal,
    formulaTdee,
    computedTdee,
    tdeeSource,
    measuredSamples: useMeasured ? (measuredSamples ?? null) : null,
    kcalTarget,
    macroTargets,
  };
}
