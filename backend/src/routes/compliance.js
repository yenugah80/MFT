/**
 * Compliance Routes
 * Tracks dietary compliance and provides analytics for user preferences
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
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
 * Points deducted per allergen violation, keyed by severity.
 *
 * anaphylaxis / severe → full 100-point penalty (safety-critical)
 * moderate             → 75-point penalty
 * mild                 → 40-point penalty
 * intolerance type     → halves the penalty (body can handle it, just uncomfortable)
 * preference type      → treated like a dietary mismatch, not a safety issue
 */
const SEVERITY_PENALTY = {
  anaphylaxis: 100,
  severe:      100,
  moderate:     75,
  mild:         40,
};

function allergenPenalty(allergen, allergenSeverity, intoleranceType) {
  const severity = (allergenSeverity || {})[allergen] || 'moderate';
  const type     = (intoleranceType  || {})[allergen] || 'allergy';

  if (type === 'preference') return 15; // soft penalty — just a dislike

  const basePenalty = SEVERITY_PENALTY[severity] ?? 75;
  // Intolerance is physically unpleasant but not life-threatening — halve penalty
  return type === 'intolerance' ? Math.round(basePenalty * 0.5) : basePenalty;
}

/**
 * Calculate daily compliance score based on user preferences.
 *
 * Algorithm (severity-aware):
 * - Allergen violation penalty depends on severity + intolerance/allergy/preference type
 * - Dietary preference match = weighted by preference strength
 * - Score = 100 - avg_penalty_per_meal clamped to [0, 100]
 */
function calculateDailyCompliance(meals, dietaryProfile) {
  if (!meals || meals.length === 0) return 100;

  const {
    preferences    = [],
    allergies      = [],
    allergenSeverity = {},
    intoleranceType  = {},
  } = dietaryProfile;

  let totalScore = 0;
  let maxScore   = 0;

  meals.forEach(meal => {
    const mealAllergens  = meal.allergens  || [];
    const mealDietLabels = meal.dietLabels || [];

    // --- Allergen violations ---
    const violatedAllergens = mealAllergens.filter(a => allergies.includes(a));

    if (violatedAllergens.length > 0) {
      // Take the worst violation in this meal
      const maxPenalty = Math.max(
        ...violatedAllergens.map(a => allergenPenalty(a, allergenSeverity, intoleranceType))
      );
      maxScore   += 100;
      totalScore += Math.max(0, 100 - maxPenalty);
      return;
    }

    // --- Dietary preference compliance ---
    const matchingPrefs = preferences.filter(pref => {
      const prefId = typeof pref === 'string' ? pref : pref.id;
      return mealDietLabels.includes(prefId);
    });

    const compliancePoints = preferences.length > 0
      ? (matchingPrefs.length / preferences.length) * 100
      : 100;

    totalScore += compliancePoints;
    maxScore   += 100;
  });

  return maxScore > 0 ? Math.round(totalScore / maxScore) : 100;
}

export default router;
