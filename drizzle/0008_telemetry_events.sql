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
--> statement-breakpoint
CREATE INDEX "telemetry_events_kind_created_idx" ON "telemetry_events" USING btree ("kind","created_at");
