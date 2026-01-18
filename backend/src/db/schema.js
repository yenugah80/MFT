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
    // Firebase Cloud Messaging token
    fcmToken: text("fcm_token"),
    fcmTokenUpdatedAt: timestamp("fcm_token_updated_at"),
    fcmTokenPlatform: text("fcm_token_platform"), // 'ios' | 'android'
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
    fiber: integer("fiber"), // Fiber in grams (new column)
    sugar: integer("sugar"), // Sugar in grams (new column)
    sodium: integer("sodium"), // Sodium in mg (new column)
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
    fiberCheck: check("food_fiber_check", sql`${table.fiber} IS NULL OR (${table.fiber} >= 0 AND ${table.fiber} <= 200)`),
    sugarCheck: check("food_sugar_check", sql`${table.sugar} IS NULL OR (${table.sugar} >= 0 AND ${table.sugar} <= 500)`),
    sodiumCheck: check("food_sodium_check", sql`${table.sodium} IS NULL OR (${table.sodium} >= 0 AND ${table.sodium} <= 10000)`),
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

// ========================================
// CORRELATION ENGINE TABLES
// ========================================

// User correlations - stores discovered patterns between signals
export const userCorrelationsTable = pgTable(
  "user_correlations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Correlation metadata
    correlationType: text("correlation_type").notNull(), // 'mood_food', 'stress_eating', 'hydration_mood', 'activity_recovery', 'meal_timing_sleep'
    ruleName: text("rule_name").notNull(), // 'high_nova_mood_crash', 'stress_meal_skipping', etc.

    // Signal pair
    signalA: text("signal_a").notNull(), // e.g., 'high_nova_carbs'
    signalAValue: decimal("signal_a_value", { precision: 10, scale: 2 }), // e.g., 45 (grams)
    signalAUnit: text("signal_a_unit"), // 'grams', 'intensity', 'liters', etc.
    signalB: text("signal_b").notNull(), // e.g., 'mood_drop'
    signalBValue: decimal("signal_b_value", { precision: 10, scale: 2 }), // e.g., -3 (points)
    signalBUnit: text("signal_b_unit"), // 'points', 'level', 'hours', etc.

    // Timing
    windowType: text("window_type").notNull(), // '4h', '24h', '7d', '15d', '30d', '60d'
    timeLagMinutes: integer("time_lag_minutes"), // Typically 120-180 for food-mood

    // Scoring
    strength: decimal("strength", { precision: 3, scale: 2 }).notNull(), // 0.0-1.0
    confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(), // 0.0-1.0
    occurrences: integer("occurrences").notNull().default(0), // Count of pattern observations

    // Health impact
    healthImpactSeverity: text("health_impact_severity"), // 'high', 'moderate', 'low', 'positive', 'neutral'
    affectedDomains: json("affected_domains").default([]), // ['mood', 'energy', 'sleep']
    expectedOutcome: text("expected_outcome"), // Plain language description

    // Metadata
    evidenceJson: json("evidence_json"), // Full evidence data for detail views
    lastObservedDate: text("last_observed_date"), // YYYY-MM-DD
    firstObservedDate: text("first_observed_date"), // YYYY-MM-DD
    isActive: boolean("is_active").default(true), // Is pattern still valid?

    // Audit
    computedAt: timestamp("computed_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Unique constraint: one rule per user per window type
    userRuleWindowUnique: unique("user_corr_user_rule_window_unique").on(
      table.userId,
      table.correlationType,
      table.ruleName,
      table.windowType
    ),
    // Indexes for performance
    userActiveIdx: index("user_corr_user_active_idx").on(table.userId, table.isActive),
    userConfidenceIdx: index("user_corr_user_confidence_idx").on(table.userId, table.confidence),
    correlationTypeIdx: index("user_corr_type_idx").on(table.correlationType),
    severityIdx: index("user_corr_severity_idx").on(table.healthImpactSeverity),
  })
);

