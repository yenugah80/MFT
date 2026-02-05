/**
 * Smart Recommendation Engine
 *
 * World-class, production-grade food recommendation system that provides:
 * 1. Real-time nutritional gap detection
 * 2. Time-contextual meal suggestions
 * 3. Personal history-based learning
 * 4. Rich explanations with actual data
 * 5. Quick-log ready recommendations
 *
 * Inspired by Netflix/Spotify recommendation systems but adapted for nutrition.
 */

import { db } from '../db/index.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  activityLogTable,
  profilesTable,
  recommendationsHistoryTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql, inArray } from 'drizzle-orm';

// ============================================
// NUTRITIONAL KNOWLEDGE BASE
// ============================================

const DAILY_VALUES = {
  calories: 2000,
  protein: 50,    // grams
  carbs: 300,     // grams
  fat: 65,        // grams
  fiber: 25,      // grams
  sugar: 50,      // grams (limit)
  sodium: 2300,   // mg (limit)
  // Micronutrients
  vitaminA: 900,  // mcg
  vitaminC: 90,   // mg
  vitaminD: 20,   // mcg
  vitaminB12: 2.4, // mcg
  calcium: 1000,  // mg
  iron: 18,       // mg
  magnesium: 400, // mg
  potassium: 4700, // mg
  zinc: 11,       // mg
};

