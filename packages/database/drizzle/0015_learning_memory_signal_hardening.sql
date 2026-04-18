CREATE TABLE IF NOT EXISTS "misconception_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"misconception_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"evidence_key" text NOT NULL,
	"evidence_class" text DEFAULT 'session' NOT NULL,
	"evidence_root_id" text,
	"source_session_id" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"evidence_span" jsonb,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "misconception_evidence" ADD CONSTRAINT "misconception_evidence_misconception_id_misconception_id_fk" FOREIGN KEY ("misconception_id") REFERENCES "public"."misconception"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "misconception_evidence" ADD CONSTRAINT "misconception_evidence_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "misconception_evidence" ADD CONSTRAINT "misconception_evidence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "misconception_evidence_misconception_key_uidx" ON "misconception_evidence" USING btree ("misconception_id","evidence_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "misconception_evidence_misconception_observed_idx" ON "misconception_evidence" USING btree ("misconception_id","observed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "misconception_evidence_workspace_user_observed_idx" ON "misconception_evidence" USING btree ("workspace_id","user_id","observed_at");
--> statement-breakpoint

UPDATE "flashcard_card"
SET "source" = jsonb_set(
	jsonb_set("source", '{subject}', '"Biology"'::jsonb, true),
	'{topic}',
	'"Biomolecules"'::jsonb,
	true
)
WHERE lower(coalesce("source" ->> 'subject', '')) = 'physics'
  AND (
	lower(coalesce("source" ->> 'topic', '')) LIKE '%amino acid%'
	OR lower(coalesce("source" ->> 'topic', '')) LIKE '%biomolecule%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%amino acid%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%biomolecule%'
  );
--> statement-breakpoint

UPDATE "flashcard_card"
SET "source" = jsonb_set(
	jsonb_set("source", '{subject}', '"Chemistry"'::jsonb, true),
	'{topic}',
	'"Thermochemistry"'::jsonb,
	true
)
WHERE lower(coalesce("source" ->> 'subject', '')) = 'physics'
  AND (
	lower(coalesce("source" ->> 'topic', '')) LIKE '%thermochemistry%'
	OR lower(coalesce("source" ->> 'topic', '')) LIKE '%gibbs%'
	OR lower(coalesce("source" ->> 'topic', '')) LIKE '%enthalpy%'
	OR lower(coalesce("source" ->> 'topic', '')) LIKE '%entropy%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%thermochemistry%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%gibbs%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%enthalpy%'
	OR lower(coalesce("source" ->> 'concept', '')) LIKE '%entropy%'
  );
--> statement-breakpoint

UPDATE "misconception"
SET "subject" = 'Biology',
	"topic" = 'Biomolecules'
WHERE lower("subject") = 'physics'
  AND (
	lower("topic") LIKE '%amino acid%'
	OR lower("topic") LIKE '%biomolecule%'
	OR lower("concept") LIKE '%amino acid%'
	OR lower("concept") LIKE '%biomolecule%'
  );
--> statement-breakpoint

UPDATE "misconception"
SET "subject" = 'Chemistry',
	"topic" = 'Thermochemistry'
WHERE lower("subject") = 'physics'
  AND (
	lower("topic") LIKE '%thermochemistry%'
	OR lower("topic") LIKE '%gibbs%'
	OR lower("topic") LIKE '%enthalpy%'
	OR lower("topic") LIKE '%entropy%'
	OR lower("concept") LIKE '%thermochemistry%'
	OR lower("concept") LIKE '%gibbs%'
	OR lower("concept") LIKE '%enthalpy%'
	OR lower("concept") LIKE '%entropy%'
  );
--> statement-breakpoint

UPDATE "concept_mastery"
SET "subject" = 'Biology',
	"topic" = 'Biomolecules'
WHERE lower("subject") = 'physics'
  AND (
	lower("topic") LIKE '%amino acid%'
	OR lower("topic") LIKE '%biomolecule%'
	OR lower("concept") LIKE '%amino acid%'
	OR lower("concept") LIKE '%biomolecule%'
  );
--> statement-breakpoint

UPDATE "concept_mastery"
SET "subject" = 'Chemistry',
	"topic" = 'Thermochemistry'
WHERE lower("subject") = 'physics'
  AND (
	lower("topic") LIKE '%thermochemistry%'
	OR lower("topic") LIKE '%gibbs%'
	OR lower("topic") LIKE '%enthalpy%'
	OR lower("topic") LIKE '%entropy%'
	OR lower("concept") LIKE '%thermochemistry%'
	OR lower("concept") LIKE '%gibbs%'
	OR lower("concept") LIKE '%enthalpy%'
	OR lower("concept") LIKE '%entropy%'
  );
--> statement-breakpoint

UPDATE "flashcard_card"
SET "source" = jsonb_set(
	"source",
	'{subject}',
	to_jsonb(
		CASE lower(coalesce("source" ->> 'subject', ''))
			WHEN 'biology' THEN 'Biology'
			WHEN 'chemistry' THEN 'Chemistry'
			WHEN 'computer science' THEN 'Computer Science'
			WHEN 'economics' THEN 'Economics'
			WHEN 'electronics' THEN 'Electronics'
			WHEN 'history' THEN 'History'
			WHEN 'mathematics' THEN 'Mathematics'
			WHEN 'physics' THEN 'Physics'
			ELSE coalesce("source" ->> 'subject', '')
		END::text
	),
	true
)
WHERE lower(coalesce("source" ->> 'subject', '')) IN (
	'biology',
	'chemistry',
	'computer science',
	'economics',
	'electronics',
	'history',
	'mathematics',
	'physics'
);
--> statement-breakpoint

UPDATE "misconception"
SET "subject" = CASE lower("subject")
	WHEN 'biology' THEN 'Biology'
	WHEN 'chemistry' THEN 'Chemistry'
	WHEN 'computer science' THEN 'Computer Science'
	WHEN 'economics' THEN 'Economics'
	WHEN 'electronics' THEN 'Electronics'
	WHEN 'history' THEN 'History'
	WHEN 'mathematics' THEN 'Mathematics'
	WHEN 'physics' THEN 'Physics'
	ELSE "subject"
END
WHERE lower("subject") IN (
	'biology',
	'chemistry',
	'computer science',
	'economics',
	'electronics',
	'history',
	'mathematics',
	'physics'
);
--> statement-breakpoint

UPDATE "concept_mastery"
SET "subject" = CASE lower("subject")
	WHEN 'biology' THEN 'Biology'
	WHEN 'chemistry' THEN 'Chemistry'
	WHEN 'computer science' THEN 'Computer Science'
	WHEN 'economics' THEN 'Economics'
	WHEN 'electronics' THEN 'Electronics'
	WHEN 'history' THEN 'History'
	WHEN 'mathematics' THEN 'Mathematics'
	WHEN 'physics' THEN 'Physics'
	ELSE "subject"
END
WHERE lower("subject") IN (
	'biology',
	'chemistry',
	'computer science',
	'economics',
	'electronics',
	'history',
	'mathematics',
	'physics'
);
