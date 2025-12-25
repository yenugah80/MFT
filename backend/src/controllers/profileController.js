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

    // Load profile
    const [profile] = await req.db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

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

    const normalizedDietary = {
      preferences: Array.isArray(dietary?.preferences) ? dietary.preferences : [],
      allergies: Array.isArray(dietary?.allergies) ? dietary.allergies : [],
      dislikes: Array.isArray(dietary?.dislikes) ? dietary.dislikes : []
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
      gamification: normalizedGamification
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    sendDevError(res, error);
  }
}

export async function saveBasics(req, res) {
  try {
    const { userId } = req.auth;
    const { fullName, email, gender, age, weightKg, heightCm, activityLevel } = req.body;
    await ensureProfilesTableShape();
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

export async function saveDietary(req, res) {
  try {
    const { userId } = req.auth;
    const { preferences, allergies, dislikes } = req.body;
    const existingDietary = await req.db
      .select()
      .from(dietaryPreferencesTable)
      .where(eq(dietaryPreferencesTable.userId, userId));
    let dietaryRow;
    if (existingDietary.length > 0) {
      const updated = await req.db
        .update(dietaryPreferencesTable)
        .set({
          preferences: preferences || [],
          allergies: allergies || [],
          dislikes: dislikes || [],
          updatedAt: new Date(),
        })
        .where(eq(dietaryPreferencesTable.userId, userId))
        .returning();
      dietaryRow = updated[0];
    } else {
      const created = await req.db
        .insert(dietaryPreferencesTable)
        .values({
          userId,
          preferences: preferences || [],
          allergies: allergies || [],
          dislikes: dislikes || [],
        })
        .returning();
      dietaryRow = created[0];
    }
    const dietary = {
      preferences: Array.isArray(dietaryRow?.preferences) ? dietaryRow.preferences : [],
      allergies: Array.isArray(dietaryRow?.allergies) ? dietaryRow.allergies : [],
      dislikes: Array.isArray(dietaryRow?.dislikes) ? dietaryRow.dislikes : []
    };
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

    const existingGoals = await req.db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId));
    let goalsRow;
    if (existingGoals.length > 0) {
      const updated = await req.db
        .update(nutritionGoalsTable)
        .set({
          primaryGoal,
          dailyCalories: dailyCalories ? parseInt(dailyCalories, 10) : null,
          proteinG: proteinG ? parseInt(proteinG, 10) : null,
          carbsG: carbsG ? parseInt(carbsG, 10) : null,
          fatsG: fatsG ? parseInt(fatsG, 10) : null,
          waterLiters: waterLiters ? parseFloat(waterLiters) : null,
          updatedAt: new Date(),
        })
        .where(eq(nutritionGoalsTable.userId, userId))
        .returning();
      goalsRow = updated[0];
    } else {
      const created = await req.db
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
        .returning();
      goalsRow = created[0];
    }
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
    const existingGamification = await req.db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));
    let gamificationRow;
    if (existingGamification.length > 0) {
      const updated = await req.db
        .update(gamificationTable)
        .set({
          xp: xp || 0,
          level: level || 1,
          streak: streak || 0,
          badges: badges || [],
          updatedAt: new Date(),
        })
        .where(eq(gamificationTable.userId, userId))
        .returning();
      gamificationRow = updated[0];
    } else {
      const created = await req.db
        .insert(gamificationTable)
        .values({
          userId,
          xp: xp || 0,
          level: level || 1,
          streak: streak || 0,
          badges: badges || [],
        })
        .returning();
      gamificationRow = created[0];
    }
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
