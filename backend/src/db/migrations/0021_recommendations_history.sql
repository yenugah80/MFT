-- Migration: 0021_recommendations_history.sql
-- Description: Create recommendations_history table for tracking all recommendations
--              shown to users and their interactions (view, accept, reject)
-- Purpose: Enable recommendation history tracking, user engagement analytics,
--          and ML-based personalization improvements

CREATE TABLE "recommendations_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "recommendation_id" text NOT NULL UNIQUE, -- Format: rec-{timestamp}-{index}

  -- Recommendation Content
  "food_name" text NOT NULL,
  "portion" text,
  "calories" integer NOT NULL,
  "protein" integer NOT NULL,
  "carbs" integer NOT NULL,
  "fats" integer NOT NULL,
  "fiber" integer DEFAULT 0,
  "sugar" integer DEFAULT 0,

  -- Micronutrients (JSON for flexibility)
  "micros" jsonb DEFAULT '{}'::jsonb,

  -- Recommendation Metadata
  "recommendation_type" text NOT NULL, -- PROTEIN_BOOST, LIGHT_SNACK, HYDRATION, REGIONAL_PICK, BALANCED_MEAL
  "reason" text,
  "tips" text,
  "prep_time_minutes" integer,
  "recipe_instructions" text,

  -- Context at Time of Recommendation
  "meal_type" text, -- breakfast, lunch, dinner, snack
  "time_of_day" integer, -- Hour of day (0-23)
  "remaining_calories" integer,
  "remaining_protein" integer,
  "remaining_carbs" integer,
  "remaining_fats" integer,

  -- User Interaction Tracking
  "interaction_status" text DEFAULT 'shown', -- shown, viewed, accepted, rejected, customized
  "shown_at" timestamp DEFAULT now(),
  "viewed_at" timestamp,
  "interacted_at" timestamp,
  "rejection_reason" text,
  "customized_portion" text,

  -- Outcome Tracking
  "was_logged" boolean DEFAULT false,
  "logged_food_id" integer, -- FK to food_log if accepted
  "logged_at" timestamp,

  -- AI Metadata
  "ai_generated" boolean DEFAULT true,
  "ai_model" text DEFAULT 'gpt-4o-mini',
  "ai_confidence" numeric(3,2),

  -- Personalization Score (calculated by backend)
  "personalization_score" numeric(3,2), -- 0.00-1.00

  -- Timestamps
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX "idx_rec_history_user_id" ON "recommendations_history"("user_id");
CREATE INDEX "idx_rec_history_recommendation_id" ON "recommendations_history"("recommendation_id");
CREATE INDEX "idx_rec_history_user_status" ON "recommendations_history"("user_id", "interaction_status");
CREATE INDEX "idx_rec_history_shown_at" ON "recommendations_history"("shown_at");
CREATE INDEX "idx_rec_history_meal_type" ON "recommendations_history"("meal_type");
CREATE INDEX "idx_rec_history_rec_type" ON "recommendations_history"("recommendation_type");

-- Foreign key constraint (optional - only if food_log exists)
-- ALTER TABLE "recommendations_history"
--   ADD CONSTRAINT "fk_logged_food"
--   FOREIGN KEY ("logged_food_id")
--   REFERENCES "food_log"("id")
--   ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE "recommendations_history" IS 'Tracks all recommendations shown to users and their interactions';
COMMENT ON COLUMN "recommendations_history"."interaction_status" IS 'User interaction: shown, viewed, accepted, rejected, customized';
COMMENT ON COLUMN "recommendations_history"."personalization_score" IS 'How well this recommendation matches user preferences (0.00-1.00)';
COMMENT ON COLUMN "recommendations_history"."was_logged" IS 'Whether user actually logged this food';