// Correlation evidence - individual data points that support correlations
export const correlationEvidenceTable = pgTable(
  "correlation_evidence",
  {
    id: serial("id").primaryKey(),
    correlationId: integer("correlation_id")
      .notNull()
      .references(() => userCorrelationsTable.id, { onDelete: "cascade" }),

    // Evidence point linking
    observationDate: text("observation_date"), // YYYY-MM-DD
    foodLogId: integer("food_log_id").references(() => foodLogTable.id, { onDelete: "set null" }),
    moodLogId: integer("mood_log_id").references(() => moodLogTable.id, { onDelete: "set null" }),
    waterLogId: integer("water_log_id").references(() => waterLogTable.id, { onDelete: "set null" }),

    // Raw signal values
    signalAActual: decimal("signal_a_actual", { precision: 10, scale: 2 }),
    signalBActual: decimal("signal_b_actual", { precision: 10, scale: 2 }),

    // Context at observation time (JSON for flexibility)
    tagsJson: json("tags_json"), // { sleep: 'good', exercise: 'moderate', stress: 'high', weather: 'sunny' }

    // Timing context
    hourOfDay: integer("hour_of_day"), // 0-23

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Indexes for querying evidence
    correlationIdx: index("corr_evidence_correlation_idx").on(table.correlationId),
    dateIdx: index("corr_evidence_date_idx").on(table.observationDate),
  })
);

// ============================================================================
// MACHINE LEARNING INFRASTRUCTURE TABLES
// ============================================================================

// Thompson Sampling Arms - Tracks multi-armed bandit state per user per recommendation type
export const recommendationArmsTable = pgTable(
  "recommendation_arms",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Arm identification (recommendationType:mealType:timeBucket)
    armKey: text("arm_key").notNull(),

    // Beta distribution parameters (conjugate prior for Bernoulli)
    alpha: decimal("alpha", { precision: 10, scale: 4 }).notNull().default("1.0"), // Successes + prior
    beta: decimal("beta", { precision: 10, scale: 4 }).notNull().default("1.0"),   // Failures + prior

    // Trial counts
    trials: integer("trials").default(0),
    successes: integer("successes").default(0),

    // Temporal tracking
    lastUpdated: timestamp("last_updated").defaultNow(),
    firstTrialAt: timestamp("first_trial_at"),

    // Metadata (JSON for flexibility)
    metadata: json("metadata").default({}),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userArmUniqueIdx: unique("rec_arms_user_arm_unique").on(table.userId, table.armKey),
    userIdx: index("rec_arms_user_idx").on(table.userId),
    armKeyIdx: index("rec_arms_arm_key_idx").on(table.armKey),
    trialsIdx: index("rec_arms_trials_idx").on(table.trials),
    // CHECK constraints
    alphaCheck: check("rec_arms_alpha_check", sql`${table.alpha} > 0`),
    betaCheck: check("rec_arms_beta_check", sql`${table.beta} > 0`),
    trialsCheck: check("rec_arms_trials_check", sql`${table.trials} >= 0`),
    successesCheck: check("rec_arms_successes_check", sql`${table.successes} >= 0 AND ${table.successes} <= ${table.trials}`),
  })
);

// A/B Test Assignments - Tracks user experiment assignments
export const abTestAssignmentsTable = pgTable(
  "ab_test_assignments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Experiment identification
    experimentId: text("experiment_id").notNull(),
    experimentName: text("experiment_name").notNull(),

    // Assignment
    variantId: text("variant_id").notNull(), // 'control', 'treatment_a', 'treatment_b'
    assignedAt: timestamp("assigned_at").defaultNow(),
    assignmentReason: text("assignment_reason"), // 'random', 'stratified', 'deterministic'

    // Exposure tracking
    firstExposedAt: timestamp("first_exposed_at"),
    exposureCount: integer("exposure_count").default(0),

    // Outcome tracking
    conversionAt: timestamp("conversion_at"),
    primaryMetricValue: decimal("primary_metric_value", { precision: 10, scale: 4 }),
    secondaryMetricsJson: json("secondary_metrics_json").default({}),

    // Experiment state
    isActive: boolean("is_active").default(true),
    concludedAt: timestamp("concluded_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userExperimentUniqueIdx: unique("ab_test_user_experiment_unique").on(table.userId, table.experimentId),
    experimentIdx: index("ab_test_experiment_idx").on(table.experimentId),
    variantIdx: index("ab_test_variant_idx").on(table.experimentId, table.variantId),
    activeIdx: index("ab_test_active_idx").on(table.isActive),
  })
);

