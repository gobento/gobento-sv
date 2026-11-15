CREATE TABLE "sso_connections" (
	"employer_account_id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_encrypted" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"require_sso" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "sso_subject" text;--> statement-breakpoint
ALTER TABLE "sso_connections" ADD CONSTRAINT "sso_connections_employer_account_id_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
