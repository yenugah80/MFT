/**
 * candidateGenerationService.js
 *
 * Generates a ranked, deduplicated list of food candidates for the
 * recommendation engine. Merges three sources (user food history,
 * previously accepted recommendations, and a static food catalogue)
 * and scores each candidate against real-time user signals.
 *
 * Export surface
 * ──────────────
 *   generateCandidates(userId, context) → Promise<Candidate[]>
 *
 * context shape
 * ─────────────
 *   {
 *     signals  : object  – aggregated signals from userSignalCacheService
 *     profile  : object  – user profile row (cuisine_preference, region …)
 *     mealType : string  – 'breakfast' | 'lunch' | 'dinner' | 'snack'
 *     limit    : number  – max candidates to return (default 20)
 *   }
 */

import { db } from '../config/db.js';
import {
  foodLogTable,
  recommendationsHistoryTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// ============================================================================
// FOOD CATALOGUE  –  60+ diverse foods across cuisines
// ============================================================================

/**
 * @typedef {Object} CatalogueFoodItem
 * @property {string}   id
 * @property {string}   name
 * @property {'protein'|'carbs'|'vegetables'|'fats'|'fruit'|'meal'|'snack'|'beverage'} category
 * @property {string[]} mealTypes
 * @property {{ calories: number, protein: number, carbs: number, fat: number, fiber: number }} nutrition
 * @property {string[]} tags
 * @property {number}   prepTime    minutes
 * @property {number}   satiety     1-10
 * @property {boolean}  moodBoost
 * @property {boolean}  hydrating
 * @property {string[]} cuisineTags
 */

/** @type {CatalogueFoodItem[]} */
export const FOOD_CATALOGUE = [
  // ── Indian ────────────────────────────────────────────────────────────────
  {
    id: 'IN001', name: 'Dal (Yellow Lentil Soup)', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 190, protein: 13, carbs: 30, fat: 3, fiber: 8 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 30, satiety: 7, moodBoost: true, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN002', name: 'Idli (Steamed Rice Cakes)', category: 'carbs',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 150, protein: 4, carbs: 32, fat: 1, fiber: 2 },
    tags: ['complex-carbs', 'probiotic', 'low-calorie'],
    prepTime: 20, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN003', name: 'Whole Wheat Roti', category: 'carbs',
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    nutrition: { calories: 120, protein: 4, carbs: 24, fat: 2, fiber: 3 },
    tags: ['complex-carbs', 'fiber-rich'],
    prepTime: 10, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN004', name: 'Paneer Bhurji', category: 'protein',
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    nutrition: { calories: 270, protein: 18, carbs: 8, fat: 18, fiber: 1 },
    tags: ['high-protein', 'energy-boost'],
    prepTime: 15, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN005', name: 'Chicken Biryani (Brown Rice)', category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 420, protein: 28, carbs: 52, fat: 10, fiber: 4 },
    tags: ['high-protein', 'complex-carbs', 'energy-boost'],
    prepTime: 45, satiety: 9, moodBoost: true, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN006', name: 'Masala Dosa', category: 'meal',
    mealTypes: ['breakfast', 'lunch'],
    nutrition: { calories: 200, protein: 5, carbs: 35, fat: 6, fiber: 3 },
    tags: ['complex-carbs', 'probiotic'],
    prepTime: 20, satiety: 6, moodBoost: false, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN007', name: 'Rajma (Kidney Bean Curry)', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 230, protein: 14, carbs: 35, fat: 4, fiber: 9 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 40, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN008', name: 'Upma (Semolina Porridge)', category: 'carbs',
    mealTypes: ['breakfast'],
    nutrition: { calories: 200, protein: 5, carbs: 36, fat: 5, fiber: 2 },
    tags: ['complex-carbs', 'quick-energy'],
    prepTime: 15, satiety: 6, moodBoost: false, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN009', name: 'Palak Paneer', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 250, protein: 16, carbs: 10, fat: 16, fiber: 5 },
    tags: ['high-protein', 'fiber-rich', 'anti-inflammatory', 'magnesium-rich'],
    prepTime: 25, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['indian'],
  },
  {
    id: 'IN010', name: 'Chana Masala', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 210, protein: 11, carbs: 32, fat: 5, fiber: 8 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs'],
    prepTime: 30, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['indian'],
  },

  // ── Mediterranean ─────────────────────────────────────────────────────────
  {
    id: 'ME001', name: 'Hummus with Pita', category: 'snack',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 180, protein: 8, carbs: 24, fat: 7, fiber: 5 },
    tags: ['fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 5, satiety: 6, moodBoost: false, hydrating: false,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },
  {
    id: 'ME002', name: 'Falafel Bowl', category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 350, protein: 14, carbs: 40, fat: 14, fiber: 9 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs'],
    prepTime: 30, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },
  {
    id: 'ME003', name: 'Tabbouleh Salad', category: 'vegetables',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 120, protein: 3, carbs: 16, fat: 5, fiber: 4 },
    tags: ['fiber-rich', 'anti-inflammatory', 'hydrating', 'low-calorie'],
    prepTime: 15, satiety: 4, moodBoost: false, hydrating: true,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },
  {
    id: 'ME004', name: 'Greek Yogurt with Honey', category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 160, protein: 14, carbs: 18, fat: 3, fiber: 0 },
    tags: ['high-protein', 'probiotic', 'energy-boost'],
    prepTime: 2, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['mediterranean', 'american'],
  },
  {
    id: 'ME005', name: 'Grilled Sardines with Olive Oil', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 210, protein: 22, carbs: 0, fat: 13, fiber: 0 },
    tags: ['high-protein', 'omega3-rich', 'anti-inflammatory'],
    prepTime: 15, satiety: 7, moodBoost: true, hydrating: false,
    cuisineTags: ['mediterranean'],
  },
  {
    id: 'ME006', name: 'Lentil Soup (Mediterranean Style)', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 200, protein: 13, carbs: 32, fat: 3, fiber: 9 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 35, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['mediterranean'],
  },
  {
    id: 'ME007', name: 'Baba Ganoush with Veggies', category: 'vegetables',
    mealTypes: ['snack', 'lunch'],
    nutrition: { calories: 130, protein: 4, carbs: 14, fat: 7, fiber: 5 },
    tags: ['fiber-rich', 'anti-inflammatory', 'low-calorie'],
    prepTime: 5, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },

  // ── Asian ─────────────────────────────────────────────────────────────────
  {
    id: 'AS001', name: 'Miso Soup with Tofu', category: 'protein',
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    nutrition: { calories: 90, protein: 7, carbs: 7, fat: 3, fiber: 2 },
    tags: ['probiotic', 'low-calorie', 'hydrating', 'anti-inflammatory'],
    prepTime: 10, satiety: 4, moodBoost: true, hydrating: true,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS002', name: 'Edamame', category: 'protein',
    mealTypes: ['snack', 'lunch'],
    nutrition: { calories: 120, protein: 11, carbs: 9, fat: 5, fiber: 4 },
    tags: ['high-protein', 'fiber-rich', 'low-calorie'],
    prepTime: 5, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS003', name: 'Congee (Rice Porridge)', category: 'carbs',
    mealTypes: ['breakfast', 'lunch'],
    nutrition: { calories: 140, protein: 3, carbs: 30, fat: 1, fiber: 1 },
    tags: ['complex-carbs', 'hydrating', 'low-calorie'],
    prepTime: 20, satiety: 6, moodBoost: false, hydrating: true,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS004', name: 'Stir-Fry Tofu with Vegetables', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 220, protein: 16, carbs: 14, fat: 11, fiber: 4 },
    tags: ['high-protein', 'fiber-rich', 'anti-inflammatory'],
    prepTime: 20, satiety: 7, moodBoost: false, hydrating: false,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS005', name: 'Soba Noodles with Sesame', category: 'carbs',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 300, protein: 11, carbs: 55, fat: 5, fiber: 3 },
    tags: ['complex-carbs', 'energy-boost'],
    prepTime: 15, satiety: 7, moodBoost: false, hydrating: false,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS006', name: 'Kimchi', category: 'vegetables',
    mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
    nutrition: { calories: 25, protein: 2, carbs: 4, fat: 0, fiber: 2 },
    tags: ['probiotic', 'anti-inflammatory', 'low-calorie'],
    prepTime: 0, satiety: 3, moodBoost: true, hydrating: false,
    cuisineTags: ['asian'],
  },
  {
    id: 'AS007', name: 'Green Tea', category: 'beverage',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    tags: ['anti-inflammatory', 'low-calorie', 'hydrating', 'energy-boost'],
    prepTime: 3, satiety: 1, moodBoost: true, hydrating: true,
    cuisineTags: ['asian'],
  },

  // ── Mexican ───────────────────────────────────────────────────────────────
  {
    id: 'MX001', name: 'Black Bean Burrito Bowl', category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 380, protein: 18, carbs: 58, fat: 8, fiber: 14 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs'],
    prepTime: 20, satiety: 9, moodBoost: false, hydrating: false,
    cuisineTags: ['mexican'],
  },
  {
    id: 'MX002', name: 'Avocado Toast on Corn Tortilla', category: 'snack',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 220, protein: 5, carbs: 24, fat: 13, fiber: 6 },
    tags: ['fiber-rich', 'omega3-rich', 'complex-carbs'],
    prepTime: 5, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['mexican', 'american'],
  },
  {
    id: 'MX003', name: 'Salsa Veggie Bowl', category: 'vegetables',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 160, protein: 6, carbs: 28, fat: 4, fiber: 8 },
    tags: ['fiber-rich', 'anti-inflammatory', 'low-calorie', 'hydrating'],
    prepTime: 10, satiety: 6, moodBoost: false, hydrating: true,
    cuisineTags: ['mexican'],
  },
  {
    id: 'MX004', name: 'Chicken Tacos (Corn Tortilla)', category: 'meal',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 340, protein: 26, carbs: 34, fat: 10, fiber: 5 },
    tags: ['high-protein', 'complex-carbs', 'energy-boost'],
    prepTime: 20, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['mexican'],
  },

  // ── American ──────────────────────────────────────────────────────────────
  {
    id: 'AM001', name: 'Steel-Cut Oatmeal with Berries', category: 'carbs',
    mealTypes: ['breakfast'],
    nutrition: { calories: 280, protein: 8, carbs: 50, fat: 5, fiber: 7 },
    tags: ['complex-carbs', 'fiber-rich', 'energy-boost', 'anti-inflammatory'],
    prepTime: 15, satiety: 7, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'AM002', name: 'Turkey & Avocado Sandwich (Whole Wheat)', category: 'meal',
    mealTypes: ['lunch'],
    nutrition: { calories: 380, protein: 28, carbs: 36, fat: 14, fiber: 6 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs'],
    prepTime: 5, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'AM003', name: 'Baked Sweet Potato', category: 'carbs',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 180, protein: 3, carbs: 41, fat: 0, fiber: 6 },
    tags: ['complex-carbs', 'fiber-rich', 'anti-inflammatory', 'energy-boost'],
    prepTime: 45, satiety: 7, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'AM004', name: 'Greek Yogurt Parfait', category: 'snack',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 230, protein: 16, carbs: 28, fat: 5, fiber: 3 },
    tags: ['high-protein', 'probiotic', 'quick-energy'],
    prepTime: 5, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'AM005', name: 'Egg White Scramble with Spinach', category: 'protein',
    mealTypes: ['breakfast', 'lunch'],
    nutrition: { calories: 160, protein: 22, carbs: 4, fat: 5, fiber: 2 },
    tags: ['high-protein', 'low-calorie', 'anti-inflammatory'],
    prepTime: 10, satiety: 7, moodBoost: false, hydrating: false,
    cuisineTags: ['american'],
  },

  // ── Global Proteins ───────────────────────────────────────────────────────
  {
    id: 'GP001', name: 'Grilled Salmon Fillet', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 280, protein: 34, carbs: 0, fat: 14, fiber: 0 },
    tags: ['high-protein', 'omega3-rich', 'anti-inflammatory', 'tryptophan-rich'],
    prepTime: 20, satiety: 9, moodBoost: true, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'GP002', name: 'Boiled Eggs (2 large)', category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 155, protein: 13, carbs: 1, fat: 11, fiber: 0 },
    tags: ['high-protein', 'tryptophan-rich', 'quick-energy'],
    prepTime: 10, satiety: 7, moodBoost: true, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'GP003', name: 'Grilled Chicken Breast', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 230, protein: 43, carbs: 0, fat: 5, fiber: 0 },
    tags: ['high-protein', 'tryptophan-rich', 'low-calorie', 'energy-boost'],
    prepTime: 20, satiety: 9, moodBoost: true, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'GP004', name: 'Low-Fat Cottage Cheese', category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 160, protein: 25, carbs: 7, fat: 3, fiber: 0 },
    tags: ['high-protein', 'low-calorie', 'tryptophan-rich'],
    prepTime: 0, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'GP005', name: 'Red Lentil Dal', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 200, protein: 14, carbs: 32, fat: 2, fiber: 8 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 25, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['indian', 'mediterranean'],
  },
  {
    id: 'GP006', name: 'Quinoa Bowl', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 220, protein: 8, carbs: 39, fat: 4, fiber: 5 },
    tags: ['high-protein', 'complex-carbs', 'fiber-rich', 'magnesium-rich'],
    prepTime: 20, satiety: 7, moodBoost: false, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'GP007', name: 'Tempeh Stir-Fry', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 250, protein: 20, carbs: 14, fat: 11, fiber: 5 },
    tags: ['high-protein', 'fiber-rich', 'probiotic', 'anti-inflammatory'],
    prepTime: 20, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['asian'],
  },
  {
    id: 'GP008', name: 'Tuna Salad (in water)', category: 'protein',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 190, protein: 30, carbs: 4, fat: 6, fiber: 2 },
    tags: ['high-protein', 'omega3-rich', 'low-calorie'],
    prepTime: 5, satiety: 8, moodBoost: true, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'GP009', name: 'Black Bean & Quinoa Salad', category: 'protein',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 290, protein: 15, carbs: 46, fat: 6, fiber: 11 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs', 'anti-inflammatory'],
    prepTime: 20, satiety: 8, moodBoost: false, hydrating: false,
    cuisineTags: ['american', 'mexican'],
  },
  {
    id: 'GP010', name: 'Whole Milk Kefir', category: 'protein',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 145, protein: 10, carbs: 12, fat: 6, fiber: 0 },
    tags: ['high-protein', 'probiotic', 'tryptophan-rich'],
    prepTime: 0, satiety: 5, moodBoost: true, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },

  // ── Vegetables ────────────────────────────────────────────────────────────
  {
    id: 'VG001', name: 'Steamed Broccoli', category: 'vegetables',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 55, protein: 4, carbs: 11, fat: 0, fiber: 5 },
    tags: ['fiber-rich', 'anti-inflammatory', 'low-calorie', 'magnesium-rich'],
    prepTime: 10, satiety: 4, moodBoost: false, hydrating: true,
    cuisineTags: ['american', 'asian'],
  },
  {
    id: 'VG002', name: 'Spinach Salad with Walnuts', category: 'vegetables',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 130, protein: 5, carbs: 8, fat: 9, fiber: 4 },
    tags: ['fiber-rich', 'omega3-rich', 'anti-inflammatory', 'magnesium-rich', 'low-calorie'],
    prepTime: 5, satiety: 4, moodBoost: true, hydrating: true,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'VG003', name: 'Roasted Vegetable Medley', category: 'vegetables',
    mealTypes: ['lunch', 'dinner'],
    nutrition: { calories: 120, protein: 3, carbs: 22, fat: 4, fiber: 6 },
    tags: ['fiber-rich', 'anti-inflammatory', 'low-calorie'],
    prepTime: 30, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['american', 'mediterranean'],
  },
  {
    id: 'VG004', name: 'Cucumber & Tomato Salad', category: 'vegetables',
    mealTypes: ['lunch', 'dinner', 'snack'],
    nutrition: { calories: 60, protein: 2, carbs: 12, fat: 1, fiber: 3 },
    tags: ['low-calorie', 'hydrating', 'anti-inflammatory'],
    prepTime: 5, satiety: 3, moodBoost: false, hydrating: true,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },

  // ── Fruits ────────────────────────────────────────────────────────────────
  {
    id: 'FR001', name: 'Mixed Berries', category: 'fruit',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 85, protein: 1, carbs: 20, fat: 0, fiber: 5 },
    tags: ['fiber-rich', 'anti-inflammatory', 'quick-energy', 'moodBoost'],
    prepTime: 0, satiety: 4, moodBoost: true, hydrating: true,
    cuisineTags: ['american'],
  },
  {
    id: 'FR002', name: 'Apple with Almond Butter', category: 'fruit',
    mealTypes: ['snack'],
    nutrition: { calories: 190, protein: 5, carbs: 26, fat: 9, fiber: 5 },
    tags: ['fiber-rich', 'omega3-rich', 'quick-energy'],
    prepTime: 2, satiety: 6, moodBoost: false, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'FR003', name: 'Banana', category: 'fruit',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
    tags: ['quick-energy', 'tryptophan-rich', 'magnesium-rich'],
    prepTime: 0, satiety: 4, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'FR004', name: 'Mango', category: 'fruit',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 100, protein: 1, carbs: 25, fat: 0, fiber: 3 },
    tags: ['quick-energy', 'anti-inflammatory', 'hydrating'],
    prepTime: 5, satiety: 4, moodBoost: true, hydrating: true,
    cuisineTags: ['indian', 'asian'],
  },

  // ── Snacks ────────────────────────────────────────────────────────────────
  {
    id: 'SN001', name: 'Almonds (1 oz)', category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 4 },
    tags: ['omega3-rich', 'magnesium-rich', 'fiber-rich', 'anti-inflammatory'],
    prepTime: 0, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'SN002', name: 'Dark Chocolate (70%+)', category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 170, protein: 2, carbs: 18, fat: 12, fiber: 3 },
    tags: ['anti-inflammatory', 'magnesium-rich', 'moodBoost'],
    prepTime: 0, satiety: 5, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'SN003', name: 'Rice Cakes with Peanut Butter', category: 'snack',
    mealTypes: ['snack', 'breakfast'],
    nutrition: { calories: 180, protein: 6, carbs: 28, fat: 6, fiber: 2 },
    tags: ['quick-energy', 'low-calorie', 'complex-carbs'],
    prepTime: 2, satiety: 5, moodBoost: false, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'SN004', name: 'Roasted Chickpeas', category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 130, protein: 7, carbs: 20, fat: 3, fiber: 5 },
    tags: ['high-protein', 'fiber-rich', 'complex-carbs'],
    prepTime: 30, satiety: 6, moodBoost: false, hydrating: false,
    cuisineTags: ['mediterranean', 'middle-eastern'],
  },
  {
    id: 'SN005', name: 'Trail Mix (Nuts & Dried Fruit)', category: 'snack',
    mealTypes: ['snack'],
    nutrition: { calories: 200, protein: 5, carbs: 22, fat: 11, fiber: 3 },
    tags: ['quick-energy', 'omega3-rich', 'magnesium-rich'],
    prepTime: 0, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },

  // ── Beverages ─────────────────────────────────────────────────────────────
  {
    id: 'BV001', name: 'Coconut Water', category: 'beverage',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 45, protein: 0, carbs: 11, fat: 0, fiber: 0 },
    tags: ['hydrating', 'quick-energy', 'magnesium-rich'],
    prepTime: 0, satiety: 2, moodBoost: false, hydrating: true,
    cuisineTags: ['asian', 'indian'],
  },
  {
    id: 'BV002', name: 'Protein Smoothie (Banana + Whey)', category: 'beverage',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 280, protein: 25, carbs: 34, fat: 4, fiber: 3 },
    tags: ['high-protein', 'quick-energy', 'tryptophan-rich', 'energy-boost'],
    prepTime: 5, satiety: 6, moodBoost: true, hydrating: false,
    cuisineTags: ['american'],
  },
  {
    id: 'BV003', name: 'Turmeric Golden Milk', category: 'beverage',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 100, protein: 5, carbs: 11, fat: 4, fiber: 1 },
    tags: ['anti-inflammatory', 'moodBoost', 'magnesium-rich'],
    prepTime: 5, satiety: 3, moodBoost: true, hydrating: true,
    cuisineTags: ['indian'],
  },
  {
    id: 'BV004', name: 'Watermelon Juice', category: 'beverage',
    mealTypes: ['breakfast', 'snack'],
    nutrition: { calories: 80, protein: 1, carbs: 20, fat: 0, fiber: 1 },
    tags: ['hydrating', 'quick-energy', 'low-calorie'],
    prepTime: 5, satiety: 2, moodBoost: false, hydrating: true,
    cuisineTags: ['indian', 'american'],
  },
];

