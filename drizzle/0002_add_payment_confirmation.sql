ALTER TABLE "business_wallets" ADD COLUMN "iban_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_wallets" ADD COLUMN "tether_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "iban_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "tether_confirmed" boolean DEFAULT false NOT NULL;