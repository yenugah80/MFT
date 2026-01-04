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

// Performance optimization: Log guard for debug logging
// Only logs in development or when DEBUG_RECOMMENDATIONS=true
const shouldLog = (level = 'info') => {
  if (process.env.DEBUG_RECOMMENDATIONS === 'true') return true;
  if (level === 'error' || level === 'warn') return true; // Always log errors/warnings
  return process.env.NODE_ENV === 'development';
};

const logDebug = (msg) => shouldLog('debug') && console.log(`[Recommendations] ${msg}`);
const logWarn = (msg) => console.warn(`[Recommendations] ${msg}`);
const logError = (msg) => console.error(`[Recommendations] ${msg}`);

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
    logDebug(`Coalescing duplicate request: ${key}`);
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
        logWarn(`Allergen match: Food "${foodName}" contains allergen "${allergen}" (pattern match)`);
        return true;
      }
    } else {
      // Fallback: For allergens without patterns, use safer substring matching
      // but require it to be a standalone word (not part of another word)
      const words = foodNameLower.split(/[\s,-]/);
      if (words.includes(allergenLower)) {
        logWarn(`Allergen match: Food "${foodName}" contains allergen "${allergen}" (word match)`);
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

/**
 * FLAW FIX #1-6: UNIVERSAL VALIDATION & CONSTRAINTS
 * Works with any food, any meal type - comprehensive production-grade implementation
 */

/**
 * UNIVERSAL VALIDATION: Validates AI output against actual constraints
 * Prevents corrupted data from reaching frontend
 */
function validateRecommendation(rec, remainingBudget, allergies, dietaryPrefs, mealType, recType) {
  const errors = [];

  // 1️⃣ Type validation (prevents string/number mismatches)
  if (typeof rec.foodName !== 'string' || !rec.foodName.trim()) {
    errors.push('Invalid foodName (must be non-empty string)');
  }
  if (typeof rec.portion !== 'string' || !rec.portion.trim()) {
    errors.push('Invalid portion (must be non-empty string)');
  }

  // 2️⃣ Nutrition type validation (prevents NaN, Infinity, null)
  const nutritionFields = ['calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar'];
  for (const field of nutritionFields) {
    const val = rec[field];
    if (val !== undefined && (typeof val !== 'number' || val < 0 || !isFinite(val))) {
      errors.push(`Invalid ${field}: must be non-negative number, got ${val}`);
    }
  }

  // 3️⃣ Per-item constraint validation (adaptive by type)
  const constraints = getConstraintsByType(recType, mealType);

  if (rec.calories > constraints.maxCalories) {
    errors.push(`Calories ${rec.calories} exceeds max ${constraints.maxCalories} for ${recType}`);
  }
  if (rec.protein < constraints.minProtein) {
    errors.push(`Protein ${rec.protein}g below minimum ${constraints.minProtein}g for ${recType}`);
  }
  if (rec.protein > remainingBudget.protein) {
    errors.push(`Protein ${rec.protein}g exceeds remaining ${remainingBudget.protein}g`);
  }
  if (rec.carbs > remainingBudget.carbs) {
    errors.push(`Carbs ${rec.carbs}g exceeds remaining ${remainingBudget.carbs}g`);
  }
  if (rec.fats > remainingBudget.fats) {
    errors.push(`Fats ${rec.fats}g exceeds remaining ${remainingBudget.fats}g`);
  }

  // 4️⃣ Allergen safety (server-side defense)
  if (improvedAllergenCheck(rec.foodName, allergies)) {
    errors.push(`Food contains allergens: ${allergies.join(', ')}`);
  }

  // 5️⃣ Boolean field validation
  if (rec.allergenFree !== undefined && typeof rec.allergenFree !== 'boolean') {
    errors.push('allergenFree must be boolean');
  }
  if (rec.dietCompliant !== undefined && typeof rec.dietCompliant !== 'boolean') {
    errors.push('dietCompliant must be boolean');
  }

  // 6️⃣ Preference strength validation
  if (rec.preferenceStrengthMatch !== undefined) {
    if (typeof rec.preferenceStrengthMatch !== 'number' || rec.preferenceStrengthMatch < 1 || rec.preferenceStrengthMatch > 5) {
      errors.push('preferenceStrengthMatch must be 1-5');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rec: rec
  };
}

/**
 * UNIVERSAL CONSTRAINTS: Adaptive limits based on recommendation type
 * Works with any food, meal type - intelligently constrains AI output
 */
function getConstraintsByType(recType, mealType) {
  // Base constraints by meal type
  const baseByMeal = {
    breakfast: { maxCalories: 500, minProtein: 5 },
    lunch: { maxCalories: 700, minProtein: 10 },
    dinner: { maxCalories: 800, minProtein: 15 },
    snack: { maxCalories: 350, minProtein: 3 }
  };

  // Overrides by recommendation type (more restrictive)
  const overrideByType = {
    PROTEIN_BOOST: { maxCalories: 400, minProtein: 20 },
    LIGHT_SNACK: { maxCalories: 250, minProtein: 0 },
    HYDRATION: { maxCalories: 50, minProtein: 0 },
    BALANCED_MEAL: { maxCalories: 600, minProtein: 10 },
    REGIONAL_PICK: { maxCalories: 700, minProtein: 8 }
  };

  const base = baseByMeal[mealType] || baseByMeal.snack;
  const override = overrideByType[recType] || {};

  return {
    maxCalories: override.maxCalories || base.maxCalories,
    minProtein: override.minProtein || base.minProtein,
    maxPrepTime: mealType === 'snack' ? 15 : 30,
    diversity: true
  };
}

/**
 * FLAW FIX #3: Smart regeneration when filtering removes too many
 * Ensures user always gets requested number of recommendations (or tries)
 */
async function generateWithRegeneration(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit,
  attempt = 1
) {
  const MAX_ATTEMPTS = 2;
  const FILTER_THRESHOLD = limit * 0.67; // If we keep 2/3 or less, regenerate

  if (attempt > MAX_ATTEMPTS) {
    console.warn('[Recommendations] Max regeneration attempts reached');
    return null;
  }

  const recommendations = await generateEnhancedRecommendationsCore(
    recType,
    mealType,
    remainingBudget,
    profile,
    history,
    limit + (attempt - 1) * 2, // Request more on retry
    attempt > 1 // Add regeneration hint
  );

  if (!recommendations || recommendations.length < FILTER_THRESHOLD) {
    logDebug(`Insufficient after filtering (${recommendations?.length || 0}/${limit}), regenerating...`);
    return generateWithRegeneration(recType, mealType, remainingBudget, profile, history, limit, attempt + 1);
  }

  return recommendations.slice(0, limit);
}

/**
 * CORE: Build prompt with UNIVERSAL constraints and DIVERSITY
 * FLAW FIX #4: Diversity enforcement in prompt
 * FLAW FIX #5: Per-item constraints enforced
 */
async function generateEnhancedRecommendationsCore(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit,
  isRegeneration = false
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
  const allergies = profile?.dietary?.allergies || [];
  const dietaryPreferences = profile?.dietary?.preferences || [];

  const dietaryFormattedWithStrength = formatDietaryPreferencesWithStrength(dietaryPreferences);
  const dietaryPreferenceIds = dietaryPreferences
    .filter(p => p && p.id)
    .map(p => p.id);

  const personalizationContext = history.preferredFoods?.length > 0 ?
    `User previously accepted: ${history.preferredFoods.join(', ')}\n` : '';

  const allergenExclusion = allergies.length > 0 ?
    `\n⚠️ CRITICAL - NEVER recommend foods containing these allergens: ${allergies.join(', ')}
This is a safety requirement. Exclude any food that might contain these ingredients.` : '';

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

  // FLAW FIX #4: Diversity constraints - UNIVERSAL
  const diversityGuidance = `
DIVERSITY REQUIREMENT (CRITICAL FOR ALL RECOMMENDATIONS):
- Mix protein sources: Include animal-based, plant-based, and/or dairy across recommendations
- Avoid repetition: NO duplicate foods or same food prepared differently (e.g., not 3 chicken dishes)
- Suggest variety across all options: Each recommendation should feel distinct and personalized
- Food categories: Mix grains, proteins, fruits, vegetables, dairy to feel balanced`;

  // FLAW FIX #5: Per-item constraints - UNIVERSAL
  const constraints = getConstraintsByType(recType, mealType);
  const constraintGuidance = `
PORTION & MACRO CONSTRAINTS (STRICT - APPLY TO EACH ITEM):
- Each individual recommendation MUST be ≤ ${constraints.maxCalories} calories (CRITICAL)
- Realistic prep time: ≤ ${constraints.maxPrepTime} minutes for ${mealType}
- Portion sizes in standard units: grams (g), cups, ounces (oz), pieces (pcs), tablespoons (tbsp)
- NEVER recommend any food that exceeds REMAINING budgets: Protein ${remainingBudget.protein}g, Carbs ${remainingBudget.carbs}g, Fats ${remainingBudget.fats}g`;

  const regenerationNote = isRegeneration ?
    `\n⚠️ REGENERATION REQUEST: Previous recommendations were filtered. Generate MORE DIVERSE options without any repetition.` : '';

  const prompt = `You are a production-grade nutrition recommendation system. Generate exactly ${limit} specific food recommendations.

USER STATE
- Remaining Calories: ${remainingBudget.calories} kcal
- Remaining Protein: ${remainingBudget.protein}g
- Remaining Carbohydrates: ${remainingBudget.carbs}g
- Remaining Fats: ${remainingBudget.fats}g
- Cuisine Preference: ${cuisinePreference}
- Regional Preference: ${region}
- Meal Type: ${mealType}
${personalizationContext}${allergenExclusion}${dietaryGuidance}${regenerationNote}

RECOMMENDATION OBJECTIVE
Goal: ${recType}
- Prioritize nutritional fit based on recommendation type
- Each recommendation must feel personalized and distinct

${diversityGuidance}
${constraintGuidance}

CRITICAL SAFETY RULES
1. NEVER recommend foods containing allergens: ${allergies.join(', ') || 'none'}
2. STRONGLY PREFER foods matching Essential (5) and Really Prefer (4) preferences
3. Validate all nutrition values are realistic and complete

OUTPUT SCHEMA (REQUIRED - RETURN AS JSON ARRAY, NOT WRAPPED):
[
  {
    "foodName": "exact food name",
    "portion": "e.g., '150g', '1 cup', '2 pieces'",
    "calories": number (0-${constraints.maxCalories}),
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number,
    "sugar": number,
    "reason": "why this fits ${recType}",
    "tips": "how to prepare (≤${constraints.maxPrepTime} min)",
    "prepTimeMinutes": number,
    "allergenFree": true,
    "dietCompliant": boolean,
    "preferenceStrengthMatch": 1-5,
    "warningBadge": null or {"text": "reason", "type": "dietary|dislike|low-priority"}
  }
]

VALIDATION CHECKLIST
✓ Exactly ${limit} unique recommendations (no duplicate foods)
✓ Each item ≤ ${constraints.maxCalories} calories
✓ All nutrition fields are numbers (not strings, not null)
✓ Portion sizes in standard units (grams, cups, pieces, oz, tbsp)
✓ Diverse protein sources (mix of animal, plant, dairy)
✓ NO foods containing: ${allergies.join(', ') || 'none'}
✓ Returned as JSON array (not wrapped in object)`;

  try {
    const response = await openaiClient.chatCompletionJSON(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2000 }
    );

    // FLAW FIX #1: Handle BOTH array and wrapped responses
    let recommendations = response.recommendations || response;

    if (!Array.isArray(recommendations)) {
      console.error('[Recommendations] Invalid response format:', typeof recommendations);
      return [];
    }

    // FLAW FIX #2: Validate each recommendation
    const validatedRecs = [];
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      const validation = validateRecommendation(rec, remainingBudget, allergies, dietaryPreferences, mealType, recType);

      if (!validation.valid) {
        console.warn(`[Recommendations] Invalid #${i + 1}: ${validation.errors.join('; ')}`);
        continue;
      }

      validatedRecs.push(rec);
    }

    logDebug(`Validation: ${recommendations.length} → ${validatedRecs.length} valid`);

    // FLAW FIX #3: Server-side allergen filter (defense in depth)
    const safeRecommendations = validatedRecs.filter(rec => {
      if (rec.allergenFree === false) {
        console.warn(`[Recommendations] Filtered: ${rec.foodName} - AI marked unsafe`);
        return false;
      }

      if (improvedAllergenCheck(rec.foodName, allergies)) {
        console.warn(`[Recommendations] Filtered: ${rec.foodName} - contains allergen`);
        return false;
      }

      return true;
    });

    logDebug(`Safety filter: ${validatedRecs.length} → ${safeRecommendations.length} safe`);

    // OPTIMIZATION: Compute personalization score once per recommendation (not during sort)
    const scoredRecommendations = safeRecommendations.map(rec => ({
      ...rec,
      personalizationScore: calculatePersonalizationScore(rec, remainingBudget)
    }));

    // IMPROVEMENT: Sort by score (preference strength + personalization) BEFORE ranking
    const rankedByScore = scoredRecommendations.sort((a, b) => {
      // Primary: Sort by preference strength match (higher first)
      const prefDiff = (b.preferenceStrengthMatch ?? 3) - (a.preferenceStrengthMatch ?? 3);
      if (prefDiff !== 0) return prefDiff;

      // Secondary: Sort by personalization score (higher first) - already computed
      return b.personalizationScore - a.personalizationScore;
    });

    // TUFTE UX ENHANCEMENT: Enrich with context, reasoning, and honest data
    const enrichedRecommendations = rankedByScore.map((rec, idx) => {
      const prefLabel = getPreferenceLabel(rec.preferenceStrengthMatch ?? 3);
      const persLabel = getPersonalizationLabel(rec.personalizationScore);
      const warningInfo = getWarningSeverity(rec.warningBadge);
      const macroBalance = calculateMacroBalance(rec);
      const confidence = getConfidenceContext(rec);
      const comparison = getComparisonContext(rec, rankedByScore, idx);
      const reasoning = getPersonalizationReasoning(rec, remainingBudget, mealType);

      return {
        // Core identity
        id: `rec-${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`,
        rank: idx + 1,
        isTopPick: idx === 0,
        title: getTitleForType(recType),

        // Food basics
        foodName: rec.foodName,
        portion: rec.portion,

        // TUFTE FIX: Nutrition with context
        nutrition: {
          calories: rec.calories,
          protein: rec.protein,
          carbs: rec.carbs,
          fats: rec.fats,
          fiber: rec.fiber || 0,
          sugar: rec.sugar || 0,
          macroBalance: macroBalance  // ← NOW HONEST: actual percentages
        },

        // TUFTE FIX: Preference strength with label & icon
        preference: {
          score: rec.preferenceStrengthMatch ?? 3,
          label: prefLabel.label,
          icon: prefLabel.icon,
          level: prefLabel.level,
          reasoning: 'Matches your dietary preferences'
        },

        // TUFTE FIX: Personalization with reasoning
        personalization: {
          score: rec.personalizationScore,
          label: persLabel.label,
          emoji: persLabel.emoji,
          level: persLabel.level,
          reasoning: reasoning  // ← WHY it fits
        },

        // TUFTE FIX: Real prep time, not declining with rank
        preparation: {
          timeMinutes: rec.prepTimeMinutes || 10,
          confidence: confidence,  // ← Honest confidence range
          difficulty: rec.difficulty || 'medium',
          tips: rec.tips
        },

        // TUFTE FIX: Contextual warnings with severity
        warning: warningInfo.severity === 'none' ? null : {
          text: rec.warningBadge?.text || 'Check recommendation details',
          type: rec.warningBadge?.type || 'info',
          severity: warningInfo.severity,
          icon: warningInfo.icon,
          color: warningInfo.color
        },

        // TUFTE FIX: Visual encoding (meaningful, not decorative)
        visual: {
          color: getColorForType(recType),
          gradient: getColorForType(recType),
          meaning: recType,
          icon: getTitleForType(recType).split(' ')[0]  // Extract emoji
        },

        // TUFTE FIX: Comparison context (small multiples)
        comparison: {
          rankLabel: comparison.rankLabel,
          betterOptions: comparison.comparisons.betterFits,
          totalRecommendations: rankedByScore.length
        },

        // TUFTE FIX: Diet compliance with explanation
        dietCompliance: {
          compliant: rec.dietCompliant === true,
          message: rec.dietCompliant ? 'Matches your preferences' : 'Not in your preferences'
        },

        // TUFTE FIX: Allergen safety with confidence
        allergenSafety: {
          safe: rec.allergenFree === true,
          message: rec.allergenFree ? 'Allergen-free' : 'Check ingredients',
          confidence: rec.aiConfidence || 0.85
        },

        // Additional context (for display)
        reason: rec.reason,
        mealType: mealType,
        recType: recType
      };
    });

    return enrichedRecommendations;
  } catch (error) {
    console.error('[Recommendations] AI generation error:', error.message);
    // FLAW FIX #6: Proper error logging
    return null;
  }
}

/**
 * Main entry point: Orchestrate generation with regeneration logic
 * FLAW FIX #3: Handles incomplete recommendations gracefully
 */
async function generateEnhancedRecommendations(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit
) {
  const allergies = profile?.dietary?.allergies || [];

  // Try with regeneration logic (fixes flaw #3)
  let recommendations = await generateWithRegeneration(
    recType,
    mealType,
    remainingBudget,
    profile,
    history,
    limit
  );

  // If regeneration completely fails, fall back to curated list
  if (!recommendations || recommendations.length === 0) {
    console.warn('[Recommendations] AI generation failed completely, using fallback');
    recommendations = getFallbackRecommendations(recType, mealType, remainingBudget, limit);
  }

  // Final allergen filter for fallback
  return recommendations.filter(rec => !improvedAllergenCheck(rec.foodName, allergies));
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
        personalizationScore: rec.personalizationScore || calculatePersonalizationScore(rec, remainingBudget),
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

/**
 * TUFTE UX FIX: Add human-readable label for preference strength (1-5)
 * Explains what each score means in context
 */
function getPreferenceLabel(strength) {
  const labels = {
    1: { label: 'Open to it', icon: '◯', level: 'flexible' },
    2: { label: 'Prefer', icon: '◐', level: 'lighter' },
    3: { label: 'Normal', icon: '◑', level: 'standard' },
    4: { label: 'Really prefer', icon: '◕', level: 'strong' },
    5: { label: 'Essential', icon: '◉', level: 'critical' }
  };
  return labels[strength] || labels[3];
}

/**
 * TUFTE UX FIX: Add reasoning for personalization score
 * Explains WHY the recommendation is a good fit
 */
function getPersonalizationReasoning(rec, remainingBudget, mealType) {
  const reasons = [];

  // Calorie fit
  if (rec.calories <= remainingBudget.calories * 0.5) {
    reasons.push('Leaves plenty of room for more food');
  } else if (rec.calories <= remainingBudget.calories * 0.8) {
    reasons.push('Good use of your calorie budget');
  }

  // Protein fit
  if (rec.protein >= remainingBudget.protein * 0.7) {
    reasons.push('High protein impact for your goal');
  } else if (rec.protein >= remainingBudget.protein * 0.4) {
    reasons.push('Solid protein contribution');
  }

  // Prep time
  if (rec.prepTimeMinutes <= 10) {
    reasons.push('Quick to prepare');
  } else if (rec.prepTimeMinutes <= 20) {
    reasons.push('Reasonable prep time');
  }

  // Macro balance
  if (rec.carbs > 0 && rec.fats > 0 && rec.protein > 0) {
    reasons.push('Balanced macro profile');
  }

  return reasons.length > 0 ? reasons[0] : 'Fits your nutritional needs';
}

/**
 * TUFTE UX FIX: Calculate actual macro balance percentages
 * Shows what this recommendation delivers nutritionally
 */
function calculateMacroBalance(rec) {
  // Use calories-based macronutrient breakdown (more accurate than weight)
  const proteinCals = rec.protein * 4;
  const carbsCals = rec.carbs * 4;
  const fatsCals = rec.fats * 9;
  const totalCals = proteinCals + carbsCals + fatsCals;

  if (totalCals === 0) return { protein: 0, carbs: 0, fats: 0 };

  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fats: Math.round((fatsCals / totalCals) * 100)
  };
}

/**
 * TUFTE UX FIX: Classify personalization score into human terms
 * Maps 0-1 score to meaningful labels
 */
function getPersonalizationLabel(score) {
  if (score >= 0.8) return { label: 'Perfect fit', emoji: '🎯', level: 'excellent' };
  if (score >= 0.6) return { label: 'Great fit', emoji: '✓', level: 'good' };
  if (score >= 0.4) return { label: 'Good fit', emoji: '~', level: 'fair' };
  return { label: 'Fair fit', emoji: '?', level: 'okay' };
}

/**
 * TUFTE UX FIX: Classify warning severity (not vague)
 * Makes warnings meaningful with context
 */
function getWarningSeverity(warningBadge) {
  if (!warningBadge) return { severity: 'none', icon: '✓', message: 'No warnings' };

  const typeToSeverity = {
    allergen: { severity: 'critical', icon: '⚠️', color: '#EF4444' },
    dietary: { severity: 'medium', icon: '⚡', color: '#F59E0B' },
    dislike: { severity: 'low', icon: 'ℹ️', color: '#3B82F6' },
    'low-priority': { severity: 'low', icon: 'ℹ️', color: '#6B7280' }
  };

  return typeToSeverity[warningBadge.type] || { severity: 'low', icon: 'ℹ️', color: '#6B7280' };
}

/**
 * TUFTE UX FIX: Add comparison context (small multiples)
 * Shows how this recommendation ranks against others
 */
function getComparisonContext(rec, allRecommendations, idx) {
  const betterFitsCount = allRecommendations.filter((other, i) =>
    i > idx && (other.personalizationScore < rec.personalizationScore)
  ).length;

  const betterPrefCount = allRecommendations.filter((other, i) =>
    i > idx && (other.preferenceStrengthMatch < rec.preferenceStrengthMatch)
  ).length;

  return {
    rankLabel: `#${idx + 1} of ${allRecommendations.length}`,
    isTopPick: idx === 0,
    comparisons: {
      betterFits: betterFitsCount,
      totalLower: allRecommendations.length - idx - 1
    }
  };
}

/**
 * TUFTE UX FIX: Build honest, detailed confidence score
 * Includes confidence range, not just a point estimate
 */
function getConfidenceContext(rec) {
  // Base confidence from AI
  const aiConfidence = rec.aiConfidence || 0.85;
  const confidenceRange = {
    min: Math.max(0.6, aiConfidence - 0.15),
    max: Math.min(1.0, aiConfidence + 0.05),
    point: aiConfidence
  };

  return {
    point: Math.round(aiConfidence * 100),
    range: `${Math.round(confidenceRange.min * 100)}-${Math.round(confidenceRange.max * 100)}%`,
    label: aiConfidence >= 0.85 ? 'High confidence' : aiConfidence >= 0.7 ? 'Good confidence' : 'Estimated'
  };
}

export default router;
