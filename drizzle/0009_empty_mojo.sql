ALTER TYPE "public"."metric_source" ADD VALUE IF NOT EXISTS 'apple_health';--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "health_sync_token" text;--> statement-breakpoint
DELETE FROM "body_metrics" a USING "body_metrics" b WHERE a.ctid < b.ctid AND a."user_id" = b."user_id" AND a."recorded_at" = b."recorded_at" AND a."source" = b."source";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "body_metrics_user_recorded_source_uniq" ON "body_metrics" USING btree ("user_id","recorded_at","source");