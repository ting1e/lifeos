// Deterministic demo seed. All fields match the Drizzle $inferSelect shapes
// from lib/db/schema.ts. Numeric (decimal) columns come back as strings —
// we keep them as strings here so the rest of the app's `Number(...)` calls
// behave identically.

import type {
  AiMessage,
  BodyMetric,
  Exercise,
  FoodEntry,
  FoodPreference,
  MealPlan,
  PantryItem,
  Profile,
  Program,
  ProgramDay,
  ProgramExercise,
  ShoppingList,
  WhoopRecovery,
  WhoopSleep,
  WhoopStrain,
  WhoopWorkout,
  Workout,
  WorkoutSet,
} from "@/lib/db/schema";

// Patch in the missing $inferSelect types (Drizzle's body_metrics row).
// Note: the schema only exports types up through `User`. We define the
// few it doesn't, so we don't break anything when importing.
// (They're already exported in schema.ts as `BodyMetric` etc.)

// --- deterministic PRNG (mulberry32) ---
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260518;
const USER_ID = "demo-user";

function uid(rng: () => number): string {
  // pseudo-uuid v4
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    let v = Math.floor(rng() * 16);
    if (i === 12) v = 4;
    if (i === 16) v = (v & 0x3) | 0x8;
    out += hex[v];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// --- exercise catalog (30) ---
function buildExercises(): Exercise[] {
  const now = new Date();
  type Spec = {
    id: string;
    nameEn: string;
    nameTr: string;
    category: "weight" | "calisthenics";
    bodyPart: string;
    equipment: string;
    target: string;
    muscleGroup: string;
    secondaries: string[];
  };
  const specs: Spec[] = [
    { id: "0001", nameEn: "Bench Press", nameTr: "Bench Press", category: "weight", bodyPart: "chest", equipment: "barbell", target: "pectorals", muscleGroup: "chest", secondaries: ["triceps", "front delts"] },
    { id: "0002", nameEn: "Overhead Press", nameTr: "Omuz Press", category: "weight", bodyPart: "shoulders", equipment: "barbell", target: "front deltoid", muscleGroup: "shoulders", secondaries: ["triceps", "upper chest"] },
    { id: "0003", nameEn: "Incline Dumbbell Press", nameTr: "Eğik Dumbbell Press", category: "weight", bodyPart: "chest", equipment: "dumbbell", target: "upper pectorals", muscleGroup: "chest", secondaries: ["front delts", "triceps"] },
    { id: "0004", nameEn: "Cable Triceps Pushdown", nameTr: "Triceps Cable Pushdown", category: "weight", bodyPart: "upper arms", equipment: "cable", target: "triceps", muscleGroup: "arms", secondaries: [] },
    { id: "0005", nameEn: "Pull-up", nameTr: "Barfiks", category: "calisthenics", bodyPart: "back", equipment: "bodyweight", target: "lats", muscleGroup: "back", secondaries: ["biceps", "rear delts"] },
    { id: "0006", nameEn: "Barbell Row", nameTr: "Barbell Row", category: "weight", bodyPart: "back", equipment: "barbell", target: "middle back", muscleGroup: "back", secondaries: ["lats", "biceps"] },
    { id: "0007", nameEn: "Lat Pulldown", nameTr: "Lat Pulldown", category: "weight", bodyPart: "back", equipment: "cable", target: "lats", muscleGroup: "back", secondaries: ["biceps"] },
    { id: "0008", nameEn: "Face Pull", nameTr: "Face Pull", category: "weight", bodyPart: "shoulders", equipment: "cable", target: "rear deltoid", muscleGroup: "shoulders", secondaries: ["traps"] },
    { id: "0009", nameEn: "Barbell Curl", nameTr: "Barbell Curl", category: "weight", bodyPart: "upper arms", equipment: "barbell", target: "biceps", muscleGroup: "arms", secondaries: ["forearms"] },
    { id: "0010", nameEn: "Back Squat", nameTr: "Arka Squat", category: "weight", bodyPart: "legs", equipment: "barbell", target: "quadriceps", muscleGroup: "legs", secondaries: ["glutes", "hamstrings"] },
    { id: "0011", nameEn: "Romanian Deadlift", nameTr: "Romen Ölü Kaldırma", category: "weight", bodyPart: "legs", equipment: "barbell", target: "hamstrings", muscleGroup: "legs", secondaries: ["glutes", "lower back"] },
    { id: "0012", nameEn: "Leg Press", nameTr: "Leg Press", category: "weight", bodyPart: "legs", equipment: "machine", target: "quadriceps", muscleGroup: "legs", secondaries: ["glutes"] },
    { id: "0013", nameEn: "Walking Lunge", nameTr: "Yürüyen Lunge", category: "weight", bodyPart: "legs", equipment: "dumbbell", target: "quadriceps", muscleGroup: "legs", secondaries: ["glutes", "hamstrings"] },
    { id: "0014", nameEn: "Standing Calf Raise", nameTr: "Ayakta Buzağı", category: "weight", bodyPart: "legs", equipment: "machine", target: "calves", muscleGroup: "legs", secondaries: [] },
    { id: "0015", nameEn: "Deadlift", nameTr: "Ölü Kaldırma", category: "weight", bodyPart: "back", equipment: "barbell", target: "lower back", muscleGroup: "back", secondaries: ["hamstrings", "glutes", "traps"] },
    { id: "0016", nameEn: "Front Squat", nameTr: "Ön Squat", category: "weight", bodyPart: "legs", equipment: "barbell", target: "quadriceps", muscleGroup: "legs", secondaries: ["core", "upper back"] },
    { id: "0017", nameEn: "Bulgarian Split Squat", nameTr: "Bulgar Squat", category: "weight", bodyPart: "legs", equipment: "dumbbell", target: "quadriceps", muscleGroup: "legs", secondaries: ["glutes"] },
    { id: "0018", nameEn: "Lateral Raise", nameTr: "Yan Kaldırma", category: "weight", bodyPart: "shoulders", equipment: "dumbbell", target: "lateral deltoid", muscleGroup: "shoulders", secondaries: [] },
    { id: "0019", nameEn: "Dumbbell Shoulder Press", nameTr: "Dumbbell Omuz Press", category: "weight", bodyPart: "shoulders", equipment: "dumbbell", target: "deltoid", muscleGroup: "shoulders", secondaries: ["triceps"] },
    { id: "0020", nameEn: "Hammer Curl", nameTr: "Çekiç Curl", category: "weight", bodyPart: "upper arms", equipment: "dumbbell", target: "brachialis", muscleGroup: "arms", secondaries: ["biceps", "forearms"] },
    { id: "0021", nameEn: "Preacher Curl", nameTr: "Vaiz Curl", category: "weight", bodyPart: "upper arms", equipment: "barbell", target: "biceps", muscleGroup: "arms", secondaries: [] },
    { id: "0022", nameEn: "Skull Crusher", nameTr: "Kafa Kırıcı", category: "weight", bodyPart: "upper arms", equipment: "barbell", target: "triceps", muscleGroup: "arms", secondaries: [] },
    { id: "0023", nameEn: "Dip", nameTr: "Dip", category: "calisthenics", bodyPart: "chest", equipment: "bodyweight", target: "lower chest", muscleGroup: "chest", secondaries: ["triceps", "front delts"] },
    { id: "0024", nameEn: "Plank", nameTr: "Plank", category: "calisthenics", bodyPart: "waist", equipment: "bodyweight", target: "abs", muscleGroup: "core", secondaries: [] },
    { id: "0025", nameEn: "Hanging Leg Raise", nameTr: "Bacak Kaldırma", category: "calisthenics", bodyPart: "waist", equipment: "bodyweight", target: "lower abs", muscleGroup: "core", secondaries: ["hip flexors"] },
    { id: "0026", nameEn: "Cable Crunch", nameTr: "Cable Crunch", category: "weight", bodyPart: "waist", equipment: "cable", target: "abs", muscleGroup: "core", secondaries: [] },
    { id: "0027", nameEn: "Hip Thrust", nameTr: "Hip Thrust", category: "weight", bodyPart: "legs", equipment: "barbell", target: "glutes", muscleGroup: "legs", secondaries: ["hamstrings"] },
    { id: "0028", nameEn: "Leg Curl", nameTr: "Leg Curl", category: "weight", bodyPart: "legs", equipment: "machine", target: "hamstrings", muscleGroup: "legs", secondaries: [] },
    { id: "0029", nameEn: "Seated Calf Raise", nameTr: "Oturarak Buzağı", category: "weight", bodyPart: "legs", equipment: "machine", target: "calves", muscleGroup: "legs", secondaries: [] },
    { id: "0030", nameEn: "Pec Fly", nameTr: "Göğüs Fly", category: "weight", bodyPart: "chest", equipment: "machine", target: "pectorals", muscleGroup: "chest", secondaries: [] },
  ];

  return specs.map<Exercise>((s) => ({
    id: s.id,
    nameEn: s.nameEn,
    nameTr: s.nameTr,
    category: s.category,
    bodyPart: s.bodyPart,
    equipment: s.equipment,
    target: s.target,
    muscleGroup: s.muscleGroup,
    secondaryMuscles: s.secondaries,
    instructionsEn: null,
    instructionsTr: null,
    instructionStepsEn: [],
    instructionStepsTr: [],
    imageUrl: null,
    gifUrl: null,
    createdAt: now,
  }));
}

// --- food catalog used for seeding ---
type FoodItem = { name: string; kcal: number; p: number; c: number; f: number };
type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

const FOOD_CATALOG: Record<MealKey, FoodItem[]> = {
  breakfast: [
    { name: "Greek yogurt with berries", kcal: 280, p: 22, c: 32, f: 6 },
    { name: "Oatmeal with banana", kcal: 350, p: 11, c: 64, f: 6 },
    { name: "Scrambled eggs + toast", kcal: 420, p: 24, c: 28, f: 22 },
    { name: "Protein smoothie", kcal: 320, p: 35, c: 30, f: 7 },
    { name: "Avocado toast w/ egg", kcal: 380, p: 16, c: 32, f: 22 },
  ],
  lunch: [
    { name: "Grilled chicken salad", kcal: 480, p: 42, c: 22, f: 22 },
    { name: "Salmon rice bowl", kcal: 620, p: 38, c: 65, f: 22 },
    { name: "Turkey wrap", kcal: 520, p: 32, c: 50, f: 18 },
    { name: "Lentil soup + bread", kcal: 460, p: 22, c: 64, f: 12 },
    { name: "Chicken burrito bowl", kcal: 680, p: 44, c: 70, f: 22 },
  ],
  dinner: [
    { name: "Steak with sweet potato", kcal: 720, p: 50, c: 60, f: 28 },
    { name: "Grilled chicken + quinoa", kcal: 580, p: 46, c: 58, f: 14 },
    { name: "Salmon + asparagus", kcal: 540, p: 42, c: 18, f: 30 },
    { name: "Beef stir fry", kcal: 640, p: 44, c: 52, f: 24 },
    { name: "Roast chicken + rice", kcal: 600, p: 48, c: 58, f: 18 },
  ],
  snack: [
    { name: "Apple + peanut butter", kcal: 220, p: 6, c: 28, f: 12 },
    { name: "Whey shake", kcal: 160, p: 28, c: 6, f: 2 },
    { name: "Cottage cheese", kcal: 180, p: 22, c: 10, f: 6 },
    { name: "Mixed nuts", kcal: 200, p: 7, c: 8, f: 16 },
    { name: "Banana", kcal: 105, p: 1, c: 27, f: 0 },
  ],
};

type Meal = MealKey;

function makeBodyMetrics(rng: () => number): BodyMetric[] {
  const rows: BodyMetric[] = [];
  // 90 days, every 2 days, going from 81 → 78kg
  for (let i = 90; i >= 0; i -= 2) {
    const d = new Date();
    d.setHours(7, 30, 0, 0);
    d.setDate(d.getDate() - i);
    const t = i / 90; // 1 → 0 (today)
    const weight = 81 - (1 - t) * 3 + (rng() - 0.5) * 0.4; // gentle cut + noise
    rows.push({
      id: uid(rng),
      userId: USER_ID,
      recordedAt: d,
      weightKg: weight.toFixed(1),
      bodyFatPct: null,
      muscleMassKg: null,
      source: "manual",
    });
  }
  return rows;
}

function makeFoodEntries(rng: () => number): FoodEntry[] {
  const rows: FoodEntry[] = [];
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - dayOffset);

    // 3-4 entries per day
    const meals: Meal[] = ["breakfast", "lunch", "dinner"];
    if (rng() < 0.7) meals.push("snack");

    for (const meal of meals) {
      const item = pick(rng, FOOD_CATALOG[meal]);
      const hour =
        meal === "breakfast" ? 8 + Math.floor(rng() * 2)
          : meal === "lunch" ? 12 + Math.floor(rng() * 2)
          : meal === "dinner" ? 19 + Math.floor(rng() * 2)
          : 15 + Math.floor(rng() * 4);
      const at = new Date(base);
      at.setHours(hour, Math.floor(rng() * 60), 0, 0);
      const jitter = 0.92 + rng() * 0.16;
      rows.push({
        id: uid(rng),
        userId: USER_ID,
        consumedAt: at,
        meal,
        name: item.name,
        kcal: (item.kcal * jitter).toFixed(1),
        proteinG: (item.p * jitter).toFixed(1),
        carbsG: (item.c * jitter).toFixed(1),
        fatG: (item.f * jitter).toFixed(1),
        photoPath: null,
        aiEstimate: null,
        source: "manual",
      });
    }
  }
  return rows;
}

