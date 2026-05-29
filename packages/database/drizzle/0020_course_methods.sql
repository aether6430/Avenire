CREATE TABLE IF NOT EXISTS "method" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_map" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "method_id" uuid NOT NULL REFERENCES "method"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "subject" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_map_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_map_id" uuid NOT NULL REFERENCES "course_map"("id") ON DELETE cascade,
  "version_number" integer NOT NULL,
  "snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_method" (
  "method_id" uuid PRIMARY KEY REFERENCES "method"("id") ON DELETE cascade,
  "active_course_map_id" uuid REFERENCES "course_map"("id") ON DELETE set null,
  "current_version_id" uuid REFERENCES "course_map_version"("id") ON DELETE set null,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_map_node" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_map_id" uuid NOT NULL REFERENCES "course_map"("id") ON DELETE cascade,
  "current_version_id" uuid NOT NULL REFERENCES "course_map_version"("id") ON DELETE cascade,
  "parent_id" uuid,
  "title" text NOT NULL,
  "node_type" text DEFAULT 'topic' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "exam_weight" real DEFAULT 0 NOT NULL,
  "user_priority" real DEFAULT 0 NOT NULL,
  "estimated_effort_minutes" integer,
  "difficulty" real,
  "prerequisite_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "grounding_state" text DEFAULT 'ai_suggested' NOT NULL,
  "verification_state" text DEFAULT 'needs_review' NOT NULL,
  "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "taxonomy_subject" text,
  "taxonomy_topic" text,
  "taxonomy_concept" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "study_sprint" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_map_id" uuid NOT NULL REFERENCES "course_map"("id") ON DELETE cascade,
  "course_map_version_id" uuid NOT NULL REFERENCES "course_map_version"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "deadline" timestamp with time zone NOT NULL,
  "daily_time_budget_minutes" integer DEFAULT 60 NOT NULL,
  "target_readiness" real DEFAULT 0.8 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sprint_plan_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "study_sprint"("id") ON DELETE cascade,
  "course_map_node_id" uuid NOT NULL REFERENCES "course_map_node"("id") ON DELETE cascade,
  "planned_for" timestamp with time zone NOT NULL,
  "estimated_minutes" integer NOT NULL,
  "item_type" text NOT NULL,
  "status" text DEFAULT 'proposed' NOT NULL,
  "rationale" text NOT NULL,
  "linked_task_id" uuid REFERENCES "task"("id") ON DELETE set null,
  "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_map_patch" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_map_id" uuid NOT NULL REFERENCES "course_map"("id") ON DELETE cascade,
  "base_version_id" uuid NOT NULL REFERENCES "course_map_version"("id") ON DELETE cascade,
  "proposed_by" text DEFAULT 'ai' NOT NULL,
  "reason" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "operations" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "learning_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "course_method_id" uuid NOT NULL REFERENCES "method"("id") ON DELETE cascade,
  "course_map_id" uuid NOT NULL REFERENCES "course_map"("id") ON DELETE cascade,
  "course_map_version_id" uuid NOT NULL REFERENCES "course_map_version"("id") ON DELETE cascade,
  "course_map_node_id" uuid NOT NULL REFERENCES "course_map_node"("id") ON DELETE cascade,
  "sprint_id" uuid REFERENCES "study_sprint"("id") ON DELETE set null,
  "source_type" text NOT NULL,
  "source_table" text,
  "source_id" text,
  "direction" text NOT NULL,
  "evidence_strength" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "method_workspace_type_updated_idx" ON "method" ("workspace_id", "type", "updated_at");
CREATE INDEX IF NOT EXISTS "method_user_status_idx" ON "method" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "course_map_method_idx" ON "course_map" ("method_id");
CREATE INDEX IF NOT EXISTS "course_map_workspace_status_idx" ON "course_map" ("workspace_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "course_map_version_map_number_uidx" ON "course_map_version" ("course_map_id", "version_number");
CREATE INDEX IF NOT EXISTS "course_map_version_map_created_idx" ON "course_map_version" ("course_map_id", "created_at");
CREATE INDEX IF NOT EXISTS "course_method_active_map_idx" ON "course_method" ("active_course_map_id");
CREATE INDEX IF NOT EXISTS "course_method_current_version_idx" ON "course_method" ("current_version_id");
CREATE INDEX IF NOT EXISTS "course_map_node_map_parent_order_idx" ON "course_map_node" ("course_map_id", "parent_id", "sort_order");
CREATE INDEX IF NOT EXISTS "course_map_node_version_idx" ON "course_map_node" ("current_version_id");
CREATE INDEX IF NOT EXISTS "course_map_node_taxonomy_idx" ON "course_map_node" ("taxonomy_subject", "taxonomy_topic", "taxonomy_concept");
CREATE INDEX IF NOT EXISTS "study_sprint_map_status_idx" ON "study_sprint" ("course_map_id", "status");
CREATE INDEX IF NOT EXISTS "study_sprint_workspace_user_status_idx" ON "study_sprint" ("workspace_id", "user_id", "status");
CREATE INDEX IF NOT EXISTS "sprint_plan_item_sprint_status_idx" ON "sprint_plan_item" ("sprint_id", "status");
CREATE INDEX IF NOT EXISTS "sprint_plan_item_node_idx" ON "sprint_plan_item" ("course_map_node_id");
CREATE INDEX IF NOT EXISTS "sprint_plan_item_task_idx" ON "sprint_plan_item" ("linked_task_id");
CREATE INDEX IF NOT EXISTS "course_map_patch_map_status_idx" ON "course_map_patch" ("course_map_id", "status");
CREATE INDEX IF NOT EXISTS "course_map_patch_base_version_idx" ON "course_map_patch" ("base_version_id");
CREATE INDEX IF NOT EXISTS "learning_event_node_observed_idx" ON "learning_event" ("course_map_node_id", "observed_at");
CREATE INDEX IF NOT EXISTS "learning_event_sprint_observed_idx" ON "learning_event" ("sprint_id", "observed_at");
CREATE INDEX IF NOT EXISTS "learning_event_source_idx" ON "learning_event" ("source_table", "source_id");
