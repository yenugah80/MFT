ALTER TABLE "daily_nutrition_summary"
ADD COLUMN IF NOT EXISTS "hydration_celebrated_at" timestamp;