// A/B Test Definitions - Defines experiments
export const abTestDefinitionsTable = pgTable(
  "ab_test_definitions",
  {
    id: serial("id").primaryKey(),
    experimentId: text("experiment_id").notNull().unique(),
    experimentName: text("experiment_name").notNull(),
    description: text("description"),

    // Hypothesis
    hypothesis: text("hypothesis"),
    primaryMetric: text("primary_metric").notNull(), // 'acceptance_rate', 'mood_improvement', etc.
    secondaryMetrics: json("secondary_metrics").default([]),

    // Variants
    variants: json("variants").notNull(), // [{id: 'control', name: 'Control', weight: 0.5}, ...]

    // Statistical configuration
    minimumSampleSize: integer("minimum_sample_size").default(100),
    significanceLevel: decimal("significance_level", { precision: 4, scale: 3 }).default("0.05"),
    statisticalPower: decimal("statistical_power", { precision: 4, scale: 3 }).default("0.80"),
    minimumDetectableEffect: decimal("minimum_detectable_effect", { precision: 5, scale: 4 }),

    // Targeting
    targetUserSegment: json("target_user_segment").default({}), // {minDays: 7, maxDays: null, region: null}
    trafficAllocation: decimal("traffic_allocation", { precision: 3, scale: 2 }).default("1.00"), // 0-1

    // Lifecycle
    status: text("status").default("draft"), // 'draft', 'running', 'paused', 'concluded'
    startedAt: timestamp("started_at"),
    pausedAt: timestamp("paused_at"),
    concludedAt: timestamp("concluded_at"),
    conclusionReason: text("conclusion_reason"), // 'reached_significance', 'reached_sample_size', 'manual'

    // Results
    winningVariant: text("winning_variant"),
    pValue: decimal("p_value", { precision: 6, scale: 5 }),
    confidenceInterval: json("confidence_interval"), // {lower: 0.02, upper: 0.08}
    effectSize: decimal("effect_size", { precision: 6, scale: 4 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("ab_test_def_status_idx").on(table.status),
    statusCheck: check("ab_test_def_status_check", sql`${table.status} IN ('draft', 'running', 'paused', 'concluded')`),
  })
);

// Drift Detection Metrics - Tracks model performance over time for drift detection
export const driftMetricsTable = pgTable(
  "drift_metrics",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Metric identification
    metricType: text("metric_type").notNull(), // 'correlation_strength', 'acceptance_rate', 'prediction_accuracy'
    correlationId: integer("correlation_id").references(() => userCorrelationsTable.id, { onDelete: "set null" }),

    // Time window
    windowStart: timestamp("window_start").notNull(),
    windowEnd: timestamp("window_end").notNull(),
    windowDays: integer("window_days").notNull(),

    // Statistical metrics
    metricValue: decimal("metric_value", { precision: 10, scale: 6 }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    standardError: decimal("standard_error", { precision: 10, scale: 6 }),

    // CUSUM (Cumulative Sum) for drift detection
    cusumValue: decimal("cusum_value", { precision: 10, scale: 6 }),
    cusumUpperThreshold: decimal("cusum_upper_threshold", { precision: 10, scale: 6 }),
    cusumLowerThreshold: decimal("cusum_lower_threshold", { precision: 10, scale: 6 }),

    // Drift detection
    driftDetected: boolean("drift_detected").default(false),
    driftDirection: text("drift_direction"), // 'positive', 'negative', null
    driftMagnitude: decimal("drift_magnitude", { precision: 6, scale: 4 }),
    driftConfidence: decimal("drift_confidence", { precision: 4, scale: 3 }),

    // Actions
    alertTriggered: boolean("alert_triggered").default(false),
    retrainingTriggered: boolean("retraining_triggered").default(false),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userMetricIdx: index("drift_metrics_user_metric_idx").on(table.userId, table.metricType),
    windowIdx: index("drift_metrics_window_idx").on(table.windowStart, table.windowEnd),
    driftIdx: index("drift_metrics_drift_idx").on(table.driftDetected),
    metricTypeCheck: check("drift_metric_type_check", sql`${table.metricType} IN ('correlation_strength', 'acceptance_rate', 'prediction_accuracy', 'feature_distribution')`),
  })
);

