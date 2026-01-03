-- Migration 0024: Add OpenAI Data Sharing Consent Fields
-- Implements explicit GDPR-compliant consent for data sharing with OpenAI
-- Allows premium users to opt-in to AI-powered analysis

-- Add consent fields to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_data_sharing_consent" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_given_at" timestamp;

-- Create index for efficient consent lookups
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_idx" ON "profiles"("openai_data_sharing_consent");

-- Add comments for documentation
COMMENT ON COLUMN "profiles"."openai_data_sharing_consent" IS 'User explicitly consented to share meal data with OpenAI for AI analysis';
COMMENT ON COLUMN "profiles"."openai_consent_given_at" IS 'Timestamp when user gave or revoked consent';
