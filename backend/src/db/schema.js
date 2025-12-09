// Existing imports already include text, integer, timestamp, etc.
import { pgTable, serial, text, timestamp, integer, uniqueIndex, decimal, json } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
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
export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Clerk user id
  fullName: text("full_name"),
  email: text("email"),
  gender: text("gender"), // 'female' | 'male' | 'other'
  age: integer("age"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: integer("height_cm"),
  activityLevel: text("activity_level"), // 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dietary preferences table
export const dietaryPreferencesTable = pgTable("dietary_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  preferences: json("preferences").default([]), // Array of dietary preferences like ['Vegan', 'Gluten-free']
  allergies: json("allergies").default([]), // Array of allergies
  dislikes: json("dislikes").default([]), // Array of foods user dislikes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nutrition goals table
export const nutritionGoalsTable = pgTable("nutrition_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  primaryGoal: text("primary_goal"), // 'lose' | 'maintain' | 'gain'
  dailyCalories: integer("daily_calories"),
  proteinG: integer("protein_g"),
  carbsG: integer("carbs_g"),
  fatsG: integer("fats_g"),
  waterLiters: decimal("water_liters", { precision: 3, scale: 1 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gamification stats table
export const gamificationTable = pgTable("gamification", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  streak: integer("streak").default(0), // days
  badges: json("badges").default([]), // Array of unlocked achievement badges
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food log table - tracks individual food entries
export const foodLogTable = pgTable("food_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  foodName: text("food_name").notNull(),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fats: integer("fats"),
  servingSize: text("serving_size"),
  mealType: text("meal_type"), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  
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
});

// Recipes table - for parsed or saved recipes
export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Owner of the recipe
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
});

// Daily nutrition summary table
export const dailyNutritionSummaryTable = pgTable("daily_nutrition_summary", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: timestamp("date").notNull(),
  totalCalories: integer("total_calories").default(0),
  totalProtein: integer("total_protein").default(0),
  totalCarbs: integer("total_carbs").default(0),
  totalFats: integer("total_fats").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Water log table
export const waterLogTable = pgTable("water_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  amountLiters: decimal("amount_liters", { precision: 3, scale: 1 }).notNull(),
  loggedDate: timestamp("logged_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weight history table
export const weightHistoryTable = pgTable("weight_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }).notNull(),
  recordedDate: timestamp("recorded_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  userId: text("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User notifications table
export const userNotificationsTable = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type"), // 'achievement_unlock' | 'reminder' | 'goal_reached'
  title: text("title").notNull(),
  message: text("message"),
  read: text("read").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity Levels table - admin configuration
export const activityLevelsTable = pgTable("activity_levels", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., 'sedentary'
  label: text("label").notNull(), // e.g., 'Sedentary'
  desc: text("desc"), // e.g., 'Little or no exercise'
  factor: decimal("factor", { precision: 3, scale: 2 }).notNull(), // e.g., 1.2
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});