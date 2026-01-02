import { eq } from "drizzle-orm";
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  accountSettingsTable,
} from "../db/schema.js";
import { sendDevError } from "../utils/sendDevError.js";
// Utility to ensure table shape (imported from server.js)
import { ensureProfilesTableShape } from "../server.js";

// --- Notification Preferences ---
export async function getNotifications(req, res) {
  try {
    const { userId } = req.auth;
    const [settings] = await req.db
      .select({ notifications: accountSettingsTable.notifications })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (settings?.notifications) {
      return res.status(200).json(settings.notifications);
    }

    const [profile] = await req.db
      .select({ notifications: profilesTable.notifications })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const notifications = profile.notifications || {};
    await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        notifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { notifications, updatedAt: new Date() },
      });

    res.status(200).json(notifications);
  } catch (error) {
    console.log("Error fetching notifications", error);
    sendDevError(res, error);
  }
}

export async function saveNotifications(req, res) {
  try {
    const { userId } = req.auth;
    const { notifications } = req.body;
    if (typeof notifications !== "object" || notifications === null) {
      return res.status(400).json({ error: "Invalid notifications object" });
    }
    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        notifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { notifications, updatedAt: new Date() },
      })
      .returning({ notifications: accountSettingsTable.notifications });

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(updated[0].notifications || {});
  } catch (error) {
    console.log("Error saving notifications", error);
    sendDevError(res, error);
  }
}

export async function getPrivacySettings(req, res) {
  try {
    const { userId } = req.auth;
    const [settings] = await req.db
      .select({ privacy: accountSettingsTable.privacy })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (!settings) {
      return res.status(200).json({
        shareInsights: false,
        analytics: true,
        biometricLock: false,
      });
    }
    res.status(200).json(settings.privacy || {});
  } catch (error) {
    console.log("Error fetching privacy settings", error);
    sendDevError(res, error);
  }
}

export async function savePrivacySettings(req, res) {
  try {
    const { userId } = req.auth;
    const { privacy } = req.body;
    if (typeof privacy !== "object" || privacy === null) {
      return res.status(400).json({ error: "Invalid privacy object" });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        privacy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { privacy, updatedAt: new Date() },
      })
      .returning({ privacy: accountSettingsTable.privacy });

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(updated[0].privacy || {});
  } catch (error) {
    console.log("Error saving privacy settings", error);
    sendDevError(res, error);
  }
}

export async function getPreferences(req, res) {
  try {
    const { userId } = req.auth;
    const [settings] = await req.db
      .select({ preferences: accountSettingsTable.preferences })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (!settings) {
      return res.status(200).json({
        autoAnalyze: true,
        hapticFeedback: true,
        metricUnits: true,
      });
    }
    res.status(200).json(settings.preferences || {});
  } catch (error) {
    console.log("Error fetching preferences", error);
    sendDevError(res, error);
  }
}

export async function savePreferences(req, res) {
  try {
    const { userId } = req.auth;
    const { preferences } = req.body;
    if (typeof preferences !== "object" || preferences === null) {
      return res.status(400).json({ error: "Invalid preferences object" });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        preferences,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { preferences, updatedAt: new Date() },
      })
      .returning({ preferences: accountSettingsTable.preferences });

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(updated[0].preferences || {});
  } catch (error) {
    console.log("Error saving preferences", error);
    sendDevError(res, error);
  }
}

