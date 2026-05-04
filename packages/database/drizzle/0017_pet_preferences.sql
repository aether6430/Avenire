ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "pet_name" text DEFAULT 'Auri' NOT NULL;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "pet_accessory" text DEFAULT 'none' NOT NULL;
