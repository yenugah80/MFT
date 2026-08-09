-- Restore the idempotency guarantees the schema has always claimed.
--
-- client_event_id is the idempotency key: every log table carries a UNIQUE
-- constraint over it so a retried request cannot create a second row. schema.js
-- declares it `.notNull().default(gen_random_uuid())` on food_log, water_log,
-- mood_log, weight_history and activity_log.
--
-- The live database had neither the default nor, on four of those five tables,
-- the NOT NULL. That quietly voided the guarantee, because NULLs do not collide
-- in a UNIQUE constraint: any row inserted without a key was exempt from
-- duplicate detection entirely. 12 rows in water_log and 4 in mood_log are
-- already in that state.
--
-- activity_log's UNIQUE constraint was declared in schema.js but never created
-- at all. Verified before writing this: it has no rows that would violate it.
--
-- sleep_log and stress_log are deliberately excluded — they declare the column
-- nullable and use a partial unique index that excludes NULLs, which is a
-- consistent design rather than drift.

-- 1. Give the existing keyless rows a key, so NOT NULL can be enforced and they
--    rejoin duplicate detection. Distinct UUIDs, so no new collisions.
UPDATE "water_log"      SET "client_event_id" = gen_random_uuid()::text WHERE "client_event_id" IS NULL;
UPDATE "mood_log"       SET "client_event_id" = gen_random_uuid()::text WHERE "client_event_id" IS NULL;
UPDATE "weight_history" SET "client_event_id" = gen_random_uuid()::text WHERE "client_event_id" IS NULL;
UPDATE "activity_log"   SET "client_event_id" = gen_random_uuid()::text WHERE "client_event_id" IS NULL;

-- 2. Install the declared default. gen_random_uuid() returns uuid and these are
--    text columns, so the cast is required — without it the ALTER fails.
--    This is what makes the guarantee hold for any future insert path that
--    forgets to supply a key, rather than relying on every caller remembering.
ALTER TABLE "food_log"       ALTER COLUMN "client_event_id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "water_log"      ALTER COLUMN "client_event_id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "mood_log"       ALTER COLUMN "client_event_id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "weight_history" ALTER COLUMN "client_event_id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "activity_log"   ALTER COLUMN "client_event_id" SET DEFAULT gen_random_uuid()::text;

-- 3. Enforce NOT NULL to match the schema. food_log already has it.
ALTER TABLE "water_log"      ALTER COLUMN "client_event_id" SET NOT NULL;
ALTER TABLE "mood_log"       ALTER COLUMN "client_event_id" SET NOT NULL;
ALTER TABLE "weight_history" ALTER COLUMN "client_event_id" SET NOT NULL;
ALTER TABLE "activity_log"   ALTER COLUMN "client_event_id" SET NOT NULL;

-- 4. Create activity_log's missing UNIQUE constraint. Postgres has no
--    ADD CONSTRAINT IF NOT EXISTS, hence the guard — this migration must stay
--    safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_user_client_event_id_unique'
  ) THEN
    ALTER TABLE "activity_log"
      ADD CONSTRAINT "activity_log_user_client_event_id_unique" UNIQUE ("user_id", "client_event_id");
  END IF;
END $$;
