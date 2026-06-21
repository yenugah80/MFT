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
import { detectAllergenRisk, inferFoodAttributes, scoreMicronutrientFit } from './foodKnowledgeGraphService.js';
import { getCollaborativeCandidates } from './collaborativeFilteringService.js';
import { usdaClient } from './apiClients/USDAClient.js';

const USDA_CANDIDATE_TIMEOUT_MS = Number(process.env.RECOMMENDATION_USDA_TIMEOUT_MS) || 2500;

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
  const allergenRisk = detectAllergenRisk(food, signals.allergies ?? []);
  if (allergenRisk.hasRisk) return Number.NEGATIVE_INFINITY;

  let score = 0;
  const nutrition = {
    calories: Number(food.nutrition?.calories ?? food.calories ?? 0),
    protein: Number(food.nutrition?.protein ?? food.protein ?? 0),
    carbs: Number(food.nutrition?.carbs ?? food.carbs ?? 0),
    fat: Number(food.nutrition?.fat ?? food.nutrition?.fats ?? food.fats ?? 0),
    fiber: Number(food.nutrition?.fiber ?? food.fiber ?? 0),
  };

  // ── Nutritional Gaps (35 pts max) ─────────────────────────────────────────
  const gaps = signals.nutritionalGaps;
  if (gaps?.protein?.status === 'low' && nutrition.protein >= 15) score += 20;
  if (gaps?.fiber?.status === 'low' && nutrition.fiber >= 4) score += 10;
  const calRemaining = gaps?.calories?.remaining ?? 2000;
  if (nutrition.calories <= calRemaining) score += 5;
  else if (nutrition.calories > calRemaining + 100) score -= 15;

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
  // ── Micronutrient Gap Bonus (20 pts max) ──────────────────────────────────
  // Triggered when enrichedSignals contains micronutrient urgency signals from
  // computeMicronutrientUrgency() (e.g. { iron_urgency: 0.8, calcium_urgency: 0.4 })
  if (signals.microUrgencySignals && Object.keys(signals.microUrgencySignals).length > 0) {
    score += scoreMicronutrientFit(food, signals.microUrgencySignals);
  }

  // ── Rejection Penalty ─────────────────────────────────────────────────────
  // Foods the user has rejected 2+ times get a strong demotion so they stop
  // appearing. Uses a name-normalised lookup in signals.rejectedFoodNames.
  if (signals.rejectedFoodNames?.length > 0) {
    const foodNameLower = food.name.toLowerCase();
    const rejectedEntry = signals.rejectedFoodNames.find(
      (r) => foodNameLower.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(foodNameLower)
    );
    if (rejectedEntry) {
      // Scale penalty by number of rejections: 2=−25, 3=−40, 4+=−60
      const penalty = rejectedEntry.count >= 4 ? 60 : rejectedEntry.count === 3 ? 40 : 25;
      score -= penalty;
    }
  }

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
    const rows = await db
      .select({
        foodName: foodLogTable.foodName,
        calories: foodLogTable.calories,
        protein: foodLogTable.protein,
        carbs: foodLogTable.carbs,
        fats: foodLogTable.fats,
        fiber: foodLogTable.fiber,
        mealType: foodLogTable.mealType,
        ingredients: foodLogTable.ingredients,
        allergens: foodLogTable.allergens,
        loggedDate: foodLogTable.loggedDate,
      })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, thirtyDaysAgo)
        )
      )
      .orderBy(desc(foodLogTable.loggedDate))
      .limit(300);

    const grouped = new Map();
    for (const row of rows) {
      const key = row.foodName.toLowerCase().trim();
      const current = grouped.get(key) || {
        foodName: row.foodName,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        count: 0,
        mealTypes: new Set(),
        ingredients: [],
        allergens: new Set(),
      };

      current.calories += Number(row.calories) || 0;
      current.protein += Number(row.protein) || 0;
      current.carbs += Number(row.carbs) || 0;
      current.fats += Number(row.fats) || 0;
      current.fiber += Number(row.fiber) || 0;
      current.count += 1;
      if (row.mealType) current.mealTypes.add(row.mealType);
      if (Array.isArray(row.ingredients)) current.ingredients.push(...row.ingredients);
      if (Array.isArray(row.allergens)) row.allergens.forEach((a) => current.allergens.add(String(a)));
      grouped.set(key, current);
    }

    return [...grouped.values()].map((r) => {
      const attrs = inferFoodAttributes({ name: r.foodName, ingredients: r.ingredients });
      return {
        id: `history_${r.foodName.toLowerCase().replace(/\s+/g, '_')}`,
        name: r.foodName,
        category: 'meal',
        mealTypes: r.mealTypes.size > 0 ? [...r.mealTypes] : ['breakfast', 'lunch', 'dinner', 'snack'],
        nutrition: {
          calories: Math.round(r.calories / r.count) || 0,
          protein: Math.round(r.protein / r.count) || 0,
          carbs: Math.round(r.carbs / r.count) || 0,
          fat: Math.round(r.fats / r.count) || 0,
          fiber: Math.round(r.fiber / r.count) || 0,
        },
        tags: attrs.tags,
        prepTime: 0,
        satiety: attrs.tags.includes('high-protein') || attrs.tags.includes('fiber-rich') ? 7 : 5,
        moodBoost: attrs.moodBoost,
        hydrating: attrs.hydrating,
        cuisineTags: attrs.cuisineTags,
        source: 'history',
        portion: '1 serving',
        ingredients: r.ingredients,
        knownAllergens: [...r.allergens],
        logCount: r.count,
      };
    });
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

    return rows.map((r) => {
      const attrs = inferFoodAttributes({ name: r.foodName });
      return {
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
        tags: attrs.tags,
        prepTime: 0,
        satiety: attrs.tags.includes('high-protein') || attrs.tags.includes('fiber-rich') ? 7 : 6,
        moodBoost: attrs.moodBoost,
        hydrating: attrs.hydrating,
        cuisineTags: attrs.cuisineTags,
        source: 'accepted_recommendation',
        portion: r.portion || '1 serving',
      };
    });
  } catch (err) {
    console.error('[candidateGenerationService] fetchAcceptedRecommendations error:', err);
    return [];
  }
}

