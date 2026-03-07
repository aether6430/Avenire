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
ALTER TABLE "billing_customer" ADD CONSTRAINT "billing_customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD CONSTRAINT "billing_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_meter" ADD CONSTRAINT "usage_meter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_customer_polar_customer_idx" ON "billing_customer" USING btree ("polar_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscription_polar_subscription_uidx" ON "billing_subscription" USING btree ("polar_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_subscription_status_idx" ON "billing_subscription" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_meter_user_meter_uidx" ON "usage_meter" USING btree ("user_id","meter");--> statement-breakpoint
CREATE INDEX "usage_meter_user_idx" ON "usage_meter" USING btree ("user_id");