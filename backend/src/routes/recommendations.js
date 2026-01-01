/**
 * Recommendations API Routes
 * Provides AI-powered personalized food recommendations based on:
 * - User's remaining budget (calories, macros)
 * - Time of day
 * - Regional preferences
 * - Meal history
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { OpenAIClient } from '../services/apiClients/OpenAIClient.js';
import { getProfile } from '../controllers/profileController.js';

const router = express.Router();
const openAI = new OpenAIClient();

/**
 * GET /api/recommendations
 * Get personalized food recommendations
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { limit = 5 } = req.query;

    // Fetch user profile for personalization
    const profileRes = await fetch(`${process.env.API_URL}/profiles/me`, {
      headers: { Authorization: req.headers.authorization },
    });
    const profile = profileRes.ok ? await profileRes.json() : null;

    // Fetch today's nutrition data
    const dashboardRes = await fetch(`${process.env.API_URL}/nutrition/dashboard`, {
      headers: { Authorization: req.headers.authorization },
    });
    const dashboard = dashboardRes.ok ? await dashboardRes.json() : null;

    // Calculate remaining budget
    const goals = profile?.goals || {};
    const today = dashboard?.today || {};
    const nutrition = today?.nutrition || {};

    const remainingBudget = {
      calories: Math.max(0, (goals.dailyCalories || 2000) - (nutrition.totalCalories || 0)),
      protein: Math.max(0, (goals.proteinG || 150) - (nutrition.totalProtein || 0)),
      carbs: Math.max(0, (goals.carbsG || 225) - (nutrition.totalCarbs || 0)),
      fats: Math.max(0, (goals.fatsG || 65) - (nutrition.totalFats || 0)),
      water: Math.max(0, (goals.waterLiters || 2.0) - (today.waterIntakeLiters || 0)),
    };

    // Determine recommendation type based on budget
    const getRecommendationType = () => {
      if (remainingBudget.protein > 50) return 'PROTEIN_BOOST';
      if (remainingBudget.calories < 200) return 'LIGHT_SNACK';
      if (remainingBudget.water > 1) return 'HYDRATION';
      if (profile?.dietary?.cuisinePreference?.[0]) return 'REGIONAL_PICK';
      return 'BALANCED_MEAL';
    };

    const recType = getRecommendationType();
    const hour = new Date().getHours();
    let mealType = 'snack';
    if (hour >= 5 && hour < 11) mealType = 'breakfast';
    else if (hour >= 11 && hour < 15) mealType = 'lunch';
    else if (hour >= 17 && hour < 22) mealType = 'dinner';

    // Generate recommendations using OpenAI
    const recommendations = await generateRecommendations(
      recType,
      mealType,
      remainingBudget,
      profile,
      parseInt(limit)
    );

    res.json({
      success: true,
      recommendations,
      remainingBudget,
      recommendationType: recType,
      mealType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * Generate recommendations using AI
 */
async function generateRecommendations(
  recType,
  mealType,
  remainingBudget,
  profile,
  limit
) {
  const cuisinePreference = profile?.dietary?.cuisinePreference?.[0] || 'General';
  const region = profile?.dietary?.region || 'General';

  const prompt = `You are a personalized nutrition recommendation system.

User Profile:
- Remaining Calories: ${remainingBudget.calories} kcal
- Remaining Protein: ${remainingBudget.protein}g
- Remaining Carbs: ${remainingBudget.carbs}g
- Remaining Fats: ${remainingBudget.fats}g
- Cuisine Preference: ${cuisinePreference}
- Region: ${region}
- Meal Type: ${mealType}

Recommendation Type: ${recType}

Generate ${limit} specific food recommendations that:
1. Fit within their remaining budget
2. Match their cuisine and regional preferences
3. Are appropriate for the meal type (${mealType})
4. Have clear nutritional benefits based on their needs

For each recommendation include:
- Food name
- Portion size
- Calories
- Protein (g)
- Carbs (g)
- Fats (g)
- Brief reason why it's recommended
- Preparation tips

Return as JSON array with objects: { foodName, portion, calories, protein, carbs, fats, reason, tips }`;

  try {
    const response = await openAI.chatCompletionJSON(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1000 }
    );

    const recommendations = response.recommendations || [];

    // Enrich with additional metadata
    return recommendations.map((rec, idx) => ({
      id: `rec-${Date.now()}-${idx}`,
      title: getTitleForType(recType),
      ...rec,
      color: getColorForType(recType),
      rank: idx + 1,
      timeToAdd: Math.max(5, 15 - idx * 2), // Minutes to log
    }));
  } catch (error) {
    console.error('[Recommendations] AI generation failed:', error);
    // Return fallback recommendations
    return getFallbackRecommendations(recType, mealType, remainingBudget, limit);
  }
}

