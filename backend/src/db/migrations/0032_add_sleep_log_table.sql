-- Migration: Create sleep_log table
-- Required for sleep tracking feature

-- Create sleep_log table
CREATE TABLE IF NOT EXISTS "sleep_log" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,

  -- Sleep times
  "bed_time" timestamp NOT NULL,
  "wake_time" timestamp NOT NULL,
  "duration_minutes" integer NOT NULL,

  -- Quality assessment (1-10)
  "quality" integer NOT NULL,

  -- Context tags (JSON)
  "tags" json DEFAULT '{}',

  -- Notes
  "notes" text,

  -- Date tracking
  "sleep_date" text NOT NULL,

  -- Idempotency support
  "client_event_id" text,

  -- Timezone normalization
  "day_key" text,
  "timezone_offset" integer,

  -- Timestamps
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "sleep_log_user_date_idx" ON "sleep_log" ("user_id", "sleep_date");
CREATE INDEX IF NOT EXISTS "sleep_log_user_day_key_idx" ON "sleep_log" ("user_id", "day_key");

-- Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_log_user_sleep_date_unique') THEN
    ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_log_user_sleep_date_unique"
      UNIQUE ("user_id", "sleep_date");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_log_user_client_event_id_unique') THEN
    ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_log_user_client_event_id_unique"
      UNIQUE ("user_id", "client_event_id");
  END IF;
END $$;

-- CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_duration_check') THEN
    ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_duration_check"
      CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sleep_quality_check') THEN
    ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_quality_check"
      CHECK ("quality" >= 1 AND "quality" <= 10);
  END IF;
END $$;