/**
 * Fetch food names the user has explicitly rejected 2 or more times.
 * These are used in scoreCandidate to apply a rejection penalty.
 *
 * @param {string} userId
 * @returns {Promise<Array<{name: string, count: number}>>}
 */
async function fetchRejectedFoodNames(userId) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

  try {
    const rows = await db
      .select({
        foodName: recommendationsHistoryTable.foodName,
        count: sql`COUNT(*)`.as('rejection_count'),
      })
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.interactionStatus, 'rejected'),
          gte(recommendationsHistoryTable.shownAt, ninetyDaysAgo)
        )
      )
      .groupBy(recommendationsHistoryTable.foodName)
      .having(sql`COUNT(*) >= 2`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(50);

    return rows.map((r) => ({ name: r.foodName, count: Number(r.count) }));
  } catch (err) {
    console.error('[candidateGenerationService] fetchRejectedFoodNames error:', err);
    return [];
  }
}

function buildUsdaQueries(signals, mealType, profile) {
  const queries = new Set();
  const cuisine = String(signals.cuisinePreference || profile?.region || '').toLowerCase();

  if (signals.inPostWorkoutWindow || signals.nutritionalGaps?.protein?.status === 'low') {
    queries.add('chicken breast cooked');
    queries.add('greek yogurt plain');
    queries.add('salmon cooked');
  }
  if ((signals.hydrationUrgency ?? 0) > 0.3) {
    queries.add('watermelon raw');
    queries.add('cucumber raw');
    queries.add('coconut water');
  }
  if ((signals.microUrgencySignals?.iron_urgency ?? 0) > 0.2) {
    queries.add('lentils cooked');
    queries.add('spinach cooked');
  }
  if ((signals.microUrgencySignals?.calcium_urgency ?? 0) > 0.2) {
    queries.add('yogurt plain');
    queries.add('cottage cheese');
  }
  if (mealType === 'breakfast') {
    queries.add('oatmeal cooked');
    queries.add('egg cooked');
  } else if (mealType === 'snack') {
    queries.add('banana raw');
    queries.add('apple raw');
  } else {
    queries.add(cuisine.includes('india') || cuisine.includes('indian') ? 'lentils cooked' : 'brown rice cooked');
    queries.add('quinoa cooked');
  }

  return [...queries].slice(0, 6);
}

