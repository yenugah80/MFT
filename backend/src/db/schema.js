// Existing imports already include text, integer, timestamp, etc.
import { pgTable, serial, text, timestamp, integer, uniqueIndex, decimal, json, boolean, index, check, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// User profiles table - stores personal information
export const profilesTable = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(), // Clerk user id
    fullName: text("full_name"),
    email: text("email"),
    gender: text("gender"), // 'female' | 'male' | 'other'
    age: integer("age"),
    weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
    heightCm: integer("height_cm"),
    activityLevel: text("activity_level"), // 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
    // 🆕 REGIONAL SUPPORT (for food analysis personalization)
    cuisinePreference: json("cuisine_preference").default([]), // ['South Indian', 'American']
    region: text("region"), // 'India', 'USA', 'UK', etc.
    cookingStyle: text("cooking_style"), // 'home-style', 'restaurant'
    // 🆕 PREMIUM FEATURES (Strategic Hybrid Parsing)
    isPremium: boolean("is_premium").default(false), // Premium subscription status for feature access
    premiumTier: text("premium_tier").default("free"), // 'free' | 'premium' | 'enterprise'
    subscriptionStartedAt: timestamp("subscription_started_at"),
    subscriptionEndsAt: timestamp("subscription_ends_at"),
    // 🆕 DATA SHARING CONSENT (GDPR Compliance)
    openaiDataSharingConsent: boolean("openai_data_sharing_consent").default(false), // Explicit consent to share with OpenAI
    openaiConsentGivenAt: timestamp("openai_consent_given_at"), // When user gave consent
    openaiConsentRevokedAt: timestamp("openai_consent_revoked_at"), // When user revoked consent (audit trail)
    notifications: json("notifications").default({}),
    onboardingCompletedAt: timestamp("onboarding_completed_at"), // Timestamp when onboarding was completed
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // CHECK constraints for data validation
    ageCheck: check("age_check", sql`${table.age} IS NULL OR (${table.age} >= 13 AND ${table.age} <= 120)`),
    weightCheck: check("weight_check", sql`${table.weightKg} IS NULL OR (${table.weightKg} > 20 AND ${table.weightKg} < 500)`),
    heightCheck: check("height_check", sql`${table.heightCm} IS NULL OR (${table.heightCm} > 50 AND ${table.heightCm} < 300)`),
    genderCheck: check("gender_check", sql`${table.gender} IS NULL OR ${table.gender} IN ('female', 'male', 'other')`),
    premiumTierCheck: check("premium_tier_check", sql`${table.premiumTier} IN ('free', 'premium', 'enterprise')`),
  })
);

// Account settings table - privacy, notifications, and app preferences
export const accountSettingsTable = pgTable(
  "account_settings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    privacy: json("privacy").default({}),
    notifications: json("notifications").default({}),
    preferences: json("preferences").default({}),
    // Push notification token from Expo
    expoPushToken: text("expo_push_token"),
    pushTokenUpdatedAt: timestamp("push_token_updated_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Dietary preferences table
export const dietaryPreferencesTable = pgTable(
  "dietary_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    preferences: json("preferences").default([]), // Array of dietary preferences like ['Vegan', 'Gluten-free']
    allergies: json("allergies").default([]), // Array of allergies
    dislikes: json("dislikes").default([]), // Array of foods user dislikes
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("dietary_preferences_user_id_unique").on(table.userId),
  })
);

// Nutrition goals table
export const nutritionGoalsTable = pgTable(
  "nutrition_goals",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    primaryGoal: text("primary_goal"), // 'lose' | 'maintain' | 'gain'
    dailyCalories: integer("daily_calories"),
    proteinG: integer("protein_g"),
    carbsG: integer("carbs_g"),
    fatsG: integer("fats_g"),
    waterLiters: decimal("water_liters", { precision: 3, scale: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("nutrition_goals_user_id_unique").on(table.userId),
    // CHECK constraints for nutrition goals
    primaryGoalCheck: check("primary_goal_check", sql`${table.primaryGoal} IS NULL OR ${table.primaryGoal} IN ('lose', 'maintain', 'gain')`),
    caloriesCheck: check("calories_check", sql`${table.dailyCalories} IS NULL OR (${table.dailyCalories} >= 800 AND ${table.dailyCalories} <= 10000)`),
    proteinCheck: check("protein_check", sql`${table.proteinG} IS NULL OR (${table.proteinG} >= 0 AND ${table.proteinG} <= 500)`),
    carbsCheck: check("carbs_check", sql`${table.carbsG} IS NULL OR (${table.carbsG} >= 0 AND ${table.carbsG} <= 1000)`),
    fatsCheck: check("fats_check", sql`${table.fatsG} IS NULL OR (${table.fatsG} >= 0 AND ${table.fatsG} <= 300)`),
    waterCheck: check("water_check", sql`${table.waterLiters} IS NULL OR (${table.waterLiters} >= 0 AND ${table.waterLiters} <= 10)`),
  })
);