// ============================================================================
// SCORING FUNCTION
// ============================================================================

/**
 * Score a candidate food against current user signals.
 * Returns a score in [0, 100].
 *
 * @param {CatalogueFoodItem|object} food
 * @param {object} signals
 * @returns {number}
 */
function scoreCandidate(food, signals) {
  let score = 0;

  // ── Nutritional Gaps (35 pts max) ─────────────────────────────────────────
  const gaps = signals.nutritionalGaps;
  if (gaps?.protein?.status === 'low' && food.nutrition.protein >= 15) score += 20;
  if (gaps?.fiber?.status === 'low' && food.nutrition.fiber >= 4) score += 10;
  const calRemaining = gaps?.calories?.remaining ?? 2000;
  if (food.nutrition.calories <= calRemaining) score += 5;
  else if (food.nutrition.calories > calRemaining + 100) score -= 15;

  // ── Mood Signals (25 pts max) ─────────────────────────────────────────────
  const moodUrgency = signals.moodUrgency ?? 0;
  const energyUrgency = signals.energyUrgency ?? 0;
  if (moodUrgency > 0.3 && food.moodBoost) score += Math.round(moodUrgency * 20);
  if (energyUrgency > 0.3 && food.tags?.includes('energy-boost')) score += Math.round(energyUrgency * 15);

  // ── Hydration Signals (20 pts max) ────────────────────────────────────────
  const hydrationUrgency = signals.hydrationUrgency ?? 0;
  if (hydrationUrgency > 0.3 && food.hydrating) score += Math.round(hydrationUrgency * 20);

  // ── Activity Signals (20 pts max) ─────────────────────────────────────────
  if (signals.inPostWorkoutWindow && food.tags?.includes('high-protein')) {
    score += Math.round((signals.proteinUrgency ?? 0.5) * 25);
  }
  if ((signals.carbUrgency ?? 0) > 0.3 && food.tags?.includes('complex-carbs')) {
    score += Math.round(signals.carbUrgency * 15);
  }
  if ((signals.antiInflammatoryBonus ?? 0) > 0.2 && food.tags?.includes('anti-inflammatory')) {
    score += Math.round(signals.antiInflammatoryBonus * 12);
  }

  // ── Meal Timing (10 pts) ──────────────────────────────────────────────────
  if (food.mealTypes?.includes(signals.mealType)) score += 10;
  else score -= 5;

  // ── Cuisine Match (5 pts) ─────────────────────────────────────────────────
  const cuisine = signals.cuisinePreference?.toLowerCase();
  if (cuisine && food.cuisineTags?.includes(cuisine)) score += 5;

  // ── Variety Penalty ───────────────────────────────────────────────────────
  if (signals.recentFoodNames?.some(
    (r) => food.name.toLowerCase().includes(r.toLowerCase())
  )) score -= 10;

  // ── Allergen Safety ───────────────────────────────────────────────────────
  if (signals.allergies?.some(
    (a) => food.name.toLowerCase().includes(a.toLowerCase())
  )) score -= 100;

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Fetch user's food history from the past 30 days.
 * Groups by foodName and computes averaged nutrition values.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function fetchUserHistoryFoods(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  try {
    // Aggregate per food name to get average nutrition values
    const rows = await db
      .select({
        foodName: foodLogTable.foodName,
        avgCalories: sql`ROUND(AVG(${foodLogTable.calories}))`.as('avg_calories'),
        avgProtein: sql`ROUND(AVG(${foodLogTable.protein}))`.as('avg_protein'),
        avgCarbs: sql`ROUND(AVG(${foodLogTable.carbs}))`.as('avg_carbs'),
        avgFats: sql`ROUND(AVG(${foodLogTable.fats}))`.as('avg_fats'),
        avgFiber: sql`ROUND(AVG(${foodLogTable.fiber}))`.as('avg_fiber'),
        logCount: sql`COUNT(*)`.as('log_count'),
      })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, thirtyDaysAgo)
        )
      )
      .groupBy(foodLogTable.foodName)
      .orderBy(desc(sql`COUNT(*)`));

    return rows.map((r) => ({
      id: `history_${r.foodName.toLowerCase().replace(/\s+/g, '_')}`,
      name: r.foodName,
      category: 'meal',
      mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
      nutrition: {
        calories: Number(r.avgCalories) || 0,
        protein: Number(r.avgProtein) || 0,
        carbs: Number(r.avgCarbs) || 0,
        fat: Number(r.avgFats) || 0,
        fiber: Number(r.avgFiber) || 0,
      },
      tags: [],
      prepTime: 0,
      satiety: 5,
      moodBoost: false,
      hydrating: false,
      cuisineTags: [],
      source: 'history',
      portion: '1 serving',
    }));
  } catch (err) {
    console.error('[candidateGenerationService] fetchUserHistoryFoods error:', err);
    return [];
  }
}

