/**
 * TypeScript type definitions for API responses
 */

// ============================================================================
// Profile Types
// ============================================================================

export interface Profile {
  id: number;
  userId: string;
  fullName: string | null;
  email: string | null;
  gender: 'female' | 'male' | 'other' | null;
  age: number | null;
  weightKg: string | null; // Decimal stored as string
  heightCm: number | null;
  activityLevel: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Nutrition Types
// ============================================================================

export interface NutritionGoals {
  id: number;
  userId: string;
  primaryGoal: 'lose' | 'maintain' | 'gain' | null;
  dailyCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  waterLiters: string | null; // Decimal stored as string
  createdAt: string;
  updatedAt: string;
}

/**
 * Micronutrient value with unit
 */
export interface MicronutrientValue {
  value: number;
  unit: string;
}

export interface FoodLog {
  id: number;
  userId: string;
  foodName: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  servingSize: string | null;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  micros: Record<string, MicronutrientValue>;
  nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  ecoscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novaScore: 1 | 2 | 3 | 4 | null;
  dietLabels: string[];
  allergens: string[];
  ingredients: Ingredient[];
  barcode: string | null;
  imageUrl: string | null;
  loggedDate: string;
  createdAt: string;
}

export interface Ingredient {
  name: string;
  amount?: string;
  portion?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isMainIngredient?: boolean;
}

export interface DailyNutritionSummary {
  id: number;
  userId: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  hydrationCelebratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Water & Weight Types
// ============================================================================

export interface WaterLog {
  id: number;
  userId: string;
  amountLiters: string; // Decimal stored as string
  beverageType?: string | null;
  hydrationFactor?: string | null;
  hydrationLiters?: string | null;
  loggedDate: string;
  createdAt: string;
}

export interface WeightHistory {
  id: number;
  userId: string;
  weightKg: string; // Decimal stored as string
  recordedDate: string;
  createdAt: string;
}

// ============================================================================
// Mood Types
// ============================================================================

export interface MoodLog {
  id: number;
  userId: string;
  mood: string;
  note: string | null;
  source: string | null;
  intensity?: number; // 1-10 mood intensity
  tags?: Record<string, string>; // Context tags: { sleep: 'Good', exercise: 'Moderate', ... }
  energyLevel?: number; // 1-10 energy level
  mealContext?: Record<string, any>; // { mealIds: [123, 124], windowHours: 4 }
  clientEventId?: string; // For idempotency
  dayKey?: string; // Stable local day bucket (YYYY-MM-DD)
  timezoneOffset?: number; // Minutes offset at logging time
  loggedDate: string;
  createdAt: string;
}

// ============================================================================
// Gamification Types
// ============================================================================

export interface Gamification {
  id: number;
  userId: string;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  streakFreezes: number;
  totalMealsLogged: number;
  nextLevelXp: number;
  freezeConsumed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  requiredPoints: number | null;
  category: string | null;
  createdAt: string;
}

export interface UserAchievement {
  id: number;
  userId: string;
  achievementId: number;
  unlockedAt: string;
  createdAt: string;
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface Recipe {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  ingredients: Ingredient[];
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number;
  tags: string[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface TodayNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  micros?: Record<string, MicronutrientValue>;
}

export interface WeeklyAverages {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
}

export interface DashboardData {
  today: {
    date: string;
    nutrition: TodayNutrition;
    waterIntakeLiters: number;
    waterLogs: WaterLog[];
    foodLogs: FoodLog[];
    moodLogs: MoodLog[];
    hydrationCelebratedAt: string | null;
  };
  goals: NutritionGoals | null;
  gamification: Gamification;
  trends: {
    weeklyAverages: WeeklyAverages;
    weekSummaries: DailyNutritionSummary[];
    currentStreak: number;
  };
  recentWeight: WeightHistory[];
}

// ============================================================================
// Dietary Preferences Types
// ============================================================================

export interface DietaryPreferences {
  id: number;
  userId: string;
  preferences: string[];
  allergies: string[];
  dislikes: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface UserNotification {
  id: number;
  userId: string;
  type: 'achievement_unlock' | 'reminder' | 'goal_reached' | null;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  errors?: Record<string, string[]>; // Validation errors
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
