-- Migration 0019: Add regional context fields to profiles table
-- Supports user cuisine preferences and regional awareness for nutrition analysis

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "cuisine_preference" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "cooking_style" text;

-- Create indexes for regional preference queries
CREATE INDEX IF NOT EXISTS "idx_profiles_region" ON "profiles"("region");
CREATE INDEX IF NOT EXISTS "idx_profiles_cuisine" ON "profiles" USING GIN ("cuisine_preference");

-- Comment on new columns
COMMENT ON COLUMN "profiles"."cuisine_preference" IS 'Array of preferred cuisines: ["South Indian", "American", "Italian", etc.]';
COMMENT ON COLUMN "profiles"."region" IS 'User region/country for nutrition context: "India", "USA", "UK", etc.';
COMMENT ON COLUMN "profiles"."cooking_style" IS 'Preferred cooking style: "home-style", "restaurant", "light", etc.';
