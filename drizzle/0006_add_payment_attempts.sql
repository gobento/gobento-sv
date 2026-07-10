CREATE TABLE IF NOT EXISTS "payment_attempts" (
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
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_offer_id_business_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_account_id_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_business_account_id_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_user_account_id_idx" ON "payment_attempts" ("user_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_business_account_id_idx" ON "payment_attempts" ("business_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_created_at_idx" ON "payment_attempts" ("created_at");
