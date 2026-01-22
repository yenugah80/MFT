/**
 * Decision Brain Service - The Unified Intelligence Layer
 *
 * This is the CENTRAL ORCHESTRATION layer that integrates all ML components:
 * - Correlation Engine (pattern detection)
 * - Thompson Sampling (exploration-exploitation)
 * - Drift Detection (model health monitoring)
 * - Learning State (user lifecycle)
 * - Prediction Engine (forecasting)
 * - Mood Recommendation Engine (mood-specific insights)
 * - Safety Guardrails (filtering dangerous recommendations)
 *
 * Core Decision Framework:
 * - SPEAK: New significant pattern discovered (user needs to know)
 * - REINFORCE: Known pattern still valid (positive reinforcement)
 * - PREDICT: Anticipatory insight (proactive guidance)
 * - SILENT: User is optimal OR not enough data (don't spam)
 *
 * The brain decides WHAT to say, WHEN to say it, and WHY.
 */

import { db } from '../db/index.js';
import {
  profilesTable,
  foodLogTable,
  moodLogTable,
  waterLogTable,
  userCorrelationsTable,
  gamificationTable,
  activityLogTable,
  sleepLogTable,
  stressLogTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// Import ML component services
import {
  determineLifecycleStage,
  decideRecommendationType,
  generateMessage,
} from './recommendationOrchestratorService.js';
import { computeUserCorrelations, getUserCorrelations } from './correlationEngineService.js';
import { selectArm, updateArm } from './thompsonSamplingService.js';
import { getLatestDriftStatus } from './driftDetectionService.js';
import { bootstrapLearningFromHistory, getLearningReadiness } from './learningStateService.js';
import moodRecommendationEngine from './moodRecommendationEngine.js';
const { buildMoodProfile: generateMoodProfile, generateMoodRecommendations } = moodRecommendationEngine;

/**
 * ============================================================================
 * DECISION BRAIN CONSTANTS
 * ============================================================================
 */

// Minimum thresholds before showing insights
// UPDATED: Lowered thresholds for early user engagement
// Analytics show from Day 1, recommendations from Day 2
const DATA_THRESHOLDS = {
  // Before any correlations can be shown (lowered from 7 to 2)
  // Users see basic patterns from Day 2, refined patterns from Day 7+
  MIN_DAYS_FOR_CORRELATIONS: 2,
  MIN_FOOD_LOGS: 3,  // Lowered from 10
  MIN_MOOD_LOGS: 2,  // Lowered from 5

  // Before predictive insights (lowered from 14 to 3)
  // Early predictions from Day 3, calibrated predictions from Day 14+
  MIN_DAYS_FOR_PREDICTIONS: 3,
  MIN_CORRELATION_CONFIDENCE: 0.45,  // Lowered from 0.55 for early insights

  // Validation requirements (lowered from 3 to 2)
  MIN_EVIDENCE_COUNT: 2,
};

// Decision types with their priorities
const DECISION_PRIORITY = {
  SAFETY_ALERT: 1,      // Highest - safety concerns
  SPEAK: 2,             // New significant pattern
  PREDICT: 3,           // Anticipatory insight
  REINFORCE: 4,         // Positive reinforcement
  ENCOURAGE: 5,         // Logging encouragement
  SILENT: 6,            // No action needed
};

// Confidence thresholds for speech decisions
const CONFIDENCE_THRESHOLDS = {
  VERY_HIGH: 0.85,
  HIGH: 0.70,
  MODERATE: 0.55,
  LOW: 0.40,
};

/**
 * ============================================================================
 * EVIDENCE EXTRACTION UTILITIES
 * ============================================================================
 *
 * These utilities extract rich evidence from correlation data for
 * hyper-personalized, evidence-anchored insights.
 */

/**
 * Format a date as a human-readable day reference
 * e.g., "Last Tuesday", "Yesterday", "Jan 15"
 */
function formatDateReference(dateStr) {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Last ${days[date.getDay()]}`;
  }
  if (diffDays < 14) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format time as 12-hour with am/pm
 */
function formatTimeOfDay(hour) {
  if (hour === undefined || hour === null) return null;
  const h = parseInt(hour);
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

/**
 * Extract the best (most impactful) evidence example from correlation data
 * Returns a specific instance with date, time, and outcome for personalization
 */
function extractBestEvidence(correlation) {
  const { evidenceJson = {}, ruleName } = correlation;
  const examples = evidenceJson.examples || [];

  if (examples.length === 0) {
    return {
      hasBestExample: false,
      bestInstance: null,
      recentInstances: [],
    };
  }

  // Sort by impact (most negative outcome first for negative correlations)
  const sortedExamples = [...examples].sort((a, b) => {
    const impactA = a.moodDrop || a.energyDrop || -(a.moodBoost || a.energyBoost || 0);
    const impactB = b.moodDrop || b.energyDrop || -(b.moodBoost || b.energyBoost || 0);
    return impactB - impactA;
  });

  const best = sortedExamples[0];
  const recent = sortedExamples.slice(0, 3);

  return {
    hasBestExample: true,
    bestInstance: {
      date: best.date || best.observationDate,
      dateFormatted: formatDateReference(best.date || best.observationDate),
      time: best.hour || best.hourOfDay,
      timeFormatted: formatTimeOfDay(best.hour || best.hourOfDay),
      trigger: best.food || best.foodName || best.beverageType || best.activity,
      triggerValue: best.triggerValue || best.sugarGrams || best.caffeineCount || best.minutes,
      outcome: best.moodAfter || best.energyAfter || best.sleepQuality,
      outcomeDelta: best.moodDrop || best.energyDrop || best.moodBoost || best.energyBoost,
    },
    recentInstances: recent.map(ex => ({
      date: ex.date || ex.observationDate,
      dateFormatted: formatDateReference(ex.date || ex.observationDate),
      trigger: ex.food || ex.foodName || ex.beverageType || ex.activity,
      outcome: ex.moodAfter || ex.energyAfter,
    })),
  };
}

/**
 * Compute aggregate statistics: condition met vs not met
 * Returns comparison data for insights like "7.2 mood with X vs 5.1 without"
 */
function computeAggregateStats(correlation) {
  const { evidenceJson = {}, signalAValue, signalBValue, occurrences = 0 } = correlation;

  // Extract pre-computed stats if available
  const avgWithCondition = evidenceJson.avgMoodWith || evidenceJson.avgEnergyWith || signalBValue;
  const avgWithoutCondition = evidenceJson.avgMoodWithout || evidenceJson.avgEnergyWithout || evidenceJson.baseline;
  const sampleSizeWith = evidenceJson.countWith || occurrences;
  const sampleSizeWithout = evidenceJson.countWithout || 0;

  // Calculate delta
  const delta = avgWithCondition && avgWithoutCondition
    ? Math.round((avgWithCondition - avgWithoutCondition) * 10) / 10
    : null;

  // Calculate percentage change
  const percentChange = avgWithoutCondition && avgWithoutCondition !== 0 && delta
    ? Math.round((delta / avgWithoutCondition) * 100)
    : null;

  return {
    hasComparison: avgWithCondition != null && avgWithoutCondition != null,
    avgWithCondition: avgWithCondition != null ? Math.round(avgWithCondition * 10) / 10 : null,
    avgWithoutCondition: avgWithoutCondition != null ? Math.round(avgWithoutCondition * 10) / 10 : null,
    delta,
    percentChange,
    sampleSizeWith,
    sampleSizeWithout,
    isStatisticallySignificant: sampleSizeWith >= 5 && Math.abs(delta || 0) > 0.5,
  };
}

/**
 * Generate a counterfactual prediction
 * e.g., "If you had done X differently, predicted outcome would be Y"
 */
function generateCounterfactualPrediction(correlation, recentUserData = {}) {
  const { ruleName, evidenceJson = {}, signalAValue, signalBValue } = correlation;
  const stats = computeAggregateStats(correlation);

  if (!stats.hasComparison || !stats.delta) {
    return { hasCounterfactual: false };
  }

  let action = null;
  let predictedOutcome = null;
  let unit = '';

  switch (ruleName) {
    case 'dehydration_fatigue_mood':
    case 'dehydration_mood_instability': {
      const targetWater = (signalAValue || 2) * 1.3;
      action = `drinking ${Math.round(targetWater * 10) / 10}L instead`;
      predictedOutcome = Math.abs(stats.delta);
      unit = 'mood points';
      break;
    }
    case 'high_nova_mood_crash':
    case 'high_sugar_dinner_morning_anxiety': {
      const sugarReduction = Math.round((signalAValue || 30) * 0.4);
      action = `reducing sugar by ${sugarReduction}g`;
      predictedOutcome = Math.abs(stats.delta) * 0.6;
      unit = 'energy points';
      break;
    }
    case 'breakfast_skip_afternoon_crash':
      action = 'eating a 200-300cal breakfast';
      predictedOutcome = Math.abs(stats.delta);
      unit = 'afternoon energy points';
      break;
    case 'exercise_mood_boost':
    case 'morning_exercise_all_day_energy': {
      const minutes = signalAValue || 20;
      action = `${minutes}min activity today`;
      predictedOutcome = stats.delta;
      unit = 'mood points';
      break;
    }
    case 'sedentary_day_lower_mood':
      action = 'adding a 15min walk';
      predictedOutcome = Math.abs(stats.delta) * 0.5;
      unit = 'mood points';
      break;
    default:
      return { hasCounterfactual: false };
  }

  return {
    hasCounterfactual: true,
    action,
    predictedOutcome: Math.round(predictedOutcome * 10) / 10,
    unit,
    confidence: stats.isStatisticallySignificant ? 'high' : 'moderate',
  };
}

/**
 * Build a fully evidence-anchored insight object for a correlation
 * Combines: specific example + aggregate stats + counterfactual
 */
function buildEvidenceAnchoredInsight(correlation, userHistory = {}) {
  const evidence = extractBestEvidence(correlation);
  const stats = computeAggregateStats(correlation);
  const counterfactual = generateCounterfactualPrediction(correlation, userHistory);

  return {
    evidence,
    stats,
    counterfactual,
    canShowSpecificExample: evidence.hasBestExample,
    canShowComparison: stats.hasComparison,
    canShowCounterfactual: counterfactual.hasCounterfactual,
  };
}

/**
 * ============================================================================
 * MAIN DECISION BRAIN FUNCTION
 * ============================================================================
 */

/**
 * Generate intelligent recommendations for a user
 *
 * This is the main entry point - it:
 * 1. Assesses user data quality
 * 2. Determines lifecycle stage
 * 3. Computes correlations
 * 4. Detects drift
 * 5. Applies safety guardrails
 * 6. Makes speech decision
 * 7. Generates actionable message
 *
 * @param {string} userId - User ID
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Decision result with recommendations
 */
export async function generateIntelligentRecommendations(userId, options = {}) {
  const startTime = Date.now();
  const {
    domain = 'all', // 'mood', 'nutrition', 'hydration', 'activity', 'all'
    includeExplanation = true,
    maxRecommendations = 3,
  } = options;

  try {
    console.log(`[DecisionBrain] Starting for user: ${userId}, domain: ${domain}`);

    // Step 1: Gather all user data
    const userData = await gatherUserData(userId);

    // Step 2: Assess data quality and readiness
    const dataQuality = assessDataQuality(userData);

    // Step 3: Check if user has enough data
    if (!dataQuality.ready) {
      return generateEarlyStageResponse(userId, userData, dataQuality);
    }

    // Step 4: Determine lifecycle stage
    const lifecycleStage = determineLifecycleStage({
      totalDaysWithLogs: dataQuality.daysWithData,
      loggingStreak: userData.streak,
      daysSinceLastLog: userData.daysSinceLastLog,
    });

    // Step 5: Get correlations (using existing correlation engine)
    let correlations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: lifecycleStage.windowTypes || ['7d', '30d'],
      });
      correlations = correlationResult?.correlations || [];
    } catch (err) {
      console.warn(`[DecisionBrain] Correlation engine error: ${err.message}`);
    }

    // Also get stored correlations
    const storedCorrelations = await getUserCorrelations(userId, {
      minConfidence: lifecycleStage.minConfidence || 0.5,
      limit: 10,
    });

    // Merge and deduplicate
    const allCorrelations = mergeCorrelations(correlations, storedCorrelations);

    // Step 6: Filter correlations by domain if specified
    const domainCorrelations = filterByDomain(allCorrelations, domain);

    // Step 7: Apply safety guardrails
    const safeCorrelations = applySafetyGuardrails(domainCorrelations, userData);

    // Step 8: Make speech decision
    const decision = makeDecision(safeCorrelations, lifecycleStage, userData, domain);

    // Step 9: Generate recommendation message
    const message = generateRecommendationMessage(decision, lifecycleStage, domain);

    // Step 10: Add explainability if requested
    const explanation = includeExplanation
      ? generateExplanation(decision, userData, safeCorrelations)
      : null;

    // Step 11: Check for drift (model health)
    let driftStatus = null;
    try {
      driftStatus = await getLatestDriftStatus(userId);
    } catch (err) {
      // Drift detection is optional
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      userId,
      domain,
      processingTimeMs: processingTime,

      // Decision envelope
      decision: {
        type: decision.type,
        priority: DECISION_PRIORITY[decision.type],
        reason: decision.reason,
        confidence: decision.confidence,
        confidenceLabel: getConfidenceLabel(decision.confidence),
        shouldSpeak: decision.type !== 'SILENT',
      },

      // Main recommendation
      recommendation: {
        headline: message.headline,
        subtitle: message.subtitle,
        actions: message.actions,
        visual: message.visual,
      },

      // Supporting data (deduplicated, filtered for quality)
      correlations: filterAndDeduplicateCorrelations(safeCorrelations).slice(0, maxRecommendations).map(c => ({
        id: c.id || c.ruleName,
        pattern: formatCorrelationTitle(c.ruleName),
        confidence: parseFloat(c.confidence) || 0,
        occurrences: c.occurrences || 1,
        affectedDomains: c.affectedDomains || [],
        whatHappens: c.expectedOutcome || '',
        category: categorizePattern(c.ruleName),
      })),

      // User context
      userContext: {
        lifecycleStage: lifecycleStage.stage,
        stageLabel: lifecycleStage.label,
        daysActive: dataQuality.daysWithData,
        dataQuality: dataQuality.score,
        loggingStreak: userData.streak,
      },

      // Explainability
      explanation,

      // Model health
      modelHealth: driftStatus ? {
        status: driftStatus.healthy ? 'healthy' : 'drift_detected',
        lastChecked: driftStatus.lastChecked,
      } : null,

      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[DecisionBrain] Error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * MOOD-SPECIFIC INTELLIGENCE
 * ============================================================================
 */

/**
 * Generate mood-specific insights using the Decision Brain
 *
 * This powers the Mood Insights screen with real data from the ML backend.
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Mood insights with patterns and recommendations
 */
export async function generateMoodInsights(userId) {
  const startTime = Date.now();

  try {
    console.log(`[DecisionBrain] Generating mood insights for user: ${userId}`);

    // Step 1: Gather mood-specific data
    const moodData = await gatherMoodData(userId);

    // Step 2: Check data sufficiency
    if (moodData.moodLogs.length < 3) {
      return {
        success: true,
        hasEnoughData: false,
        message: 'Log more mood entries to see patterns',
        dataStatus: {
          moodLogs: moodData.moodLogs.length,
          minimumRequired: 3,
        },
        insights: [],
        patterns: [],
        todaysMoods: moodData.todaysMoods,
      };
    }

    // Step 3: Generate mood profile using existing mood engine
    const moodProfile = await generateMoodProfile(userId, {
      windowDays: 14,
    });

    // Step 4: Get mood-specific correlations
    let moodCorrelations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: ['7d', '14d'],
      });
      moodCorrelations = (correlationResult?.correlations || [])
        .filter(c => isMoodRelated(c));
    } catch (err) {
      console.warn(`[DecisionBrain] Mood correlation error: ${err.message}`);
    }

    // Step 5: Calculate mood statistics
    const moodStats = calculateMoodStats(moodData.moodLogs);

    // Step 6: Generate mood-specific insights (patterns)
    const patterns = generateMoodPatterns(moodData, moodStats, moodCorrelations);

    // Step 7: Get mood recommendations
    const recommendations = await generateMoodRecommendations(userId, moodProfile);

    // Step 8: Get trend data (7-day)
    const trendData = generateMoodTrendData(moodData.moodLogs);

    // Step 9: Apply decision logic for what to show
    const decision = makeMoodDecision(moodStats, moodCorrelations, moodData);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      hasEnoughData: true,
      processingTimeMs: processingTime,

      // Decision
      decision: {
        type: decision.type,
        reason: decision.reason,
        shouldShowInsights: decision.type !== 'SILENT',
      },

      // Mood statistics
      stats: {
        avgMood: moodStats.avgMood,
        avgEnergy: moodStats.avgEnergy,
        moodVariance: moodStats.variance,
        isConsistent: moodStats.isConsistent,
        trend: moodStats.trend,
        dominantMood: moodStats.dominantMood,
        loggedDays: moodStats.loggedDays,
        bestDay: moodStats.bestDay,
        worstDay: moodStats.worstDay,
        streak: moodData.streak,
      },

      // 7-day trend data for visualization
      trendData,

      // Patterns (what we discovered)
      patterns: patterns.slice(0, 5).map(p => ({
        title: p.title,
        description: p.description,
        icon: p.icon,
        color: p.color,
        light: p.light,
        confidence: p.confidence,
        category: p.category,
      })),

      // Correlations from ML - enhanced with evidence anchoring (deduplicated, filtered)
      correlations: filterAndDeduplicateCorrelations(moodCorrelations).slice(0, 3).map(c => {
        const enhanced = generateEnhancedSuggestion(c);
        return {
          id: c.id || c.ruleName,
          pattern: formatCorrelationTitle(c.ruleName),
          statement: c.expectedOutcome,
          confidence: parseFloat(c.confidence) || 0,
          impactType: c.healthImpactSeverity || 'neutral',
          suggestion: enhanced?.suggestion || generateSuggestionForCorrelation(c),
          // Evidence-anchored data
          evidence: enhanced?.evidence || null,
          comparison: enhanced?.comparison || null,
          counterfactual: enhanced?.counterfactual || null,
          actionabilityScore: enhanced?.actionabilityScore || 0,
          noveltyScore: enhanced?.noveltyScore || 0,
        };
      }),

      // Recommendations
      recommendations: recommendations.slice(0, 2).map(r => ({
        type: r.type,
        title: r.title,
        description: r.description,
        priority: r.priority,
        icon: r.icon,
      })),

      // Today's mood entries
      todaysMoods: moodData.todaysMoods,

      // Mood profile summary
      profile: moodProfile ? {
        dominantMood: moodProfile.dominantMood,
        volatility: moodProfile.volatility,
        bestTimeOfDay: moodProfile.bestTimeOfDay,
        wellnessScore: moodProfile.wellnessScore,
      } : null,

      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[DecisionBrain] Mood insights error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * NUTRITION-SPECIFIC INTELLIGENCE
 * ============================================================================
 */

/**
 * Generate nutrition-specific insights using the Decision Brain
 *
 * Powers the Food Insights screen with real ML-backed data about eating patterns.
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Nutrition insights with patterns and recommendations
 */
export async function generateNutritionInsights(userId) {
  const startTime = Date.now();

  try {
    console.log(`[DecisionBrain] Generating nutrition insights for user: ${userId}`);

    // Step 1: Gather nutrition-specific data
    const nutritionData = await gatherNutritionData(userId);

    // Step 2: Check data sufficiency
    if (nutritionData.foodLogs.length < 5) {
      return {
        success: true,
        hasEnoughData: false,
        message: 'Log more meals to see nutrition patterns',
        dataStatus: {
          mealsLogged: nutritionData.foodLogs.length,
          minimumRequired: 5,
        },
        insights: [],
        patterns: [],
        todaysMeals: nutritionData.todaysMeals,
      };
    }

    // Step 3: Get nutrition-specific correlations
    let nutritionCorrelations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: ['7d', '14d'],
      });
      nutritionCorrelations = (correlationResult?.correlations || [])
        .filter(c => isNutritionRelated(c));
    } catch (err) {
      console.warn(`[DecisionBrain] Nutrition correlation error: ${err.message}`);
    }

    // Step 4: Calculate nutrition statistics
    const nutritionStats = calculateNutritionStats(nutritionData.foodLogs, nutritionData.goals);

    // Step 5: Generate nutrition-specific patterns
    const patterns = generateNutritionPatterns(nutritionData, nutritionStats, nutritionCorrelations);

    // Step 6: Generate recommendations
    const recommendations = generateNutritionRecommendations(nutritionStats, nutritionData);

    // Step 7: Get trend data (7-day macros)
    const trendData = generateNutritionTrendData(nutritionData.foodLogs);

    // Step 8: Decision logic
    const decision = makeNutritionDecision(nutritionStats, nutritionCorrelations, nutritionData);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      hasEnoughData: true,
      processingTimeMs: processingTime,

      decision: {
        type: decision.type,
        reason: decision.reason,
        shouldShowInsights: decision.type !== 'SILENT',
      },

      stats: {
        avgCalories: nutritionStats.avgCalories,
        avgProtein: nutritionStats.avgProtein,
        avgCarbs: nutritionStats.avgCarbs,
        avgFats: nutritionStats.avgFats,
        calorieGoalAdherence: nutritionStats.calorieGoalAdherence,
        proteinGoalAdherence: nutritionStats.proteinGoalAdherence,
        trend: nutritionStats.trend,
        loggedDays: nutritionStats.loggedDays,
        mealsPerDay: nutritionStats.mealsPerDay,
        bestDay: nutritionStats.bestDay,
        worstDay: nutritionStats.worstDay,
        avgNovaScore: nutritionStats.avgNovaScore,
        streak: nutritionData.streak,
      },

      trendData,

      patterns: patterns.slice(0, 5).map(p => ({
        title: p.title,
        description: p.description,
        icon: p.icon,
        color: p.color,
        light: p.light,
        confidence: p.confidence,
        category: p.category,
      })),

      correlations: filterAndDeduplicateCorrelations(nutritionCorrelations).slice(0, 3).map(c => {
        const enhanced = generateEnhancedSuggestion(c);
        return {
          id: c.id || c.ruleName,
          pattern: formatCorrelationTitle(c.ruleName),
          statement: c.expectedOutcome,
          confidence: parseFloat(c.confidence) || 0,
          impactType: c.healthImpactSeverity || 'neutral',
          suggestion: enhanced?.suggestion || generateSuggestionForCorrelation(c),
          evidence: enhanced?.evidence || null,
          comparison: enhanced?.comparison || null,
          counterfactual: enhanced?.counterfactual || null,
          actionabilityScore: enhanced?.actionabilityScore || 0,
          noveltyScore: enhanced?.noveltyScore || 0,
        };
      }),

      recommendations: recommendations.slice(0, 3),

      todaysMeals: nutritionData.todaysMeals,

      profile: {
        dominantMealType: nutritionStats.dominantMealType,
        nutritionScore: nutritionStats.nutritionScore,
        consistency: nutritionStats.isConsistent,
        macroBalance: nutritionStats.macroBalance,
      },

      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[DecisionBrain] Nutrition insights error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * HYDRATION-SPECIFIC INTELLIGENCE
 * ============================================================================
 */

/**
 * Generate hydration-specific insights using the Decision Brain
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Hydration insights with patterns and recommendations
 */
export async function generateHydrationInsights(userId) {
  const startTime = Date.now();

  try {
    console.log(`[DecisionBrain] Generating hydration insights for user: ${userId}`);

    // Step 1: Gather hydration-specific data
    const hydrationData = await gatherHydrationData(userId);

    // Step 2: Check data sufficiency
    if (hydrationData.waterLogs.length < 3) {
      return {
        success: true,
        hasEnoughData: false,
        message: 'Log more water intake to see hydration patterns',
        dataStatus: {
          waterLogs: hydrationData.waterLogs.length,
          minimumRequired: 3,
        },
        insights: [],
        patterns: [],
        todaysIntake: hydrationData.todaysIntake,
      };
    }

    // Step 3: Get hydration-specific correlations
    let hydrationCorrelations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: ['7d', '14d'],
      });
      hydrationCorrelations = (correlationResult?.correlations || [])
        .filter(c => isHydrationRelated(c));
    } catch (err) {
      console.warn(`[DecisionBrain] Hydration correlation error: ${err.message}`);
    }

    // Step 4: Calculate hydration statistics
    const hydrationStats = calculateHydrationStats(hydrationData.waterLogs, hydrationData.goal);

    // Step 5: Generate hydration patterns
    const patterns = generateHydrationPatterns(hydrationData, hydrationStats, hydrationCorrelations);

    // Step 6: Generate recommendations
    const recommendations = generateHydrationRecommendations(hydrationStats, hydrationData);

    // Step 7: Get trend data
    const trendData = generateHydrationTrendData(hydrationData.waterLogs);

    // Step 8: Decision logic
    const decision = makeHydrationDecision(hydrationStats, hydrationCorrelations, hydrationData);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      hasEnoughData: true,
      processingTimeMs: processingTime,

      decision: {
        type: decision.type,
        reason: decision.reason,
        shouldShowInsights: decision.type !== 'SILENT',
      },

      stats: {
        avgDailyIntake: hydrationStats.avgDailyIntake,
        goalAdherence: hydrationStats.goalAdherence,
        trend: hydrationStats.trend,
        loggedDays: hydrationStats.loggedDays,
        bestDay: hydrationStats.bestDay,
        worstDay: hydrationStats.worstDay,
        avgLogsPerDay: hydrationStats.avgLogsPerDay,
        isConsistent: hydrationStats.isConsistent,
        streak: hydrationData.streak,
        todayProgress: hydrationStats.todayProgress,
      },

      trendData,

      patterns: patterns.slice(0, 5).map(p => ({
        title: p.title,
        description: p.description,
        icon: p.icon,
        color: p.color,
        light: p.light,
        confidence: p.confidence,
        category: p.category,
      })),

      correlations: filterAndDeduplicateCorrelations(hydrationCorrelations).slice(0, 3).map(c => {
        const enhanced = generateEnhancedSuggestion(c);
        return {
          id: c.id || c.ruleName,
          pattern: formatCorrelationTitle(c.ruleName),
          statement: c.expectedOutcome,
          confidence: parseFloat(c.confidence) || 0,
          impactType: c.healthImpactSeverity || 'neutral',
          suggestion: enhanced?.suggestion || generateSuggestionForCorrelation(c),
          evidence: enhanced?.evidence || null,
          comparison: enhanced?.comparison || null,
          counterfactual: enhanced?.counterfactual || null,
          actionabilityScore: enhanced?.actionabilityScore || 0,
          noveltyScore: enhanced?.noveltyScore || 0,
        };
      }),

      recommendations: recommendations.slice(0, 3),

      todaysIntake: hydrationData.todaysIntake,

      profile: {
        hydrationHabit: hydrationStats.hydrationHabit,
        peakHydrationTime: hydrationStats.peakHydrationTime,
        consistency: hydrationStats.isConsistent,
      },

      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[DecisionBrain] Hydration insights error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * ACTIVITY-SPECIFIC INTELLIGENCE
 * ============================================================================
 */

/**
 * Generate activity-specific insights using the Decision Brain
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Activity insights with patterns and recommendations
 */
export async function generateActivityInsights(userId) {
  const startTime = Date.now();

  try {
    console.log(`[DecisionBrain] Generating activity insights for user: ${userId}`);

    // Step 1: Gather activity-specific data
    const activityData = await gatherActivityData(userId);

    // Step 2: Check data sufficiency
    if (activityData.activityLogs.length < 3) {
      return {
        success: true,
        hasEnoughData: false,
        message: 'Log more activities to see fitness patterns',
        dataStatus: {
          activityLogs: activityData.activityLogs.length,
          minimumRequired: 3,
        },
        insights: [],
        patterns: [],
        todaysActivities: activityData.todaysActivities,
      };
    }

    // Step 3: Get activity-specific correlations
    let activityCorrelations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: ['7d', '14d'],
      });
      activityCorrelations = (correlationResult?.correlations || [])
        .filter(c => isActivityRelated(c));
    } catch (err) {
      console.warn(`[DecisionBrain] Activity correlation error: ${err.message}`);
    }

    // Step 4: Calculate activity statistics
    const activityStats = calculateActivityStats(activityData.activityLogs, activityData.moodLogs);

    // Step 5: Generate activity patterns
    const patterns = generateActivityPatterns(activityData, activityStats, activityCorrelations);

    // Step 6: Generate recommendations
    const recommendations = generateActivityRecommendations(activityStats, activityData);

    // Step 7: Get trend data
    const trendData = generateActivityTrendData(activityData.activityLogs);

    // Step 8: Decision logic
    const decision = makeActivityDecision(activityStats, activityCorrelations, activityData);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      hasEnoughData: true,
      processingTimeMs: processingTime,

      decision: {
        type: decision.type,
        reason: decision.reason,
        shouldShowInsights: decision.type !== 'SILENT',
      },

      stats: {
        totalMinutesThisWeek: activityStats.totalMinutesThisWeek,
        avgDurationPerSession: activityStats.avgDurationPerSession,
        avgCaloriesBurned: activityStats.avgCaloriesBurned,
        activeDays: activityStats.activeDays,
        mostActiveDay: activityStats.mostActiveDay,
        preferredActivityType: activityStats.preferredActivityType,
        trend: activityStats.trend,
        moodImpact: activityStats.moodImpact,
        streak: activityData.streak,
        isConsistent: activityStats.isConsistent,
      },

      trendData,

      patterns: patterns.slice(0, 5).map(p => ({
        title: p.title,
        description: p.description,
        icon: p.icon,
        color: p.color,
        light: p.light,
        confidence: p.confidence,
        category: p.category,
      })),

      correlations: filterAndDeduplicateCorrelations(activityCorrelations).slice(0, 3).map(c => {
        const enhanced = generateEnhancedSuggestion(c);
        return {
          id: c.id || c.ruleName,
          pattern: formatCorrelationTitle(c.ruleName),
          statement: c.expectedOutcome,
          confidence: parseFloat(c.confidence) || 0,
          impactType: c.healthImpactSeverity || 'neutral',
          suggestion: enhanced?.suggestion || generateSuggestionForCorrelation(c),
          evidence: enhanced?.evidence || null,
          comparison: enhanced?.comparison || null,
          counterfactual: enhanced?.counterfactual || null,
          actionabilityScore: enhanced?.actionabilityScore || 0,
          noveltyScore: enhanced?.noveltyScore || 0,
        };
      }),

      recommendations: recommendations.slice(0, 3),

      todaysActivities: activityData.todaysActivities,

      profile: {
        fitnessLevel: activityStats.fitnessLevel,
        preferredTime: activityStats.preferredTime,
        consistencyScore: activityStats.consistencyScore,
        moodBoostEffect: activityStats.moodBoostEffect,
      },

      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[DecisionBrain] Activity insights error for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * DATA GATHERING FUNCTIONS
 * ============================================================================
 */

async function gatherUserData(userId) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all logs in parallel
  const [foodLogs, moodLogs, waterLogs, activityLogs, gamification] = await Promise.all([
    db.select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedDate, thirtyDaysAgo)
      ))
      .orderBy(desc(foodLogTable.loggedDate)),

    db.select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, thirtyDaysAgo)
      ))
      .orderBy(desc(moodLogTable.loggedDate)),

    db.select()
      .from(waterLogTable)
      .where(and(
        eq(waterLogTable.userId, userId),
        gte(waterLogTable.loggedDate, thirtyDaysAgo)
      ))
      .orderBy(desc(waterLogTable.loggedDate)),

    // Activity logs might not exist in all setups
    db.select()
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, thirtyDaysAgo)
      ))
      .orderBy(desc(activityLogTable.loggedAt))
      .catch(() => []),

    db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),
  ]);

  // Calculate days since last log
  const allLogs = [...foodLogs, ...moodLogs, ...waterLogs];
  const lastLogDate = allLogs.length > 0
    ? new Date(Math.max(...allLogs.map(l => new Date(l.loggedDate).getTime())))
    : null;
  const daysSinceLastLog = lastLogDate
    ? Math.floor((now - lastLogDate) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    foodLogs,
    moodLogs,
    waterLogs,
    activityLogs,
    streak: gamification.streak || 0,
    daysSinceLastLog,
    totalLogs: allLogs.length,
  };
}

async function gatherMoodData(userId) {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [moodLogs, gamification] = await Promise.all([
    db.select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, fourteenDaysAgo)
      ))
      .orderBy(desc(moodLogTable.loggedDate)),

    db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),
  ]);

  // Filter today's moods
  const todaysMoods = moodLogs.filter(log => {
    const logDate = new Date(log.loggedDate);
    return logDate >= today;
  });

  return {
    moodLogs,
    todaysMoods,
    streak: gamification.streak || 0,
  };
}

/**
 * ============================================================================
 * DATA QUALITY ASSESSMENT
 * ============================================================================
 */

function assessDataQuality(userData) {
  const { foodLogs, moodLogs, waterLogs, daysSinceLastLog } = userData;

  // Count unique days with data
  const uniqueDays = new Set();
  [...foodLogs, ...moodLogs, ...waterLogs].forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    uniqueDays.add(dateKey);
  });
  const daysWithData = uniqueDays.size;

  // Check if ready for correlations
  const hasEnoughDays = daysWithData >= DATA_THRESHOLDS.MIN_DAYS_FOR_CORRELATIONS;
  const hasEnoughFood = foodLogs.length >= DATA_THRESHOLDS.MIN_FOOD_LOGS;
  const hasEnoughMood = moodLogs.length >= DATA_THRESHOLDS.MIN_MOOD_LOGS;
  const isRecentlyActive = daysSinceLastLog <= 3;

  const ready = hasEnoughDays && (hasEnoughFood || hasEnoughMood) && isRecentlyActive;

  // Calculate quality score (0-100)
  let score = 0;
  score += Math.min(40, (daysWithData / 14) * 40);
  score += Math.min(20, (foodLogs.length / 20) * 20);
  score += Math.min(20, (moodLogs.length / 10) * 20);
  score += Math.min(10, (waterLogs.length / 14) * 10);
  score += isRecentlyActive ? 10 : 0;

  return {
    ready,
    score: Math.round(score),
    daysWithData,
    hasEnoughDays,
    hasEnoughFood,
    hasEnoughMood,
    isRecentlyActive,
    missing: {
      days: Math.max(0, DATA_THRESHOLDS.MIN_DAYS_FOR_CORRELATIONS - daysWithData),
      food: Math.max(0, DATA_THRESHOLDS.MIN_FOOD_LOGS - foodLogs.length),
      mood: Math.max(0, DATA_THRESHOLDS.MIN_MOOD_LOGS - moodLogs.length),
    },
  };
}

/**
 * ============================================================================
 * DECISION MAKING
 * ============================================================================
 */

function makeDecision(correlations, lifecycleStage, userData, domain) {
  // No correlations = check if we should encourage logging
  if (!correlations || correlations.length === 0) {
    if (userData.daysSinceLastLog > 2) {
      return {
        type: 'ENCOURAGE',
        reason: 'inactive_user',
        confidence: 0.5,
        correlation: null,
      };
    }
    return {
      type: 'SILENT',
      reason: 'no_correlations',
      confidence: 0,
      correlation: null,
    };
  }

  // Sort by confidence
  const sorted = [...correlations].sort((a, b) =>
    (parseFloat(b.confidence) || 0) - (parseFloat(a.confidence) || 0)
  );
  const strongest = sorted[0];
  const confidence = parseFloat(strongest.confidence) || 0;

  // SPEAK: New high-confidence correlation
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && (strongest.occurrences || 1) <= 5) {
    return {
      type: 'SPEAK',
      reason: 'new_significant_pattern',
      confidence,
      correlation: strongest,
    };
  }

  // PREDICT: For advanced users with good data
  if (['MASTER', 'CHAMPION', 'ELITE'].includes(lifecycleStage.stage) &&
      confidence >= CONFIDENCE_THRESHOLDS.MODERATE) {
    return {
      type: 'PREDICT',
      reason: 'anticipatory_insight',
      confidence,
      correlation: strongest,
    };
  }

  // REINFORCE: Known positive pattern
  if (strongest.healthImpactSeverity === 'positive' && confidence >= CONFIDENCE_THRESHOLDS.MODERATE) {
    return {
      type: 'REINFORCE',
      reason: 'positive_behavior_reinforcement',
      confidence,
      correlation: strongest,
    };
  }

  // REINFORCE: Any pattern worth mentioning
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
    return {
      type: 'REINFORCE',
      reason: 'pattern_maintenance',
      confidence,
      correlation: strongest,
    };
  }

  return {
    type: 'SILENT',
    reason: 'no_actionable_insights',
    confidence: 0,
    correlation: null,
  };
}

function makeMoodDecision(moodStats, correlations, moodData) {
  // Not enough data
  if (moodStats.loggedDays < 3) {
    return {
      type: 'SILENT',
      reason: 'insufficient_data',
    };
  }

  // Significant trend detected
  if (moodStats.trend === 'declining' && moodStats.variance > 2) {
    return {
      type: 'SPEAK',
      reason: 'declining_mood_trend',
    };
  }

  // Strong correlation found
  if (correlations.length > 0 && parseFloat(correlations[0].confidence) >= 0.7) {
    return {
      type: 'SPEAK',
      reason: 'strong_mood_correlation',
    };
  }

  // Positive reinforcement
  if (moodStats.avgMood >= 7 && moodStats.isConsistent) {
    return {
      type: 'REINFORCE',
      reason: 'positive_mood_pattern',
    };
  }

  // Default: show what we have
  if (moodStats.loggedDays >= 5) {
    return {
      type: 'REINFORCE',
      reason: 'pattern_maintenance',
    };
  }

  return {
    type: 'SILENT',
    reason: 'building_baseline',
  };
}

/**
 * ============================================================================
 * MESSAGE GENERATION
 * ============================================================================
 */

function generateRecommendationMessage(decision, lifecycleStage, domain) {
  if (decision.type === 'SILENT') {
    return {
      headline: 'All Looking Good',
      subtitle: 'Keep logging to discover more patterns.',
      actions: [],
      visual: null,
    };
  }

  if (decision.type === 'ENCOURAGE') {
    return {
      headline: 'We Miss You!',
      subtitle: 'Log a meal or mood to keep building your health profile.',
      actions: [
        { icon: 'add-circle', text: 'Log a meal', route: '/(tabs)/log' },
        { icon: 'happy', text: 'Log mood', route: '/mood-logger' },
      ],
      visual: null,
    };
  }

  // Use the existing message generator for correlations
  const correlation = decision.correlation;
  if (!correlation) {
    return {
      headline: 'Patterns Building',
      subtitle: 'More data will reveal deeper insights.',
      actions: [],
      visual: null,
    };
  }

  // Generate message based on rule type
  return generateMessage(decision, correlation, lifecycleStage);
}

/**
 * ============================================================================
 * MOOD-SPECIFIC HELPERS
 * ============================================================================
 */

function calculateMoodStats(moodLogs) {
  if (!moodLogs || moodLogs.length === 0) {
    return {
      avgMood: 0,
      avgEnergy: 0,
      variance: 0,
      isConsistent: false,
      trend: 'stable',
      dominantMood: null,
      loggedDays: 0,
      bestDay: null,
      worstDay: null,
    };
  }

  // Group by day
  const byDay = {};
  moodLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!byDay[dateKey]) {
      byDay[dateKey] = [];
    }
    byDay[dateKey].push(log);
  });

  const loggedDays = Object.keys(byDay).length;

  // Calculate daily averages
  const dailyAvgs = Object.entries(byDay).map(([date, logs]) => {
    const avgIntensity = logs.reduce((sum, l) => sum + (l.intensity || 5), 0) / logs.length;
    return { date, intensity: avgIntensity };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Overall averages
  const intensities = moodLogs.map(m => m.intensity || 5);
  const energies = moodLogs.map(m => m.energyLevel || 5);

  const avgMood = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

  // Variance
  const variance = intensities.length > 1
    ? intensities.reduce((sum, val) => sum + Math.pow(val - avgMood, 2), 0) / intensities.length
    : 0;
  const isConsistent = variance < 2;

  // Trend (compare first half vs second half)
  let trend = 'stable';
  if (dailyAvgs.length >= 4) {
    const mid = Math.floor(dailyAvgs.length / 2);
    const firstHalf = dailyAvgs.slice(0, mid);
    const secondHalf = dailyAvgs.slice(mid);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.intensity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.intensity, 0) / secondHalf.length;

    if (secondAvg - firstAvg > 0.5) trend = 'improving';
    else if (firstAvg - secondAvg > 0.5) trend = 'declining';
  }

  // Dominant mood
  const moodCounts = {};
  moodLogs.forEach(log => {
    const mood = log.mood || 'neutral';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  // Best and worst days
  const sortedDays = [...dailyAvgs].sort((a, b) => b.intensity - a.intensity);
  const bestDay = sortedDays[0] || null;
  const worstDay = sortedDays[sortedDays.length - 1] || null;

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    variance: Math.round(variance * 100) / 100,
    isConsistent,
    trend,
    dominantMood,
    loggedDays,
    bestDay: bestDay ? { dayKey: bestDay.date, intensity: Math.round(bestDay.intensity * 10) / 10 } : null,
    worstDay: worstDay ? { dayKey: worstDay.date, intensity: Math.round(worstDay.intensity * 10) / 10 } : null,
  };
}

function generateMoodTrendData(moodLogs) {
  // Generate 7-day trend data
  const now = new Date();
  const trendData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    // Find logs for this day
    const dayLogs = moodLogs.filter(log => {
      const logDate = new Date(log.loggedDate).toISOString().split('T')[0];
      return logDate === dateKey;
    });

    const hasData = dayLogs.length > 0;
    const avgIntensity = hasData
      ? dayLogs.reduce((sum, l) => sum + (l.intensity || 5), 0) / dayLogs.length
      : 0;

    trendData.push({
      dayKey: dateKey,
      day: dayName,
      hasData,
      intensity: Math.round(avgIntensity * 10) / 10,
      entryCount: dayLogs.length,
      isToday: i === 0,
    });
  }

  return trendData;
}

function generateMoodPatterns(moodData, moodStats, correlations) {
  const patterns = [];

  // Pattern 1: Mood consistency
  if (moodStats.isConsistent && moodStats.loggedDays >= 3) {
    patterns.push({
      title: 'Stable mood pattern',
      description: 'Your mood has been consistent this week',
      icon: 'shield-checkmark',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.8,
      category: 'consistency',
    });
  } else if (moodStats.variance > 4) {
    patterns.push({
      title: 'Mood variability',
      description: 'Your mood has fluctuated this week',
      icon: 'pulse',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.7,
      category: 'variability',
    });
  }

  // Pattern 2: Trend direction
  if (moodStats.trend === 'improving' && moodStats.loggedDays >= 3) {
    patterns.push({
      title: 'Upward trend',
      description: 'Your mood has been improving lately',
      icon: 'trending-up',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.75,
      category: 'trend',
    });
  } else if (moodStats.trend === 'declining' && moodStats.loggedDays >= 3) {
    patterns.push({
      title: 'Downward trend',
      description: 'Your mood has dipped recently',
      icon: 'trending-down',
      color: '#EF4444',
      light: '#FEE2E2',
      confidence: 0.75,
      category: 'trend',
    });
  }

  // Pattern 3: Best day insight
  if (moodStats.bestDay && moodStats.bestDay.intensity >= 7) {
    const bestDayName = new Date(moodStats.bestDay.dayKey).toLocaleDateString('en-US', { weekday: 'long' });
    patterns.push({
      title: `Peak on ${bestDayName}`,
      description: `You felt great with ${moodStats.bestDay.intensity}/10`,
      icon: 'sunny',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.9,
      category: 'peak',
    });
  }

  // Pattern 4: Logging streak
  if (moodData.streak >= 3) {
    patterns.push({
      title: `${moodData.streak}-day tracking streak`,
      description: 'Keep up the self-awareness habit!',
      icon: 'flame',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 1.0,
      category: 'streak',
    });
  }

  // Pattern 5: Average mood level
  if (moodStats.avgMood >= 7) {
    patterns.push({
      title: 'Great week overall',
      description: `Averaging ${moodStats.avgMood}/10 mood`,
      icon: 'happy',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.85,
      category: 'average',
    });
  } else if (moodStats.avgMood < 4 && moodStats.loggedDays >= 3) {
    patterns.push({
      title: 'Tough week',
      description: 'Consider what might help boost your mood',
      icon: 'heart',
      color: '#8B5CF6',
      light: '#EDE9FE',
      confidence: 0.8,
      category: 'average',
    });
  }

  // Add correlation-based patterns
  correlations.forEach(c => {
    if (parseFloat(c.confidence) >= 0.6) {
      patterns.push({
        title: formatCorrelationTitle(c.ruleName),
        description: c.expectedOutcome || 'Pattern detected from your data',
        icon: getIconForCorrelation(c.ruleName),
        color: c.healthImpactSeverity === 'positive' ? '#10B981' : '#F59E0B',
        light: c.healthImpactSeverity === 'positive' ? '#D1FAE5' : '#FEF3C7',
        confidence: parseFloat(c.confidence),
        category: 'correlation',
      });
    }
  });

  // Sort by confidence and return top patterns
  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

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

function mergeCorrelations(computed, stored) {
  const merged = [...computed];
  const seenRules = new Set(computed.map(c => c.ruleName));

  stored.forEach(s => {
    if (!seenRules.has(s.ruleName)) {
      merged.push(s);
      seenRules.add(s.ruleName);
    }
  });

  return merged;
}

function filterByDomain(correlations, domain) {
  if (domain === 'all') return correlations;

  const domainKeywords = {
    mood: ['mood', 'energy', 'stress', 'anxiety', 'happy', 'tired'],
    nutrition: ['food', 'meal', 'protein', 'sugar', 'nova', 'breakfast', 'dinner', 'lunch'],
    hydration: ['water', 'hydration', 'dehydration'],
    activity: ['exercise', 'activity', 'sedentary', 'movement'],
  };

  const keywords = domainKeywords[domain] || [];
  if (keywords.length === 0) return correlations;

  return correlations.filter(c => {
    const ruleName = (c.ruleName || '').toLowerCase();
    const outcome = (c.expectedOutcome || '').toLowerCase();
    return keywords.some(kw => ruleName.includes(kw) || outcome.includes(kw));
  });
}

function isMoodRelated(correlation) {
  const ruleName = (correlation.ruleName || '').toLowerCase();
  const outcome = (correlation.expectedOutcome || '').toLowerCase();
  const keywords = ['mood', 'energy', 'stress', 'anxiety', 'happy', 'tired', 'crash', 'boost'];
  return keywords.some(kw => ruleName.includes(kw) || outcome.includes(kw));
}

function applySafetyGuardrails(correlations, userData) {
  // Filter out potentially harmful recommendations
  return correlations.filter(c => {
    const ruleName = (c.ruleName || '').toLowerCase();

    // Don't recommend extreme calorie restriction
    if (ruleName.includes('restrict') || ruleName.includes('fast')) {
      return false;
    }

    // Don't recommend excessive exercise to users who might be at risk
    if (ruleName.includes('exercise') && ruleName.includes('more')) {
      // Check for signs of overexercising
      if (userData.activityLogs?.length > 14 * 2) { // More than 2x daily
        return false;
      }
    }

    return true;
  });
}

function generateEarlyStageResponse(userId, userData, dataQuality) {
  const encouragements = [];

  if (dataQuality.missing.days > 0) {
    encouragements.push({
      text: `Log for ${dataQuality.missing.days} more days`,
      icon: 'calendar',
    });
  }
  if (dataQuality.missing.food > 0) {
    encouragements.push({
      text: `Log ${dataQuality.missing.food} more meals`,
      icon: 'nutrition',
    });
  }
  if (dataQuality.missing.mood > 0) {
    encouragements.push({
      text: `Log ${dataQuality.missing.mood} more moods`,
      icon: 'happy',
    });
  }

  return {
    success: true,
    userId,
    decision: {
      type: 'BUILDING',
      priority: DECISION_PRIORITY.ENCOURAGE,
      reason: 'insufficient_data',
      shouldSpeak: true,
    },
    recommendation: {
      headline: 'Building Your Profile',
      subtitle: 'Keep logging to unlock personalized insights.',
      actions: encouragements,
      visual: {
        type: 'progress',
        value: dataQuality.score / 100,
        label: 'Data completeness',
      },
    },
    correlations: [],
    userContext: {
      lifecycleStage: 'DISCOVERER',
      stageLabel: 'Getting Started',
      daysActive: dataQuality.daysWithData,
      dataQuality: dataQuality.score,
      loggingStreak: userData.streak,
    },
    dataStatus: {
      ready: false,
      missing: dataQuality.missing,
      progress: dataQuality.score,
    },
    timestamp: new Date().toISOString(),
  };
}

function generateExplanation(decision, userData, correlations) {
  if (decision.type === 'SILENT') {
    return {
      summary: 'No actionable patterns detected yet.',
      factors: ['Continue logging to build your health profile'],
      limitations: ['More data needed for reliable insights'],
    };
  }

  const factors = [];
  const limitations = [];

  // Add contributing factors
  if (decision.correlation) {
    factors.push(`Based on ${decision.correlation.occurrences || 1} observations`);
    factors.push(`Pattern confidence: ${Math.round((parseFloat(decision.correlation.confidence) || 0) * 100)}%`);
  }

  if (userData.streak >= 3) {
    factors.push(`${userData.streak}-day logging streak improves accuracy`);
  }

  // Add limitations
  if (userData.moodLogs?.length < 10) {
    limitations.push('More mood entries would improve pattern detection');
  }
  if (userData.foodLogs?.length < 14) {
    limitations.push('More meal logs would reveal food-mood connections');
  }

  return {
    summary: `This insight is based on your ${userData.totalLogs} logged entries over the past 30 days.`,
    factors,
    limitations,
    confidence: decision.confidence,
    evidenceCount: decision.correlation?.occurrences || 0,
  };
}

function getConfidenceLabel(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.VERY_HIGH) return 'Very High';
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'High';
  if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE) return 'Moderate';
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW) return 'Low';
  return 'Developing';
}

function categorizePattern(ruleName) {
  if (!ruleName) return 'general';
  const name = ruleName.toLowerCase();

  if (name.includes('breakfast') || name.includes('dinner') || name.includes('lunch') || name.includes('meal')) {
    return 'meal-timing';
  }
  if (name.includes('water') || name.includes('hydration') || name.includes('dehydration')) {
    return 'hydration';
  }
  if (name.includes('exercise') || name.includes('activity') || name.includes('sedentary')) {
    return 'activity';
  }
  if (name.includes('sleep') || name.includes('morning') || name.includes('evening')) {
    return 'sleep-wake';
  }
  if (name.includes('sugar') || name.includes('protein') || name.includes('nova')) {
    return 'nutrition';
  }
  return 'general';
}

function formatCorrelationTitle(ruleName) {
  if (!ruleName) return 'Pattern detected';

  const titleMap = {
    // Food & Mood patterns
    'high_nova_mood_crash': 'Processed foods affect your mood',
    'dehydration_fatigue_mood': 'Hydration impacts your energy',
    'breakfast_skip_afternoon_crash': 'Skipping breakfast affects afternoon',
    'protein_breakfast_energy': 'Protein breakfast boosts energy',
    'high_sugar_dinner_morning_anxiety': 'Evening sugar affects next morning',
    'exercise_mood_boost': 'Exercise improves your mood',
    'sedentary_mood_impact': 'Movement helps your mood',

    // Hydration patterns
    'beverage_variety_compliance': 'Drink variety helps you stay hydrated',
    'hydration_mood_stability': 'Hydration keeps mood stable',
    'caffeine_energy_crash': 'Caffeine causes energy dips',
    'evening_caffeine_sleep_impact': 'Late caffeine affects sleep',
    'alcohol_mood_impact': 'Alcohol affects next-day mood',

    // Stress & eating patterns
    'stress_eating_disruption': 'Stress changes eating patterns',
    'meal_timing_energy': 'Meal timing affects energy',
    'meal_skipping': 'Skipping meals affects energy',
    'comfort_eating': 'Stress triggers comfort eating',

    // Activity patterns
    'morning_exercise_energy': 'Morning exercise boosts all-day energy',
    'evening_activity_sleep': 'Evening activity improves sleep',
    'step_count_mood': 'More steps improve mood',

    // Goal patterns
    'goal_compliance': 'You hit your daily goals',
    'streak_consistency': 'Consistency builds momentum',
  };

  return titleMap[ruleName] || ruleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getIconForCorrelation(ruleName) {
  if (!ruleName) return 'analytics-outline';
  const name = ruleName.toLowerCase();

  if (name.includes('breakfast') || name.includes('food') || name.includes('meal')) return 'nutrition-outline';
  if (name.includes('water') || name.includes('hydration')) return 'water-outline';
  if (name.includes('exercise') || name.includes('activity')) return 'barbell-outline';
  if (name.includes('sleep') || name.includes('morning')) return 'moon-outline';
  if (name.includes('mood') || name.includes('energy')) return 'happy-outline';
  return 'analytics-outline';
}

/**
 * Generate user-data-oriented suggestions for ALL correlation types
 *
 * This function creates truly personalized recommendations using:
 * - Actual values from user's data (times, amounts, foods)
 * - Specific time patterns (e.g., "your 2:30pm crashes")
 * - Named foods/beverages from their logs
 * - Calculated thresholds based on their personal data
 *
 * Returns null if insufficient data - UI handles empty states
 */
function generateSuggestionForCorrelation(correlation) {
  const {
    ruleName = '',
    signalAValue,
    signalBValue,
    signalAUnit,
    signalBUnit,
    occurrences = 0,
    evidenceJson = {},
    avgTimeLag,
    timeLag,
  } = correlation;

  // Require minimum occurrences for statistical validity
  if (occurrences < 5) {
    return null;
  }

  // Extract common evidence fields
  const examples = evidenceJson.examples || [];
  const foodName = examples[0]?.food || examples[0]?.foodName || evidenceJson.foodName;
  const beverageTypes = evidenceJson.beverageTypes || [];
  const mealTime = evidenceJson.mealTime;
  const crashTime = evidenceJson.crashTime || evidenceJson.avgCrashTime;
  const timeLagMinutes = avgTimeLag || timeLag || evidenceJson.avgTimeLag;
  const timeLagHours = timeLagMinutes ? Math.round(timeLagMinutes / 60 * 10) / 10 : null;

  // Format time helper (converts 24h to 12h with am/pm)
  const formatTime = (hour) => {
    if (hour === undefined || hour === null) return null;
    const h = parseInt(hour);
    if (h === 0 || h === 24) return '12am';
    if (h === 12) return '12pm';
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  };

  // ============================================================================
  // FOOD-MOOD CORRELATIONS
  // ============================================================================

  // 1. High NOVA + Sugar → Mood Crash
  if (ruleName === 'high_nova_mood_crash') {
    const sugar = signalAValue || evidenceJson.sugarGrams;
    const energyDrop = Math.abs(signalBValue) || evidenceJson.energyAfter || 2;
    const crashTimeFormatted = formatTime(crashTime);

    if (foodName && sugar) {
      return `"${foodName}" (${sugar}g sugar) → ${energyDrop}pt energy crash${crashTimeFormatted ? ` around ${crashTimeFormatted}` : ' within 3hrs'}`;
    }
    if (sugar) {
      return `${sugar}g+ sugar meals trigger your ${timeLagHours || 3}hr energy crashes`;
    }
    return null;
  }

  // 9. Breakfast Skip → Afternoon Crash
  if (ruleName === 'breakfast_skip_afternoon_crash') {
    const avgEnergy = evidenceJson.avgEnergy || evidenceJson.avgAfternoonEnergy;
    const crashHour = evidenceJson.avgCrashHour || 15; // Default 3pm

    if (avgEnergy && crashHour) {
      return `Skipped breakfast → ${formatTime(crashHour)} crash (avg ${avgEnergy}/10 energy). Even 200cal breakfast helps`;
    }
    if (timeLagHours) {
      return `No breakfast → your ${timeLagHours}hr afternoon crash. Try small morning meal`;
    }
    return `Breakfast skipping correlates with your afternoon energy dips`;
  }

  // 10. High Sugar Dinner → Morning Anxiety
  if (ruleName === 'high_sugar_dinner_morning_anxiety') {
    const sugar = signalAValue || evidenceJson.sugarGrams;
    const saferLimit = sugar ? Math.round(sugar * 0.6) : 15;

    if (foodName && sugar) {
      return `Dinners like "${foodName}" (${sugar}g sugar) → next-morning anxiety. Try <${saferLimit}g`;
    }
    if (sugar) {
      return `${sugar}g+ sugar dinners → anxious mornings. Keep evening sweets <${saferLimit}g`;
    }
    return null;
  }

  // 11. High Carb Dinner → Morning Sluggishness
  if (ruleName === 'high_carb_dinner_morning_sluggish') {
    const carbs = signalAValue || evidenceJson.carbGrams;
    const dinnerTime = evidenceJson.dinnerTime;
    const morningEnergy = evidenceJson.morningEnergy;

    if (carbs && morningEnergy) {
      return `${carbs}g+ carb dinners → ${morningEnergy}/10 morning energy. Try lighter evenings`;
    }
    if (carbs && dinnerTime) {
      return `Heavy dinners after ${formatTime(dinnerTime)} (${carbs}g carbs) slow your mornings`;
    }
    return null;
  }

  // 8. Late Heavy Meal → Poor Sleep
  if (ruleName === 'late_heavy_meal_sleep_impact') {
    const calories = evidenceJson.mealCalories;
    const mealHour = mealTime || evidenceJson.mealTime;
    const sleepQuality = evidenceJson.sleepQuality;

    if (calories && mealHour) {
      return `${calories}cal+ meals after ${formatTime(mealHour)} → ${sleepQuality || 'poor'} sleep. Eat earlier`;
    }
    return null;
  }

  // 14. Consistent Meal Timing → Mood Stability
  if (ruleName === 'consistent_meal_timing_mood_stability') {
    const avgBreakfastTime = evidenceJson.avgBreakfastTime;
    const avgLunchTime = evidenceJson.avgLunchTime;
    const avgDinnerTime = evidenceJson.avgDinnerTime;
    const moodStability = signalBValue || evidenceJson.moodStability;

    if (avgBreakfastTime && avgLunchTime && avgDinnerTime) {
      return `Your best rhythm: breakfast ~${formatTime(avgBreakfastTime)}, lunch ~${formatTime(avgLunchTime)}, dinner ~${formatTime(avgDinnerTime)}`;
    }
    if (moodStability) {
      return `Consistent meal times → ${Math.round(moodStability * 100)}% more mood stability for you`;
    }
    return null;
  }

  // 15. Protein Breakfast → Sustained Energy
  if (ruleName === 'protein_breakfast_sustained_energy') {
    const protein = signalAValue || evidenceJson.proteinGrams;
    const energyGain = signalBValue || evidenceJson.energyBoost || 1;
    const sustainedHours = evidenceJson.sustainedHours || 4;

    if (protein && energyGain) {
      return `${protein}g+ morning protein = +${energyGain}pt energy sustained for ${sustainedHours}hrs`;
    }
    return null;
  }

  // ============================================================================
  // HYDRATION-MOOD CORRELATIONS
  // ============================================================================

  // 2. Dehydration → Fatigue
  if (ruleName === 'dehydration_fatigue_mood') {
    const currentIntake = signalAValue || evidenceJson.hydrationLiters;
    const deficit = evidenceJson.hydrationDeficit;
    const targetWater = currentIntake ? Math.round(currentIntake * 1.4 * 10) / 10 : 2.5;

    if (currentIntake && deficit) {
      return `${currentIntake}L days = ${Math.round(deficit)}% below goal → low energy. Aim ${targetWater}L+`;
    }
    if (currentIntake) {
      return `<${currentIntake}L days correlate with your fatigue. Target ${targetWater}L+`;
    }
    return null;
  }

  // 12. Good Hydration → Mood Stability (Positive)
  if (ruleName === 'hydration_mood_stability_positive') {
    const hydration = signalAValue || evidenceJson.avgHydration;
    const moodBoost = signalBValue || evidenceJson.moodBoost;
    const goalPercent = evidenceJson.goalPercent;

    if (hydration && moodBoost) {
      return `${hydration}L+ days = +${moodBoost}pt mood stability. You hit this ${goalPercent || 60}% of the time`;
    }
    return null;
  }

  // 13. Dehydration → Mood Instability
  if (ruleName === 'dehydration_mood_instability') {
    const lowIntake = signalAValue || evidenceJson.lowIntakeLiters;
    const moodVariance = evidenceJson.moodVariance;

    if (lowIntake && moodVariance) {
      return `<${lowIntake}L days → ${Math.round(moodVariance * 100)}% more mood swings. Stay hydrated`;
    }
    return null;
  }

  // 6. Beverage Variety → Better Compliance
  if (ruleName === 'beverage_variety_compliance') {
    const variety = signalAValue || evidenceJson.beverageVariety;
    const compliance = signalBValue || evidenceJson.goalPercent;
    const types = beverageTypes.slice(0, 3).join(', ');

    if (variety && compliance) {
      return `${variety}+ drink types (${types || 'water, tea, etc.'}) → ${compliance}% goal success`;
    }
    return null;
  }

  // ============================================================================
  // CAFFEINE & BEVERAGE CORRELATIONS
  // ============================================================================

  // 4. Caffeine → Energy Crash
  if (ruleName === 'caffeine_energy_crash') {
    const caffeineCount = signalAValue || evidenceJson.caffeineCount;
    const crashCount = signalBValue || evidenceJson.crashCount;
    const avgLag = evidenceJson.avgTimeLag;
    const lagHours = avgLag ? Math.round(avgLag / 60) : 4;

    if (caffeineCount && crashCount) {
      return `${caffeineCount}+ coffees → ${crashCount} crashes (${lagHours}hrs later). Space 4+ hrs apart`;
    }
    return null;
  }

  // 5. Evening Caffeine → Poor Sleep
  if (ruleName === 'evening_caffeine_sleep_impact') {
    const lastCaffeineHour = evidenceJson.lastCaffeineTime;
    const poorSleepCount = evidenceJson.poorSleepCount;
    const cutoffHour = lastCaffeineHour ? lastCaffeineHour - 2 : 16;

    if (lastCaffeineHour && poorSleepCount) {
      return `Caffeine after ${formatTime(lastCaffeineHour)} → poor sleep ${poorSleepCount}x. Cut off by ${formatTime(cutoffHour)}`;
    }
    if (lastCaffeineHour) {
      return `Your ${formatTime(lastCaffeineHour)} caffeine hurts sleep. Try ${formatTime(cutoffHour)} cutoff`;
    }
    return null;
  }

  // 7. Alcohol → Next-Day Mood Impact
  if (ruleName === 'alcohol_mood_impact') {
    const alcoholCount = evidenceJson.alcoholCount;
    const lowMoodMornings = evidenceJson.lowMoodMornings;
    const avgMorningEnergy = evidenceJson.avgMorningEnergy;

    if (alcoholCount && avgMorningEnergy) {
      return `${alcoholCount}+ drinks → ${avgMorningEnergy}/10 next-morning energy`;
    }
    if (lowMoodMornings) {
      return `Alcohol nights → low energy mornings ${lowMoodMornings}x in your data`;
    }
    return null;
  }

  // ============================================================================
  // STRESS & EATING CORRELATIONS
  // ============================================================================

  // 3. Stress → Eating Disruption
  if (ruleName === 'stress_eating_disruption') {
    const stressLevel = signalAValue || evidenceJson.stressLevel;
    const pattern = evidenceJson.pattern; // 'meal_skipping' or 'comfort_eating'
    const calorieDeviation = evidenceJson.calorieDeviation;

    if (stressLevel && pattern === 'meal_skipping') {
      return `High stress (${stressLevel}/10) days → you skip meals. Plan easy backup meals`;
    }
    if (stressLevel && pattern === 'comfort_eating' && calorieDeviation) {
      return `Stressed days → +${calorieDeviation}cal comfort eating. Try stress snack swaps`;
    }
    if (stressLevel) {
      return `Stress level ${stressLevel}+ disrupts your eating pattern`;
    }
    return null;
  }

  // ============================================================================
  // ACTIVITY-MOOD CORRELATIONS
  // ============================================================================

  // 16. Exercise → Mood Boost
  if (ruleName === 'exercise_mood_boost') {
    const minutes = signalAValue || evidenceJson.activityMinutes;
    const moodGain = signalBValue || evidenceJson.moodBoost || 1;
    const activityType = evidenceJson.activityType;
    const timeToEffect = evidenceJson.timeToEffect; // minutes until mood boost

    if (minutes && moodGain && activityType) {
      return `${minutes}min ${activityType} = +${moodGain}pt mood boost for you`;
    }
    if (minutes && moodGain) {
      return `${minutes}+ min active days = +${moodGain}pt mood. Consistent pattern`;
    }
    return null;
  }

  // 17. Morning Exercise → All-Day Energy
  if (ruleName === 'morning_exercise_all_day_energy') {
    const exerciseHour = evidenceJson.exerciseHour || evidenceJson.avgExerciseTime;
    const energyBoost = signalBValue || evidenceJson.energyBoost;
    const sustainedHours = evidenceJson.sustainedHours || 8;

    if (exerciseHour && energyBoost) {
      return `Exercise before ${formatTime(exerciseHour + 1)} → +${energyBoost}pt energy all day (${sustainedHours}hrs)`;
    }
    if (energyBoost) {
      return `Morning workouts give you +${energyBoost}pt sustained energy`;
    }
    return null;
  }

  // 18. Sedentary Day → Lower Mood
  if (ruleName === 'sedentary_day_lower_mood') {
    const threshold = signalAValue || evidenceJson.activityThreshold || 15;
    const moodDrop = Math.abs(signalBValue) || evidenceJson.moodDrop || 1;
    const sedentaryCount = evidenceJson.sedentaryDays;

    if (threshold && moodDrop && sedentaryCount) {
      return `<${threshold}min activity → -${moodDrop}pt mood (happened ${sedentaryCount}x recently)`;
    }
    if (threshold && moodDrop) {
      return `<${threshold}min activity days = ${moodDrop}pt lower mood for you`;
    }
    return null;
  }

  // 19. High Intensity → Recovery Impact
  if (ruleName === 'high_intensity_recovery_impact') {
    const intensity = evidenceJson.intensity || 'vigorous';
    const recoveryDays = evidenceJson.recoveryDays || 1;
    const nextDayEnergy = evidenceJson.nextDayEnergy;

    if (intensity && nextDayEnergy) {
      return `${intensity} workouts → ${nextDayEnergy}/10 next-day energy. Plan recovery`;
    }
    if (recoveryDays > 1) {
      return `High intensity needs ${recoveryDays} recovery days based on your data`;
    }
    return null;
  }

  // 20. Consistent Exercise → Mood Stability
  if (ruleName === 'consistent_exercise_mood_stability') {
    const consistencyScore = evidenceJson.consistencyScore;
    const moodStability = signalBValue || evidenceJson.moodStability;
    const avgDaysPerWeek = evidenceJson.avgDaysPerWeek;

    if (avgDaysPerWeek && moodStability) {
      return `${avgDaysPerWeek} workout days/week → ${Math.round(moodStability * 100)}% more mood stability`;
    }
    if (consistencyScore && moodStability) {
      return `Consistent exercise pattern = +${Math.round(moodStability * 10)}pt mood stability`;
    }
    return null;
  }

  // ============================================================================
  // GENERIC FALLBACK (Only if we have actual values)
  // ============================================================================

  // For any other correlation with actual numeric values
  if (signalAValue && signalBValue && signalAUnit && signalBUnit) {
    const direction = signalBValue > 0 ? '+' : '';
    return `${signalAValue} ${signalAUnit} → ${direction}${signalBValue} ${signalBUnit} (${occurrences}x observed)`;
  }

  // No suggestion if we don't have specific user data
  return null;
}

/**
 * Enhanced suggestion generator with evidence anchoring
 *
 * Returns a rich object with:
 * - suggestion: The human-readable insight text
 * - evidence: Specific examples from user's history
 * - stats: Comparison statistics (with vs without condition)
 * - counterfactual: Predicted outcome if behavior changed
 * - actionability/novelty scores for prioritization
 */
function generateEnhancedSuggestion(correlation, userHistory = {}) {
  // Get base suggestion text
  const baseSuggestion = generateSuggestionForCorrelation(correlation);

  if (!baseSuggestion) {
    return null;
  }

  // Build evidence-anchored insight
  const insight = buildEvidenceAnchoredInsight(correlation, userHistory);

  // Generate enhanced suggestion with specific evidence
  let enhancedSuggestion = baseSuggestion;

  // Add specific date reference if we have a best example
  if (insight.canShowSpecificExample && insight.evidence.bestInstance?.dateFormatted) {
    const ex = insight.evidence.bestInstance;
    const timeRef = ex.timeFormatted ? ` at ${ex.timeFormatted}` : '';
    enhancedSuggestion = `${ex.dateFormatted}${timeRef}: ${baseSuggestion}`;
  }

  // Build comparison text if stats available
  let comparisonText = null;
  if (insight.canShowComparison && insight.stats.avgWithCondition && insight.stats.avgWithoutCondition) {
    const { avgWithCondition, avgWithoutCondition, percentChange } = insight.stats;
    const metric = correlation.ruleName.includes('mood') ? 'mood' : 'energy';
    comparisonText = `Your ${metric} averages ${avgWithCondition}/10 vs ${avgWithoutCondition}/10 (${percentChange > 0 ? '+' : ''}${percentChange}%)`;
  }

  // Build counterfactual text if available
  let counterfactualText = null;
  if (insight.canShowCounterfactual) {
    const cf = insight.counterfactual;
    counterfactualText = `Try ${cf.action} → predicted +${cf.predictedOutcome} ${cf.unit}`;
  }

  // Calculate actionability score (0-1)
  const actionabilityScore = calculateActionabilityScore(correlation);

  // Calculate novelty score (0-1) - higher for rare/surprising patterns
  const noveltyScore = calculateNoveltyScore(correlation);

  return {
    // Core suggestion
    suggestion: enhancedSuggestion,
    baseSuggestion,

    // Evidence anchoring
    evidence: insight.canShowSpecificExample ? {
      bestExample: insight.evidence.bestInstance,
      recentExamples: insight.evidence.recentInstances,
      occurrences: correlation.occurrences || 0,
    } : null,

    // Comparison stats
    comparison: insight.canShowComparison ? {
      text: comparisonText,
      withCondition: insight.stats.avgWithCondition,
      withoutCondition: insight.stats.avgWithoutCondition,
      delta: insight.stats.delta,
      percentChange: insight.stats.percentChange,
      sampleSize: insight.stats.sampleSizeWith,
      isStatisticallySignificant: insight.stats.isStatisticallySignificant,
    } : null,

    // Counterfactual prediction
    counterfactual: insight.canShowCounterfactual ? {
      text: counterfactualText,
      action: insight.counterfactual.action,
      predictedOutcome: insight.counterfactual.predictedOutcome,
      unit: insight.counterfactual.unit,
      confidence: insight.counterfactual.confidence,
    } : null,

    // Prioritization scores
    actionabilityScore,
    noveltyScore,
    priorityScore: (actionabilityScore * 0.6) + (noveltyScore * 0.4),

    // Metadata
    ruleName: correlation.ruleName,
    correlationType: correlation.correlationType,
    confidence: parseFloat(correlation.confidence) || 0,
  };
}

/**
 * Calculate actionability score based on correlation type
 * Higher scores for patterns user can directly act on
 */
function calculateActionabilityScore(correlation) {
  const { ruleName, occurrences = 0, confidence = 0 } = correlation;

  // High actionability - user can take immediate action
  const highActionability = [
    'breakfast_skip_afternoon_crash',
    'dehydration_fatigue_mood',
    'exercise_mood_boost',
    'morning_exercise_all_day_energy',
    'protein_breakfast_sustained_energy',
    'sedentary_day_lower_mood',
    'caffeine_energy_crash',
    'evening_caffeine_sleep_impact',
  ];

  // Medium actionability - requires planning
  const mediumActionability = [
    'high_nova_mood_crash',
    'high_sugar_dinner_morning_anxiety',
    'high_carb_dinner_morning_sluggish',
    'late_heavy_meal_sleep_impact',
    'consistent_meal_timing_mood_stability',
    'consistent_exercise_mood_stability',
    'beverage_variety_compliance',
    'hydration_mood_stability_positive',
  ];

  let baseScore = 0.3; // Default low

  if (highActionability.includes(ruleName)) {
    baseScore = 0.9;
  } else if (mediumActionability.includes(ruleName)) {
    baseScore = 0.6;
  }

  // Adjust by confidence and occurrences
  const confidenceMultiplier = Math.min(parseFloat(confidence) || 0.5, 1);
  const occurrenceMultiplier = Math.min(occurrences / 10, 1);

  return Math.min(baseScore * confidenceMultiplier * (0.5 + occurrenceMultiplier * 0.5), 1);
}

/**
 * Calculate novelty score based on how surprising/unique the pattern is
 * Higher scores for rare patterns the user hasn't seen before
 */
function calculateNoveltyScore(correlation) {
  const { ruleName, occurrences = 0, evidenceJson = {} } = correlation;

  // Less common patterns are more novel
  const rarePatterns = [
    'high_sugar_dinner_morning_anxiety',
    'high_carb_dinner_morning_sluggish',
    'high_intensity_recovery_impact',
    'alcohol_mood_impact',
    'stress_eating_disruption',
  ];

  // Common patterns everyone discovers
  const commonPatterns = [
    'dehydration_fatigue_mood',
    'exercise_mood_boost',
    'caffeine_energy_crash',
  ];

  let baseScore = 0.5; // Default medium

  if (rarePatterns.includes(ruleName)) {
    baseScore = 0.8;
  } else if (commonPatterns.includes(ruleName)) {
    baseScore = 0.3;
  }

  // New patterns (low occurrences) are more novel
  const newPatternBonus = occurrences < 10 ? 0.2 : 0;

  // First time seeing is highly novel
  const firstTimeBonus = evidenceJson.isFirstDiscovery ? 0.3 : 0;

  return Math.min(baseScore + newPatternBonus + firstTimeBonus, 1);
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC DATA GATHERING
 * ============================================================================
 */

async function gatherNutritionData(userId) {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [foodLogs, gamification, goals] = await Promise.all([
    db.select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedDate, fourteenDaysAgo)
      ))
      .orderBy(desc(foodLogTable.loggedDate)),

    db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),

    // Nutrition goals from profile or defaults
    db.select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),
  ]);

  const todaysMeals = foodLogs.filter(log => {
    const logDate = new Date(log.loggedDate);
    return logDate >= today;
  });

  return {
    foodLogs,
    todaysMeals,
    streak: gamification.streak || 0,
    goals: {
      calories: goals.calorieGoal || 2000,
      protein: goals.proteinGoal || 50,
      carbs: goals.carbGoal || 250,
      fats: goals.fatGoal || 65,
    },
  };
}

async function gatherHydrationData(userId) {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [waterLogs, gamification, profile] = await Promise.all([
    db.select()
      .from(waterLogTable)
      .where(and(
        eq(waterLogTable.userId, userId),
        gte(waterLogTable.loggedDate, fourteenDaysAgo)
      ))
      .orderBy(desc(waterLogTable.loggedDate)),

    db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),

    db.select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),
  ]);

  const todaysLogs = waterLogs.filter(log => {
    const logDate = new Date(log.loggedDate);
    return logDate >= today;
  });

  const todaysIntake = todaysLogs.reduce((sum, log) =>
    sum + parseFloat(log.amountLiters || 0), 0);

  return {
    waterLogs,
    todaysIntake,
    streak: gamification.streak || 0,
    goal: profile.waterGoal || 2.0,
  };
}

async function gatherActivityData(userId) {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activityLogs, moodLogs, gamification] = await Promise.all([
    db.select()
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, fourteenDaysAgo)
      ))
      .orderBy(desc(activityLogTable.loggedAt))
      .catch(() => []),

    db.select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, fourteenDaysAgo)
      ))
      .orderBy(desc(moodLogTable.loggedDate)),

    db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1)
      .then(rows => rows[0] || {}),
  ]);

  const todaysActivities = activityLogs.filter(log => {
    const logDate = new Date(log.loggedAt);
    return logDate >= today;
  });

  return {
    activityLogs,
    moodLogs,
    todaysActivities,
    streak: gamification.streak || 0,
  };
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC STATISTICS
 * ============================================================================
 */

function calculateNutritionStats(foodLogs, goals) {
  if (!foodLogs || foodLogs.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFats: 0,
      calorieGoalAdherence: 0,
      proteinGoalAdherence: 0,
      trend: 'stable',
      loggedDays: 0,
      mealsPerDay: 0,
      bestDay: null,
      worstDay: null,
      avgNovaScore: null,
      dominantMealType: null,
      nutritionScore: 0,
      isConsistent: false,
      macroBalance: 'unknown',
    };
  }

  // Group by day
  const byDay = {};
  foodLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!byDay[dateKey]) {
      byDay[dateKey] = [];
    }
    byDay[dateKey].push(log);
  });

  const loggedDays = Object.keys(byDay).length;

  // Daily totals
  const dailyTotals = Object.entries(byDay).map(([date, logs]) => {
    const totals = logs.reduce((sum, log) => ({
      calories: sum.calories + (log.calories || 0),
      protein: sum.protein + (log.protein || 0),
      carbs: sum.carbs + (log.carbs || 0),
      fats: sum.fats + (log.fats || 0),
      count: sum.count + 1,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 });
    return { date, ...totals };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Averages
  const totalCalories = dailyTotals.reduce((sum, d) => sum + d.calories, 0);
  const totalProtein = dailyTotals.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = dailyTotals.reduce((sum, d) => sum + d.carbs, 0);
  const totalFats = dailyTotals.reduce((sum, d) => sum + d.fats, 0);
  const totalMeals = dailyTotals.reduce((sum, d) => sum + d.count, 0);

  const avgCalories = Math.round(totalCalories / loggedDays);
  const avgProtein = Math.round(totalProtein / loggedDays);
  const avgCarbs = Math.round(totalCarbs / loggedDays);
  const avgFats = Math.round(totalFats / loggedDays);
  const mealsPerDay = Math.round((totalMeals / loggedDays) * 10) / 10;

  // Goal adherence
  const calorieGoalAdherence = goals.calories > 0
    ? Math.min(100, Math.round((avgCalories / goals.calories) * 100))
    : 0;
  const proteinGoalAdherence = goals.protein > 0
    ? Math.min(100, Math.round((avgProtein / goals.protein) * 100))
    : 0;

  // Trend
  let trend = 'stable';
  if (dailyTotals.length >= 4) {
    const mid = Math.floor(dailyTotals.length / 2);
    const firstHalf = dailyTotals.slice(0, mid);
    const secondHalf = dailyTotals.slice(mid);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.calories, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.calories, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.1) trend = 'increasing';
    else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
  }

  // Best/worst days (by calories proximity to goal)
  const sortedByGoal = [...dailyTotals].sort((a, b) =>
    Math.abs(a.calories - goals.calories) - Math.abs(b.calories - goals.calories)
  );
  const bestDay = sortedByGoal[0] ? { dayKey: sortedByGoal[0].date, calories: sortedByGoal[0].calories } : null;
  const worstDay = sortedByGoal.length > 0
    ? { dayKey: sortedByGoal[sortedByGoal.length - 1].date, calories: sortedByGoal[sortedByGoal.length - 1].calories }
    : null;

  // Nova score average
  const novaScores = foodLogs.filter(l => l.novaScore !== null).map(l => l.novaScore);
  const avgNovaScore = novaScores.length > 0
    ? Math.round((novaScores.reduce((a, b) => a + b, 0) / novaScores.length) * 10) / 10
    : null;

  // Dominant meal type
  const mealTypeCounts = {};
  foodLogs.forEach(log => {
    const type = log.mealType || 'other';
    mealTypeCounts[type] = (mealTypeCounts[type] || 0) + 1;
  });
  const dominantMealType = Object.entries(mealTypeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Consistency (calorie variance)
  const calorieVariance = dailyTotals.length > 1
    ? dailyTotals.reduce((sum, d) => sum + Math.pow(d.calories - avgCalories, 2), 0) / dailyTotals.length
    : 0;
  const isConsistent = Math.sqrt(calorieVariance) < avgCalories * 0.2;

  // Macro balance
  const totalMacroCalories = avgProtein * 4 + avgCarbs * 4 + avgFats * 9;
  const proteinPct = totalMacroCalories > 0 ? (avgProtein * 4 / totalMacroCalories) * 100 : 0;
  const carbsPct = totalMacroCalories > 0 ? (avgCarbs * 4 / totalMacroCalories) * 100 : 0;
  const fatsPct = totalMacroCalories > 0 ? (avgFats * 9 / totalMacroCalories) * 100 : 0;

  let macroBalance = 'balanced';
  if (proteinPct > 35) macroBalance = 'high-protein';
  else if (carbsPct > 60) macroBalance = 'high-carb';
  else if (fatsPct > 45) macroBalance = 'high-fat';
  else if (proteinPct < 10) macroBalance = 'low-protein';

  // Nutrition score (0-100)
  let nutritionScore = 0;
  nutritionScore += Math.min(30, Math.abs(100 - calorieGoalAdherence) < 20 ? 30 : 15);
  nutritionScore += Math.min(20, proteinGoalAdherence >= 80 ? 20 : 10);
  nutritionScore += Math.min(20, avgNovaScore !== null && avgNovaScore <= 2 ? 20 : 10);
  nutritionScore += Math.min(15, isConsistent ? 15 : 5);
  nutritionScore += Math.min(15, mealsPerDay >= 2.5 ? 15 : mealsPerDay >= 1.5 ? 10 : 5);

  return {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFats,
    calorieGoalAdherence,
    proteinGoalAdherence,
    trend,
    loggedDays,
    mealsPerDay,
    bestDay,
    worstDay,
    avgNovaScore,
    dominantMealType,
    nutritionScore,
    isConsistent,
    macroBalance,
  };
}

function calculateHydrationStats(waterLogs, goal) {
  if (!waterLogs || waterLogs.length === 0) {
    return {
      avgDailyIntake: 0,
      goalAdherence: 0,
      trend: 'stable',
      loggedDays: 0,
      bestDay: null,
      worstDay: null,
      avgLogsPerDay: 0,
      isConsistent: false,
      hydrationHabit: 'building',
      peakHydrationTime: null,
      todayProgress: 0,
    };
  }

  // Group by day
  const byDay = {};
  waterLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!byDay[dateKey]) {
      byDay[dateKey] = [];
    }
    byDay[dateKey].push(log);
  });

  const loggedDays = Object.keys(byDay).length;

  // Daily totals
  const dailyTotals = Object.entries(byDay).map(([date, logs]) => {
    const total = logs.reduce((sum, log) => sum + parseFloat(log.amountLiters || 0), 0);
    return { date, liters: Math.round(total * 10) / 10, count: logs.length };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Averages
  const totalLiters = dailyTotals.reduce((sum, d) => sum + d.liters, 0);
  const totalLogs = dailyTotals.reduce((sum, d) => sum + d.count, 0);

  const avgDailyIntake = Math.round((totalLiters / loggedDays) * 10) / 10;
  const avgLogsPerDay = Math.round((totalLogs / loggedDays) * 10) / 10;

  // Goal adherence
  const goalAdherence = goal > 0
    ? Math.min(100, Math.round((avgDailyIntake / goal) * 100))
    : 0;

  // Trend
  let trend = 'stable';
  if (dailyTotals.length >= 4) {
    const mid = Math.floor(dailyTotals.length / 2);
    const firstHalf = dailyTotals.slice(0, mid);
    const secondHalf = dailyTotals.slice(mid);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.liters, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.liters, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.15) trend = 'improving';
    else if (secondAvg < firstAvg * 0.85) trend = 'declining';
  }

  // Best/worst days
  const sorted = [...dailyTotals].sort((a, b) => b.liters - a.liters);
  const bestDay = sorted[0] ? { dayKey: sorted[0].date, liters: sorted[0].liters } : null;
  const worstDay = sorted.length > 0
    ? { dayKey: sorted[sorted.length - 1].date, liters: sorted[sorted.length - 1].liters }
    : null;

  // Consistency
  const variance = dailyTotals.length > 1
    ? dailyTotals.reduce((sum, d) => sum + Math.pow(d.liters - avgDailyIntake, 2), 0) / dailyTotals.length
    : 0;
  const isConsistent = Math.sqrt(variance) < avgDailyIntake * 0.3;

  // Hydration habit level
  let hydrationHabit = 'building';
  if (goalAdherence >= 90 && isConsistent) hydrationHabit = 'excellent';
  else if (goalAdherence >= 70) hydrationHabit = 'good';
  else if (goalAdherence >= 50) hydrationHabit = 'moderate';

  // Peak hydration time
  const hourCounts = {};
  waterLogs.forEach(log => {
    const hour = new Date(log.loggedDate).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakHydrationTime = peakHour !== undefined
    ? (parseInt(peakHour) < 12 ? 'morning' : parseInt(peakHour) < 17 ? 'afternoon' : 'evening')
    : null;

  // Today's progress
  const today = new Date().toISOString().split('T')[0];
  const todayData = dailyTotals.find(d => d.date === today);
  const todayProgress = todayData ? Math.min(100, Math.round((todayData.liters / goal) * 100)) : 0;

  return {
    avgDailyIntake,
    goalAdherence,
    trend,
    loggedDays,
    bestDay,
    worstDay,
    avgLogsPerDay,
    isConsistent,
    hydrationHabit,
    peakHydrationTime,
    todayProgress,
  };
}

function calculateActivityStats(activityLogs, moodLogs) {
  if (!activityLogs || activityLogs.length === 0) {
    return {
      totalMinutesThisWeek: 0,
      avgDurationPerSession: 0,
      avgCaloriesBurned: 0,
      activeDays: 0,
      mostActiveDay: null,
      preferredActivityType: null,
      trend: 'stable',
      moodImpact: null,
      isConsistent: false,
      fitnessLevel: 'beginner',
      preferredTime: null,
      consistencyScore: 0,
      moodBoostEffect: null,
    };
  }

  // Group by day
  const byDay = {};
  activityLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!byDay[dateKey]) {
      byDay[dateKey] = [];
    }
    byDay[dateKey].push(log);
  });

  const activeDays = Object.keys(byDay).length;

  // Daily totals
  const dailyTotals = Object.entries(byDay).map(([date, logs]) => {
    const minutes = logs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const calories = logs.reduce((sum, log) => sum + (log.caloriesBurned || 0), 0);
    return { date, minutes, calories, count: logs.length };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // This week's minutes
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKey = weekAgo.toISOString().split('T')[0];

  const thisWeekTotals = dailyTotals.filter(d => d.date >= weekKey);
  const totalMinutesThisWeek = thisWeekTotals.reduce((sum, d) => sum + d.minutes, 0);

  // Averages
  const totalMinutes = activityLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
  const totalCalories = activityLogs.reduce((sum, log) => sum + (log.caloriesBurned || 0), 0);
  const avgDurationPerSession = Math.round(totalMinutes / activityLogs.length);
  const avgCaloriesBurned = Math.round(totalCalories / activityLogs.length);

  // Most active day of week
  const dayOfWeekCounts = {};
  activityLogs.forEach(log => {
    const dayOfWeek = new Date(log.loggedDate).toLocaleDateString('en-US', { weekday: 'long' });
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
  });
  const mostActiveDay = Object.entries(dayOfWeekCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Preferred activity type
  const typeCounts = {};
  activityLogs.forEach(log => {
    const type = log.type || 'general';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const preferredActivityType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Trend
  let trend = 'stable';
  if (dailyTotals.length >= 4) {
    const mid = Math.floor(dailyTotals.length / 2);
    const firstHalf = dailyTotals.slice(0, mid);
    const secondHalf = dailyTotals.slice(mid);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.minutes, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.minutes, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.2) trend = 'improving';
    else if (secondAvg < firstAvg * 0.8) trend = 'declining';
  }

  // Consistency
  const avgMinutesPerActiveDay = totalMinutes / activeDays;
  const variance = dailyTotals.length > 1
    ? dailyTotals.reduce((sum, d) => sum + Math.pow(d.minutes - avgMinutesPerActiveDay, 2), 0) / dailyTotals.length
    : 0;
  const isConsistent = Math.sqrt(variance) < avgMinutesPerActiveDay * 0.5;

  // Consistency score (0-100)
  let consistencyScore = 0;
  if (activeDays >= 5) consistencyScore += 40;
  else if (activeDays >= 3) consistencyScore += 25;
  else consistencyScore += 10;
  if (isConsistent) consistencyScore += 30;
  if (totalMinutesThisWeek >= 150) consistencyScore += 30;
  else if (totalMinutesThisWeek >= 75) consistencyScore += 15;

  // Fitness level estimate
  let fitnessLevel = 'beginner';
  if (totalMinutesThisWeek >= 300 && avgDurationPerSession >= 45) fitnessLevel = 'advanced';
  else if (totalMinutesThisWeek >= 150 && avgDurationPerSession >= 30) fitnessLevel = 'intermediate';
  else if (activeDays >= 3) fitnessLevel = 'developing';

  // Preferred time
  const hourCounts = {};
  activityLogs.forEach(log => {
    const hour = new Date(log.loggedDate).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const preferredTime = peakHour !== undefined
    ? (parseInt(peakHour) < 12 ? 'morning' : parseInt(peakHour) < 17 ? 'afternoon' : 'evening')
    : null;

  // Mood impact analysis
  let moodImpact = null;
  let moodBoostEffect = null;
  if (moodLogs && moodLogs.length >= 3 && activityLogs.length >= 3) {
    // Compare mood on active vs inactive days
    const activeDaySet = new Set(Object.keys(byDay));
    const moodByDay = {};
    moodLogs.forEach(log => {
      const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[dateKey]) {
        moodByDay[dateKey] = [];
      }
      moodByDay[dateKey].push(log.intensity || 5);
    });

    let activeDayMoodSum = 0, activeDayMoodCount = 0;
    let inactiveDayMoodSum = 0, inactiveDayMoodCount = 0;

    Object.entries(moodByDay).forEach(([date, intensities]) => {
      const avgMood = intensities.reduce((a, b) => a + b, 0) / intensities.length;
      if (activeDaySet.has(date)) {
        activeDayMoodSum += avgMood;
        activeDayMoodCount++;
      } else {
        inactiveDayMoodSum += avgMood;
        inactiveDayMoodCount++;
      }
    });

    if (activeDayMoodCount >= 2 && inactiveDayMoodCount >= 2) {
      const activeDayAvg = activeDayMoodSum / activeDayMoodCount;
      const inactiveDayAvg = inactiveDayMoodSum / inactiveDayMoodCount;
      const diff = activeDayAvg - inactiveDayAvg;

      if (diff > 0.5) {
        moodImpact = 'positive';
        moodBoostEffect = Math.round(diff * 10) / 10;
      } else if (diff < -0.5) {
        moodImpact = 'negative';
        moodBoostEffect = Math.round(diff * 10) / 10;
      } else {
        moodImpact = 'neutral';
        moodBoostEffect = 0;
      }
    }
  }

  return {
    totalMinutesThisWeek,
    avgDurationPerSession,
    avgCaloriesBurned,
    activeDays,
    mostActiveDay,
    preferredActivityType,
    trend,
    moodImpact,
    isConsistent,
    fitnessLevel,
    preferredTime,
    consistencyScore,
    moodBoostEffect,
  };
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC PATTERN GENERATION
 * ============================================================================
 */

function generateNutritionPatterns(nutritionData, stats, correlations) {
  const patterns = [];

  // Pattern 1: Calorie consistency
  if (stats.isConsistent && stats.loggedDays >= 3) {
    patterns.push({
      title: 'Consistent eating habits',
      description: 'Your calorie intake has been steady',
      icon: 'checkmark-circle',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.8,
      category: 'consistency',
    });
  } else if (!stats.isConsistent && stats.loggedDays >= 5) {
    patterns.push({
      title: 'Variable eating pattern',
      description: 'Your calorie intake varies day to day',
      icon: 'swap-horizontal',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.7,
      category: 'variability',
    });
  }

  // Pattern 2: Goal adherence
  if (stats.calorieGoalAdherence >= 90 && stats.calorieGoalAdherence <= 110) {
    patterns.push({
      title: 'Hitting your targets',
      description: `Averaging ${stats.avgCalories} cal/day`,
      icon: 'ribbon',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.9,
      category: 'goal',
    });
  } else if (stats.calorieGoalAdherence < 70) {
    patterns.push({
      title: 'Under your calorie goal',
      description: `Averaging ${stats.avgCalories} cal/day`,
      icon: 'trending-down',
      color: '#EF4444',
      light: '#FEE2E2',
      confidence: 0.85,
      category: 'goal',
    });
  } else if (stats.calorieGoalAdherence > 130) {
    patterns.push({
      title: 'Exceeding calorie goal',
      description: `Averaging ${stats.avgCalories} cal/day`,
      icon: 'trending-up',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.85,
      category: 'goal',
    });
  }

  // Pattern 3: Protein intake
  if (stats.proteinGoalAdherence >= 80) {
    patterns.push({
      title: 'Great protein intake',
      description: `Averaging ${stats.avgProtein}g protein/day`,
      icon: 'barbell',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.85,
      category: 'macro',
    });
  } else if (stats.proteinGoalAdherence < 50) {
    patterns.push({
      title: 'Low protein intake',
      description: 'Consider adding more protein sources',
      icon: 'alert-circle',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.8,
      category: 'macro',
    });
  }

  // Pattern 4: NOVA score
  if (stats.avgNovaScore !== null) {
    if (stats.avgNovaScore <= 2) {
      patterns.push({
        title: 'Whole foods focus',
        description: 'Your diet is mostly unprocessed foods',
        icon: 'leaf',
        color: '#10B981',
        light: '#D1FAE5',
        confidence: 0.85,
        category: 'quality',
      });
    } else if (stats.avgNovaScore >= 3.5) {
      patterns.push({
        title: 'Processed food heavy',
        description: 'Consider more whole food options',
        icon: 'fast-food',
        color: '#EF4444',
        light: '#FEE2E2',
        confidence: 0.8,
        category: 'quality',
      });
    }
  }

  // Pattern 5: Meal frequency
  if (stats.mealsPerDay >= 3) {
    patterns.push({
      title: 'Regular meal pattern',
      description: `Logging ${stats.mealsPerDay} meals/day`,
      icon: 'time',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.75,
      category: 'frequency',
    });
  }

  // Add correlation-based patterns
  correlations.forEach(c => {
    if (parseFloat(c.confidence) >= 0.6) {
      patterns.push({
        title: formatCorrelationTitle(c.ruleName),
        description: c.expectedOutcome || 'Pattern detected from your data',
        icon: getIconForCorrelation(c.ruleName),
        color: c.healthImpactSeverity === 'positive' ? '#10B981' : '#F59E0B',
        light: c.healthImpactSeverity === 'positive' ? '#D1FAE5' : '#FEF3C7',
        confidence: parseFloat(c.confidence),
        category: 'correlation',
      });
    }
  });

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function generateHydrationPatterns(hydrationData, stats, correlations) {
  const patterns = [];

  // Pattern 1: Goal adherence
  if (stats.goalAdherence >= 90) {
    patterns.push({
      title: 'Hydration champion',
      description: 'Consistently meeting your water goal',
      icon: 'trophy',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.9,
      category: 'goal',
    });
  } else if (stats.goalAdherence >= 70) {
    patterns.push({
      title: 'Good hydration',
      description: `Averaging ${stats.avgDailyIntake}L daily`,
      icon: 'water',
      color: '#3B82F6',
      light: '#DBEAFE',
      confidence: 0.8,
      category: 'goal',
    });
  } else if (stats.goalAdherence < 50) {
    patterns.push({
      title: 'Needs more water',
      description: 'Try drinking more throughout the day',
      icon: 'alert-circle',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.85,
      category: 'goal',
    });
  }

  // Pattern 2: Consistency
  if (stats.isConsistent && stats.loggedDays >= 3) {
    patterns.push({
      title: 'Consistent hydration',
      description: 'Your water intake is steady',
      icon: 'checkmark-circle',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.8,
      category: 'consistency',
    });
  }

  // Pattern 3: Trend
  if (stats.trend === 'improving') {
    patterns.push({
      title: 'Improving hydration',
      description: 'Your water intake is trending up',
      icon: 'trending-up',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.75,
      category: 'trend',
    });
  } else if (stats.trend === 'declining') {
    patterns.push({
      title: 'Hydration dipping',
      description: 'Your water intake has decreased',
      icon: 'trending-down',
      color: '#EF4444',
      light: '#FEE2E2',
      confidence: 0.75,
      category: 'trend',
    });
  }

  // Pattern 4: Peak time
  if (stats.peakHydrationTime) {
    patterns.push({
      title: `${stats.peakHydrationTime.charAt(0).toUpperCase() + stats.peakHydrationTime.slice(1)} hydrator`,
      description: `You drink most water in the ${stats.peakHydrationTime}`,
      icon: stats.peakHydrationTime === 'morning' ? 'sunny' : stats.peakHydrationTime === 'afternoon' ? 'partly-sunny' : 'moon',
      color: '#3B82F6',
      light: '#DBEAFE',
      confidence: 0.7,
      category: 'timing',
    });
  }

  // Pattern 5: Today's progress
  if (stats.todayProgress >= 80) {
    patterns.push({
      title: 'Great day so far',
      description: `${stats.todayProgress}% of today's goal`,
      icon: 'thumbs-up',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.9,
      category: 'today',
    });
  }

  // Add correlation-based patterns
  correlations.forEach(c => {
    if (parseFloat(c.confidence) >= 0.6) {
      patterns.push({
        title: formatCorrelationTitle(c.ruleName),
        description: c.expectedOutcome || 'Pattern detected',
        icon: 'water',
        color: c.healthImpactSeverity === 'positive' ? '#10B981' : '#F59E0B',
        light: c.healthImpactSeverity === 'positive' ? '#D1FAE5' : '#FEF3C7',
        confidence: parseFloat(c.confidence),
        category: 'correlation',
      });
    }
  });

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function generateActivityPatterns(activityData, stats, correlations) {
  const patterns = [];

  // Pattern 1: Activity level
  if (stats.totalMinutesThisWeek >= 150) {
    patterns.push({
      title: 'Meeting activity guidelines',
      description: `${stats.totalMinutesThisWeek} min this week`,
      icon: 'trophy',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.9,
      category: 'goal',
    });
  } else if (stats.totalMinutesThisWeek >= 75) {
    patterns.push({
      title: 'Active week',
      description: `${stats.totalMinutesThisWeek} min logged`,
      icon: 'fitness',
      color: '#3B82F6',
      light: '#DBEAFE',
      confidence: 0.8,
      category: 'goal',
    });
  } else if (stats.activeDays >= 1) {
    patterns.push({
      title: 'Getting started',
      description: 'Keep building your activity habit',
      icon: 'walk',
      color: '#F59E0B',
      light: '#FEF3C7',
      confidence: 0.7,
      category: 'goal',
    });
  }

  // Pattern 2: Consistency
  if (stats.isConsistent && stats.activeDays >= 3) {
    patterns.push({
      title: 'Consistent exerciser',
      description: 'Your workout routine is steady',
      icon: 'checkmark-circle',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.85,
      category: 'consistency',
    });
  }

  // Pattern 3: Preferred activity
  if (stats.preferredActivityType && stats.preferredActivityType !== 'general') {
    const typeLabels = {
      running: '🏃 Running enthusiast',
      cycling: '🚴 Cycling lover',
      walking: '🚶 Regular walker',
      gym: '💪 Gym goer',
      swimming: '🏊 Swimmer',
      yoga: '🧘 Yoga practitioner',
      hiit: '🔥 HIIT fan',
    };
    patterns.push({
      title: typeLabels[stats.preferredActivityType] || `${stats.preferredActivityType} focused`,
      description: `Your favorite activity type`,
      icon: 'barbell',
      color: '#8B5CF6',
      light: '#EDE9FE',
      confidence: 0.8,
      category: 'preference',
    });
  }

  // Pattern 4: Mood impact
  if (stats.moodImpact === 'positive') {
    patterns.push({
      title: 'Exercise boosts your mood',
      description: `+${stats.moodBoostEffect} mood on active days`,
      icon: 'happy',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.75,
      category: 'correlation',
    });
  }

  // Pattern 5: Preferred time
  if (stats.preferredTime) {
    patterns.push({
      title: `${stats.preferredTime.charAt(0).toUpperCase() + stats.preferredTime.slice(1)} exerciser`,
      description: `You're most active in the ${stats.preferredTime}`,
      icon: stats.preferredTime === 'morning' ? 'sunny' : stats.preferredTime === 'afternoon' ? 'partly-sunny' : 'moon',
      color: '#3B82F6',
      light: '#DBEAFE',
      confidence: 0.7,
      category: 'timing',
    });
  }

  // Pattern 6: Trend
  if (stats.trend === 'improving') {
    patterns.push({
      title: 'Building momentum',
      description: 'Your activity level is increasing',
      icon: 'trending-up',
      color: '#10B981',
      light: '#D1FAE5',
      confidence: 0.75,
      category: 'trend',
    });
  }

  // Add correlation-based patterns
  correlations.forEach(c => {
    if (parseFloat(c.confidence) >= 0.6) {
      patterns.push({
        title: formatCorrelationTitle(c.ruleName),
        description: c.expectedOutcome || 'Pattern detected',
        icon: 'barbell',
        color: c.healthImpactSeverity === 'positive' ? '#10B981' : '#F59E0B',
        light: c.healthImpactSeverity === 'positive' ? '#D1FAE5' : '#FEF3C7',
        confidence: parseFloat(c.confidence),
        category: 'correlation',
      });
    }
  });

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC RECOMMENDATIONS
 * ============================================================================
 */

// Witty copy library for variety
const WITTY_COPY = {
  protein: {
    titles: [
      'Power up with protein 💪',
      'Protein party time! 🎊',
      'Your muscles called... 📞',
      'Gains department here 🏋️',
      'Fuel check: needs protein 🔋',
    ],
    descriptions: [
      'Your muscles are sending a memo: more gains fuel please!',
      'Eggs, Greek yogurt, or even chickpeas - your body will thank you',
      'Building blocks for that dream bod are running low',
      'Time to befriend some lean protein sources',
      'Even a handful of nuts can help boost your intake',
    ],
  },
  quality: {
    titles: [
      'Less lab, more garden 🥬',
      'Real food radar 📡',
      'Grandma\'s kitchen calling 👵',
      'Unprocess your progress 🌿',
      'Ingredient list shrinkage needed 📜',
    ],
    descriptions: [
      'Swap that processed stuff for foods your grandma would recognize',
      'If you can\'t pronounce it, your body probably doesn\'t want it',
      'More colors from nature, fewer from factories',
      'Your gut microbiome is voting for whole foods',
      'Simple ingredients = happy insides',
    ],
  },
  missingMeals: {
    titles: [
      'We\'re missing meals! 🕵️',
      'Meal detective alert 🔍',
      'The food log gaps 📊',
      'Snack tracker needed 🍿',
      'Full picture loading... 🖼️',
    ],
    descriptions: [
      'Log everything - snacks, nibbles, and that midnight cheese raid',
      'Every bite counts! Even the "just a taste" moments',
      'We can only help with what we can see 👀',
      'Your insights get better with every meal logged',
      'Don\'t let the good snacks go untracked!',
    ],
  },
  underEating: {
    titles: [
      'Feed the machine 🚀',
      'Fuel gauge: LOW ⛽',
      'Energy account overdrawn 🏦',
      'Body needs backup 🔋',
      'Calorie SOS 🆘',
    ],
    descriptions: [
      'You\'re running on fumes! Your body needs more fuel',
      'Even cars need gas - your body\'s no different',
      'Under-fueling isn\'t a weight loss hack, it\'s a slowdown',
      'Your metabolism is waving a tiny white flag',
      'More food = more energy to burn. It\'s math! 🧮',
    ],
  },
  thirsty: {
    titles: [
      'Your cells are thirsty! 🏜️',
      'Hydration station alert 🚰',
      'Water wanted! 💧',
      'Dehydration approaching 🌵',
      'Aqua emergency 🚨',
    ],
    descriptions: [
      'Time for a refill adventure!',
      'Your brain is basically a sponge - keep it moist!',
      'Chug-chug-chug! (water, not coffee)',
      'Every cell in your body just sighed dramatically',
      'H2-Owe yourself a glass right now',
    ],
  },
  hydrationHabit: {
    titles: [
      'Befriend the bottle 🍼',
      'Water bottle romance 💕',
      'Sip game weak 😅',
      'Hydration habit loading... ⏳',
      'Water relationship status: complicated 💔',
    ],
    descriptions: [
      'Keep one at your desk - it\'ll become your hydration sidekick',
      'Set phone reminders until sipping becomes second nature',
      'Link water to existing habits: coffee time = water time too',
      'A glass before each meal is an easy win',
      'Make it fun - fancy cup, fruit infusions, whatever works!',
    ],
  },
  hydrationInconsistent: {
    titles: [
      'Hydration rollercoaster 🎢',
      'Water yo-yo 🪀',
      'Sip patterns: chaotic 🌀',
      'Hydration mood swings 🎭',
      'Inconsistency detected 📈📉',
    ],
    descriptions: [
      'Your water intake is all over the place - let\'s steady the ship!',
      'Some days you\'re a fish, others a camel. Let\'s find balance!',
      'Consistent hydration = consistent energy. Worth it!',
      'Same amount daily = your body knows what to expect',
      'Predictable sipping leads to predictable thriving',
    ],
  },
  needsMovement: {
    titles: [
      'Your body craves movement! 🏃',
      'Couch mode detected 🛋️',
      'Movement meter: low 📊',
      'Legs: use \'em or lose \'em 🦵',
      'Activity alert 🚨',
    ],
    descriptions: [
      'Even a dance party counts - let\'s shake off that chair time',
      'Your body was built to move! Let\'s honor that',
      'A walk around the block beats staying put',
      'Movement is medicine. Time for your dose!',
      'Your future self is begging you to stretch those legs',
    ],
  },
  moreActiveDays: {
    titles: [
      'Sprinkle more active days ✨',
      'Active day deficit 📉',
      'Movement calendar gap 📅',
      'Workout variety pack needed 📦',
      'Activity spread thin 🧈',
    ],
    descriptions: [
      'Think quality, not quantity - 3 days can work wonders',
      'Spread it out: your body likes variety',
      'Even 20 minutes counts as an active day!',
      'Mix it up: walk Monday, dance Wednesday, yoga Friday',
      'Consistency beats intensity every time',
    ],
  },
  moodBooster: {
    titles: [
      'Your mood\'s biggest fan 🎉',
      'Happiness hack discovered 🔓',
      'Endorphin factory working 🏭',
      'Exercise = smile equation 😊',
      'Mood upgrade unlocked 🔓',
    ],
    descriptions: [
      'Exercise makes you happy - science says so, and so does your data!',
      'Your data proves it: you\'re happier when you move',
      'Those endorphins are real and they like you',
      'Keep this up - your brain chemistry approves',
      'Movement + you = better moods. The math checks out!',
    ],
  },
  longerSessions: {
    titles: [
      'Just 10 more minutes! ⏱️',
      'Workout extension sale 🏷️',
      'Add-on opportunity 🎁',
      'Session stretch challenge 💪',
      'Bonus round available 🎮',
    ],
    descriptions: [
      'Add a song\'s worth of time - your future self will high-five you',
      'Those extra minutes compound into big results',
      'Your warm-up is basically done - might as well keep going!',
      'Just one more song, one more lap, one more set',
      'The best gains happen in those "almost done" minutes',
    ],
  },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNutritionRecommendations(stats, nutritionData) {
  const recommendations = [];

  if (stats.proteinGoalAdherence < 70) {
    recommendations.push({
      type: 'protein',
      title: pickRandom(WITTY_COPY.protein.titles),
      description: pickRandom(WITTY_COPY.protein.descriptions),
      priority: 'high',
      icon: 'nutrition',
      action: { type: 'log', route: '/(tabs)/log' },
    });
  }

  if (stats.avgNovaScore && stats.avgNovaScore > 3) {
    recommendations.push({
      type: 'quality',
      title: pickRandom(WITTY_COPY.quality.titles),
      description: pickRandom(WITTY_COPY.quality.descriptions),
      priority: 'medium',
      icon: 'leaf',
      action: { type: 'learn', topic: 'whole_foods' },
    });
  }

  if (stats.mealsPerDay < 2) {
    recommendations.push({
      type: 'frequency',
      title: pickRandom(WITTY_COPY.missingMeals.titles),
      description: pickRandom(WITTY_COPY.missingMeals.descriptions),
      priority: 'medium',
      icon: 'add-circle',
      action: { type: 'log', route: '/(tabs)/log' },
    });
  }

  if (stats.calorieGoalAdherence < 80) {
    recommendations.push({
      type: 'calories',
      title: pickRandom(WITTY_COPY.underEating.titles),
      description: pickRandom(WITTY_COPY.underEating.descriptions),
      priority: 'medium',
      icon: 'restaurant',
      action: { type: 'log', route: '/(tabs)/log' },
    });
  }

  return recommendations;
}

function generateHydrationRecommendations(stats, hydrationData) {
  const recommendations = [];

  if (stats.todayProgress < 50) {
    recommendations.push({
      type: 'today',
      title: pickRandom(WITTY_COPY.thirsty.titles),
      description: `Only ${stats.todayProgress}% done - ${pickRandom(WITTY_COPY.thirsty.descriptions)}`,
      priority: 'high',
      icon: 'water',
      action: { type: 'log', route: '/water-logger' },
    });
  }

  if (stats.goalAdherence < 60) {
    recommendations.push({
      type: 'habit',
      title: pickRandom(WITTY_COPY.hydrationHabit.titles),
      description: pickRandom(WITTY_COPY.hydrationHabit.descriptions),
      priority: 'medium',
      icon: 'alarm',
      action: { type: 'reminder' },
    });
  }

  if (!stats.isConsistent) {
    recommendations.push({
      type: 'consistency',
      title: pickRandom(WITTY_COPY.hydrationInconsistent.titles),
      description: pickRandom(WITTY_COPY.hydrationInconsistent.descriptions),
      priority: 'low',
      icon: 'calendar',
      action: { type: 'learn', topic: 'hydration_tips' },
    });
  }

  return recommendations;
}

function generateActivityRecommendations(stats, activityData) {
  const recommendations = [];

  if (stats.totalMinutesThisWeek < 75) {
    recommendations.push({
      type: 'activity',
      title: pickRandom(WITTY_COPY.needsMovement.titles),
      description: pickRandom(WITTY_COPY.needsMovement.descriptions),
      priority: 'high',
      icon: 'fitness',
      action: { type: 'log', route: '/activity-logger' },
    });
  }

  if (stats.activeDays < 3) {
    recommendations.push({
      type: 'frequency',
      title: pickRandom(WITTY_COPY.moreActiveDays.titles),
      description: pickRandom(WITTY_COPY.moreActiveDays.descriptions),
      priority: 'medium',
      icon: 'calendar',
      action: { type: 'log', route: '/activity-logger' },
    });
  }

  if (stats.moodImpact === 'positive') {
    recommendations.push({
      type: 'mood',
      title: pickRandom(WITTY_COPY.moodBooster.titles),
      description: pickRandom(WITTY_COPY.moodBooster.descriptions),
      priority: 'low',
      icon: 'happy',
      action: { type: 'reinforce' },
    });
  }

  if (stats.avgDurationPerSession < 20 && stats.activeDays >= 2) {
    recommendations.push({
      type: 'duration',
      title: pickRandom(WITTY_COPY.longerSessions.titles),
      description: pickRandom(WITTY_COPY.longerSessions.descriptions),
      priority: 'medium',
      icon: 'time',
      action: { type: 'learn', topic: 'workout_tips' },
    });
  }

  return recommendations;
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC TREND DATA
 * ============================================================================
 */

function generateNutritionTrendData(foodLogs) {
  const now = new Date();
  const trendData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    const dayLogs = foodLogs.filter(log => {
      const logDate = new Date(log.loggedDate).toISOString().split('T')[0];
      return logDate === dateKey;
    });

    const hasData = dayLogs.length > 0;
    const totals = dayLogs.reduce((sum, log) => ({
      calories: sum.calories + (log.calories || 0),
      protein: sum.protein + (log.protein || 0),
      carbs: sum.carbs + (log.carbs || 0),
      fats: sum.fats + (log.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    trendData.push({
      dayKey: dateKey,
      day: dayName,
      hasData,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      mealCount: dayLogs.length,
      isToday: i === 0,
    });
  }

  return trendData;
}

function generateHydrationTrendData(waterLogs) {
  const now = new Date();
  const trendData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    const dayLogs = waterLogs.filter(log => {
      const logDate = new Date(log.loggedDate).toISOString().split('T')[0];
      return logDate === dateKey;
    });

    const hasData = dayLogs.length > 0;
    const totalLiters = dayLogs.reduce((sum, log) => sum + parseFloat(log.amountLiters || 0), 0);

    trendData.push({
      dayKey: dateKey,
      day: dayName,
      hasData,
      liters: Math.round(totalLiters * 10) / 10,
      logCount: dayLogs.length,
      isToday: i === 0,
    });
  }

  return trendData;
}

function generateActivityTrendData(activityLogs) {
  const now = new Date();
  const trendData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    const dayLogs = activityLogs.filter(log => {
      const logDate = new Date(log.loggedDate).toISOString().split('T')[0];
      return logDate === dateKey;
    });

    const hasData = dayLogs.length > 0;
    const totals = dayLogs.reduce((sum, log) => ({
      minutes: sum.minutes + (log.durationMinutes || 0),
      calories: sum.calories + (log.caloriesBurned || 0),
    }), { minutes: 0, calories: 0 });

    trendData.push({
      dayKey: dateKey,
      day: dayName,
      hasData,
      minutes: totals.minutes,
      caloriesBurned: totals.calories,
      sessionCount: dayLogs.length,
      isToday: i === 0,
    });
  }

  return trendData;
}

/**
 * ============================================================================
 * DOMAIN-SPECIFIC DECISION MAKING
 * ============================================================================
 */

function makeNutritionDecision(stats, correlations, nutritionData) {
  if (stats.loggedDays < 3) {
    return { type: 'SILENT', reason: 'insufficient_data' };
  }

  // Low calorie goal adherence is notable
  if (stats.calorieGoalAdherence < 60 || stats.calorieGoalAdherence > 150) {
    return { type: 'SPEAK', reason: 'calorie_goal_deviation' };
  }

  // Strong correlation found
  if (correlations.length > 0 && parseFloat(correlations[0].confidence) >= 0.7) {
    return { type: 'SPEAK', reason: 'strong_nutrition_correlation' };
  }

  // Great nutrition score
  if (stats.nutritionScore >= 80) {
    return { type: 'REINFORCE', reason: 'excellent_nutrition' };
  }

  // Default: show insights
  if (stats.loggedDays >= 5) {
    return { type: 'REINFORCE', reason: 'pattern_maintenance' };
  }

  return { type: 'SILENT', reason: 'building_baseline' };
}

function makeHydrationDecision(stats, correlations, hydrationData) {
  if (stats.loggedDays < 3) {
    return { type: 'SILENT', reason: 'insufficient_data' };
  }

  // Low hydration is concerning
  if (stats.goalAdherence < 50) {
    return { type: 'SPEAK', reason: 'low_hydration' };
  }

  // Strong correlation found
  if (correlations.length > 0 && parseFloat(correlations[0].confidence) >= 0.7) {
    return { type: 'SPEAK', reason: 'hydration_correlation' };
  }

  // Great hydration
  if (stats.goalAdherence >= 90 && stats.isConsistent) {
    return { type: 'REINFORCE', reason: 'excellent_hydration' };
  }

  // Default
  if (stats.loggedDays >= 5) {
    return { type: 'REINFORCE', reason: 'pattern_maintenance' };
  }

  return { type: 'SILENT', reason: 'building_baseline' };
}

function makeActivityDecision(stats, correlations, activityData) {
  if (stats.activeDays < 2) {
    return { type: 'SILENT', reason: 'insufficient_data' };
  }

  // Positive mood impact is significant
  if (stats.moodImpact === 'positive' && stats.moodBoostEffect >= 0.5) {
    return { type: 'SPEAK', reason: 'activity_mood_boost' };
  }

  // Strong correlation found
  if (correlations.length > 0 && parseFloat(correlations[0].confidence) >= 0.7) {
    return { type: 'SPEAK', reason: 'activity_correlation' };
  }

  // Meeting activity guidelines
  if (stats.totalMinutesThisWeek >= 150) {
    return { type: 'REINFORCE', reason: 'meeting_guidelines' };
  }

  // Building habit
  if (stats.activeDays >= 3) {
    return { type: 'REINFORCE', reason: 'building_habit' };
  }

  return { type: 'SILENT', reason: 'building_baseline' };
}

/**
 * ============================================================================
 * DOMAIN FILTER HELPERS
 * ============================================================================
 */

function isNutritionRelated(correlation) {
  const ruleName = (correlation.ruleName || '').toLowerCase();
  const outcome = (correlation.expectedOutcome || '').toLowerCase();
  const keywords = ['food', 'meal', 'protein', 'sugar', 'nova', 'breakfast', 'dinner', 'lunch', 'calories', 'carbs', 'fats', 'eating'];
  return keywords.some(kw => ruleName.includes(kw) || outcome.includes(kw));
}

function isHydrationRelated(correlation) {
  const ruleName = (correlation.ruleName || '').toLowerCase();
  const outcome = (correlation.expectedOutcome || '').toLowerCase();
  const keywords = ['water', 'hydration', 'dehydration', 'drink', 'fluid'];
  return keywords.some(kw => ruleName.includes(kw) || outcome.includes(kw));
}

function isActivityRelated(correlation) {
  const ruleName = (correlation.ruleName || '').toLowerCase();
  const outcome = (correlation.expectedOutcome || '').toLowerCase();
  const keywords = ['exercise', 'activity', 'sedentary', 'workout', 'running', 'walking', 'gym', 'fitness', 'movement'];
  return keywords.some(kw => ruleName.includes(kw) || outcome.includes(kw));
}

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */

export default {
  generateIntelligentRecommendations,
  generateMoodInsights,
  generateNutritionInsights,
  generateHydrationInsights,
  generateActivityInsights,
};
