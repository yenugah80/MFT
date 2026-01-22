-- Add previous_streak column to track streak value before reset
-- This enables users to restore their streak using streak freezes

ALTER TABLE "gamification"
ADD COLUMN IF NOT EXISTS "previous_streak" integer DEFAULT 0;

-- Add streak_reset_at to track when streak was last reset
ALTER TABLE "gamification"
ADD COLUMN IF NOT EXISTS "streak_reset_at" timestamp;

-- Add constraint
ALTER TABLE "gamification"
ADD CONSTRAINT "previous_streak_check" CHECK ("previous_streak" >= 0);