// Gamification stats table
export const gamificationTable = pgTable(
  "gamification",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    xp: integer("xp").default(0),
    level: integer("level").default(1),
    streak: integer("streak").default(0), // days
    streakFreezes: integer("streak_freezes").default(0),
    lastFreezeAwardedAt: timestamp("last_freeze_awarded_at"),
    lastStreakUpdatedAt: timestamp("last_streak_updated_at"),
    timezoneOffset: integer("timezone_offset"),
    totalMealsLogged: integer("total_meals_logged").default(0),
    lastLogDate: timestamp("last_log_date"),
    lastXpAwardedAt: timestamp("last_xp_awarded_at"),
    badges: json("badges").default([]), // Array of unlocked achievement badges
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("gamification_user_id_unique").on(table.userId),
    // CHECK constraints for gamification
    xpCheck: check("xp_check", sql`${table.xp} >= 0`),
    levelCheck: check("level_check", sql`${table.level} >= 1 AND ${table.level} <= 999`),
    streakCheck: check("streak_check", sql`${table.streak} >= 0`),
    streakFreezesCheck: check("streak_freezes_check", sql`${table.streakFreezes} >= 0`),
    totalMealsCheck: check("total_meals_check", sql`${table.totalMealsLogged} >= 0`),
  })
);

// Daily meal counts table - tracks meals logged per day for XP cap
export const dailyMealCountsTable = pgTable(
  "daily_meal_counts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    mealCount: integer("meal_count").default(0),
    xpEarnedToday: integer("xp_earned_today").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userDateUniqueIdx: unique("daily_meal_counts_user_date_unique").on(table.userId, table.date),
    userDateIdx: index("daily_meal_counts_user_date_idx").on(table.userId, table.date),
    mealCountCheck: check("meal_count_check", sql`${table.mealCount} >= 0`),
    xpCheck: check("daily_xp_check", sql`${table.xpEarnedToday} >= 0`),
  })
);

