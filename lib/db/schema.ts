import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const roleEnum = pgEnum("role", ["admin"]);
export const localeEnum = pgEnum("locale", ["tr", "en", "zh"]);
export const sexEnum = pgEnum("sex", ["m", "f"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const goalEnum = pgEnum("goal", ["cut", "maintain", "bulk"]);
export const metricSourceEnum = pgEnum("metric_source", ["manual", "whoop"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack"]);
export const foodSourceEnum = pgEnum("food_source", ["manual", "ai_photo"]);
export const preferenceKindEnum = pgEnum("preference_kind", [
  "liked",
  "disliked",
  "allergy",
]);
export const workoutSourceEnum = pgEnum("workout_source", ["manual", "whoop"]);
export const aiKindEnum = pgEnum("ai_kind", [
  "food_vision",
  "plan",
  "insights",
  "freeform",
]);

// ============================================================
// USERS + SESSIONS
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("admin"),
  locale: localeEnum("locale").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

// ============================================================
// PROFILE + BODY METRICS
// ============================================================

export const profile = pgTable("profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
  age: integer("age"),
  sex: sexEnum("sex"),
  activityLevel: activityLevelEnum("activity_level"),
  goal: goalEnum("goal"),
  targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 1 }),
  whoopEnabled: boolean("whoop_enabled").notNull().default(true),
  aiBaseUrl: text("ai_base_url"),
  aiApiKey: text("ai_api_key"),
  aiTextModel: text("ai_text_model"),
  aiImageModel: text("ai_image_model"),
  aiAudioModel: text("ai_audio_model"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
    muscleMassKg: numeric("muscle_mass_kg", { precision: 5, scale: 1 }),
    source: metricSourceEnum("source").notNull().default("manual"),
  },
  (t) => ({
    userTimeIdx: index("body_metrics_user_time_idx").on(t.userId, t.recordedAt),
  }),
);

// ============================================================
// EXERCISES (seeded from dataset)
// ============================================================

export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(), // dataset id e.g. "0001"
    nameEn: text("name_en").notNull(),
    nameTr: text("name_tr"),
    category: text("category"),
    bodyPart: text("body_part"),
    equipment: text("equipment"),
    target: text("target"),
    muscleGroup: text("muscle_group"),
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().default([]),
    instructionsEn: text("instructions_en"),
    instructionsTr: text("instructions_tr"),
    instructionStepsEn: jsonb("instruction_steps_en").$type<string[]>().default([]),
    instructionStepsTr: jsonb("instruction_steps_tr").$type<string[]>().default([]),
    imageUrl: text("image_url"),
    gifUrl: text("gif_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bodyPartIdx: index("exercises_body_part_idx").on(t.bodyPart),
    targetIdx: index("exercises_target_idx").on(t.target),
    equipmentIdx: index("exercises_equipment_idx").on(t.equipment),
  }),
);

// ============================================================
// PROGRAMS
// ============================================================

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = global template
  name: text("name").notNull(),
  description: text("description"),
  isTemplate: boolean("is_template").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programDays = pgTable(
  "program_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    name: text("name").notNull(),
  },
  (t) => ({
    programIdx: index("program_days_program_idx").on(t.programId),
    uniq: unique("program_days_unique").on(t.programId, t.dayIndex),
  }),
);

export const programExercises = pgTable(
  "program_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programDayId: uuid("program_day_id")
      .notNull()
      .references(() => programDays.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull(),
    targetSets: integer("target_sets"),
    targetReps: integer("target_reps"),
    targetWeightKg: numeric("target_weight_kg", { precision: 6, scale: 2 }),
    notes: text("notes"),
  },
  (t) => ({
    dayIdx: index("program_exercises_day_idx").on(t.programDayId),
  }),
);

// ============================================================
// WORKOUTS (logged sessions)
// ============================================================

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
    programDayId: uuid("program_day_id").references(() => programDays.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    notes: text("notes"),
    source: workoutSourceEnum("source").notNull().default("manual"),
  },
  (t) => ({
    userStartIdx: index("workouts_user_started_idx").on(t.userId, t.startedAt),
  }),
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    rpe: smallint("rpe"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    workoutIdx: index("workout_sets_workout_idx").on(t.workoutId, t.setIndex),
    exerciseIdx: index("workout_sets_exercise_idx").on(t.exerciseId, t.completedAt),
  }),
);

