-- Migration: Create stress_log table
-- Required for stress tracking feature

-- Create stress_log table
CREATE TABLE IF NOT EXISTS "stress_log" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,

  -- Stress level (1-10)
  "level" integer NOT NULL,

  -- Triggers (JSON array)
  "triggers" json DEFAULT '[]',

  -- Physical symptoms (JSON object)
  "physical_symptoms" json DEFAULT '{}',

  -- Coping strategies used (JSON array)
  "coping_used" json DEFAULT '[]',

  -- Notes
  "notes" text,

  -- Date tracking
  "logged_date" text NOT NULL,

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

-- Indexes
CREATE INDEX IF NOT EXISTS "stress_log_user_date_idx" ON "stress_log" ("user_id", "logged_date");
CREATE INDEX IF NOT EXISTS "stress_log_user_day_key_idx" ON "stress_log" ("user_id", "day_key");
CREATE INDEX IF NOT EXISTS "stress_log_user_level_idx" ON "stress_log" ("user_id", "level");

-- Unique constraint for idempotency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stress_log_user_client_event_id_unique') THEN
    ALTER TABLE "stress_log" ADD CONSTRAINT "stress_log_user_client_event_id_unique"
      UNIQUE ("user_id", "client_event_id");
  END IF;
END $$;

-- CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stress_level_check') THEN
    ALTER TABLE "stress_log" ADD CONSTRAINT "stress_level_check"
      CHECK ("level" >= 1 AND "level" <= 10);
  END IF;
END $$;
