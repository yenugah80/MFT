-- Make gamification.total_meals_logged true, and keep it that way.
--
-- The column was written once, as 0, when a user's gamification row was created
-- and never incremented again by any of the four code paths that insert into
-- food_log. It therefore read 0 for every user forever, no matter how many meals
-- they had actually logged. Two things silently rode on that:
--
--   * the profile screen gates its "Log your first meal" prompt on the meal
--     count, so the prompt could never turn off — users hundreds of meals in
--     were still being told to log their first one;
--   * every ML batch job filtered eligible users with
--     `total_meals_logged >= N`, so all of them compared against 0, selected an
--     empty user set, and did nothing.
--
-- The API read paths now count food_log directly and no longer depend on this
-- column at all. This migration exists so the stored value stops lying: a
-- denormalised counter that disagrees with the rows it summarises is a trap for
-- whoever trusts it next.
--
-- Maintenance is a trigger rather than application code on purpose. Four
-- separate insert paths already forgot to update this counter once; a trigger
-- cannot be forgotten by a fifth.

-- 1. Backfill from the source of truth.
UPDATE "gamification" g
SET "total_meals_logged" = c."count",
    "updated_at" = now()
FROM (
  SELECT "user_id", count(*)::int AS "count"
  FROM "food_log"
  GROUP BY "user_id"
) c
WHERE g."user_id" = c."user_id"
  AND g."total_meals_logged" IS DISTINCT FROM c."count";

-- A user with a gamification row but no food logs must read 0, not a stale
-- non-zero value the join above would never visit.
UPDATE "gamification" g
SET "total_meals_logged" = 0,
    "updated_at" = now()
WHERE g."total_meals_logged" <> 0
  AND NOT EXISTS (SELECT 1 FROM "food_log" f WHERE f."user_id" = g."user_id");

-- 2. Keep it in step from here on.
CREATE OR REPLACE FUNCTION "sync_total_meals_logged"() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Upsert: a meal can be logged before anything has created the user's
    -- gamification row, and that row must not start life already wrong.
    -- food_log.user_id and gamification.user_id both reference profiles.user_id,
    -- so the foreign key is satisfied by construction.
    INSERT INTO "gamification" ("user_id", "total_meals_logged")
    VALUES (NEW."user_id", 1)
    ON CONFLICT ("user_id") DO UPDATE
      SET "total_meals_logged" = "gamification"."total_meals_logged" + 1,
          "updated_at" = now();
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- Deliberately an UPDATE and never an upsert. Deleting a profile cascades
    -- to both food_log and gamification, and re-inserting a gamification row
    -- from this branch would resurrect the row we are in the middle of
    -- deleting. Touching zero rows is the correct outcome there.
    --
    -- GREATEST keeps the total_meals_check (>= 0) constraint satisfied even if
    -- the counter has somehow already reached zero.
    UPDATE "gamification"
    SET "total_meals_logged" = GREATEST(0, "total_meals_logged" - 1),
        "updated_at" = now()
    WHERE "user_id" = OLD."user_id";
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- INSERT and DELETE only: nothing in the codebase reassigns food_log.user_id,
-- and an UPDATE branch would need to decrement the old owner and increment the
-- new one for a case that does not occur.
DROP TRIGGER IF EXISTS "food_log_sync_meal_count" ON "food_log";
CREATE TRIGGER "food_log_sync_meal_count"
AFTER INSERT OR DELETE ON "food_log"
FOR EACH ROW EXECUTE FUNCTION "sync_total_meals_logged"();