function makePantry(rng: () => number): PantryItem[] {
  const items = [
    { name: "Chicken breast", qty: "1.2", unit: "kg" },
    { name: "Brown rice", qty: "2", unit: "kg" },
    { name: "Eggs", qty: "12", unit: "adet" },
    { name: "Greek yogurt", qty: "1", unit: "kg" },
    { name: "Oats", qty: "500", unit: "g" },
    { name: "Salmon fillet", qty: "400", unit: "g" },
    { name: "Olive oil", qty: "500", unit: "ml" },
    { name: "Almonds", qty: "200", unit: "g" },
    { name: "Blueberries", qty: "150", unit: "g" },
    { name: "Spinach", qty: "200", unit: "g" },
  ];
  const now = new Date();
  return items.map((it) => ({
    id: uid(rng),
    userId: USER_ID,
    name: it.name,
    qty: it.qty,
    unit: it.unit,
    expiresAt: null,
    updatedAt: now,
  }));
}

function makePreferences(rng: () => number): FoodPreference[] {
  const rows: FoodPreference[] = [];
  const liked = ["chicken", "rice", "salmon", "eggs", "greek yogurt", "oats", "berries"];
  const disliked = ["liver", "mushrooms"];
  const allergy = ["shellfish"];
  for (const label of liked)
    rows.push({ id: uid(rng), userId: USER_ID, kind: "liked", label });
  for (const label of disliked)
    rows.push({ id: uid(rng), userId: USER_ID, kind: "disliked", label });
  for (const label of allergy)
    rows.push({ id: uid(rng), userId: USER_ID, kind: "allergy", label });
  return rows;
}

