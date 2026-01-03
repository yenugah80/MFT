-- Migration 0023: Add Premium Features Fields to Profiles
-- Implements tier-based parsing system for strategic hybrid rollout
-- Adds fields for subscription management and feature access control

-- 1. Add premium feature columns to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "premium_tier" text DEFAULT 'free';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_started_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_ends_at" timestamp;

-- 2. Add CHECK constraint for premium tier values
ALTER TABLE "profiles" ADD CONSTRAINT "premium_tier_check"
  CHECK ("premium_tier" IN ('free', 'premium', 'enterprise'));

-- 3. Create index for efficient tier lookups
CREATE INDEX IF NOT EXISTS "profiles_is_premium_idx" ON "profiles"("is_premium");
CREATE INDEX IF NOT EXISTS "profiles_premium_tier_idx" ON "profiles"("premium_tier");

-- 4. Comment for documentation
COMMENT ON COLUMN "profiles"."is_premium" IS 'Premium subscription status for feature access';
COMMENT ON COLUMN "profiles"."premium_tier" IS 'User tier: free, premium, or enterprise';
COMMENT ON COLUMN "profiles"."subscription_started_at" IS 'When premium subscription started';
COMMENT ON COLUMN "profiles"."subscription_ends_at" IS 'When premium subscription expires (if applicable)';
