-- Preserve hydration quick-add amounts at 1 ml precision.
-- The original numeric(3,1) columns rounded 150 ml (0.150 L) to 200 ml.
ALTER TABLE "water_log"
  ALTER COLUMN "amount_liters" TYPE numeric(5,3)
  USING "amount_liters"::numeric(5,3);

ALTER TABLE "water_log"
  ALTER COLUMN "hydration_liters" TYPE numeric(5,3)
  USING "hydration_liters"::numeric(5,3);