function makeWhoopRecovery(rng: () => number): WhoopRecovery[] {
  const rows: WhoopRecovery[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const score = Math.round(clamp(40 + rng() * 50, 30, 99));
    const hrv = (30 + rng() * 35).toFixed(2);
    const rhr = Math.round(50 + rng() * 12);
    rows.push({
      id: uid(rng),
      userId: USER_ID,
      date: dayKey(d),
      score,
      hrvMs: hrv,
      rhr,
      raw: null,
    });
  }
  return rows;
}

function makeWhoopSleep(rng: () => number): WhoopSleep[] {
  const rows: WhoopSleep[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // sleep starts previous night ~23:00, ends ~07:00
    const start = new Date(d);
    start.setHours(23, Math.floor(rng() * 30), 0, 0);
    start.setDate(start.getDate() - 1);
    const hours = 6.5 + rng() * 2;
    const end = new Date(start.getTime() + hours * 3_600_000);
    const perf = (65 + rng() * 30).toFixed(1);
    rows.push({
      id: uid(rng),
      userId: USER_ID,
      start,
      end,
      score: Math.round(Number(perf)),
      performancePct: perf,
      raw: null,
    });
  }
  return rows;
}

function makeWhoopStrain(rng: () => number): WhoopStrain[] {
  const rows: WhoopStrain[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const score = (8 + rng() * 10).toFixed(2);
    const avgHr = Math.round(70 + rng() * 30);
    const maxHr = Math.round(150 + rng() * 30);
    const kj = (8500 + rng() * 4500).toFixed(1);
    rows.push({
      id: uid(rng),
      userId: USER_ID,
      date: dayKey(d),
      score,
      avgHr,
      maxHr,
      kilojoules: kj,
      raw: null,
    });
  }
  return rows;
}