// Food log table - tracks individual food entries
export const foodLogTable = pgTable(
  "food_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    foodName: text("food_name").notNull(),
    calories: integer("calories"),
    protein: integer("protein"),
    carbs: integer("carbs"),
    fats: integer("fats"),
    servingSize: text("serving_size"),
    mealType: text("meal_type"), // 'breakfast' | 'lunch' | 'dinner' | 'snack'

    // Idempotency support (PHASE 1 - STEP 1: Nullable for migration)
    clientEventId: text("client_event_id")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),  // Auto-generate UUID for idempotency
    sourceMeta: json("source_meta").default({}), // Track logging source (text/photo/voice/barcode)

    // Enhanced fields for AI/Scanner features
    micros: json("micros").default({}), // { calcium: "10mg", iron: "2mg" ... }
    nutriscore: text("nutriscore"), // 'A' | 'B' | 'C' | 'D' | 'E'
    ecoscore: text("ecoscore"), // 'A' | 'B' | 'C' | 'D' | 'E'
    novaScore: integer("nova_score"), // 1 | 2 | 3 | 4
    dietLabels: json("diet_labels").default([]), // ['Vegan', 'Keto', 'Low-Carb']
    allergens: json("allergens").default([]), // ['Peanuts', 'Gluten']
    ingredients: json("ingredients").default([]), // [{name: "sugar", amount: "10g"}]
    barcode: text("barcode"),
    imageUrl: text("image_url"), // URL of the photo if scanned

    // 🆕 REGIONAL SUPPORT & MULTIMODAL FIELDS
    cuisine: text("cuisine"), // 'South Indian', 'American', etc.
    cookingMethod: text("cooking_method"), // 'fried', 'steamed', 'grilled'
    ingredientsBreakdown: json("ingredients_breakdown").default([]), // Detailed ingredient breakdown
    voiceTranscript: text("voice_transcript"), // Original voice transcript if from voice log
    multimodalSource: json("multimodal_source").default({}), // Track if photo + voice combined

    // AI METADATA
    aiModel: text("ai_model"), // 'gpt-4o', 'gpt-4o-mini', 'local_dictionary'
    aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00

    loggedDate: timestamp("logged_date").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Index for user food history queries
    userIdIdx: index("food_log_user_id_idx").on(table.userId),
    // Index for date-based queries
    loggedDateIdx: index("food_log_logged_date_idx").on(table.loggedDate),
    // Composite index for user + date queries (most common)
    userDateIdx: index("food_log_user_date_idx").on(table.userId, table.loggedDate),
    // CHECK constraints for nutrition values
    caloriesCheck: check("food_calories_check", sql`${table.calories} IS NULL OR (${table.calories} >= 0 AND ${table.calories} <= 10000)`),
    proteinCheck: check("food_protein_check", sql`${table.protein} IS NULL OR (${table.protein} >= 0 AND ${table.protein} <= 500)`),
    carbsCheck: check("food_carbs_check", sql`${table.carbs} IS NULL OR (${table.carbs} >= 0 AND ${table.carbs} <= 1000)`),
    fatsCheck: check("food_fats_check", sql`${table.fats} IS NULL OR (${table.fats} >= 0 AND ${table.fats} <= 500)`),
    mealTypeCheck: check("meal_type_check", sql`${table.mealType} IS NULL OR ${table.mealType} IN ('breakfast', 'lunch', 'dinner', 'snack')`),
    nutriscoreCheck: check("nutriscore_check", sql`${table.nutriscore} IS NULL OR ${table.nutriscore} IN ('A', 'B', 'C', 'D', 'E')`),
    ecoscoreCheck: check("ecoscore_check", sql`${table.ecoscore} IS NULL OR ${table.ecoscore} IN ('A', 'B', 'C', 'D', 'E')`),
    novaScoreCheck: check("nova_score_check", sql`${table.novaScore} IS NULL OR (${table.novaScore} >= 1 AND ${table.novaScore} <= 4)`),
    // 🆕 Regional field constraints
    cookingMethodCheck: check("cooking_method_check", sql`${table.cookingMethod} IS NULL OR ${table.cookingMethod} IN ('fried', 'steamed', 'grilled', 'boiled', 'baked', 'raw')`),
    aiConfidenceCheck: check("ai_confidence_check", sql`${table.aiConfidence} IS NULL OR (${table.aiConfidence} >= 0 AND ${table.aiConfidence} <= 1)`),
  })
);

// Barcode product cache - stores normalized product + nutrition for scans
export const barcodeProductsTable = pgTable(
  "barcode_products",
  {
    id: serial("id").primaryKey(),
    barcode: text("barcode").notNull(),
    productName: text("product_name").notNull(),
    brand: text("brand"),
    category: text("category"),
    imageUrl: text("image_url"),
    nutriments: json("nutriments").default({}),
    servingSize: text("serving_size"),
    source: text("source").default("openfoodfacts"),
    lastSyncedAt: timestamp("last_synced_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    barcodeUniqueIdx: uniqueIndex("barcode_products_barcode_unique_idx").on(table.barcode),
    barcodeSourceIdx: index("barcode_products_barcode_source_idx").on(table.barcode, table.source),
  })
);

