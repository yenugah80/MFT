-- Migration: Create saved_meal_plans table for persisting AI-generated meal plans
CREATE TABLE IF NOT EXISTS "saved_meal_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE cascade,
  "plan_data" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "saved_at" timestamp DEFAULT now(),
  CONSTRAINT "saved_meal_plans_user_id_unique" UNIQUE ("user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_meal_plans_user_id_idx" ON "saved_meal_plans" ("user_id");
