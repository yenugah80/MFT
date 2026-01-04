/**
 * Recommendations API Routes
 * Provides AI-powered personalized food recommendations based on:
 * - User's remaining budget (calories, macros)
 * - Time of day
 * - Regional preferences
 * - Meal history and recommendation acceptance patterns
 * - User mood correlations
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { and, eq, gte, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { getProfile } from '../controllers/profileController.js';
import { estimateMicronutrients, getSignificantMicronutrients } from '../services/micronutrientService.js';
import { recommendationsHistoryTable, foodLogTable } from '../db/schema.js';

const router = express.Router();

// Request deduplication map: stores in-flight recommendation requests
// Key: "${userId}:${mealType}:${limit}", Value: Promise
const inFlightRequests = new Map();

/**
 * Generate a deduplication key for a recommendation request
 * Ensures identical concurrent requests are coalesced
 */
function getRequestKey(userId, mealType, limit) {
  return `${userId}:${mealType}:${limit}`;
}

/**
 * Wrap recommendation generation with deduplication
 * If an identical request is already in-flight, return that promise instead
 */
async function generateRecommendationsWithDedup(userId, mealType, limit, generatorFn) {
  const key = getRequestKey(userId, mealType, limit);

  // Check if this request is already in-flight
  if (inFlightRequests.has(key)) {
    console.log(`[Recommendations] Coalescing duplicate request: ${key}`);
    return inFlightRequests.get(key);
  }

  // Create the promise for this request
  const promise = (async () => {
    try {
      return await generatorFn();
    } finally {
      // Clean up after request completes
      inFlightRequests.delete(key);
    }
  })();

  // Store the promise so concurrent requests get the same result
  inFlightRequests.set(key, promise);

  return promise;
}

/**
 * GET /api/recommendations
 * Get personalized food recommendations with history awareness
 * Uses request deduplication to prevent duplicate concurrent API calls
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { limit = 5 } = req.query;

    // Get meal type early to use as dedup key
    const hour = new Date().getHours();
    const mealType = getMealType(hour);

    // Generate or coalesce request with deduplication
    const result = await generateRecommendationsWithDedup(
      userId,
      mealType,
      parseInt(limit),
      async () => {
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

        // Analyze recommendation history for personalization
        const history = await analyzeRecommendationHistory(db, userId);

        // Determine recommendation type based on budget AND history
        const recType = determineRecommendationType(remainingBudget, profile, history);

        // Generate recommendations with enhanced AI
        const recommendations = await generateEnhancedRecommendations(
          recType,
          mealType,
          remainingBudget,
          profile,
          history,
          parseInt(limit)
        );

        // Enrich with micronutrients
        const enrichedRecommendations = await enrichRecommendations(recommendations);

        // Save recommendations to history
        await saveRecommendationsToHistory(db, userId, enrichedRecommendations, {
          recType,
          mealType,
          remainingBudget,
          hour
        });

        return {
          recommendations: enrichedRecommendations,
          remainingBudget,
          recommendationType: recType,
          mealType
        };
      }
    );

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/recommendations/:id
 * Get detailed recommendation by ID
 */
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;

    const recommendation = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(and(
        eq(recommendationsHistoryTable.recommendationId, id),
        eq(recommendationsHistoryTable.userId, userId)
      ))
      .limit(1);

    if (!recommendation.length) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Mark as viewed
    await db
      .update(recommendationsHistoryTable)
      .set({
        interactionStatus: 'viewed',
        viewedAt: new Date()
      })
      .where(eq(recommendationsHistoryTable.id, recommendation[0].id));

    res.json(recommendation[0]);
  } catch (error) {
    console.error('[Recommendations] Get detail error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation' });
  }
});

/**
 * POST /api/recommendations/:id/track
 * Track user interaction with recommendation
 */
