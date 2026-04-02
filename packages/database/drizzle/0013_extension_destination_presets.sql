CREATE TABLE IF NOT EXISTS "extension_destination_preset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "workspace_id" uuid NOT NULL,
  "organization_id" text NOT NULL,
  "folder_id" uuid NOT NULL,
  "label" text NOT NULL,
  "workspace_name" text NOT NULL,
  "folder_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_destination_preset" ADD CONSTRAINT "extension_destination_preset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_destination_preset" ADD CONSTRAINT "extension_destination_preset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_destination_preset" ADD CONSTRAINT "extension_destination_preset_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_destination_preset" ADD CONSTRAINT "extension_destination_preset_folder_id_file_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."file_folder"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extension_destination_preset_user_updated_idx" ON "extension_destination_preset" USING btree ("user_id","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extension_destination_preset_workspace_idx" ON "extension_destination_preset" USING btree ("workspace_id");
