-- CHECK constraints declared in schema.js but never created, found by
-- scripts/checkSchemaDrift.mjs. Each condition was tested against every
-- existing row in production before writing this migration
-- (SELECT count(*) WHERE NOT (<condition>)) and found zero violations, so
-- these apply cleanly with no data cleanup required.
--
-- These are defense-in-depth: bounds the application almost certainly already
-- enforces on the way in, made unbreakable by anything that writes to these
-- tables outside that code path — a raw SQL script, a future migration's data
-- backfill, or application code that changes without this constraint in mind.
ALTER TABLE "gamification"
  ADD CONSTRAINT "previous_streak_check" CHECK ("previous_streak" >= 0);

ALTER TABLE "daily_meal_counts"
  ADD CONSTRAINT "meal_count_check" CHECK ("meal_count" >= 0),
  ADD CONSTRAINT "daily_xp_check" CHECK ("xp_earned_today" >= 0);

ALTER TABLE "food_log"
  ADD CONSTRAINT "food_fiber_check" CHECK ("fiber" IS NULL OR ("fiber" >= 0 AND "fiber" <= 200)),
  ADD CONSTRAINT "food_sugar_check" CHECK ("sugar" IS NULL OR ("sugar" >= 0 AND "sugar" <= 500)),
  ADD CONSTRAINT "food_sodium_check" CHECK ("sodium" IS NULL OR ("sodium" >= 0 AND "sodium" <= 10000)),
  ADD CONSTRAINT "cooking_method_check" CHECK ("cooking_method" IS NULL OR "cooking_method" IN ('fried', 'steamed', 'grilled', 'boiled', 'baked', 'raw')),
  ADD CONSTRAINT "ai_confidence_check" CHECK ("ai_confidence" IS NULL OR ("ai_confidence" >= 0 AND "ai_confidence" <= 1));

ALTER TABLE "daily_nutrition_summary"
  ADD CONSTRAINT "daily_score_check" CHECK ("daily_score" IS NULL OR ("daily_score" >= 0 AND "daily_score" <= 100)),
  ADD CONSTRAINT "mood_score_check" CHECK ("mood_score" IS NULL OR ("mood_score" >= 0 AND "mood_score" <= 100)),
  ADD CONSTRAINT "hydration_score_check" CHECK ("hydration_score" IS NULL OR ("hydration_score" >= 0 AND "hydration_score" <= 100));

ALTER TABLE "recommendation_arms"
  ADD CONSTRAINT "rec_arms_alpha_check" CHECK ("alpha" > 0),
  ADD CONSTRAINT "rec_arms_beta_check" CHECK ("beta" > 0),
  ADD CONSTRAINT "rec_arms_trials_check" CHECK ("trials" >= 0),
  ADD CONSTRAINT "rec_arms_successes_check" CHECK ("successes" >= 0 AND "successes" <= "trials");

ALTER TABLE "activity_log"
  ADD CONSTRAINT "activity_duration_check" CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440),
  ADD CONSTRAINT "activity_type_check" CHECK ("type" IN ('running', 'cycling', 'walking', 'gym', 'swimming', 'yoga', 'sports', 'hiking', 'dancing', 'hiit', 'strength', 'cardio', 'flexibility', 'general')),
  ADD CONSTRAINT "activity_intensity_check" CHECK ("intensity" IN ('light', 'moderate', 'vigorous')),
  ADD CONSTRAINT "activity_calories_check" CHECK ("calories_burned" IS NULL OR ("calories_burned" >= 0 AND "calories_burned" <= 10000)),
  ADD CONSTRAINT "activity_heart_rate_check" CHECK ("heart_rate_avg" IS NULL OR ("heart_rate_avg" >= 30 AND "heart_rate_avg" <= 250)),
  ADD CONSTRAINT "activity_distance_check" CHECK ("distance_km" IS NULL OR ("distance_km" >= 0 AND "distance_km" <= 500));

ALTER TABLE "sleep_log"
  ADD CONSTRAINT "sleep_duration_check" CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440),
  ADD CONSTRAINT "sleep_quality_check" CHECK ("quality" >= 1 AND "quality" <= 10);

ALTER TABLE "stress_log"
  ADD CONSTRAINT "stress_level_check" CHECK ("level" >= 1 AND "level" <= 10);

-- gamification.total_meals_check already exists and enforces the identical
-- rule (total_meals_logged >= 0) — it was just created under an
-- auto-generated name, gamification_total_meals_logged_check, rather than the
-- name schema.js declares. Renamed rather than duplicated, so schema.js's
-- constraint name is accurate for anyone who goes looking for it later (e.g.
-- a future `DROP CONSTRAINT total_meals_check` that would otherwise fail
-- against a name that was never actually created).
ALTER TABLE "gamification"
  RENAME CONSTRAINT "gamification_total_meals_logged_check" TO "total_meals_check";

-- Not a CHECK, but same drift-check finding, same evidence-gathering, and
-- zero risk to bundle here: correlation_evidence.correlation_id is a foreign
-- key onto user_correlations(id) declared NOT NULL in schema.js — every
-- evidence row should belong to a correlation by definition — but was
-- nullable in the database. No code path inserts into this table at all right
-- now (correlationEngineService.js only reads it), so the table has zero rows
-- and there is nothing to migrate — this just closes the gap before the first
-- write path is added, rather than leaving it to be discovered the same way
-- the other findings in this session were.
ALTER TABLE "correlation_evidence"
  ALTER COLUMN "correlation_id" SET NOT NULL;
