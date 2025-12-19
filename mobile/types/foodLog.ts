/**
 * Canonical FoodLog Type Definition
 * Production-ready data model for all food logging operations
 */

export type FoodLogSource = 'text' | 'photo' | 'voice' | 'barcode';
export type FoodLogStatus = 'pending' | 'synced' | 'failed';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Ingredient with per-ingredient nutrition breakdown
 */
export interface FoodIngredient {
  name: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  icon?: string;
  imageUrl?: string;
}

/**
 * Micronutrient with daily value percentage
 */
export interface Micronutrient {
  name: string;
  amount: number;
  unit: string;
  percentageOfDailyNeeds?: number;
}

/**
 * Hydration data
 */
export interface Hydration {
  waterContent?: number; // in ml or grams
  electrolytes?: string[]; // e.g., ['Sodium', 'Potassium']
}

/**
 * Complete FoodLog Entry
 * Compatible with backend foodLogTable schema
 */
export interface FoodLog {
  // Core identification
  id?: number; // From database
  userId?: string;
  timestamp: number; // Client-side timestamp

  // Logging metadata
  source: FoodLogSource;
  status: FoodLogStatus;
  loggedDate?: Date;

  // Food identification
  foodName: string;
  cookingMethod?: string;
  servingSize?: string;
  mealType?: MealType;

  // Macronutrients (required)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;

  // Detailed carbohydrates
  fiber?: number;
  sugar?: number;
  sugarAlcohols?: number;
  netCarbs?: number; // Calculated: carbs - fiber - sugarAlcohols

  // Hydration
  hydration?: Hydration;

  // Micronutrients
  micronutrients: Micronutrient[];
  micros?: Record<string, number>; // Numeric only for aggregation: { vitaminC_mg: 45, iron_mg: 3.1 }

  // Ingredients with breakdown
  ingredients: FoodIngredient[];

  // Scores and ratings
  healthScore: number; // 0-100
  nutriscore?: string; // A, B, C, D, E
  ecoscore?: string; // A, B, C, D, E
  novaScore?: number; // 1-4

  // Additional metadata
  dietLabels?: string[]; // ['Vegan', 'Keto', 'Low-Carb']
  allergens?: string[]; // ['Peanuts', 'Gluten']
  barcode?: string;
  imageUrl?: string; // Photo if uploaded

  // Sync metadata
  createdAt?: Date;
  updatedAt?: Date;
  syncError?: string; // Error message if sync failed
}

/**
 * Default empty FoodLog for initialization
 */
export const emptyFoodLog: Omit<FoodLog, 'source'> = {
  timestamp: Date.now(),
  status: 'pending',
  foodName: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  micronutrients: [],
  ingredients: [],
  healthScore: 0,
};

/**
 * Helper to calculate net carbs
 */
export function calculateNetCarbs(log: Partial<FoodLog>): number {
  const { carbs = 0, fiber = 0, sugarAlcohols = 0 } = log;
  return Math.max(0, carbs - fiber - sugarAlcohols);
}

/**
 * Helper to validate FoodLog before saving
 */
export function validateFoodLog(log: Partial<FoodLog>): string | null {
  if (!log.foodName || log.foodName.trim().length === 0) {
    return 'Food name is required';
  }
  if (typeof log.calories !== 'number' || log.calories < 0) {
    return 'Calories must be a positive number';
  }
  if (!log.source) {
    return 'Source must be specified';
  }
  if (!log.clientEventId || typeof log.clientEventId !== 'string') {
    return 'clientEventId is required for sync';
  }
  return null; // Valid
}

/**
 * Transform backend response to FoodLog
 */
export function transformBackendToFoodLog(backendData: any): FoodLog {
  return {
    id: backendData.id,
    userId: backendData.userId || backendData.user_id,
    timestamp: backendData.loggedDate ? new Date(backendData.loggedDate).getTime() : Date.now(),
    source: (backendData.source as FoodLogSource) || 'text',
    status: 'synced',
    loggedDate: backendData.loggedDate ? new Date(backendData.loggedDate) : undefined,

    foodName: backendData.foodName || backendData.food_name || '',
    cookingMethod: backendData.cookingMethod,
    servingSize: backendData.servingSize || backendData.serving_size,
    mealType: backendData.mealType || backendData.meal_type,

    calories: backendData.calories || 0,
    protein: backendData.protein || 0,
    carbs: backendData.carbs || 0,
    fat: backendData.fats || backendData.fat || 0,

    fiber: backendData.fiber,
    sugar: backendData.sugar,
    sugarAlcohols: backendData.sugarAlcohols,
    netCarbs: backendData.netCarbs || calculateNetCarbs(backendData),

    micronutrients: backendData.micronutrients || [],
    micros: backendData.micros || {},

    ingredients: backendData.ingredients || [],

    healthScore: backendData.healthScore || 0,
    nutriscore: backendData.nutriscore,
    ecoscore: backendData.ecoscore,
    novaScore: backendData.novaScore || backendData.nova_score,

    dietLabels: backendData.dietLabels || backendData.diet_labels || [],
    allergens: backendData.allergens || [],
    barcode: backendData.barcode,
    imageUrl: backendData.imageUrl || backendData.image_url,

    createdAt: backendData.createdAt ? new Date(backendData.createdAt) : undefined,
    updatedAt: backendData.updatedAt ? new Date(backendData.updatedAt) : undefined,
  };
}

/**
 * Transform FoodLog to backend payload
 */
export function transformFoodLogToBackend(log: FoodLog): any {
  return {
    foodName: log.foodName,
    calories: Math.round(log.calories),
    protein: Math.round(log.protein),
    carbs: Math.round(log.carbs),
    fats: Math.round(log.fat),
    servingSize: log.servingSize,
    mealType: log.mealType,
    micros: log.micros || {},
    nutriscore: log.nutriscore,
    ecoscore: log.ecoscore,
    novaScore: log.novaScore,
    dietLabels: log.dietLabels || [],
    allergens: log.allergens || [],
    ingredients: log.ingredients || [],
    barcode: log.barcode,
    imageUrl: log.imageUrl,
    loggedDate: log.loggedDate || new Date(),
    source: log.source,
    clientEventId: log.clientEventId,  // CRITICAL FIX: Include for idempotency
    sourceMeta: log.sourceMeta || {},
  };
}
