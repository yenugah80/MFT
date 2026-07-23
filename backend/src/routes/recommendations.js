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
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { and, eq, gte, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { estimateMicronutrients, getSignificantMicronutrients } from '../services/micronutrientService.js';
import { recommendationsHistoryTable, foodLogTable, profilesTable, dietaryPreferencesTable } from '../db/schema.js';
import { errors } from '../utils/errorResponse.js';
import { getUnifiedIntelligence, formatIntelligenceForPrompt } from '../services/unifiedIntelligenceService.js';
import { generateRecommendationContext } from '../services/personalizedNarrativeEngine.js';
import { getSmartRecommendations } from '../services/smartRecommendationEngine.js';
import { getDashboardData } from '../services/dashboardService.js';
import { parseTimezoneOffsetMinutes } from '../utils/timezone.js';
import { getUserSignals, invalidateUserSignals } from '../services/userSignalCacheService.js';
import { selectArm, updateArm, generateArmKey, getTimeBucket } from '../services/thompsonSamplingService.js';
import { generateCandidates } from '../services/candidateGenerationService.js';
import { getUserLaggedCorrelations } from '../services/laggedCorrelationService.js';
import { computeMicronutrientUrgency, detectAllergenRisk, expandAllergens } from '../services/foodKnowledgeGraphService.js';
import { invalidateCFCache } from '../services/collaborativeFilteringService.js';

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
 * GET /api/recommendations/smart
 *
 * World-class smart recommendations with:
 * - Real-time nutritional gap detection
 * - Time-contextual meal suggestions
 * - Personal history-based learning
 * - Rich explanations with actual data
 * - Quick-log ready recommendations
 *
 * Query params:
 * - limit: number of recommendations (default: 5, max: 10)
 * - mealType: force specific meal type (optional, auto-detected by time)
 */
router.get('/smart', requireAuth(), aiLimiter, async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { limit = 5, mealType } = req.query;

    // Validate limit
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);

    // Validate mealType if provided
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const parsedMealType = mealType && validMealTypes.includes(mealType)
      ? mealType
      : undefined;
    const timezoneOffset = parseTimezoneOffsetMinutes(req);

    logDebug(`Smart recommendations request: userId=${userId}, limit=${parsedLimit}, mealType=${parsedMealType || 'auto'}`);

    const result = await getSmartRecommendations(userId, {
      limit: parsedLimit,
      mealType: parsedMealType,
      timezoneOffset,
    });

    res.json(result);
  } catch (error) {
    console.error('[Recommendations] Smart recommendation error:', error);
    errors.externalService(res, 'Smart recommendation generation');
  }
});

/**
 * GET /api/recommendations
 * Get personalized food recommendations with history awareness
 * Uses request deduplication to prevent duplicate concurrent API calls
 */
router.get('/', requireAuth(), aiLimiter, async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { limit = 5 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);

    // Parse timezone offset from device header before anything else.
    // This must happen outside the dedup closure so the local hour is used
    // for both the dedup key and the meal-type derivation.
    const timezoneOffset = parseTimezoneOffsetMinutes(req);
    const hour = getLocalHour(timezoneOffset);
    const mealType = getMealType(hour);

    // Generate or coalesce request with deduplication
    const result = await generateRecommendationsWithDedup(
      userId,
      mealType,
      parsedLimit,
      async () => {
        // Parallelize all independent data fetches — direct DB/service calls (no loopback HTTP)
        // timezoneOffset is captured from the outer scope (already parsed above).
        const [dashboardResult, [profileRow], [dietaryRow], history, holisticIntelligence, personalizedContext, userSignals, laggedCorrelations] = await Promise.all([
          getDashboardData(db, userId),
          db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
          db.select().from(dietaryPreferencesTable).where(eq(dietaryPreferencesTable.userId, userId)).limit(1),
          analyzeRecommendationHistory(db, userId),
          getUnifiedIntelligence(userId, { lookbackDays: 7 }),
          generateRecommendationContext(userId),
          getUserSignals(userId, { timezoneOffset }),
          getUserLaggedCorrelations(userId).catch(() => []),
        ]);

        // Shape profile data to match expected structure for generateEnhancedRecommendations
        const profile = {
          dietary: {
            cuisinePreference: Array.isArray(profileRow?.cuisinePreference) ? profileRow.cuisinePreference : [],
            region: profileRow?.region || null,
            cookingStyle: profileRow?.cookingStyle || null,
            allergies: Array.isArray(dietaryRow?.allergies) ? dietaryRow.allergies : [],
            // Critical allergens = anaphylaxis or severe — must be hard-blocked in recommendations
            criticalAllergens: Array.isArray(dietaryRow?.allergies)
              ? dietaryRow.allergies.filter(a => {
                  const sev = (dietaryRow?.allergenSeverity || {})[a] || 'moderate';
                  return sev === 'anaphylaxis' || sev === 'severe';
                })
              : [],
            allergenSeverity: (dietaryRow?.allergenSeverity && typeof dietaryRow.allergenSeverity === 'object')
              ? dietaryRow.allergenSeverity : {},
            intoleranceType: (dietaryRow?.intoleranceType && typeof dietaryRow.intoleranceType === 'object')
              ? dietaryRow.intoleranceType : {},
            preferences: Array.isArray(dietaryRow?.preferences) ? dietaryRow.preferences : [],
            dislikes: Array.isArray(dietaryRow?.dislikes) ? dietaryRow.dislikes : [],
          },
          goals: dashboardResult.goals || {},
        };

        // Calculate remaining budget
        const goals = profile.goals;
        const today = dashboardResult.today || {};
        const nutrition = today?.nutrition || {};

        const remainingBudget = {
          calories: Math.max(0, (goals.dailyCalories || 2000) - (nutrition.totalCalories || 0)),
          protein: Math.max(0, (goals.proteinG || 150) - (nutrition.totalProtein || 0)),
          carbs: Math.max(0, (goals.carbsG || 225) - (nutrition.totalCarbs || 0)),
          fats: Math.max(0, (goals.fatsG || 65) - (nutrition.totalFats || 0)),
          water: Math.max(0, (goals.waterLiters || 2.0) - (today.waterIntakeLiters || 0)),
        };
        logDebug(`Wellness Score: ${holisticIntelligence?.wellnessScore}, Recovery: ${holisticIntelligence?.recoveryScore}`);
        logDebug(`Personalized Patterns: ${personalizedContext.hasPatterns ? 'Available' : 'Building'} (${personalizedContext.goodFoods?.length || 0} good foods, ${personalizedContext.avoidFoods?.length || 0} watch foods)`);

        // Micronutrient urgency: compute deficit signals from today's tracked micros.
        // Must be computed BEFORE selectRecommendationTypeWithBandit so that
        // MICRONUTRIENT_BOOST can be selected as a wellness override when micros are low.
        const todayMicros = dashboardResult.today?.nutrition?.micros ?? {};
        const micronutrientUrgency = computeMicronutrientUrgency(todayMicros);

        // Determine recommendation type: wellness overrides first, then Thompson Sampling bandit
        const recType = await selectRecommendationTypeWithBandit(
          userId, mealType, remainingBudget, profile, history, holisticIntelligence, micronutrientUrgency
        );

        // Generate pre-scored candidates from the catalogue + user history.
        // scoreCandidate() reads nutritionalGaps, recentFoodNames, and allergies from the
        // signals object — they are NOT part of userSignalCacheService's output, so we
        // enrich the signals inline here before passing them.
        const recentFoodNames = (history.preferredFoods ?? []).concat(
          (dashboardResult.today?.nutrition?.recentFoods ?? []).map((f) => f.foodName ?? f)
        );
        const nutritionalGaps = {
          calories: { remaining: remainingBudget.calories },
          protein:  { status: remainingBudget.protein  < 30  ? 'low' : 'ok', remaining: remainingBudget.protein },
          carbs:    { status: remainingBudget.carbs    < 50  ? 'low' : 'ok', remaining: remainingBudget.carbs },
          fats:     { status: remainingBudget.fats     < 15  ? 'low' : 'ok', remaining: remainingBudget.fats },
          fiber:    { status: 'unknown' },
        };

        const enrichedSignals = {
          ...userSignals,
          nutritionalGaps,
          recentFoodNames,
          allergies: profile.dietary.allergies,
          // Hard-block allergens (anaphylaxis/severe) — candidate generator must exclude these
          criticalAllergens: profile.dietary.criticalAllergens,
          allergenSeverity: profile.dietary.allergenSeverity,
          intoleranceType: profile.dietary.intoleranceType,
          // Rejection learning: foods the user explicitly rejected 2+ times
          rejectedFoodNames: history.rejectedFoodNames ?? [],
          // Micronutrient gap signals for candidate scoring
          microUrgencySignals: micronutrientUrgency.urgencySignals ?? {},
        };

        const candidates = await generateCandidates(userId, {
          signals: enrichedSignals,
          mealType,
          limit: 18,
        }).catch((err) => {
          logWarn(`candidateGenerationService failed; recommendation engine will use deterministic grounded fallback: ${err.message}`);
          return [];
        });

        // Augment userSignals with micronutrient deficit data so the LLM prompt
        // can reference specific nutrients when recType === MICRONUTRIENT_BOOST.
        const userSignalsForLLM = micronutrientUrgency.hasDeficit
          ? { ...userSignals, micronutrientDeficits: micronutrientUrgency.deficits }
          : userSignals;

        // Generate recommendations: candidates → LLM ranks + narrates
        // userSignals and laggedCorrelations are passed cleanly (no mutation)
        //
        // AI ranking can retry OpenAI up to twice (generateWithRegeneration's
        // MAX_ATTEMPTS), and each call carries the client's own 30s timeout —
        // so a slow-but-eventually-successful OpenAI response could still run
        // past the mobile app's 30s request timeout even though nothing here
        // actually errors. Race it against a deadline well under that budget;
        // on timeout, fall back to the same deterministic candidate path the
        // AI-ranking failure case already uses, so the endpoint always
        // responds in time instead of hanging on a slow model response.
        const AI_RANKING_DEADLINE_MS = 18000;
        let recommendations = await Promise.race([
          generateEnhancedRecommendations(
            recType,
            mealType,
            remainingBudget,
            profile,
            history,
            parsedLimit,
            holisticIntelligence,
            personalizedContext,
            userSignalsForLLM,
            laggedCorrelations,
            candidates,
          ),
          new Promise((resolve) => setTimeout(() => resolve(null), AI_RANKING_DEADLINE_MS)),
        ]);

        if (!recommendations || recommendations.length === 0) {
          console.warn('[Recommendations] AI ranking exceeded deadline or failed; using deterministic grounded candidate fallback');
          recommendations = buildDeterministicRecommendationsFromCandidates(
            candidates,
            recType,
            mealType,
            remainingBudget,
            parsedLimit,
            userSignalsForLLM,
          ).filter(rec => !improvedAllergenCheck(rec, profile?.dietary?.allergies || []));
        }

        // Enrich with micronutrients
        const enrichedRecommendations = await enrichRecommendations(recommendations);

        // Persist before responding so returned recommendation IDs can be accepted immediately.
        await saveRecommendationsToHistory(db, userId, enrichedRecommendations, {
          recType, mealType, remainingBudget, hour,
        });

        return {
          recommendations: enrichedRecommendations,
          remainingBudget,
          recommendationType: recType,
          mealType,
          // 🎯 NEW: Include personalized pattern context for frontend display
          personalizedPatterns: personalizedContext?.hasPatterns ? {
            used: true,
            goodFoods: personalizedContext.goodFoods || [],
            watchFoods: personalizedContext.avoidFoods || [],
            timingTips: personalizedContext.timingTips || [],
            topPattern: personalizedContext.topPattern || null
          } : {
            used: false,
            message: 'Building your personalized patterns - keep logging!'
          },
          moodSignal: {
            hasData: userSignals.moodConfidenceLabel !== 'insufficient',
            confidence: userSignals.moodConfidence,
            confidenceLabel: userSignals.moodConfidenceLabel,
            insight: userSignals.insights?.mood || '',
            reason: userSignals.explainability?.mood?.reason || null
          },
          laggedInsights: laggedCorrelations.length > 0
            ? laggedCorrelations.slice(0, 3).map((c) => ({
                finding: c.interpretation,
                signalA: c.signalA,
                signalB: c.signalB,
                lagHours: c.optimalLagHours,
                correlation: c.correlationAtOptimalLag,
              }))
            : [],
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
    errors.externalService(res, 'Recommendation generation');
  }
});

/**
 * GET /api/recommendations/:id
 * Get detailed recommendation by ID
 */
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
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
      return errors.notFound(res, 'Recommendation');
    }

    // Mark as viewed — only when the rec has never been interacted with.
    // Never downgrade a terminal status (accepted / rejected / customized) back to 'viewed'.
    if (recommendation[0].interactionStatus === 'shown') {
      await db
        .update(recommendationsHistoryTable)
        .set({ interactionStatus: 'viewed', viewedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(recommendationsHistoryTable.id, recommendation[0].id),
            eq(recommendationsHistoryTable.interactionStatus, 'shown') // guard against race
          )
        );
    }

    res.json(recommendation[0]);
  } catch (error) {
    console.error('[Recommendations] Get detail error:', error);
    errors.externalService(res, 'Recommendation retrieval');
  }
});

