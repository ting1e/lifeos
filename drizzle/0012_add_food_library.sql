CREATE TABLE IF NOT EXISTS "food_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kcal" numeric(7,1),
	"protein_g" numeric(6,1),
	"carbs_g" numeric(6,1),
	"fat_g" numeric(6,1),
	"photo_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_library_user_idx" ON "food_library" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'food_library_user_id_users_id_fk') THEN
    ALTER TABLE "food_library" ADD CONSTRAINT "food_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
