-- Migration 0027: Add UNIQUE Constraints for User Data Integrity
-- Purpose: Prevent duplicate records per user in dietary_preferences, nutrition_goals, and gamification tables
-- Impact: Enables safe use of .onConflictDoUpdate(target: userId) in application code
-- Date: January 3, 2026
-- Status: CRITICAL - Prevents silent data duplication

-- ============================================================================
-- Add UNIQUE Constraint on dietary_preferences.user_id
-- ============================================================================
-- Ensures only one dietary preferences record exists per user
-- If a duplicate insert is attempted, it will fail (unless using onConflict handler)

ALTER TABLE "dietary_preferences"
ADD CONSTRAINT "dietary_preferences_user_id_unique" UNIQUE ("user_id");

-- ============================================================================
-- Add UNIQUE Constraint on nutrition_goals.user_id
-- ============================================================================
-- Ensures only one nutrition goals record exists per user
-- If a duplicate insert is attempted, it will fail (unless using onConflict handler)

ALTER TABLE "nutrition_goals"
ADD CONSTRAINT "nutrition_goals_user_id_unique" UNIQUE ("user_id");

-- ============================================================================
-- Add UNIQUE Constraint on gamification.user_id
-- ============================================================================
-- Ensures only one gamification record exists per user
-- If a duplicate insert is attempted, it will fail (unless using onConflict handler)

ALTER TABLE "gamification"
ADD CONSTRAINT "gamification_user_id_unique" UNIQUE ("user_id");

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check constraints exist:
-- SELECT constraint_name, table_name FROM information_schema.table_constraints
-- WHERE constraint_type = 'UNIQUE'
-- AND table_name IN ('dietary_preferences', 'nutrition_goals', 'gamification')
-- AND constraint_name LIKE '%user_id_unique';
-- Should return 3 rows

-- Check for duplicate records before applying (will fail if duplicates exist):
-- SELECT user_id, COUNT(*) as count FROM dietary_preferences GROUP BY user_id HAVING COUNT(*) > 1;
-- SELECT user_id, COUNT(*) as count FROM nutrition_goals GROUP BY user_id HAVING COUNT(*) > 1;
-- SELECT user_id, COUNT(*) as count FROM gamification GROUP BY user_id HAVING COUNT(*) > 1;
