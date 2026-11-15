CREATE TABLE "recurring_gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_account_id" text NOT NULL,
	"charity_account_id" text NOT NULL,
	"location_id" text,
	"food_type" text,
	"message" text NOT NULL,
	"frequency" text NOT NULL,
	"weekday" integer,
	"day_of_month" integer,
	"pickup_time_from" time NOT NULL,
	"pickup_time_until" time NOT NULL,
	"time_zone" text NOT NULL,
	"starts_on" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"next_occurrence_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"account_id" text PRIMARY KEY NOT NULL,
	"employer_account_id" text NOT NULL,
	"location_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "recurring_gift_id" text;--> statement-breakpoint
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employer_account_id_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_recurring_gift_id_recurring_gifts_id_fk" FOREIGN KEY ("recurring_gift_id") REFERENCES "public"."recurring_gifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pickup_requests_gift_occurrence_idx" ON "pickup_requests" USING btree ("recurring_gift_id","proposed_pickup_from");
