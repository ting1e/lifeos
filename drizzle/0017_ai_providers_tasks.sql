CREATE TYPE "public"."ai_provider_protocol" AS ENUM('openai_compatible');--> statement-breakpoint
CREATE TYPE "public"."ai_task" AS ENUM('meal_parse', 'food_vision', 'audio_meal_parse', 'weekly_insights', 'meal_plan', 'workout_plan', 'nutrition_lookup');--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'meal_parse';--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'audio_meal_parse';--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'weekly_insights';--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'meal_plan';--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'workout_plan';--> statement-breakpoint
ALTER TYPE "public"."ai_kind" ADD VALUE IF NOT EXISTS 'nutrition_lookup';--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text,
	"protocol" "ai_provider_protocol" DEFAULT 'openai_compatible' NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_task_configs" (
	"user_id" uuid NOT NULL,
	"task" "ai_task" NOT NULL,
	"provider_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"reasoning_effort" text,
	"max_tokens" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_task_configs_user_id_task_pk" PRIMARY KEY("user_id","task")
);
--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_task_configs" ADD CONSTRAINT "ai_task_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_task_configs" ADD CONSTRAINT "ai_task_configs_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_providers_user_idx" ON "ai_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_task_configs_provider_idx" ON "ai_task_configs" USING btree ("provider_id");--> statement-breakpoint
-- ------------------------------------------------------------------
-- Legacy config conversion: profile.ai_* (text/image/audio modality)
-- -> one Default provider + per-modality providers + task configs.
-- ------------------------------------------------------------------
INSERT INTO "ai_providers" ("user_id", "name", "base_url", "api_key", "protocol", "models", "enabled")
SELECT
  p."user_id",
  'Default',
  p."ai_base_url",
  p."ai_api_key",
  'openai_compatible',
  (
    SELECT COALESCE(jsonb_agg(DISTINCT m ORDER BY m), '[]'::jsonb)
    FROM (VALUES
      (p."ai_text_model"),
      (CASE WHEN p."ai_image_base_url" IS NULL OR p."ai_image_base_url" = p."ai_base_url" THEN p."ai_image_model" END),
      (CASE WHEN p."ai_audio_base_url" IS NULL OR p."ai_audio_base_url" = p."ai_base_url" THEN p."ai_audio_model" END)
    ) AS v(m)
    WHERE m IS NOT NULL
  ),
  true
FROM "profile" p
WHERE p."ai_base_url" IS NOT NULL;--> statement-breakpoint
INSERT INTO "ai_providers" ("user_id", "name", "base_url", "api_key", "protocol", "models", "enabled")
SELECT
  p."user_id",
  'Image',
  COALESCE(p."ai_image_base_url", p."ai_base_url", ''),
  COALESCE(p."ai_image_api_key", p."ai_api_key"),
  'openai_compatible',
  CASE WHEN p."ai_image_model" IS NOT NULL THEN jsonb_build_array(p."ai_image_model") ELSE '[]'::jsonb END,
  true
FROM "profile" p
WHERE (p."ai_image_base_url" IS NOT NULL AND p."ai_image_base_url" IS DISTINCT FROM p."ai_base_url")
   OR (p."ai_image_api_key" IS NOT NULL AND p."ai_image_api_key" IS DISTINCT FROM p."ai_api_key");--> statement-breakpoint
INSERT INTO "ai_providers" ("user_id", "name", "base_url", "api_key", "protocol", "models", "enabled")
SELECT
  p."user_id",
  'Audio',
  COALESCE(p."ai_audio_base_url", p."ai_base_url", ''),
  COALESCE(p."ai_audio_api_key", p."ai_api_key"),
  'openai_compatible',
  CASE WHEN p."ai_audio_model" IS NOT NULL THEN jsonb_build_array(p."ai_audio_model") ELSE '[]'::jsonb END,
  true
FROM "profile" p
WHERE (p."ai_audio_base_url" IS NOT NULL AND p."ai_audio_base_url" IS DISTINCT FROM p."ai_base_url")
   OR (p."ai_audio_api_key" IS NOT NULL AND p."ai_audio_api_key" IS DISTINCT FROM p."ai_api_key");--> statement-breakpoint
INSERT INTO "ai_task_configs" ("user_id", "task", "provider_id", "model_id", "reasoning_effort", "max_tokens")
SELECT p."user_id", t.task::"ai_task", def."id", p."ai_text_model", p."ai_text_reasoning", p."ai_text_max_tokens"
FROM "profile" p
JOIN "ai_providers" def ON def."user_id" = p."user_id" AND def."name" = 'Default'
CROSS JOIN (VALUES ('meal_parse'), ('weekly_insights'), ('meal_plan'), ('workout_plan'), ('nutrition_lookup')) AS t(task)
WHERE p."ai_text_model" IS NOT NULL;--> statement-breakpoint
INSERT INTO "ai_task_configs" ("user_id", "task", "provider_id", "model_id", "reasoning_effort", "max_tokens")
SELECT
  p."user_id",
  'food_vision'::"ai_task",
  COALESCE(img."id", def."id"),
  p."ai_image_model",
  p."ai_image_reasoning",
  p."ai_image_max_tokens"
FROM "profile" p
LEFT JOIN "ai_providers" img ON img."user_id" = p."user_id" AND img."name" = 'Image'
LEFT JOIN "ai_providers" def ON def."user_id" = p."user_id" AND def."name" = 'Default'
WHERE p."ai_image_model" IS NOT NULL
  AND COALESCE(img."id", def."id") IS NOT NULL;--> statement-breakpoint
INSERT INTO "ai_task_configs" ("user_id", "task", "provider_id", "model_id", "reasoning_effort", "max_tokens")
SELECT
  p."user_id",
  'audio_meal_parse'::"ai_task",
  COALESCE(aud."id", def."id"),
  p."ai_audio_model",
  p."ai_audio_reasoning",
  p."ai_audio_max_tokens"
FROM "profile" p
LEFT JOIN "ai_providers" aud ON aud."user_id" = p."user_id" AND aud."name" = 'Audio'
LEFT JOIN "ai_providers" def ON def."user_id" = p."user_id" AND def."name" = 'Default'
WHERE p."ai_audio_model" IS NOT NULL
  AND COALESCE(aud."id", def."id") IS NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_base_url";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_api_key";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_text_model";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_image_model";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_audio_model";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_image_base_url";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_image_api_key";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_audio_base_url";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_audio_api_key";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_text_reasoning";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_text_max_tokens";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_image_reasoning";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_image_max_tokens";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_audio_reasoning";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "ai_audio_max_tokens";
