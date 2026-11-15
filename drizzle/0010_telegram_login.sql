ALTER TABLE "accounts" ADD COLUMN "telegram_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_telegram_id_unique" UNIQUE("telegram_id");