// Daily nutrition summary table
export const dailyNutritionSummaryTable = pgTable(
  "daily_nutrition_summary",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    totalCalories: integer("total_calories").default(0),
    totalProtein: integer("total_protein").default(0),
    totalCarbs: integer("total_carbs").default(0),
    totalFats: integer("total_fats").default(0),
    
    // Enhanced Calendar Fields
    dailyScore: integer("daily_score"), // 0-100 combined wellness score
    moodScore: integer("mood_score"), // 0-100 normalized mood
    hydrationScore: integer("hydration_score"), // 0-100 normalized hydration
    hydrationCelebratedAt: timestamp("hydration_celebrated_at"),
    storyLine: text("story_line"), // "High sugar dinner → lower calm next morning"
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Unique constraint: one summary per user per day
    userDateUniqueIdx: uniqueIndex("daily_summary_user_date_unique_idx").on(
      table.userId,
      table.date
    ),
    // Index for querying user's summaries
    userIdIdx: index("daily_summary_user_id_idx").on(table.userId),
    // Index for date-based queries
    dateIdx: index("daily_summary_date_idx").on(table.date),
    // CHECK constraints
    totalCaloriesCheck: check("total_calories_check", sql`${table.totalCalories} >= 0`),
    totalProteinCheck: check("total_protein_check", sql`${table.totalProtein} >= 0`),
    totalCarbsCheck: check("total_carbs_check", sql`${table.totalCarbs} >= 0`),
    totalFatsCheck: check("total_fats_check", sql`${table.totalFats} >= 0`),
    dailyScoreCheck: check("daily_score_check", sql`${table.dailyScore} >= 0 AND ${table.dailyScore} <= 100`),
    moodScoreCheck: check("mood_score_check", sql`${table.moodScore} >= 0 AND ${table.moodScore} <= 100`),
    hydrationScoreCheck: check("hydration_score_check", sql`${table.hydrationScore} >= 0 AND ${table.hydrationScore} <= 100`),
  })
);

// Water log table
export const waterLogTable = pgTable(
  "water_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    amountLiters: decimal("amount_liters", { precision: 3, scale: 1 }).notNull(),
    beverageType: text("beverage_type").default("water"),
    hydrationFactor: decimal("hydration_factor", { precision: 3, scale: 2 }).default("1.0"),
    hydrationLiters: decimal("hydration_liters", { precision: 3, scale: 1 }),

    // Idempotency support (NULLABLE for migration, will be NOT NULL after backfill)
    clientEventId: text("client_event_id"),

    loggedDate: timestamp("logged_date").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Composite index for user + date queries
    userDateIdx: index("water_log_user_date_idx").on(table.userId, table.loggedDate),
    userClientEventIdUnique: unique("water_log_user_id_client_event_id_unique").on(table.userId, table.clientEventId),
    // CHECK constraint
    amountCheck: check("water_amount_check", sql`${table.amountLiters} > 0 AND ${table.amountLiters} <= 20`),
  })
);

// Weight history table
export const weightHistoryTable = pgTable(
  "weight_history",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    weightKg: decimal("weight_kg", { precision: 5, scale: 2 }).notNull(),

    // Idempotency support
    clientEventId: text("client_event_id"),
    recordedDate: timestamp("recorded_date").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Composite index for user + date queries
    userDateIdx: index("weight_history_user_date_idx").on(table.userId, table.recordedDate),
    userClientEventIdUnique: unique("weight_history_user_id_client_event_id_unique").on(table.userId, table.clientEventId),
    // CHECK constraint
    weightCheck: check("weight_history_check", sql`${table.weightKg} > 20 AND ${table.weightKg} < 500`),
  })
);

// Achievements table - master list
export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"), // emoji fallback
  lottieSource: text("lottie_source"), // Lottie animation identifier (e.g., 'celebration', 'streak', 'success')
  requiredPoints: integer("required_points"), // XP needed for this achievement
  category: text("category"), // 'streak' | 'meal_count' | 'level' | 'nutrition' | 'recovery'
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements table - tracks unlocked achievements
export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  achievementId: integer("achievement_id")
    .notNull()
    .references(() => achievementsTable.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User notifications table
export const userNotificationsTable = pgTable(
  "user_notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    type: text("type"), // 'achievement_unlock' | 'reminder' | 'goal_reached'
    title: text("title").notNull(),
    message: text("message"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // CHECK constraint for notification types
    typeCheck: check("notification_type_check", sql`${table.type} IS NULL OR ${table.type} IN ('achievement_unlock', 'reminder', 'goal_reached')`),
  })
);

