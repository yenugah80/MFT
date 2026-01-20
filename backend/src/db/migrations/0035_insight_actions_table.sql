-- Migration: Add insight_actions table for recommendation outcome verification
-- This table tracks user interactions with recommendations and verifies their outcomes
-- for Thompson Sampling prior updates and prediction calibration

CREATE TABLE IF NOT EXISTS "insight_actions" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
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
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "insight_actions_user_id_idx" ON "insight_actions" ("user_id");
CREATE INDEX IF NOT EXISTS "insight_actions_domain_idx" ON "insight_actions" ("domain");
CREATE INDEX IF NOT EXISTS "insight_actions_action_type_idx" ON "insight_actions" ("action_type");
CREATE INDEX IF NOT EXISTS "insight_actions_outcome_verified_idx" ON "insight_actions" ("outcome_verified");
CREATE INDEX IF NOT EXISTS "insight_actions_expected_outcome_time_idx" ON "insight_actions" ("expected_outcome_time");
