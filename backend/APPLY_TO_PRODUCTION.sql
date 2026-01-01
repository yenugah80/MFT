-- ============================================================================
-- PRODUCTION DATABASE FIX - Apply to your Neon PostgreSQL database
-- ============================================================================
-- This fixes the missing columns that the backend code expects
-- Migrations 0019 (regional context) and 0020 (multimodal analysis)
--
-- HOW TO APPLY ON NEON:
-- 1. Go to your Neon dashboard (https://console.neon.tech)
-- 2. Select your project → SQL Editor
-- 3. Paste all the SQL below and click "Run"
--
-- OR via psql command line:
-- psql "postgresql://<user>:<password>@<host>/<database>" < APPLY_TO_PRODUCTION.sql
--
-- ============================================================================

BEGIN;

-- ==================================================
-- MIGRATION 0019: Add regional context fields to profiles table
-- ==================================================

-- Add regional context columns to profiles
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

-- ==================================================
-- MIGRATION 0020: Add multimodal and regional fields to food_log table
-- ==================================================

-- Add regional/multimodal columns
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "cuisine" text;
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "cooking_method" text;
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "voice_transcript" text;
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "ingredients_breakdown" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "multimodal_source" jsonb DEFAULT '{}'::jsonb;

-- Add AI metadata columns
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "ai_model" text;
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "ai_confidence" numeric(3,2);

-- Create indexes for food_log filtering
CREATE INDEX IF NOT EXISTS "idx_food_log_cuisine" ON "food_log"("cuisine");
CREATE INDEX IF NOT EXISTS "idx_food_log_cooking_method" ON "food_log"("cooking_method");
CREATE INDEX IF NOT EXISTS "idx_food_log_ai_confidence" ON "food_log"("ai_confidence");

-- Comments on new columns
COMMENT ON COLUMN "food_log"."cuisine" IS 'Cuisine type for nutrition variation context';
COMMENT ON COLUMN "food_log"."cooking_method" IS 'How food was prepared: fried, steamed, grilled, boiled, etc.';
COMMENT ON COLUMN "food_log"."voice_transcript" IS 'Original voice transcription if food was logged via voice';
COMMENT ON COLUMN "food_log"."ingredients_breakdown" IS 'Array of ingredient components with individual nutrition';
COMMENT ON COLUMN "food_log"."multimodal_source" IS 'Metadata about multimodal input (photo + voice combination)';
COMMENT ON COLUMN "food_log"."ai_model" IS 'Which AI model was used: gpt-4o-mini, gpt-4o, etc.';
COMMENT ON COLUMN "food_log"."ai_confidence" IS 'AI confidence score 0.00-1.00 for this estimate';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying the migrations to verify success:

-- Check profiles table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('cuisine_preference', 'region', 'cooking_style')
ORDER BY column_name;

-- Check food_log table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'food_log'
AND column_name IN ('cuisine', 'cooking_method', 'voice_transcript', 'ingredients_breakdown', 'multimodal_source', 'ai_model', 'ai_confidence')
ORDER BY column_name;
