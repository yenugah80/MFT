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
  fats?: number;
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
  fats: number;

  // Detailed carbohydrates
  fiber?: number;
  sugar?: number;
  sugarAlcohols?: number;
  netCarbs?: number; // Calculated: carbs - fiber - sugarAlcohols
  sodium?: number; // Sodium in mg

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

  // Idempotency & tracking
  clientEventId?: string; // Unique client event ID for idempotent requests
  sourceMeta?: Record<string, any>; // Source-specific metadata (AI confidence, recipe URL, etc)
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
  fats: 0,
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
 * CRITICAL FIX: Added validation to catch type mismatches from API
 */
export function transformBackendToFoodLog(backendData: any): FoodLog {
  try {
    // Validate required fields exist
    if (!backendData || typeof backendData !== 'object') {
      console.error('[transformBackendToFoodLog] Invalid data: not an object', backendData);
      throw new Error('Invalid backend data: not an object');
    }

    // Validate macro fields are numbers (catch "150" string instead of 150)
    const calories = Number(backendData.calories || 0);
    const protein = Number(backendData.protein || 0);
    const carbs = Number(backendData.carbs || 0);
    const fat = Number(backendData.fats || backendData.fat || 0);

    if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat)) {
      console.error('[transformBackendToFoodLog] Invalid macros:', { calories, protein, carbs, fat });
      throw new Error('Invalid macro values: expected numbers');
    }

    // Validate arrays are actually arrays
    const micronutrients = Array.isArray(backendData.micronutrients) ? backendData.micronutrients : [];
    const ingredients = Array.isArray(backendData.ingredients) ? backendData.ingredients : [];
    const dietLabels = Array.isArray(backendData.dietLabels || backendData.diet_labels) ? (backendData.dietLabels || backendData.diet_labels) : [];
    const allergens = Array.isArray(backendData.allergens) ? backendData.allergens : [];

    // Validate micros is object
    const micros = (backendData.micros && typeof backendData.micros === 'object') ? backendData.micros : {};

    return {
      id: backendData.id,
      userId: backendData.userId || backendData.user_id,
      timestamp: backendData.loggedDate ? new Date(backendData.loggedDate).getTime() : Date.now(),
      source: (backendData.source as FoodLogSource) || 'text',
      status: 'synced',
      loggedDate: backendData.loggedDate ? new Date(backendData.loggedDate) : undefined,

      foodName: String(backendData.foodName || backendData.food_name || ''),
      cookingMethod: backendData.cookingMethod,
      servingSize: backendData.servingSize || backendData.serving_size,
      mealType: backendData.mealType || backendData.meal_type,

      calories,
      protein,
      carbs,
      fats: fat,

      fiber: typeof backendData.fiber === 'number' ? backendData.fiber : undefined,
      sugar: typeof backendData.sugar === 'number' ? backendData.sugar : undefined,
      sodium: typeof backendData.sodium === 'number' ? backendData.sodium : undefined,
      sugarAlcohols: typeof backendData.sugarAlcohols === 'number' ? backendData.sugarAlcohols : undefined,
      netCarbs: backendData.netCarbs || calculateNetCarbs(backendData),

      micronutrients,
      micros,

      ingredients,

      healthScore: Number(backendData.healthScore || 0),
      nutriscore: backendData.nutriscore,
      ecoscore: backendData.ecoscore,
      novaScore: backendData.novaScore || backendData.nova_score,

      dietLabels,
      allergens,
      barcode: backendData.barcode,
      imageUrl: backendData.imageUrl || backendData.image_url,

      createdAt: backendData.createdAt ? new Date(backendData.createdAt) : undefined,
      updatedAt: backendData.updatedAt ? new Date(backendData.updatedAt) : undefined,
    };
  } catch (error) {
    console.error('[transformBackendToFoodLog] Transformation failed:', error, backendData);
    // Throw error instead of silently failing with default values
    throw new Error(`Failed to transform backend data to FoodLog: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform FoodLog to backend payload
 * CRITICAL FIX: Added validation to ensure required fields are present and correct type
 */
export function transformFoodLogToBackend(log: FoodLog): any {
  try {
    // Validate required fields
    if (!log || typeof log !== 'object') {
      console.error('[transformFoodLogToBackend] Invalid log object:', log);
      throw new Error('Invalid FoodLog: not an object');
    }

    if (!log.foodName || typeof log.foodName !== 'string') {
      console.error('[transformFoodLogToBackend] Missing or invalid foodName:', log.foodName);
      throw new Error('Invalid FoodLog: foodName is required and must be a string');
    }

    // Validate macro fields
    const calories = Math.round(Number(log.calories || 0));
    const protein = Math.round(Number(log.protein || 0));
    const carbs = Math.round(Number(log.carbs || 0));
    const fat = Math.round(Number(log.fats || 0));

    if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat)) {
      console.error('[transformFoodLogToBackend] Invalid macros:', { calories, protein, carbs, fat });
      throw new Error('Invalid FoodLog: macros must be numbers');
    }

    // Validate arrays
    const dietLabels = Array.isArray(log.dietLabels) ? log.dietLabels : [];
    const allergens = Array.isArray(log.allergens) ? log.allergens : [];
    const ingredients = Array.isArray(log.ingredients) ? log.ingredients : [];

    const resolvedLoggedDate = log.loggedDate
      ? new Date(log.loggedDate).toISOString()
      : (log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString());

    // Validate fiber/sugar/sodium (new columns)
    const fiber = typeof log.fiber === 'number' && !isNaN(log.fiber) ? Math.round(log.fiber) : null;
    const sugar = typeof log.sugar === 'number' && !isNaN(log.sugar) ? Math.round(log.sugar) : null;
    const sodium = typeof log.sodium === 'number' && !isNaN(log.sodium) ? Math.round(log.sodium) : null;

    return {
      foodName: log.foodName,
      calories,
      protein,
      carbs,
      fats: fat,
      fiber, // NEW: include fiber
      sugar, // NEW: include sugar
      sodium, // NEW: include sodium
      servingSize: log.servingSize,
      mealType: log.mealType,
      micros: (log.micros && typeof log.micros === 'object') ? log.micros : {},
      nutriscore: log.nutriscore,
      ecoscore: log.ecoscore,
      novaScore: log.novaScore,
      dietLabels,
      allergens,
      ingredients,
      barcode: log.barcode,
      imageUrl: log.imageUrl,
      loggedDate: resolvedLoggedDate,
      source: log.source,
      clientEventId: log.clientEventId,  // CRITICAL FIX: Include for idempotency
      sourceMeta: log.sourceMeta || {},
    };
  } catch (error) {
    console.error('[transformFoodLogToBackend] Transformation failed:', error, log);
    // Throw error instead of silently failing
    throw new Error(`Failed to transform FoodLog to backend: ${error instanceof Error ? error.message : String(error)}`);
  }
}
