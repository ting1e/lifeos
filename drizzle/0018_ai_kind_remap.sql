-- Remap historical ai_messages kinds to the new task taxonomy.
-- 'plan' stays as-is: it covered both meal and workout plans and cannot be
-- retroactively distinguished. The legacy enum values remain valid.
UPDATE "ai_messages" SET "kind" = 'audio_meal_parse' WHERE "kind" = 'freeform';--> statement-breakpoint
UPDATE "ai_messages" SET "kind" = 'weekly_insights' WHERE "kind" = 'insights';