/**
 * Fetch foods the user has previously accepted from recommendations.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function fetchAcceptedRecommendations(userId) {
  try {
    const rows = await db
      .select({
        foodName: recommendationsHistoryTable.foodName,
        portion: recommendationsHistoryTable.portion,
        calories: recommendationsHistoryTable.calories,
        protein: recommendationsHistoryTable.protein,
        carbs: recommendationsHistoryTable.carbs,
        fats: recommendationsHistoryTable.fats,
        fiber: recommendationsHistoryTable.fiber,
        mealType: recommendationsHistoryTable.mealType,
      })
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.interactionStatus, 'accepted')
        )
      )
      .orderBy(desc(recommendationsHistoryTable.shownAt))
      .limit(50);

    return rows.map((r) => ({
      id: `accepted_${r.foodName.toLowerCase().replace(/\s+/g, '_')}`,
      name: r.foodName,
      category: 'meal',
      mealTypes: r.mealType ? [r.mealType] : ['breakfast', 'lunch', 'dinner', 'snack'],
      nutrition: {
        calories: r.calories || 0,
        protein: r.protein || 0,
        carbs: r.carbs || 0,
        fat: r.fats || 0,
        fiber: r.fiber || 0,
      },
      tags: [],
      prepTime: 0,
      satiety: 6,
      moodBoost: false,
      hydrating: false,
      cuisineTags: [],
      source: 'accepted_recommendation',
      portion: r.portion || '1 serving',
    }));
  } catch (err) {
    console.error('[candidateGenerationService] fetchAcceptedRecommendations error:', err);
    return [];
  }
}

// ============================================================================
// MERGE & DEDUPLICATE
// ============================================================================

/**
 * Normalise a food name to a deduplication key.
 * @param {string} name
 * @returns {string}
 */