// Mood log table
export const moodLogTable = pgTable(
  "mood_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    mood: text("mood").notNull(), // 'happy', 'sad', 'neutral', etc.
    note: text("note"),
    source: text("source"), // 'quick_action', 'manual', etc.

    // Enhanced mood tracking fields
    intensity: integer("intensity"), // 1-10 mood intensity
    tags: json("tags").$type().default({}), // Context tags: { sleep: 'Good', exercise: 'Moderate', ... }
    energyLevel: integer("energy_level"), // 1-10 energy level
    mealContext: json("meal_context").$type().default({}), // { mealIds: [123, 124], windowHours: 4 }

    // Idempotency support (NULLABLE for migration, will be NOT NULL after backfill)
    clientEventId: text("client_event_id"),

    // Timezone normalization (stable local-day bucket)
    dayKey: text("day_key"), // YYYY-MM-DD at log time
    timezoneOffset: integer("timezone_offset"), // minutes from UTC at log time

    loggedDate: timestamp("logged_date").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Composite index for user + date queries
    userDateIdx: index("mood_log_user_date_idx").on(table.userId, table.loggedDate), // Existing index
    // Unique constraint for idempotency support
    userClientEventIdUnique: unique("mood_log_user_id_client_event_id_unique").on(table.userId, table.clientEventId),
  })
);

// Mood-meal correlations table (derived cache for analytics)
export const moodMealCorrelationsTable = pgTable(
  "mood_meal_correlations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    mealPattern: json("meal_pattern").$type().notNull(), // { avgCarbs, avgProtein, avgFat, avgNova }
    moodPattern: text("mood_pattern").notNull(), // Mood type
    strength: decimal("strength", { precision: 3, scale: 2 }), // 0.00-1.00
    confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00-1.00
    occurrences: integer("occurrences").default(0),

    // Reproducibility tracking
    source: text("source").notNull().default("rules"), // 'rules' | 'ai'
    version: text("version").notNull().default("v1"), // Schema version for re-computation

    lastAnalyzedAt: timestamp("last_analyzed_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("mood_meal_corr_user_id_idx").on(table.userId),
  })
);

// Activity levels table - defines different activity levels for users
export const activityLevelsTable = pgTable("activity_levels", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  desc: text("desc"),
  factor: decimal("factor", { precision: 3, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recommendations history table - tracks all recommendations shown and user interactions
export const recommendationsHistoryTable = pgTable(
  "recommendations_history",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    recommendationId: text("recommendation_id").notNull().unique(),

    // Recommendation Content
    foodName: text("food_name").notNull(),
    portion: text("portion"),
    calories: integer("calories").notNull(),
    protein: integer("protein").notNull(),
    carbs: integer("carbs").notNull(),
    fats: integer("fats").notNull(),
    fiber: integer("fiber").default(0),
    sugar: integer("sugar").default(0),

    // Micronutrients (JSON for flexibility)
    micros: json("micros").default({}),

    // Recommendation Metadata
    recommendationType: text("recommendation_type").notNull(), // PROTEIN_BOOST, LIGHT_SNACK, HYDRATION, REGIONAL_PICK, BALANCED_MEAL
    reason: text("reason"),
    tips: text("tips"),
    prepTimeMinutes: integer("prep_time_minutes"),
    recipeInstructions: text("recipe_instructions"),

    // Preference Strength Tracking (NEW)
    preferenceStrengthMatch: integer("preference_strength_match"), // 1-5, how well matches user preferences
    dietCompliant: boolean("diet_compliant"), // Complies with dietary preferences
    allergenFree: boolean("allergen_free"), // Free of user's allergens
    warningBadge: json("warning_badge"), // {type: string, message: string} - e.g., {type: "allergen_mismatch", message: "Contains peanuts"}


    // Context at Time of Recommendation
    mealType: text("meal_type"), // breakfast, lunch, dinner, snack
    timeOfDay: integer("time_of_day"), // Hour of day (0-23)
    remainingCalories: integer("remaining_calories"),
    remainingProtein: integer("remaining_protein"),
    remainingCarbs: integer("remaining_carbs"),
    remainingFats: integer("remaining_fats"),

    // User Interaction Tracking
    interactionStatus: text("interaction_status").default("shown"), // shown, viewed, accepted, rejected, customized
    shownAt: timestamp("shown_at").defaultNow(),
    viewedAt: timestamp("viewed_at"),
    interactedAt: timestamp("interacted_at"),
    rejectionReason: text("rejection_reason"),
    customizedPortion: text("customized_portion"),

    // Outcome Tracking
    wasLogged: boolean("was_logged").default(false),
    loggedFoodId: integer("logged_food_id"),
    loggedAt: timestamp("logged_at"),

    // AI Metadata
    aiGenerated: boolean("ai_generated").default(true),
    aiModel: text("ai_model").default("gpt-4o-mini"),
    aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }),

    // Personalization Score (calculated by backend)
    personalizationScore: decimal("personalization_score", { precision: 3, scale: 2 }), // 0.00-1.00

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes for efficient querying
    userIdIdx: index("idx_rec_history_user_id").on(table.userId),
    recommendationIdIdx: index("idx_rec_history_recommendation_id").on(table.recommendationId),
    userStatusIdx: index("idx_rec_history_user_status").on(table.userId, table.interactionStatus),
    shownAtIdx: index("idx_rec_history_shown_at").on(table.shownAt),
    mealTypeIdx: index("idx_rec_history_meal_type").on(table.mealType),
    recTypeIdx: index("idx_rec_history_rec_type").on(table.recommendationType),
    strengthMatchIdx: index("idx_rec_history_strength_match").on(table.preferenceStrengthMatch), // NEW: For analytics
    dietCompliantIdx: index("idx_rec_history_diet_compliant").on(table.dietCompliant), // NEW: For compliance tracking
  })
);

