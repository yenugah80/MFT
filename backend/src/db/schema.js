// Existing imports already include text, integer, timestamp, etc.
import { pgTable, serial, text, timestamp, integer, uniqueIndex, decimal, json, boolean, index, check, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    recipeId: integer("recipe_id").notNull(),
    title: text("title").notNull(),
    image: text("image"),
    cookTime: text("cook_time"),
    servings: text("servings"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userRecipeUniqueIdx: uniqueIndex("favorites_user_recipe_unique_idx").on(
      table.userId,
      table.recipeId
    ),
  })
);

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
    notifications: json("notifications").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // CHECK constraints for data validation
    ageCheck: check("age_check", sql`${table.age} IS NULL OR (${table.age} >= 13 AND ${table.age} <= 120)`),
    weightCheck: check("weight_check", sql`${table.weightKg} IS NULL OR (${table.weightKg} > 20 AND ${table.weightKg} < 500)`),
    heightCheck: check("height_check", sql`${table.heightCm} IS NULL OR (${table.heightCm} > 50 AND ${table.heightCm} < 300)`),
    genderCheck: check("gender_check", sql`${table.gender} IS NULL OR ${table.gender} IN ('female', 'male', 'other')`),
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
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Dietary preferences table
export const dietaryPreferencesTable = pgTable("dietary_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  preferences: json("preferences").default([]), // Array of dietary preferences like ['Vegan', 'Gluten-free']
  allergies: json("allergies").default([]), // Array of allergies
  dislikes: json("dislikes").default([]), // Array of foods user dislikes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nutrition goals table
export const nutritionGoalsTable = pgTable(
  "nutrition_goals",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
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
      .unique()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    xp: integer("xp").default(0),
    level: integer("level").default(1),
    streak: integer("streak").default(0), // days
    // TEMPORARILY COMMENTED OUT - Production DB doesn't have this column yet
    // streakFreezes: integer("streak_freezes").default(0),
    // lastFreezeAwardedAt: timestamp("last_freeze_awarded_at"),
    badges: json("badges").default([]), // Array of unlocked achievement badges
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // CHECK constraints for gamification
    xpCheck: check("xp_check", sql`${table.xp} >= 0`),
    levelCheck: check("level_check", sql`${table.level} >= 1 AND ${table.level} <= 999`),
    streakCheck: check("streak_check", sql`${table.streak} >= 0`),
    // TEMPORARILY COMMENTED OUT - Production DB doesn't have this column yet
    // streakFreezesCheck: check("streak_freezes_check", sql`${table.streakFreezes} >= 0`),
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
    clientEventId: text("client_event_id"), // NULLABLE initially for backfill
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
    // Unique constraint for idempotency support
    userClientEventIdUnique: unique("food_log_user_id_client_event_id_unique").on(table.userId, table.clientEventId),
    caloriesCheck: check("food_calories_check", sql`${table.calories} IS NULL OR (${table.calories} >= 0 AND ${table.calories} <= 10000)`),
    proteinCheck: check("food_protein_check", sql`${table.protein} IS NULL OR (${table.protein} >= 0 AND ${table.protein} <= 500)`),
    carbsCheck: check("food_carbs_check", sql`${table.carbs} IS NULL OR (${table.carbs} >= 0 AND ${table.carbs} <= 1000)`),
    fatsCheck: check("food_fats_check", sql`${table.fats} IS NULL OR (${table.fats} >= 0 AND ${table.fats} <= 500)`),
    mealTypeCheck: check("meal_type_check", sql`${table.mealType} IS NULL OR ${table.mealType} IN ('breakfast', 'lunch', 'dinner', 'snack')`),
    nutriscoreCheck: check("nutriscore_check", sql`${table.nutriscore} IS NULL OR ${table.nutriscore} IN ('A', 'B', 'C', 'D', 'E')`),
    ecoscoreCheck: check("ecoscore_check", sql`${table.ecoscore} IS NULL OR ${table.ecoscore} IN ('A', 'B', 'C', 'D', 'E')`),
    novaScoreCheck: check("nova_score_check", sql`${table.novaScore} IS NULL OR (${table.novaScore} >= 1 AND ${table.novaScore} <= 4)`),
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

// Recipes table - for parsed or saved recipes
export const recipesTable = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    ingredients: json("ingredients").default([]), // [{name: "flour", amount: "1 cup"}]

    // Nutrition per serving
    calories: integer("calories"),
    protein: integer("protein"),
    carbs: integer("carbs"),
    fats: integer("fats"),

    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    servings: integer("servings").default(1),

    tags: json("tags").default([]), // ['vegan', 'gluten-free']
    imageUrl: text("image_url"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // CHECK constraints
    servingsCheck: check("servings_check", sql`${table.servings} >= 1 AND ${table.servings} <= 100`),
    prepTimeCheck: check("prep_time_check", sql`${table.prepTimeMinutes} IS NULL OR (${table.prepTimeMinutes} >= 0 AND ${table.prepTimeMinutes} <= 1440)`),
    cookTimeCheck: check("cook_time_check", sql`${table.cookTimeMinutes} IS NULL OR (${table.cookTimeMinutes} >= 0 AND ${table.cookTimeMinutes} <= 1440)`),
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
  icon: text("icon"), // emoji or icon identifier
  requiredPoints: integer("required_points"), // XP needed for this achievement
  category: text("category"), // 'consistency' | 'macro_master' | 'hydration' | 'streak' | 'xp_collector'
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
