import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import { 
  favoritesTable,
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  activityLevelsTable
} from "./db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { FoodService } from "./services/foodService.js";
import { validate, favoritesSchema, profileBasicsSchema, nutritionGoalsSchema, imageAnalysisSchema } from "./middleware/validation.js";
import nutritionRouter from "./routes/nutrition.js";
import foodRouter from "./routes/food.js";

const app = express();
const PORT = ENV.PORT || process.env.PORT || 5001;

// Ensure the profiles table has all columns expected by the schema.
// This guards against older databases that were created before we added
// fields like `gender`, `activity_level`, or changed `weight_kg` to numeric.
let profilesTableEnsured = false;
async function ensureProfilesTableShape() {
  if (profilesTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" text;`
    );
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "activity_level" text;`
    );
    await db.execute(
      sql`ALTER TABLE "profiles" ALTER COLUMN "weight_kg" TYPE numeric(5,2);`
    );
    profilesTableEnsured = true;
  } catch (err) {
    console.warn("Failed to ensure profiles table shape", err);
  }
}

// CORS configuration – allow Authorization header for Expo Web and mobile
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* -------------------------------------------
   HEALTH CHECK ENDPOINT FOR RENDER + CLOUDFLARE
-------------------------------------------- */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "MyFoodTracker backend is running.",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------
   ROUTES
-------------------------------------------- */

// Mount Nutrition Router (History, Logging, AI Analysis)
app.use("/api/nutrition", nutritionRouter);

// Mount Food Router (Search, Barcode)
app.use("/api/food", foodRouter);

/* -------------------------------------------
   EXISTING ROUTES
-------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.post("/api/favorites", requireAuth, validate(favoritesSchema), async (req, res) => {
  try {
    // SECURE: Get userId from the authenticated token, NOT the body
    const { userId } = req.auth;
    const { recipeId, title, image, cookTime, servings } = req.body;

    // Validation handled by middleware, but we still need to check for duplicates
    const recipeIdNum = Number(recipeId);
    if (Number.isNaN(recipeIdNum)) {
      return res.status(400).json({ error: "recipeId must be a number" });
    }

    const existingFavorite = await db
      .select({ id: favoritesTable.id })
      .from(favoritesTable)
      .where(
        and(eq(favoritesTable.userId, userId), eq(favoritesTable.recipeId, recipeIdNum))
      );

    if (existingFavorite.length > 0) {
      return res.status(409).json({ error: "Recipe already favorited" });
    }

    const newFavorite = await db
      .insert(favoritesTable)
      .values({
        userId,
        recipeId: recipeIdNum,
        title,
        image,
        cookTime,
        servings,
      })
      .returning();

    res.status(201).json(newFavorite[0]);
  } catch (error) {
    console.log("Error adding favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;

    const userfavorites = await db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId));

    res.status(200).json(userfavorites);
  } catch (error) {
    console.log("Error fetching the favorites", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/favorites/:recipeId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;
    const { recipeId } = req.params;
    const recipeIdNum = Number(recipeId);

    if (Number.isNaN(recipeIdNum)) {
      return res.status(400).json({ error: "recipeId must be a number" });
    }

    const deletedFavorites = await db
      .delete(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.recipeId, recipeIdNum)))
      .returning({ id: favoritesTable.id });

    if (deletedFavorites.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.status(200).json({ message: "Favorite deleted successfully" });
  } catch (error) {
    console.log("Error removing a favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* -------------------------------------------
   PROFILE MANAGEMENT ENDPOINTS
-------------------------------------------- */

// GET user's complete profile (all sections)
app.get("/api/profile/me", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;

    // Make sure the profiles table matches the current schema so that
    // SELECTs do not fail due to missing columns.
    await ensureProfilesTableShape();

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    // The dietary/goals/gamification tables may not exist yet in some
    // environments. If they are missing, we gracefully fall back to
    // default objects instead of throwing a 500 error.
    const safeLoadSingle = async (table, where, tableName) => {
      try {
        const [row] = await db.select().from(table).where(where);
        return row || null;
      } catch (err) {
        if (err && err.code === "42P01") {
          // 42P01 = undefined_table in Postgres
          console.warn(`Optional profile table missing: ${tableName}`);
          return null;
        }
        throw err;
      }
    };

    const dietary = await safeLoadSingle(
      dietaryPreferencesTable,
      eq(dietaryPreferencesTable.userId, userId),
      "dietary_preferences"
    );

    const goals = await safeLoadSingle(
      nutritionGoalsTable,
      eq(nutritionGoalsTable.userId, userId),
      "nutrition_goals"
    );

    const gamification = await safeLoadSingle(
      gamificationTable,
      eq(gamificationTable.userId, userId),
      "gamification"
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.status(200).json({
      basics: profile,
      dietary: dietary || { preferences: [], allergies: [], dislikes: [] },
      goals: goals || { primaryGoal: null, dailyCalories: null },
      gamification:
        gamification || { xp: 0, level: 1, streak: 0, badges: [] },
    });
  } catch (error) {
    console.log("Error fetching profile", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST/PUT save personal info
app.post("/api/profile/basics", requireAuth, validate(profileBasicsSchema), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { fullName, email, gender, age, weightKg, heightCm, activityLevel } = req.body;

    // Ensure table shape before performing INSERT/UPDATE operations.
    await ensureProfilesTableShape();

    const existingProfile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    if (existingProfile.length > 0) {
      const updated = await db
        .update(profilesTable)
        .set({
          fullName,
          email,
          gender,
          age: age ? parseInt(age, 10) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          heightCm: heightCm ? parseInt(heightCm, 10) : null,
          activityLevel,
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.userId, userId))
        .returning();
      return res.status(200).json(updated[0]);
    }

    const created = await db
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
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error saving profile basics", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST/PUT save dietary preferences
app.post("/api/profile/dietary", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;
    const { preferences, allergies, dislikes } = req.body;

    const existingDietary = await db
      .select()
      .from(dietaryPreferencesTable)
      .where(eq(dietaryPreferencesTable.userId, userId));

    if (existingDietary.length > 0) {
      const updated = await db
        .update(dietaryPreferencesTable)
        .set({
          preferences: preferences || [],
          allergies: allergies || [],
          dislikes: dislikes || [],
          updatedAt: new Date(),
        })
        .where(eq(dietaryPreferencesTable.userId, userId))
        .returning();
      return res.status(200).json(updated[0]);
    }

    const created = await db
      .insert(dietaryPreferencesTable)
      .values({
        userId,
        preferences: preferences || [],
        allergies: allergies || [],
        dislikes: dislikes || [],
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error saving dietary preferences", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST/PUT save nutrition goals
app.post("/api/profile/goals", requireAuth, validate(nutritionGoalsSchema), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters } = req.body;

    const existingGoals = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId));

    if (existingGoals.length > 0) {
      const updated = await db
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
      return res.status(200).json(updated[0]);
    }

    const created = await db
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

    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error saving nutrition goals", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST/PUT save gamification stats
app.post("/api/profile/gamification", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;
    const { xp, level, streak, badges } = req.body;

    const existingGamification = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    if (existingGamification.length > 0) {
      const updated = await db
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
      return res.status(200).json(updated[0]);
    }

    const created = await db
      .insert(gamificationTable)
      .values({
        userId,
        xp: xp || 0,
        level: level || 1,
        streak: streak || 0,
        badges: badges || [],
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error saving gamification stats", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* -------------------------------------------
   FOOD SEARCH ENDPOINT (BFF)
-------------------------------------------- */
app.get("/api/food/search", requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }
    const results = await FoodService.searchAll(query);
    res.status(200).json(results);
  } catch (error) {
    console.log("Error searching food", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/food/barcode/:code", requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: "Barcode is required" });
    }
    const result = await FoodService.searchByBarcode(code);
    if (!result) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.log("Error searching barcode", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/food/analyze-image", requireAuth, validate(imageAnalysisSchema), async (req, res) => {
  try {
    const { image } = req.body; // Expecting base64 string
    const result = await FoodService.analyzeImage(image);
    if (!result) {
      return res.status(422).json({ error: "Could not analyze image" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.log("Error analyzing image", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* -------------------------------------------
   ACTIVITY LEVELS ENDPOINTS (ADMIN/CONFIG)
-------------------------------------------- */
app.get("/api/activity-levels", async (req, res) => {
  try {
    const levels = await db.select().from(activityLevelsTable);
    res.status(200).json(levels);
  } catch (error) {
    console.log("Error fetching activity levels", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/activity-levels", requireAuth, async (req, res) => {
  try {
    // In a real app, check for admin role here
    const { key, label, desc, factor } = req.body;
    const created = await db.insert(activityLevelsTable).values({
      key, label, desc, factor
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error creating activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.put("/api/activity-levels/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { key, label, desc, factor } = req.body;
    const updated = await db.update(activityLevelsTable)
      .set({ key, label, desc, factor, updatedAt: new Date() })
      .where(eq(activityLevelsTable.id, parseInt(id)))
      .returning();
    res.status(200).json(updated[0]);
  } catch (error) {
    console.log("Error updating activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/activity-levels/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(activityLevelsTable).where(eq(activityLevelsTable.id, parseInt(id)));
    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error deleting activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* -------------------------------------------
   MEAL API PROXY ENDPOINTS (BFF)
-------------------------------------------- */
app.get("/api/food/meal/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await FoodService.getMealById(id);
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    res.status(200).json(meal);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meal" });
  }
});

app.get("/api/food/random-meals", requireAuth, async (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count) : 6;
    const meals = await FoodService.getRandomMeals(count);
    res.status(200).json(meals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch random meals" });
  }
});

app.get("/api/food/categories", requireAuth, async (req, res) => {
  try {
    const categories = await FoodService.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/food/filter", requireAuth, async (req, res) => {
  try {
    const { i, c } = req.query;
    let meals = [];
    if (i) {
      meals = await FoodService.filterByIngredient(i);
    } else if (c) {
      meals = await FoodService.filterByCategory(c);
    }
    res.status(200).json(meals);
  } catch (error) {
    res.status(500).json({ error: "Failed to filter meals" });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running on PORT:", PORT);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  
  if (err.message === "Unauthenticated") {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  res.status(500).json({ 
    error: "Internal Server Error", 
    message: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});
