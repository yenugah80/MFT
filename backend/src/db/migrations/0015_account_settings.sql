CREATE TABLE IF NOT EXISTS "account_settings" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL UNIQUE REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "privacy" jsonb DEFAULT '{}'::jsonb,
  "notifications" jsonb DEFAULT '{}'::jsonb,
  "preferences" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
