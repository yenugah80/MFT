-- Add timezone offset to gamification for local-day streak checks
ALTER TABLE "gamification"
ADD COLUMN IF NOT EXISTS "timezone_offset" integer;