/**
 * POST /api/recommendations/:id/track
 * Track user interaction with recommendation
 */
router.post('/:id/track', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { id } = req.params;
    const { action, reason } = req.body;

    const validActions = ['view', 'accept', 'reject', 'customize'];
    if (!validActions.includes(action)) {
      return errors.invalidInput(res, 'action must be one of: view, accept, reject, customize');
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

    const [updatedRec] = await db
      .update(recommendationsHistoryTable)
      .set(updateData)
      .where(and(
        eq(recommendationsHistoryTable.recommendationId, id),
        eq(recommendationsHistoryTable.userId, userId)
      ))
      .returning();

    // Bayesian update: close the feedback loop for Thompson Sampling
    if ((action === 'accept' || action === 'reject') && updatedRec?.recommendationType) {
      const inferredHour = updatedRec.timeOfDay ?? new Date().getHours();
      const inferredMealType = updatedRec.mealType ?? getMealType(inferredHour);
      const armKey = generateArmKey({
        recommendationType: updatedRec.recommendationType,
        mealType: inferredMealType,
        timeBucket: getTimeBucket(inferredHour),
      });
      updateArm(userId, armKey, action === 'accept', { foodName: updatedRec.foodName })
        .catch((err) => console.warn('[Recommendations] Thompson Sampling update failed:', err.message));

      // Invalidate collaborative-filter cache when acceptance patterns change.
      // Next request will recompute similarity against updated history.
      invalidateCFCache(userId);
    }

    res.json({ success: true, action });
  } catch (error) {
    console.error('[Recommendations] Track error:', error);
    errors.externalService(res, 'Interaction tracking');
  }
});

/**
 * POST /api/recommendations/:id/accept
 * Accept recommendation and add to food log
 */
router.post('/:id/accept', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
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
      return errors.notFound(res, 'Recommendation');
    }

    // Guard idempotency: if already logged, return the existing food log entry
    if (rec.wasLogged && rec.loggedFoodId) {
      return res.json({
        success: true,
        alreadyAccepted: true,
        foodLogId: rec.loggedFoodId,
        message: 'Already added to food log',
      });
    }

    // Use rec.id as the deterministic clientEventId so retried requests don't duplicate
    const clientEventId = `rec-accept-${rec.id}`;

    // Add to food log
    const insertResult = await db
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
        clientEventId,
        loggedDate: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // If conflict, fetch the existing food log entry
    let foodLog;
    if (insertResult.length > 0) {
      foodLog = insertResult[0];
    } else {
      const [existing] = await db
        .select()
        .from(foodLogTable)
        .where(and(eq(foodLogTable.userId, userId), eq(foodLogTable.clientEventId, clientEventId)))
        .limit(1);
      foodLog = existing;
    }

    // Update recommendation history
    await db
      .update(recommendationsHistoryTable)
      .set({
        interactionStatus: 'accepted',
        wasLogged: true,
        loggedFoodId: foodLog.id,
        loggedAt: new Date(),
        interactedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(recommendationsHistoryTable.id, rec.id));

    // Invalidate signal cache — new food log affects nutritional gap signals
    invalidateUserSignals(userId);

    res.json({
      success: true,
      foodLog,
      message: 'Added to food log'
    });
  } catch (error) {
    console.error('[Recommendations] Accept error:', error);
    errors.externalService(res, 'Recommendation acceptance');
  }
});

/**
 * GET /api/recommendations/history/list
 * Get user's recommendation history with filters
 */
router.get('/history/list', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { days = 30, status, type, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Build conditions array so userId/date are never overwritten by optional filters
    const conditions = [
      eq(recommendationsHistoryTable.userId, userId),
      gte(recommendationsHistoryTable.shownAt, startDate),
    ];
    if (status) conditions.push(eq(recommendationsHistoryTable.interactionStatus, status));
    if (type) conditions.push(eq(recommendationsHistoryTable.recommendationType, type));

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

    const history = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(and(...conditions))
      .orderBy(desc(recommendationsHistoryTable.shownAt))
      .limit(parsedLimit);

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
    errors.externalService(res, 'History retrieval');
  }
});

/**
 * GET /api/recommendations/stats/acceptance-by-preference
 * Get acceptance rate broken down by recommendation type
 * Used for profile analytics showing user preferences
 */
router.get('/stats/acceptance-by-preference', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;

    // Fetch all recommendations shown to this user
    const history = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(eq(recommendationsHistoryTable.userId, userId))
      .limit(500);

    const totalAccepted = history.filter(r => r.interactionStatus === 'accepted').length;
    const totalShown = history.length;
    const overallAcceptanceRate = totalShown > 0 ? totalAccepted / totalShown : 0;

    const byType = {};
    history.forEach(rec => {
      const type = rec.recommendationType || 'UNKNOWN';
      if (!byType[type]) byType[type] = { total: 0, accepted: 0, acceptanceRate: 0 };
      byType[type].total++;
      if (rec.interactionStatus === 'accepted') byType[type].accepted++;
    });
    Object.values(byType).forEach(d => {
      d.acceptanceRate = d.total > 0 ? d.accepted / d.total : 0;
    });

    // Consistent envelope regardless of whether history is empty or not
    res.json({
      success: true,
      stats: {
        acceptanceRate: overallAcceptanceRate,
        byType,
        totalShown,
        totalAccepted,
      },
    });
  } catch (error) {
    console.error('[Recommendations] Stats error:', error);
    errors.externalService(res, 'Statistics retrieval');
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
      return { acceptanceRate: 0, preferredTypes: [], preferredFoods: [], rejectedFoodNames: [] };
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

    // Build rejected food list: foods rejected 2+ times in the last 90 days.
    // This feeds into candidateGenerationService's rejection penalty so
    // repeatedly rejected foods get demoted in the candidate ranking.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const rejected = history.filter(
      (r) => r.interactionStatus === 'rejected' && new Date(r.shownAt) >= ninetyDaysAgo
    );
    const rejectionCount = {};
    for (const rec of rejected) {
      rejectionCount[rec.foodName] = (rejectionCount[rec.foodName] || 0) + 1;
    }
    const rejectedFoodNames = Object.entries(rejectionCount)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ name, count }));

    return {
      acceptanceRate,
      preferredTypes,
      preferredFoods,
      rejectedFoodNames,
      totalRecommendations: history.length
    };
  } catch (error) {
    console.error('[Recommendations] History analysis error:', error);
    return { acceptanceRate: 0, preferredTypes: [], preferredFoods: [], rejectedFoodNames: [] };
  }
}