// Lagged Correlations - Stores discovered optimal lags between signals
export const laggedCorrelationsTable = pgTable(
  "lagged_correlations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Signal pair
    signalA: text("signal_a").notNull(), // 'sugar_intake', 'hydration_level', 'activity_minutes'
    signalB: text("signal_b").notNull(), // 'mood_score', 'energy_level', 'sleep_quality'

    // Discovered optimal lag
    optimalLagHours: decimal("optimal_lag_hours", { precision: 6, scale: 2 }).notNull(),
    lagSearchRangeMin: integer("lag_search_range_min").default(0), // hours
    lagSearchRangeMax: integer("lag_search_range_max").default(48), // hours

    // Correlation at optimal lag
    correlationAtOptimalLag: decimal("correlation_at_optimal_lag", { precision: 5, scale: 4 }).notNull(),
    pValueAtOptimalLag: decimal("p_value_at_optimal_lag", { precision: 8, scale: 7 }),

    // Cross-correlation function (JSON for storing correlation at each lag)
    crossCorrelationJson: json("cross_correlation_json"), // [{lag: 0, r: 0.2}, {lag: 1, r: 0.35}, ...]

    // Statistical quality
    sampleSize: integer("sample_size").notNull(),
    confidenceInterval: json("confidence_interval"), // {lower: 0.2, upper: 0.5}
    isStatisticallySignificant: boolean("is_statistically_significant").default(false),

    // Granger causality test results
    grangerFStatistic: decimal("granger_f_statistic", { precision: 10, scale: 4 }),
    grangerPValue: decimal("granger_p_value", { precision: 8, scale: 7 }),
    causalDirection: text("causal_direction"), // 'A_causes_B', 'B_causes_A', 'bidirectional', 'no_causality'

    // Metadata
    lastComputedAt: timestamp("last_computed_at").defaultNow(),
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userSignalsUniqueIdx: unique("lagged_corr_user_signals_unique").on(table.userId, table.signalA, table.signalB),
    userIdx: index("lagged_corr_user_idx").on(table.userId),
    signalPairIdx: index("lagged_corr_signals_idx").on(table.signalA, table.signalB),
    activeIdx: index("lagged_corr_active_idx").on(table.isActive),
  })
);

// ============================================================================
// ACTIVITY TRACKING TABLE
// Full MET-based activity logging with idempotency
// ============================================================================

export const activityLogTable = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Activity details
    type: text("type").notNull().default("general"), // running, cycling, walking, gym, swimming, yoga, sports, hiking, dancing, hiit, strength, cardio, flexibility, general
    durationMinutes: integer("duration_minutes").notNull(),
    intensity: text("intensity").notNull().default("moderate"), // light, moderate, vigorous

    // MET-based calorie calculation
    metValue: decimal("met_value", { precision: 4, scale: 2 }),
    caloriesBurned: integer("calories_burned"),

    // Optional tracking fields
    heartRateAvg: integer("heart_rate_avg"),
    distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
    steps: integer("steps"),
    notes: text("notes"),

    // Idempotency support
    clientEventId: text("client_event_id"),

    // Timezone normalization
    dayKey: text("day_key"), // YYYY-MM-DD at log time
    timezoneOffset: integer("timezone_offset"), // minutes from UTC

    loggedAt: timestamp("logged_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes for performance
    userDateIdx: index("activity_log_user_date_idx").on(table.userId, table.loggedAt),
    userDayKeyIdx: index("activity_log_user_day_key_idx").on(table.userId, table.dayKey),
    userTypeIdx: index("activity_log_user_type_idx").on(table.userId, table.type),
    // Unique constraint for idempotency
    userClientEventIdUnique: unique("activity_log_user_client_event_id_unique").on(table.userId, table.clientEventId),
    // CHECK constraints
    durationCheck: check("activity_duration_check", sql`${table.durationMinutes} > 0 AND ${table.durationMinutes} <= 1440`),
    typeCheck: check("activity_type_check", sql`${table.type} IN ('running', 'cycling', 'walking', 'gym', 'swimming', 'yoga', 'sports', 'hiking', 'dancing', 'hiit', 'strength', 'cardio', 'flexibility', 'general')`),
    intensityCheck: check("activity_intensity_check", sql`${table.intensity} IN ('light', 'moderate', 'vigorous')`),
    caloriesCheck: check("activity_calories_check", sql`${table.caloriesBurned} IS NULL OR (${table.caloriesBurned} >= 0 AND ${table.caloriesBurned} <= 10000)`),
    heartRateCheck: check("activity_heart_rate_check", sql`${table.heartRateAvg} IS NULL OR (${table.heartRateAvg} >= 30 AND ${table.heartRateAvg} <= 250)`),
    distanceCheck: check("activity_distance_check", sql`${table.distanceKm} IS NULL OR (${table.distanceKm} >= 0 AND ${table.distanceKm} <= 500)`),
  })
);

