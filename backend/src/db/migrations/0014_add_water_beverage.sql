ALTER TABLE "water_log"
ADD COLUMN IF NOT EXISTS "beverage_type" text DEFAULT 'water';

ALTER TABLE "water_log"
ADD COLUMN IF NOT EXISTS "hydration_factor" numeric(3, 2) DEFAULT 1.0;

ALTER TABLE "water_log"
ADD COLUMN IF NOT EXISTS "hydration_liters" numeric(3, 1);
