-- Additive per-device model. accountSettingsTable's single fcmToken/
-- expoPushToken columns are untouched — old app builds keep using them
-- unchanged. New app builds register into `devices` instead.
CREATE TABLE "devices" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "device_id" text NOT NULL,
  "platform" text,
  "fcm_token" text,
  "fcm_token_updated_at" timestamp,
  "expo_push_token" text,
  "expo_push_token_updated_at" timestamp,
  "last_seen_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "devices_user_device_unique" UNIQUE ("user_id", "device_id")
);
CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id");

CREATE TABLE "notification_ownership" (
  "id" serial PRIMARY KEY,
  "device_id" integer NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "owner" text NOT NULL DEFAULT 'backend',
  "registered_at" timestamp DEFAULT now(),
  CONSTRAINT "notification_ownership_device_category_unique" UNIQUE ("device_id", "category")
);

ALTER TABLE "notification_delivery_log"
  ADD COLUMN "device_id" integer REFERENCES "devices"("id") ON DELETE SET NULL;