// User portion preferences table - stores learned portion preferences per food
export const userPortionPreferencesTable = pgTable(
  "user_portion_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Food identification
    canonicalName: text("canonical_name").notNull(), // Normalized food name for lookup
    displayName: text("display_name"), // Display name as user typed it

    // Learned portion
    preferredPortionAmount: decimal("preferred_portion_amount", { precision: 8, scale: 2 }).notNull(),
    preferredPortionUnit: text("preferred_portion_unit").notNull(), // 'g', 'ml', 'cup', 'serving', etc.

    // Learning metadata
    confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).default("0.5"), // 0.00-1.00, grows with adjustments
    adjustmentCount: integer("adjustment_count").default(0), // Number of times user adjusted this food
    totalLoggingCount: integer("total_logging_count").default(0), // Total times this food was logged

    // Timestamps for learning
    lastUsed: timestamp("last_used").defaultNow(),
    lastAdjustedAt: timestamp("last_adjusted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Unique constraint: one preference per user per food
    userCanonicalNameUnique: unique("user_portion_pref_user_canonical_unique").on(
      table.userId,
      table.canonicalName
    ),
    // Indexes for efficient querying
    userIdIdx: index("user_portion_pref_user_id_idx").on(table.userId),
    canonicalNameIdx: index("user_portion_pref_canonical_idx").on(table.canonicalName),
    confidenceScoreIdx: index("user_portion_pref_confidence_idx").on(table.confidenceScore),
    lastUsedIdx: index("user_portion_pref_last_used_idx").on(table.lastUsed),
    // CHECK constraints
    confidenceScoreCheck: check(
      "confidence_score_check",
      sql`${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1`
    ),
    adjustmentCountCheck: check(
      "adjustment_count_check",
      sql`${table.adjustmentCount} >= 0`
    ),
    totalLoggingCountCheck: check(
      "total_logging_count_check",
      sql`${table.totalLoggingCount} >= 0`
    ),
    portionAmountCheck: check(
      "portion_amount_check",
      sql`${table.preferredPortionAmount} > 0 AND ${table.preferredPortionAmount} <= 9999`
    ),
  })
);

// ============================================================================
// HYDRATION INTELLIGENCE TABLES
// Phase 0: Foundation for Predictive Hydration Intelligence
// ============================================================================

