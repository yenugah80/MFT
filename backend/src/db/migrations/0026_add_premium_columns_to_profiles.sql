-- Migration 0026: Add Premium/Subscription Columns to Profiles
-- Purpose: Support premium tier subscription tracking
-- Date: January 3, 2026

-- ============================================================================
-- Add Premium Feature Columns
-- ============================================================================

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "premium_tier" text DEFAULT 'free';

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "subscription_started_at" timestamp;

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "subscription_ends_at" timestamp;

-- ============================================================================
-- Add OpenAI Consent Columns (if not exists from previous migration)
-- ============================================================================

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "openai_data_sharing_consent" boolean DEFAULT false;

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "openai_consent_given_at" timestamp;

-- ============================================================================
-- Create Indices for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "profiles_is_premium_idx"
ON "profiles"("is_premium");

CREATE INDEX IF NOT EXISTS "profiles_subscription_ends_idx"
ON "profiles"("subscription_ends_at");

CREATE INDEX IF NOT EXISTS "profiles_openai_consent_idx"
ON "profiles"("openai_data_sharing_consent");

-- ============================================================================
-- Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN "profiles"."is_premium" IS 'User has active premium subscription';
COMMENT ON COLUMN "profiles"."premium_tier" IS 'Premium subscription tier (free, pro, etc)';
COMMENT ON COLUMN "profiles"."subscription_started_at" IS 'When premium subscription started';
COMMENT ON COLUMN "profiles"."subscription_ends_at" IS 'When premium subscription expires';
COMMENT ON COLUMN "profiles"."openai_data_sharing_consent" IS 'User consented to share meal data with OpenAI';
COMMENT ON COLUMN "profiles"."openai_consent_given_at" IS 'Timestamp of OpenAI consent';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check columns exist:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='profiles'
-- AND column_name IN ('is_premium', 'premium_tier', 'subscription_started_at',
--                     'subscription_ends_at', 'openai_data_sharing_consent');
-- Should return 5 rows
