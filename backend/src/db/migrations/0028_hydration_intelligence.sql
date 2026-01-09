-- Migration 0028: Hydration Intelligence System
-- Purpose: Add tables for predictive hydration intelligence, persona classification, and user feedback
-- Features: Cold-start progressive disclosure, explainable predictions, reversible insights
-- Date: January 9, 2026
-- Status: Phase 0 - Foundation

-- ============================================================================
-- TABLE 1: hydration_daily_summary
-- Pre-computed daily aggregates for the WARM PATH (<500ms)
-- Regeneratable from water_log - no user data lost if truncated
-- ============================================================================

CREATE TABLE IF NOT EXISTS "hydration_daily_summary" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "date" DATE NOT NULL,

  -- Raw totals
  "total_ml" INTEGER NOT NULL DEFAULT 0,
  "hydration_ml" INTEGER NOT NULL DEFAULT 0, -- After beverage factors applied
  "log_count" INTEGER NOT NULL DEFAULT 0,

  -- Beverage breakdown (JSON for flexibility)
  -- { water: 0.6, coffee: 0.2, tea: 0.1, juice: 0.1 }
  "beverage_breakdown" JSONB DEFAULT '{}',

  -- Goal tracking
  "goal_ml" INTEGER, -- User's goal for this day
  "goal_met" BOOLEAN DEFAULT FALSE,
  "goal_percent" DECIMAL(5, 2), -- 0.00 to 100.00+

  -- Pattern features (computed during aggregation)
  "peak_hour" INTEGER, -- 0-23, hour with most intake
  "distribution_variance" DECIMAL(8, 4), -- How evenly spread across day
  "first_log_hour" INTEGER, -- 0-23
  "last_log_hour" INTEGER, -- 0-23

  -- Computed at aggregation time
  "computed_at" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one summary per user per day
CREATE UNIQUE INDEX "hydration_daily_user_date_idx"
ON "hydration_daily_summary"("user_id", "date");

-- Index for date range queries (weekly/monthly aggregates)
CREATE INDEX "hydration_daily_date_idx" ON "hydration_daily_summary"("date");

-- Index for user queries
CREATE INDEX "hydration_daily_user_idx" ON "hydration_daily_summary"("user_id");

-- CHECK constraints
ALTER TABLE "hydration_daily_summary"
ADD CONSTRAINT "hydration_total_ml_check" CHECK ("total_ml" >= 0);

ALTER TABLE "hydration_daily_summary"
ADD CONSTRAINT "hydration_log_count_check" CHECK ("log_count" >= 0);

ALTER TABLE "hydration_daily_summary"
ADD CONSTRAINT "hydration_peak_hour_check" CHECK ("peak_hour" IS NULL OR ("peak_hour" >= 0 AND "peak_hour" <= 23));


