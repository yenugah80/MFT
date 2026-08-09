-- Four UNIQUE constraints declared in schema.js that were genuinely never
-- created in the database, found by scripts/checkSchemaDrift.mjs. Each is a
-- deduplication guarantee the application already assumes it has, in one of
-- two ways that both fail silently without it:
--
--   - laggedCorrelationService.js and hydrationAnalyticsService.js call
--     `.onConflictDoUpdate({ target: [...] })` against these exact columns —
--     with no matching constraint, Postgres has nothing to conflict on, so it
--     just inserts a duplicate row instead of updating the existing one.
--   - thompsonSamplingService.js's updateArm() does SELECT-then-INSERT-if-
--     not-found with no constraint backing it: two near-simultaneous calls
--     for the same (user, armKey) can both pass the SELECT and both INSERT,
--     splitting one bandit arm's trials/successes across two rows and
--     corrupting its statistics. Confirmed by reading the code path directly,
--     not inferred — this is a genuine race, not a theoretical one.
--
-- This is precisely the client_event_id failure mode from migration 0044,
-- generalized: a guarantee that only holds if the constraint backing it
-- actually exists. It matters more, not less, as traffic grows — a race
-- between two near-simultaneous requests for the same (user, day) or
-- (user, arm) pair is rare at low volume and routine at high volume.
--
-- Six other tables originally suspected here — hydration_daily_summary,
-- user_hydration_profile, hydration_predictions, insight_feedback,
-- lagged_correlations, sleep_log — turned out to already have a genuine
-- UNIQUE INDEX on the exact right columns, under the exact name schema.js
-- expects. A unique index enforces identically to a unique constraint
-- (Postgres resolves ON CONFLICT against either), so those were never
-- actually broken — the first version of this migration didn't know that,
-- tried to ADD CONSTRAINT under a name a live index already held, and failed
-- outright with 42P07 relation already exists. Confirmed via pg_indexes
-- before writing this version; checkSchemaDrift.mjs now checks pg_indexes
-- too, so it won't misreport this class of table again.
--
-- Verified against production before writing this: every column referenced
-- below exists on its table, and a GROUP BY ... HAVING count(*) > 1 over each
-- proposed key found zero existing duplicate groups. Safe to add outright, no
-- deduplication step required first.
ALTER TABLE "ai_estimated_foods"
  ADD CONSTRAINT "ai_foods_source_query_unique" UNIQUE ("source_query", "cuisine", "region");

ALTER TABLE "daily_meal_counts"
  ADD CONSTRAINT "daily_meal_counts_user_date_unique" UNIQUE ("user_id", "date");

ALTER TABLE "user_correlations"
  ADD CONSTRAINT "user_corr_user_rule_window_unique" UNIQUE ("user_id", "correlation_type", "rule_name", "window_type");

ALTER TABLE "recommendation_arms"
  ADD CONSTRAINT "rec_arms_user_arm_unique" UNIQUE ("user_id", "arm_key");