// ============================================================
// FOOD
// ============================================================

export const foodEntries = pgTable(
  "food_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }).notNull().defaultNow(),
    meal: mealEnum("meal").notNull().default("snack"),
    name: text("name").notNull(),
    kcal: numeric("kcal", { precision: 7, scale: 1 }),
    proteinG: numeric("protein_g", { precision: 6, scale: 1 }),
    carbsG: numeric("carbs_g", { precision: 6, scale: 1 }),
    fatG: numeric("fat_g", { precision: 6, scale: 1 }),
    photoPath: text("photo_path"),
    aiEstimate: jsonb("ai_estimate"),
    source: foodSourceEnum("source").notNull().default("manual"),
  },
  (t) => ({
    userTimeIdx: index("food_entries_user_time_idx").on(t.userId, t.consumedAt),
  }),
);

export const foodPreferences = pgTable(
  "food_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: preferenceKindEnum("kind").notNull(),
    label: text("label").notNull(),
  },
  (t) => ({
    uniq: unique("food_preferences_unique").on(t.userId, t.kind, t.label),
  }),
);

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    qty: numeric("qty", { precision: 8, scale: 2 }),
    unit: text("unit"),
    expiresAt: date("expires_at"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdx: index("pantry_user_idx").on(t.userId),
  }),
);

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  goalSnapshot: jsonb("goal_snapshot"),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  mealPlanId: uuid("meal_plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// WHOOP
// ============================================================

export const whoopTokens = pgTable("whoop_tokens", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  athleteId: text("athlete_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const whoopRecovery = pgTable(
  "whoop_recovery",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    score: integer("score"),
    hrvMs: numeric("hrv_ms", { precision: 6, scale: 2 }),
    rhr: integer("rhr"),
    raw: jsonb("raw"),
  },
  (t) => ({
    uniq: unique("whoop_recovery_user_date").on(t.userId, t.date),
  }),
);

export const whoopSleep = pgTable(
  "whoop_sleep",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    score: integer("score"),
    performancePct: numeric("performance_pct", { precision: 4, scale: 1 }),
    raw: jsonb("raw"),
  },
  (t) => ({
    userStartIdx: index("whoop_sleep_user_start_idx").on(t.userId, t.start),
    uniq: unique("whoop_sleep_user_start").on(t.userId, t.start),
  }),
);

export const whoopStrain = pgTable(
  "whoop_strain",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    score: numeric("score", { precision: 4, scale: 2 }),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    kilojoules: numeric("kilojoules", { precision: 8, scale: 1 }),
    raw: jsonb("raw"),
  },
  (t) => ({
    uniq: unique("whoop_strain_user_date").on(t.userId, t.date),
  }),
);

export const whoopWorkouts = pgTable(
  "whoop_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    whoopId: text("whoop_id").notNull().unique(),
    sport: text("sport"),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    strain: numeric("strain", { precision: 4, scale: 2 }),
    hrZones: jsonb("hr_zones"),
    raw: jsonb("raw"),
  },
  (t) => ({
    userStartIdx: index("whoop_workouts_user_start_idx").on(t.userId, t.start),
  }),
);

// ============================================================
// AI LOG
// ============================================================

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: aiKindEnum("kind").notNull(),
    prompt: jsonb("prompt").notNull(),
    response: jsonb("response"),
    model: text("model"),
    costCents: numeric("cost_cents", { precision: 10, scale: 4 }),
    errorMsg: text("error_msg"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userKindIdx: index("ai_messages_user_kind_idx").on(t.userId, t.kind, t.createdAt),
  }),
);

// ============================================================
// TYPE EXPORTS
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type ProgramDay = typeof programDays.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type FoodPreference = typeof foodPreferences.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type WhoopRecovery = typeof whoopRecovery.$inferSelect;
export type WhoopSleep = typeof whoopSleep.$inferSelect;
export type WhoopStrain = typeof whoopStrain.$inferSelect;
export type WhoopWorkout = typeof whoopWorkouts.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