// Smart food database with rich nutritional data
const SMART_FOODS = [
  // HIGH PROTEIN OPTIONS
  {
    id: 'grilled_chicken_breast',
    name: 'Grilled Chicken Breast',
    category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    micros: { vitaminB12: 0.3, iron: 1, zinc: 1, magnesium: 25 },
    tags: ['high-protein', 'low-carb', 'lean', 'muscle-building'],
    prepTime: 15,
    difficulty: 'easy',
    satiety: 9, // 1-10 how filling
    energyImpact: 'sustained', // 'quick', 'sustained', 'slow'
  },
  {
    id: 'greek_yogurt',
    name: 'Greek Yogurt with Berries',
    category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 150, protein: 15, carbs: 12, fat: 4, fiber: 2 },
    micros: { calcium: 150, vitaminB12: 1.3, potassium: 240 },
    tags: ['high-protein', 'probiotic', 'quick', 'calcium-rich'],
    prepTime: 2,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'sustained',
  },
  {
    id: 'eggs_scrambled',
    name: 'Scrambled Eggs (2 large)',
    category: 'protein',
    mealTypes: ['breakfast', 'lunch'],
    nutrition: { calories: 180, protein: 12, carbs: 2, fat: 14, fiber: 0 },
    micros: { vitaminB12: 1.1, vitaminD: 2, iron: 1.8, zinc: 1.3 },
    tags: ['high-protein', 'quick', 'versatile', 'brain-food'],
    prepTime: 5,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'sustained',
  },
  {
    id: 'salmon_fillet',
    name: 'Baked Salmon Fillet',
    category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 280, protein: 35, carbs: 0, fat: 15, fiber: 0 },
    micros: { vitaminD: 15, vitaminB12: 4.8, potassium: 500, magnesium: 30 },
    tags: ['high-protein', 'omega-3', 'heart-healthy', 'brain-food'],
    prepTime: 20,
    difficulty: 'medium',
    satiety: 9,
    energyImpact: 'sustained',
    moodBoost: true,
  },
  {
    id: 'cottage_cheese',
    name: 'Cottage Cheese',
    category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 110, protein: 14, carbs: 5, fat: 4, fiber: 0 },
    micros: { calcium: 100, vitaminB12: 0.9, potassium: 140 },
    tags: ['high-protein', 'low-calorie', 'calcium-rich'],
    prepTime: 1,
    difficulty: 'easy',
    satiety: 6,
    energyImpact: 'sustained',
  },

  // COMPLEX CARBS
  {
    id: 'oatmeal_banana',
    name: 'Oatmeal with Banana',
    category: 'carbs',
    mealTypes: ['breakfast'],
    nutrition: { calories: 250, protein: 8, carbs: 45, fat: 5, fiber: 6 },
    micros: { iron: 2, magnesium: 50, potassium: 400, zinc: 1.5 },
    tags: ['fiber-rich', 'heart-healthy', 'energy-boost', 'filling'],
    prepTime: 5,
    difficulty: 'easy',
    satiety: 8,
    energyImpact: 'slow',
  },
  {
    id: 'quinoa_bowl',
    name: 'Quinoa Bowl with Vegetables',
    category: 'carbs',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 280, protein: 10, carbs: 40, fat: 8, fiber: 5 },
    micros: { iron: 3, magnesium: 80, potassium: 350, zinc: 2 },
    tags: ['complete-protein', 'fiber-rich', 'plant-based'],
    prepTime: 20,
    difficulty: 'medium',
    satiety: 8,
    energyImpact: 'slow',
  },
  {
    id: 'sweet_potato',
    name: 'Baked Sweet Potato',
    category: 'carbs',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 115, protein: 2, carbs: 27, fat: 0, fiber: 4 },
    micros: { vitaminA: 1000, vitaminC: 20, potassium: 450, magnesium: 30 },
    tags: ['fiber-rich', 'vitamin-a', 'low-fat', 'filling'],
    prepTime: 45,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'slow',
  },
  {
    id: 'brown_rice',
    name: 'Brown Rice (1 cup cooked)',
    category: 'carbs',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 3.5 },
    micros: { magnesium: 85, potassium: 85, zinc: 1.2 },
    tags: ['whole-grain', 'fiber-rich', 'filling'],
    prepTime: 30,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'slow',
  },

  // VEGETABLES
  {
    id: 'mixed_salad',
    name: 'Large Mixed Green Salad',
    category: 'vegetables',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 80, protein: 3, carbs: 10, fat: 3, fiber: 4 },
    micros: { vitaminA: 200, vitaminC: 30, vitaminK: 80, potassium: 300 },
    tags: ['low-calorie', 'fiber-rich', 'hydrating', 'vitamin-rich'],
    prepTime: 10,
    difficulty: 'easy',
    satiety: 5,
    energyImpact: 'quick',
  },
  {
    id: 'steamed_broccoli',
    name: 'Steamed Broccoli',
    category: 'vegetables',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 55, protein: 4, carbs: 11, fat: 0.5, fiber: 5 },
    micros: { vitaminC: 135, vitaminK: 180, calcium: 50, potassium: 300 },
    tags: ['low-calorie', 'fiber-rich', 'vitamin-c', 'anti-inflammatory'],
    prepTime: 8,
    difficulty: 'easy',
    satiety: 5,
    energyImpact: 'quick',
  },
  {
    id: 'spinach_sauteed',
    name: 'Sautéed Spinach with Garlic',
    category: 'vegetables',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 50, protein: 3, carbs: 4, fat: 3, fiber: 2 },
    micros: { vitaminA: 400, vitaminC: 15, iron: 3.5, magnesium: 80, calcium: 120 },
    tags: ['iron-rich', 'low-calorie', 'quick', 'nutrient-dense'],
    prepTime: 5,
    difficulty: 'easy',
    satiety: 4,
    energyImpact: 'quick',
  },

  // HEALTHY FATS
  {
    id: 'avocado_toast',
    name: 'Avocado Toast (whole grain)',
    category: 'fats',
    mealTypes: ['breakfast', 'lunch', 'snack'],
    nutrition: { calories: 280, protein: 7, carbs: 25, fat: 18, fiber: 8 },
    micros: { potassium: 500, vitaminE: 3, magnesium: 40, vitaminC: 10 },
    tags: ['healthy-fats', 'fiber-rich', 'heart-healthy', 'trendy'],
    prepTime: 5,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'sustained',
  },
  {
    id: 'almonds_handful',
    name: 'Handful of Almonds (23 nuts)',
    category: 'fats',
    mealTypes: ['snack'],
    nutrition: { calories: 165, protein: 6, carbs: 6, fat: 14, fiber: 3.5 },
    micros: { vitaminE: 7.5, magnesium: 75, calcium: 75 },
    tags: ['healthy-fats', 'portable', 'heart-healthy', 'satisfying'],
    prepTime: 0,
    difficulty: 'easy',
    satiety: 6,
    energyImpact: 'sustained',
  },
  {
    id: 'hummus_veggies',
    name: 'Hummus with Veggie Sticks',
    category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 180, protein: 6, carbs: 18, fat: 10, fiber: 5 },
    micros: { iron: 2, potassium: 250, vitaminC: 15 },
    tags: ['plant-based', 'fiber-rich', 'satisfying', 'mediterranean'],
    prepTime: 2,
    difficulty: 'easy',
    satiety: 6,
    energyImpact: 'sustained',
  },

  // HYDRATING FOODS
  {
    id: 'watermelon',
    name: 'Fresh Watermelon (2 cups)',
    category: 'fruit',
    mealTypes: ['snack', 'breakfast'],
    nutrition: { calories: 90, protein: 2, carbs: 22, fat: 0, fiber: 1 },
    micros: { vitaminC: 20, vitaminA: 45, potassium: 270 },
    tags: ['hydrating', 'low-calorie', 'refreshing', 'summer'],
    prepTime: 3,
    difficulty: 'easy',
    satiety: 4,
    energyImpact: 'quick',
    hydrating: true,
  },
  {
    id: 'cucumber_slices',
    name: 'Cucumber Slices',
    category: 'vegetables',
    mealTypes: ['snack'],
    nutrition: { calories: 15, protein: 1, carbs: 3, fat: 0, fiber: 0.5 },
    micros: { vitaminK: 15, potassium: 150 },
    tags: ['hydrating', 'low-calorie', 'refreshing', 'crispy'],
    prepTime: 2,
    difficulty: 'easy',
    satiety: 2,
    energyImpact: 'quick',
    hydrating: true,
  },

  // ENERGY BOOSTERS
  {
    id: 'banana',
    name: 'Banana',
    category: 'fruit',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
    micros: { potassium: 420, vitaminB6: 0.4, magnesium: 32 },
    tags: ['quick-energy', 'portable', 'pre-workout', 'potassium-rich'],
    prepTime: 0,
    difficulty: 'easy',
    satiety: 5,
    energyImpact: 'quick',
  },
  {
    id: 'apple_peanut_butter',
    name: 'Apple with Peanut Butter',
    category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 270, protein: 7, carbs: 30, fat: 16, fiber: 5 },
    micros: { vitaminE: 2, magnesium: 50, potassium: 350 },
    tags: ['balanced', 'satisfying', 'fiber-rich', 'protein-boost'],
    prepTime: 2,
    difficulty: 'easy',
    satiety: 7,
    energyImpact: 'sustained',
  },

  // MOOD BOOSTERS (high in nutrients that support mood)
  {
    id: 'dark_chocolate',
    name: 'Dark Chocolate (1 oz, 70%+)',
    category: 'treat',
    mealTypes: ['snack'],
    nutrition: { calories: 170, protein: 2, carbs: 13, fat: 12, fiber: 3 },
    micros: { iron: 3.4, magnesium: 65, zinc: 1 },
    tags: ['mood-boost', 'antioxidant', 'treat', 'satisfying'],
    prepTime: 0,
    difficulty: 'easy',
    satiety: 4,
    energyImpact: 'quick',
    moodBoost: true,
  },
  {
    id: 'berries_mixed',
    name: 'Mixed Berries (1 cup)',
    category: 'fruit',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 70, protein: 1, carbs: 17, fat: 0.5, fiber: 4 },
    micros: { vitaminC: 50, vitaminK: 20 },
    tags: ['antioxidant', 'low-calorie', 'brain-food', 'refreshing'],
    prepTime: 1,
    difficulty: 'easy',
    satiety: 4,
    energyImpact: 'quick',
    moodBoost: true,
  },

  // COMPLETE MEALS
  {
    id: 'chicken_rice_veggies',
    name: 'Chicken, Rice & Vegetables',
    category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 450, protein: 35, carbs: 45, fat: 12, fiber: 5 },
    micros: { vitaminA: 150, vitaminC: 30, iron: 3, zinc: 3, potassium: 500 },
    tags: ['balanced', 'complete-meal', 'muscle-building', 'filling'],
    prepTime: 30,
    difficulty: 'medium',
    satiety: 9,
    energyImpact: 'sustained',
  },
  {
    id: 'stir_fry_tofu',
    name: 'Tofu Vegetable Stir Fry',
    category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 350, protein: 20, carbs: 30, fat: 15, fiber: 6 },
    micros: { calcium: 200, iron: 4, vitaminC: 40, potassium: 400 },
    tags: ['plant-based', 'balanced', 'quick', 'asian-inspired'],
    prepTime: 20,
    difficulty: 'medium',
    satiety: 7,
    energyImpact: 'sustained',
  },
  {
    id: 'mediterranean_bowl',
    name: 'Mediterranean Bowl',
    category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 480, protein: 18, carbs: 50, fat: 22, fiber: 8 },
    micros: { vitaminA: 200, vitaminC: 35, iron: 3, calcium: 100, potassium: 450 },
    tags: ['balanced', 'heart-healthy', 'fiber-rich', 'mediterranean'],
    prepTime: 15,
    difficulty: 'medium',
    satiety: 8,
    energyImpact: 'sustained',
    moodBoost: true,
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get current meal type based on time
 */
