-- Add push notification token columns to account_settings
ALTER TABLE "account_settings"
ADD COLUMN IF NOT EXISTS "expo_push_token" text,
ADD COLUMN IF NOT EXISTS "push_token_updated_at" timestamp,
ADD COLUMN IF NOT EXISTS "fcm_token" text,
ADD COLUMN IF NOT EXISTS "fcm_token_updated_at" timestamp,
ADD COLUMN IF NOT EXISTS "fcm_token_platform" text;
