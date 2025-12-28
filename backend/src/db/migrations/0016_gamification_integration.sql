-- Migration 0016: Gamification Integration
-- Adds daily meal tracking, enhances gamification table, and populates achievements

-- 1. Create daily_meal_counts table for tracking daily XP cap
CREATE TABLE IF NOT EXISTS "daily_meal_counts" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "meal_count" integer DEFAULT 0 CHECK ("meal_count" >= 0),
  "xp_earned_today" integer DEFAULT 0 CHECK ("xp_earned_today" >= 0),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "daily_meal_counts_user_date_idx"
  ON "daily_meal_counts"("user_id", "date");

-- 2. Enhance gamification table with new tracking columns
ALTER TABLE "gamification"
  ADD COLUMN IF NOT EXISTS "last_streak_updated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "total_meals_logged" integer DEFAULT 0 CHECK ("total_meals_logged" >= 0),
  ADD COLUMN IF NOT EXISTS "last_log_date" timestamp,
  ADD COLUMN IF NOT EXISTS "last_xp_awarded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "streak_freezes" integer DEFAULT 0 CHECK ("streak_freezes" >= 0),
  ADD COLUMN IF NOT EXISTS "last_freeze_awarded_at" timestamp;

-- 3. Populate achievements table with all achievement categories

-- Category 1: Streak Milestones
INSERT INTO "achievements" (name, description, icon, required_points, category) VALUES
  ('Getting Started', 'Log food for 3 days in a row', '🔥', 50, 'streak'),
  ('Week Warrior', 'Maintain a 7-day logging streak', '⚡', 100, 'streak'),
  ('Two Week Titan', 'Keep your streak alive for 14 days', '💪', 200, 'streak'),
  ('Monthly Master', 'Achieve a 30-day logging streak', '🏆', 500, 'streak'),
  ('Consistency King', 'Dominate with a 60-day streak', '👑', 1000, 'streak'),
  ('Legendary Discipline', 'Master the art of consistency with 90 days', '🌟', 2000, 'streak')
ON CONFLICT (name) DO NOTHING;

-- Category 2: Total Meals Logged
INSERT INTO "achievements" (name, description, icon, required_points, category) VALUES
  ('First Steps', 'Log your first 10 meals', '🍽️', 50, 'meal_count'),
  ('Tracking Pro', 'Reach 50 logged meals', '📊', 200, 'meal_count'),
  ('Century Club', 'Join the elite with 100 meals logged', '💯', 500, 'meal_count'),
  ('Tracking Legend', 'Legendary dedication with 500 meals', '🎖️', 2000, 'meal_count'),
  ('Hall of Fame', 'Enter the Hall of Fame with 1000 meals', '🏛️', 5000, 'meal_count')
ON CONFLICT (name) DO NOTHING;

-- Category 3: Level Milestones
INSERT INTO "achievements" (name, description, icon, required_points, category) VALUES
  ('Apprentice Unlocked', 'Reach level 5', '🎓', 100, 'level'),
  ('Expert Unlocked', 'Achieve Expert status at level 10', '🔬', 500, 'level'),
  ('Master Unlocked', 'Become a Master at level 20', '🥋', 1500, 'level'),
  ('Grandmaster Unlocked', 'Ascend to Grandmaster at level 30', '🧙', 3000, 'level'),
  ('Legend Status', 'Achieve legendary status at level 50', '⚔️', 10000, 'level')
ON CONFLICT (name) DO NOTHING;

-- Category 4: Nutrition Mastery (Optional Advanced)
INSERT INTO "achievements" (name, description, icon, required_points, category) VALUES
  ('Protein Power', 'Hit your protein goal 5 days in a row', '🥩', 300, 'nutrition'),
  ('Macro Balance', 'Maintain balanced macros for 7 days', '⚖️', 500, 'nutrition'),
  ('Calorie Consistency', 'Stay within calorie goal for 30 days', '🎯', 1000, 'nutrition'),
  ('Hydration Hero', 'Hit water goal for 14 days straight', '💧', 400, 'nutrition'),
  ('Plant Power', 'Get 5 servings of veggies for 7 days', '🥗', 350, 'nutrition')
ON CONFLICT (name) DO NOTHING;

-- Category 5: Recovery/Consistency (SECRET WEAPON)
INSERT INTO "achievements" (name, description, icon, required_points, category) VALUES
  ('Back on Track', 'Logged after missing 1+ days', '↩️', 100, 'recovery'),
  ('Weekend Warrior', 'Logged on both Saturday & Sunday', '🎯', 150, 'recovery'),
  ('Early Bird', 'Logged breakfast before 9 AM 5 times', '🌅', 200, 'recovery'),
  ('Night Owl', 'Logged dinner after 8 PM 5 times', '🌙', 200, 'recovery'),
  ('Comeback Kid', 'Rebuilt a 7-day streak after a break', '💪', 300, 'recovery'),
  ('Fresh Start Monday', 'Logged on Monday after missing the weekend', '🌟', 100, 'recovery'),
  ('Travel Logger', 'Logged while timezone changed', '✈️', 250, 'recovery')
ON CONFLICT (name) DO NOTHING;
