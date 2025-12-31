-- Migration 0020: Add multimodal and regional fields to food_log table
-- Supports voice descriptions, ingredient breakdowns, and AI model tracking

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
