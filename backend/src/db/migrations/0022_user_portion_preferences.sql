-- Migration 0018: Add User Portion Preferences Table
-- Implements Phase 5: User Portion Learning System
-- Stores learned portion preferences per food for intelligent portion suggestions

-- Create user_portion_preferences table for learning system
CREATE TABLE IF NOT EXISTS "user_portion_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "canonical_name" text NOT NULL,
  "display_name" text,
  "preferred_portion_amount" numeric(8, 2) NOT NULL,
  "preferred_portion_unit" text NOT NULL,
  "confidence_score" numeric(3, 2) DEFAULT '0.5',
  "adjustment_count" integer DEFAULT 0,
  "total_logging_count" integer DEFAULT 0,
  "last_used" timestamp DEFAULT now(),
  "last_adjusted_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "user_portion_pref_user_canonical_unique" UNIQUE ("user_id", "canonical_name"),
  CONSTRAINT "confidence_score_check" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1),
  CONSTRAINT "adjustment_count_check" CHECK ("adjustment_count" >= 0),
  CONSTRAINT "total_logging_count_check" CHECK ("total_logging_count" >= 0),
  CONSTRAINT "portion_amount_check" CHECK ("preferred_portion_amount" > 0 AND "preferred_portion_amount" <= 9999),
  FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "user_portion_pref_user_id_idx" ON "user_portion_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "user_portion_pref_canonical_idx" ON "user_portion_preferences"("canonical_name");
CREATE INDEX IF NOT EXISTS "user_portion_pref_confidence_idx" ON "user_portion_preferences"("confidence_score");
CREATE INDEX IF NOT EXISTS "user_portion_pref_last_used_idx" ON "user_portion_preferences"("last_used");