function dedupeKey(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Merge candidates from multiple sources, deduplicate by name, and annotate
 * each with its source weight for score adjustment.
 *
 * Priority / weight:
 *   history                  → 2.0×
 *   accepted_recommendation  → 1.5×
 *   catalogue                → 1.0×
 *
 * When the same food appears in multiple sources, the highest-weight source
 * wins (and its nutrition data is used).
 *
 * @param {object[]} historyFoods
 * @param {object[]} acceptedFoods
 * @param {object[]} catalogueFoods
 * @param {string}   mealType
 * @returns {object[]} deduplicated candidates
 */
function mergeCandidates(historyFoods, acceptedFoods, catalogueFoods, mealType) {
  /** @type {Map<string, {food: object, weight: number}>} */
  const seen = new Map();

  const register = (food, weight) => {
    const key = dedupeKey(food.name);
    const existing = seen.get(key);
    if (!existing || weight > existing.weight) {
      seen.set(key, { food: { ...food }, weight });
    }
  };

  // Register in ascending priority so higher-priority items overwrite
  for (const f of catalogueFoods)  register(f, 1.0);
  for (const f of acceptedFoods)   register(f, 1.5);
  for (const f of historyFoods)    register(f, 2.0);

  return [...seen.values()].map(({ food, weight }) => ({ ...food, _weight: weight }));
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate a ranked list of food candidates for the recommendation engine.
 *
 * @param {string} userId
 * @param {{
 *   signals   : object,
 *   profile   : object,
 *   mealType  : string,
 *   limit     : number
 * }} context
 * @returns {Promise<Array<{
 *   id         : string,
 *   name       : string,
 *   nutrition  : object,
 *   tags       : string[],
 *   moodBoost  : boolean,
 *   hydrating  : boolean,
 *   prepTime   : number,
 *   satiety    : number,
 *   score      : number,
 *   source     : string,
 *   portion    : string,
 *   mealTypes  : string[],
 *   cuisineTags: string[]
 * }>>}
 */
export async function generateCandidates(userId, context = {}) {
  const { signals = {}, profile = {}, mealType, limit = 20 } = context;

  // Enrich signals with meal type and profile-level fields
  const enrichedSignals = {
    ...signals,
    mealType: mealType ?? signals.mealType ?? 'lunch',
    cuisinePreference: signals.cuisinePreference
      ?? (Array.isArray(profile.cuisinePreference) ? profile.cuisinePreference[0] : null)
      ?? profile.region
      ?? null,
    allergies: signals.allergies ?? [],
    recentFoodNames: signals.recentFoodNames ?? [],
  };

  // Fetch all three sources in parallel
  const [historyFoods, acceptedFoods] = await Promise.all([
    fetchUserHistoryFoods(userId),
    fetchAcceptedRecommendations(userId),
  ]);

  // Filter catalogue to relevant meal type first for efficiency
  const catalogueFoods = FOOD_CATALOGUE.map((f) => ({
    ...f,
    source: 'catalogue',
    portion: '1 serving',
  }));

  // Merge and deduplicate
  const merged = mergeCandidates(
    historyFoods,
    acceptedFoods,
    catalogueFoods,
    enrichedSignals.mealType
  );

  // Score each candidate, applying source weight multiplier
  const scored = merged.map((candidate) => {
    const baseScore = scoreCandidate(candidate, enrichedSignals);
    const weightedScore = Math.min(100, Math.round(baseScore * (candidate._weight ?? 1.0)));
    return {
      id: candidate.id,
      name: candidate.name,
      nutrition: candidate.nutrition,
      tags: candidate.tags ?? [],
      moodBoost: candidate.moodBoost ?? false,
      hydrating: candidate.hydrating ?? false,
      prepTime: candidate.prepTime ?? 0,
      satiety: candidate.satiety ?? 5,
      score: weightedScore,
      source: candidate.source ?? 'catalogue',
      portion: candidate.portion ?? '1 serving',
      mealTypes: candidate.mealTypes ?? [],
      cuisineTags: candidate.cuisineTags ?? [],
    };
  });

  // Sort descending by score, then alphabetically as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, limit);
}
