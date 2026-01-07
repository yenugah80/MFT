import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
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
import analyticsRouter from "./routes/analytics.js";
import adminStrategyRouter from "./routes/admin/strategy.js";
import consentRouter from "./routes/consent.js";
import voiceLogRouter from "./routes/voiceLog.js";
import { initStreakCronJob } from "./jobs/dailyStreakCheck.js";
import { premiumFeaturesService } from "./services/PremiumFeatures.js";

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

// Ensure the recommendations_history table exists
let recommendationsTableEnsured = false;
export async function ensureRecommendationsHistoryTable() {
  if (recommendationsTableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "recommendations_history" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "recommendation_id" TEXT NOT NULL UNIQUE,
        "food_name" TEXT NOT NULL,
        "portion" TEXT,
        "calories" INTEGER NOT NULL,
        "protein" INTEGER NOT NULL,
        "carbs" INTEGER NOT NULL,
        "fats" INTEGER NOT NULL,
        "fiber" INTEGER DEFAULT 0,
        "sugar" INTEGER DEFAULT 0,
        "micros" JSONB DEFAULT '{}',
        "recommendation_type" TEXT NOT NULL,
        "reason" TEXT,
        "tips" TEXT,
        "prep_time_minutes" INTEGER,
        "recipe_instructions" TEXT,
        "preference_strength_match" INTEGER,
        "diet_compliant" BOOLEAN,
        "allergen_free" BOOLEAN,
        "warning_badge" JSONB,
        "meal_type" TEXT,
        "time_of_day" INTEGER,
        "remaining_calories" INTEGER,
        "remaining_protein" INTEGER,
        "remaining_carbs" INTEGER,
        "remaining_fats" INTEGER,
        "interaction_status" TEXT DEFAULT 'shown',
        "shown_at" TIMESTAMP DEFAULT NOW(),
        "viewed_at" TIMESTAMP,
        "interacted_at" TIMESTAMP,
        "rejection_reason" TEXT,
        "customized_portion" TEXT,
        "was_logged" BOOLEAN DEFAULT FALSE,
        "logged_food_id" INTEGER,
        "logged_at" TIMESTAMP,
        "ai_generated" BOOLEAN DEFAULT TRUE,
        "ai_model" TEXT DEFAULT 'gpt-4o-mini',
        "ai_confidence" DECIMAL(3,2),
        "personalization_score" DECIMAL(3,2),
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes if they don't exist
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_history_user_id" ON "recommendations_history" ("user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_history_recommendation_id" ON "recommendations_history" ("recommendation_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_history_user_status" ON "recommendations_history" ("user_id", "interaction_status");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_history_shown_at" ON "recommendations_history" ("shown_at");`);

    recommendationsTableEnsured = true;
    console.log('✅ Recommendations history table verified');
  } catch (err) {
    console.error('❌ Failed to ensure recommendations_history table:', err);
  }
}


// CORS configuration – restrict to trusted origins only (security fix)
// Allow your frontend domains and mobile app deep links
const ALLOWED_ORIGINS = [
  // Production frontend
  process.env.CORS_ORIGIN || 'https://yourdomain.com',
  // Development/Testing
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19000',  // Expo dev
    'http://localhost:19001',  // Expo dev
  ] : []),
  // Expo hosted app (add your actual Expo project slug)
  process.env.EXPO_APP_URL || 'https://yourapp.expo.dev',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl requests)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,  // Allow cookies/credentials
    maxAge: 3600,       // Cache CORS preflight for 1 hour
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Clerk middleware - MUST be applied before any routes using @clerk/express requireAuth()
app.use(clerkMiddleware());

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

// Mount Analytics & Crash Reporting Router (FREE - no external service)
app.use("/api", analyticsRouter);

// Mount Admin Strategy Router (Strategic Hybrid Parsing Monitoring)
app.use("/api/admin/strategy", adminStrategyRouter);

// Mount Consent Router (GDPR-compliant data sharing management)
app.use("/api/consent", consentRouter);

// Mount Voice Log Router (Voice-to-nutrition analysis)
app.use("/api/voice", voiceLogRouter);

/* -------------------------------------------
   EXISTING ROUTES
-------------------------------------------- */
// Note: Consolidated health check endpoint above at /health

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

  // Log feature flags for debugging
  const featureFlags = premiumFeaturesService.getFeatureFlags();
  console.log('🚀 Feature Flags:', {
    FULL_AI_MODE: featureFlags.FULL_AI_MODE,
    HYBRID_MODE: featureFlags.HYBRID_MODE,
    PREMIUM_OPENAI: featureFlags.PREMIUM_OPENAI,
    envValue: process.env.FULL_AI_MODE,
  });

  // Initialize database schema on startup
  console.log('📦 Initializing database schema...');
  try {
    await ensureProfilesTableShape();
    await ensureRecommendationsHistoryTable();
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
