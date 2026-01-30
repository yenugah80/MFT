import { eq } from "drizzle-orm";
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  accountSettingsTable,
  foodLogTable,
  waterLogTable,
  moodLogTable,
  activityLogTable,
} from "../db/schema.js";
import { sendDevError } from "../utils/sendDevError.js";
// Utility to ensure table shape (imported from server.js)
import { ensureProfilesTableShape } from "../server.js";

// Valid preference IDs (must match mobile/constants/onboardingConfig.js)
const VALID_DIETARY_PREFERENCES = [
  'balanced', 'vegan', 'keto', 'vegetarian', 'pescatarian', 'paleo', 'low_carb', 'gluten_free'
];

// Expanded allergen list following FDA Top 9 + EU regulations
const VALID_ALLERGIES = [
  // FDA Top 9
  'nuts', 'dairy', 'eggs', 'shellfish', 'soy', 'wheat', 'fish', 'peanuts', 'sesame',
  // Additional common allergens (EU regulations)
  'gluten', 'mustard', 'celery', 'sulfites', 'lupin', 'mollusks',
  // Specific nut types for granular tracking
  'tree_nuts', 'almonds', 'cashews', 'walnuts', 'pecans', 'pistachios', 'hazelnuts', 'macadamia',
];

const VALID_CUISINE_PREFERENCES = [
  'mediterranean', 'asian', 'mexican', 'indian', 'american', 'italian', 'middle_eastern', 'african'
];