// ============================================================================
// SLEEP TRACKING TABLE
// Dedicated sleep logging with quality and context tags
// ============================================================================

export const sleepLogTable = pgTable(
  "sleep_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Sleep times
    bedTime: timestamp("bed_time").notNull(),
    wakeTime: timestamp("wake_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull(), // Calculated: wakeTime - bedTime

    // Quality assessment (1-10)
    quality: integer("quality").notNull(),

    // Context tags that may affect sleep
    tags: json("tags").default({}), // { caffeine: true, alcohol: true, exercise: true, stress: true, screenTime: true, lateFood: true }

    // Notes
    notes: text("notes"),

    // Date tracking (the night of sleep, e.g., "2024-01-15" for sleeping night of Jan 15)
    sleepDate: text("sleep_date").notNull(), // YYYY-MM-DD

    // Idempotency support
    clientEventId: text("client_event_id"),

    // Timezone normalization
    dayKey: text("day_key"),
    timezoneOffset: integer("timezone_offset"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes
    userDateIdx: index("sleep_log_user_date_idx").on(table.userId, table.sleepDate),
    userDayKeyIdx: index("sleep_log_user_day_key_idx").on(table.userId, table.dayKey),
    // Unique constraints
    userSleepDateUnique: unique("sleep_log_user_sleep_date_unique").on(table.userId, table.sleepDate),
    userClientEventIdUnique: unique("sleep_log_user_client_event_id_unique").on(table.userId, table.clientEventId),
    // CHECK constraints
    durationCheck: check("sleep_duration_check", sql`${table.durationMinutes} > 0 AND ${table.durationMinutes} <= 1440`),
    qualityCheck: check("sleep_quality_check", sql`${table.quality} >= 1 AND ${table.quality} <= 10`),
  })
);

// ============================================================================
// STRESS TRACKING TABLE
// Dedicated stress logging with triggers, symptoms, and coping strategies
// ============================================================================

export const stressLogTable = pgTable(
  "stress_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Stress level (1-10)
    level: integer("level").notNull(),

    // Triggers (what caused the stress)
    triggers: json("triggers").default([]), // ['work', 'relationships', 'health', 'finances', 'family', 'social', 'other']

    // Physical symptoms experienced
    physicalSymptoms: json("physical_symptoms").default({}), // { headache: true, tension: true, fatigue: true, heartRacing: true, digestive: true, insomnia: true }

    // Coping strategies used
    copingUsed: json("coping_used").default([]), // ['meditation', 'exercise', 'breathing', 'social', 'nature', 'music', 'rest']

    // Notes
    notes: text("notes"),

    // Date tracking
    loggedDate: text("logged_date").notNull(), // YYYY-MM-DD

    // Idempotency support
    clientEventId: text("client_event_id"),

    // Timezone normalization
    dayKey: text("day_key"),
    timezoneOffset: integer("timezone_offset"),

    loggedAt: timestamp("logged_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes
    userDateIdx: index("stress_log_user_date_idx").on(table.userId, table.loggedDate),
    userDayKeyIdx: index("stress_log_user_day_key_idx").on(table.userId, table.dayKey),
    userLevelIdx: index("stress_log_user_level_idx").on(table.userId, table.level),
    // Unique constraint for idempotency
    userClientEventIdUnique: unique("stress_log_user_client_event_id_unique").on(table.userId, table.clientEventId),
    // CHECK constraints
    levelCheck: check("stress_level_check", sql`${table.level} >= 1 AND ${table.level} <= 10`),
  })
);

