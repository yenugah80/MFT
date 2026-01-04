/**
 * Profile Service
 * Provides direct database access for profile-related queries
 * Used by internal backend services to avoid HTTP overhead
 */

import { eq } from 'drizzle-orm';
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
} from '../db/schema.js';

/**
 * Get complete profile data for a user (internal service)
 * Mirrors getProfile from profileController but returns data directly
 * Avoids HTTP overhead by querying database directly
 *
 * @param {Object} db - Drizzle database instance
 * @param {string} userId - Clerk user ID
 * @returns {Promise<Object>} Profile data with basics, dietary, goals, gamification
 */
export async function getProfileData(db, userId) {
  try {
    // Helper for safe loading with detailed error handling
    const safeLoadSingle = async (table, where, tableName) => {
      try {
        const [row] = await db.select().from(table).where(where);
        return row || null;
      } catch (err) {
        // Table doesn't exist (PostgreSQL error code 42P01)
        if (err && err.code === '42P01') {
          console.warn(`⚠️ Table ${tableName} does not exist yet`);
          return null;
        }
        // Column doesn't exist (PostgreSQL error code 42703)
        if (err && err.code === '42703') {
          console.warn(`⚠️ Column missing in ${tableName}:`, err.message);
          return null;
        }
        console.error(`❌ Error loading ${tableName}:`, err);
        return null; // Graceful degradation
      }
    };

    // Load profile with safe error handling
    let profile;
    try {
      const profileResult = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId));
      profile = profileResult[0] || null;
    } catch (err) {
      // Column doesn't exist (PostgreSQL error code 42703)
      if (err && err.code === '42703') {
        console.warn(`⚠️ Some profile columns missing, attempting partial select:`, err.message);
        // Try with partial select (without new columns that might not exist)
        try {
          const profileResult = await db
            .select({
              id: profilesTable.id,
              userId: profilesTable.userId,
              fullName: profilesTable.fullName,
              email: profilesTable.email,
              gender: profilesTable.gender,
              age: profilesTable.age,
              weightKg: profilesTable.weightKg,
              heightCm: profilesTable.heightCm,
              activityLevel: profilesTable.activityLevel,
              cuisinePreference: profilesTable.cuisinePreference,
              region: profilesTable.region,
              cookingStyle: profilesTable.cookingStyle,
              notifications: profilesTable.notifications,
              createdAt: profilesTable.createdAt,
              updatedAt: profilesTable.updatedAt,
            })
            .from(profilesTable)
            .where(eq(profilesTable.userId, userId));
          profile = profileResult[0] || null;
        } catch (partialErr) {
          console.error('❌ Even partial profile load failed:', partialErr);
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (!profile) {
      console.log(`⚠️ Profile not found for user ${userId}`);
      return null;
    }

    // Load related data in parallel
    const [dietary, goals, gamification] = await Promise.all([
      safeLoadSingle(dietaryPreferencesTable, eq(dietaryPreferencesTable.userId, userId), 'dietary_preferences'),
      safeLoadSingle(nutritionGoalsTable, eq(nutritionGoalsTable.userId, userId), 'nutrition_goals'),
      safeLoadSingle(gamificationTable, eq(gamificationTable.userId, userId), 'gamification')
    ]);

    // Normalize profile data with safe defaults
    const basics = {
      fullName: profile.fullName || '',
      email: profile.email || '',
      gender: profile.gender || '',
      age: profile.age ?? null,
      weightKg: profile.weightKg ?? null,
      heightCm: profile.heightCm ?? null,
      activityLevel: profile.activityLevel || ''
    };

    const onboardingCompletedAt = profile.onboardingCompletedAt || null;

    const normalizedDietary = {
      preferences: Array.isArray(dietary?.preferences) ? dietary.preferences : [],
      allergies: Array.isArray(dietary?.allergies) ? dietary.allergies : [],
      dislikes: Array.isArray(dietary?.dislikes) ? dietary.dislikes : [],
      cuisinePreference: Array.isArray(profile?.cuisinePreference) ? profile.cuisinePreference : [],
      region: profile?.region || null,
      cookingStyle: profile?.cookingStyle || null
    };

    const normalizedGoals = {
      primaryGoal: goals?.primaryGoal || '',
      dailyCalories: goals?.dailyCalories ?? null,
      proteinG: goals?.proteinG ?? null,
      carbsG: goals?.carbsG ?? null,
      fatsG: goals?.fatsG ?? null,
      waterLiters: goals?.waterLiters ?? null
    };

    const normalizedGamification = {
      xp: gamification?.xp ?? 0,
      level: gamification?.level ?? 1,
      streak: gamification?.streak ?? 0,
      badges: Array.isArray(gamification?.badges) ? gamification.badges : []
    };

    return {
      basics,
      dietary: normalizedDietary,
      goals: normalizedGoals,
      gamification: normalizedGamification,
      onboardingCompletedAt
    };
  } catch (error) {
    console.error('❌ Error fetching profile data:', error);
    throw error;
  }
}
