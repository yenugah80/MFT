-- Migration: Add client_event_id to water_log for idempotency
-- This prevents duplicate water entries from double-taps on quick-add buttons

-- Step 1: Add column (nullable for migration compatibility)
ALTER TABLE "water_log" ADD COLUMN "client_event_id" text;

-- Step 2: Backfill existing records with legacy IDs
UPDATE "water_log"
SET "client_event_id" = 'legacy-' || "id"::text
WHERE "client_event_id" IS NULL;

-- Step 3: Make NOT NULL (now that all records have values)
ALTER TABLE "water_log" ALTER COLUMN "client_event_id" SET NOT NULL;

-- Step 4: Create unique index to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "water_log_client_event_id_idx"
  ON "water_log"("user_id", "client_event_id");
