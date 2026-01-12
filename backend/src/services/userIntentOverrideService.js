/**
 * User Intent Override Service
 *
 * Processes user feedback on recommendations and correlations:
 * - When user dismisses a pattern or recommendation
 * - When user explicitly marks something as helpful/not helpful
 * - When user corrects the system (e.g., "This isn't accurate for me")
 *
 * Stores intent overrides to:
 * 1. Adjust future recommendations
 * 2. Lower/raise confidence of affected correlations
 * 3. Feed the learning model
 * 4. Personalize decision-making
 */

import { db } from '../db/index.js';
import {
  userCorrelationsTable,
  recommendationsHistoryTable,
  insightFeedbackTable,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Intent override types
 * Maps user actions to backend adjustments
 */
const INTENT_OVERRIDE_TYPES = {
  USER_DISMISSED: {
    action: 'lower_confidence',
    adjustment: -0.2,
    description: 'User said "not relevant to me"',
  },
  TEMPORARY_DISMISS: {
    action: 'temporary_hide',
    adjustment: -0.1,
    revalidateAfterDays: 7,
    description: 'User said "just temporary situation"',
  },
  RESOLVED: {
    action: 'archive',
    adjustment: -0.05,
    revalidateAfterDays: 30,
    description: 'User said "already fixed it"',
  },
  DEACTIVATION: {
    action: 'permanent_hide',
    adjustment: 0, // No confidence change, just hide
    permanent: true,
    description: 'User said "don\'t want to see this again"',
  },
  HELPFUL_FEEDBACK: {
    action: 'raise_confidence',
    adjustment: +0.15,
    description: 'User marked recommendation as helpful',
  },
  NOT_HELPFUL_FEEDBACK: {
    action: 'lower_confidence',
    adjustment: -0.25,
    description: 'User marked recommendation as not helpful',
  },
  ACCURACY_CORRECTION: {
    action: 'lower_confidence',
    adjustment: -0.3,
    description: 'User said "this is inaccurate for me"',
  },
};

/**
 * Process user intent override (from DismissReasonSelector)
 *
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID being overridden
 * @param {string} overrideType - Type of override (from INTENT_OVERRIDE_TYPES)
 * @param {object} metadata - Additional context (e.g., userReason, timestamp)
 * @returns {Promise<object>} Result of override processing
 */
export async function processIntentOverride(userId, correlationId, overrideType, metadata = {}) {
  try {
    const override = INTENT_OVERRIDE_TYPES[overrideType];
    if (!override) {
      throw new Error(`Unknown override type: ${overrideType}`);
    }

    // 1. Fetch the correlation
    const correlation = await db
      .select()
      .from(userCorrelationsTable)
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          eq(userCorrelationsTable.id, correlationId)
        )
      )
      .then((rows) => rows[0]);

    if (!correlation) {
      throw new Error(`Correlation not found: ${correlationId}`);
    }

    // 2. Apply confidence adjustment
    const newConfidence = Math.max(
      0,
      Math.min(1, correlation.confidence + override.adjustment)
    );

    // 3. Update correlation with new confidence
    await db
      .update(userCorrelationsTable)
      .set({
        confidence: newConfidence,
        isArchived:
          override.action === 'archive' || override.action === 'permanent_hide',
        updatedAt: new Date(),
        // Store the override reason in metadata
        metadata: {
          ...(correlation.metadata || {}),
          lastOverride: {
            type: overrideType,
            reason: override.description,
            userFeedback: metadata.userReason || null,
            timestamp: new Date().toISOString(),
            adjustmentApplied: override.adjustment,
            newConfidence,
          },
          ...(override.revalidateAfterDays && {
            revalidateAt: new Date(
              Date.now() + override.revalidateAfterDays * 24 * 60 * 60 * 1000
            ).toISOString(),
          }),
        },
      })
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          eq(userCorrelationsTable.id, correlationId)
        )
      );

    // 4. Log feedback for audit trail
    await logOverrideFeedback(userId, correlationId, overrideType, override, metadata, newConfidence);

    // 5. Return impact summary
    return {
      success: true,
      correlationId,
      overrideType,
      previousConfidence: correlation.confidence,
      newConfidence,
      action: override.action,
      description: override.description,
      revalidateAfter: override.revalidateAfterDays ? `${override.revalidateAfterDays} days` : 'Never',
    };
  } catch (error) {
    console.error('Error processing intent override:', error);
    throw error;
  }
}

/**
 * Process recommendation feedback (helpful/not helpful/accurate/inaccurate)
 *
 * @param {string} userId - User ID
 * @param {number} recommendationId - Recommendation history ID
 * @param {string} feedbackType - Type of feedback
 * @param {object} metadata - Additional context
 * @returns {Promise<object>} Result of feedback processing
 */