// Feature Interactions - Stores discovered interaction effects between features
export const featureInteractionsTable = pgTable(
  "feature_interactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Interacting features
    featureA: text("feature_a").notNull(), // 'high_protein'
    featureB: text("feature_b").notNull(), // 'well_hydrated'
    targetOutcome: text("target_outcome").notNull(), // 'mood_score', 'energy_level'

    // Main effects
    effectA: decimal("effect_a", { precision: 8, scale: 5 }), // Effect of A alone
    effectB: decimal("effect_b", { precision: 8, scale: 5 }), // Effect of B alone
    effectAB: decimal("effect_ab", { precision: 8, scale: 5 }), // Combined effect when both present

    // Interaction effect (synergy or antagonism)
    interactionEffect: decimal("interaction_effect", { precision: 8, scale: 5 }).notNull(), // effectAB - (effectA + effectB)
    interactionType: text("interaction_type"), // 'synergistic', 'antagonistic', 'additive'

    // Statistical measures
    interactionPValue: decimal("interaction_p_value", { precision: 8, scale: 7 }),
    interactionConfidenceInterval: json("interaction_confidence_interval"), // {lower: 0.1, upper: 0.3}
    sampleSizeBothPresent: integer("sample_size_both_present"),
    sampleSizeTotal: integer("sample_size_total"),

    // Practical significance
    cohenD: decimal("cohen_d", { precision: 6, scale: 4 }), // Effect size
    isPracticallySignificant: boolean("is_practically_significant").default(false), // |d| > 0.2

    // Metadata
    lastComputedAt: timestamp("last_computed_at").defaultNow(),
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userFeaturesUniqueIdx: unique("feat_interaction_user_unique").on(table.userId, table.featureA, table.featureB, table.targetOutcome),
    userIdx: index("feat_interaction_user_idx").on(table.userId),
    outcomeIdx: index("feat_interaction_outcome_idx").on(table.targetOutcome),
    activeIdx: index("feat_interaction_active_idx").on(table.isActive),
    interactionTypeCheck: check("feat_interaction_type_check", sql`${table.interactionType} IS NULL OR ${table.interactionType} IN ('synergistic', 'antagonistic', 'additive')`),
  })
);

// ============================================================================
// PREDICTION LEARNING SYSTEM
// A closed-loop system that learns from each user individually
// ============================================================================

// Prediction Log - Every prediction we make (stored for outcome tracking)
export const predictionLogTable = pgTable(
  "prediction_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // What we predicted
    predictionType: text("prediction_type").notNull(), // 'energy_crash', 'mood_dip', 'dehydration', 'hunger'
    predictionSubtype: text("prediction_subtype"), // 'sugar_crash', 'low_protein', 'late_meal'

    // The specific prediction
    predictedOutcome: text("predicted_outcome").notNull(), // 'low_energy', 'mood_drop', 'fatigue'
    predictedSeverity: text("predicted_severity").notNull(), // 'high', 'medium', 'low'
    predictedTime: timestamp("predicted_time").notNull(), // When we expect the outcome
    predictionWindowMinutes: integer("prediction_window_minutes").default(60),

    // The cause (what triggered this prediction)
    triggerType: text("trigger_type").notNull(), // 'meal', 'hydration', 'sleep', 'pattern'
    triggerData: json("trigger_data").notNull(), // Full context

    // Our confidence at prediction time
    confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
    confidenceFactors: json("confidence_factors"),

    // Thresholds used (for learning later)
    thresholdsUsed: json("thresholds_used").notNull(),
    wasPersonalized: boolean("was_personalized").default(false),

    // User messaging
    userMessage: text("user_message").notNull(),
    preventionTip: text("prevention_tip"),

    // Outcome tracking
    checkInSentAt: timestamp("check_in_sent_at"),
    checkInMethod: text("check_in_method"), // 'push', 'in_app', 'none'
    outcomeStatus: text("outcome_status").default("pending"), // 'pending', 'confirmed', 'denied', 'skipped', 'expired'

    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    userStatusIdx: index("prediction_log_user_status_idx").on(table.userId, table.outcomeStatus),
    predictedTimeIdx: index("prediction_log_time_idx").on(table.predictedTime),
    typeIdx: index("prediction_log_type_idx").on(table.userId, table.predictionType),
  })
);

// Prediction Outcomes - User feedback on predictions
export const predictionOutcomesTable = pgTable(
  "prediction_outcomes",
  {
    id: serial("id").primaryKey(),
    predictionId: integer("prediction_id")
      .notNull()
      .references(() => predictionLogTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // User's actual experience
    actualOutcome: text("actual_outcome").notNull(), // 'as_predicted', 'opposite', 'no_effect', 'unsure'
    outcomeIntensity: integer("outcome_intensity"), // 1-5 scale

    // Timing accuracy
    timingAccuracy: text("timing_accuracy"), // 'early', 'on_time', 'late', 'no_outcome'
    actualTime: timestamp("actual_time"),

    // Optional context
    userNotes: text("user_notes"),
    contextFactors: json("context_factors"),

    // Helpfulness
    wasHelpful: boolean("was_helpful"),
    followedPreventionTip: boolean("followed_prevention_tip"),
    tipEffectiveness: text("tip_effectiveness"),

    // Feedback method
    feedbackMethod: text("feedback_method").notNull(), // 'quick_emoji', 'detailed_form', 'implicit'

    // Accuracy calculation
    predictionAccurate: boolean("prediction_accurate").notNull(),
    accuracyScore: decimal("accuracy_score", { precision: 3, scale: 2 }),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("prediction_outcomes_user_idx").on(table.userId),
    accurateIdx: index("prediction_outcomes_accurate_idx").on(table.userId, table.predictionAccurate),
  })
);

