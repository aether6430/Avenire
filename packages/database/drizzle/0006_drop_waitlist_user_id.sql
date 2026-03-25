ALTER TABLE "waitlist" DROP CONSTRAINT IF EXISTS "waitlist_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "waitlist_user_id_idx";
--> statement-breakpoint
ALTER TABLE "waitlist" DROP COLUMN IF EXISTS "user_id";