export async function getProfile(req, res) {
  try {
    const { userId } = req.auth;

    // Ensure schema is up to date
    await ensureProfilesTableShape();

    // Helper for safe loading with detailed error handling
    const safeLoadSingle = async (table, where, tableName) => {
      try {
        const [row] = await req.db.select().from(table).where(where);
        return row || null;
      } catch (err) {
        // Table doesn't exist (PostgreSQL error code 42P01)
        if (err && err.code === "42P01") {
          console.warn(`⚠️ Table ${tableName} does not exist yet`);
          return null;
        }
        // Column doesn't exist (PostgreSQL error code 42703)
        if (err && err.code === "42703") {
          console.warn(`⚠️ Column missing in ${tableName}:`, err.message);
          return null;
        }
        console.error(`❌ Error loading ${tableName}:`, err);
        return null; // Graceful degradation
      }
    };

    // Load profile (with safe error handling for missing columns)
    let profile;
    try {
      const profileResult = await req.db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId));
      profile = profileResult[0] || null;
    } catch (err) {
      // Column doesn't exist (PostgreSQL error code 42703)
      if (err && err.code === "42703") {
        console.warn(`⚠️ Some profile columns missing, attempting partial select:`, err.message);
        // Try with partial select (without new columns that might not exist)
        try {
          const profileResult = await req.db
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
          console.log('✅ Partial profile load successful');
        } catch (partialErr) {
          console.error('❌ Even partial profile load failed:', partialErr);
          throw err; // Throw original error
        }
      } else {
        throw err; // Re-throw if not a missing column error
      }
    }

    if (!profile) {
      console.log(`⚠️ Profile not found for user ${userId}`);
      return res.status(404).json({
        error: "Profile not found",
        hint: "Profile may not have been created yet"
      });
    }

    // Load related data in parallel for better performance
    const [dietary, goals, gamification] = await Promise.all([
      safeLoadSingle(dietaryPreferencesTable, eq(dietaryPreferencesTable.userId, userId), 'dietary_preferences'),
      safeLoadSingle(nutritionGoalsTable, eq(nutritionGoalsTable.userId, userId), 'nutrition_goals'),
      safeLoadSingle(gamificationTable, eq(gamificationTable.userId, userId), 'gamification')
    ]);

    // Normalize profile data with safe defaults
    const basics = {
      fullName: profile.fullName || "",
      email: profile.email || "",
      gender: profile.gender || "",
      age: profile.age ?? null,
      weightKg: profile.weightKg ?? null,
      heightCm: profile.heightCm ?? null,
      activityLevel: profile.activityLevel || ""
    };

    // Include onboarding completion status
    const onboardingCompletedAt = profile.onboardingCompletedAt || null;

    const normalizedDietary = {
      preferences: Array.isArray(dietary?.preferences) ? dietary.preferences : [],
      allergies: Array.isArray(dietary?.allergies) ? dietary.allergies : [],
      dislikes: Array.isArray(dietary?.dislikes) ? dietary.dislikes : [],
      // 🆕 INCLUDE REGIONAL CONTEXT FROM PROFILES TABLE
      cuisinePreference: Array.isArray(profile?.cuisinePreference) ? profile.cuisinePreference : [],
      region: profile?.region || null,
      cookingStyle: profile?.cookingStyle || null
    };

    const normalizedGoals = {
      primaryGoal: goals?.primaryGoal || "",
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

    res.status(200).json({
      basics,
      dietary: normalizedDietary,
      goals: normalizedGoals,
      gamification: normalizedGamification,
      onboardingCompletedAt
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    sendDevError(res, error);
  }
}

export async function saveBasics(req, res) {
  try {
    const { userId } = req.auth;
    let { fullName, email, gender, age, weightKg, heightCm, activityLevel } = req.body;
    await ensureProfilesTableShape();

    // Validate gender if provided
    const validGenders = ['female', 'male', 'other'];
    if (gender && !validGenders.includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender value',
        message: `Gender must be one of: ${validGenders.join(', ')}`,
        received: gender,
      });
    }

    // Validate activity level if provided
    const validActivityLevels = ['sedentary', 'lightly_active', 'moderate', 'very_active', 'extremely_active'];
    if (activityLevel && !validActivityLevels.includes(activityLevel)) {
      return res.status(400).json({
        error: 'Invalid activity level value',
        message: `Activity level must be one of: ${validActivityLevels.join(', ')}`,
        received: activityLevel,
      });
    }

    // Map camelCase to snake_case for DB columns
    const upserted = await req.db
      .insert(profilesTable)
      .values({
        userId,
        fullName,
        email,
        gender,
        age: age ? parseInt(age, 10) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        heightCm: heightCm ? parseInt(heightCm, 10) : null,
        activityLevel,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profilesTable.userId,
        set: {
          fullName,
          email,
          gender,
          age: age ? parseInt(age, 10) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          heightCm: heightCm ? parseInt(heightCm, 10) : null,
          activityLevel,
          updatedAt: new Date(),
        },
      })
      .returning();
    const basicsRow = upserted[0];
    const basics = {
      fullName: basicsRow.fullName || "",
      email: basicsRow.email || "",
      gender: basicsRow.gender || "",
      age: basicsRow.age ?? null,
      weightKg: basicsRow.weightKg ?? null,
      heightCm: basicsRow.heightCm ?? null,
      activityLevel: basicsRow.activityLevel || ""
    };
    res.status(200).json(basics);
  } catch (error) {
    console.log("Error saving profile basics", error);
    sendDevError(res, error);
  }
}

/**
 * Normalize preference items - converts strings to {id, strength} objects
 * or validates existing objects
 */
function normalizePreference(item) {
  if (typeof item === 'string') {
    return { id: item, strength: 3 };
  }
  if (typeof item === 'object' && item !== null && item.id) {
    const strength = typeof item.strength === 'number' ? item.strength : 3;
    // Clamp strength to 1-5 range
    const validStrength = Math.max(1, Math.min(5, strength));
    return { id: item.id, strength: validStrength };
  }
  return null;
}

/**
 * Normalize array of preferences, filtering out invalid items
 */
