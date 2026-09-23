-- Rebuild six tables that schema.js has always described but the database
-- never actually had in that shape, discovered by scripts/checkSchemaDrift.mjs.
--
-- Two different failure modes, verified individually against production before
-- writing this:
--
--   ab_test_assignments, ab_test_definitions, drift_metrics,
--   feature_interactions — each exists today as an earlier, much narrower
--   table (5-6 columns) than schema.js declares (15-20+ columns). All four are
--   live, reachable code, not aspirational: statisticalTestingService.js,
--   driftDetectionService.js and featureInteractionService.js all insert/query
--   using the schema.js column names, and a plain `db.select().from(table)`
--   against any of them fails outright —
--     42703 column "correlation_id" does not exist (drift_metrics)
--     42703 column "feature_a" does not exist (feature_interactions)
--     42703 column "experiment_name" does not exist (ab_test_assignments / _definitions)
--   confirmed by direct query against production, not inferred. drift_metrics
--   and feature_interactions specifically back runWeeklyDriftDetection and
--   runMonthlyInteractionAnalysis, which the 2026-08-08 session wired into a
--   real cron schedule for the first time — so this was about to fail on every
--   eligible user, silently for drift (storeDriftMetric catches its own error)
--   and loudly for anything reading feature_interactions through the query
--   builder.
--
--   insight_actions, user_thresholds — declared in schema.js, never migrated
--   at all. outcomeVerificationService.js and predictionLearningService.js
--   insert/update/query these unconditionally from POST /api/intelligence/*,
--   POST /api/insights/*, and POST /api/predictions/* — live, reachable, and
--   broken with 42P01 undefined_table on every call.
--
-- All four rebuilt tables were confirmed to have zero rows before this
-- migration, and confirmed to have zero foreign keys pointing into them from
-- any other table — a straight DROP + CREATE loses nothing and breaks nothing
-- referencing them. Do not reuse this pattern on a table with real data.
DROP TABLE IF EXISTS "ab_test_assignments";
DROP TABLE IF EXISTS "ab_test_definitions";
DROP TABLE IF EXISTS "drift_metrics";
DROP TABLE IF EXISTS "feature_interactions";

CREATE TABLE "ab_test_definitions" (
  "id" serial PRIMARY KEY NOT NULL,
  "experiment_id" text NOT NULL UNIQUE,
  "experiment_name" text NOT NULL,
  "description" text,
  "hypothesis" text,
  "primary_metric" text NOT NULL,
  "secondary_metrics" json DEFAULT '[]',
  "variants" json NOT NULL,
  "minimum_sample_size" integer DEFAULT 100,
  "significance_level" numeric(4,3) DEFAULT 0.05,
  "statistical_power" numeric(4,3) DEFAULT 0.80,
  "minimum_detectable_effect" numeric(5,4),
  "target_user_segment" json DEFAULT '{}',
  "traffic_allocation" numeric(3,2) DEFAULT 1.00,
  "status" text DEFAULT 'draft',
  "started_at" timestamp,
  "paused_at" timestamp,
  "concluded_at" timestamp,
  "conclusion_reason" text,
  "winning_variant" text,
  "p_value" numeric(6,5),
  "confidence_interval" json,
  "effect_size" numeric(6,4),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "ab_test_def_status_check" CHECK ("status" IN ('draft', 'running', 'paused', 'concluded'))
);
CREATE INDEX "ab_test_def_status_idx" ON "ab_test_definitions" ("status");

CREATE TABLE "ab_test_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "experiment_id" text NOT NULL,
  "experiment_name" text NOT NULL,
  "variant_id" text NOT NULL,
  "assigned_at" timestamp DEFAULT now(),
  "assignment_reason" text,
  "first_exposed_at" timestamp,
  "exposure_count" integer DEFAULT 0,
  "conversion_at" timestamp,
  "primary_metric_value" numeric(10,4),
  "secondary_metrics_json" json DEFAULT '{}',
  "is_active" boolean DEFAULT true,
  "concluded_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "ab_test_user_experiment_unique" UNIQUE ("user_id", "experiment_id")
);
CREATE INDEX "ab_test_experiment_idx" ON "ab_test_assignments" ("experiment_id");
CREATE INDEX "ab_test_variant_idx" ON "ab_test_assignments" ("experiment_id", "variant_id");
CREATE INDEX "ab_test_active_idx" ON "ab_test_assignments" ("is_active");

CREATE TABLE "drift_metrics" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "metric_type" text NOT NULL,
  "correlation_id" integer REFERENCES "user_correlations"("id") ON DELETE SET NULL,
  "window_start" timestamp NOT NULL,
  "window_end" timestamp NOT NULL,
  "window_days" integer NOT NULL,
  "metric_value" numeric(10,6) NOT NULL,
  "sample_size" integer NOT NULL,
  "standard_error" numeric(10,6),
  "cusum_value" numeric(10,6),
  "cusum_upper_threshold" numeric(10,6),
  "cusum_lower_threshold" numeric(10,6),
  "drift_detected" boolean DEFAULT false,
  "drift_direction" text,
  "drift_magnitude" numeric(6,4),
  "drift_confidence" numeric(4,3),
  "alert_triggered" boolean DEFAULT false,
  "retraining_triggered" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "drift_metric_type_check" CHECK ("metric_type" IN ('correlation_strength', 'acceptance_rate', 'prediction_accuracy', 'feature_distribution'))
);
CREATE INDEX "drift_metrics_user_metric_idx" ON "drift_metrics" ("user_id", "metric_type");
CREATE INDEX "drift_metrics_window_idx" ON "drift_metrics" ("window_start", "window_end");
CREATE INDEX "drift_metrics_drift_idx" ON "drift_metrics" ("drift_detected");

CREATE TABLE "feature_interactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "feature_a" text NOT NULL,
  "feature_b" text NOT NULL,
  "target_outcome" text NOT NULL,
  "effect_a" numeric(8,5),
  "effect_b" numeric(8,5),
  "effect_ab" numeric(8,5),
  "interaction_effect" numeric(8,5) NOT NULL,
  "interaction_type" text,
  "interaction_p_value" numeric(8,7),
  "interaction_confidence_interval" json,
  "sample_size_both_present" integer,
  "sample_size_total" integer,
  "cohen_d" numeric(6,4),
  "is_practically_significant" boolean DEFAULT false,
  "last_computed_at" timestamp DEFAULT now(),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "feat_interaction_user_unique" UNIQUE ("user_id", "feature_a", "feature_b", "target_outcome"),
  CONSTRAINT "feat_interaction_type_check" CHECK ("interaction_type" IS NULL OR "interaction_type" IN ('synergistic', 'antagonistic', 'additive'))
);
CREATE INDEX "feat_interaction_user_idx" ON "feature_interactions" ("user_id");
CREATE INDEX "feat_interaction_outcome_idx" ON "feature_interactions" ("target_outcome");
CREATE INDEX "feat_interaction_active_idx" ON "feature_interactions" ("is_active");

CREATE TABLE IF NOT EXISTS "insight_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "recommendation_id" text,
  "recommendation_type" text NOT NULL,
  "domain" text NOT NULL,
  "action_type" text NOT NULL,
  "action_timestamp" timestamp DEFAULT now(),
  "context_json" json DEFAULT '{}',
  "expected_outcome_time" timestamp,
  "outcome_window_hours" integer,
  "outcome_verified" boolean DEFAULT false,
  "outcome_json" json,
  "outcome_success" boolean,
  "arm_key" text,
  "arm_updated" boolean DEFAULT false,
  "satisfaction_rating" integer,
  "satisfaction_feedback" text,
  "satisfaction_recorded_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "insight_actions_satisfaction_rating_check" CHECK ("satisfaction_rating" IS NULL OR ("satisfaction_rating" >= 1 AND "satisfaction_rating" <= 5))
);
CREATE INDEX IF NOT EXISTS "insight_actions_user_idx" ON "insight_actions" ("user_id");
CREATE INDEX IF NOT EXISTS "insight_actions_domain_idx" ON "insight_actions" ("user_id", "domain");
CREATE INDEX IF NOT EXISTS "insight_actions_action_type_idx" ON "insight_actions" ("user_id", "action_type");
CREATE INDEX IF NOT EXISTS "insight_actions_pending_verification_idx" ON "insight_actions" ("outcome_verified", "action_type", "expected_outcome_time");
CREATE INDEX IF NOT EXISTS "insight_actions_satisfaction_idx" ON "insight_actions" ("user_id", "satisfaction_rating");
CREATE INDEX IF NOT EXISTS "insight_actions_type_satisfaction_idx" ON "insight_actions" ("recommendation_type", "satisfaction_rating");

CREATE TABLE IF NOT EXISTS "user_thresholds" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "threshold_type" text NOT NULL,
  "threshold_value" numeric(10,2) NOT NULL,
  "threshold_unit" text NOT NULL,
  "source" text NOT NULL,
  "predictions_made" integer DEFAULT 0,
  "predictions_correct" integer DEFAULT 0,
  "accuracy_rate" numeric(3,2),
  "initial_value" numeric(10,2) NOT NULL,
  "adjustment_count" integer DEFAULT 0,
  "last_adjustment_at" timestamp,
  "adjustment_reason" text,
  "confidence_level" text DEFAULT 'low',
  "min_samples_for_adjustment" integer DEFAULT 5,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "user_threshold_unique" UNIQUE ("user_id", "threshold_type")
);
CREATE INDEX IF NOT EXISTS "user_thresholds_user_idx" ON "user_thresholds" ("user_id");