-- ============================================================================
-- TABLE 2: user_hydration_profile
-- User intelligence - persona, patterns, privacy controls
-- Can be deleted/reset by user (GDPR compliant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user_hydration_profile" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,

  -- Persona classification (NULL until day 7)
  "persona_type" TEXT, -- CONSISTENT_SIPPER, MORNING_DEHYDRATOR, etc.
  "persona_confidence" DECIMAL(3, 2), -- 0.00-1.00
  "persona_assigned_at" TIMESTAMP,
  "persona_version" TEXT DEFAULT 'v1', -- Algorithm version for reproducibility

  -- Learned patterns (JSON for flexibility)
  -- { hourlyDistribution: [...], weekdayVsWeekend: {...}, beveragePrefs: {...} }
  "patterns_json" JSONB DEFAULT '{}',

  -- Privacy controls (user can disable)
  "pattern_tracking_enabled" BOOLEAN DEFAULT TRUE,
  "predictions_enabled" BOOLEAN DEFAULT TRUE,
  "insights_enabled" BOOLEAN DEFAULT TRUE,

  -- Calendar integration
  "calendar_connected" BOOLEAN DEFAULT FALSE,
  "calendar_provider" TEXT, -- 'apple', 'google', NULL
  "calendar_connected_at" TIMESTAMP,

  -- Cold start tracking
  "onboarding_stage" TEXT DEFAULT 'day0', -- day0, days1-3, days4-7, established, power_user
  "first_log_at" TIMESTAMP,
  "days_with_data" INTEGER DEFAULT 0,

  -- Computation metadata
  "last_pattern_compute_at" TIMESTAMP,
  "last_persona_compute_at" TIMESTAMP,

  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one profile per user
CREATE UNIQUE INDEX "hydration_profile_user_idx"
ON "user_hydration_profile"("user_id");

-- Index for stage-based queries (for batch processing by stage)
CREATE INDEX "hydration_profile_stage_idx" ON "user_hydration_profile"("onboarding_stage");

-- CHECK constraints
ALTER TABLE "user_hydration_profile"
ADD CONSTRAINT "hydration_persona_confidence_check"
CHECK ("persona_confidence" IS NULL OR ("persona_confidence" >= 0 AND "persona_confidence" <= 1));

ALTER TABLE "user_hydration_profile"
ADD CONSTRAINT "hydration_stage_check"
CHECK ("onboarding_stage" IN ('day0', 'days1-3', 'days4-7', 'established', 'power_user'));

ALTER TABLE "user_hydration_profile"
ADD CONSTRAINT "hydration_calendar_provider_check"
CHECK ("calendar_provider" IS NULL OR "calendar_provider" IN ('apple', 'google'));


-- ============================================================================
-- TABLE 3: hydration_predictions
-- Ephemeral predictions - regenerated daily, can be purged
-- For WARM PATH queries - pre-computed at midnight
-- ============================================================================

CREATE TABLE IF NOT EXISTS "hydration_predictions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "prediction_date" DATE NOT NULL,

  -- Core prediction
  "predicted_need_ml" INTEGER NOT NULL,
  "baseline_ml" INTEGER NOT NULL, -- User's typical intake

  -- Explainable factors (JSON array)
  -- [{ type: 'meeting', description: '2hr meeting at 10am', adjustment_ml: 200 }, ...]
  "factors" JSONB DEFAULT '[]',

  -- Confidence and metadata
  "confidence" DECIMAL(3, 2), -- 0.00-1.00
  "algorithm_version" TEXT DEFAULT 'v1',
  "data_points_used" INTEGER, -- How many days of data informed this

  -- Context that influenced prediction
  "context_json" JSONB DEFAULT '{}', -- { hasCalendar: true, meetingCount: 3, ... }

  -- Lifecycle
  "generated_at" TIMESTAMP DEFAULT NOW(),
  "expires_at" TIMESTAMP, -- For automatic cleanup
  "was_shown_to_user" BOOLEAN DEFAULT FALSE,
  "shown_at" TIMESTAMP,

  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one prediction per user per date
CREATE UNIQUE INDEX "hydration_predictions_user_date_idx"
ON "hydration_predictions"("user_id", "prediction_date");

-- Index for cleanup job (delete expired predictions)
CREATE INDEX "hydration_predictions_expires_idx" ON "hydration_predictions"("expires_at");

-- Index for user's upcoming predictions
CREATE INDEX "hydration_predictions_user_idx" ON "hydration_predictions"("user_id", "prediction_date");

-- CHECK constraints
ALTER TABLE "hydration_predictions"
ADD CONSTRAINT "hydration_prediction_ml_check" CHECK ("predicted_need_ml" > 0);

ALTER TABLE "hydration_predictions"
ADD CONSTRAINT "hydration_prediction_confidence_check"
CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));


-- ============================================================================
-- TABLE 4: insight_feedback
-- User feedback loop for learning and improvement
-- Helps improve insight quality and respects user preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS "insight_feedback" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,

  -- Insight identification
  "insight_type" TEXT NOT NULL, -- 'prediction', 'pattern', 'persona', 'suggestion'
  "insight_id" TEXT NOT NULL, -- Unique identifier for the specific insight
  "insight_version" TEXT DEFAULT 'v1', -- Algorithm version

  -- User feedback
  "was_helpful" BOOLEAN, -- true/false/null (not yet rated)
  "dismissed" BOOLEAN DEFAULT FALSE,
  "dismiss_reason" TEXT, -- 'not_accurate', 'not_useful', 'too_frequent', 'privacy'

  -- Optional detailed feedback
  "feedback_text" TEXT, -- Free-form user feedback
  "accuracy_rating" INTEGER, -- 1-5 stars

  -- Context at feedback time
  "context_json" JSONB DEFAULT '{}', -- { actualIntake: 2100, predictedIntake: 2400, ... }

  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Index for user's feedback history
CREATE INDEX "insight_feedback_user_idx" ON "insight_feedback"("user_id");

-- Index for analyzing feedback by insight type
CREATE INDEX "insight_feedback_type_idx" ON "insight_feedback"("insight_type");

-- Composite index for checking if user already gave feedback
CREATE UNIQUE INDEX "insight_feedback_user_insight_idx"
ON "insight_feedback"("user_id", "insight_type", "insight_id");

-- CHECK constraints
ALTER TABLE "insight_feedback"
ADD CONSTRAINT "insight_feedback_type_check"
CHECK ("insight_type" IN ('prediction', 'pattern', 'persona', 'suggestion', 'correlation'));

ALTER TABLE "insight_feedback"
ADD CONSTRAINT "insight_feedback_reason_check"
CHECK ("dismiss_reason" IS NULL OR "dismiss_reason" IN ('not_accurate', 'not_useful', 'too_frequent', 'privacy', 'other'));

ALTER TABLE "insight_feedback"
ADD CONSTRAINT "insight_feedback_rating_check"
CHECK ("accuracy_rating" IS NULL OR ("accuracy_rating" >= 1 AND "accuracy_rating" <= 5));


-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('hydration_daily_summary', 'user_hydration_profile', 'hydration_predictions', 'insight_feedback');
-- Should return 4 rows

-- Check indexes exist:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('hydration_daily_summary', 'user_hydration_profile', 'hydration_predictions', 'insight_feedback');