function makeWorkouts(rng: () => number): {
  workouts: Workout[];
  sets: WorkoutSet[];
  whoopWorkouts: WhoopWorkout[];
} {
  const workouts: Workout[] = [];
  const sets: WorkoutSet[] = [];
  const whoopWorkouts: WhoopWorkout[] = [];

  // PPL split
  const PUSH = ["0001", "0019", "0018", "0004", "0030"]; // bench/ohp etc
  const PULL = ["0005", "0006", "0007", "0009", "0008"]; // pull-up, row...
  const LEGS = ["0010", "0011", "0012", "0017", "0014"];
  const days = [PUSH, PULL, LEGS];

  // 12 sessions across last 30 days, ~every 2.5 days
  for (let n = 0; n < 12; n++) {
    const dayOffset = Math.round(n * 2.5);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (29 - dayOffset));
    start.setHours(17 + Math.floor(rng() * 2), Math.floor(rng() * 60), 0, 0);
    const end = new Date(start.getTime() + (55 + rng() * 25) * 60_000);
    const wid = uid(rng);
    workouts.push({
      id: wid,
      userId: USER_ID,
      programId: null,
      programDayId: null,
      startedAt: start,
      endedAt: end,
      notes: null,
      source: "manual",
    });

    const exs = days[n % 3];
    for (const exId of exs) {
      const setCount = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < setCount; i++) {
        const baseReps = 8 + Math.floor(rng() * 4);
        const baseW = 30 + Math.floor(rng() * 70);
        sets.push({
          id: uid(rng),
          workoutId: wid,
          exerciseId: exId,
          setIndex: i,
          reps: baseReps,
          weightKg: baseW.toFixed(2),
          rpe: 7 + Math.floor(rng() * 3),
          completedAt: new Date(start.getTime() + (i + 1) * 6 * 60_000),
        });
      }
    }

    // matching whoop workout
    whoopWorkouts.push({
      id: uid(rng),
      userId: USER_ID,
      whoopId: `whoop-${wid.slice(0, 8)}`,
      sport: "weightlifting",
      start,
      end,
      strain: (8 + rng() * 8).toFixed(2),
      hrZones: null,
      raw: null,
    });
  }

  return { workouts, sets, whoopWorkouts };
}

