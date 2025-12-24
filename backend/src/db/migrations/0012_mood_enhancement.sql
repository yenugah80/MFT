-- Migration: Mood Enhancement with Intensity, Tags, Energy Level, and Meal Context
-- Date: 2025-12-23
-- Description: Adds intensity tracking, contextual tags, energy levels, and meal correlation support

-- Add new columns to mood_log table
ALTER TABLE "mood_log"
  ADD COLUMN IF NOT EXISTS "intensity" integer,
  ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "energy_level" integer,
  ADD COLUMN IF NOT EXISTS "meal_context" jsonb DEFAULT '{}';

-- Add constraints for intensity and energy_level (1-10 scale)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mood_intensity_check'
  ) THEN
    ALTER TABLE "mood_log"
      ADD CONSTRAINT "mood_intensity_check"
      CHECK ("intensity" IS NULL OR ("intensity" >= 1 AND "intensity" <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mood_energy_check'
  ) THEN
    ALTER TABLE "mood_log"
      ADD CONSTRAINT "mood_energy_check"
      CHECK ("energy_level" IS NULL OR ("energy_level" >= 1 AND "energy_level" <= 10));
  END IF;
END $$;

-- Create mood_meal_correlations table (derived cache for analytics)
CREATE TABLE IF NOT EXISTS "mood_meal_correlations" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "meal_pattern" jsonb NOT NULL,
  "mood_pattern" text NOT NULL,
  "strength" numeric(3, 2),
  "confidence" numeric(3, 2),
  "occurrences" integer DEFAULT 0,
  "source" text NOT NULL DEFAULT 'rules',
  "version" text NOT NULL DEFAULT 'v1',
  "last_analyzed_at" timestamp DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS "mood_meal_corr_user_id_idx" ON "mood_meal_correlations"("user_id");

-- Create index on last_analyzed_at for cache invalidation
CREATE INDEX IF NOT EXISTS "mood_meal_corr_analyzed_idx" ON "mood_meal_correlations"("last_analyzed_at");

-- Add comment to explain meal_context structure
COMMENT ON COLUMN "mood_log"."meal_context" IS 'Stores { mealIds: [123, 124], windowHours: 4 } - IDs only, not full meal data';

-- Add comment to explain correlation table purpose
COMMENT ON TABLE "mood_meal_correlations" IS 'Derived cache table for mood-meal correlations. Always reproducible from raw logs. Track source and version for re-computation.';
