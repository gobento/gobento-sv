CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_account_id" text NOT NULL,
	"business_account_id" text NOT NULL,
	"target_type" text NOT NULL,
	"offer_id" text,
	"location_id" text,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporter_account_id_accounts_id_fk" FOREIGN KEY ("reporter_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_account_id_accounts_id_fk" FOREIGN KEY ("resolved_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