function getCurrentMealType(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 12) return 'snack';
  if (hour >= 12 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack'; // late night
}

/**
 * Calculate nutritional gaps for today
 */
async function calculateNutritionalGaps(userId, goals) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's food logs
  const todayLogs = await db
    .select()
    .from(foodLogTable)
    .where(
      and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, today)
      )
    );

  // Sum up today's nutrition
  const consumed = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  todayLogs.forEach(log => {
    consumed.calories += parseFloat(log.calories) || 0;
    consumed.protein += parseFloat(log.protein) || 0;
    consumed.carbs += parseFloat(log.carbs) || 0;
    consumed.fat += parseFloat(log.fat) || 0;
    consumed.fiber += parseFloat(log.fiber) || 0;
  });

  // Calculate goals (from user profile or defaults)
  const dailyGoals = {
    calories: goals?.dailyCalories || DAILY_VALUES.calories,
    protein: goals?.proteinG || DAILY_VALUES.protein,
    carbs: goals?.carbsG || DAILY_VALUES.carbs,
    fat: goals?.fatG || DAILY_VALUES.fat,
    fiber: DAILY_VALUES.fiber,
  };

  // Calculate remaining and percentages
  const gaps = {};
  for (const [nutrient, goal] of Object.entries(dailyGoals)) {
    const remaining = Math.max(0, goal - consumed[nutrient]);
    const percentConsumed = Math.round((consumed[nutrient] / goal) * 100);
    const percentRemaining = Math.max(0, 100 - percentConsumed);

    gaps[nutrient] = {
      goal,
      consumed: Math.round(consumed[nutrient]),
      remaining: Math.round(remaining),
      percentConsumed,
      percentRemaining,
      status: percentConsumed >= 100 ? 'complete' :
              percentConsumed >= 75 ? 'on-track' :
              percentConsumed >= 50 ? 'moderate' : 'low',
    };
  }

  // Identify priority nutrients (what they need most)
  const priorities = Object.entries(gaps)
    .filter(([_, data]) => data.status !== 'complete')
    .sort((a, b) => a[1].percentConsumed - b[1].percentConsumed)
    .map(([nutrient, _]) => nutrient);

  return {
    gaps,
    priorities,
    mealsLogged: todayLogs.length,
    totalCaloriesConsumed: consumed.calories,
  };
}

