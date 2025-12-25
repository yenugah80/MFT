-- Add streak_freezes column to gamification table
ALTER TABLE "gamification"
ADD COLUMN IF NOT EXISTS "streak_freezes" integer DEFAULT 0;

-- Add check constraint for streak_freezes
ALTER TABLE "gamification"
DROP CONSTRAINT IF EXISTS "streak_freezes_check";

ALTER TABLE "gamification"
ADD CONSTRAINT "streak_freezes_check" CHECK ("streak_freezes" >= 0);
