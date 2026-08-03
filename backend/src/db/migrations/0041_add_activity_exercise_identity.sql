-- Record which catalogue exercise produced an activity log.
--
-- `type` only carries 14 coarse buckets (strength, cardio, ...), so activity
-- insights can never name the actual movement or infer the muscle group worked.
-- Both columns are nullable so existing rows and older clients stay valid.
ALTER TABLE "activity_log"
ADD COLUMN IF NOT EXISTS "exercise_id" text,
ADD COLUMN IF NOT EXISTS "exercise_name" text;

-- Supports "when did I last train legs" style lookups without a full scan.
CREATE INDEX IF NOT EXISTS "activity_log_user_exercise_idx"
ON "activity_log" ("user_id", "exercise_id");
