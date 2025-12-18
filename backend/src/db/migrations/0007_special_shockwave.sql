-- Migration: Add clientEventId for idempotency support
-- PHASE 1: TRUST FIX - Prevent duplicate meal logging
-- Date: 2025-12-17

-- STEP 1: Add nullable client_event_id column
ALTER TABLE "food_log" ADD COLUMN "client_event_id" text;--> statement-breakpoint
ALTER TABLE "food_log" ADD COLUMN "source_meta" json DEFAULT '{}'::json;--> statement-breakpoint

-- STEP 2: Backfill existing rows with synthetic client_event_id
-- Format: "id-legacy-timestamp" ensures uniqueness for old entries
UPDATE food_log
SET client_event_id = id::text || '-legacy-' || EXTRACT(EPOCH FROM logged_date)::text
WHERE client_event_id IS NULL;--> statement-breakpoint

-- STEP 3: Add NOT NULL constraint + unique index
ALTER TABLE "food_log" ALTER COLUMN "client_event_id" SET NOT NULL;--> statement-breakpoint

-- Create unique constraint on (user_id, client_event_id)
-- Prevents duplicate saves from same user with same event ID
CREATE UNIQUE INDEX IF NOT EXISTS "food_log_client_event_unique_idx"
ON "food_log"("user_id", "client_event_id");