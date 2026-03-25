CREATE TABLE "billing_customer" (
	"user_id" text PRIMARY KEY NOT NULL,
	"polar_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customer_polar_customer_id_unique" UNIQUE("polar_customer_id")
);
--> statement-breakpoint
CREATE TABLE "billing_subscription" (
	"user_id" text PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'access' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"polar_subscription_id" text,
	"polar_product_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"position" integer NOT NULL,
	"role" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"branching" text,
	"title" text NOT NULL,
	"icon" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_thread_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "concept_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"concept" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"positive_review_count" integer DEFAULT 0 NOT NULL,
	"negative_review_count" integer DEFAULT 0 NOT NULL,
	"active_misconception_count" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"last_misconception_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text NOT NULL,
	"optimized_storage_key" text,
	"optimized_storage_url" text,
	"optimized_name" text,
	"optimized_mime_type" text,
	"optimized_size_bytes" integer,
	"name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash_sha256" text,
	"hash_computed_by" text,
	"hash_verification_status" text,
	"hash_verified_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "file_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"banner_url" text,
	"icon_color" text,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "file_transcript_cue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" text DEFAULT 'flashcard' NOT NULL,
	"front_markdown" text NOT NULL,
	"back_markdown" text NOT NULL,
	"notes_markdown" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "flashcard_review_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"previous_state" text,
	"next_state" text NOT NULL,
	"previous_stability" real,
	"next_stability" real,
	"previous_difficulty" real,
	"next_difficulty" real,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_review_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"state" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"stability" real,
	"difficulty" real,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_rating" text,
	"scheduler_version" integer DEFAULT 1 NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_chat_slug" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_set_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"new_cards_per_day" integer DEFAULT 20 NOT NULL,
	"last_studied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"kind" text DEFAULT 'generic' NOT NULL,
	"content" text NOT NULL,
	"search_vector" "tsvector" DEFAULT ''::tsvector NOT NULL,
	"page" integer,
	"start_ms" integer,
	"end_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"source_type" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_job_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid,
	"source_type" text NOT NULL,
	"source" text NOT NULL,
	"provider" text,
	"title" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_lock" (
	"name" text PRIMARY KEY NOT NULL,
	"locked_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "misconception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"concept" text NOT NULL,
	"reason" text NOT NULL,
	"source" text DEFAULT 'review' NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"evidence_count" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_content" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"needs_reindex" boolean DEFAULT false NOT NULL,
	"last_indexed_at" timestamp with time zone,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_share_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"grantee_user_id" text NOT NULL,
	"permission" text DEFAULT 'viewer' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_share_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"permission" text DEFAULT 'viewer' NOT NULL,
	"allow_public" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"subject" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"start_position" integer DEFAULT 0 NOT NULL,
	"end_position" integer DEFAULT 0 NOT NULL,
	"concepts_covered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"misconceptions_detected" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flashcards_created" integer DEFAULT 0 NOT NULL,
	"summary_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sudo_challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal',
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_meter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"meter" text NOT NULL,
	"four_hour_capacity" integer NOT NULL,
	"four_hour_balance" integer NOT NULL,
	"four_hour_refill_at" timestamp with time zone NOT NULL,
	"overage_capacity" integer NOT NULL,
	"overage_balance" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_receipts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_customer" ADD CONSTRAINT "billing_customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD CONSTRAINT "billing_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chat_id_chat_thread_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_folder_id_file_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."file_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_folder" ADD CONSTRAINT "file_folder_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_folder" ADD CONSTRAINT "file_folder_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_folder" ADD CONSTRAINT "file_folder_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_transcript_cue" ADD CONSTRAINT "file_transcript_cue_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_transcript_cue" ADD CONSTRAINT "file_transcript_cue_file_id_file_asset_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_card" ADD CONSTRAINT "flashcard_card_set_id_flashcard_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."flashcard_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_card" ADD CONSTRAINT "flashcard_card_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_card" ADD CONSTRAINT "flashcard_card_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD CONSTRAINT "flashcard_review_log_flashcard_id_flashcard_card_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcard_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD CONSTRAINT "flashcard_review_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_state" ADD CONSTRAINT "flashcard_review_state_flashcard_id_flashcard_card_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcard_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_state" ADD CONSTRAINT "flashcard_review_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_set" ADD CONSTRAINT "flashcard_set_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_set" ADD CONSTRAINT "flashcard_set_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_set" ADD CONSTRAINT "flashcard_set_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_set_enrollment" ADD CONSTRAINT "flashcard_set_enrollment_set_id_flashcard_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."flashcard_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_set_enrollment" ADD CONSTRAINT "flashcard_set_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_chunk" ADD CONSTRAINT "ingestion_chunk_resource_id_ingestion_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."ingestion_resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_embedding" ADD CONSTRAINT "ingestion_embedding_chunk_id_ingestion_chunk_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."ingestion_chunk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_file_id_file_asset_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job_event" ADD CONSTRAINT "ingestion_job_event_job_id_ingestion_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ingestion_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job_event" ADD CONSTRAINT "ingestion_job_event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_resource" ADD CONSTRAINT "ingestion_resource_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_resource" ADD CONSTRAINT "ingestion_resource_file_id_file_asset_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misconception" ADD CONSTRAINT "misconception_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misconception" ADD CONSTRAINT "misconception_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_content" ADD CONSTRAINT "note_content_file_id_file_asset_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_content" ADD CONSTRAINT "note_content_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_share_grant" ADD CONSTRAINT "resource_share_grant_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_share_grant" ADD CONSTRAINT "resource_share_grant_grantee_user_id_user_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_share_grant" ADD CONSTRAINT "resource_share_grant_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_share_link" ADD CONSTRAINT "resource_share_link_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_share_link" ADD CONSTRAINT "resource_share_link_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_chat_id_chat_thread_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sudo_challenge" ADD CONSTRAINT "sudo_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_meter" ADD CONSTRAINT "usage_meter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_customer_polar_customer_idx" ON "billing_customer" USING btree ("polar_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscription_polar_subscription_uidx" ON "billing_subscription" USING btree ("polar_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_subscription_status_idx" ON "billing_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chat_message_chat_id_idx" ON "chat_message" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "chat_message_chat_position_idx" ON "chat_message" USING btree ("chat_id","position");--> statement-breakpoint
CREATE INDEX "chat_thread_workspace_last_message_idx" ON "chat_thread" USING btree ("workspace_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_thread_user_id_idx" ON "chat_thread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_thread_branching_idx" ON "chat_thread" USING btree ("branching");--> statement-breakpoint
CREATE INDEX "chat_thread_user_last_message_idx" ON "chat_thread" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "concept_mastery_workspace_user_subject_topic_concept_uidx" ON "concept_mastery" USING btree ("workspace_id","user_id","subject","topic","concept");--> statement-breakpoint
CREATE INDEX "concept_mastery_user_subject_idx" ON "concept_mastery" USING btree ("user_id","subject");--> statement-breakpoint
CREATE INDEX "concept_mastery_workspace_subject_idx" ON "concept_mastery" USING btree ("workspace_id","subject");--> statement-breakpoint
CREATE INDEX "file_asset_workspace_folder_idx" ON "file_asset" USING btree ("workspace_id","folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "file_asset_workspace_storage_key_uidx" ON "file_asset" USING btree ("workspace_id","storage_key");--> statement-breakpoint
CREATE INDEX "file_asset_workspace_hash_idx" ON "file_asset" USING btree ("workspace_id","content_hash_sha256");--> statement-breakpoint
CREATE INDEX "file_folder_workspace_parent_idx" ON "file_folder" USING btree ("workspace_id","parent_id");--> statement-breakpoint
CREATE INDEX "file_folder_workspace_name_idx" ON "file_folder" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "file_transcript_cue_workspace_file_idx" ON "file_transcript_cue" USING btree ("workspace_id","file_id");--> statement-breakpoint
CREATE INDEX "file_transcript_cue_file_time_idx" ON "file_transcript_cue" USING btree ("file_id","start_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_card_set_ordinal_uidx" ON "flashcard_card" USING btree ("set_id","ordinal");--> statement-breakpoint
CREATE INDEX "flashcard_card_set_archived_ordinal_idx" ON "flashcard_card" USING btree ("set_id","archived_at","ordinal");--> statement-breakpoint
CREATE INDEX "flashcard_review_log_user_reviewed_idx" ON "flashcard_review_log" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_log_card_reviewed_idx" ON "flashcard_review_log" USING btree ("flashcard_id","reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_review_state_card_user_uidx" ON "flashcard_review_state" USING btree ("flashcard_id","user_id");--> statement-breakpoint
CREATE INDEX "flashcard_review_state_user_due_idx" ON "flashcard_review_state" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_state_user_suspended_due_idx" ON "flashcard_review_state" USING btree ("user_id","suspended","due_at");--> statement-breakpoint
CREATE INDEX "flashcard_set_workspace_created_idx" ON "flashcard_set" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "flashcard_set_workspace_archived_idx" ON "flashcard_set" USING btree ("workspace_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_set_enrollment_set_user_uidx" ON "flashcard_set_enrollment" USING btree ("set_id","user_id");--> statement-breakpoint
CREATE INDEX "flashcard_set_enrollment_user_status_idx" ON "flashcard_set_enrollment" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ingestion_chunk_resource_idx" ON "ingestion_chunk" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "ingestion_chunk_search_vector_idx" ON "ingestion_chunk" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_chunk_resource_order_uidx" ON "ingestion_chunk" USING btree ("resource_id","chunk_index");--> statement-breakpoint
CREATE INDEX "ingestion_embedding_chunk_idx" ON "ingestion_embedding" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "ingestion_embedding_model_idx" ON "ingestion_embedding" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ingestion_job_workspace_idx" ON "ingestion_job" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ingestion_job_file_idx" ON "ingestion_job" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "ingestion_job_status_idx" ON "ingestion_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingestion_job_status_created_idx" ON "ingestion_job" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ingestion_job_event_job_idx" ON "ingestion_job_event" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ingestion_job_event_workspace_created_idx" ON "ingestion_job_event" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_resource_workspace_source_uidx" ON "ingestion_resource" USING btree ("workspace_id","source_type","source");--> statement-breakpoint
CREATE INDEX "ingestion_resource_workspace_idx" ON "ingestion_resource" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ingestion_resource_file_idx" ON "ingestion_resource" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "maintenance_lock_heartbeat_idx" ON "maintenance_lock" USING btree ("heartbeat_at");--> statement-breakpoint
CREATE UNIQUE INDEX "misconception_workspace_user_subject_topic_concept_uidx" ON "misconception" USING btree ("workspace_id","user_id","subject","topic","concept");--> statement-breakpoint
CREATE INDEX "misconception_user_active_idx" ON "misconception" USING btree ("user_id","active","last_seen_at");--> statement-breakpoint
CREATE INDEX "misconception_workspace_subject_active_idx" ON "misconception" USING btree ("workspace_id","subject","active");--> statement-breakpoint
CREATE INDEX "note_content_needs_reindex_idx" ON "note_content" USING btree ("needs_reindex");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_share_grant_unique" ON "resource_share_grant" USING btree ("resource_type","resource_id","grantee_user_id");--> statement-breakpoint
CREATE INDEX "resource_share_grant_workspace_idx" ON "resource_share_grant" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_share_link_token_hash_uidx" ON "resource_share_link" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "resource_share_link_resource_idx" ON "resource_share_link" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "session_summary_user_ended_idx" ON "session_summaries" USING btree ("user_id","ended_at");--> statement-breakpoint
CREATE INDEX "session_summary_chat_ended_idx" ON "session_summaries" USING btree ("chat_id","ended_at");--> statement-breakpoint
CREATE INDEX "session_summary_workspace_subject_ended_idx" ON "session_summaries" USING btree ("workspace_id","subject","ended_at");--> statement-breakpoint
CREATE INDEX "sudo_challenge_user_created_idx" ON "sudo_challenge" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "task_workspace_user_idx" ON "task" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "task_user_status_idx" ON "task" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "task_user_due_idx" ON "task" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_meter_user_meter_uidx" ON "usage_meter" USING btree ("user_id","meter");--> statement-breakpoint
CREATE INDEX "usage_meter_user_idx" ON "usage_meter" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_organization_id_uidx" ON "workspace" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");