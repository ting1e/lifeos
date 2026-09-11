ALTER TABLE "profile" ADD COLUMN "ai_image_base_url" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_image_api_key" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_audio_base_url" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_audio_api_key" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_text_reasoning" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_text_max_tokens" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_image_reasoning" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_image_max_tokens" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_audio_reasoning" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "ai_audio_max_tokens" integer;