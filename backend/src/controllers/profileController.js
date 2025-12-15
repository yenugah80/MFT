import { eq } from "drizzle-orm";
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
} from "../db/schema.js";
import { sendDevError } from "../utils/sendDevError.js";
// Utility to ensure table shape (imported from server.js)
import { ensureProfilesTableShape } from "../server.js";

export async function getProfile(req, res) {
  try {
    const { userId } = req.auth;
    await ensureProfilesTableShape();
    const [profile] = await req.db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));
    const safeLoadSingle = async (table, where) => {
      try {
        const [row] = await req.db.select().from(table).where(where);
        return row || null;
      } catch (err) {
        if (err && err.code === "42P01") return null;
        throw err;
      }
    };
    const dietary = await safeLoadSingle(
      dietaryPreferencesTable,
      eq(dietaryPreferencesTable.userId, userId)
    );
    const goals = await safeLoadSingle(
      nutritionGoalsTable,
      eq(nutritionGoalsTable.userId, userId)
    );
    const gamification = await safeLoadSingle(
      gamificationTable,
      eq(gamificationTable.userId, userId)
    );
    if (!profile) return res.status(404).json({ error: "Profile not found" });
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
    console.log("Error fetching profile", error);
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
      weightKg: basicsRow.weight_kg ?? null,
      heightCm: basicsRow.height_cm ?? null,
      activityLevel: basicsRow.activity_level || ""
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
    const { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters } = req.body;
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
