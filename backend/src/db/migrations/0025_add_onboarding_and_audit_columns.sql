-- Migration 0025: Add Onboarding Completion & Audit Trail Columns
-- Purpose: Enable proper onboarding state tracking and consent audit trails
-- Date: January 3, 2026

-- ============================================================================
-- Add Onboarding Completion Timestamp
-- ============================================================================
-- Purpose: Track when user completed onboarding
-- Used by: OnboardingGuard (mobile/components/OnboardingGuard.jsx)
-- Endpoint: GET /profile returns this field to detect returning users

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

COMMENT ON COLUMN "profiles"."onboarding_completed_at" IS
'Timestamp when user completed onboarding. NULL = new user, timestamp = returning user';

CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx"
ON "profiles"("onboarding_completed_at");

-- ============================================================================
-- Add OpenAI Consent Revocation Audit Trail
-- ============================================================================
-- Purpose: Track when user revoked OpenAI consent for compliance
-- Related to: openai_data_sharing_consent field
-- Used by: GDPR/privacy compliance audits

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;

COMMENT ON COLUMN "profiles"."openai_consent_revoked_at" IS
'Timestamp when user revoked OpenAI consent. Used for compliance audits.';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify migration was successful:

-- Check columns were added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='profiles'
-- AND column_name IN ('onboarding_completed_at', 'openai_consent_revoked_at');

-- Check indexes were created
-- SELECT indexname FROM pg_indexes
-- WHERE tablename='profiles'
-- AND indexname LIKE '%onboarding%';
