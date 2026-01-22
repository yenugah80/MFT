-- Migration: Add satisfaction tracking columns to insight_actions table
-- This enables the closed feedback loop for recommendations:
-- recommendation -> action -> outcome -> satisfaction feedback -> learning

-- Add satisfaction tracking columns
ALTER TABLE "insight_actions"
ADD COLUMN IF NOT EXISTS "satisfaction_rating" integer,
ADD COLUMN IF NOT EXISTS "satisfaction_feedback" text,
ADD COLUMN IF NOT EXISTS "satisfaction_recorded_at" timestamp;

-- Add constraint for valid ratings (1-5)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'satisfaction_rating_check'
  ) THEN
    ALTER TABLE "insight_actions"
    ADD CONSTRAINT "satisfaction_rating_check"
    CHECK ("satisfaction_rating" IS NULL OR ("satisfaction_rating" >= 1 AND "satisfaction_rating" <= 5));
  END IF;
END $$;

-- Index for analytics queries on satisfaction data
CREATE INDEX IF NOT EXISTS "insight_actions_satisfaction_idx"
ON "insight_actions" ("user_id", "satisfaction_rating")
WHERE "satisfaction_rating" IS NOT NULL;

-- Index for tracking recommendation effectiveness by type
CREATE INDEX IF NOT EXISTS "insight_actions_type_satisfaction_idx"
ON "insight_actions" ("recommendation_type", "satisfaction_rating")
WHERE "satisfaction_rating" IS NOT NULL;

-- Index for finding records pending satisfaction feedback
CREATE INDEX IF NOT EXISTS "insight_actions_pending_satisfaction_idx"
ON "insight_actions" ("user_id", "action_type", "satisfaction_rating")
WHERE "action_type" = 'completed' AND "satisfaction_rating" IS NULL;