// Hydration daily summary - Pre-computed aggregates for WARM PATH
// Regeneratable from water_log - no user data lost if truncated
export const hydrationDailySummaryTable = pgTable(
  "hydration_daily_summary",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),

    // Raw totals
    totalMl: integer("total_ml").notNull().default(0),
    hydrationMl: integer("hydration_ml").notNull().default(0), // After beverage factors
    logCount: integer("log_count").notNull().default(0),

    // Beverage breakdown { water: 0.6, coffee: 0.2, tea: 0.1, juice: 0.1 }
    beverageBreakdown: json("beverage_breakdown").default({}),

    // Goal tracking
    goalMl: integer("goal_ml"),
    goalMet: boolean("goal_met").default(false),
    goalPercent: decimal("goal_percent", { precision: 5, scale: 2 }),

    // Pattern features (computed during aggregation)
    peakHour: integer("peak_hour"), // 0-23
    distributionVariance: decimal("distribution_variance", { precision: 8, scale: 4 }),
    firstLogHour: integer("first_log_hour"),
    lastLogHour: integer("last_log_hour"),

    // Computation metadata
    computedAt: timestamp("computed_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userDateUniqueIdx: unique("hydration_daily_user_date_idx").on(table.userId, table.date),
    dateIdx: index("hydration_daily_date_idx").on(table.date),
    userIdIdx: index("hydration_daily_user_idx").on(table.userId),
    // CHECK constraints
    totalMlCheck: check("hydration_total_ml_check", sql`${table.totalMl} >= 0`),
    logCountCheck: check("hydration_log_count_check", sql`${table.logCount} >= 0`),
    peakHourCheck: check("hydration_peak_hour_check", sql`${table.peakHour} IS NULL OR (${table.peakHour} >= 0 AND ${table.peakHour} <= 23)`),
  })
);

// User hydration profile - Persona, patterns, privacy controls
// Can be deleted/reset by user (GDPR compliant)
export const userHydrationProfileTable = pgTable(
  "user_hydration_profile",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Persona classification (NULL until day 7)
    personaType: text("persona_type"), // CONSISTENT_SIPPER, MORNING_DEHYDRATOR, etc.
    personaConfidence: decimal("persona_confidence", { precision: 3, scale: 2 }),
    personaAssignedAt: timestamp("persona_assigned_at"),
    personaVersion: text("persona_version").default("v1"),

    // Learned patterns (JSON for flexibility)
    patternsJson: json("patterns_json").default({}),

    // Privacy controls
    patternTrackingEnabled: boolean("pattern_tracking_enabled").default(true),
    predictionsEnabled: boolean("predictions_enabled").default(true),
    insightsEnabled: boolean("insights_enabled").default(true),

    // Calendar integration
    calendarConnected: boolean("calendar_connected").default(false),
    calendarProvider: text("calendar_provider"), // 'apple', 'google', null
    calendarConnectedAt: timestamp("calendar_connected_at"),

    // Cold start tracking
    onboardingStage: text("onboarding_stage").default("day0"), // day0, days1-3, days4-7, established, power_user
    firstLogAt: timestamp("first_log_at"),
    daysWithData: integer("days_with_data").default(0),

    // Computation metadata
    lastPatternComputeAt: timestamp("last_pattern_compute_at"),
    lastPersonaComputeAt: timestamp("last_persona_compute_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdUniqueIdx: unique("hydration_profile_user_idx").on(table.userId),
    stageIdx: index("hydration_profile_stage_idx").on(table.onboardingStage),
    // CHECK constraints
    personaConfidenceCheck: check("hydration_persona_confidence_check", sql`${table.personaConfidence} IS NULL OR (${table.personaConfidence} >= 0 AND ${table.personaConfidence} <= 1)`),
    stageCheck: check("hydration_stage_check", sql`${table.onboardingStage} IN ('day0', 'days1-3', 'days4-7', 'established', 'power_user')`),
    calendarProviderCheck: check("hydration_calendar_provider_check", sql`${table.calendarProvider} IS NULL OR ${table.calendarProvider} IN ('apple', 'google')`),
  })
);

