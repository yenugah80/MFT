-- Persist the daily recovery score.
--
-- It was computed on demand and discarded, so the app could show a number but
-- never a trend, never "versus yesterday", and could never learn how much each
-- signal actually matters for a given person.
CREATE TABLE IF NOT EXISTS "recovery_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "day_key" text NOT NULL,
  "score" integer NOT NULL,
  "label" text,
  "factors" jsonb,
  "coverage" jsonb,
  "counted_weight" numeric(4,3),
  "timezone_offset" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "recovery_snapshots_user_day_unique" UNIQUE ("user_id", "day_key"),
  CONSTRAINT "recovery_score_check" CHECK ("score" >= 0 AND "score" <= 100)
);

CREATE INDEX IF NOT EXISTS "recovery_snapshots_user_day_idx"
ON "recovery_snapshots" ("user_id", "day_key");