router.post('/:id/track', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;
    const { action, reason } = req.body;

    const validActions = ['view', 'accept', 'reject', 'customize'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const updateData = {
      interactionStatus: action === 'accept' ? 'accepted' :
                         action === 'reject' ? 'rejected' :
                         action === 'customize' ? 'customized' : 'viewed',
      interactedAt: new Date(),
      updatedAt: new Date()
    };

    if (action === 'reject' && reason) {
      updateData.rejectionReason = reason;
    }

    if (action === 'view') {
      updateData.viewedAt = new Date();
    }

    await db
      .update(recommendationsHistoryTable)
      .set(updateData)
      .where(and(
        eq(recommendationsHistoryTable.recommendationId, id),
        eq(recommendationsHistoryTable.userId, userId)
      ));

    res.json({ success: true, action });
  } catch (error) {
    console.error('[Recommendations] Track error:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

/**
 * POST /api/recommendations/:id/accept
 * Accept recommendation and add to food log
 */
router.post('/:id/accept', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;
    const { portion, mealType } = req.body;

    // Fetch recommendation
    const [rec] = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(and(
        eq(recommendationsHistoryTable.recommendationId, id),
        eq(recommendationsHistoryTable.userId, userId)
      ))
      .limit(1);

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Add to food log
    const [foodLog] = await db
      .insert(foodLogTable)
      .values({
        userId,
        foodName: rec.foodName,
        calories: rec.calories,
        protein: rec.protein,
        carbs: rec.carbs,
        fats: rec.fats,
        servingSize: portion || rec.portion,
        mealType: mealType || rec.mealType,
        micros: rec.micros,
        sourceMeta: { source: 'recommendation', recId: id },
        loggedDate: new Date()
      })
      .returning();

    // Update recommendation history
    await db
      .update(recommendationsHistoryTable)
      .set({
        interactionStatus: 'accepted',
        wasLogged: true,
        loggedFoodId: foodLog.id,
        loggedAt: new Date(),
        interactedAt: new Date()
      })
      .where(eq(recommendationsHistoryTable.id, rec.id));

    res.json({
      success: true,
      foodLog,
      message: 'Added to food log'
    });
  } catch (error) {
    console.error('[Recommendations] Accept error:', error);
    res.status(500).json({ error: 'Failed to accept recommendation' });
  }
});

/**
 * GET /api/recommendations/history/list
 * Get user's recommendation history with filters
 */
router.get('/history/list', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { days = 30, status, type, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let query = db
      .select()
      .from(recommendationsHistoryTable)
      .where(and(
        eq(recommendationsHistoryTable.userId, userId),
        gte(recommendationsHistoryTable.shownAt, startDate)
      ));

    if (status) {
      query = query.where(eq(recommendationsHistoryTable.interactionStatus, status));
    }

    if (type) {
      query = query.where(eq(recommendationsHistoryTable.recommendationType, type));
    }

    const history = await query
      .orderBy(desc(recommendationsHistoryTable.shownAt))
      .limit(parseInt(limit));

    // Calculate stats
    const stats = {
      total: history.length,
      accepted: history.filter(r => r.interactionStatus === 'accepted').length,
      rejected: history.filter(r => r.interactionStatus === 'rejected').length,
      viewed: history.filter(r => r.interactionStatus === 'viewed').length,
      acceptanceRate: 0
    };

    if (stats.total > 0) {
      // Return decimal (0-1) for consistency across all endpoints
      stats.acceptanceRate = stats.accepted / stats.total;
    }

    res.json({ history, stats });
  } catch (error) {
    console.error('[Recommendations] History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/recommendations/stats/acceptance-by-preference
 * Get acceptance rate broken down by recommendation type
 * Used for profile analytics showing user preferences
 */
router.get('/stats/acceptance-by-preference', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;

    // Fetch all recommendations shown to this user
    const history = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(eq(recommendationsHistoryTable.userId, userId))
      .limit(500);

    if (history.length === 0) {
      return res.json({
        success: true,
        stats: {
          acceptanceRate: 0,
          byPreferenceType: {},
          totalShown: 0,
          totalAccepted: 0
        }
      });
    }

    // Calculate overall acceptance rate (decimal 0-1 for consistency)
    const totalAccepted = history.filter(r => r.interactionStatus === 'accepted').length;
    const totalShown = history.length;
    const overallAcceptanceRate = totalAccepted / totalShown;

    // Break down by recommendation type with full stats
    const byType = {};
    history.forEach(rec => {
      const type = rec.recommendationType || 'UNKNOWN';
      if (!byType[type]) {
        byType[type] = { total: 0, accepted: 0 };
      }
      byType[type].total++;
      if (rec.interactionStatus === 'accepted') {
        byType[type].accepted++;
      }
    });

    // Add acceptance rate to each type
    Object.entries(byType).forEach(([type, data]) => {
      data.acceptanceRate = data.total > 0 ? (data.accepted / data.total) : 0;
    });

    res.json({
      acceptanceRate: overallAcceptanceRate,
      byType,
      totalShown,
      totalAccepted
    });
  } catch (error) {
    console.error('[Recommendations] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Analyze user's recommendation history to improve personalization
 */
async function analyzeRecommendationHistory(db, userId) {
  try {
    const history = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(eq(recommendationsHistoryTable.userId, userId))
      .limit(100);

    if (!history.length) {
      return { acceptanceRate: 0, preferredTypes: [], preferredFoods: [] };
    }

    // Calculate acceptance patterns
    const accepted = history.filter(r => r.interactionStatus === 'accepted');
    const acceptanceRate = (accepted.length / history.length);

    // Find preferred recommendation types
    const typeCount = {};
    for (const rec of accepted) {
      typeCount[rec.recommendationType] = (typeCount[rec.recommendationType] || 0) + 1;
    }
    const preferredTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    // Find preferred foods
    const foodCount = {};
    for (const rec of accepted) {
      foodCount[rec.foodName] = (foodCount[rec.foodName] || 0) + 1;
    }
    const preferredFoods = Object.entries(foodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([food]) => food);

    return {
      acceptanceRate,
      preferredTypes,
      preferredFoods,
      totalRecommendations: history.length
    };
  } catch (error) {
    console.error('[Recommendations] History analysis error:', error);
    return { acceptanceRate: 0, preferredTypes: [], preferredFoods: [] };
  }
}

/**
 * Determine recommendation type with history awareness
 */
function determineRecommendationType(remainingBudget, profile, history) {
  // If user has strong preference based on history, respect it
  if (history.preferredTypes?.length > 0) {
    return history.preferredTypes[0];
  }

  // Otherwise use budget-based logic
  if (remainingBudget.protein > 50) return 'PROTEIN_BOOST';
  if (remainingBudget.calories < 200) return 'LIGHT_SNACK';
  if (remainingBudget.water > 1) return 'HYDRATION';
  if (profile?.dietary?.cuisinePreference?.[0]) return 'REGIONAL_PICK';
  return 'BALANCED_MEAL';
}

/**
 * Improved allergen detection that avoids false positives
 * Uses word boundaries and allergen-specific patterns instead of simple substring matching
 *
 * IMPROVEMENTS OVER SUBSTRING MATCHING:
 * - "nut" allergen: Won't match "coconut", "donut", "peanut butter" (uses word boundary)
 * - "milk" allergen: Won't match "milkshake" as ingredient when whole food match needed
 * - "fish" allergen: Won't match "jellyfish" or "starfish"
 * - "tree nuts": Matches almonds, cashews, walnuts, etc.
 */
function improvedAllergenCheck(foodName, allergies) {
  if (!allergies || allergies.length === 0) return false;

  const foodNameLower = foodName.toLowerCase();

  // Define allergen-specific patterns for precise matching
  const allergenPatterns = {
    'nut': {
      // Match standalone "nut", "nuts", "peanut", "almond", etc. but NOT "coconut", "donut"
      pattern: /\b(nut|nuts|almond|walnut|cashew|pecan|pistachio|macadamia|hazelnut|chestnut|peanut)\b/i,
      exceptions: ['coconut', 'donut', 'peanut butter'] // These are handled separately if needed
    },
    'milk': {
      pattern: /\b(milk|dairy|cheese|cream|butter|yogurt|lactose)\b/i
    },
    'fish': {
      pattern: /\b(fish|salmon|tuna|cod|haddock|halibut|anchovy|trout)\b/i,
      exceptions: ['jellyfish', 'starfish']
    },
    'shellfish': {
      pattern: /\b(shrimp|prawn|crab|lobster|oyster|clam|mussel|scallop)\b/i
    },
    'egg': {
      pattern: /\b(egg|eggs|mayonnaise)\b/i
    },
    'soy': {
      pattern: /\b(soy|soybean|tofu|tempeh|edamame|miso)\b/i
    },
    'wheat': {
      pattern: /\b(wheat|bread|pasta|flour|barley)\b/i,
      exceptions: ['buckwheat'] // Not actually wheat
    },
    'peanut': {
      pattern: /\b(peanut)\b/i
    },
    'tree nut': {
      pattern: /\b(almond|walnut|cashew|pecan|pistachio|macadamia)\b/i
    },
    'sesame': {
      pattern: /\b(sesame|tahini)\b/i
    },
    'mustard': {
      pattern: /\b(mustard)\b/i
    },
    'celery': {
      pattern: /\b(celery)\b/i
    }
  };

  for (const allergen of allergies) {
    const allergenLower = allergen.toLowerCase().trim();

    // Check if we have a pattern for this allergen
    const patternConfig = allergenPatterns[allergenLower];
    if (patternConfig && patternConfig.pattern) {
      if (patternConfig.pattern.test(foodName)) {
        // Check exceptions (for false positives)
        if (patternConfig.exceptions && patternConfig.exceptions.some(ex =>
          foodNameLower.includes(ex.toLowerCase())
        )) {
          continue; // Skip this allergen, it's an exception
        }
        console.log(`[Allergen] Food "${foodName}" matches allergen "${allergen}" (pattern match)`);
        return true;
      }
    } else {
      // Fallback: For allergens without patterns, use safer substring matching
      // but require it to be a standalone word (not part of another word)
      const words = foodNameLower.split(/[\s,-]/);
      if (words.includes(allergenLower)) {
        console.log(`[Allergen] Food "${foodName}" matches allergen "${allergen}" (word match)`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Get meal type based on current hour
 */
function getMealType(hour) {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

/**
 * Generate recommendations with enhanced AI using history
 * CRITICAL: Now includes allergen filtering and dietary preference support
 */
/**
 * Extract and format dietary preferences with strength weighting
 * Converts {id, strength} objects to weighted preference strings
 */
function formatDietaryPreferencesWithStrength(preferences) {
  if (!Array.isArray(preferences)) return '';

  const formatted = preferences
    .filter(p => p && p.id)
    .map(p => {
      const strength = typeof p.strength === 'number' ? p.strength : 3;
      const strengthLabel = {
        1: '(open to it)',
        2: '(prefer)',
        3: '(normal)',
        4: '(really prefer)',
        5: '(essential)'
      }[strength] || '(normal)';
      return `${p.id} ${strengthLabel}`;
    });

  return formatted.join(', ');
}

/**
 * Extract preference IDs and build weighting context
 */
function buildPreferenceContext(preferences) {
  if (!Array.isArray(preferences)) return { ids: '', strengths: {} };

  const strengths = {};
  const ids = preferences
    .filter(p => p && p.id)
    .map(p => {
      strengths[p.id] = p.strength || 3;
      return p.id;
    });

  return { ids: ids.join(', '), strengths };
}

async function generateEnhancedRecommendations(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit
) {
  // Extract cuisine preference (support both string and object format)
  let cuisinePreference = 'General';
  if (profile?.dietary?.cuisinePreference) {
    const cuisines = profile.dietary.cuisinePreference;
    if (Array.isArray(cuisines) && cuisines.length > 0) {
      const firstCuisine = cuisines[0];
      cuisinePreference = (typeof firstCuisine === 'string')
        ? firstCuisine
        : (firstCuisine.id || 'General');
    }
  }

  const region = profile?.dietary?.region || 'General';

  // 🆕 CRITICAL: Extract dietary restrictions with strength values
  const allergies = profile?.dietary?.allergies || [];
  const dietaryPreferences = profile?.dietary?.preferences || [];
  const dislikes = profile?.dietary?.dislikes || [];

  // Format dietary preferences with strength levels for the AI
  const dietaryFormattedWithStrength = formatDietaryPreferencesWithStrength(dietaryPreferences);
  const dietaryPreferenceIds = dietaryPreferences
    .filter(p => p && p.id)
    .map(p => p.id);

  // Build preference context for strength weighting
  const preferenceContext = buildPreferenceContext(dietaryPreferences);

  // Build personalization context
  const personalizationContext = history.preferredFoods?.length > 0 ?
    `User previously accepted: ${history.preferredFoods.join(', ')}\n` : '';

  // 🆕 Add strict allergen exclusion to prompt
  const allergenExclusion = allergies.length > 0 ?
    `\n⚠️ CRITICAL - NEVER recommend foods containing these allergens: ${allergies.join(', ')}
This is a safety requirement. Exclude any food that might contain these ingredients.` : '';

  // 🆕 Add dietary preference guidance with strength levels (flexible - can be overridden with warning)
  const dietaryGuidance = dietaryPreferenceIds.length > 0 ?
    `\nUser dietary preferences (ordered by importance):
${dietaryFormattedWithStrength}

Priority weighting:
- Essential (5): MUST prioritize these preferences
- Really prefer (4): Strongly prioritize when possible
- Normal (3): Standard consideration
- Prefer (2): When available
- Open to it (1): Flexible alternative

Strongly prioritize "Essential (5)" preferences, then "Really prefer (4)", then others.
If suggesting foods that don't match high-priority preferences, mark them with "dietCompliant: false".` : '';

  const prompt = `You are a personalized nutrition recommendation system.

User Profile:
- Remaining Calories: ${remainingBudget.calories} kcal
- Remaining Protein: ${remainingBudget.protein}g
- Remaining Carbs: ${remainingBudget.carbs}g
- Remaining Fats: ${remainingBudget.fats}g
- Cuisine Preference: ${cuisinePreference}
- Region: ${region}
- Meal Type: ${mealType}
${personalizationContext}${allergenExclusion}${dietaryGuidance}

Recommendation Type: ${recType}

Generate ${limit} specific food recommendations that:
1. Fit within their remaining budget
2. Match their cuisine and regional preferences
3. Are appropriate for the meal type (${mealType})
4. Have clear nutritional benefits based on their needs
5. 🆕 NEVER contain allergens (${allergies.join(', ') || 'none'})
6. 🆕 STRONGLY PREFER foods matching essential/high-priority dietary preferences
7. 🆕 WEIGHT recommendations by preference strength (5=essential, 4=strong, 3=normal, 2=lighter, 1=flexible)

For each recommendation include:
- Food name
- Portion size
- Calories
- Protein (g)
- Carbs (g)
- Fats (g)
- Brief reason why it's recommended
- Preparation tips
- 🆕 allergenFree: boolean (MUST be true - critical for safety)
- 🆕 dietCompliant: boolean (matches user dietary preferences, especially essential ones)
- 🆕 preferenceStrengthMatch: number (1-5, how well it matches user's priority preferences)
- 🆕 warningBadge: null OR { text: "reason", type: "dietary" | "dislike" | "low-priority" } (only if not compliant or low match)

Return as JSON array with objects: { foodName, portion, calories, protein, carbs, fats, reason, tips, allergenFree, dietCompliant, preferenceStrengthMatch, warningBadge }`;

  try {
    const response = await openaiClient.chatCompletionJSON(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1500 }
    );

    const recommendations = response.recommendations || [];

    // 🆕 CRITICAL: Server-side allergen filter (defense in depth) - now using improved pattern matching
    const safeRecommendations = recommendations.filter(rec => {
      // Check AI marked as allergen-free
      if (rec.allergenFree === false) {
        console.warn(`[Recommendations] Filtered out ${rec.foodName} - AI marked as not allergen-free`);
        return false;
      }

      // Check food name using improved allergen detection (avoids false positives)
      const containsAllergen = improvedAllergenCheck(rec.foodName, allergies);

      if (containsAllergen) {
        console.warn(`[Recommendations] Filtered out ${rec.foodName} - contains allergen (improved pattern)`);
        return false;
      }

      return true;
    });

    console.log(`[Recommendations] Safety filter: ${recommendations.length} → ${safeRecommendations.length} recommendations`);

    // 🆕 Enrich with warning badges and ensure safe structure
    const enrichedRecommendations = safeRecommendations.map((rec, idx) => ({
      id: `rec-${Date.now()}-${idx}`,
      title: getTitleForType(recType),
      fiber: rec.fiber || 0,
      sugar: rec.sugar || 0,
      ...rec,
      color: getColorForType(recType),
      rank: idx + 1,
      timeToAdd: Math.max(5, 15 - idx * 2),
      // 🆕 Ensure warning badge is properly structured
      warningBadge: rec.warningBadge || (
        !rec.dietCompliant && dietaryPreferences.length > 0
          ? { text: 'Not in your diet preferences', type: 'dietary' }
          : null
      )
    }));

    return enrichedRecommendations;
  } catch (error) {
    console.error('[Recommendations] AI generation failed:', error);
    return getFallbackRecommendations(recType, mealType, remainingBudget, limit)
      .filter(rec => {
        // Also filter fallback recommendations for allergen safety (using improved pattern matching)
        return !improvedAllergenCheck(rec.foodName, allergies);
      });
  }
}

/**
 * Enrich recommendations with micronutrients
 * Uses in-request batching to avoid re-estimating same food in same batch
 */
async function enrichRecommendations(recommendations) {
  // Batch micronutrient lookups by food+portion to avoid duplicates within this request
  const microCache = new Map();

  const enriched = await Promise.all(
    recommendations.map(async (rec) => {
      try {
        // Create a cache key for this food
        const cacheKey = `${rec.foodName.toLowerCase()}:${rec.portion.toLowerCase()}`;

        // Check if we've already estimated this food in this batch
        if (!microCache.has(cacheKey)) {
          // Estimate micronutrients
          const micros = await estimateMicronutrients(
            rec.foodName,
            rec.portion,
            {
              calories: rec.calories,
              protein: rec.protein,
              carbs: rec.carbs,
              fats: rec.fats
            }
          );

          // Get significant micronutrients (>10% DV)
          const significantMicros = getSignificantMicronutrients(micros);
          microCache.set(cacheKey, significantMicros);
        }

        // Use cached micronutrients from this batch
        const significantMicros = microCache.get(cacheKey);

        return {
          ...rec,
          micros: significantMicros
        };
      } catch (error) {
        console.error('[Recommendations] Enrichment error for:', rec.foodName, error);
        // Return recommendation without enrichment if error occurs
        return rec;
      }
    })
  );

  return enriched;
}

/**
 * Save recommendations to history table for tracking
 */
async function saveRecommendationsToHistory(db, userId, recommendations, context) {
  try {
    const hour = context.hour;
    const remainingBudget = context.remainingBudget;

    for (const rec of recommendations) {
      await db.insert(recommendationsHistoryTable).values({
        userId,
        recommendationId: rec.id,
        foodName: rec.foodName,
        portion: rec.portion,
        calories: rec.calories,
        protein: rec.protein,
        carbs: rec.carbs,
        fats: rec.fats,
        fiber: rec.fiber || 0,
        sugar: rec.sugar || 0,
        micros: rec.micros || {},
        recommendationType: context.recType,
        reason: rec.reason,
        tips: rec.tips,
        prepTimeMinutes: rec.prepTimeMinutes || 10,
        recipeInstructions: rec.recipeInstructions || '',
        mealType: context.mealType,
        timeOfDay: hour,
        remainingCalories: remainingBudget.calories,
        remainingProtein: remainingBudget.protein,
        remainingCarbs: remainingBudget.carbs,
        remainingFats: remainingBudget.fats,
        interactionStatus: 'shown',
        aiGenerated: true,
        aiModel: 'gpt-4o-mini',
        aiConfidence: 0.85,
        personalizationScore: calculatePersonalizationScore(rec, remainingBudget),
        // NEW: Preference strength tracking fields
        // CRITICAL: Use explicit boolean checks - undefined should NOT be treated as true
        preferenceStrengthMatch: rec.preferenceStrengthMatch || 3,
        dietCompliant: rec.dietCompliant === true, // Only true if explicitly marked true
        allergenFree: rec.allergenFree === true,   // Safety: default to false unless confirmed safe
        warningBadge: rec.warningBadge || null,
        createdAt: new Date()
      }).catch(err => {
        // Ignore constraint violations (duplicate recommendations)
        if (!err.message.includes('unique')) {
          throw err;
        }
      });
    }
  } catch (error) {
    console.error('[Recommendations] Failed to save history:', error);
    // Don't fail the request if history saving fails
  }
}

/**
 * Calculate personalization score (0.00 - 1.00)
 */
function calculatePersonalizationScore(recommendation, remainingBudget) {
  let score = 0.5; // Base score

  // Adjust based on calorie fit
  if (recommendation.calories <= remainingBudget.calories * 0.8) {
    score += 0.2;
  }

  // Adjust based on protein fit
  if (recommendation.protein > 15 && recommendation.protein <= remainingBudget.protein * 0.8) {
    score += 0.2;
  }

  // Adjust based on macro balance
  if (recommendation.carbs > 0 && recommendation.fats > 0) {
    score += 0.1;
  }

  return Math.min(1.0, score);
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