// Arms eligible for Thompson Sampling exploration.
// Must stay in sync with ARM_CATEGORIES.RECOMMENDATION_TYPE in thompsonSamplingService.js.
const BANDIT_ARMS = ['PROTEIN_BOOST', 'LIGHT_SNACK', 'HYDRATION', 'REGIONAL_PICK', 'BALANCED_MEAL', 'FIBER_RICH', 'LOW_SODIUM', 'MICRONUTRIENT_BOOST'];

/**
 * Select recommendation type using Thompson Sampling bandit when no wellness
 * override is needed. Falls back to deterministic logic on error.
 *
 * @param {string}  userId
 * @param {string}  mealType
 * @param {object}  remainingBudget
 * @param {object}  profile
 * @param {object}  history
 * @param {object}  holisticIntelligence
 * @returns {Promise<string>}
 */
async function selectRecommendationTypeWithBandit(userId, mealType, remainingBudget, profile, history, holisticIntelligence, micronutrientUrgency = null) {
  // Wellness overrides always win — these are clinical signals, not bandit territory
  const override = determineRecommendationType(remainingBudget, profile, history, holisticIntelligence, micronutrientUrgency);
  const isBanditEligible = ['PROTEIN_BOOST', 'LIGHT_SNACK', 'HYDRATION', 'REGIONAL_PICK', 'BALANCED_MEAL', 'FIBER_RICH', 'LOW_SODIUM', 'MICRONUTRIENT_BOOST'].includes(override);

  if (!isBanditEligible) {
    return override; // Wellness override — skip bandit
  }

  try {
    const hour = new Date().getHours();
    const timeBucket = getTimeBucket(hour);
    const candidateArms = BANDIT_ARMS.map((t) => ({ recommendationType: t, mealType, timeBucket }));
    const result = await selectArm(userId, candidateArms, { explorationBoost: 0.1 });
    return result.selected.recommendationType;
  } catch (err) {
    logWarn(`Thompson Sampling failed, using deterministic fallback: ${err.message}`);
    return override;
  }
}

/**
 * Determine recommendation type with history awareness AND wellness state
 * Uses holistic intelligence to adapt recommendations to user's current state
 */
