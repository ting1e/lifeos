CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."ai_kind" AS ENUM('food_vision', 'plan', 'insights', 'freeform');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('manual', 'ai_photo');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('cut', 'maintain', 'bulk');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('tr', 'en', 'zh');--> statement-breakpoint
CREATE TYPE "public"."meal" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."metric_source" AS ENUM('manual', 'whoop');--> statement-breakpoint
CREATE TYPE "public"."preference_kind" AS ENUM('liked', 'disliked', 'allergy');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('m', 'f');--> statement-breakpoint
CREATE TYPE "public"."workout_source" AS ENUM('manual', 'whoop');--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "ai_kind" NOT NULL,
	"prompt" jsonb NOT NULL,
	"response" jsonb,
	"model" text,
	"cost_cents" numeric(10, 4),
	"error_msg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weight_kg" numeric(5, 1),
	"body_fat_pct" numeric(4, 1),
	"muscle_mass_kg" numeric(5, 1),
	"source" "metric_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"category" text,
	"body_part" text,
	"equipment" text,
	"target" text,
	"muscle_group" text,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb,
	"instructions_en" text,
	"instructions_tr" text,
	"image_url" text,
	"gif_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meal" "meal" DEFAULT 'snack' NOT NULL,
	"name" text NOT NULL,
	"kcal" numeric(7, 1),
	"protein_g" numeric(6, 1),
	"carbs_g" numeric(6, 1),
	"fat_g" numeric(6, 1),
	"photo_path" text,
	"ai_estimate" jsonb,
	"source" "food_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "preference_kind" NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "food_preferences_unique" UNIQUE("user_id","kind","label")
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"goal_snapshot" jsonb,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"qty" numeric(8, 2),
	"unit" text,
	"expires_at" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"height_cm" numeric(5, 1),
	"weight_kg" numeric(5, 1),
	"age" integer,
	"sex" "sex",
	"activity_level" "activity_level",
	"goal" "goal",
	"target_weight_kg" numeric(5, 1),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "program_days_unique" UNIQUE("program_id","day_index")
);
--> statement-breakpoint
CREATE TABLE "program_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_day_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"target_sets" integer,
	"target_reps" integer,
	"target_weight_kg" numeric(6, 2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_plan_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'admin' NOT NULL,
	"locale" "locale" DEFAULT 'tr' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whoop_recovery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"score" integer,
	"hrv_ms" numeric(6, 2),
	"rhr" integer,
	"raw" jsonb,
	CONSTRAINT "whoop_recovery_user_date" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "whoop_sleep" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"score" integer,
	"performance_pct" numeric(4, 1),
	"raw" jsonb,
	CONSTRAINT "whoop_sleep_user_start" UNIQUE("user_id","start")
);
--> statement-breakpoint
CREATE TABLE "whoop_strain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"score" numeric(4, 2),
	"avg_hr" integer,
	"max_hr" integer,
	"kilojoules" numeric(8, 1),
	"raw" jsonb,
	CONSTRAINT "whoop_strain_user_date" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "whoop_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"athlete_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whoop_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"whoop_id" text NOT NULL,
	"sport" text,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"strain" numeric(4, 2),
	"hr_zones" jsonb,
	"raw" jsonb,
	CONSTRAINT "whoop_workouts_whoop_id_unique" UNIQUE("whoop_id")
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"set_index" integer NOT NULL,
	"reps" integer,
	"weight_kg" numeric(6, 2),
	"rpe" smallint,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid,
	"program_day_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text,
	"source" "workout_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_preferences" ADD CONSTRAINT "food_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_program_day_id_program_days_id_fk" FOREIGN KEY ("program_day_id") REFERENCES "public"."program_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_recovery" ADD CONSTRAINT "whoop_recovery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_sleep" ADD CONSTRAINT "whoop_sleep_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_strain" ADD CONSTRAINT "whoop_strain_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_tokens" ADD CONSTRAINT "whoop_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_workouts" ADD CONSTRAINT "whoop_workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_program_day_id_program_days_id_fk" FOREIGN KEY ("program_day_id") REFERENCES "public"."program_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_messages_user_kind_idx" ON "ai_messages" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "body_metrics_user_time_idx" ON "body_metrics" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "exercises_body_part_idx" ON "exercises" USING btree ("body_part");--> statement-breakpoint
CREATE INDEX "exercises_target_idx" ON "exercises" USING btree ("target");--> statement-breakpoint
CREATE INDEX "exercises_equipment_idx" ON "exercises" USING btree ("equipment");--> statement-breakpoint
CREATE INDEX "food_entries_user_time_idx" ON "food_entries" USING btree ("user_id","consumed_at");--> statement-breakpoint
CREATE INDEX "pantry_user_idx" ON "pantry_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "program_days_program_idx" ON "program_days" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "program_exercises_day_idx" ON "program_exercises" USING btree ("program_day_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "whoop_sleep_user_start_idx" ON "whoop_sleep" USING btree ("user_id","start");--> statement-breakpoint
CREATE INDEX "whoop_workouts_user_start_idx" ON "whoop_workouts" USING btree ("user_id","start");--> statement-breakpoint
CREATE INDEX "workout_sets_workout_idx" ON "workout_sets" USING btree ("workout_id","set_index");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_idx" ON "workout_sets" USING btree ("exercise_id","completed_at");--> statement-breakpoint
CREATE INDEX "workouts_user_started_idx" ON "workouts" USING btree ("user_id","started_at");