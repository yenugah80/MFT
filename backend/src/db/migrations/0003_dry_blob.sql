CREATE TABLE "mood_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mood" text NOT NULL,
	"note" text,
	"source" text,
	"logged_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_levels" ALTER COLUMN "factor" DROP NOT NULL;
