/**
 * Learning State Service
 *
 * Manages the user's learning progression:
 * 1. Profile-based initialization (bootstrap learning state on signup)
 * 2. History-based bootstrapping (learn patterns from historical logs)
 * 3. Feedback-driven updates (refine learning from user corrections)
 *
 * Learning State Lifecycle:
 * - NEW_USER: Just onboarded, minimal learning
 * - INITIALIZING: Collecting first week of data
 * - LEARNING: Active pattern discovery (2-30 days)
 * - MATURE: Stable patterns established (30+ days)
 *
 * Tracks evidence across dimensions:
 * - Observations: Raw data points (logs)
 * - Correlations: Derived patterns
 * - Feedback: User corrections
 * - Confidence: Based on evidence quantity and consistency
 */

import { db } from '../db/index.js';
import {
  profilesTable,
  foodLogTable,
  moodLogTable,
  waterLogTable,
  userCorrelationsTable,
  correlationEvidenceTable,
  gamificationTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

/**
 * Learning stages mapped to user lifecycle
 */
const LEARNING_STAGES = {
  NEW_USER: {
    daysRange: [0, 1],
    stage: 'DISCOVERER',
    description: 'Just onboarded, exploring features',
    minObservations: 0,
    correlationsToShow: 0,
    learningStrategy: 'collect_baseline',
  },
  INITIALIZING: {
    daysRange: [2, 7],
    stage: 'BUILDER',
    description: 'First week, building logging habits',
    minObservations: 3,
    correlationsToShow: 0,
    learningStrategy: 'passive_collection',
  },
  LEARNING: {
    daysRange: [8, 30],
    stage: 'TRACKER',
    description: 'Active pattern discovery period',
    minObservations: 10,
    correlationsToShow: 2,
    learningStrategy: 'active_discovery',
  },
  MATURE: {
    daysRange: [31, 90],
    stage: 'OPTIMIZER',
    description: 'Stable patterns, optimization phase',
    minObservations: 20,
    correlationsToShow: 5,
    learningStrategy: 'refinement',
  },
  EXPERT: {
    daysRange: [91, Infinity],
    stage: 'MASTER',
    description: 'Long-term patterns established',
    minObservations: 50,
    correlationsToShow: 10,
    learningStrategy: 'predictive',
  },
};

/**
 * Initialize learning state on user signup
 *
 * @param {string} userId - User ID
 * @param {object} profile - User profile data
 * @returns {Promise<object>} Initial learning state
 */
export async function initializeLearningState(userId, profile = {}) {
  try {
    // 1. Get or create gamification record (tracks day count)
    const gamification = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .then((rows) => rows[0]);

    if (!gamification) {
      // Create new gamification record for this user
      await db.insert(gamificationTable).values({
        userId,
        xp: 0,
        level: 1,
        streak: 0,
        badgesEarned: [],
        milestones: [],
      });
    }

    // 2. Determine initial learning state based on profile
    const initialState = {
      userId,
      createdAt: new Date(),
      stage: LEARNING_STAGES.NEW_USER.stage,
      learningStage: 'NEW_USER',
      daysSinceStart: 0,
      observations: {
        food: 0,
        mood: 0,
        water: 0,
        total: 0,
      },
      correlations: {
        discovered: 0,
        validated: 0,
        active: 0,
      },
      profileBootstrap: {
        age: profile.age || null,
        activityLevel: profile.activityLevel || null,
        region: profile.region || null,
        hasProfileData: Boolean(profile.age || profile.activityLevel),
      },
      feedback: {
        overrides: 0,
        corrections: 0,
      },
    };

    return initialState;
  } catch (error) {
    console.error('Error initializing learning state:', error);
    throw error;
  }
}

/**
 * Bootstrap learning from historical data
 * (Called when user imports data or has existing logs)
 *
 * @param {string} userId - User ID
 * @param {number} fromDaysAgo - Optionally, bootstrap from specific date
 * @returns {Promise<object>} Bootstrapped learning state with evidence
 */
export async function bootstrapLearningFromHistory(userId, fromDaysAgo = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - fromDaysAgo);

    // 1. Count observations by type
    const foodLogs = await db
      .select({ count: sql`count(*)` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.logDate, cutoffDate)
        )
      )
      .then((rows) => rows[0]?.count || 0);

    const moodLogs = await db
      .select({ count: sql`count(*)` })
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.logDate, cutoffDate)
        )
      )
      .then((rows) => rows[0]?.count || 0);

    const waterLogs = await db
      .select({ count: sql`count(*)` })
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.logDate, cutoffDate)
        )
      )
      .then((rows) => rows[0]?.count || 0);

    // 2. Fetch existing correlations
    const correlations = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.userId, userId));

    // 3. Count evidence
    const evidence = await db
      .select({ count: sql`count(*)` })
      .from(correlationEvidenceTable)
      .where(
        and(
          eq(correlationEvidenceTable.userId, userId),
          gte(correlationEvidenceTable.timestamp, cutoffDate)
        )
      )
      .then((rows) => rows[0]?.count || 0);

    // 4. Determine learning stage based on observation count
    const totalObservations = foodLogs + moodLogs + waterLogs;
    const learningStage = determineLearningStage(totalObservations);

    const bootstrappedState = {
      userId,
      bootstrappedAt: new Date(),
      observations: {
        food: foodLogs,
        mood: moodLogs,
        water: waterLogs,
        total: totalObservations,
      },
      correlations: {
        discovered: correlations.length,
        validated: correlations.filter((c) => c.confidence >= 0.6).length,
        active: correlations.filter((c) => !c.isArchived).length,
      },
      evidence: {
        total: evidence,
        avgPerCorrelation: correlations.length > 0 ? evidence / correlations.length : 0,
      },
      stage: LEARNING_STAGES[learningStage]?.stage || 'DISCOVERER',
      learningStage,
      strategy: LEARNING_STAGES[learningStage]?.learningStrategy || 'collect_baseline',
      readiness: {
        canShowCorrelations: totalObservations >= LEARNING_STAGES[learningStage]?.minObservations,
        minObservationsNeeded: LEARNING_STAGES[learningStage]?.minObservations || 0,
      },
    };

    return bootstrappedState;
  } catch (error) {
    console.error('Error bootstrapping learning from history:', error);
    throw error;
  }
}

