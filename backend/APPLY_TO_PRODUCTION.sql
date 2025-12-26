-- ============================================================================
-- PRODUCTION DATABASE FIX - Apply this to your Render PostgreSQL database
-- ============================================================================
-- This fixes the "streak_freezes" column error in your dashboard
--
-- HOW TO APPLY ON RENDER:
-- 1. Go to your Render dashboard
-- 2. Navigate to your PostgreSQL database
-- 3. Click "Connect" → "External Connection"
-- 4. Copy the connection string
-- 5. Run: psql "<connection_string>" < APPLY_TO_PRODUCTION.sql
--
-- OR use Render's web console to paste the SQL below:
-- ============================================================================

BEGIN;

-- Add missing streak_freezes column
ALTER TABLE "gamification"
ADD COLUMN IF NOT EXISTS "streak_freezes" integer DEFAULT 0;

-- Add check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'streak_freezes_check'
    ) THEN
        ALTER TABLE "gamification"
        ADD CONSTRAINT "streak_freezes_check" CHECK ("streak_freezes" >= 0);
    END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'gamification'
AND column_name = 'streak_freezes';

COMMIT;

-- ============================================================================
-- Expected output:
--   column_name    | data_type | column_default
-- -----------------+-----------+----------------
--  streak_freezes | integer   | 0
-- ============================================================================
