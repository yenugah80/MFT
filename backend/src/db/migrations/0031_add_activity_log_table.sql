-- Migration: Create activity_log table
-- Required for activity tracking feature with MET-based calorie calculation

-- Create activity_log table
CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,

  -- Activity details
  "type" text NOT NULL DEFAULT 'general',
  "duration_minutes" integer NOT NULL,
  "intensity" text NOT NULL DEFAULT 'moderate',

  -- MET-based calorie calculation
  "met_value" decimal(4,2),
  "calories_burned" integer,

  -- Optional tracking fields
  "heart_rate_avg" integer,
  "distance_km" decimal(6,2),
  "steps" integer,
  "notes" text,

  -- Idempotency support
  "client_event_id" text,

  -- Timezone normalization
  "day_key" text,
  "timezone_offset" integer,

  -- Timestamps
  "logged_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "activity_log_user_date_idx" ON "activity_log" ("user_id", "logged_at");
CREATE INDEX IF NOT EXISTS "activity_log_user_day_key_idx" ON "activity_log" ("user_id", "day_key");
CREATE INDEX IF NOT EXISTS "activity_log_user_type_idx" ON "activity_log" ("user_id", "type");

-- Unique constraint for idempotency (only if client_event_id is not null)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_user_client_event_id_unique') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_client_event_id_unique"
      UNIQUE ("user_id", "client_event_id");
  END IF;
END $$;

-- CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_duration_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_duration_check"
      CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_type_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_type_check"
      CHECK ("type" IN ('running', 'cycling', 'walking', 'gym', 'swimming', 'yoga', 'sports', 'hiking', 'dancing', 'hiit', 'strength', 'cardio', 'flexibility', 'general'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_intensity_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_intensity_check"
      CHECK ("intensity" IN ('light', 'moderate', 'vigorous'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_calories_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_calories_check"
      CHECK ("calories_burned" IS NULL OR ("calories_burned" >= 0 AND "calories_burned" <= 10000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_heart_rate_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_heart_rate_check"
      CHECK ("heart_rate_avg" IS NULL OR ("heart_rate_avg" >= 30 AND "heart_rate_avg" <= 250));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_distance_check') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_distance_check"
      CHECK ("distance_km" IS NULL OR ("distance_km" >= 0 AND "distance_km" <= 500));
  END IF;
END $$;