/**
 * Determine learning stage based on observation count
 *
 * @param {number} observationCount - Total observations
 * @returns {string} Learning stage key
 */
function determineLearningStage(observationCount) {
  if (observationCount === 0) return 'NEW_USER';
  if (observationCount < 3) return 'INITIALIZING';
  if (observationCount < 10) return 'LEARNING';
  if (observationCount < 50) return 'MATURE';
  return 'EXPERT';
}

/**
 * Update learning state based on new feedback
 *
 * @param {string} userId - User ID
 * @param {string} feedbackType - Type of feedback (correction, validation, dismissal)
 * @param {object} metadata - Feedback metadata
 * @returns {Promise<object>} Updated learning state
 */
export async function updateLearningFromFeedback(userId, feedbackType, metadata = {}) {
  try {
    // Get current correlation count
    const correlations = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.userId, userId));

    // Get observation count for learning stage calculation
    const gamification = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .then((rows) => rows[0]);

    // Estimate days since start from streak + other metrics
    const daysSinceStart = gamification?.dayOfWeek || 0;

    // Fetch current logs to count observations
    const foodLogs = await db
      .select({ count: sql`count(*)` })
      .from(foodLogTable)
      .where(eq(foodLogTable.userId, userId))
      .then((rows) => rows[0]?.count || 0);

    const totalObservations = foodLogs; // Simplified - would also count mood, water

    const learningStage = determineLearningStage(totalObservations);

    const feedbackUpdate = {
      type: feedbackType,
      correlationId: metadata.correlationId || null,
      reason: metadata.reason || null,
      timestamp: new Date(),
    };

    return {
      userId,
      learningStage,
      stage: LEARNING_STAGES[learningStage]?.stage,
      daysSinceStart,
      observations: totalObservations,
      correlations: correlations.length,
      lastFeedback: feedbackUpdate,
      confidenceGrowth: calculateConfidenceGrowth(correlations),
    };
  } catch (error) {
    console.error('Error updating learning from feedback:', error);
    throw error;
  }
}

/**
 * Calculate user's confidence growth
 * (Measures learning velocity)
 *
 * @param {Array} correlations - User's correlations
 * @returns {number} Average confidence 0-1
 */
function calculateConfidenceGrowth(correlations) {
  if (correlations.length === 0) return 0;

  const avgConfidence =
    correlations.reduce((sum, c) => sum + c.confidence, 0) / correlations.length;

  return Math.min(1, avgConfidence);
}

/**
 * Get learning readiness assessment
 * (Determines if user has enough data for specific features)
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Readiness report
 */