function makePrograms(rng: () => number): {
  programs: Program[];
  programDays: ProgramDay[];
  programExercises: ProgramExercise[];
} {
  const now = new Date();
  const programs: Program[] = [];
  const programDays: ProgramDay[] = [];
  const programExercises: ProgramExercise[] = [];

  // Program 1: PPL
  const pplId = uid(rng);
  programs.push({
    id: pplId,
    userId: USER_ID,
    name: "Push / Pull / Legs",
    description: "Classic 6-day hypertrophy split. Push on Mon/Thu, Pull on Tue/Fri, Legs on Wed/Sat.",
    isTemplate: false,
    createdAt: now,
  });

  const pplSpec: { name: string; exs: string[] }[] = [
    { name: "Push", exs: ["0001", "0019", "0018", "0022", "0004"] },
    { name: "Pull", exs: ["0006", "0007", "0009", "0020", "0008"] },
    { name: "Legs", exs: ["0010", "0011", "0028", "0017", "0014"] },
  ];

  pplSpec.forEach((day, dayIdx) => {
    const dayId = uid(rng);
    programDays.push({
      id: dayId,
      programId: pplId,
      dayIndex: dayIdx,
      name: day.name,
    });
    day.exs.forEach((exId, exIdx) => {
      programExercises.push({
        id: uid(rng),
        programDayId: dayId,
        exerciseId: exId,
        orderIndex: exIdx,
        targetSets: 4,
        targetReps: 10,
        targetWeightKg: null,
        notes: null,
      });
    });
  });

  // Program 2: Upper/Lower
  const ulId = uid(rng);
  programs.push({
    id: ulId,
    userId: USER_ID,
    name: "Upper / Lower 4-Day",
    description: "Balanced 4-day intermediate routine. Heavy upper Mon/Thu, lower Tue/Fri.",
    isTemplate: false,
    createdAt: now,
  });

  const ulSpec: { name: string; exs: string[] }[] = [
    { name: "Upper A", exs: ["0001", "0006", "0019", "0009", "0022"] },
    { name: "Lower A", exs: ["0010", "0011", "0028", "0014"] },
    { name: "Upper B", exs: ["0002", "0007", "0003", "0020", "0004"] },
    { name: "Lower B", exs: ["0015", "0012", "0027", "0029"] },
  ];

  ulSpec.forEach((day, dayIdx) => {
    const dayId = uid(rng);
    programDays.push({
      id: dayId,
      programId: ulId,
      dayIndex: dayIdx,
      name: day.name,
    });
    day.exs.forEach((exId, exIdx) => {
      programExercises.push({
        id: uid(rng),
        programDayId: dayId,
        exerciseId: exId,
        orderIndex: exIdx,
        targetSets: 4,
        targetReps: 8,
        targetWeightKg: null,
        notes: null,
      });
    });
  });

  return { programs, programDays, programExercises };
}