/**
 * Get user's food history and preferences
 */
async function getUserFoodHistory(userId, days = 14) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await db
    .select({
      foodName: foodLogTable.foodName,
      calories: foodLogTable.calories,
      protein: foodLogTable.protein,
      loggedAt: foodLogTable.loggedAt,
      mealType: foodLogTable.mealType,
    })
    .from(foodLogTable)
    .where(
      and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, startDate)
      )
    )
    .orderBy(desc(foodLogTable.loggedAt))
    .limit(100);

  // Count food frequencies
  const foodCounts = {};
  history.forEach(log => {
    const name = log.foodName?.toLowerCase() || '';
    if (name) {
      foodCounts[name] = (foodCounts[name] || 0) + 1;
    }
  });

  // Get favorites (eaten 3+ times)
  const favorites = Object.entries(foodCounts)
    .filter(([_, count]) => count >= 3)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Get recently eaten (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentFoods = history
    .filter(log => new Date(log.loggedAt) >= threeDaysAgo)
    .map(log => log.foodName?.toLowerCase());

  return {
    favorites,
    recentFoods: [...new Set(recentFoods)],
    totalLogsAnalyzed: history.length,
  };
}

/**
 * Get user's mood patterns with food
 */
async function getMoodFoodCorrelations(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get mood logs with dates
  const moodLogs = await db
    .select()
    .from(moodLogTable)
    .where(
      and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedAt, thirtyDaysAgo)
      )
    );

  // Get food logs with dates
  const foodLogs = await db
    .select()
    .from(foodLogTable)
    .where(
      and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, thirtyDaysAgo)
      )
    );

  // Simple correlation: group by day and find patterns
  const dayData = {};

  foodLogs.forEach(log => {
    const day = new Date(log.loggedAt).toISOString().split('T')[0];
    if (!dayData[day]) dayData[day] = { foods: [], avgMood: null };
    dayData[day].foods.push(log.foodName?.toLowerCase());
  });

  moodLogs.forEach(log => {
    const day = new Date(log.loggedAt).toISOString().split('T')[0];
    if (!dayData[day]) dayData[day] = { foods: [], avgMood: null };
    const intensity = parseFloat(log.intensity) || 5;
    dayData[day].avgMood = dayData[day].avgMood
      ? (dayData[day].avgMood + intensity) / 2
      : intensity;
  });

  // Find foods associated with good mood days (7+)
  const goodMoodFoods = [];
  const badMoodFoods = [];

  Object.values(dayData).forEach(({ foods, avgMood }) => {
    if (avgMood === null) return;
    foods.forEach(food => {
      if (avgMood >= 7) goodMoodFoods.push(food);
      if (avgMood <= 4) badMoodFoods.push(food);
    });
  });

  // Count and find patterns
  const goodFoodCounts = {};
  goodMoodFoods.forEach(f => { goodFoodCounts[f] = (goodFoodCounts[f] || 0) + 1; });

  const moodBoosters = Object.entries(goodFoodCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([food, _]) => food);

  return { moodBoosters };
}