async function fetchUsdaCandidates(signals, mealType, profile) {
  const queries = buildUsdaQueries(signals, mealType, profile);
  if (queries.length === 0) return [];

  const settled = await Promise.allSettled(
    queries.map((query) => usdaClient.searchByName(query))
  );

  const candidates = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
    for (const food of result.value.slice(0, 2)) {
      const name = food.description
        ?.toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      if (!name) continue;

      const attrs = inferFoodAttributes({ name });
      candidates.push({
        id: `usda_${food.fdcId}`,
        name,
        category: 'meal',
        mealTypes: [mealType],
        nutrition: {
          calories: Number(food.macros?.calories_kcal) || 0,
          protein: Number(food.macros?.protein_g) || 0,
          carbs: Number(food.macros?.carbs_g) || 0,
          fat: Number(food.macros?.fat_g) || 0,
          fiber: Number(food.macros?.fiber_g) || 0,
          sugar: Number(food.macros?.sugar_g) || 0,
          sodium: Number(food.macros?.sodium_mg) || 0,
        },
        tags: attrs.tags,
        prepTime: 15,
        satiety: attrs.tags.includes('high-protein') || attrs.tags.includes('fiber-rich') ? 7 : 5,
        moodBoost: attrs.moodBoost,
        hydrating: attrs.hydrating,
        cuisineTags: attrs.cuisineTags,
        source: 'usda',
        sourceId: food.fdcId,
        portion: food.servingText || '100g',
        nutritionSource: {
          provider: 'USDA FoodData Central',
          fdcId: food.fdcId,
          dataType: food.dataType,
          brandOwner: food.brandOwner || null,
        },
      });
    }
  }

  return candidates;
}

function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
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
function mergeCandidates(historyFoods, acceptedFoods, catalogueFoods, mealType, cfCandidates = []) {
  /** @type {Map<string, {food: object, weight: number}>} */
  const seen = new Map();

  const register = (food, weight) => {
    const key = dedupeKey(food.name);
    const existing = seen.get(key);
    if (!existing || weight > existing.weight) {
      seen.set(key, { food: { ...food }, weight });
    }
  };

  // Register in ascending priority so higher-priority items overwrite.
  // CF candidates (1.2×) slot between catalogue and accepted — they are
  // validated by peer behaviour but less authoritative than this user's own history.
  for (const f of catalogueFoods)  register(f, 1.0);
  for (const f of cfCandidates)    register(f, 1.2);
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

  // Fetch all data sources in parallel:
  //   - user food history (30-day)
  //   - accepted recommendations (for CF seed + source weight)
  //   - rejection history (for penalty scoring)
  const [historyFoods, acceptedFoods, rejectedFoodNames] = await Promise.all([
    fetchUserHistoryFoods(userId),
    fetchAcceptedRecommendations(userId),
    fetchRejectedFoodNames(userId),
  ]);

  // Wire rejection learning and micronutrient urgency into scoring signals
  enrichedSignals.rejectedFoodNames = rejectedFoodNames;
  // microUrgencySignals may already be set by the caller (recommendations.js)
  // via enrichedSignals spread; preserve it if present
  enrichedSignals.microUrgencySignals = signals.microUrgencySignals ?? {};

  // Collaborative filtering: surface foods accepted by similar users
  // Run in parallel with catalogue assembly — non-blocking fallback on error
  const acceptedFoodNames = acceptedFoods.map((f) => f.name);
  const cfCandidatesPromise = getCollaborativeCandidates(userId, acceptedFoodNames, { limit: 8 })
    .catch(() => []);
  const usdaCandidatesPromise = withTimeout(
    fetchUsdaCandidates(enrichedSignals, enrichedSignals.mealType, profile),
    USDA_CANDIDATE_TIMEOUT_MS,
    []
  )
    .catch((err) => {
      console.warn('[candidateGenerationService] USDA candidates unavailable:', err.message);
      return [];
    });

  // Filter catalogue to relevant meal type first for efficiency
  const catalogueFoods = FOOD_CATALOGUE.map((f) => ({
    ...f,
    source: 'catalogue',
    portion: '1 serving',
  }));

  const [cfCandidates, usdaCandidates] = await Promise.all([
    cfCandidatesPromise,
    usdaCandidatesPromise,
  ]);

  // Merge and deduplicate: history > accepted > CF > catalogue
  const merged = mergeCandidates(
    historyFoods,
    acceptedFoods,
    [...usdaCandidates, ...catalogueFoods],
    enrichedSignals.mealType,
    cfCandidates
  );

  // Score each candidate, applying source weight multiplier
  const scored = merged.map((candidate) => {
    const baseScore = scoreCandidate(candidate, enrichedSignals);
    if (!Number.isFinite(baseScore)) return null;
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
      sourceId: candidate.sourceId ?? null,
      nutritionSource: candidate.nutritionSource ?? {
        provider: candidate.source === 'usda' ? 'USDA FoodData Central' : 'MFT verified catalogue',
        id: candidate.id,
      },
      portion: candidate.portion ?? '1 serving',
      mealTypes: candidate.mealTypes ?? [],
      cuisineTags: candidate.cuisineTags ?? [],
      allergenRisk: detectAllergenRisk(candidate, enrichedSignals.allergies),
    };
  }).filter(Boolean);

  // Sort descending by score, then alphabetically as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, limit);
}
