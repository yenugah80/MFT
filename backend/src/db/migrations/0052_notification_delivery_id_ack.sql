-- Message-specific, idempotent delivery confirmation, replacing an
-- account-level "last push ack" timestamp that could incorrectly confirm an
-- unrelated send within the same time window and had no per-device or
-- per-message ownership check.
ALTER TABLE "notification_delivery_log"
  ADD COLUMN "delivery_id" text UNIQUE,
  ADD COLUMN "acked_at" timestamp;
