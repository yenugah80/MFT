/**
 * ML-Enhanced Recommendation Orchestrator Service
 *
 * Extends the base orchestrator with production-grade ML capabilities:
 * - Thompson Sampling for recommendation selection (multi-armed bandit)
 * - A/B testing for feature experimentation
 * - Drift detection for model degradation monitoring
 * - Lagged correlations for temporal pattern discovery
 * - Feature interactions for synergy/antagonism detection
 *
 * This service is the integration layer that coordinates all ML services
 * with the existing recommendation pipeline.
 *
 * Architecture:
 * 1. User logs data → Correlations computed
 * 2. Correlations → Candidate recommendations generated
 * 3. Thompson Sampling → Best recommendation selected
 * 4. A/B Testing → Experiment variant assigned
 * 5. User feedback → Arms updated, drift monitored
 *
 * References:
 * - Lattimore & Szepesvári (2020): Bandit Algorithms
 * - Russo et al. (2018): Tutorial on Thompson Sampling
 */

import { db } from '../db/index.js';
import {
  profilesTable,
  recommendationsHistoryTable,
  userCorrelationsTable,
  gamificationTable,
  foodLogTable,
  waterLogTable,
  moodLogTable,
} from '../db/schema.js';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

// Import ML services
import {
  selectArm,
  selectContextualArm,
  updateArm,
  getArmStatistics,
  generateArmKey,
  getTimeBucket,
} from './thompsonSamplingService.js';

import {
  getOrAssignVariant,
  analyzeExperiment,
  sequentialTest,
} from './statisticalTestingService.js';

import {
  monitorCorrelationDrift,
  monitorAcceptanceRateDrift,
  getLatestDriftStatus,
} from './driftDetectionService.js';

import {
  discoverOptimalLag,
  analyzeAllSignalPairs,
} from './laggedCorrelationService.js';

import {
  analyzeInteraction,
  getUserInteractions,
} from './featureInteractionService.js';

// Import base orchestrator functions
import {
  determineLifecycleStage,
  decideRecommendationType,
  generateMessage,
} from './recommendationOrchestratorService.js';

import {
  computeUserCorrelations,
  getUserCorrelations,
  saveCorrelation,
} from './correlationEngineService.js';

/**
 * Format raw rule names into human-readable titles
 */
