CREATE TABLE "billing_usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"meter" text NOT NULL,
	"units" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_usage_event_idempotency_uidx" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "billing_usage_event" ADD CONSTRAINT "billing_usage_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "billing_usage_event_delivery_idx" ON "billing_usage_event" USING btree ("delivered_at","next_attempt_at");
--> statement-breakpoint
CREATE INDEX "billing_usage_event_user_meter_idx" ON "billing_usage_event" USING btree ("user_id","meter");
