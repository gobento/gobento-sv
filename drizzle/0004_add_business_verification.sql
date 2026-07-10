ALTER TABLE "business_profiles" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "verified_by_account_id" text;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_verified_by_account_id_accounts_id_fk" FOREIGN KEY ("verified_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