function determineRecommendationType(remainingBudget, profile, history, holisticIntelligence = null, micronutrientUrgency = null) {
  // Micronutrient deficit override: when 2+ micros are critically low (< 25% RDA),
  // surface targeted micronutrient-rich foods before generic wellness overrides.
  if (micronutrientUrgency?.hasDeficit) {
    const criticalDeficits = Object.values(micronutrientUrgency.deficits ?? {})
      .filter((d) => d.urgency > 0.6).length;
    if (criticalDeficits >= 2 || (criticalDeficits >= 1 && micronutrientUrgency.topDeficit !== null)) {
      return 'MICRONUTRIENT_BOOST';
    }
  }

  // 🧠 NEW: Wellness-state overrides (highest priority)
  if (holisticIntelligence?.currentState?.needsSpecialAttention) {
    const primaryConcern = holisticIntelligence.currentState.primaryConcern;

    // Low recovery → prioritize light, digestible foods
    if (primaryConcern === 'LOW_RECOVERY') {
      return 'RECOVERY_MEAL';
    }

    // Dehydration → prioritize hydrating foods
    if (primaryConcern === 'DEHYDRATED') {
      return 'HYDRATION';
    }

    // High stress → comfort foods with stress-reducing nutrients
    if (primaryConcern === 'HIGH_STRESS') {
      return 'STRESS_RELIEF';
    }

    // Post-workout → protein + carbs for recovery
    if (primaryConcern === 'POST_WORKOUT') {
      return 'POST_WORKOUT';
    }

    // Low mood/energy → mood-boosting foods
    if (primaryConcern === 'LOW_MOOD' || primaryConcern === 'LOW_ENERGY') {
      return 'ENERGY_BOOST';
    }
  }

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
 * Build a warning badge for allergen matches, colour-coded by severity.
 *
 * @param {string} allergen   - matched allergen name
 * @param {object} severity   - allergenSeverity map from profile
 * @param {object} typeMap    - intoleranceType map from profile
 * @returns {{ type, message, severity, color }}
 */
function buildAllergenWarningBadge(allergen, severityMap = {}, typeMap = {}) {
  const sev  = severityMap[allergen] || 'moderate';
  const type = typeMap[allergen]     || 'allergy';

  const colorMap = {
    anaphylaxis: '#7f1d1d',
    severe:      '#dc2626',
    moderate:    '#ea580c',
    mild:        '#d97706',
  };

  const prefix = type === 'intolerance' ? 'Intolerance' : type === 'preference' ? 'Avoid' : 'Allergy';
  return {
    type: sev === 'anaphylaxis' || sev === 'severe' ? 'danger' : 'warning',
    message: `${prefix}: ${allergen} (${sev})`,
    severity: sev,
    color: colorMap[sev] || colorMap.moderate,
  };
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
const ALLERGEN_PATTERNS = {
  'nut': {
    pattern: /\b(nut|nuts|almond|walnut|cashew|pecan|pistachio|macadamia|hazelnut|chestnut|peanut)\b/i,
    exceptions: ['coconut', 'donut', 'peanut butter'],
  },
  'milk':     { pattern: /\b(milk|dairy|cheese|cream|butter|yogurt|lactose)\b/i },
  'fish':     { pattern: /\b(fish|salmon|tuna|cod|haddock|halibut|anchovy|trout)\b/i, exceptions: ['jellyfish', 'starfish'] },
  'shellfish':{ pattern: /\b(shrimp|prawn|crab|lobster|oyster|clam|mussel|scallop)\b/i },
  'egg':      { pattern: /\b(egg|eggs|mayonnaise)\b/i },
  'soy':      { pattern: /\b(soy|soybean|tofu|tempeh|edamame|miso)\b/i },
  'wheat':    { pattern: /\b(wheat|bread|pasta|flour|barley)\b/i, exceptions: ['buckwheat'] },
  'peanut':   { pattern: /\b(peanut)\b/i },
  'tree nut': { pattern: /\b(almond|walnut|cashew|pecan|pistachio|macadamia)\b/i },
  'sesame':   { pattern: /\b(sesame|tahini)\b/i },
  'mustard':  { pattern: /\b(mustard)\b/i },
  'celery':   { pattern: /\b(celery|celeriac)\b/i },
  'dairy':    { pattern: /\b(milk|dairy|cheese|cream|butter|yogurt|lactose|whey|casein)\b/i },
  'gluten':   { pattern: /\b(wheat|barley|rye|gluten|seitan)\b/i, exceptions: ['buckwheat', 'gluten-free', 'gluten free'] },
  'sulfites': { pattern: /\b(sulfite|sulfites|sulphite|sulphites|wine|dried fruit)\b/i },
  'lupin':    { pattern: /\b(lupin|lupine|lupini)\b/i },
  'mollusks': { pattern: /\b(squid|octopus|calamari|snail|escargot)\b/i },
};

/**
 * Returns the names of all allergens from the user's list that match the food name.
 * Uses pattern-based matching to avoid false positives (e.g. "nut" won't match "coconut").
 */
function findMatchedAllergens(food, allergies) {
  const risk = detectAllergenRisk(food, allergies);
  if (risk.hasRisk) {
    const name = typeof food === 'string' ? food : (food?.foodName || food?.name || 'unknown food');
    logWarn(`Allergen risk: Food "${name}" matched ${risk.matchedAllergens.join(', ')}`);
  }
  return risk.matchedAllergens;
}

function improvedAllergenCheck(food, allergies) {
  return detectAllergenRisk(food, allergies).hasRisk;
}

/**
 * Derive the user's local hour from the timezone offset sent by the device.
 *
 * JS getTimezoneOffset() semantics (also used by the mobile app):
 *   offset < 0  → east of UTC  (e.g. India UTC+5:30 → -330)
 *   offset > 0  → west of UTC  (e.g. EST  UTC-5    → +300)
 *
 * Therefore: localTime = UTC - offset
 *
 * Falls back to server local time when the header is absent or invalid,
 * but logs a warning so it is visible in production logs.
 *
 * @param {number|null} timezoneOffsetMinutes
 * @returns {number} 0-23 hour in the user's local timezone
 */
function getLocalHour(timezoneOffsetMinutes) {
  if (!Number.isFinite(timezoneOffsetMinutes)) {
    console.warn('[Recommendations] No X-Timezone-Offset header — getMealType falling back to server local time');
    return new Date().getHours();
  }
  const localMs = Date.now() - timezoneOffsetMinutes * 60 * 1000;
  return new Date(localMs).getUTCHours();
}

/**
 * Get meal type based on the user's local hour.
 */
function getMealType(hour) {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack'; // late-night / early-morning
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
  // CRITICAL: macros (calories, protein, carbs, fats) are REQUIRED
  const requiredMacros = ['calories', 'protein', 'carbs', 'fats'];
  const optionalNutrients = ['fiber', 'sugar'];

  for (const field of requiredMacros) {
    const val = rec[field];
    if (val === undefined || val === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof val !== 'number' || val < 0 || !isFinite(val)) {
      errors.push(`Invalid ${field}: must be non-negative number, got ${val}`);
    }
  }

  for (const field of optionalNutrients) {
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
  // Macro budget checks use a 20 % tolerance band so that late-day recommendations
  // are not blanket-rejected when the remaining budget is very small.  Hard rejections
  // here cause the whole LLM batch to fail validation → regeneration → fallback, which
  // still violates the budget anyway (fallback items are not budget-aware).
  const MACRO_TOLERANCE = 1.2;
  if (rec.protein > remainingBudget.protein * MACRO_TOLERANCE + 5) {
    errors.push(`Protein ${rec.protein}g significantly exceeds remaining ${remainingBudget.protein}g`);
  }
  if (rec.carbs > remainingBudget.carbs * MACRO_TOLERANCE + 10) {
    errors.push(`Carbs ${rec.carbs}g significantly exceeds remaining ${remainingBudget.carbs}g`);
  }
  if (rec.fats > remainingBudget.fats * MACRO_TOLERANCE + 5) {
    errors.push(`Fats ${rec.fats}g significantly exceeds remaining ${remainingBudget.fats}g`);
  }

  // 4️⃣ Boolean field validation
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
    PROTEIN_BOOST:  { maxCalories: 400, minProtein: 20 },
    LIGHT_SNACK:    { maxCalories: 250, minProtein: 0 },
    HYDRATION:      { maxCalories: 50,  minProtein: 0 },
    BALANCED_MEAL:  { maxCalories: 600, minProtein: 10 },
    REGIONAL_PICK:  { maxCalories: 700, minProtein: 8 },
    FIBER_RICH:          { maxCalories: 500, minProtein: 5 },   // Focus is fiber ≥ 6g, not protein
    LOW_SODIUM:          { maxCalories: 600, minProtein: 8 },   // Standard meal, sodium < 600mg
    MICRONUTRIENT_BOOST: { maxCalories: 550, minProtein: 8 },   // Micronutrient-dense whole foods
    RECOVERY_MEAL:       { maxCalories: 400, minProtein: 10 },  // Light, digestible
    STRESS_RELIEF:       { maxCalories: 350, minProtein: 5 },   // Comfort foods, not heavy
    POST_WORKOUT:        { maxCalories: 500, minProtein: 25 },  // High protein + carbs
    ENERGY_BOOST:        { maxCalories: 450, minProtein: 15 },  // Sustained energy
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
 * NOW INCLUDES: Holistic wellness intelligence for cross-domain personalization
 * 🎯 NEW: Personalized pattern context for food-mood correlations
 */
async function generateWithRegeneration(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit,
  attempt = 1,
  holisticIntelligence = null,
  personalizedContext = null,
  userSignals = null,
  laggedCorrelations = [],
  candidates = [],
) {
  const MAX_ATTEMPTS = 2;
  const FILTER_THRESHOLD = limit * 0.67;

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
    limit + (attempt - 1) * 2,
    attempt > 1,
    holisticIntelligence,
    personalizedContext,
    userSignals,
    laggedCorrelations,
    candidates,
  );

  if (!recommendations || recommendations.length < FILTER_THRESHOLD) {
    logDebug(`Insufficient after filtering (${recommendations?.length || 0}/${limit}), regenerating...`);
    return generateWithRegeneration(recType, mealType, remainingBudget, profile, history, limit, attempt + 1, holisticIntelligence, personalizedContext, userSignals, laggedCorrelations, candidates);
  }

  return recommendations.slice(0, limit);
}

function buildMicronutrientContext(deficits) {
  if (!deficits || Object.keys(deficits).length === 0) return '';
  const lines = [
    '',
    '🧬 MICRONUTRIENT DEFICITS (CRITICAL — THIS IS WHY MICRONUTRIENT_BOOST WAS SELECTED)',
    'The user is significantly low on the following micronutrients today (< 50% of daily requirement):',
    '',
  ];
  for (const [nutrient, data] of Object.entries(deficits)) {
    const pct = Math.round((data.pctRda ?? 0) * 100);
    lines.push(`  • ${nutrient.toUpperCase()}: ${pct}% of daily requirement met (target: ${data.rda} ${nutrient.includes('IU') ? 'IU' : 'mg'})`);
  }
  lines.push('');
  lines.push('REQUIREMENT: All recommendations MUST be excellent sources of at least one of the above nutrients.');
  lines.push('Mention the specific nutrient and its benefit in the "reason" field for each recommendation.');
  lines.push('');
  return lines.join('\n');
}

function buildCandidatesContext(candidates) {
  if (!candidates || candidates.length === 0) return '';
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    '📋 PRE-SCORED FOOD CANDIDATES (SELECT FROM THESE — DO NOT INVENT NEW FOODS)',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    'These foods are pre-scored from the user\'s history, accepted recommendations, and food catalogue.',
    'SELECT exactly the required number from this list. Use the nutrition values shown — do not alter or fabricate macros.',
    '',
    'CANDIDATES (sorted by relevance score, highest first):',
  ];
  candidates.forEach((c, i) => {
    const name = c.name || c.foodName || 'Unknown';
    const nutrition = c.nutrition || {};
    const cal = nutrition.calories ?? c.calories ?? c.estimatedCalories ?? '?';
    const prot = nutrition.protein ?? c.protein ?? c.estimatedProtein ?? '?';
    const carbs = nutrition.carbs ?? c.carbs ?? c.estimatedCarbs ?? '?';
    const fats = nutrition.fat ?? nutrition.fats ?? c.fats ?? c.estimatedFat ?? '?';
    const fiber = nutrition.fiber ?? c.fiber ?? 0;
    const scoreStr = c.score !== undefined ? ` [score: ${c.score.toFixed(2)}]` : '';
    const sourceStr = c.source ? ` (${c.source})` : '';
    const nutritionSource = c.nutritionSource?.provider
      ? ` | source: ${c.nutritionSource.provider}${c.nutritionSource.fdcId ? ` #${c.nutritionSource.fdcId}` : ''}`
      : '';
    lines.push(`  ${i + 1}. "${name}" - ${cal} kcal | P: ${prot}g C: ${carbs}g F: ${fats}g Fiber: ${fiber}g${scoreStr}${sourceStr}${nutritionSource}`);
  });
  lines.push('', 'IMPORTANT: foodName in your output MUST exactly match one of the candidate names above.', '');
  return lines.join('\n');
}

function buildLaggedInsightsContext(laggedCorrelations) {
  if (!laggedCorrelations || laggedCorrelations.length === 0) return '';
  const top = laggedCorrelations.slice(0, 3);
  const lines = [
    '',
    '📊 PERSONAL TEMPORAL PATTERNS (DISCOVERED FROM THIS USER\'S OWN DATA)',
    'These lagged correlations were found by analyzing this user\'s food logs, mood, and energy over time:',
  ];
  top.forEach((c) => {
    const dir = (c.correlationAtOptimalLag ?? 0) > 0 ? 'tends to improve' : 'tends to worsen';
    const lagH = c.optimalLagHours != null ? `~${c.optimalLagHours}h later` : '';
    const text = c.interpretation
      || `${c.signalA} ${dir} ${c.signalB} ${lagH}`.trim();
    lines.push(`  • ${text}`);
  });
  lines.push('Use these personal patterns to strengthen personalization and avoid foods that historically hurt this user.', '');
  return lines.join('\n');
}

function formatSignalContextForPrompt(signals) {
  if (!signals || signals.moodConfidenceLabel === 'insufficient') {
    return '';
  }

  const lines = [
    '',
    'CURRENT USER SIGNALS',
    `- Mood confidence: ${signals.moodConfidenceLabel} (${signals.moodConfidence ?? 0})`,
  ];

  const moodReason = signals.explainability?.mood?.reason;
  if (moodReason) {
    lines.push(`- Mood signal reason: ${moodReason}`);
  }

  if ((signals.moodUrgency ?? 0) > 0.3) {
    lines.push('- Recommendation guidance: favor balanced mood-supportive foods when they also fit nutrition goals.');
  }

  if ((signals.energyUrgency ?? 0) > 0.3) {
    lines.push('- Recommendation guidance: favor steady-energy foods such as protein plus complex carbs.');
  }

  lines.push('- Language guidance: describe this as based on recent logs; do not claim a food will fix mood or energy.');
  return `${lines.join('\n')}\n`;
}

function getMoodSignalDisplayReason(signals) {
  if (!signals || signals.moodConfidenceLabel === 'insufficient') {
    return null;
  }

  if ((signals.moodUrgency ?? 0) <= 0.3 && (signals.energyUrgency ?? 0) <= 0.3) {
    return null;
  }

  return signals.explainability?.mood?.reason
    || signals.insights?.mood
    || null;
}

/**
 * CORE: Build prompt with UNIVERSAL constraints, DIVERSITY, and HOLISTIC WELLNESS
 * FLAW FIX #4: Diversity enforcement in prompt
 * FLAW FIX #5: Per-item constraints enforced
 * NEW: Chain-of-thought reasoning with cross-domain wellness intelligence
 * 🎯 NEW: Personalized pattern context for food-mood correlations and timing patterns
 */
async function generateEnhancedRecommendationsCore(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit,
  isRegeneration = false,
  holisticIntelligence = null,
  personalizedContext = null,
  userSignals = null,
  laggedCorrelations = [],
  candidates = [],
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

  // 🧠 Build holistic wellness context for prompt injection
  const wellnessContext = holisticIntelligence
    ? formatIntelligenceForPrompt(holisticIntelligence)
    : '';

  // 🎯 NEW: Build personalized pattern context from user's actual data
  const personalizedPatternContext = personalizedContext?.hasPatterns
    ? personalizedContext.context
    : '';
  const signalContext = formatSignalContextForPrompt(userSignals);
  const candidatesContext = buildCandidatesContext(candidates);
  const laggedInsightsContext = buildLaggedInsightsContext(laggedCorrelations);
  const micronutrientContext = recType === 'MICRONUTRIENT_BOOST' && userSignals?.micronutrientDeficits
    ? buildMicronutrientContext(userSignals.micronutrientDeficits)
    : '';
  const isRankerMode = candidates.length > 0;
  const taskInstruction = isRankerMode
    ? `SELECT exactly ${limit} foods from the PRE-SCORED CANDIDATES section below. Write personalized reason, wellnessReasoning, tips, and flavorProfile for each. Nutrition values MUST exactly match the candidate list — do not alter or fabricate macros.`
    : `Generate exactly ${limit} SPECIFIC, DETAILED food recommendations.`;

  // 🧠 NEW: Build wellness-aware recommendation type descriptions
  const recTypeDescriptions = {
    PROTEIN_BOOST:  'High-protein foods to help meet daily protein goals',
    BALANCED_MEAL:  'Well-balanced meals with good macro distribution',
    LIGHT_SNACK:    'Light, satisfying snacks under 250 calories',
    HYDRATION:      'Hydrating foods and beverages to improve fluid intake',
    REGIONAL_PICK:  'Regional/cultural favorites matching cuisine preferences',
    FIBER_RICH:          'High-fiber foods to improve gut health, satiety, and digestion (legumes, whole grains, vegetables)',
    LOW_SODIUM:          'Low-sodium options to reduce bloating and support heart health (fresh produce, unprocessed proteins)',
    MICRONUTRIENT_BOOST: 'Foods rich in the specific vitamins and minerals your body is currently low on (iron, calcium, vitamin-D, magnesium, etc.)',
    RECOVERY_MEAL:       'Light, easily digestible meals to support physical recovery (soups, smoothies, simple proteins)',
    STRESS_RELIEF:       'Magnesium-rich and B-vitamin foods to reduce stress (dark chocolate, leafy greens, nuts, avocado)',
    POST_WORKOUT:        'Protein + fast carbs for muscle recovery within the anabolic window',
    ENERGY_BOOST:        'Sustained energy foods with complex carbs, iron, and mood-supporting nutrients',
  };

  const recTypeDescription = recTypeDescriptions[recType] || recTypeDescriptions.BALANCED_MEAL;

  const prompt = `You are an expert nutritionist and culinary advisor. ${taskInstruction}

═══════════════════════════════════════════════════════════════════════════════
🍽️ NUTRITIONAL STATE
═══════════════════════════════════════════════════════════════════════════════

USER PROFILE & CURRENT STATE
- Remaining Calories: ${remainingBudget.calories} kcal
- Remaining Protein: ${remainingBudget.protein}g
- Remaining Carbohydrates: ${remainingBudget.carbs}g
- Remaining Fats: ${remainingBudget.fats}g
- Cuisine Preference: ${cuisinePreference}
- Regional Preference: ${region}
- Meal Type: ${mealType}
${personalizationContext}${allergenExclusion}${dietaryGuidance}${regenerationNote}
${wellnessContext}
${personalizedPatternContext}
${signalContext}
${micronutrientContext}
${candidatesContext}
${laggedInsightsContext}
RECOMMENDATION OBJECTIVE
Goal: ${recType} - ${recTypeDescription}
- Prioritize nutritional fit based on recommendation type
- Each recommendation must feel personalized and distinct
- CRITICALLY: Consider the user's wellness state above when making recommendations

${diversityGuidance}
${constraintGuidance}

═══════════════════════════════════════════════════════════════════════════════
⚡ SPECIFICITY REQUIREMENTS (CRITICAL - THIS IS WHAT MAKES RECOMMENDATIONS GREAT)
═══════════════════════════════════════════════════════════════════════════════

1. FOOD NAMES - Be descriptive and specific, NOT generic:
   ❌ BAD: "Grilled Chicken", "Salad", "Smoothie", "Rice Bowl"
   ✅ GOOD: "Herb-Crusted Chicken Breast with Lemon & Thyme"
   ✅ GOOD: "Mediterranean Quinoa Salad with Feta, Cucumber & Kalamata Olives"
   ✅ GOOD: "Mango-Spinach Protein Smoothie with Chia Seeds"
   ✅ GOOD: "Korean Bibimbap Bowl with Gochujang Sauce"

   Include: cooking method + main ingredient + 2-3 key flavors/ingredients

2. REASON - Explain WHY this specific food fits THIS USER's current needs:
   ❌ BAD: "High protein, low fat" (generic nutritional statement)
   ❌ BAD: "Good for muscle building" (vague benefit)
   ✅ GOOD: "With ${remainingBudget.protein}g protein remaining, this delivers 28g to hit 75% of your daily goal. The slow-digesting casein keeps you full until dinner."
   ✅ GOOD: "You have ${remainingBudget.calories} kcal left - this satisfying 380-cal meal leaves room for an evening snack while providing complete amino acids from quinoa + chickpeas."

   Include: Reference their SPECIFIC remaining budget, explain the nutritional strategy

3. TIPS - Give ACTIONABLE cooking instructions with sensory cues:
   ❌ BAD: "Grill for 6-8 minutes" (no context)
   ❌ BAD: "Season and cook" (too vague)
   ✅ GOOD: "Pat chicken dry, season with smoked paprika + garlic powder. Sear in cast iron 4 min/side until internal temp hits 165°F. Rest 5 min before slicing against the grain."
   ✅ GOOD: "Toast quinoa in dry pan until fragrant (~2 min). Add 2:1 water ratio, simmer 15 min. Fluff with fork, fold in diced cucumber, crumbled feta, and a drizzle of olive oil + lemon."

   Include: Specific temperatures, timing cues, sensory indicators (fragrant, golden, sizzling)

4. FLAVOR PROFILE - Match cuisine preference (${cuisinePreference}):
   - If Indian: Include specific spices (garam masala, turmeric, cumin, coriander)
   - If Mediterranean: Olive oil, lemon, herbs, feta, olives
   - If Asian: Soy, ginger, sesame, rice vinegar, fresh herbs
   - If Mexican: Lime, cilantro, cumin, chili, avocado
   - If American: Comfort classics with healthier twists

5. PERSONALIZATION HOOK - Connect to user's context:
   - Reference time of day: "${mealType}" meal suggestions should match energy needs
   - Reference their history if available: "${history.preferredFoods?.join(', ') || 'no history yet'}"
   - Suggest variations: "Swap chicken for tofu if you want plant-based"

═══════════════════════════════════════════════════════════════════════════════
🧠 CHAIN-OF-THOUGHT: CROSS-DOMAIN REASONING (USE THIS MENTAL MODEL)
═══════════════════════════════════════════════════════════════════════════════

Before generating each recommendation, mentally work through this reasoning chain:

STEP 1: Check Wellness State (consider ALL that apply, combine creatively)
→ Recovery low? → Light, digestible: broths, congee, steamed fish, soft-cooked eggs, smoothies
→ Dehydrated? → Water-rich: cucumbers, watermelon, soups, gazpacho, coconut water, citrus
→ Stress high? → Magnesium + adaptogens: leafy greens, nuts, seeds, dark chocolate, chamomile, turmeric
→ Post-workout? → Protein + glycogen: lean proteins with rice, yogurt parfaits, recovery bowls
→ Low mood/energy? → Omega-3 + B vitamins: fatty fish, eggs, fortified grains, fermented foods
→ Sleep-deprived? → Tryptophan + complex carbs: turkey, warm milk, oats, bananas, tart cherry
→ Digestive issues? → Probiotics + fiber: kimchi, kefir, whole grains, gentle vegetables
→ Inflammation? → Anti-inflammatory: turmeric, ginger, berries, leafy greens, fatty fish

STEP 2: Check Macro Alignment
→ High protein remaining? → Prioritize protein-dense options
→ Low calories remaining? → Lighter portions, vegetable-heavy
→ Balanced needs? → Complete meals with all macros

STEP 3: Check Personalized Patterns (from THIS user's actual data - CRITICAL for personalization)
→ Good foods → Recommend these OR similar foods (same category, flavor profile, or nutrient profile)
   Example: If "salmon" is good → also consider other fatty fish, omega-3 rich foods
→ Watch foods → Avoid these OR suggest better alternatives/timing
   Example: If "pasta" is watch → suggest zucchini noodles, quinoa pasta, or lighter grains
→ Timing insights → Align recommendations with user's optimal eating windows
   Example: If early breakfast helps → suggest quick, nutritious breakfast options
→ Pattern combinations → Layer multiple patterns for maximum personalization
   Example: Good food + optimal timing + wellness need = highly personalized recommendation

STEP 4: Check Preferences & Constraints
→ Cuisine preference (${cuisinePreference}) → Draw from authentic dishes, spices, and techniques:
   • Indian: dal, curries, biryanis, chutneys, raita, dosas, idlis
   • Mediterranean: mezze, grilled proteins, olive oil, herbs, legumes, seafood
   • Asian: stir-fries, rice bowls, noodle soups, dumplings, sushi, congee
   • Mexican: tacos, bowls, salsas, beans, grilled meats, fresh vegetables
   • American: comfort classics with healthy twists, grain bowls, salads
   • Middle Eastern: hummus, falafel, shawarma, tabbouleh, grilled kebabs
   • Japanese: miso, sashimi, donburi, edamame, steamed dishes
→ Dietary restrictions → Strict compliance (vegetarian, vegan, keto, etc.)
→ Allergens → Zero tolerance - never include, suggest safe alternatives

STEP 5: Synthesize
→ Find foods that satisfy ALL conditions simultaneously
→ If conflicts exist, prioritize: Safety > Wellness State > Macros > Preferences

ILLUSTRATIVE EXAMPLES (apply reasoning to ANY situation, not just these):

These examples demonstrate HOW to reason - apply the same framework to the ACTUAL user state provided above.
Generate creative, diverse recommendations that fit THIS user's unique combination of wellness state, patterns, and preferences.

Example 1: LOW RECOVERY + DEHYDRATED
User State: Recovery 35/100, Hydration 40%, Stressed
✅ CORRECT: "Ginger-Turmeric Bone Broth with Soft-Cooked Vegetables"
   Reason: "Your recovery score is low and you're dehydrated. This warm, hydrating broth delivers 500ml fluid, anti-inflammatory compounds, and easy-to-digest nutrients without taxing your digestive system."
❌ WRONG: "Loaded Beef Burrito with Extra Cheese"
   Why wrong: Heavy, difficult to digest, won't help recovery

Example 2: POST-WORKOUT + HIGH PROTEIN NEED
User State: Within 2h of strength training, 45g protein remaining
✅ CORRECT: "Greek Yogurt Power Bowl with Berries, Honey & Granola"
   Reason: "You just finished a workout - this delivers 23g fast-absorbing protein + 35g carbs to maximize muscle protein synthesis during your anabolic window. The berries add antioxidants for recovery."
❌ WRONG: "Garden Salad with Light Vinaigrette"
   Why wrong: Low protein, won't support post-workout recovery

Example 3: HIGH STRESS + LOW MOOD
User State: Stress 8/10, Mood declining, Low energy
✅ CORRECT: "Dark Chocolate Almond Butter Banana Smoothie"
   Reason: "With stress at 8/10 and declining mood, your body needs magnesium and mood-boosting nutrients. Dark chocolate provides theobromine + magnesium, banana offers tryptophan (serotonin precursor), and almond butter adds B vitamins."
❌ WRONG: "Large Coffee with Sugar"
   Why wrong: Caffeine + sugar will spike then crash, worsening mood and stress

Example 4: USER HAS PERSONALIZED PATTERN DATA
User Patterns: Oatmeal correlates with +15% energy, Pasta correlates with -12% energy, Early breakfast = better days
✅ CORRECT: "Steel-Cut Oatmeal with Fresh Berries and Honey"
   Reason: "Based on YOUR data: oatmeal consistently gives you a 15% energy boost. We've seen this pattern 8 times in your logs. Perfect for breakfast to start your day strong."
   wellnessReasoning: "Your personal patterns show oatmeal is YOUR energy food - not just general nutrition advice, but discovered from YOUR actual logged meals and mood check-ins."
❌ WRONG: "Creamy Carbonara Pasta"
   Why wrong: User's data shows pasta correlates with lower energy for THEM specifically

═══════════════════════════════════════════════════════════════════════════════
🎨 CREATIVITY MANDATE - DO NOT COPY EXAMPLES VERBATIM
═══════════════════════════════════════════════════════════════════════════════

The examples above are ILLUSTRATIVE ONLY. For each recommendation:
1. SYNTHESIZE the user's ACTUAL wellness state, patterns, and preferences (shown above)
2. GENERATE novel food ideas that address their SPECIFIC situation
3. DRAW FROM global cuisines, seasonal ingredients, and creative preparations
4. AVOID recommending the same foods from examples unless they genuinely fit
5. VARY protein sources, cooking methods, and flavor profiles across recommendations
6. CONSIDER the user's cuisine preference (${cuisinePreference}) for authentic flavor suggestions

Your recommendations should feel FRESH and PERSONALIZED, not templated.

═══════════════════════════════════════════════════════════════════════════════

CRITICAL SAFETY RULES
1. NEVER recommend foods containing allergens: ${allergies.join(', ') || 'none'}
2. STRONGLY PREFER foods matching Essential (5) and Really Prefer (4) preferences
3. Validate all nutrition values are realistic and complete

${isRankerMode ? `⚠️ RANKER MODE ACTIVE: foodName must exactly match one of the candidate names above. Nutrition values (calories, protein, carbs, fats, fiber, sugar) must be copied from the candidate list — do not fabricate or adjust them.\n\n` : ''}OUTPUT SCHEMA (REQUIRED - RETURN AS JSON ARRAY, NOT WRAPPED):
[
  {
    "foodName": ${isRankerMode ? '"Must exactly match a candidate name from the list above"' : '"Descriptive name with cooking method + key ingredients (e.g., \'Pan-Seared Salmon with Dill-Yogurt Sauce & Roasted Asparagus\')"'},
    "portion": "e.g., '150g salmon + 100g asparagus', '1 cup (240ml)', '2 medium pieces (80g each)'",
    "calories": number (0-${constraints.maxCalories}),
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number,
    "sugar": number,
    "reason": "Personalized explanation referencing user's specific remaining budget and nutritional strategy - NOT generic statements",
    "wellnessReasoning": "How this food addresses the user's current wellness state (recovery, stress, mood, hydration) - reference specific metrics from the wellness context",
    "tips": "Step-by-step cooking instructions with temperatures, timing, and sensory cues",
    "prepTimeMinutes": number,
    "allergenFree": true,
    "dietCompliant": boolean,
    "preferenceStrengthMatch": 1-5,
    "warningBadge": null or {"text": "reason", "type": "dietary|dislike|low-priority"},
    "flavorProfile": "Brief description: e.g., 'Savory-tangy with fresh herbs' or 'Warm spices with creamy finish'",
    "keyIngredients": ["ingredient1", "ingredient2", "ingredient3"]
  }
]

VALIDATION CHECKLIST
✓ Exactly ${limit} unique recommendations (no duplicate foods)
✓ Each item ≤ ${constraints.maxCalories} calories
✓ All nutrition fields are numbers (not strings, not null)
✓ Portion sizes in standard units with weight (grams, cups, pieces, oz, tbsp)
${isRankerMode ? '✓ foodName exactly matches a candidate name from the pre-scored list\n✓ Nutrition values copied from candidate list, not invented' : '✓ Diverse protein sources (mix of animal, plant, dairy)\n✓ Food names are SPECIFIC (include cooking method + 2-3 key ingredients/flavors)'}
✓ NO foods containing: ${allergies.join(', ') || 'none'}
✓ Returned as JSON array (not wrapped in object)
✓ Reasons reference USER'S SPECIFIC remaining budget numbers
✓ Tips include specific temperatures, times, and sensory cues`;

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

    // FLAW FIX #3: Server-side allergen filter (defense in depth, severity-aware)
    // Critical allergens (anaphylaxis/severe) → hard-block
    // Non-critical allergens (moderate/mild) → keep but attach a warningBadge
    const criticalAllergens = profile?.dietary?.criticalAllergens || [];
    const criticalAllergenSet = new Set([
      ...criticalAllergens,
      ...expandAllergens(criticalAllergens),
    ]);
    const allergenSeverityMap = profile?.dietary?.allergenSeverity || {};
    const intoleranceTypeMap  = profile?.dietary?.intoleranceType  || {};

    const safeRecommendations = [];
    for (const rec of validatedRecs) {
      if (rec.allergenFree === false) {
        console.warn(`[Recommendations] Filtered: ${rec.foodName} - AI marked unsafe`);
        continue;
      }

      const matchedAllergens = findMatchedAllergens(rec, allergies);
      if (matchedAllergens.length === 0) {
        safeRecommendations.push(rec);
        continue;
      }

      const criticalMatch = matchedAllergens.find(a => criticalAllergenSet.has(a));
      if (criticalMatch) {
        console.warn(`[Recommendations] Filtered: ${rec.foodName} - critical allergen: ${criticalMatch}`);
        continue;
      }

      // Non-critical match (moderate/mild): keep but surface a warning badge
      const primaryAllergen = matchedAllergens[0];
      const badge = buildAllergenWarningBadge(primaryAllergen, allergenSeverityMap, intoleranceTypeMap);
      console.warn(`[Recommendations] Warning badge attached: ${rec.foodName} - ${badge.message}`);
      safeRecommendations.push({ ...rec, warningBadge: badge });
    }

    logDebug(`Safety filter: ${validatedRecs.length} → ${safeRecommendations.length} safe`);

    // RANKER MODE: Override LLM-generated macros with pre-scored candidate values to prevent hallucination.
    // Candidates from generateCandidates() store macros under candidate.nutrition.* (not flat fields).
    // The catalogue uses `fat` (not `fats`) so we read both names as fallbacks.
    const candidateMap = new Map(
      candidates.map((c) => [(c.name || c.foodName || '').toLowerCase(), c])
    );
    const mergedRecommendations = safeRecommendations.map((rec) => {
      if (!isRankerMode) return rec;
      // Fuzzy-tolerant lookup: try exact match, then check if LLM output is a substring of
      // a candidate name (handles minor LLM paraphrasing like "Dal Soup" vs "Dal (Yellow Lentil Soup)").
      const recNameLower = (rec.foodName || '').toLowerCase();
      let candidate = candidateMap.get(recNameLower);
      if (!candidate) {
        for (const [key, c] of candidateMap) {
          if (key.includes(recNameLower) || recNameLower.includes(key)) {
            candidate = c;
            break;
          }
        }
      }
      if (!candidate) {
        console.warn(`[Recommendations] Dropped ungrounded ranker output: ${rec.foodName}`);
        return null;
      }
      const n = candidate.nutrition ?? {};
      return {
        ...rec,
        foodName: candidate.name || rec.foodName,
        portion: candidate.portion || rec.portion,
        calories: n.calories ?? rec.calories,
        protein:  n.protein  ?? rec.protein,
        carbs:    n.carbs    ?? rec.carbs,
        fats:     n.fat      ?? n.fats    ?? rec.fats,   // catalogue uses 'fat', accepted recs use 'fats'
        fiber:    n.fiber    ?? rec.fiber,
        sugar:    n.sugar    ?? rec.sugar,
        _candidateScore: candidate.score,
        nutritionSource: candidate.nutritionSource,
      };
    }).filter(Boolean);

    // OPTIMIZATION: Compute personalization score once per recommendation (not during sort)
    const scoredRecommendations = mergedRecommendations.map(rec => ({
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
      // CRITICAL: Ensure nutrition values exist (shouldn't reach here but safeguard)
      const calories = rec.calories ?? 0;
      const protein = rec.protein ?? 0;
      const carbs = rec.carbs ?? 0;
      const fats = rec.fats ?? 0;

      if (!calories || !protein) {
        console.warn(`[Recommendations] WARNING: Recommendation "${rec.foodName}" has missing macros (cal=${calories}, prot=${protein}). This should have been filtered earlier!`);
      }

      const prefLabel = getPreferenceLabel(rec.preferenceStrengthMatch ?? 3);
      const persLabel = getPersonalizationLabel(rec.personalizationScore);
      const warningInfo = getWarningSeverity(rec.warningBadge);
      const macroBalance = calculateMacroBalance({calories, protein, carbs, fats});
      const confidence = getConfidenceContext(rec);
      const comparison = getComparisonContext(rec, rankedByScore, idx);
      const reasoning = getPersonalizationReasoning({calories, protein, carbs, fats}, remainingBudget, mealType);
      const moodSignalReason = getMoodSignalDisplayReason(userSignals);

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
          calories,
          protein,
          carbs,
          fats,
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
        recType: recType,

        // NEW: Enhanced specificity fields
        flavorProfile: rec.flavorProfile || null,
        keyIngredients: rec.keyIngredients || [],

        // NEW: Wellness-aware reasoning (cross-domain intelligence)
        wellnessReasoning: rec.wellnessReasoning || moodSignalReason,
        wellnessContext: moodSignalReason ? 'MOOD_SIGNAL' : null
      };
    });

    return enrichedRecommendations;
  } catch (error) {
    console.error('[Recommendations] AI generation error:', error.message);
    // FLAW FIX #6: Proper error logging
    return null;
  }
}

function buildDeterministicRecommendationsFromCandidates(candidates, recType, mealType, remainingBudget, limit, userSignals = null) {
  return candidates.slice(0, limit).map((candidate, idx) => {
    const n = candidate.nutrition || {};
    const calories = n.calories ?? 0;
    const protein = n.protein ?? 0;
    const carbs = n.carbs ?? 0;
    const fats = n.fat ?? n.fats ?? 0;
    const fiber = n.fiber ?? 0;
    const sugar = n.sugar ?? 0;
    const personalizationScore = calculatePersonalizationScore({ calories, protein, carbs, fats }, remainingBudget);
    const prefLabel = getPreferenceLabel(3);
    const persLabel = getPersonalizationLabel(personalizationScore);
    const macroBalance = calculateMacroBalance({ calories, protein, carbs, fats });
    const confidence = getConfidenceContext({ aiConfidence: candidate.source === 'usda' ? 0.95 : 0.88 });
    const moodSignalReason = getMoodSignalDisplayReason(userSignals);

    return {
      id: `rec-${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`,
      rank: idx + 1,
      isTopPick: idx === 0,
      title: getTitleForType(recType),
      foodName: candidate.name,
      portion: candidate.portion || '1 serving',
      calories,
      protein,
      carbs,
      fats,
      fiber,
      sugar,
      nutrition: {
        calories,
        protein,
        carbs,
        fats,
        fiber,
        sugar,
        macroBalance,
      },
      preference: {
        score: 3,
        label: prefLabel.label,
        icon: prefLabel.icon,
        level: prefLabel.level,
        reasoning: 'Selected from verified recommendation candidates',
      },
      personalization: {
        score: personalizationScore,
        label: persLabel.label,
        emoji: persLabel.emoji,
        level: persLabel.level,
        reasoning: getPersonalizationReasoning({ calories, protein, carbs, fats }, remainingBudget, mealType),
      },
      preparation: {
        timeMinutes: candidate.prepTime ?? 10,
        confidence,
        difficulty: 'easy',
        tips: 'Use the listed portion as the nutrition baseline and adjust only after logging the actual amount.',
      },
      warning: null,
      visual: {
        color: getColorForType(recType),
        gradient: getColorForType(recType),
        meaning: recType,
        icon: getTitleForType(recType).split(' ')[0],
      },
      comparison: {
        rankLabel: `#${idx + 1} of ${Math.min(limit, candidates.length)}`,
        betterOptions: Math.max(0, candidates.length - idx - 1),
        totalRecommendations: Math.min(limit, candidates.length),
      },
      dietCompliance: {
        compliant: true,
        message: 'Selected from safe candidate pool',
      },
      allergenSafety: {
        safe: true,
        message: 'Screened against allergens and hidden allergen dishes',
        confidence: candidate.allergenRisk?.confidence ?? 0.95,
      },
      reason: `${candidate.name} ranked highly for your current ${mealType} context and remaining nutrition budget.`,
      tips: 'Use the listed portion as the nutrition baseline and adjust only after logging the actual amount.',
      mealType,
      recType,
      flavorProfile: candidate.cuisineTags?.length ? `${candidate.cuisineTags.join(', ')} inspired` : null,
      keyIngredients: [],
      wellnessReasoning: moodSignalReason,
      wellnessContext: moodSignalReason ? 'MOOD_SIGNAL' : null,
      nutritionSource: candidate.nutritionSource,
      aiGenerated: false,
    };
  });
}

/**
 * Main entry point: Orchestrate generation with regeneration logic
 * FLAW FIX #3: Handles incomplete recommendations gracefully
 * NOW INCLUDES: Holistic wellness intelligence for cross-domain personalization
 * 🎯 NEW: Personalized pattern context for food-mood correlations and timing patterns
 */
async function generateEnhancedRecommendations(
  recType,
  mealType,
  remainingBudget,
  profile,
  history,
  limit,
  holisticIntelligence = null,
  personalizedContext = null,
  userSignals = null,
  laggedCorrelations = [],
  candidates = [],
) {
  const allergies = profile?.dietary?.allergies || [];

  if (!candidates || candidates.length === 0) {
    console.warn('[Recommendations] No grounded candidates available; using curated verified fallback data');
    return getFallbackRecommendations(recType, mealType, remainingBudget, limit)
      .filter(rec => !improvedAllergenCheck(rec, allergies));
  }

  // Try with regeneration logic (fixes flaw #3)
  let recommendations = await generateWithRegeneration(
    recType,
    mealType,
    remainingBudget,
    profile,
    history,
    limit,
    1,
    holisticIntelligence,
    personalizedContext,
    userSignals,
    laggedCorrelations,
    candidates,
  );

  // If regeneration completely fails, fall back to curated list
  if (!recommendations || recommendations.length === 0) {
    console.warn('[Recommendations] AI ranking failed; using deterministic grounded candidate fallback');
    recommendations = buildDeterministicRecommendationsFromCandidates(
      candidates,
      recType,
      mealType,
      remainingBudget,
      limit,
      userSignals,
    );
  }

  // Final allergen filter for fallback
  return recommendations.filter(rec => !improvedAllergenCheck(rec, allergies));
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
  if (!recommendations?.length) return;

  const hour = context.hour;
  const remainingBudget = context.remainingBudget;

  // Build all rows first, then insert in a single batch — avoids N serial DB round-trips.
  const rows = recommendations.map((rec) => {
    const nutrition = rec.nutrition || {};
    // recommendations_history stores these as integer columns, but AI-estimated
    // nutrition values (e.g. "0.6g fiber") are frequently fractional — round before insert.
    const calories = Math.round(nutrition.calories ?? rec.calories ?? 0);
    const protein  = Math.round(nutrition.protein  ?? rec.protein  ?? 0);
    const carbs    = Math.round(nutrition.carbs    ?? rec.carbs    ?? 0);
    const fats     = Math.round(nutrition.fats     ?? rec.fats     ?? 0);
    const fiber    = Math.round(nutrition.fiber    ?? rec.fiber    ?? 0);
    const sugar    = Math.round(nutrition.sugar    ?? rec.sugar    ?? 0);

    return {
      userId,
      recommendationId: rec.id,
      foodName: rec.foodName,
      portion: rec.portion,
      calories, protein, carbs, fats, fiber, sugar,
      micros: rec.micros || {},
      recommendationType: context.recType,
      reason: rec.reason || nutrition.reason,
      tips: (rec.preparation?.tips || rec.tips) || '',
      prepTimeMinutes: rec.preparation?.timeMinutes || rec.prepTimeMinutes || 10,
      recipeInstructions: rec.recipeInstructions || '',
      mealType: context.mealType,
      timeOfDay: hour,
      // Same integer-column constraint as above — remainingBudget is derived from
      // float subtraction (goal - consumed) and is frequently fractional.
      remainingCalories: Math.round(remainingBudget.calories),
      remainingProtein: Math.round(remainingBudget.protein),
      remainingCarbs: Math.round(remainingBudget.carbs),
      remainingFats: Math.round(remainingBudget.fats),
      interactionStatus: 'shown',
      aiGenerated: rec.aiGenerated !== false,
      aiModel: rec.aiGenerated === false ? 'deterministic-grounded-ranker' : 'gpt-4o-mini',
      aiConfidence: rec.allergenSafety?.confidence || 0.85,
      personalizationScore: rec.personalization?.score
        || calculatePersonalizationScore({ calories, protein, carbs, fats }, remainingBudget),
      preferenceStrengthMatch: Math.round(rec.preference?.score || rec.preferenceStrengthMatch || 3),
      dietCompliant: rec.dietCompliance?.compliant === true,
      allergenFree: rec.allergenSafety?.safe === true,
      warningBadge: rec.warning || null,
      createdAt: new Date(),
    };
  });

  await db
    .insert(recommendationsHistoryTable)
    .values(rows)
    .onConflictDoNothing({ target: recommendationsHistoryTable.recommendationId });
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
    // NEW: Wellness-aware fallback recommendations
    RECOVERY_MEAL: [
      {
        foodName: 'Ginger-Turmeric Bone Broth',
        portion: '500ml',
        calories: 45,
        protein: 6,
        carbs: 3,
        fats: 1,
        reason: 'Anti-inflammatory, easy to digest, hydrating',
        wellnessReasoning: 'Supports recovery with anti-inflammatory compounds and gentle nutrition',
        tips: 'Sip warm throughout the day for best absorption',
      },
      {
        foodName: 'Banana Oatmeal with Honey',
        portion: '1 bowl (250g)',
        calories: 280,
        protein: 8,
        carbs: 52,
        fats: 5,
        reason: 'Gentle on stomach, sustained energy',
        wellnessReasoning: 'Easily digestible carbs support recovery without taxing your system',
        tips: 'Cook oats with water or milk, top with sliced banana and drizzle of honey',
      },
    ],
    STRESS_RELIEF: [
      {
        foodName: 'Dark Chocolate Almond Trail Mix',
        portion: '40g (1/4 cup)',
        calories: 210,
        protein: 5,
        carbs: 18,
        fats: 14,
        reason: 'Magnesium-rich for stress reduction',
        wellnessReasoning: 'Dark chocolate provides magnesium and theobromine to reduce cortisol levels',
        tips: 'Portion into small containers to avoid overeating',
      },
      {
        foodName: 'Avocado Toast with Pumpkin Seeds',
        portion: '1 slice with 1/2 avocado',
        calories: 320,
        protein: 8,
        carbs: 28,
        fats: 20,
        reason: 'B vitamins and healthy fats for mood stability',
        wellnessReasoning: 'Avocado provides B6 for serotonin production, pumpkin seeds add zinc for stress resilience',
        tips: 'Use whole grain bread, sprinkle with pumpkin seeds and a pinch of sea salt',
      },
    ],
    POST_WORKOUT: [
      {
        foodName: 'Greek Yogurt Power Bowl',
        portion: '200g yogurt + toppings',
        calories: 320,
        protein: 28,
        carbs: 35,
        fats: 6,
        reason: 'Fast protein + carbs for muscle recovery',
        wellnessReasoning: 'Within the anabolic window, this delivers fast-absorbing protein and glycogen-replenishing carbs',
        tips: 'Top with berries, granola, and a drizzle of honey for optimal recovery',
      },
      {
        foodName: 'Chicken Rice Bowl',
        portion: '150g chicken + 1 cup rice',
        calories: 450,
        protein: 35,
        carbs: 45,
        fats: 10,
        reason: 'Complete post-workout meal',
        wellnessReasoning: 'High-quality protein for muscle synthesis, rice for glycogen replenishment',
        tips: 'Season chicken with garlic and herbs, serve over jasmine rice with vegetables',
      },
    ],
    ENERGY_BOOST: [
      {
        foodName: 'Spinach and Berry Smoothie',
        portion: '400ml',
        calories: 280,
        protein: 10,
        carbs: 45,
        fats: 6,
        reason: 'Iron + B vitamins for sustained energy',
        wellnessReasoning: 'Spinach provides iron for oxygen transport, berries offer natural sugars without the crash',
        tips: 'Blend spinach, mixed berries, banana, and almond milk until smooth',
      },
      {
        foodName: 'Eggs with Whole Grain Toast',
        portion: '2 eggs + 2 slices',
        calories: 340,
        protein: 18,
        carbs: 30,
        fats: 16,
        reason: 'B12 and complex carbs for energy',
        wellnessReasoning: 'Eggs provide B12 and choline for brain energy, whole grains offer sustained glucose release',
        tips: 'Scramble or poach eggs, serve on toasted whole grain with a side of fruit',
      },
    ],
    FIBER_RICH: [
      {
        foodName: 'Lentil & Vegetable Soup',
        portion: '1 bowl (300ml)',
        calories: 220,
        protein: 12,
        carbs: 38,
        fats: 3,
        fiber: 10,
        sugar: 5,
        reason: 'High fiber supports gut health and satiety',
        wellnessReasoning: 'Red lentils deliver 10g fiber per bowl, promoting a healthy microbiome and stable blood sugar',
        tips: 'Simmer red lentils with diced carrots, tomato, cumin and turmeric for 20 minutes',
      },
      {
        foodName: 'Overnight Oats with Chia & Berries',
        portion: '1 jar (350g)',
        calories: 310,
        protein: 10,
        carbs: 48,
        fats: 8,
        fiber: 9,
        sugar: 12,
        reason: 'Oats + chia seeds deliver 9g soluble and insoluble fiber',
        wellnessReasoning: 'Beta-glucan in oats slows digestion, lowers cholesterol, and keeps you full for hours',
        tips: 'Mix 50g oats, 1 tbsp chia seeds, 200ml milk. Refrigerate overnight. Top with berries before serving.',
      },
    ],
    LOW_SODIUM: [
      {
        foodName: 'Grilled Salmon with Steamed Broccoli',
        portion: '150g salmon + 150g broccoli',
        calories: 380,
        protein: 36,
        carbs: 12,
        fats: 18,
        fiber: 5,
        sugar: 3,
        reason: 'Naturally low sodium, rich in omega-3 and potassium',
        wellnessReasoning: 'Salmon and broccoli provide < 150mg sodium per serving while supporting heart health',
        tips: 'Season salmon with lemon juice, dill and black pepper (no salt). Steam broccoli for 5 minutes until tender-crisp.',
      },
      {
        foodName: 'Avocado & Tomato Salad with Lime',
        portion: '1 bowl (250g)',
        calories: 200,
        protein: 3,
        carbs: 14,
        fats: 16,
        fiber: 7,
        sugar: 4,
        reason: 'Zero added sodium, potassium-rich to offset sodium retention',
        wellnessReasoning: 'Avocado potassium counteracts sodium effects on blood pressure; lime replaces salt for flavor',
        tips: 'Dice avocado and tomato, squeeze fresh lime, add cilantro and black pepper. Eat immediately to prevent browning.',
      },
    ],
    MICRONUTRIENT_BOOST: [
      {
        foodName: 'Palak Paneer (Spinach & Cottage Cheese Curry)',
        portion: '1 serving (200g)',
        calories: 250,
        protein: 16,
        carbs: 10,
        fats: 16,
        fiber: 5,
        sugar: 3,
        reason: 'Iron, calcium, and vitamin A in one dish',
        wellnessReasoning: 'Spinach delivers iron and folate; paneer adds calcium and B12 — together they address multiple micronutrient gaps simultaneously',
        tips: 'Blanch spinach, blend smooth. Sauté onion-tomato masala, add spinach purée and cubed paneer. Cook 5 minutes.',
      },
      {
        foodName: 'Egg & Salmon Bento Bowl',
        portion: '2 eggs + 100g salmon + 1 cup rice',
        calories: 480,
        protein: 38,
        carbs: 40,
        fats: 16,
        fiber: 2,
        sugar: 1,
        reason: 'Vitamin D, B12, and omega-3 in a single meal',
        wellnessReasoning: 'Salmon provides vitamin D and omega-3; eggs add B12, choline, and zinc — all commonly deficient in plant-forward diets',
        tips: 'Soft-boil eggs 6 min. Sear salmon skin-down 4 min each side. Serve over rice with cucumber and soy sauce.',
      },
      {
        foodName: 'Rajma (Kidney Bean Curry) with Brown Rice',
        portion: '1 cup rajma + 3/4 cup rice',
        calories: 380,
        protein: 16,
        carbs: 66,
        fats: 5,
        fiber: 12,
        sugar: 4,
        reason: 'Iron, folate, and magnesium from legumes',
        wellnessReasoning: 'Kidney beans are one of the richest plant-based iron sources; pairing with brown rice adds magnesium and B vitamins',
        tips: 'Pressure cook soaked beans 20 min. Prepare onion-tomato gravy with cumin, coriander, and garam masala.',
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
    PROTEIN_BOOST:  '💪 Protein Boost',
    BALANCED_MEAL:  '🥗 Balanced Meal',
    LIGHT_SNACK:    '🍎 Light Snack',
    HYDRATION:      '💧 Hydration',
    REGIONAL_PICK:  '🌍 Regional Pick',
    FIBER_RICH:          '🌾 Fiber Rich',
    LOW_SODIUM:          '🫀 Low Sodium',
    MICRONUTRIENT_BOOST: '🧬 Micronutrient Boost',
    RECOVERY_MEAL:       '🛌 Recovery Meal',
    STRESS_RELIEF:  '🧘 Stress Relief',
    POST_WORKOUT:   '🏋️ Post-Workout',
    ENERGY_BOOST:   '⚡ Energy Boost',
  };
  return titles[type] || titles.BALANCED_MEAL;
}

/**
 * Get gradient colors for recommendation type
 */
function getColorForType(type) {
  const colors = {
    PROTEIN_BOOST:  ['#FBBF24', '#F59E0B'],
    BALANCED_MEAL:  ['#86EFAC', '#22C55E'],
    LIGHT_SNACK:    ['#A7F3D0', '#10B981'],
    HYDRATION:      ['#BFDBFE', '#3B82F6'],
    REGIONAL_PICK:  ['#E9D5FF', '#8B5CF6'],
    FIBER_RICH:          ['#BBF7D0', '#16A34A'],  // Green - gut health, plants
    LOW_SODIUM:          ['#BAE6FD', '#0284C7'],  // Sky blue - clean, light
    MICRONUTRIENT_BOOST: ['#E0E7FF', '#4F46E5'],  // Indigo - science, precision
    RECOVERY_MEAL:       ['#DDD6FE', '#8B5CF6'],  // Purple - calming
    STRESS_RELIEF:  ['#FED7AA', '#F97316'],  // Orange - warm, comforting
    POST_WORKOUT:   ['#FCA5A5', '#EF4444'],  // Red - energy, action
    ENERGY_BOOST:   ['#FDE68A', '#F59E0B'],  // Yellow - bright, energizing
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
