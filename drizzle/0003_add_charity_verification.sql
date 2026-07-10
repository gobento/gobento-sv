ALTER TABLE "charity_profiles" ADD COLUMN "registration_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD COLUMN "contact_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD COLUMN "verified_by_account_id" text;--> statement-breakpoint
ALTER TABLE "charity_profiles" ADD CONSTRAINT "charity_profiles_verified_by_account_id_accounts_id_fk" FOREIGN KEY ("verified_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;