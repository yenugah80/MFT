/**
 * Zod Validation Schemas for Logging Endpoints
 */

import { z } from 'zod';

// Meal log schema
export const logMealSchema = z.object({
  foodName: z.string().min(1, 'Food name is required').max(500, 'Food name too long'),
  calories: z.number().int().min(0).max(10000).nullable().optional(),
  protein: z.number().int().min(0).max(500).nullable().optional(),
  carbs: z.number().int().min(0).max(1000).nullable().optional(),
  fats: z.number().int().min(0).max(500).nullable().optional(),
  servingSize: z.string().max(100).nullable().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable().optional(),
  micros: z.record(z.unknown()).optional().default({}),
  nutriscore: z.enum(['A', 'B', 'C', 'D', 'E']).nullable().optional(),
  ecoscore: z.enum(['A', 'B', 'C', 'D', 'E']).nullable().optional(),
  novaScore: z.number().int().min(1).max(4).nullable().optional(),
  dietLabels: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  ingredients: z.array(z.unknown()).optional().default([]),
  barcode: z.string().max(50).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  loggedDate: z.string().datetime().nullable().optional(),
  source: z.string().max(50).nullable().optional(),
});

// Water log schema
export const logWaterSchema = z.object({
  amountLiters: z.union([
    z.number().positive('Amount must be positive').max(20, 'Amount too large'),
    z.string().transform((val) => {
      const parsed = parseFloat(val);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return parsed;
    }),
  ]),
  beverageType: z.string().max(50).optional().default('water'),
  clientEventId: z.string().max(100).nullable().optional(),
});

// Mood log schema
export const logMoodSchema = z.object({
  mood: z.string().min(1, 'Mood is required').max(50),
  note: z.string().max(500).nullable().optional(),
  source: z.string().max(50).nullable().optional(),
  intensity: z.number().int().min(1).max(10).nullable().optional(),
  tags: z.record(z.unknown()).optional().default({}),
  energyLevel: z.number().int().min(1).max(10).nullable().optional(),
  clientEventId: z.string().max(100).nullable().optional(),
});

// Activity level schemas
export const createActivityLevelSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50),
  label: z.string().min(1, 'Label is required').max(100),
  desc: z.string().max(500).nullable().optional(),
  factor: z.union([
    z.number().min(0).max(5),
    z.string().transform((val) => parseFloat(val)),
  ]).nullable().optional(),
});

export const updateActivityLevelSchema = createActivityLevelSchema.partial();

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});
