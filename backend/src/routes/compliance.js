/**
 * Compliance Routes
 * Tracks dietary compliance and provides analytics for user preferences
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { and, eq, gte, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { foodLogTable, dietaryPreferencesTable } from '../db/schema.js';

const router = express.Router();

/**
 * GET /api/nutrition/compliance-history
 * Get daily compliance scores for last 30 days (or custom period)
 */
router.get('/compliance-history', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch user's dietary preferences
    const dietary = await db
      .select()
      .from(dietaryPreferencesTable)
      .where(eq(dietaryPreferencesTable.userId, userId))
      .limit(1);

    if (!dietary || dietary.length === 0) {
      return res.json({ success: true, history: [] });
    }

    // Fetch meals for date range
    const meals = await db
      .select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(desc(foodLogTable.loggedDate));

    // Group by date and calculate compliance
    const mealsByDate = {};
    meals.forEach(meal => {
      const dateStr = meal.loggedDate.toISOString().split('T')[0];
      if (!mealsByDate[dateStr]) {
        mealsByDate[dateStr] = [];
      }
      mealsByDate[dateStr].push(meal);
    });

    // Calculate compliance for each day
    const history = Object.entries(mealsByDate).map(([date, dayMeals]) => {
      const score = calculateDailyCompliance(dayMeals, dietary[0]);
      return {
        date,
        score,
        mealCount: dayMeals.length
      };
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, history });
  } catch (error) {
    console.error('[Compliance] History error:', error);
    res.status(500).json({ error: 'Failed to fetch compliance history' });
  }
});

/**
 * Calculate daily compliance score based on user preferences
 *
 * Algorithm:
 * - Allergen violation = 0 points (critical)
 * - Dietary preference match = weighted by preference strength
 * - Score = (compliant_meals / total_meals) * 100
 */
function calculateDailyCompliance(meals, dietaryProfile) {
  if (!meals || meals.length === 0) {
    return 100; // No meals logged = perfect compliance
  }

  const { preferences = [], allergies = [] } = dietaryProfile;

  let totalScore = 0;
  let maxScore = 0;

  meals.forEach(meal => {
    // Extract dietary info from meal
    const mealAllergens = meal.allergens || [];
    const mealDietLabels = meal.dietLabels || [];

    // CRITICAL: Check for allergen violations
    const hasAllergen = mealAllergens.some(a =>
      allergies.includes(a)
    );

    if (hasAllergen) {
      // Allergen violation = 0 points (critical safety issue)
      maxScore += 100;
      totalScore += 0;
      return;
    }

    // Check dietary preference compliance
    const matchingPrefs = preferences.filter(pref => {
      const prefId = typeof pref === 'string' ? pref : pref.id;
      return mealDietLabels.includes(prefId);
    });

    // Calculate compliance points
    const compliancePoints = preferences.length > 0
      ? (matchingPrefs.length / preferences.length) * 100
      : 100; // No preferences = compliant

    totalScore += compliancePoints;
    maxScore += 100;
  });

  return maxScore > 0 ? Math.round((totalScore / maxScore)) : 100;
}

export default router;
