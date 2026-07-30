ALTER TABLE "exercises" ADD COLUMN "name_zh" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "instructions_zh" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "instruction_steps_zh" jsonb DEFAULT '[]'::jsonb;