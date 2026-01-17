-- Migration: Add fiber, sugar, sodium columns to food_log table
-- These columns were missing, causing fiber/sugar data to not be saved

-- Add fiber column (grams)
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "fiber" integer;

-- Add sugar column (grams)
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "sugar" integer;

-- Add sodium column (mg)
ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "sodium" integer;

-- Add CHECK constraints for reasonable values
-- Note: PostgreSQL will ignore these if they already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'food_fiber_check') THEN
    ALTER TABLE "food_log" ADD CONSTRAINT "food_fiber_check" CHECK ("fiber" IS NULL OR ("fiber" >= 0 AND "fiber" <= 200));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'food_sugar_check') THEN
    ALTER TABLE "food_log" ADD CONSTRAINT "food_sugar_check" CHECK ("sugar" IS NULL OR ("sugar" >= 0 AND "sugar" <= 500));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'food_sodium_check') THEN
    ALTER TABLE "food_log" ADD CONSTRAINT "food_sodium_check" CHECK ("sodium" IS NULL OR ("sodium" >= 0 AND "sodium" <= 10000));
  END IF;
END $$;
