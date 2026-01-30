-- Add streak_saved_by_freeze column for Snapchat-style streak notifications
-- This flag is set when a freeze is auto-consumed overnight to save the streak
-- Used to show "Streak Saved!" popup when user opens the app

ALTER TABLE gamification
ADD COLUMN IF NOT EXISTS streak_saved_by_freeze BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN gamification.streak_saved_by_freeze IS 'True when streak freeze was auto-consumed overnight, triggers UI notification';
