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
import hydrationAnalyticsRouter from "./routes/hydrationAnalytics.js";
import flagsRouter from "./routes/flags.js";
import insightsRouter from "./routes/insights.js";
import outcomesRouter from "./routes/outcomes.js";
import correlationsRouter from "./routes/correlations.js";
import orchestratorRouter from "./routes/orchestrator.js";
import resolverRouterNew from "./routes/resolver.js";
import learningRouter from "./routes/learning.js";
import expiryRouter from "./routes/expiry.js";
import activityRouter from "./routes/activity.js";
import mlAnalyticsRouter from "./routes/mlAnalytics.js";
import mtlPredictionsRouter from "./routes/mtlPredictions.js";
import unifiedAnalyticsRouter from "./routes/unifiedAnalytics.js";
import remindersRouter from "./routes/reminders.js";
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
    console.log('[Database] Recommendations history table verified');
  } catch (err) {
    console.error('[Database] Failed to ensure recommendations_history table:', err);
  }
}

// Ensure ML infrastructure tables exist for Thompson Sampling, A/B Testing, Drift Detection
// Note: These tables support production ML capabilities with full audit trails
let mlTablesEnsured = false;
export async function ensureMLTables() {
  if (mlTablesEnsured) return;
  try {
    // User correlations table (stores discovered patterns between signals)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_correlations" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "correlation_type" TEXT NOT NULL,
        "rule_name" TEXT NOT NULL,
        "signal_a" TEXT NOT NULL,
        "signal_a_value" DECIMAL(10,2),
        "signal_a_unit" TEXT,
        "signal_b" TEXT NOT NULL,
        "signal_b_value" DECIMAL(10,2),
        "signal_b_unit" TEXT,
        "window_type" TEXT NOT NULL,
        "time_lag_minutes" INTEGER,
        "strength" DECIMAL(3,2) NOT NULL,
        "confidence" DECIMAL(3,2) NOT NULL,
        "occurrences" INTEGER NOT NULL DEFAULT 0,
        "health_impact_severity" TEXT,
        "affected_domains" JSONB DEFAULT '[]',
        "expected_outcome" TEXT,
        "evidence_json" JSONB,
        "last_observed_date" TEXT,
        "first_observed_date" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE,
        "computed_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("user_id", "correlation_type", "rule_name", "window_type")
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_user_corr_user_active" ON "user_correlations" ("user_id", "is_active");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_user_corr_confidence" ON "user_correlations" ("user_id", "confidence");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_user_corr_type" ON "user_correlations" ("correlation_type");`);

    // Correlation evidence table (supports user_correlations)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "correlation_evidence" (
        "id" SERIAL PRIMARY KEY,
        "correlation_id" INTEGER REFERENCES "user_correlations"("id") ON DELETE CASCADE,
        "observation_date" TEXT,
        "food_log_id" INTEGER,
        "mood_log_id" INTEGER,
        "water_log_id" INTEGER,
        "signal_a_actual" DECIMAL(10,2),
        "signal_b_actual" DECIMAL(10,2),
        "tags_json" JSONB,
        "hour_of_day" INTEGER,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_corr_evidence_correlation" ON "correlation_evidence" ("correlation_id");`);

    // Thompson Sampling arms table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "recommendation_arms" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "arm_key" TEXT NOT NULL,
        "alpha" DECIMAL(10,4) NOT NULL DEFAULT 1,
        "beta" DECIMAL(10,4) NOT NULL DEFAULT 1,
        "trials" INTEGER NOT NULL DEFAULT 0,
        "successes" INTEGER NOT NULL DEFAULT 0,
        "last_updated" TIMESTAMP DEFAULT NOW(),
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("user_id", "arm_key")
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_arms_user_id" ON "recommendation_arms" ("user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_rec_arms_arm_key" ON "recommendation_arms" ("arm_key");`);

    // A/B Test definitions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ab_test_definitions" (
        "id" SERIAL PRIMARY KEY,
        "experiment_id" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "variants" JSONB NOT NULL,
        "traffic_percentage" DECIMAL(5,2) DEFAULT 100,
        "status" TEXT DEFAULT 'active',
        "start_date" TIMESTAMP DEFAULT NOW(),
        "end_date" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);

    // A/B Test assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ab_test_assignments" (
        "id" SERIAL PRIMARY KEY,
        "experiment_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "variant" TEXT NOT NULL,
        "assigned_at" TIMESTAMP DEFAULT NOW(),
        "metadata" JSONB DEFAULT '{}',
        UNIQUE("experiment_id", "user_id")
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_ab_assign_user_id" ON "ab_test_assignments" ("user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_ab_assign_experiment" ON "ab_test_assignments" ("experiment_id");`);

    // Drift detection metrics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drift_metrics" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "metric_type" TEXT NOT NULL,
        "cusum_pos" DECIMAL(10,4) DEFAULT 0,
        "cusum_neg" DECIMAL(10,4) DEFAULT 0,
        "ewma_value" DECIMAL(10,4),
        "reference_mean" DECIMAL(10,4),
        "drift_detected" BOOLEAN DEFAULT FALSE,
        "last_drift_at" TIMESTAMP,
        "observation_count" INTEGER DEFAULT 0,
        "updated_at" TIMESTAMP DEFAULT NOW(),
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("user_id", "metric_type")
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_drift_user_id" ON "drift_metrics" ("user_id");`);

    // Lagged correlations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "lagged_correlations" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "signal1" TEXT NOT NULL,
        "signal2" TEXT NOT NULL,
        "optimal_lag" INTEGER NOT NULL,
        "correlation" DECIMAL(6,4) NOT NULL,
        "p_value" DECIMAL(10,8),
        "is_significant" BOOLEAN DEFAULT FALSE,
        "granger_p_value" DECIMAL(10,8),
        "direction" TEXT,
        "computed_at" TIMESTAMP DEFAULT NOW(),
        "window_days" INTEGER DEFAULT 30
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_lagged_user_id" ON "lagged_correlations" ("user_id");`);

    // Feature interactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "feature_interactions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "feature1" TEXT NOT NULL,
        "feature2" TEXT NOT NULL,
        "outcome" TEXT NOT NULL,
        "interaction_effect" DECIMAL(8,4),
        "effect_size" DECIMAL(6,4),
        "p_value" DECIMAL(10,8),
        "interaction_type" TEXT,
        "is_significant" BOOLEAN DEFAULT FALSE,
        "computed_at" TIMESTAMP DEFAULT NOW(),
        "sample_size" INTEGER,
        "metadata" JSONB DEFAULT '{}'
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_interactions_user_id" ON "feature_interactions" ("user_id");`);

    mlTablesEnsured = true;
    console.log('[Database] ML infrastructure tables verified (Thompson Sampling, A/B Testing, Drift Detection)');
  } catch (err) {
    console.error('[Database] Failed to ensure ML tables:', err);
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

// Mount Hydration Analytics Router (Predictive Hydration Intelligence)
app.use("/api/hydration/analytics", hydrationAnalyticsRouter);

// Mount Feature Flags Router (Progressive Rollout)
app.use("/api/flags", flagsRouter);

// Mount Insights Router (Premium Intelligence - 5W2H System)
app.use("/api/insights", insightsRouter);

// Mount Outcomes Router (Recommendation Effectiveness Tracking)
app.use("/api/outcomes", outcomesRouter);

// Mount Correlations Router (Behavioral Pattern Detection)
app.use("/api/correlations", correlationsRouter);

// Mount Orchestrator Router (Daily Decision Pipeline)
app.use("/api/orchestrator", orchestratorRouter);

// Mount Resolver Router (Intent → Foods mapping)
app.use("/api/resolver", resolverRouterNew);

// Mount Learning Router (Learning state & readiness)
app.use("/api/learning", learningRouter);

// Mount Expiry Router (Recommendation lifecycle management)
app.use("/api/expiry", expiryRouter);

// Mount Activity Router (Activity Analytics & Recommendations)
app.use("/api/activity", activityRouter);

// Mount ML Analytics Router (Thompson Sampling, A/B Testing, Drift Detection)
// Note: This router provides machine learning enhanced recommendations with full
// transparency metadata for regulatory compliance (FDA, EU AI Act)
app.use("/api/ml", mlAnalyticsRouter);

// Mount MTL Predictions Router (Multi-Task Learning health predictions)
// Note: Provides personalized health outcome predictions with uncertainty estimates
app.use("/api/mtl", mtlPredictionsRouter);

// Mount Unified Analytics Router (Multi-timeframe analytics with graceful degradation)
// Note: Provides daily/weekly/monthly analytics with missing data handling
app.use("/api/analytics", unifiedAnalyticsRouter);

// Mount Smart Reminders Router (Intelligent notification scheduling)
// Note: Zomato/Swiggy-style friendly reminders based on user patterns
app.use("/api/reminders", remindersRouter);

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
  console.log('[Database] Initializing schema...');
  try {
    await ensureProfilesTableShape();
    await ensureRecommendationsHistoryTable();
    await ensureMLTables();
    console.log('[Database] Schema initialization complete');
  } catch (err) {
    console.error('[Database] Initialization warning:', err.message);
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
