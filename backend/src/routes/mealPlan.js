/**
 * Meal Planning Route
 * POST /api/meal-plan — generate a weekly meal plan + grocery list using OpenAI
 * GET  /api/meal-plan/saved — retrieve the user's last saved plan
 * POST /api/meal-plan/save  — persist a generated plan
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { db } from '../config/db.js';
import { nutritionGoalsTable, dietaryPreferencesTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { safeJSONCompletion } from '../services/apiClients/SafeOpenAIWrapper.js';
import { sql } from 'drizzle-orm';

const router = express.Router();
router.use(requireAuth());

// ─────────────────────────────────────────────────────────────
// POST /api/meal-plan  — generate a weekly plan
// ─────────────────────────────────────────────────────────────
router.post('/', aiLimiter, async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const {
      days = 7,
      mealsPerDay = 3,
      cuisine,         // optional override
      goal,            // optional override: 'lose' | 'maintain' | 'gain'
    } = req.body;

    const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 7);
    const safeMeals = Math.min(Math.max(parseInt(mealsPerDay, 10) || 3, 2), 5);

    // Fetch user goals and dietary prefs in parallel
    const [goalsRow, prefsRow] = await Promise.all([
      db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId)).limit(1),
      db.select().from(dietaryPreferencesTable).where(eq(dietaryPreferencesTable.userId, userId)).limit(1),
    ]);

    const goals = goalsRow[0] || {};
    const prefs = prefsRow[0] || {};

    const targetCalories = goals.dailyCalories || 2000;
    const targetProtein  = goals.proteinG      || 150;
    const targetCarbs    = goals.carbsG        || 250;
    const targetFat      = goals.fatG          || 65;
    const primaryGoal    = goal || goals.primaryGoal || 'maintain';

    const restrictions  = (Array.isArray(prefs.preferences) ? prefs.preferences : []).join(', ') || 'none';
    const allergens     = (Array.isArray(prefs.allergies)   ? prefs.allergies   : []).join(', ') || 'none';
    const dislikes      = (Array.isArray(prefs.dislikes)    ? prefs.dislikes    : []).join(', ') || 'none';
    const cuisinePref   = cuisine || 'balanced (include variety)';

    const systemPrompt = `You are a registered dietitian creating personalized meal plans.
Return ONLY valid JSON matching the schema below — no markdown, no explanations.

Schema:
{
  "plan": [
    {
      "day": 1,
      "date_label": "Monday",
      "meals": [
        {
          "meal_type": "breakfast"|"lunch"|"dinner"|"snack",
          "name": "Oatmeal with Berries",
          "description": "Brief description",
          "prep_time_min": 10,
          "calories": 350,
          "protein_g": 12,
          "carbs_g": 55,
          "fat_g": 8,
          "ingredients": ["1 cup oats", "1/2 cup blueberries", "1 tbsp honey"]
        }
      ],
      "day_totals": { "calories": 1850, "protein_g": 145, "carbs_g": 230, "fat_g": 60 }
    }
  ],
  "grocery_list": {
    "produce": ["item 1", "item 2"],
    "proteins": [],
    "grains": [],
    "dairy": [],
    "pantry": []
  },
  "weekly_summary": {
    "avg_daily_calories": 1900,
    "avg_protein_g": 148,
    "avg_carbs_g": 235,
    "avg_fat_g": 62
  }
}`;

    const userPrompt = `Create a ${safeDays}-day meal plan with ${safeMeals} meals per day.

NUTRITION TARGETS (per day):
- Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g
- Carbs: ${targetCarbs}g
- Fat: ${targetFat}g
- Goal: ${primaryGoal} weight

CONSTRAINTS:
- Dietary restrictions: ${restrictions}
- Allergens to AVOID: ${allergens}
- Disliked foods: ${dislikes}
- Cuisine preference: ${cuisinePref}

RULES:
1. Each day's totals must sum within ±10% of daily targets
2. Vary the meals — no repeated dishes across the week
3. Include realistic prep times
4. Grocery list must cover ALL ingredients for all ${safeDays} days
5. Keep meals practical for home cooking`;

    const plan = await safeJSONCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 4000, maxRetries: 1 }
    );

    // Basic validation
    if (!plan?.plan || !Array.isArray(plan.plan)) {
      return res.status(500).json({ error: 'Failed to generate a valid meal plan. Please retry.' });
    }

    res.json({
      success: true,
      days: safeDays,
      mealsPerDay: safeMeals,
      generatedAt: new Date().toISOString(),
      targetNutrition: { calories: targetCalories, protein_g: targetProtein, carbs_g: targetCarbs, fat_g: targetFat },
      ...plan,
    });

  } catch (error) {
    console.error('[MealPlan] Generation error:', error);
    res.status(500).json({ error: 'Meal plan generation failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/meal-plan/save  — persist a plan for a user
// ─────────────────────────────────────────────────────────────
router.post('/save', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'plan is required' });

    await db.execute(sql`
      INSERT INTO saved_meal_plans (user_id, plan_data, saved_at)
      VALUES (${userId}, ${JSON.stringify(plan)}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET plan_data = ${JSON.stringify(plan)}::jsonb, saved_at = NOW()
    `);

    res.json({ success: true });
  } catch (error) {
    // Table may not exist yet — return success so mobile doesn't break
    console.error('[MealPlan] Save error (table may not exist):', error.message);
    res.json({ success: true, warning: 'Plan not persisted — table pending migration' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/meal-plan/saved  — retrieve latest saved plan
// ─────────────────────────────────────────────────────────────
router.get('/saved', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const result = await db.execute(sql`
      SELECT plan_data, saved_at
      FROM saved_meal_plans
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ plan: null });
    }

    res.json({
      plan: result.rows[0].plan_data,
      savedAt: result.rows[0].saved_at,
    });
  } catch (error) {
    console.error('[MealPlan] Fetch error:', error.message);
    res.json({ plan: null });
  }
});

export default router;