/**
 * Score and rank foods based on context
 */
function scoreFood(food, context) {
  let score = 50; // Base score
  const reasons = [];

  const { gaps, mealType, history, goals, currentMood, activityLevel } = context;

  // 1. Nutritional gap filling (most important)
  if (gaps.protein.status === 'low' && food.nutrition.protein >= 15) {
    score += 25;
    reasons.push({
      type: 'gap',
      nutrient: 'protein',
      impact: `+${food.nutrition.protein}g protein (${gaps.protein.remaining}g needed)`,
      priority: 'high',
    });
  }

  if (gaps.fiber.status === 'low' && food.nutrition.fiber >= 4) {
    score += 15;
    reasons.push({
      type: 'gap',
      nutrient: 'fiber',
      impact: `+${food.nutrition.fiber}g fiber`,
      priority: 'medium',
    });
  }

  // 2. Calorie budget fit
  const caloriesBudget = gaps.calories.remaining;
  if (food.nutrition.calories <= caloriesBudget) {
    score += 10;
    reasons.push({
      type: 'budget',
      impact: `Fits your ${caloriesBudget} cal remaining`,
      priority: 'medium',
    });
  } else if (food.nutrition.calories > caloriesBudget + 100) {
    score -= 20;
  }

  // 3. Meal type appropriateness
  if (food.mealTypes.includes(mealType)) {
    score += 10;
    reasons.push({
      type: 'timing',
      impact: `Perfect for ${mealType}`,
      priority: 'low',
    });
  } else {
    score -= 10;
  }

  // 4. Not recently eaten (variety)
  const foodNameLower = food.name.toLowerCase();
  if (history.recentFoods.some(f => foodNameLower.includes(f) || f.includes(foodNameLower))) {
    score -= 15; // Reduce score for recently eaten
  }

  // 5. Is a favorite (personalization)
  if (history.favorites.some(f => foodNameLower.includes(f.name))) {
    score += 10;
    reasons.push({
      type: 'preference',
      impact: 'One of your favorites',
      priority: 'low',
    });
  }

  // 6. Mood-appropriate
  if (currentMood && currentMood <= 5 && food.moodBoost) {
    score += 15;
    reasons.push({
      type: 'mood',
      impact: 'Known mood booster',
      priority: 'medium',
    });
  }

  // 7. Activity-appropriate
  if (activityLevel === 'high' && food.tags.includes('high-protein')) {
    score += 10;
    reasons.push({
      type: 'activity',
      impact: 'Great for recovery',
      priority: 'medium',
    });
  }

  // 8. Satiety for remaining meals
  const hour = new Date().getHours();
  if (hour < 14 && food.satiety >= 7) {
    score += 5; // Prefer filling foods earlier in day
  }

  // 9. Prep time consideration
  if (food.prepTime <= 5) {
    score += 5;
    reasons.push({
      type: 'convenience',
      impact: 'Quick to prepare',
      priority: 'low',
    });
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/**
 * Generate smart recommendations
 */
export async function getSmartRecommendations(userId, options = {}) {
  const { limit = 5, mealType: forcedMealType } = options;

  // 1. Get user profile and goals
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId))
    .limit(1);

  const goals = {
    dailyCalories: profile?.dailyCalorieGoal || 2000,
    proteinG: profile?.proteinGoal || 50,
    carbsG: profile?.carbsGoal || 300,
    fatG: profile?.fatGoal || 65,
  };

  // 2. Calculate nutritional gaps
  const gapsData = await calculateNutritionalGaps(userId, goals);

  // 3. Get user history
  const history = await getUserFoodHistory(userId);

  // 4. Get mood-food correlations
  const correlations = await getMoodFoodCorrelations(userId);

  // 5. Determine current context
  const currentHour = new Date().getHours();
  const mealType = forcedMealType || getCurrentMealType(currentHour);

  // Get recent mood if available
  const [recentMood] = await db
    .select()
    .from(moodLogTable)
    .where(eq(moodLogTable.userId, userId))
    .orderBy(desc(moodLogTable.loggedAt))
    .limit(1);

  // Get recent activity
  const [recentActivity] = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, userId))
    .orderBy(desc(activityLogTable.loggedAt))
    .limit(1);

  const context = {
    gaps: gapsData.gaps,
    mealType,
    history,
    goals,
    currentMood: recentMood?.intensity ? parseFloat(recentMood.intensity) : null,
    activityLevel: recentActivity?.intensity || 'moderate',
    correlations,
  };

  // 6. Score all foods
  const scoredFoods = SMART_FOODS.map(food => {
    const { score, reasons } = scoreFood(food, context);
    return { ...food, score, reasons };
  });

  // 7. Sort by score and take top N
  const topFoods = scoredFoods
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // 8. Build rich recommendations
  const recommendations = topFoods.map((food, index) => {
    // Build explanation
    const primaryReason = food.reasons.find(r => r.priority === 'high')
      || food.reasons.find(r => r.priority === 'medium')
      || food.reasons[0];

    const explanation = buildExplanation(food, context, primaryReason);

    return {
      id: food.id,
      rank: index + 1,
      name: food.name,
      score: food.score,
      category: food.category,
      nutrition: food.nutrition,
      micros: food.micros,
      tags: food.tags,
      prepTime: food.prepTime,
      difficulty: food.difficulty,
      mealType,

      // Rich explanation
      explanation,
      primaryReason: primaryReason?.impact || 'Great choice for you',
      allReasons: food.reasons,

      // Quick-log ready data
      quickLog: {
        foodName: food.name,
        calories: food.nutrition.calories,
        protein: food.nutrition.protein,
        carbs: food.nutrition.carbs,
        fat: food.nutrition.fat,
        fiber: food.nutrition.fiber,
        mealType,
      },
    };
  });

  // 9. Build summary
  const summary = buildSummary(gapsData, mealType, recommendations);

  return {
    success: true,
    mealType,
    currentHour,
    recommendations,
    summary,
    nutritionalStatus: gapsData,
    userContext: {
      mealsLoggedToday: gapsData.mealsLogged,
      caloriesConsumed: gapsData.totalCaloriesConsumed,
      caloriesRemaining: gapsData.gaps.calories.remaining,
      topPriorities: gapsData.priorities.slice(0, 2),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      foodsAnalyzed: SMART_FOODS.length,
      historyDays: 14,
    },
  };
}