function normalizePreferences(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizePreference)
    .filter(item => item !== null);
}

/**
 * Normalize allergies and dislikes (simple string arrays)
 */
function normalizeStringArray(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim());
}

export async function saveDietary(req, res) {
  try {
    const { userId } = req.auth;
    const { preferences, allergies, dislikes, cuisinePreference, region, cookingStyle } = req.body;

    // Validate that array fields are actually arrays
    if (preferences && !Array.isArray(preferences)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'preferences must be an array',
        received: typeof preferences,
      });
    }
    if (allergies && !Array.isArray(allergies)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'allergies must be an array',
        received: typeof allergies,
      });
    }
    if (dislikes && !Array.isArray(dislikes)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'dislikes must be an array',
        received: typeof dislikes,
      });
    }
    if (cuisinePreference && !Array.isArray(cuisinePreference)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'cuisinePreference must be an array',
        received: typeof cuisinePreference,
      });
    }

    // Normalize and validate preference data (with strength support)
    const normalizedPreferences = normalizePreferences(preferences);
    const normalizedCuisine = normalizePreferences(cuisinePreference);
    const normalizedAllergies = normalizeStringArray(allergies);
    const normalizedDislikes = normalizeStringArray(dislikes);

    // Ensure at least one dietary preference
    if (normalizedPreferences.length === 0 && normalizedCuisine.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'At least one dietary preference or cuisine preference is required',
      });
    }

    // 🆕 SAVE REGIONAL CONTEXT TO PROFILES TABLE
    if (normalizedCuisine.length > 0 || region || cookingStyle) {
      await req.db
        .update(profilesTable)
        .set({
          cuisinePreference: normalizedCuisine,
          region: region || null,
          cookingStyle: cookingStyle || null,
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.userId, userId));
    }

    // Use atomic upsert to avoid race condition (check-then-act)
    const dietaryResult = await req.db
      .insert(dietaryPreferencesTable)
      .values({
        userId,
        preferences: normalizedPreferences,
        allergies: normalizedAllergies,
        dislikes: normalizedDislikes,
      })
      .onConflictDoUpdate({
        target: dietaryPreferencesTable.userId,
        set: {
          preferences: normalizedPreferences,
          allergies: normalizedAllergies,
          dislikes: normalizedDislikes,
          updatedAt: new Date(),
        },
      })
      .returning();

    const dietaryRow = dietaryResult[0];
    const dietary = {
      preferences: Array.isArray(dietaryRow?.preferences) ? dietaryRow.preferences : [],
      allergies: Array.isArray(dietaryRow?.allergies) ? dietaryRow.allergies : [],
      dislikes: Array.isArray(dietaryRow?.dislikes) ? dietaryRow.dislikes : [],
      cuisinePreference: normalizedCuisine,
    };

    console.log('[saveDietary] Successfully saved dietary preferences:', {
      userId,
      preferencesCount: dietary.preferences.length,
      allergiesCount: dietary.allergies.length,
      cuisineCount: dietary.cuisinePreference.length,
    });

    res.status(200).json(dietary);
  } catch (error) {
    console.log("Error saving dietary preferences", error);
    sendDevError(res, error);
  }
}

