/**
 * Zod Runtime Validation Schemas
 *
 * These schemas provide PRODUCTION-GRADE safety by validating all API responses
 * at runtime. They act as a contract between frontend and backend.
 *
 * Any API response that doesn't match these schemas will throw an error,
 * preventing silent data corruption.
 */

import { z } from 'zod';

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const ProfileSchema = z.object({
  id: z.number(),
  userId: z.string().min(1, 'userId cannot be empty'),
  fullName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  gender: z.enum(['female', 'male', 'other']).nullable().optional(),
  age: z.number().positive().nullable().optional(),
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  heightCm: z.number().positive().nullable().optional(),
  activityLevel: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isPremium: z.boolean().optional(),
  premiumTier: z.enum(['free', 'pro']).optional(),
  subscriptionEndsAt: z.string().datetime().nullable().optional(),
  onboardingCompletedAt: z.string().datetime().nullable().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ============================================================================
// NUTRITION GOALS SCHEMAS
// ============================================================================

export const NutritionGoalsSchema = z.object({
  id: z.number(),
  userId: z.string().min(1),
  primaryGoal: z.enum(['lose', 'maintain', 'gain']).nullable().optional(),
  dailyCalories: z.number().positive().nullable().optional(),
  proteinG: z.number().nonnegative().nullable().optional(),
  carbsG: z.number().nonnegative().nullable().optional(),
  fatsG: z.number().nonnegative().nullable().optional(),
  waterLiters: z.string().regex(/^\d+(\.\d{1})?$/).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type NutritionGoals = z.infer<typeof NutritionGoalsSchema>;

// ============================================================================
// FOOD LOG SCHEMAS
// ============================================================================

export const FoodLogSchema = z.object({
  id: z.number(),
  userId: z.string().min(1),
  foodName: z.string().min(1, 'Food name cannot be empty'),
  calories: z.number().nonnegative().nullable().optional(),
  protein: z.number().nonnegative().nullable().optional(),
  carbs: z.number().nonnegative().nullable().optional(),
  fats: z.number().nonnegative().nullable().optional(),
  servingSize: z.string().nullable().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'general']).nullable().optional(),
  loggedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FoodLog = z.infer<typeof FoodLogSchema>;

export const FoodLogListSchema = z.array(FoodLogSchema);

// ============================================================================
// MOOD LOG SCHEMAS
// ============================================================================

export const MoodLogSchema = z.object({
  id: z.number(),
  userId: z.string().min(1),
  mood: z.enum(['terrible', 'bad', 'neutral', 'good', 'great']),
  energy: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
  loggedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MoodLog = z.infer<typeof MoodLogSchema>;

// ============================================================================
// WATER LOG SCHEMAS
// ============================================================================

export const WaterLogSchema = z.object({
  id: z.number(),
  userId: z.string().min(1),
  amountMl: z.number().positive('Amount must be greater than 0'),
  loggedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WaterLog = z.infer<typeof WaterLogSchema>;

// ============================================================================
// DASHBOARD SCHEMAS
// ============================================================================

export const DashboardSchema = z.object({
  todayCalories: z.number().nonnegative(),
  todayProtein: z.number().nonnegative(),
  todayCarbs: z.number().nonnegative(),
  todayFats: z.number().nonnegative(),
  waterIntake: z.number().nonnegative(),
  mood: z.enum(['terrible', 'bad', 'neutral', 'good', 'great']).nullable().optional(),
  goals: NutritionGoalsSchema.nullable().optional(),
  recentFoods: FoodLogListSchema.optional(),
});

export type Dashboard = z.infer<typeof DashboardSchema>;

// ============================================================================
// NOTIFICATION PREFERENCES SCHEMAS
// ============================================================================

export const NotificationPreferencesSchema = z.object({
  mealReminders: z.boolean().optional(),
  hydrationReminders: z.boolean().optional(),
  moodCheckIns: z.boolean().optional(),
  goalAlerts: z.boolean().optional(),
  activityReminders: z.boolean().optional(),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// ============================================================================
// ERROR VALIDATION
// ============================================================================

/**
 * Safely parse API response with error handling
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Context for error messages (e.g., "Profile fetch")
 * @returns Validated data or throws with helpful error
 */
export function validateAPIResponse(schema, data, context = 'API Response') {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`${context} validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Safely parse API list response
 */
export function validateAPIListResponse(schema, data, context = 'API List Response') {
  try {
    return z.array(schema).parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`${context} validation failed: ${issues}`);
    }
    throw error;
  }
}
