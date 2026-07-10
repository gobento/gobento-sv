CREATE TABLE "charity_food_preferences" (
	"charity_account_id" text NOT NULL,
	"food_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charity_food_preferences_charity_account_id_food_type_pk" PRIMARY KEY("charity_account_id","food_type")
);
--> statement-breakpoint
CREATE TABLE "pickup_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"business_account_id" text NOT NULL,
	"charity_account_id" text NOT NULL,
	"location_id" text,
	"offer_id" text,
	"food_type" text,
	"message" text NOT NULL,
	"proposed_pickup_from" timestamp with time zone,
	"proposed_pickup_until" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"reservation_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "charity_food_preferences" ADD CONSTRAINT "charity_food_preferences_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;