// User Thresholds - Personalized thresholds that evolve over time
export const userThresholdsTable = pgTable(
  "user_thresholds",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Threshold definition
    thresholdType: text("threshold_type").notNull(), // 'sugar_crash', 'protein_fatigue', 'hydration_warning'
    thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }).notNull(),
    thresholdUnit: text("threshold_unit").notNull(), // 'grams', 'percent', 'hours', 'liters'

    // Source
    source: text("source").notNull(), // 'default', 'population', 'personal_learning', 'manual'

    // Learning metrics
    predictionsMade: integer("predictions_made").default(0),
    predictionsCorrect: integer("predictions_correct").default(0),
    accuracyRate: decimal("accuracy_rate", { precision: 3, scale: 2 }),

    // Adjustment tracking
    initialValue: decimal("initial_value", { precision: 10, scale: 2 }).notNull(),
    adjustmentCount: integer("adjustment_count").default(0),
    lastAdjustmentAt: timestamp("last_adjustment_at"),
    adjustmentReason: text("adjustment_reason"),

    // Confidence
    confidenceLevel: text("confidence_level").default("low"), // 'low', 'medium', 'high', 'validated'
    minSamplesForAdjustment: integer("min_samples_for_adjustment").default(5),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userThresholdUnique: unique("user_threshold_unique").on(table.userId, table.thresholdType),
    userIdx: index("user_thresholds_user_idx").on(table.userId),
  })
);

// Prediction Stories - "Remember when" moments for user connection
export const predictionStoriesTable = pgTable(
  "prediction_stories",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Story content
    storyType: text("story_type").notNull(), // 'remember_when', 'pattern_discovered', 'milestone', 'learning'
    storyTitle: text("story_title").notNull(),
    storyBody: text("story_body").notNull(),
    storyEmoji: text("story_emoji"),

    // Related data
    relatedPredictionIds: json("related_prediction_ids"), // Array of prediction_log IDs
    relatedDates: json("related_dates"), // Array of dates
    patternData: json("pattern_data"),

    // Engagement
    shownCount: integer("shown_count").default(0),
    lastShownAt: timestamp("last_shown_at"),
    userAcknowledged: boolean("user_acknowledged").default(false),
    userReaction: text("user_reaction"), // 'helpful', 'already_knew', 'surprising', 'dismissed'

    // Freshness
    relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }).default("1.00"),
    expiresAt: timestamp("expires_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userTypeIdx: index("prediction_stories_user_type_idx").on(table.userId, table.storyType),
    shownIdx: index("prediction_stories_shown_idx").on(table.userId, table.lastShownAt),
  })
);

// Pending Check-ins - Queue for check-in notifications
export const pendingCheckInsTable = pgTable(
  "pending_check_ins",
  {
    id: serial("id").primaryKey(),
    predictionId: integer("prediction_id")
      .notNull()
      .references(() => predictionLogTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Scheduling
    scheduledFor: timestamp("scheduled_for").notNull(),
    windowEnd: timestamp("window_end").notNull(),

    // Notification content
    title: text("title").notNull(),
    body: text("body").notNull(),
    emoji: text("emoji"),
    actionButtons: json("action_buttons"), // [{label: "😴 Tired", value: "tired"}, ...]

    // Status
    status: text("status").default("pending"), // 'pending', 'sent', 'responded', 'expired', 'failed'
    sentAt: timestamp("sent_at"),
    respondedAt: timestamp("responded_at"),
    responseValue: text("response_value"),

    // Retry logic
    attemptCount: integer("attempt_count").default(0),
    lastAttemptAt: timestamp("last_attempt_at"),
    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userPendingIdx: index("pending_checkins_user_pending_idx").on(table.userId, table.status),
    scheduledIdx: index("pending_checkins_scheduled_idx").on(table.scheduledFor),
  })
);
