-- Migration 0017: Add Lottie Animation Support to Achievements
-- Adds lottie_source column and updates existing achievements with animation mappings

-- 1. Add lottie_source column to achievements table
ALTER TABLE "achievements"
  ADD COLUMN IF NOT EXISTS "lottie_source" text;

-- 2. Update existing achievements with Lottie animation sources

-- Streak achievements (3, 7, 14 use streak.json; 30, 60, 90 use celebration.json)
UPDATE "achievements" SET "lottie_source" = 'streak' WHERE "name" = 'Getting Started';
UPDATE "achievements" SET "lottie_source" = 'streak' WHERE "name" = 'Week Warrior';
UPDATE "achievements" SET "lottie_source" = 'streak' WHERE "name" = 'Two Week Titan';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Monthly Master';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Consistency King';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Legendary Discipline';

-- Meal count achievements (10, 50 use success.json; 100+ use celebration.json)
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'First Steps';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Tracking Pro';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Century Club';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Tracking Legend';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Hall of Fame';

-- Level achievements (5 uses success.json; 10+ use celebration.json)
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Apprentice Unlocked';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Expert Unlocked';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Master Unlocked';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Grandmaster Unlocked';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Legend Status';

-- Nutrition achievements (most use success.json; 30-day uses celebration.json)
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Protein Power';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Macro Balance';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Calorie Consistency';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Hydration Hero';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Plant Power';

-- Recovery achievements (most use success.json; comeback_kid and travel_logger use celebration.json)
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Back on Track';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Weekend Warrior';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Early Bird';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Night Owl';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Comeback Kid';
UPDATE "achievements" SET "lottie_source" = 'success' WHERE "name" = 'Fresh Start Monday';
UPDATE "achievements" SET "lottie_source" = 'celebration' WHERE "name" = 'Travel Logger';
