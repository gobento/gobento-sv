CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"account_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);

CREATE TABLE "admin_profiles" (
	"account_id" text PRIMARY KEY NOT NULL
);

CREATE TABLE "business_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_account_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"province" text,
	"zip_code" text NOT NULL,
	"country" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"image_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"business_account_id" text NOT NULL,
	"location_id" text,
	"image_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"original_value" double precision NOT NULL,
	"price" double precision NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"valid_until" timestamp with time zone,
	"quantity" integer DEFAULT 1 NOT NULL,
	"pickup_time_from" time NOT NULL,
	"pickup_time_until" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_profiles" (
	"account_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"country" text NOT NULL,
	"business_type" text NOT NULL,
	"profile_picture_id" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by_account_id" text
);

CREATE TABLE "business_wallets" (
	"account_id" text PRIMARY KEY NOT NULL,
	"iban_number" text,
	"iban_enabled" boolean DEFAULT false NOT NULL,
	"iban_confirmed" boolean DEFAULT false NOT NULL,
	"tether_address" text,
	"tether_enabled" boolean DEFAULT false NOT NULL,
	"tether_confirmed" boolean DEFAULT false NOT NULL,
	"preferred_payment_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "charity_food_preferences" (
	"charity_account_id" text NOT NULL,
	"food_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charity_food_preferences_charity_account_id_food_type_pk" PRIMARY KEY("charity_account_id","food_type")
);

CREATE TABLE "charity_profiles" (
	"account_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"country" text NOT NULL,
	"profile_picture_id" text NOT NULL,
	"registration_number" text NOT NULL,
	"contact_email" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by_account_id" text
);

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

CREATE TABLE "employees" (
	"account_id" text PRIMARY KEY NOT NULL,
	"employer_account_id" text NOT NULL,
	"location_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "favorite_locations" (
	"account_id" text NOT NULL,
	"location_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_locations_account_id_location_id_pk" PRIMARY KEY("account_id","location_id")
);

CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);

CREATE TABLE "monthly_settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"business_account_id" text NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL,
	"iban_total_amount" double precision DEFAULT 0 NOT NULL,
	"iban_payment_count" integer DEFAULT 0 NOT NULL,
	"iban_currency" text,
	"tether_total_amount" double precision DEFAULT 0 NOT NULL,
	"tether_payment_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"iban_paid_at" timestamp with time zone,
	"iban_transaction_ref" text,
	"iban_payout_error" text,
	"tether_paid_at" timestamp with time zone,
	"tether_tx_hash" text,
	"tether_payout_error" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"ntfy_topic" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL
);

CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text,
	"offer_id" text,
	"user_account_id" text,
	"business_account_id" text,
	"payment_method" text NOT NULL,
	"amount" double precision,
	"currency" text,
	"outcome" text NOT NULL,
	"reason" text,
	"is_mock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"user_account_id" text NOT NULL,
	"business_account_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"amount_usdt" double precision,
	"payment_method" text NOT NULL,
	"fee_amount" double precision NOT NULL,
	"business_amount" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"iban_reference" text,
	"tether_tx_hash" text,
	"tether_from_address" text,
	"is_mock" boolean DEFAULT false NOT NULL,
	"reservation_id" text,
	"metadata" text,
	"error_message" text,
	"settlement_id" text,
	"payout_status" text DEFAULT 'pending_payout' NOT NULL,
	"paid_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);

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
	"recurring_gift_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);

CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"ntfy_topic" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_notified_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_ntfy_topic_unique" UNIQUE("ntfy_topic")
);

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

CREATE TABLE "reservation_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"claimed_by_account_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "reservation_claims_reservation_id_unique" UNIQUE("reservation_id")
);

CREATE TABLE "reservation_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"invited_by_account_id" text NOT NULL,
	"invited_account_id" text,
	"user_id" text,
	"invite_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reservation_invites_invite_token_unique" UNIQUE("invite_token")
);

CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"user_account_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pickup_from" timestamp with time zone NOT NULL,
	"pickup_until" timestamp with time zone NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"claim_token" text NOT NULL,
	"notes" text,
	CONSTRAINT "reservations_claim_token_unique" UNIQUE("claim_token")
);

CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "settlement_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"settlement_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"business_amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"payment_method" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_payments_payment_id_unique" UNIQUE("payment_id")
);

CREATE TABLE "telemetry_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"route" text,
	"method" text,
	"status" integer,
	"duration_ms" integer,
	"name" text,
	"value" real,
	"message" text,
	"stack" text,
	"error_id" text,
	"account_type" text,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_profiles" (
	"account_id" text PRIMARY KEY NOT NULL,
	"iban_number" text,
	"iban_enabled" boolean DEFAULT false NOT NULL,
	"iban_confirmed" boolean DEFAULT false NOT NULL,
	"tether_address" text,
	"tether_enabled" boolean DEFAULT false NOT NULL,
	"tether_confirmed" boolean DEFAULT false NOT NULL,
	"preferred_payment_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_image_id_files_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "business_offers" ADD CONSTRAINT "business_offers_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_offers" ADD CONSTRAINT "business_offers_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_offers" ADD CONSTRAINT "business_offers_image_id_files_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_profile_picture_id_files_id_fk" FOREIGN KEY ("profile_picture_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_verified_by_account_id_accounts_id_fk" FOREIGN KEY ("verified_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "business_wallets" ADD CONSTRAINT "business_wallets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "charity_food_preferences" ADD CONSTRAINT "charity_food_preferences_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "charity_profiles" ADD CONSTRAINT "charity_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "charity_profiles" ADD CONSTRAINT "charity_profiles_profile_picture_id_files_id_fk" FOREIGN KEY ("profile_picture_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "charity_profiles" ADD CONSTRAINT "charity_profiles_verified_by_account_id_accounts_id_fk" FOREIGN KEY ("verified_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporter_account_id_accounts_id_fk" FOREIGN KEY ("reporter_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_account_id_accounts_id_fk" FOREIGN KEY ("resolved_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "employees" ADD CONSTRAINT "employees_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employees" ADD CONSTRAINT "employees_employer_account_id_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_accounts_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_account_id_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_account_id_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_settlement_id_monthly_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."monthly_settlements"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_recurring_gift_id_recurring_gifts_id_fk" FOREIGN KEY ("recurring_gift_id") REFERENCES "public"."recurring_gifts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_charity_account_id_accounts_id_fk" FOREIGN KEY ("charity_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recurring_gifts" ADD CONSTRAINT "recurring_gifts_location_id_business_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."business_locations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reservation_claims" ADD CONSTRAINT "reservation_claims_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservation_claims" ADD CONSTRAINT "reservation_claims_claimed_by_account_id_accounts_id_fk" FOREIGN KEY ("claimed_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservation_invites" ADD CONSTRAINT "reservation_invites_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservation_invites" ADD CONSTRAINT "reservation_invites_invited_by_account_id_accounts_id_fk" FOREIGN KEY ("invited_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservation_invites" ADD CONSTRAINT "reservation_invites_invited_account_id_accounts_id_fk" FOREIGN KEY ("invited_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservation_invites" ADD CONSTRAINT "reservation_invites_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_account_id_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_claimed_by_accounts_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_settlement_id_monthly_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."monthly_settlements"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "pickup_requests_gift_occurrence_idx" ON "pickup_requests" USING btree ("recurring_gift_id","proposed_pickup_from");
CREATE INDEX "telemetry_events_kind_created_idx" ON "telemetry_events" USING btree ("kind","created_at");
