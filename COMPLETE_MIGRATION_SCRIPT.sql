-- ============================================================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Purpose: Add all missing columns and fix constraints
-- Date: January 3, 2026
-- ============================================================================

-- ============================================================================
-- PART 1: Add Missing Profile Columns (Premium & Subscription)
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "premium_tier" text DEFAULT 'free';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_started_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_ends_at" timestamp;

-- ============================================================================
-- PART 2: Add OpenAI Consent Columns
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_data_sharing_consent" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_given_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;

-- ============================================================================
-- PART 3: Add Onboarding Completion Tracking
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

-- ============================================================================
-- PART 4: Create Performance Indices
-- ============================================================================

CREATE INDEX IF NOT EXISTS "profiles_is_premium_idx" ON "profiles"("is_premium");
CREATE INDEX IF NOT EXISTS "profiles_subscription_ends_idx" ON "profiles"("subscription_ends_at");
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_idx" ON "profiles"("openai_data_sharing_consent");
CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx" ON "profiles"("onboarding_completed_at");
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_revoked_idx" ON "profiles"("openai_consent_revoked_at");

-- ============================================================================
-- PART 5: Fix Unique Constraints (blocking updates)
-- ============================================================================

ALTER TABLE "dietary_preferences" DROP CONSTRAINT IF EXISTS "dietary_preferences_user_id_key";
ALTER TABLE "nutrition_goals" DROP CONSTRAINT IF EXISTS "nutrition_goals_user_id_key";
ALTER TABLE "gamification" DROP CONSTRAINT IF EXISTS "gamification_user_id_key";

-- ============================================================================
-- PART 6: Add Foreign Keys for Data Integrity
-- ============================================================================

ALTER TABLE "recommendations_history"
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_rec_history_user_id" ON "recommendations_history"(user_id);

-- ============================================================================
-- PART 7: Secure ClientEventId with UUID (prevent duplicate meals)
-- ============================================================================

-- Backfill any NULL values
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;

-- Add unique constraint
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);

-- Make NOT NULL
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;

-- Remove old composite constraint if exists
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;

-- ============================================================================
-- PART 8: Add Documentation Comments
-- ============================================================================

COMMENT ON COLUMN "profiles"."is_premium" IS 'User has active premium subscription';
COMMENT ON COLUMN "profiles"."premium_tier" IS 'Premium subscription tier (free, pro, etc)';
COMMENT ON COLUMN "profiles"."subscription_started_at" IS 'When premium subscription started';
COMMENT ON COLUMN "profiles"."subscription_ends_at" IS 'When premium subscription expires';
COMMENT ON COLUMN "profiles"."openai_data_sharing_consent" IS 'User explicitly consented to share data with OpenAI';
COMMENT ON COLUMN "profiles"."openai_consent_given_at" IS 'Timestamp when user gave consent';
COMMENT ON COLUMN "profiles"."openai_consent_revoked_at" IS 'Timestamp when user revoked consent';
COMMENT ON COLUMN "profiles"."onboarding_completed_at" IS 'Timestamp when user completed onboarding (NULL = not completed)';

-- ============================================================================
-- VERIFICATION - Run these queries to verify all changes applied
-- ============================================================================

-- Check all new columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='profiles'
-- AND column_name IN (
--   'is_premium', 'premium_tier', 'subscription_started_at',
--   'subscription_ends_at', 'openai_data_sharing_consent',
--   'openai_consent_given_at', 'openai_consent_revoked_at',
--   'onboarding_completed_at'
-- )
-- ORDER BY column_name;
-- Expected: 8 rows

-- Check indices created:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename='profiles'
-- AND indexname LIKE '%is_premium%' OR indexname LIKE '%subscription%'
--   OR indexname LIKE '%openai%' OR indexname LIKE '%onboarding%';
-- Expected: 5 rows

-- Check unique constraints removed:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name IN ('dietary_preferences', 'nutrition_goals', 'gamification')
-- AND constraint_type = 'UNIQUE';
-- Should NOT show user_id unique constraints

-- Check foreign key added:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name='recommendations_history'
-- AND constraint_type = 'FOREIGN KEY';
-- Should show: recommendations_history_user_id_fk

-- Check clientEventId is NOT NULL:
-- SELECT is_nullable FROM information_schema.columns
-- WHERE table_name='food_log' AND column_name='client_event_id';
-- Should show: NO

-- ============================================================================
-- DONE! All migrations applied successfully.
-- Now restart backend app and test:
--   1. New user can complete onboarding
--   2. Profile saves successfully
--   3. No 500 errors
-- ============================================================================