export async function processRecommendationFeedback(
  userId,
  recommendationId,
  feedbackType,
  metadata = {}
) {
  try {
    const overrideType = feedbackType.toUpperCase();
    const override = INTENT_OVERRIDE_TYPES[overrideType];

    if (!override) {
      throw new Error(`Unknown feedback type: ${feedbackType}`);
    }

    // 1. Fetch recommendation
    const recommendation = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.id, recommendationId)
        )
      )
      .then((rows) => rows[0]);

    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    // 2. Update recommendation with feedback
    await db
      .update(recommendationsHistoryTable)
      .set({
        feedback: feedbackType,
        feedbackGivenAt: new Date(),
        metadata: {
          ...(recommendation.metadata || {}),
          feedback: {
            type: feedbackType,
            reason: metadata.reason || null,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.id, recommendationId)
        )
      );

    // 3. Find and adjust related correlations
    if (recommendation.correlationId) {
      await processIntentOverride(
        userId,
        recommendation.correlationId,
        overrideType,
        metadata
      );
    }

    // 4. Log to insight feedback table
    await db.insert(insightFeedbackTable).values({
      userId,
      itemId: recommendationId,
      itemType: 'recommendation',
      feedback: feedbackType,
      reason: metadata.reason || null,
      accuracy: metadata.accuracy || null,
      helpful: feedbackType === 'HELPFUL_FEEDBACK',
      createdAt: new Date(),
    });

    return {
      success: true,
      recommendationId,
      feedbackType,
      action: override.action,
      description: override.description,
    };
  } catch (error) {
    console.error('Error processing recommendation feedback:', error);
    throw error;
  }
}

/**
 * Get user's intent override history
 *
 * @param {string} userId - User ID
 * @param {number} limit - Number of recent overrides
 * @returns {Promise<Array>} User's recent overrides
 */
export async function getUserIntentOverrideHistory(userId, limit = 10) {
  try {
    const correlations = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.userId, userId))
      .orderBy(desc(userCorrelationsTable.updatedAt))
      .limit(limit);

    return correlations
      .filter((c) => c.metadata?.lastOverride)
      .map((c) => ({
        correlationId: c.id,
        pattern: c.pattern,
        ...c.metadata.lastOverride,
      }));
  } catch (error) {
    console.error('Error fetching intent override history:', error);
    return [];
  }
}

/**
 * Check if a correlation should be hidden based on intent overrides
 *
 * @param {object} correlation - Correlation object
 * @returns {boolean} True if should be hidden
 */
export function shouldHideCorrelation(correlation) {
  if (correlation.isArchived) {
    return true;
  }

  // Check if it's a temporary hide that should be revalidated
  const override = correlation.metadata?.lastOverride;
  if (override && override.type === 'TEMPORARY_DISMISS') {
    const revalidateAt = correlation.metadata?.revalidateAt;
    if (revalidateAt && new Date(revalidateAt) > new Date()) {
      return true;
    }
  }

  // Check if confidence has dropped below minimum threshold
  if (correlation.confidence < 0.3) {
    return true;
  }

  return false;
}

/**
 * Log override feedback for audit trail and learning
 */
async function logOverrideFeedback(
  userId,
  correlationId,
  overrideType,
  override,
  metadata,
  newConfidence
) {
  try {
    // Insert into insight_feedback table for audit trail
    await db.insert(insightFeedbackTable).values({
      userId,
      itemId: correlationId,
      itemType: 'correlation',
      feedback: overrideType,
      reason: metadata.userReason || null,
      helpful: overrideType === 'HELPFUL_FEEDBACK',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging override feedback:', error);
    // Don't throw - feedback logging shouldn't break the main flow
  }
}

/**
 * Get intent override statistics for user
 * (helps understand which correlations user finds relevant)
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Override statistics
 */
export async function getIntentOverrideStats(userId) {
  try {
    const correlations = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.userId, userId));

    const stats = {
      totalCorrelations: correlations.length,
      withOverrides: 0,
      byType: {},
      avgConfidenceShift: 0,
      hiddenCount: 0,
    };

    let totalShift = 0;
    let shiftCount = 0;

    correlations.forEach((c) => {
      if (c.metadata?.lastOverride) {
        stats.withOverrides++;
        const type = c.metadata.lastOverride.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        const shift = c.metadata.lastOverride.adjustmentApplied;
        totalShift += shift;
        shiftCount++;
      }

      if (shouldHideCorrelation(c)) {
        stats.hiddenCount++;
      }
    });

    stats.avgConfidenceShift = shiftCount > 0 ? totalShift / shiftCount : 0;

    return stats;
  } catch (error) {
    console.error('Error getting intent override stats:', error);
    return {};
  }
}
