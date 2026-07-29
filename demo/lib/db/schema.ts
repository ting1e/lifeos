// Demo schema: plain TypeScript types that mirror the production Drizzle
// schema's `$inferSelect` shape. Numeric (decimal) Drizzle columns come back
// as strings — we preserve that here so the rest of the app's `Number(...)`
// calls behave identically.
//
// The real app's `lib/db/schema.ts` uses Drizzle's pgTable/$inferSelect.
// In the demo we don't have drizzle-orm installed; everything reads/writes
// the localStorage-backed in-memory store.

export type Role = "admin";
export type Locale = "tr" | "en";
export type Sex = "m" | "f";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "cut" | "maintain" | "bulk";
export type MetricSource = "manual" | "whoop";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "manual" | "ai_photo";
export type PreferenceKind = "liked" | "disliked" | "allergy";
export type WorkoutSource = "manual" | "whoop";
export type AiKind = "food_vision" | "plan" | "insights" | "freeform";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  locale: Locale;
  createdAt: Date;
};
export type NewUser = Partial<User> & Pick<User, "email" | "passwordHash">;

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  heightCm: string | null;
  weightKg: string | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  targetWeightKg: string | null;
  whoopEnabled: boolean;
  locale: "en" | "tr";
  updatedAt: Date;
};

export type BodyMetric = {
  id: string;
  userId: string;
  recordedAt: Date;
  weightKg: string | null;
  bodyFatPct: string | null;
  muscleMassKg: string | null;
  source: MetricSource;
};

export type Exercise = {
  id: string;
  nameEn: string;
  nameTr: string | null;
  category: string | null;
  bodyPart: string | null;
  equipment: string | null;
  target: string | null;
  muscleGroup: string | null;
  secondaryMuscles: string[] | null;
  instructionsEn: string | null;
  instructionsTr: string | null;
  instructionStepsEn: string[] | null;
  instructionStepsTr: string[] | null;
  imageUrl: string | null;
  gifUrl: string | null;
  createdAt: Date;
};

export type Program = {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  isTemplate: boolean;
  createdAt: Date;
};

export type ProgramDay = {
  id: string;
  programId: string;
  dayIndex: number;
  name: string;
};

export type ProgramExercise = {
  id: string;
  programDayId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: string | null;
  notes: string | null;
};

export type Workout = {
  id: string;
  userId: string;
  programId: string | null;
  programDayId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  notes: string | null;
  source: WorkoutSource;
};

export type WorkoutSet = {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weightKg: string | null;
  rpe: number | null;
  completedAt: Date;
};

export type FoodEntry = {
  id: string;
  userId: string;
  consumedAt: Date;
  meal: Meal;
  name: string;
  kcal: string | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  photoPath: string | null;
  aiEstimate: unknown;
  source: FoodSource;
};

export type FoodPreference = {
  id: string;
  userId: string;
  kind: PreferenceKind;
  label: string;
};

export type PantryItem = {
  id: string;
  userId: string;
  name: string;
  qty: string | null;
  unit: string | null;
  expiresAt: string | null;
  updatedAt: Date;
};

export type MealPlan = {
  id: string;
  userId: string;
  startsOn: string;
  endsOn: string;
  goalSnapshot: unknown;
  plan: unknown;
  createdAt: Date;
};

export type ShoppingList = {
  id: string;
  mealPlanId: string;
  items: unknown;
  createdAt: Date;
};

export type WhoopRecovery = {
  id: string;
  userId: string;
  date: string;
  score: number | null;
  hrvMs: string | null;
  rhr: number | null;
  raw: unknown;
};

export type WhoopSleep = {
  id: string;
  userId: string;
  start: Date;
  end: Date;
  score: number | null;
  performancePct: string | null;
  raw: unknown;
};

export type WhoopStrain = {
  id: string;
  userId: string;
  date: string;
  score: string | null;
  avgHr: number | null;
  maxHr: number | null;
  kilojoules: string | null;
  raw: unknown;
};

export type WhoopWorkout = {
  id: string;
  userId: string;
  whoopId: string;
  sport: string | null;
  start: Date;
  end: Date;
  strain: string | null;
  hrZones: unknown;
  raw: unknown;
};

export type AiMessage = {
  id: string;
  userId: string;
  kind: AiKind;
  prompt: unknown;
  response: unknown;
  model: string | null;
  costCents: string | null;
  errorMsg: string | null;
  createdAt: Date;
};
