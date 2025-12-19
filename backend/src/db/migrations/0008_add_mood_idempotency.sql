-- Migration: Add client_event_id to mood_log for idempotency
-- This prevents duplicate mood entries from double-taps

-- Step 1: Add column (nullable for migration compatibility)
ALTER TABLE "mood_log" ADD COLUMN "client_event_id" text;

-- Step 2: Backfill existing records with legacy IDs
UPDATE "mood_log"
SET "client_event_id" = 'legacy-' || "id"::text
WHERE "client_event_id" IS NULL;

-- Step 3: Make NOT NULL (now that all records have values)
ALTER TABLE "mood_log" ALTER COLUMN "client_event_id" SET NOT NULL;

-- Step 4: Create unique index to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "mood_log_client_event_id_idx"
  ON "mood_log"("user_id", "client_event_id");
