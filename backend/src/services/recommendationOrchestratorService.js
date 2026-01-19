/**
 * Daily Recommendation Orchestrator Service
 *
 * Decision pipeline that runs daily to:
 * 1. Compute correlations
 * 2. Determine user's lifecycle stage
 * 3. Filter correlations by stage and confidence
 * 4. Decide recommendation type (Speak, Reinforce, Predict, Silent)
 * 5. Generate actionable messages and insights
 * 6. Store daily intelligence for frontend display
 *
 * Architecture:
 * - Correlations (computed by correlationEngineService) → Intelligence
 * - Lifecycle Stage (determined by user metrics) → Depth/Language
 * - Decision Logic → What to show, how to show it
 * - Output → Dashboard insights, notification messages
 */

import { db } from '../db/index.js';
import {
  profilesTable,
  nutritionGoalsTable,
  foodLogTable,
  moodLogTable,
  waterLogTable,
  userCorrelationsTable,
  dailyNutritionSummaryTable,
  gamificationTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import {
  computeUserCorrelations,
  getUserCorrelations,
  saveCorrelation,
} from './correlationEngineService.js';

/**
 * ============================================
 * HELPER UTILITIES
 * ============================================
 */

/**
 * Convert confidence (0-1) to human-readable label
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'Very High';
  if (confidence >= 0.6) return 'High';
  if (confidence >= 0.4) return 'Moderate';
  return 'Low';
}

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
    console.warn('[Orchestrator] Error calculating totalDaysWithLogs:', error.message);
    // Fallback to rough estimate if query fails
    return 0;
  }
}

/**
 * ============================================
 * LIFECYCLE STAGE DETECTION
 * ============================================
 */

/**
 * Determine user's lifecycle stage based on logging history
 */
export function determineLifecycleStage(userMetrics) {
  const {
    totalDaysWithLogs = 0,
    loggingStreak = 0,
    daysSinceLastLog = 999,
  } = userMetrics;

  // Elite: 365+ days consistent data
  if (totalDaysWithLogs >= 365) {
    return {
      stage: 'ELITE',
      label: 'Health Visionary',
      minConfidence: 0.80,
      windowTypes: ['4h', '24h', '7d', '15d', '30d', '60d'],
      correlationsToShow: 6,
      messageStyle: 'predictive_outcome',
    };
  }

  // Champion: 180+ days
  if (totalDaysWithLogs >= 180) {
    return {
      stage: 'CHAMPION',
      label: 'Behavioral Master',
      minConfidence: 0.75,
      windowTypes: ['24h', '7d', '15d', '30d', '60d'],
      correlationsToShow: 5,
      messageStyle: 'long_term_trend',
    };
  }

  // Master: 90+ days
  if (totalDaysWithLogs >= 90) {
    return {
      stage: 'MASTER',
      label: 'Health Optimizer',
      minConfidence: 0.70,
      windowTypes: ['4h', '24h', '7d', '15d', '30d'],
      correlationsToShow: 4,
      messageStyle: 'anticipatory_predictive',
    };
  }

  // Optimizer: 30+ days
  if (totalDaysWithLogs >= 30) {
    return {
      stage: 'OPTIMIZER',
      label: 'Pattern Recognizer',
      minConfidence: 0.65,
      windowTypes: ['24h', '7d', '15d', '30d'],
      correlationsToShow: 3,
      messageStyle: 'predictive_actionable',
    };
  }

  // Tracker: 7+ days
  if (totalDaysWithLogs >= 7) {
    return {
      stage: 'TRACKER',
      label: 'Habit Builder',
      minConfidence: 0.60,
      windowTypes: ['24h', '7d'],
      correlationsToShow: 2,
      messageStyle: 'pattern_evidence',
    };
  }

  // Builder: 2-6 days
  if (totalDaysWithLogs >= 2) {
    return {
      stage: 'BUILDER',
      label: 'Just Starting',
      minConfidence: 0.50,
      windowTypes: ['24h'],
      correlationsToShow: 1,
      messageStyle: 'early_signal',
    };
  }

  // Discoverer: Day 0-1
  return {
    stage: 'DISCOVERER',
    label: 'Welcome',
    minConfidence: null,
    windowTypes: [],
    correlationsToShow: 0,
    messageStyle: 'celebration',
  };
}

/**
 * ============================================
 * DECISION LOGIC
 * ============================================
 */

/**
 * Decide what type of recommendation to generate for this user
 *
 * Decision Matrix:
 * - SPEAK: New significant correlation discovered (confidence 0.8+)
 * - REINFORCE: Known pattern still valid, keep reinforcing behavior
 * - PREDICT: Use patterns to anticipate tomorrow/this week
 * - SILENT: User is optimal, no action needed
 */
export function decideRecommendationType(correlations, lifecycleStage, userMetrics) {
  if (!correlations || correlations.length === 0) {
    return { type: 'SILENT', reason: 'no_correlations' };
  }

  // Sort by confidence descending
  const sorted = [...correlations].sort((a, b) => b.confidence - a.confidence);
  const strongest = sorted[0];

  // SPEAK: New high-confidence correlation
  if (
    strongest.confidence >= 0.8 &&
    strongest.occurrences <= 3 &&
    strongest.healthImpactSeverity !== 'positive'
  ) {
    return {
      type: 'SPEAK',
      reason: 'new_significant_pattern',
      correlation: strongest,
    };
  }

  // REINFORCE: Pattern is known, still valid, positive outcome
  if (strongest.healthImpactSeverity === 'positive' && strongest.confidence >= 0.7) {
    return {
      type: 'REINFORCE',
      reason: 'positive_behavior_reinforcement',
      correlation: strongest,
    };
  }

  // PREDICT: Lifecycle stage allows predictions (MASTER+)
  if (['MASTER', 'CHAMPION', 'ELITE'].includes(lifecycleStage.stage)) {
    const predictiveCorrelations = sorted.filter(c => c.confidence >= lifecycleStage.minConfidence);
    if (predictiveCorrelations.length > 0) {
      return {
        type: 'PREDICT',
        reason: 'anticipatory_insight',
        correlation: predictiveCorrelations[0],
      };
    }
  }

  // REINFORCE as fallback
  if (sorted.length > 0) {
    return {
      type: 'REINFORCE',
      reason: 'pattern_maintenance',
      correlation: sorted[0],
    };
  }

  return { type: 'SILENT', reason: 'no_actionable_insights' };
}

/**
 * ============================================
 * MESSAGE GENERATION (Layman-Friendly)
 * ============================================
 */

/**
 * Generate a human-readable message from a correlation and decision type
 *
 * Format:
 * {
 *   headline: "Short punchy title",
 *   subtitle: "One line explanation",
 *   actions: [{ text: "Action", description: "What to do" }],
 *   visual: { type: "gauge" | "progress" | "sparkline", data: {...} }
 * }
 */
export function generateMessage(decision, correlation, lifecycleStage) {
  if (!correlation) {
    return generateSilentMessage();
  }

  const { ruleName, expectedOutcome, affectedDomains, healthImpactSeverity } = correlation;

  switch (decision.type) {
    case 'SPEAK':
      return generateSpeakMessage(correlation, lifecycleStage);
    case 'REINFORCE':
      return generateReinforceMessage(correlation, lifecycleStage);
    case 'PREDICT':
      return generatePredictMessage(correlation, lifecycleStage);
    case 'SILENT':
      return generateSilentMessage();
    default:
      return generateSilentMessage();
  }
}

function generateSpeakMessage(correlation, lifecycleStage) {
  const { expectedOutcome, affectedDomains, confidence, occurrences } = correlation;

  let headline = '';
  let subtitle = '';
  let actions = [];

  switch (correlation.ruleName) {
    case 'high_nova_mood_crash':
      headline = 'Mood Dips After Certain Foods';
      subtitle = `We noticed: High-processed meals → energy crashes 2-4h later (${occurrences} times)`;
      actions = [
        {
          icon: 'nutrition',
          text: 'Add protein to meals',
          description: 'Protein stabilizes blood sugar and mood',
        },
        {
          icon: 'leaf',
          text: 'Try nuts or yogurt as snacks',
          description: 'Instead of crackers or candy',
        },
      ];
      break;

    case 'dehydration_fatigue_mood':
      headline = 'Dehydration May Affect Your Mood';
      subtitle = 'Low water intake on certain days correlates with tiredness and low mood';
      actions = [
        {
          icon: 'water',
          text: 'Drink water with meals',
          description: 'Creates a natural hydration rhythm',
        },
        {
          icon: 'alarm-outline',
          text: 'Set water reminders',
          description: 'Morning, afternoon, evening',
        },
      ];
      break;

    case 'stress_eating_disruption':
      headline = 'Stress Changes Your Eating';
      subtitle = 'When stressed, you either skip meals or eat more—affecting energy next day';
      actions = [
        {
          icon: 'body-outline',
          text: 'Pause before eating',
          description: 'Am I hungry or stressed?',
        },
        {
          icon: 'nutrition-outline',
          text: 'Keep quick healthy snacks',
          description: 'For high-stress days',
        },
      ];
      break;

    default:
      headline = 'New Pattern Found';
      subtitle = expectedOutcome;
      actions = [
        {
          icon: 'analytics-outline',
          text: 'Learn more',
          description: 'See the evidence',
        },
      ];
  }

  return {
    type: 'SPEAK',
    headline,
    subtitle,
    actions,
    confidenceLabel: `Confidence: ${Math.round(correlation.confidence * 100)}%`,
    visual: {
      type: 'progress_indicator',
      value: correlation.confidence,
      label: 'Pattern strength',
    },
  };
}

function generateReinforceMessage(correlation, lifecycleStage) {
  const { expectedOutcome, affectedDomains, occurrences } = correlation;

  let headline = '';
  let subtitle = '';
  let actions = [];

  // Positive pattern reinforcement
  if (correlation.healthImpactSeverity === 'positive') {
    headline = 'Keep This Up!';
    subtitle = `Your ${affectedDomains[0]} stays strong when you ${extractBehavior(correlation.ruleName)}`;
    actions = [
      {
        icon: 'star',
        text: 'Keep the streak',
        description: "You're on the right track",
      },
    ];
  } else {
    // Negative pattern, reinforce avoidance
    headline = 'Remember The Pattern';
    subtitle = `${affectedDomains[0]} drops when ${extractBehavior(correlation.ruleName)} (${occurrences} times seen)`;
    actions = [
      {
        icon: 'flag-outline',
        text: 'Avoid the trigger',
        description: 'You know what works for you',
      },
    ];
  }

  return {
    type: 'REINFORCE',
    headline,
    subtitle,
    actions,
    visual: {
      type: 'badge',
      label: 'Pattern Confirmed',
    },
  };
}

function generatePredictMessage(correlation, lifecycleStage) {
  const { expectedOutcome, affectedDomains } = correlation;

  let headline = '';
  let subtitle = '';
  let actions = [];

  switch (lifecycleStage.stage) {
    case 'MASTER':
      headline = 'Anticipatory Insight';
      subtitle = `Based on your patterns: Tomorrow likely brings ${affectedDomains[0]} variations. Here's what helps...`;
      break;
    case 'CHAMPION':
    case 'ELITE':
      headline = 'Predictive Health Alert';
      subtitle = `Your 6+ month data shows: ${expectedOutcome}`;
      break;
  }

  actions = [
    {
      icon: 'sparkles',
      text: 'Prepare for tomorrow',
      description: 'Use what you know about yourself',
    },
  ];

  return {
    type: 'PREDICT',
    headline,
    subtitle,
    actions,
    visual: {
      type: 'sparkline',
      label: 'Predicted trend',
    },
  };
}

function generateSilentMessage() {
  return {
    type: 'SILENT',
    headline: 'You\'re Optimized',
    subtitle: 'Your health patterns are stable. Keep logging to discover new insights.',
    actions: [],
    visual: null,
  };
}

/**
 * Helper: Extract behavior description from rule name
 */
function extractBehavior(ruleName) {
  const behaviorMap = {
    high_nova_mood_crash: 'eating processed foods',
    dehydration_fatigue_mood: 'staying hydrated',
    stress_eating_disruption: 'eating consistently despite stress',
    late_heavy_meal_sleep_impact: 'eating lighter before bed',
    exercise_protein_energy_recovery: 'exercising with enough protein',
  };
  return behaviorMap[ruleName] || 'maintaining your routine';
}

/**
 * ============================================
 * DAILY ORCHESTRATION (Main Function)
 * ============================================
 */

/**
 * Run the daily orchestration pipeline for a user
 *
 * Called once per day per user (via cron or Lambda)
 */
export async function orchestrateDailyRecommendations(userId) {
  try {
    console.log(`[Orchestrator] Starting daily orchestration for user: ${userId}`);

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

    // Step 2: Fetch user's gamification/logging stats
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

    console.log(`[Orchestrator] User ${userId} stage: ${lifecycleStage.stage}`);

    // Step 4: Compute correlations (with graceful error handling for schema mismatches)
    let correlations = [];
    try {
      const correlationResult = await computeUserCorrelations(userId, {
        windowTypes: lifecycleStage.windowTypes,
      });

      // Save computed correlations
      for (const correlation of correlationResult.correlations) {
        try {
          await saveCorrelation(userId, correlation);
        } catch (saveErr) {
          console.warn(`[Orchestrator] Failed to save correlation: ${saveErr.message}`);
        }
      }

      // Step 5: Fetch all active correlations for this user
      correlations = await getUserCorrelations(userId, {
        minConfidence: lifecycleStage.minConfidence,
        limit: lifecycleStage.correlationsToShow + 2, // Get a few extra for decision logic
      });
    } catch (correlationError) {
      console.warn(`[Orchestrator] Correlation engine error (falling back to empty): ${correlationError.message}`);
      correlations = [];
    }

    console.log(`[Orchestrator] Found ${correlations.length} correlations for user ${userId}`);

    // Step 6: Make decision (Speak, Reinforce, Predict, Silent)
    const decision = decideRecommendationType(correlations, lifecycleStage, userMetrics);

    console.log(`[Orchestrator] Decision: ${decision.type} (${decision.reason})`);

    // Step 7: Generate message
    const message = generateMessage(decision, decision.correlation, lifecycleStage);

    // Step 8: Calculate stage progression
    // Single source of truth for stage durations
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

    // Calculate days in current stage and days to next
    let stageDaysStart = 0;
    for (let i = 0; i < currentIndex; i++) {
      stageDaysStart += STAGE_PROGRESSION[STAGE_ORDER[i]].duration;
    }
    const daysInCurrentStage = userMetrics.totalDaysWithLogs - stageDaysStart;
    const stageDuration = STAGE_PROGRESSION[lifecycleStage.stage].duration;
    const daysToNextStage = Math.max(0, stageDuration - daysInCurrentStage);

    // Step 9: Prepare output for dashboard (corrected schema)
    const output = {
      success: true,
      userId,

      // Decision envelope (what to show)
      decision: {
        type: decision.type,
        headline: message.headline,
        subtitle: message.subtitle,
        confidence: decision.correlation?.confidence || 0,
        confidenceLabel: getConfidenceLabel(decision.correlation?.confidence || 0),
        actions: message.actions,
        visualComponent: message.visual?.type,
      },

      // Supporting correlations
      correlations: correlations
        .slice(0, lifecycleStage.correlationsToShow)
        .map(c => ({
          id: c.id,
          pattern: c.ruleName,
          confidence: parseFloat(c.confidence),
          occurrences: c.occurrences,
          affectedDomains: c.affectedDomains,
          whatHappens: c.expectedOutcome,
          evidence: [],
        })),

      // User's journey
      lifecycle: {
        stage: lifecycleStage.stage,
        daysSinceStart: userMetrics.totalDaysWithLogs,
        daysInCurrentStage: Math.max(0, daysInCurrentStage),
        daysToNextStage: daysToNextStage,
      },

      // Learning readiness
      learningState: {
        canShowCorrelations: userMetrics.totalDaysWithLogs >= 10,
        canShowPredictions: userMetrics.totalDaysWithLogs >= 20,
      },

      timestamp: new Date().toISOString(),
    };

    console.log(`[Orchestrator] Daily orchestration complete for user ${userId}`);

    return output;
  } catch (error) {
    console.error(`[Orchestrator] Error during daily orchestration for user ${userId}:`, error);
    throw error;
  }
}

/**
 * ============================================
 * BATCH ORCHESTRATION (For All Users)
 * ============================================
 */

/**
 * Run daily orchestration for all active users
 * Called once per day via cron
 */
export async function orchestrateAllUsers(options = {}) {
  try {
    const { batchSize = 100, limit = null } = options;

    console.log('[Orchestrator] Starting batch orchestration for all users...');

    // Fetch all users (or limited set)
    let query = db.select().from(profilesTable);
    if (limit) {
      query = query.limit(limit);
    }

    const users = await query;

    console.log(`[Orchestrator] Processing ${users.length} users`);

    const results = [];
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(user => orchestrateDailyRecommendations(user.userId).catch(err => ({
          userId: user.userId,
          error: err.message,
        })))
      );
      results.push(...batchResults);

      console.log(`[Orchestrator] Completed ${Math.min(i + batchSize, users.length)}/${users.length} users`);
    }

    // Summary
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`[Orchestrator] Batch complete: ${successCount} succeeded, ${errorCount} failed`);

    return { successCount, errorCount, results };
  } catch (error) {
    console.error('[Orchestrator] Error during batch orchestration:', error);
    throw error;
  }
}

export default {
  determineLifecycleStage,
  decideRecommendationType,
  generateMessage,
  orchestrateDailyRecommendations,
  orchestrateAllUsers,
};