/**
 * Build human-readable explanation
 */
function buildExplanation(food, context, primaryReason) {
  const { gaps } = context;
  const parts = [];

  // Primary nutritional benefit
  if (gaps.protein.status === 'low' && food.nutrition.protein >= 10) {
    parts.push(`Provides ${food.nutrition.protein}g protein — you need ${gaps.protein.remaining}g more today`);
  } else if (gaps.calories.remaining > 0) {
    const percentOfRemaining = Math.round((food.nutrition.calories / gaps.calories.remaining) * 100);
    if (percentOfRemaining <= 50) {
      parts.push(`${food.nutrition.calories} cal — leaves room for more meals`);
    } else {
      parts.push(`${food.nutrition.calories} cal — satisfying ${context.mealType}`);
    }
  }

  // Secondary benefits
  if (food.tags.includes('fiber-rich')) {
    parts.push('Good fiber source');
  }
  if (food.moodBoost) {
    parts.push('Known to support mood');
  }
  if (food.hydrating) {
    parts.push('Helps with hydration');
  }
  if (food.satiety >= 8) {
    parts.push('Very filling');
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'Great choice for your goals.';
}

/**
 * Build summary message
 */
function buildSummary(gapsData, mealType, recommendations) {
  const { gaps, priorities } = gapsData;

  // Determine key message
  let headline = '';
  let subtext = '';

  if (priorities.includes('protein')) {
    headline = `Focus on protein for ${mealType}`;
    subtext = `You're ${gaps.protein.percentRemaining}% short on protein. These options will help.`;
  } else if (priorities.includes('fiber')) {
    headline = `Add some fiber`;
    subtext = `You've only hit ${gaps.fiber.percentConsumed}% of your fiber goal.`;
  } else if (gaps.calories.percentConsumed >= 90) {
    headline = `Almost at your calorie goal`;
    subtext = `Just ${gaps.calories.remaining} calories left. Choose wisely.`;
  } else {
    headline = `Smart picks for ${mealType}`;
    subtext = `Based on your goals and what you've eaten today.`;
  }

  return {
    headline,
    subtext,
    priorities: priorities.slice(0, 2),
    status: {
      calories: `${gaps.calories.consumed}/${gaps.calories.goal} cal`,
      protein: `${gaps.protein.consumed}/${gaps.protein.goal}g protein`,
    },
  };
}

export default {
  getSmartRecommendations,
  calculateNutritionalGaps,
  getUserFoodHistory,
  SMART_FOODS,
  getCurrentMealType,
};
