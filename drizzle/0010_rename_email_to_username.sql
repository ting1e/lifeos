ALTER TABLE "users" RENAME COLUMN "email" TO "username";--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "users_email_unique" TO "users_username_unique";