// Hydration predictions - Ephemeral, regenerated daily
// For WARM PATH queries - pre-computed at midnight
export const hydrationPredictionsTable = pgTable(
  "hydration_predictions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    predictionDate: timestamp("prediction_date").notNull(),

    // Core prediction
    predictedNeedMl: integer("predicted_need_ml").notNull(),
    baselineMl: integer("baseline_ml").notNull(),

    // Explainable factors (JSON array)
    factors: json("factors").default([]),

    // Confidence and metadata
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    algorithmVersion: text("algorithm_version").default("v1"),
    dataPointsUsed: integer("data_points_used"),

    // Context that influenced prediction
    contextJson: json("context_json").default({}),

    // Lifecycle
    generatedAt: timestamp("generated_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    wasShownToUser: boolean("was_shown_to_user").default(false),
    shownAt: timestamp("shown_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userDateUniqueIdx: unique("hydration_predictions_user_date_idx").on(table.userId, table.predictionDate),
    expiresIdx: index("hydration_predictions_expires_idx").on(table.expiresAt),
    userDateIdx: index("hydration_predictions_user_idx").on(table.userId, table.predictionDate),
    // CHECK constraints
    predictedMlCheck: check("hydration_prediction_ml_check", sql`${table.predictedNeedMl} > 0`),
    confidenceCheck: check("hydration_prediction_confidence_check", sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`),
  })
);

// Insight feedback - User feedback loop for learning
// Helps improve insight quality and respects user preferences
export const insightFeedbackTable = pgTable(
  "insight_feedback",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Insight identification
    insightType: text("insight_type").notNull(), // 'prediction', 'pattern', 'persona', 'suggestion'
    insightId: text("insight_id").notNull(),
    insightVersion: text("insight_version").default("v1"),

    // User feedback
    wasHelpful: boolean("was_helpful"),
    dismissed: boolean("dismissed").default(false),
    dismissReason: text("dismiss_reason"), // 'not_accurate', 'not_useful', 'too_frequent', 'privacy'

    // Optional detailed feedback
    feedbackText: text("feedback_text"),
    accuracyRating: integer("accuracy_rating"), // 1-5

    // Context at feedback time
    contextJson: json("context_json").default({}),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("insight_feedback_user_idx").on(table.userId),
    typeIdx: index("insight_feedback_type_idx").on(table.insightType),
    userInsightUniqueIdx: unique("insight_feedback_user_insight_idx").on(table.userId, table.insightType, table.insightId),
    // CHECK constraints
    typeCheck: check("insight_feedback_type_check", sql`${table.insightType} IN ('prediction', 'pattern', 'persona', 'suggestion', 'correlation')`),
    reasonCheck: check("insight_feedback_reason_check", sql`${table.dismissReason} IS NULL OR ${table.dismissReason} IN ('not_accurate', 'not_useful', 'too_frequent', 'privacy', 'other')`),
    ratingCheck: check("insight_feedback_rating_check", sql`${table.accuracyRating} IS NULL OR (${table.accuracyRating} >= 1 AND ${table.accuracyRating} <= 5)`),
  })
);

// AI Estimated Foods table - caches OpenAI nutrition estimates
// Replaces Mongoose model with Drizzle for PostgreSQL compatibility
export const aiEstimatedFoodsTable = pgTable(
  "ai_estimated_foods",
  {
    id: serial("id").primaryKey(),

    // Core food identification
    name: text("name").notNull(),
    sourceQuery: text("source_query").notNull(), // Normalized query for cache matching

    // Nutrition data (stored as JSON for flexibility)
    // Structure: { calories, protein, carbs, fats, fiber, sugar, sodium, micros }
    nutrition: json("nutrition").notNull(),

    // Portion information { amount, unit }
    portion: json("portion").default({ amount: 1, unit: 'serving' }),

    // Regional support
    cuisine: text("cuisine"),
    region: text("region"),
    cookingMethod: text("cooking_method"),

    // AI metadata
    confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.70"),
    healthScore: integer("health_score"),
    nutriScore: text("nutri_score"), // A-E
    analysis: text("analysis"),
    aiModel: text("ai_model").default("gpt-4o-mini"),

    // Verification tracking
    isVerified: boolean("is_verified").default(false),
    verificationCount: integer("verification_count").default(0),
    correctionCount: integer("correction_count").default(0),

    // Cache optimization
    accessCount: integer("access_count").default(0),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow(),

    // User reporting (for flagging inaccurate nutrition data)
    reports: integer("reports").default(0),
    lastReportedAt: timestamp("last_reported_at"),

    // Source tracking
    source: text("source").default("ai_estimate"), // ai_estimate, user_submitted, usda_fallback

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Index for cache lookups
    sourceQueryIdx: index("ai_foods_source_query_idx").on(table.sourceQuery),
    // Compound index for regional lookups
    regionalIdx: index("ai_foods_regional_idx").on(table.sourceQuery, table.cuisine, table.region),
    // Index for verified foods
    verifiedIdx: index("ai_foods_verified_idx").on(table.sourceQuery, table.isVerified),
    // Unique constraint for source query (prevent duplicates)
    sourceQueryUnique: unique("ai_foods_source_query_unique").on(table.sourceQuery),
  })
);
