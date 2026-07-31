ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "name_zh" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "instructions_zh" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "instruction_steps_zh" jsonb DEFAULT '[]'::jsonb;