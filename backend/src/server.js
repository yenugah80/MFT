import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import { attachDb } from "./middleware/db.js";
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  activityLevelsTable,
  foodLogTable,
  waterLogTable,
  moodLogTable
} from "./db/schema.js";
import { sql } from "drizzle-orm";
import { FoodService } from "./services/foodService.js";
import { validate, imageAnalysisSchema } from "./middleware/validation.js";
import nutritionRouter from "./routes/nutrition.js";
import complianceRouter from "./routes/compliance.js";
import foodRouter from "./routes/food.js";
import resolveRouter from "./routes/resolve.js";
import profileRouter from "./routes/profile.js";
import loggingRouter from "./routes/logging.js";
import moodRouter from "./routes/mood.js";
import waterRouter from "./routes/water.js";
import apiMetricsRouter from "./routes/apiMetrics.js";
import gamificationRouter from "./routes/gamificationRoutes.js";
import recommendationsRouter from "./routes/recommendations.js";
import { initStreakCronJob } from "./jobs/dailyStreakCheck.js";

const app = express();
const PORT = ENV.PORT || process.env.PORT || 5001;

// Ensure the profiles table has all columns expected by the schema.
// This guards against older databases that were created before we added
// fields like `gender`, `activity_level`, `notifications`, or changed `weight_kg` to numeric.
let profilesTableEnsured = false;
export async function ensureProfilesTableShape() {
  if (profilesTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" text;`
    );
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "activity_level" text;`
    );
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "notifications" jsonb DEFAULT '{}'::jsonb;`
    );
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP;`
    );
    // Safely alter column type - may fail if already correct type
    try {
      await db.execute(
        sql`ALTER TABLE "profiles" ALTER COLUMN "weight_kg" TYPE numeric(5,2);`
      );
    } catch (typeErr) {
      // Ignore if column already has correct type
      if (!typeErr.message?.includes('cannot be cast automatically')) {
        throw typeErr;
      }
    }
    profilesTableEnsured = true;
    console.log('✅ Profiles table schema verified and updated');
  } catch (err) {
    console.error('❌ Failed to ensure profiles table shape:', err);
    // Don't throw - allow app to continue but log the issue
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
app.use(attachDb);

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

// Mount Compliance Router (Dietary compliance tracking)
app.use("/api/nutrition", complianceRouter);

// Mount Food Router (Search, Barcode)
app.use("/api/food", foodRouter);

// Mount Resolve Router (Unified Nutrition Resolver)
app.use("/api/food/resolve", resolveRouter);

// Mount Profile Router (modularized)
app.use("/api/profile", profileRouter);

// Mount Logging Router (modularized)
app.use("/api/log", loggingRouter);

// Mount Mood Router (modularized)
app.use("/api/mood", moodRouter);

// Mount Water Router (modularized)
app.use("/api/water", waterRouter);

// Mount API Metrics Router (monitoring & observability)
app.use("/api/metrics", apiMetricsRouter);

// Mount Gamification Router
app.use("/api/gamification", gamificationRouter);

// Mount Recommendations Router
app.use("/api/recommendations", recommendationsRouter);

/* -------------------------------------------
   EXISTING ROUTES
-------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
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
// (activity levels endpoints removed, now handled by activityRouter)

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

/* -------------------------------------------
   MEAL LOGGING
-------------------------------------------- */

// (logging endpoints removed, now handled by loggingRouter)

app.listen(PORT, "0.0.0.0", async () => {
  console.log("Server is running on PORT:", PORT);

  // Initialize database schema on startup
  console.log('📦 Initializing database schema...');
  try {
    await ensureProfilesTableShape();
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('⚠️ Database initialization warning:', err.message);
    // Continue running even if init fails - tables might already exist
  }

  // Initialize daily streak check cron job
  initStreakCronJob();
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
