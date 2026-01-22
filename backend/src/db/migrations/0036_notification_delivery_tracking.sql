-- Migration: Notification Delivery & Snooze Tracking
-- Purpose: Track notification delivery, dismissals, snoozes, and user engagement
-- This enables:
--   1. Snooze persistence (users can snooze reminders)
--   2. Dismiss tracking (learn which notifications users don't want)
--   3. Delivery tracking (ensure we don't spam users)
--   4. Analytics (understand notification effectiveness)

-- ============================================================================
-- NOTIFICATION DELIVERY LOG
-- Tracks every notification sent to users
-- ============================================================================
CREATE TABLE IF NOT EXISTS "notification_delivery_log" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "channel" TEXT DEFAULT 'fcm', -- 'fcm' | 'expo' | 'local'
    "priority" INTEGER DEFAULT 3,
    "delivery_status" TEXT DEFAULT 'sent', -- 'sent' | 'delivered' | 'failed' | 'clicked'
    "error_message" TEXT,
    "clicked_at" TIMESTAMP,
    "screen_navigated" TEXT, -- Where user went after clicking
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- Index for querying user's recent notifications
CREATE INDEX IF NOT EXISTS "idx_notification_delivery_user_created"
    ON "notification_delivery_log" ("user_id", "created_at" DESC);

-- Index for analytics by type
CREATE INDEX IF NOT EXISTS "idx_notification_delivery_type_status"
    ON "notification_delivery_log" ("notification_type", "delivery_status");

-- ============================================================================
-- NOTIFICATION SNOOZE TABLE
-- Persists snooze state for reminders
-- ============================================================================
CREATE TABLE IF NOT EXISTS "notification_snoozes" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "snoozed_until" TIMESTAMP NOT NULL,
    "snooze_count" INTEGER DEFAULT 1, -- Track how many times snoozed
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),

    -- Ensure one snooze per user per type
    CONSTRAINT "unique_user_reminder_snooze" UNIQUE ("user_id", "reminder_type")
);

-- Index for checking active snoozes
CREATE INDEX IF NOT EXISTS "idx_notification_snoozes_active"
    ON "notification_snoozes" ("user_id", "snoozed_until");

-- ============================================================================
-- NOTIFICATION DISMISSALS TABLE
-- Tracks which notifications users dismiss (for learning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "notification_dismissals" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "reason" TEXT, -- 'not_relevant' | 'too_frequent' | 'wrong_time' | 'other'
    "dismissed_at" TIMESTAMP DEFAULT NOW()
);

-- Index for analyzing dismissal patterns
CREATE INDEX IF NOT EXISTS "idx_notification_dismissals_user_type"
    ON "notification_dismissals" ("user_id", "notification_type", "dismissed_at" DESC);

-- ============================================================================
-- USER NOTIFICATION PREFERENCES (Extended)
-- Add columns to account_settings for granular control
-- ============================================================================

-- Add quiet hours override
ALTER TABLE "account_settings"
    ADD COLUMN IF NOT EXISTS "quiet_hours_start" INTEGER DEFAULT 22,
    ADD COLUMN IF NOT EXISTS "quiet_hours_end" INTEGER DEFAULT 7;

-- Add per-category frequency limits
ALTER TABLE "account_settings"
    ADD COLUMN IF NOT EXISTS "notification_frequency" JSONB DEFAULT '{"hydration": 4, "food": 3, "mood": 2, "activity": 2, "motivation": 1}';

-- Add last notification timestamps per category (for rate limiting)
ALTER TABLE "account_settings"
    ADD COLUMN IF NOT EXISTS "last_notification_at" JSONB DEFAULT '{}';

-- ============================================================================
-- NOTIFICATION ANALYTICS VIEW
-- Materialized view for quick analytics queries
-- ============================================================================
CREATE OR REPLACE VIEW "notification_analytics" AS
SELECT
    notification_type,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'clicked') AS total_clicked,
    ROUND(
        COUNT(*) FILTER (WHERE delivery_status = 'clicked')::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS click_rate_percent
FROM "notification_delivery_log"
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY notification_type, DATE_TRUNC('day', created_at);

-- ============================================================================
-- HELPER FUNCTION: Check if user has active snooze
-- ============================================================================
CREATE OR REPLACE FUNCTION check_notification_snoozed(
    p_user_id TEXT,
    p_reminder_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "notification_snoozes"
        WHERE user_id = p_user_id
          AND reminder_type = p_reminder_type
          AND snoozed_until > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP: Remove expired snoozes (run periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_snoozes() RETURNS void AS $$
BEGIN
    DELETE FROM "notification_snoozes"
    WHERE snoozed_until < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