/**
 * Fallback recommendations (cached/curated)
 */
function getFallbackRecommendations(recType, mealType, remainingBudget, limit) {
  const fallbacks = {
    PROTEIN_BOOST: [
      {
        foodName: 'Grilled Chicken Breast',
        portion: '150g',
        calories: 165,
        protein: 31,
        carbs: 0,
        fats: 3.6,
        reason: 'Lean protein, minimal fat',
        tips: 'Season with herbs, grill for 6-8 minutes per side',
      },
      {
        foodName: 'Greek Yogurt',
        portion: '200g',
        calories: 130,
        protein: 23,
        carbs: 9,
        fats: 0.4,
        reason: 'High protein, probiotic',
        tips: 'Top with berries for added fiber',
      },
      {
        foodName: 'Salmon Fillet',
        portion: '100g',
        calories: 206,
        protein: 22,
        carbs: 0,
        fats: 13,
        reason: 'Omega-3 rich protein',
        tips: 'Bake at 400°F for 12-15 minutes',
      },
    ],
    BALANCED_MEAL: [
      {
        foodName: 'Quinoa Buddha Bowl',
        portion: '1 serving (250g)',
        calories: 380,
        protein: 14,
        carbs: 52,
        fats: 12,
        reason: 'Complete amino acid profile',
        tips: 'Mix with roasted vegetables and tahini dressing',
      },
      {
        foodName: 'Brown Rice & Beans',
        portion: '1 cup cooked',
        calories: 215,
        protein: 8,
        carbs: 45,
        fats: 1,
        reason: 'Complete protein combination',
        tips: 'Season with cumin and lime juice',
      },
    ],
    LIGHT_SNACK: [
      {
        foodName: 'Apple with Almond Butter',
        portion: '1 medium apple + 1 tbsp',
        calories: 195,
        protein: 4,
        carbs: 25,
        fats: 9,
        reason: 'Quick energy, healthy fats',
        tips: 'Slice apple and dip in almond butter',
      },
      {
        foodName: 'Rice Cakes with Cheese',
        portion: '2 cakes + 1 oz cheese',
        calories: 150,
        protein: 6,
        carbs: 14,
        fats: 8,
        reason: 'Light, satisfying snack',
        tips: 'Use low-fat cheese for fewer calories',
      },
    ],
    HYDRATION: [
      {
        foodName: 'Water with Lemon',
        portion: '500ml',
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        reason: 'Zero calories, aids digestion',
        tips: 'Drink throughout the day',
      },
      {
        foodName: 'Green Tea',
        portion: '250ml',
        calories: 2,
        protein: 0,
        carbs: 0,
        fats: 0,
        reason: 'Hydration + antioxidants',
        tips: 'Brew for 3-5 minutes',
      },
    ],
    REGIONAL_PICK: [
      {
        foodName: 'Idli with Sambar',
        portion: '2 idlis + 1 bowl',
        calories: 180,
        protein: 6,
        carbs: 38,
        fats: 1,
        reason: 'Regional favorite, light',
        tips: 'Steam idlis fresh for best taste',
      },
      {
        foodName: 'Roti with Dal',
        portion: '2 rotis + 1 cup dal',
        calories: 240,
        protein: 12,
        carbs: 42,
        fats: 2,
        reason: 'Complete protein, traditional',
        tips: 'Add turmeric and cumin to dal',
      },
    ],
  };

  return (fallbacks[recType] || fallbacks.BALANCED_MEAL).slice(0, limit);
}

/**
 * Get title for recommendation type
 */
function getTitleForType(type) {
  const titles = {
    PROTEIN_BOOST: '💪 Protein Boost',
    BALANCED_MEAL: '🥗 Balanced Meal',
    LIGHT_SNACK: '🍎 Light Snack',
    HYDRATION: '💧 Hydration',
    REGIONAL_PICK: '🌍 Regional Pick',
  };
  return titles[type] || titles.BALANCED_MEAL;
}

/**
 * Get gradient colors for recommendation type
 */
function getColorForType(type) {
  const colors = {
    PROTEIN_BOOST: ['#FBBF24', '#F59E0B'],
    BALANCED_MEAL: ['#86EFAC', '#22C55E'],
    LIGHT_SNACK: ['#A7F3D0', '#10B981'],
    HYDRATION: ['#BFDBFE', '#3B82F6'],
    REGIONAL_PICK: ['#E9D5FF', '#8B5CF6'],
  };
  return colors[type] || colors.BALANCED_MEAL;
}

export default router;