function formatCorrelationTitle(ruleName) {
  if (!ruleName) return 'Pattern detected';

  const titleMap = {
    'high_nova_mood_crash': 'Processed foods affect your mood',
    'dehydration_fatigue_mood': 'Hydration impacts your energy',
    'breakfast_skip_afternoon_crash': 'Skipping breakfast affects afternoon',
    'protein_breakfast_energy': 'Protein breakfast boosts energy',
    'high_sugar_dinner_morning_anxiety': 'Evening sugar affects next morning',
    'exercise_mood_boost': 'Exercise improves your mood',
    'sedentary_mood_impact': 'Movement helps your mood',
    'beverage_variety_compliance': 'Drink variety helps you stay hydrated',
    'hydration_mood_stability': 'Hydration keeps mood stable',
    'caffeine_energy_crash': 'Caffeine causes energy dips',
    'evening_caffeine_sleep_impact': 'Late caffeine affects sleep',
    'alcohol_mood_impact': 'Alcohol affects next-day mood',
    'stress_eating_disruption': 'Stress changes eating patterns',
    'meal_timing_energy': 'Meal timing affects energy',
    'goal_compliance': 'You hit your daily goals',
  };

  return titleMap[ruleName] || ruleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Deduplicate and filter correlations for display
 * - Remove duplicates (keep highest confidence for each ruleName)
 * - Filter out patterns with insufficient occurrences (<7)
 * - Filter out low confidence patterns (<0.6)
 */
function filterAndDeduplicateCorrelations(correlations, minOccurrences = 7, minConfidence = 0.6) {
  if (!correlations || !Array.isArray(correlations)) return [];

  // First filter by minimum thresholds
  const validCorrelations = correlations.filter(c =>
    (c.occurrences || 0) >= minOccurrences &&
    (parseFloat(c.confidence) || 0) >= minConfidence
  );

  // Then deduplicate by ruleName - keep highest confidence version
  const seen = new Map();
  for (const corr of validCorrelations) {
    const key = corr.ruleName;
    if (!seen.has(key) || parseFloat(corr.confidence) > parseFloat(seen.get(key).confidence)) {
      seen.set(key, corr);
    }
  }

  // Return sorted by confidence (highest first)
  return Array.from(seen.values()).sort((a, b) =>
    parseFloat(b.confidence) - parseFloat(a.confidence)
  );
}

/**
 * ============================================
 * RECOMMENDATION ARM DEFINITIONS
 * ============================================
 */

// Recommendation types as bandit arms
const RECOMMENDATION_ARMS = [
  { recommendationType: 'PROTEIN_BOOST', category: 'macro', priority: 'high' },
  { recommendationType: 'FIBER_RICH', category: 'macro', priority: 'medium' },
  { recommendationType: 'HYDRATION', category: 'hydration', priority: 'high' },
  { recommendationType: 'LIGHT_SNACK', category: 'calorie', priority: 'medium' },
  { recommendationType: 'BALANCED_MEAL', category: 'general', priority: 'medium' },
  { recommendationType: 'LOW_SODIUM', category: 'health', priority: 'medium' },
  { recommendationType: 'REGIONAL_PICK', category: 'preference', priority: 'low' },
  { recommendationType: 'MOOD_BOOST', category: 'mood', priority: 'high' },
  { recommendationType: 'ENERGY_SUSTAIN', category: 'energy', priority: 'high' },
  { recommendationType: 'SLEEP_SUPPORT', category: 'sleep', priority: 'medium' },
];

/**
 * ============================================
 * ACTIVE EXPERIMENTS
 * ============================================
 */

// Define active A/B experiments
const ACTIVE_EXPERIMENTS = {
  recommendation_timing: {
    id: 'exp_rec_timing_v1',
    variants: ['immediate', 'delayed_2h', 'next_meal'],
    description: 'Test optimal timing for recommendation delivery',
  },
  insight_depth: {
    id: 'exp_insight_depth_v1',
    variants: ['simple', 'detailed', 'scientific'],
    description: 'Test preferred level of insight detail',
  },
  action_framing: {
    id: 'exp_action_frame_v1',
    variants: ['gain_framed', 'loss_framed', 'neutral'],
    description: 'Test framing effect on recommendation acceptance',
  },
};

/**
 * ============================================
 * ML-ENHANCED ORCHESTRATION
 * ============================================
 */

/**
 * Calculate the total number of distinct days with any logged activity
 * This is the correct way to measure user engagement - not totalMealsLogged/3
 */
async function getTotalDaysWithLogs(userId) {
  try {
    // Query distinct dates from all log tables
    const [foodDays, waterDays, moodDays] = await Promise.all([
      db.select({ date: sql`DATE(${foodLogTable.loggedDate})`.as('date') })
        .from(foodLogTable)
        .where(eq(foodLogTable.userId, userId))
        .groupBy(sql`DATE(${foodLogTable.loggedDate})`),
      db.select({ date: sql`DATE(${waterLogTable.loggedDate})`.as('date') })
        .from(waterLogTable)
        .where(eq(waterLogTable.userId, userId))
        .groupBy(sql`DATE(${waterLogTable.loggedDate})`),
      db.select({ date: sql`DATE(${moodLogTable.loggedDate})`.as('date') })
        .from(moodLogTable)
        .where(eq(moodLogTable.userId, userId))
        .groupBy(sql`DATE(${moodLogTable.loggedDate})`),
    ]);

    // Combine all dates into a Set to get unique days
    const allDates = new Set();
    foodDays.forEach(row => row.date && allDates.add(String(row.date)));
    waterDays.forEach(row => row.date && allDates.add(String(row.date)));
    moodDays.forEach(row => row.date && allDates.add(String(row.date)));

    return allDates.size;
  } catch (error) {
    console.warn('[ML Orchestrator] Error calculating totalDaysWithLogs:', error.message);
    return 0;
  }
}

/**
 * Enhanced daily orchestration with ML capabilities
 *
 * @param {string} userId - User ID
 * @param {Object} options - Orchestration options
 * @returns {Promise<Object>} Enhanced recommendation output
 */
export async function orchestrateDailyRecommendationsML(userId, options = {}) {
  const {
    includeExperiments = true,
    includeDriftCheck = true,
    includeLaggedCorrelations = false,
    includeInteractions = false,
  } = options;

  try {
    console.log(`[ML Orchestrator] Starting enhanced orchestration for user: ${userId}`);

    // Step 1: Fetch user profile and metrics
    const userProfile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!userProfile || userProfile.length === 0) {
      throw new Error(`User not found: ${userId}`);
    }

    const user = userProfile[0];

    // Step 2: Fetch gamification stats
    const gamStats = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    const stats = gamStats[0] || {};

    // Step 3: Determine lifecycle stage
    // CRITICAL FIX: Calculate actual distinct days with logs, not rough estimate
    const actualDaysWithLogs = await getTotalDaysWithLogs(userId);

    const userMetrics = {
      totalDaysWithLogs: actualDaysWithLogs,
      loggingStreak: stats.streak || 0,
      daysSinceLastLog: stats.lastLogDate
        ? Math.floor((Date.now() - new Date(stats.lastLogDate)) / (1000 * 60 * 60 * 24))
        : 999,
    };

    const lifecycleStage = determineLifecycleStage(userMetrics);
    console.log(`[ML Orchestrator] User ${userId} stage: ${lifecycleStage.stage}`);

    // Step 4: Compute and save correlations
    const correlationResult = await computeUserCorrelations(userId, {
      windowTypes: lifecycleStage.windowTypes,
    });

    for (const correlation of correlationResult.correlations) {
      await saveCorrelation(userId, correlation);
    }

    // Step 5: Fetch correlations for decision
    const correlations = await getUserCorrelations(userId, {
      minConfidence: lifecycleStage.minConfidence,
      limit: lifecycleStage.correlationsToShow + 2,
    });

    // Step 6: Generate candidate recommendations based on correlations
    const candidateArms = generateCandidateArms(correlations, user, lifecycleStage);

    // Step 7: Use Thompson Sampling to select best recommendation
    const currentHour = new Date().getHours();
    const userContext = {
      currentHour,
      mealType: inferMealType(currentHour),
      remainingCalories: await estimateRemainingCalories(userId),
      dayOfWeek: new Date().getDay(),
    };

    const thompsonResult = await selectContextualArm(userId, candidateArms, userContext);
    const selectedArm = thompsonResult.selected;

    console.log(`[ML Orchestrator] Thompson Sampling selected: ${selectedArm.recommendationType}`);

    // Step 8: Make decision using base orchestrator
    const decision = decideRecommendationType(correlations, lifecycleStage, userMetrics);

    // Step 9: Generate message
    const message = generateMessage(decision, decision.correlation, lifecycleStage);

    // Step 10: Assign A/B experiment variants
    let experimentVariants = {};
    if (includeExperiments) {
      experimentVariants = await assignExperimentVariants(userId);
    }

    // Step 11: Check for drift (async, non-blocking)
    let driftStatus = null;
    if (includeDriftCheck && userMetrics.totalDaysWithLogs >= 30) {
      driftStatus = await checkDriftStatus(userId);
    }

    // Step 12: Get lagged correlations if requested
    let laggedInsights = null;
    if (includeLaggedCorrelations && userMetrics.totalDaysWithLogs >= 14) {
      laggedInsights = await getLaggedInsights(userId);
    }

    // Step 13: Get feature interactions if requested
    let interactions = null;
    if (includeInteractions && userMetrics.totalDaysWithLogs >= 21) {
      interactions = await getUserInteractions(userId, 30);
    }

    // Step 14: Calculate stage progression
    const STAGE_PROGRESSION = {
      DISCOVERER: { duration: 1 },
      BUILDER: { duration: 5 },
      TRACKER: { duration: 23 },
      OPTIMIZER: { duration: 60 },
      MASTER: { duration: 90 },
      CHAMPION: { duration: 185 },
      ELITE: { duration: Infinity },
    };

    const STAGE_ORDER = ['DISCOVERER', 'BUILDER', 'TRACKER', 'OPTIMIZER', 'MASTER', 'CHAMPION', 'ELITE'];
    const currentIndex = STAGE_ORDER.indexOf(lifecycleStage.stage);

    let stageDaysStart = 0;
    for (let i = 0; i < currentIndex; i++) {
      stageDaysStart += STAGE_PROGRESSION[STAGE_ORDER[i]].duration;
    }
    const daysInCurrentStage = userMetrics.totalDaysWithLogs - stageDaysStart;
    const stageDuration = STAGE_PROGRESSION[lifecycleStage.stage].duration;
    const daysToNextStage = Math.max(0, stageDuration - daysInCurrentStage);

    // Step 15: Build enhanced output
    const output = {
      success: true,
      userId,

      // Primary recommendation (Thompson Sampling selected)
      recommendation: {
        type: selectedArm.recommendationType,
        armKey: selectedArm.armKey,
        confidence: selectedArm.posteriorMean,
        credibleInterval: selectedArm.credibleInterval,
        isExploration: selectedArm.isExploration,
        selectionMethod: thompsonResult.selectionMethod,
        alternatives: thompsonResult.alternatives.slice(0, 2).map(a => ({
          type: a.recommendationType,
          confidence: a.posteriorMean,
        })),
      },

      // Decision envelope
      decision: {
        type: decision.type,
        headline: message.headline,
        subtitle: message.subtitle,
        confidence: decision.correlation?.confidence || 0,
        actions: message.actions,
        visualComponent: message.visual?.type,
      },

      // Supporting correlations (deduplicated, filtered for quality)
      correlations: filterAndDeduplicateCorrelations(correlations)
        .slice(0, lifecycleStage.correlationsToShow)
        .map(c => ({
          id: c.id,
          pattern: formatCorrelationTitle(c.ruleName),
          confidence: parseFloat(c.confidence),
          occurrences: c.occurrences,
          affectedDomains: c.affectedDomains,
          whatHappens: c.expectedOutcome,
        })),

      // User journey
      lifecycle: {
        stage: lifecycleStage.stage,
        label: lifecycleStage.label,
        daysSinceStart: userMetrics.totalDaysWithLogs,
        daysInCurrentStage: Math.max(0, daysInCurrentStage),
        daysToNextStage,
      },

      // ML metadata
      ml: {
        thompsonSampling: {
          totalCandidates: candidateArms.length,
          selected: selectedArm.armKey,
          exploration: selectedArm.isExploration,
        },
        experiments: experimentVariants,
        drift: driftStatus,
        laggedInsights: laggedInsights
          ? {
              count: laggedInsights.length,
              topSignal: laggedInsights[0] || null,
            }
          : null,
        interactions: interactions
          ? {
              count: interactions.length,
              topSynergy: interactions.find(i => i.interactionType === 'synergistic') || null,
            }
          : null,
      },

      // Context used for selection
      context: {
        timeBucket: getTimeBucket(currentHour),
        mealType: userContext.mealType,
        isWeekend: userContext.dayOfWeek === 0 || userContext.dayOfWeek === 6,
      },

      timestamp: new Date().toISOString(),
    };

    console.log(`[ML Orchestrator] Enhanced orchestration complete for user ${userId}`);

    return output;
  } catch (error) {
    console.error(`[ML Orchestrator] Error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================
 * FEEDBACK & ARM UPDATE
 * ============================================
 */

/**
 * Record user feedback on a recommendation and update Thompson Sampling arm
 *
 * @param {string} userId - User ID
 * @param {string} recommendationId - Recommendation ID
 * @param {string} armKey - Arm key
 * @param {boolean} accepted - Whether user accepted the recommendation
 * @param {Object} metadata - Additional feedback metadata
 * @returns {Promise<Object>} Update result
 */
export async function recordRecommendationFeedback(userId, recommendationId, armKey, accepted, metadata = {}) {
  try {
    console.log(`[ML Orchestrator] Recording feedback: user=${userId}, arm=${armKey}, accepted=${accepted}`);

    // Step 1: Update Thompson Sampling arm
    const armUpdate = await updateArm(userId, armKey, accepted, {
      recommendationId,
      feedbackTime: new Date().toISOString(),
      ...metadata,
    });

    // Step 2: Record in recommendations history
    if (recommendationId) {
      await db
        .update(recommendationsHistoryTable)
        .set({
          accepted,
          feedbackAt: new Date(),
          metadata: sql`COALESCE(${recommendationsHistoryTable.metadata}, '{}') || ${JSON.stringify(metadata)}::jsonb`,
        })
        .where(eq(recommendationsHistoryTable.id, recommendationId));
    }

    // Step 3: Trigger drift monitoring (async, fire-and-forget)
    monitorAcceptanceRateDrift(userId, { windowDays: 7 }).catch(err => {
      console.error('[ML Orchestrator] Drift monitoring error (non-blocking):', err.message);
    });

    return {
      success: true,
      armUpdate,
      message: `Feedback recorded for arm ${armKey}`,
    };
  } catch (error) {
    console.error('[ML Orchestrator] Error recording feedback:', error);
    throw error;
  }
}

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Generate candidate arms based on correlations and user context
 */
function generateCandidateArms(correlations, user, lifecycleStage) {
  const currentHour = new Date().getHours();
  const timeBucket = getTimeBucket(currentHour);
  const mealType = inferMealType(currentHour);

  const candidates = [];

  // Generate arms for each recommendation type with context
  for (const arm of RECOMMENDATION_ARMS) {
    // Skip low priority arms for new users
    if (lifecycleStage.stage === 'DISCOVERER' && arm.priority === 'low') {
      continue;
    }

    // Check if this arm is relevant based on correlations
    const relevantCorrelation = correlations.find(c => {
      const domains = c.affectedDomains || [];
      return (
        (arm.category === 'mood' && domains.includes('mood')) ||
        (arm.category === 'energy' && domains.includes('energy')) ||
        (arm.category === 'sleep' && domains.includes('sleep')) ||
        (arm.category === 'hydration' && domains.includes('hydration')) ||
        arm.category === 'general'
      );
    });

    candidates.push({
      ...arm,
      timeBucket,
      mealType,
      correlationSupport: relevantCorrelation ? relevantCorrelation.confidence : 0,
    });
  }

  return candidates;
}

/**
 * Infer meal type from hour
 */
function inferMealType(hour) {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

/**
 * Estimate remaining calories for the day
 */
async function estimateRemainingCalories(userId) {
  try {
    // Get today's logged calories
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysLogs = await db
      .select({
        totalCalories: sql`COALESCE(SUM(${sql.raw('calories')}), 0)`,
      })
      .from(sql`food_log`)
      .where(
        and(
          eq(sql.raw('user_id'), userId),
          gte(sql.raw('logged_at'), today)
        )
      );

    const consumed = parseInt(todaysLogs[0]?.totalCalories || 0);
    const dailyTarget = 2000; // Default, could be fetched from user profile

    return Math.max(0, dailyTarget - consumed);
  } catch (error) {
    return 500; // Default fallback
  }
}

/**
 * Assign experiment variants to user
 */
async function assignExperimentVariants(userId) {
  const variants = {};

  for (const [key, experiment] of Object.entries(ACTIVE_EXPERIMENTS)) {
    const variant = await getOrAssignVariant(experiment.id, userId);
    variants[key] = variant;
  }

  return variants;
}

/**
 * Check drift status for user
 */
async function checkDriftStatus(userId) {
  try {
    const driftResult = await getLatestDriftStatus(userId);
    return driftResult;
  } catch (error) {
    console.error('[ML Orchestrator] Error checking drift:', error.message);
    return null;
  }
}

/**
 * Get lagged correlation insights
 */
async function getLaggedInsights(userId) {
  try {
    const result = await analyzeAllSignalPairs(userId, { days: 30 });
    // Return top 3 significant lagged correlations
    return result
      .filter(r => r.isSignificant)
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 3);
  } catch (error) {
    console.error('[ML Orchestrator] Error getting lagged insights:', error.message);
    return null;
  }
}

/**
 * ============================================
 * BATCH ORCHESTRATION
 * ============================================
 */

/**
 * Run ML-enhanced orchestration for all active users
 */
export async function orchestrateAllUsersML(options = {}) {
  const { batchSize = 50, limit = null } = options;

  try {
    console.log('[ML Orchestrator] Starting batch orchestration...');

    let query = db.select().from(profilesTable);
    if (limit) {
      query = query.limit(limit);
    }

    const users = await query;
    console.log(`[ML Orchestrator] Processing ${users.length} users`);

    const results = {
      success: [],
      errors: [],
      driftAlerts: [],
    };

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async user => {
          try {
            const result = await orchestrateDailyRecommendationsML(user.userId, {
              includeDriftCheck: true,
              includeLaggedCorrelations: false, // Skip for batch to save time
              includeInteractions: false,
            });

            // Check for drift alerts
            if (result.ml?.drift?.driftDetected) {
              results.driftAlerts.push({
                userId: user.userId,
                drift: result.ml.drift,
              });
            }

            return { userId: user.userId, success: true };
          } catch (error) {
            return { userId: user.userId, success: false, error: error.message };
          }
        })
      );

      for (const r of batchResults) {
        if (r.success) {
          results.success.push(r.userId);
        } else {
          results.errors.push(r);
        }
      }

      console.log(`[ML Orchestrator] Completed ${Math.min(i + batchSize, users.length)}/${users.length}`);
    }

    console.log(`[ML Orchestrator] Batch complete: ${results.success.length} succeeded, ${results.errors.length} failed, ${results.driftAlerts.length} drift alerts`);

    return results;
  } catch (error) {
    console.error('[ML Orchestrator] Batch orchestration error:', error);
    throw error;
  }
}

/**
 * ============================================
 * ANALYTICS & REPORTING
 * ============================================
 */

/**
 * Get ML performance metrics for a user
 */
export async function getUserMLMetrics(userId) {
  try {
    const [armStats, driftStatus, interactions] = await Promise.all([
      getArmStatistics(userId),
      getLatestDriftStatus(userId).catch(() => null),
      getUserInteractions(userId, 30).catch(() => []),
    ]);

    return {
      userId,
      thompsonSampling: armStats,
      drift: driftStatus,
      interactions: {
        count: interactions.length,
        synergistic: interactions.filter(i => i.interactionType === 'synergistic').length,
        antagonistic: interactions.filter(i => i.interactionType === 'antagonistic').length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ML Orchestrator] Error getting ML metrics:', error);
    throw error;
  }
}

export default {
  orchestrateDailyRecommendationsML,
  recordRecommendationFeedback,
  orchestrateAllUsersML,
  getUserMLMetrics,
};
