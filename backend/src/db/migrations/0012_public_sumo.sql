CREATE TABLE "mood_meal_correlations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meal_pattern" json NOT NULL,
	"mood_pattern" text NOT NULL,
	"strength" numeric(3, 2),
	"confidence" numeric(3, 2),
	"occurrences" integer DEFAULT 0,
	"source" text DEFAULT 'rules' NOT NULL,
	"version" text DEFAULT 'v1' NOT NULL,
	"last_analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mood_log" ADD COLUMN "intensity" integer;--> statement-breakpoint
ALTER TABLE "mood_log" ADD COLUMN "tags" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "mood_log" ADD COLUMN "energy_level" integer;--> statement-breakpoint
ALTER TABLE "mood_log" ADD COLUMN "meal_context" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "mood_meal_correlations" ADD CONSTRAINT "mood_meal_correlations_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mood_meal_corr_user_id_idx" ON "mood_meal_correlations" USING btree ("user_id");