CREATE TABLE IF NOT EXISTS "workspace" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_organization_id_organization_id_fk'
  ) THEN
    ALTER TABLE "workspace"
      ADD CONSTRAINT "workspace_organization_id_organization_id_fk"
      FOREIGN KEY ("organization_id")
      REFERENCES "public"."organization"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_organization_id_uidx" ON "workspace" USING btree ("organization_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "file_folder" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "parent_id" uuid,
  "name" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_folder_workspace_id_workspace_id_fk'
  ) THEN
    ALTER TABLE "file_folder"
      ADD CONSTRAINT "file_folder_workspace_id_workspace_id_fk"
      FOREIGN KEY ("workspace_id")
      REFERENCES "public"."workspace"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_folder_parent_id_file_folder_id_fk'
  ) THEN
    ALTER TABLE "file_folder"
      ADD CONSTRAINT "file_folder_parent_id_file_folder_id_fk"
      FOREIGN KEY ("parent_id")
      REFERENCES "public"."file_folder"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_folder_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "file_folder"
      ADD CONSTRAINT "file_folder_created_by_user_id_fk"
      FOREIGN KEY ("created_by")
      REFERENCES "public"."user"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_folder_workspace_parent_idx" ON "file_folder" USING btree ("workspace_id", "parent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_folder_workspace_name_idx" ON "file_folder" USING btree ("workspace_id", "name");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "file_asset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "folder_id" uuid NOT NULL,
  "storage_key" text NOT NULL,
  "storage_url" text NOT NULL,
  "name" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer NOT NULL,
  "uploaded_by" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_asset_workspace_id_workspace_id_fk'
  ) THEN
    ALTER TABLE "file_asset"
      ADD CONSTRAINT "file_asset_workspace_id_workspace_id_fk"
      FOREIGN KEY ("workspace_id")
      REFERENCES "public"."workspace"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_asset_folder_id_file_folder_id_fk'
  ) THEN
    ALTER TABLE "file_asset"
      ADD CONSTRAINT "file_asset_folder_id_file_folder_id_fk"
      FOREIGN KEY ("folder_id")
      REFERENCES "public"."file_folder"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_asset_uploaded_by_user_id_fk'
  ) THEN
    ALTER TABLE "file_asset"
      ADD CONSTRAINT "file_asset_uploaded_by_user_id_fk"
      FOREIGN KEY ("uploaded_by")
      REFERENCES "public"."user"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_asset_workspace_folder_idx" ON "file_asset" USING btree ("workspace_id", "folder_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "file_asset_workspace_storage_key_uidx" ON "file_asset" USING btree ("workspace_id", "storage_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_share_grant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "grantee_user_id" text NOT NULL,
  "permission" text DEFAULT 'read' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_share_grant_workspace_id_workspace_id_fk'
  ) THEN
    ALTER TABLE "resource_share_grant"
      ADD CONSTRAINT "resource_share_grant_workspace_id_workspace_id_fk"
      FOREIGN KEY ("workspace_id")
      REFERENCES "public"."workspace"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_share_grant_grantee_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "resource_share_grant"
      ADD CONSTRAINT "resource_share_grant_grantee_user_id_user_id_fk"
      FOREIGN KEY ("grantee_user_id")
      REFERENCES "public"."user"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_share_grant_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "resource_share_grant"
      ADD CONSTRAINT "resource_share_grant_created_by_user_id_fk"
      FOREIGN KEY ("created_by")
      REFERENCES "public"."user"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resource_share_grant_unique" ON "resource_share_grant" USING btree ("resource_type", "resource_id", "grantee_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_share_grant_workspace_idx" ON "resource_share_grant" USING btree ("workspace_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_share_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "permission" text DEFAULT 'read' NOT NULL,
  "allow_public" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_share_link_workspace_id_workspace_id_fk'
  ) THEN
    ALTER TABLE "resource_share_link"
      ADD CONSTRAINT "resource_share_link_workspace_id_workspace_id_fk"
      FOREIGN KEY ("workspace_id")
      REFERENCES "public"."workspace"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_share_link_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "resource_share_link"
      ADD CONSTRAINT "resource_share_link_created_by_user_id_fk"
      FOREIGN KEY ("created_by")
      REFERENCES "public"."user"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resource_share_link_token_hash_uidx" ON "resource_share_link" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_share_link_resource_idx" ON "resource_share_link" USING btree ("resource_type", "resource_id");