// --- Push Token Management ---
export async function savePushToken(req, res) {
  try {
    const { userId } = req.auth;
    const { expoPushToken } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ error: 'Invalid push token' });
    }

    // Validate Expo push token format
    if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
      return res.status(400).json({
        error: 'Invalid Expo push token format',
        hint: 'Token should start with ExponentPushToken[ or ExpoPushToken['
      });
    }

    // Check if profile exists first (foreign key constraint)
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      // Profile doesn't exist yet - gracefully skip push token registration
      // This can happen when push token registration runs before profile creation
      console.log(`[savePushToken] Profile not found for user ${userId} - will retry after profile creation`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet, push token will be registered after profile creation',
        retryAfterProfileCreation: true
      });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        expoPushToken,
        pushTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: {
          expoPushToken,
          pushTokenUpdatedAt: new Date(),
          updatedAt: new Date()
        },
      })
      .returning({ expoPushToken: accountSettingsTable.expoPushToken });

    console.log(`[savePushToken] Saved push token for user ${userId}`);
    res.status(200).json({
      success: true,
      tokenRegistered: true,
      expoPushToken: updated[0]?.expoPushToken
    });
  } catch (error) {
    // Handle foreign key constraint violation gracefully
    if (error.code === '23503') { // PostgreSQL foreign key violation
      console.log(`[savePushToken] Profile not found (FK error) for user ${req.auth?.userId}`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[savePushToken] Error saving push token:', error);
    sendDevError(res, error);
  }
}

export async function deletePushToken(req, res) {
  try {
    const { userId } = req.auth;

    await req.db
      .update(accountSettingsTable)
      .set({
        expoPushToken: null,
        pushTokenUpdatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(accountSettingsTable.userId, userId));

    console.log(`[deletePushToken] Removed push token for user ${userId}`);
    res.status(200).json({ success: true, tokenRegistered: false });
  } catch (error) {
    console.error('[deletePushToken] Error removing push token:', error);
    sendDevError(res, error);
  }
}

export async function getPushTokenStatus(req, res) {
  try {
    const { userId } = req.auth;

    const [settings] = await req.db
      .select({
        expoPushToken: accountSettingsTable.expoPushToken,
        pushTokenUpdatedAt: accountSettingsTable.pushTokenUpdatedAt
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    res.status(200).json({
      tokenRegistered: !!settings?.expoPushToken,
      lastUpdated: settings?.pushTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('[getPushTokenStatus] Error:', error);
    sendDevError(res, error);
  }
}

// --- FCM Token Management (Firebase Cloud Messaging) ---
export async function saveFCMToken(req, res) {
  try {
    const { userId } = req.auth;
    const { fcmToken, platform } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ error: 'Invalid FCM token' });
    }

    // Basic FCM token validation (tokens are typically 150+ characters)
    if (fcmToken.length < 100) {
      return res.status(400).json({
        error: 'Invalid FCM token format',
        hint: 'FCM tokens are typically 150+ characters'
      });
    }

    // Check if profile exists first (foreign key constraint)
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      console.log(`[saveFCMToken] Profile not found for user ${userId} - will retry after profile creation`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet, FCM token will be registered after profile creation',
        retryAfterProfileCreation: true
      });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
        fcmTokenPlatform: platform || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: {
          fcmToken,
          fcmTokenUpdatedAt: new Date(),
          fcmTokenPlatform: platform || null,
          updatedAt: new Date()
        },
      })
      .returning({ fcmToken: accountSettingsTable.fcmToken });

    console.log(`[saveFCMToken] Saved FCM token for user ${userId} (${platform || 'unknown platform'})`);
    res.status(200).json({
      success: true,
      tokenRegistered: true,
    });
  } catch (error) {
    // Handle foreign key constraint violation gracefully
    if (error.code === '23503') {
      console.log(`[saveFCMToken] Profile not found (FK error) for user ${req.auth?.userId}`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[saveFCMToken] Error saving FCM token:', error);
    sendDevError(res, error);
  }
}

export async function deleteFCMToken(req, res) {
  try {
    const { userId } = req.auth;

    await req.db
      .update(accountSettingsTable)
      .set({
        fcmToken: null,
        fcmTokenUpdatedAt: new Date(),
        fcmTokenPlatform: null,
        updatedAt: new Date()
      })
      .where(eq(accountSettingsTable.userId, userId));

    console.log(`[deleteFCMToken] Removed FCM token for user ${userId}`);
    res.status(200).json({ success: true, tokenRegistered: false });
  } catch (error) {
    console.error('[deleteFCMToken] Error removing FCM token:', error);
    sendDevError(res, error);
  }
}

export async function getFCMTokenStatus(req, res) {
  try {
    const { userId } = req.auth;

    const [settings] = await req.db
      .select({
        fcmToken: accountSettingsTable.fcmToken,
        fcmTokenUpdatedAt: accountSettingsTable.fcmTokenUpdatedAt,
        fcmTokenPlatform: accountSettingsTable.fcmTokenPlatform,
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    res.status(200).json({
      tokenRegistered: !!settings?.fcmToken,
      platform: settings?.fcmTokenPlatform || null,
      lastUpdated: settings?.fcmTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('[getFCMTokenStatus] Error:', error);
    sendDevError(res, error);
  }
}

// --- Combined Push Token Endpoint (Expo + FCM) ---
export async function saveBothPushTokens(req, res) {
  try {
    const { userId } = req.auth;
    const { expoPushToken, fcmToken, platform } = req.body;

    // Check if profile exists first
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      console.log(`[saveBothPushTokens] Profile not found for user ${userId}`);
      return res.status(202).json({
        success: false,
        expoPushTokenRegistered: false,
        fcmTokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    // Add Expo token if provided
    if (expoPushToken) {
      if (expoPushToken.startsWith('ExponentPushToken[') || expoPushToken.startsWith('ExpoPushToken[')) {
        updateData.expoPushToken = expoPushToken;
        updateData.pushTokenUpdatedAt = new Date();
      } else {
        return res.status(400).json({
          error: 'Invalid Expo push token format',
          hint: 'Token should start with ExponentPushToken[ or ExpoPushToken['
        });
      }
    }

    // Add FCM token if provided
    if (fcmToken) {
      if (fcmToken.length >= 100) {
        updateData.fcmToken = fcmToken;
        updateData.fcmTokenUpdatedAt = new Date();
        updateData.fcmTokenPlatform = platform || null;
      } else {
        return res.status(400).json({
          error: 'Invalid FCM token format',
          hint: 'FCM tokens are typically 150+ characters'
        });
      }
    }

    await req.db
      .insert(accountSettingsTable)
      .values({ userId, ...updateData })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: updateData,
      });

    console.log(`[saveBothPushTokens] Saved tokens for user ${userId}`);
    res.status(200).json({
      success: true,
      expoPushTokenRegistered: !!expoPushToken,
      fcmTokenRegistered: !!fcmToken,
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(202).json({
        success: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[saveBothPushTokens] Error:', error);
    sendDevError(res, error);
  }
}

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
              onboardingCompletedAt: profilesTable.onboardingCompletedAt,
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

    // 🆕 IDEMPOTENT: Check if profile already exists before creating
    // This prevents duplicate profile creation if saveBasics is called multiple times
    const existing = await req.db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    const profileData = {
      fullName,
      email,
      gender,
      age: age ? parseInt(age, 10) : null,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      heightCm: heightCm ? parseInt(heightCm, 10) : null,
      activityLevel,
      updatedAt: new Date(),
    };

    let basicsRow;
    if (existing.length > 0) {
      // Profile exists - UPDATE only
      const updated = await req.db
        .update(profilesTable)
        .set(profileData)
        .where(eq(profilesTable.userId, userId))
        .returning();
      basicsRow = updated[0];
      console.log(`[saveBasics] ✅ UPDATED profile for user ${userId}`);
    } else {
      // Profile doesn't exist - CREATE only
      const created = await req.db
        .insert(profilesTable)
        .values({
          userId,
          ...profileData,
          createdAt: new Date(), // Only set on creation
        })
        .returning();
      basicsRow = created[0];
      console.log(`[saveBasics] ✅ CREATED profile for user ${userId}`);
    }

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
    console.error('[saveBasics] ❌ Error saving profile basics:', {
      userId: req.auth?.userId,
      error: error.message,
      code: error.code,
    });
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

    // 🆕 Validate preference IDs against known enums
    const invalidDietaryPrefs = normalizedPreferences.filter(
      pref => !VALID_DIETARY_PREFERENCES.includes(pref.id)
    );
    if (invalidDietaryPrefs.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid dietary preference ID(s): ${invalidDietaryPrefs.map(p => p.id).join(', ')}`,
        validOptions: VALID_DIETARY_PREFERENCES,
      });
    }

    const invalidCuisinePrefs = normalizedCuisine.filter(
      pref => !VALID_CUISINE_PREFERENCES.includes(pref.id)
    );
    if (invalidCuisinePrefs.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid cuisine preference ID(s): ${invalidCuisinePrefs.map(p => p.id).join(', ')}`,
        validOptions: VALID_CUISINE_PREFERENCES,
      });
    }

    const invalidAllergies = normalizedAllergies.filter(
      allergy => !VALID_ALLERGIES.includes(allergy)
    );
    if (invalidAllergies.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid allergy ID(s): ${invalidAllergies.join(', ')}`,
        validOptions: VALID_ALLERGIES,
      });
    }

    // Ensure at least one dietary preference
    if (normalizedPreferences.length === 0 && normalizedCuisine.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'At least one dietary preference or cuisine preference is required',
      });
    }

    // 🆕 ATOMIC TRANSACTION: Both updates must succeed or both fail
    // Wrap in transaction to ensure consistency
    const dietaryResult = await req.db.transaction(async (tx) => {
      // Update regional context in profiles table
      if (normalizedCuisine.length > 0 || region || cookingStyle) {
        await tx
          .update(profilesTable)
          .set({
            cuisinePreference: normalizedCuisine,
            region: region || null,
            cookingStyle: cookingStyle || null,
            updatedAt: new Date(),
          })
          .where(eq(profilesTable.userId, userId));
      }

      // Update dietary preferences (atomic upsert)
      const result = await tx
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

      return result;
    });

    const dietaryRow = dietaryResult[0];
    const dietary = {
      preferences: Array.isArray(dietaryRow?.preferences) ? dietaryRow.preferences : [],
      allergies: Array.isArray(dietaryRow?.allergies) ? dietaryRow.allergies : [],
      dislikes: Array.isArray(dietaryRow?.dislikes) ? dietaryRow.dislikes : [],
      cuisinePreference: normalizedCuisine,
    };

    console.log('[saveDietary] ✅ Successfully saved dietary preferences in atomic transaction:', {
      userId,
      preferencesCount: dietary.preferences.length,
      allergiesCount: dietary.allergies.length,
      cuisineCount: dietary.cuisinePreference.length,
    });

    res.status(200).json(dietary);
  } catch (error) {
    console.error('[saveDietary] ❌ Error saving dietary preferences:', {
      userId: req.auth?.userId,
      error: error.message,
      code: error.code,
    });
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

// --- GDPR Data Export ---
export async function exportUserData(req, res) {
  try {
    const { userId } = req.auth;
    console.log(`[exportUserData] Exporting data for user ${userId}`);

    // Load all user data in parallel
    const [profile, dietary, goals, gamification, settings, foodLogs, waterLogs, moodLogs, activityLogs] = await Promise.all([
      req.db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).then(r => r[0]),
      req.db.select().from(dietaryPreferencesTable).where(eq(dietaryPreferencesTable.userId, userId)).then(r => r[0]),
      req.db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId)).then(r => r[0]),
      req.db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).then(r => r[0]),
      req.db.select().from(accountSettingsTable).where(eq(accountSettingsTable.userId, userId)).then(r => r[0]),
      req.db.select().from(foodLogTable).where(eq(foodLogTable.userId, userId)),
      req.db.select().from(waterLogTable).where(eq(waterLogTable.userId, userId)).catch(() => []),
      req.db.select().from(moodLogTable).where(eq(moodLogTable.userId, userId)).catch(() => []),
      req.db.select().from(activityLogTable).where(eq(activityLogTable.userId, userId)).catch(() => []),
    ]);

    // Sanitize profile data (remove internal IDs)
    const sanitizeRecord = (record) => {
      if (!record) return null;
      const { id, ...rest } = record;
      return rest;
    };

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: sanitizeRecord(profile),
      dietaryPreferences: sanitizeRecord(dietary),
      nutritionGoals: sanitizeRecord(goals),
      gamification: sanitizeRecord(gamification),
      accountSettings: sanitizeRecord(settings),
      foodLogs: foodLogs.map(sanitizeRecord),
      waterLogs: waterLogs.map(sanitizeRecord),
      moodLogs: moodLogs.map(sanitizeRecord),
      activityLogs: activityLogs.map(sanitizeRecord),
      summary: {
        totalFoodLogs: foodLogs.length,
        totalWaterLogs: waterLogs.length,
        totalMoodLogs: moodLogs.length,
        totalActivityLogs: activityLogs.length,
        accountCreated: profile?.createdAt || null,
      }
    };

    console.log(`[exportUserData] ✅ Exported ${foodLogs.length} food logs, ${waterLogs.length} water logs for user ${userId}`);
    res.status(200).json(exportData);
  } catch (error) {
    console.error("[exportUserData] ❌ Error exporting user data:", error);
    sendDevError(res, error);
  }
}

// --- GDPR Account Deletion ---
export async function deleteAccount(req, res) {
  try {
    const { userId } = req.auth;
    console.log(`[deleteAccount] ⚠️ Deleting account for user ${userId}`);

    // Check if profile exists
    const [profile] = await req.db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found",
        message: "No account found to delete"
      });
    }

    // Delete profile - cascade will delete all related data
    // Tables with onDelete: "cascade" will automatically be cleaned up:
    // - account_settings
    // - dietary_preferences
    // - nutrition_goals
    // - gamification
    // - food_log
    // - water_log
    // - mood_log
    // - activity_log
    await req.db
      .delete(profilesTable)
      .where(eq(profilesTable.userId, userId));

    console.log(`[deleteAccount] ✅ Account deleted for user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Account and all associated data have been permanently deleted",
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[deleteAccount] ❌ Error deleting account:", error);
    sendDevError(res, error);
  }
}