export type DemoState = {
  profile: Profile;
  bodyMetrics: BodyMetric[];
  foodEntries: FoodEntry[];
  foodPreferences: FoodPreference[];
  pantryItems: PantryItem[];
  workouts: Workout[];
  workoutSets: WorkoutSet[];
  programs: Program[];
  programDays: ProgramDay[];
  programExercises: ProgramExercise[];
  whoopRecovery: WhoopRecovery[];
  whoopSleep: WhoopSleep[];
  whoopStrain: WhoopStrain[];
  whoopWorkouts: WhoopWorkout[];
  exercises: Exercise[];
  mealPlans: MealPlan[];
  shoppingLists: ShoppingList[];
  aiMessages: AiMessage[];
  whoopConnected: boolean;
  whoopEnabled: boolean;
};

export function buildSeed(): DemoState {
  const rng = makeRng(SEED);

  const profile: Profile = {
    userId: USER_ID,
    displayName: "Demo User",
    heightCm: "178.0",
    weightKg: "78.4",
    age: 28,
    sex: "m",
    activityLevel: "moderate",
    goal: "cut",
    targetWeightKg: "75.0",
    whoopEnabled: true,
    locale: "en",
    updatedAt: new Date(),
  };

  const wk = makeWorkouts(rng);
  const pg = makePrograms(rng);

  return {
    profile,
    bodyMetrics: makeBodyMetrics(rng),
    foodEntries: makeFoodEntries(rng),
    foodPreferences: makePreferences(rng),
    pantryItems: makePantry(rng),
    workouts: wk.workouts,
    workoutSets: wk.sets,
    programs: pg.programs,
    programDays: pg.programDays,
    programExercises: pg.programExercises,
    whoopRecovery: makeWhoopRecovery(rng),
    whoopSleep: makeWhoopSleep(rng),
    whoopStrain: makeWhoopStrain(rng),
    whoopWorkouts: wk.whoopWorkouts,
    exercises: buildExercises(),
    mealPlans: [],
    shoppingLists: [],
    aiMessages: [],
    whoopConnected: true,
    whoopEnabled: true,
  };
}

export { USER_ID as DEMO_USER_ID };

// Helper used by store to generate IDs in mutations.
export function generateId(): string {
  // No determinism needed for user-created rows.
  const rng = makeRng(Date.now() ^ Math.floor(Math.random() * 1e9));
  return uid(rng);
}