export async function getLearningReadiness(userId) {
  try {
    const bootstrapped = await bootstrapLearningFromHistory(userId, 365);

    const readiness = {
      userId,
      assessmentDate: new Date(),
      learningStage: bootstrapped.learningStage,
      stage: bootstrapped.stage,
      readyFor: {
        correlations: bootstrapped.observations.total >= 10,
        predictions: bootstrapped.observations.total >= 20,
        lifecycle: bootstrapped.observations.total >= 30,
        goals: bootstrapped.observations.total >= 5,
      },
      observationsProgress: {
        total: bootstrapped.observations.total,
        food: bootstrapped.observations.food,
        mood: bootstrapped.observations.mood,
        water: bootstrapped.observations.water,
      },
      correlationQuality: {
        discovered: bootstrapped.correlations.discovered,
        validated: bootstrapped.correlations.validated,
        confidenceMetric: bootstrapped.evidence.avgPerCorrelation,
      },
      nextMilestone: getNextLearningMilestone(bootstrapped.observations.total),
      recommendedActions: getRecommendedLearningActions(bootstrapped),
    };

    return readiness;
  } catch (error) {
    console.error('Error getting learning readiness:', error);
    throw error;
  }
}

/**
 * Get next learning milestone
 *
 * @param {number} observations - Current observation count
 * @returns {object} Next milestone
 */
function getNextLearningMilestone(observations) {
  const milestones = [
    { threshold: 1, name: 'First Log', description: 'You logged something' },
    { threshold: 3, name: 'Habit Started', description: 'Three days of logging' },
    { threshold: 7, name: 'Week Complete', description: 'A full week of tracking' },
    { threshold: 14, name: 'Two Weeks', description: 'Two weeks of data' },
    { threshold: 30, name: 'Month Strong', description: 'One month of patterns' },
    { threshold: 90, name: 'Three Months', description: 'Deep pattern understanding' },
    { threshold: 365, name: 'Year Strong', description: 'Full year of learning' },
  ];

  const next = milestones.find((m) => m.threshold > observations);
  if (!next) {
    return { threshold: 365, name: 'Forever Learning', description: 'Keep building' };
  }

  return {
    ...next,
    progress: (observations / next.threshold) * 100,
    remaining: next.threshold - observations,
  };
}

/**
 * Get recommended actions based on learning state
 *
 * @param {object} learningState - Learning state object
 * @returns {Array} Recommended actions
 */
function getRecommendedLearningActions(learningState) {
  const actions = [];

  // Encourage logging based on stage
  if (learningState.observations.total < 7) {
    actions.push({
      priority: 'high',
      action: 'Continue logging',
      reason: 'You need more data for accurate patterns',
    });
  }

  // Log missing dimensions
  if (learningState.observations.mood === 0) {
    actions.push({
      priority: 'medium',
      action: 'Start logging mood',
      reason: 'Mood patterns unlock personalized insights',
    });
  }

  if (learningState.observations.water === 0) {
    actions.push({
      priority: 'medium',
      action: 'Start logging water',
      reason: 'Hydration patterns correlate with energy',
    });
  }

  // Validate found patterns
  if (
    learningState.correlations.discovered > 0 &&
    learningState.observations.total >= 20
  ) {
    actions.push({
      priority: 'high',
      action: 'Review discovered patterns',
      reason: 'You have enough data to see initial patterns',
    });
  }

  return actions;
}

/**
 * Get learning state summary for dashboard
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Learning summary
 */
export async function getLearningStateSummary(userId) {
  try {
    const bootstrapped = await bootstrapLearningFromHistory(userId, 365);
    const readiness = await getLearningReadiness(userId);

    return {
      userId,
      stage: bootstrapped.stage,
      learningStage: bootstrapped.learningStage,
      daysActive: Math.floor(bootstrapped.evidence.total / 10) || 0, // Rough estimate
      dataQuality: {
        observations: bootstrapped.observations.total,
        correlations: bootstrapped.correlations.active,
        avgConfidence: calculateConfidenceGrowth(
          await db
            .select()
            .from(userCorrelationsTable)
            .where(eq(userCorrelationsTable.userId, userId))
        ),
      },
      readinessMilestone: readiness.nextMilestone,
      nextAction: readiness.recommendedActions[0] || null,
    };
  } catch (error) {
    console.error('Error getting learning summary:', error);
    throw error;
  }
}