export async function saveGoals(req, res) {
  try {
    const { userId } = req.auth;
    let { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters } = req.body;

    // Sanitize primaryGoal - normalize to valid values
    const goalMapping = {
      'lose_weight': 'lose',
      'maintain_weight': 'maintain',
      'gain_weight': 'gain',
      'gain_muscle': 'gain',
      'lose': 'lose',
      'maintain': 'maintain',
      'gain': 'gain'
    };

    if (primaryGoal && goalMapping[primaryGoal]) {
      primaryGoal = goalMapping[primaryGoal];
    } else if (primaryGoal && !['lose', 'maintain', 'gain'].includes(primaryGoal)) {
      console.warn(`⚠️ Invalid primaryGoal value: ${primaryGoal}, defaulting to 'maintain'`);
      primaryGoal = 'maintain';
    }

    // Validate numeric fields
    if (dailyCalories !== undefined && dailyCalories !== null && dailyCalories !== '') {
      const caloriesNum = parseInt(dailyCalories, 10);
      if (isNaN(caloriesNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'dailyCalories must be a valid number',
          received: dailyCalories,
        });
      }
      if (caloriesNum < 500 || caloriesNum > 10000) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'dailyCalories must be between 500 and 10,000',
          received: caloriesNum,
        });
      }
    }

    if (proteinG !== undefined && proteinG !== null && proteinG !== '') {
      const proteinNum = parseInt(proteinG, 10);
      if (isNaN(proteinNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'proteinG must be a valid number',
          received: proteinG,
        });
      }
      if (proteinNum < 0 || proteinNum > 500) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'proteinG must be between 0 and 500',
          received: proteinNum,
        });
      }
    }

    if (carbsG !== undefined && carbsG !== null && carbsG !== '') {
      const carbsNum = parseInt(carbsG, 10);
      if (isNaN(carbsNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'carbsG must be a valid number',
          received: carbsG,
        });
      }
      if (carbsNum < 0 || carbsNum > 1000) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'carbsG must be between 0 and 1,000',
          received: carbsNum,
        });
      }
    }

    if (fatsG !== undefined && fatsG !== null && fatsG !== '') {
      const fatsNum = parseInt(fatsG, 10);
      if (isNaN(fatsNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'fatsG must be a valid number',
          received: fatsG,
        });
      }
      if (fatsNum < 0 || fatsNum > 300) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'fatsG must be between 0 and 300',
          received: fatsNum,
        });
      }
    }

    if (waterLiters !== undefined && waterLiters !== null && waterLiters !== '') {
      const waterNum = parseFloat(waterLiters);
      if (isNaN(waterNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'waterLiters must be a valid number',
          received: waterLiters,
        });
      }
      if (waterNum < 0 || waterNum > 10) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'waterLiters must be between 0 and 10',
          received: waterNum,
        });
      }
    }

    // Use atomic upsert to avoid race condition (check-then-act)
    const goalsResult = await req.db
      .insert(nutritionGoalsTable)
      .values({
        userId,
        primaryGoal,
        dailyCalories: dailyCalories ? parseInt(dailyCalories, 10) : null,
        proteinG: proteinG ? parseInt(proteinG, 10) : null,
        carbsG: carbsG ? parseInt(carbsG, 10) : null,
        fatsG: fatsG ? parseInt(fatsG, 10) : null,
        waterLiters: waterLiters ? parseFloat(waterLiters) : null,
      })
      .onConflictDoUpdate({
        target: nutritionGoalsTable.userId,
        set: {
          primaryGoal,
          dailyCalories: dailyCalories ? parseInt(dailyCalories, 10) : null,
          proteinG: proteinG ? parseInt(proteinG, 10) : null,
          carbsG: carbsG ? parseInt(carbsG, 10) : null,
          fatsG: fatsG ? parseInt(fatsG, 10) : null,
          waterLiters: waterLiters ? parseFloat(waterLiters) : null,
          updatedAt: new Date(),
        },
      })
      .returning();
    const goalsRow = goalsResult[0];
    const goals = {
      primaryGoal: goalsRow?.primaryGoal || "",
      dailyCalories: goalsRow?.dailyCalories ?? null,
      proteinG: goalsRow?.proteinG ?? null,
      carbsG: goalsRow?.carbsG ?? null,
      fatsG: goalsRow?.fatsG ?? null,
      waterLiters: goalsRow?.waterLiters ?? null
    };
    res.status(200).json(goals);
  } catch (error) {
    console.log("Error saving nutrition goals", error);
    sendDevError(res, error);
  }
}

export async function saveGamification(req, res) {
  try {
    const { userId } = req.auth;
    const { xp, level, streak, badges } = req.body;
    // Use atomic upsert to avoid race condition (check-then-act)
    const gamificationResult = await req.db
      .insert(gamificationTable)
      .values({
        userId,
        xp: xp || 0,
        level: level || 1,
        streak: streak || 0,
        badges: badges || [],
      })
      .onConflictDoUpdate({
        target: gamificationTable.userId,
        set: {
          xp: xp || 0,
          level: level || 1,
          streak: streak || 0,
          badges: badges || [],
          updatedAt: new Date(),
        },
      })
      .returning();
    const gamificationRow = gamificationResult[0];
    const gamification = {
      xp: gamificationRow?.xp ?? 0,
      level: gamificationRow?.level ?? 1,
      streak: gamificationRow?.streak ?? 0,
      badges: Array.isArray(gamificationRow?.badges) ? gamificationRow.badges : []
    };
    res.status(200).json(gamification);
  } catch (error) {
    console.log("Error saving gamification stats", error);
    sendDevError(res, error);
  }
}

/**
 * Mark onboarding as complete for the user
 * Called when user finishes the 4-step onboarding flow
 * Sets onboarding_completed_at timestamp to current time
 */
export async function completeOnboarding(req, res) {
  try {
    const { userId } = req.auth;

    // Ensure schema is up to date
    await ensureProfilesTableShape();

    // Update profile with onboarding completion timestamp
    const updated = await req.db
      .update(profilesTable)
      .set({
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({
        error: "Profile not found",
        hint: "User profile must exist before marking onboarding complete"
      });
    }

    const profile = updated[0];
    res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
      onboardingCompletedAt: profile.onboardingCompletedAt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error completing onboarding:", error);
    sendDevError(res, error);
  }
}
