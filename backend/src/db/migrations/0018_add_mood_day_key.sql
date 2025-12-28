-- Migration 0018: Add stable day key + timezone offset to mood_log
ALTER TABLE "mood_log" ADD COLUMN IF NOT EXISTS "day_key" text;
ALTER TABLE "mood_log" ADD COLUMN IF NOT EXISTS "timezone_offset" integer;

-- Backfill day_key using stored logged_date (UTC fallback)
UPDATE "mood_log"
SET "day_key" = to_char("logged_date", 'YYYY-MM-DD')
WHERE "day_key" IS NULL;
