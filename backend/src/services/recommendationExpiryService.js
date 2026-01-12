/**
 * Recommendation Expiry Service
 *
 * Manages the lifecycle of recommendations and correlations:
 * - Tracks when recommendations expire (24h for predictions, 7d for actions, etc.)
 * - Determines if a recommendation needs revalidation
 * - Handles different expiry strategies based on recommendation type
 * - Archives old recommendations to keep dashboard fresh
 *
 * Expiry Rules:
 * - SPEAK: 24 hours (immediate insights should be fresh)
 * - REINFORCE: 7 days (habits need longer validation)
 * - PREDICT: 3 days (predictions degrade quickly)
 * - SILENT: No expiry (implicit "good to go")
 * - Action-based: 7-30 days depending on action type
 * - Seasonal patterns: 30-60 days
 */

import { db } from '../db/index.js';
import {
  userCorrelationsTable,
  recommendationsHistoryTable,
} from '../db/schema.js';
import { eq, and, lt, desc } from 'drizzle-orm';

/**
 * Expiry configuration by recommendation type
 */
const EXPIRY_RULES = {
  SPEAK: {
    expiryDays: 1,
    category: 'immediate_insight',
    description: 'Daily insights expire after 1 day',
  },
  REINFORCE: {
    expiryDays: 7,
    category: 'behavioral_pattern',
    description: 'Behavioral reinforcements expire after 7 days',
  },
  PREDICT: {
    expiryDays: 3,
    category: 'predictive_insight',
    description: 'Predictions expire after 3 days',
  },
  SILENT: {
    expiryDays: Infinity, // Never expires
    category: 'implicit_ok',
    description: 'Silent approvals do not expire',
  },
  OBSERVATION: {
    expiryDays: 14,
    category: 'evidence',
    description: 'Observations expire after 14 days',
  },
  DEFICIENCY: {
    expiryDays: 30,
    category: 'nutritional',
    description: 'Deficiency recommendations expire after 30 days',
  },
  SEASONAL: {
    expiryDays: 60,
    category: 'seasonal',
    description: 'Seasonal patterns expire after 60 days',
  },
};

/**
 * Check if a recommendation has expired
 *
 * @param {object} recommendation - Recommendation object
 * @returns {boolean} True if recommendation has expired
 */
export function isExpired(recommendation) {
  if (!recommendation.createdAt) {
    return false;
  }

  const type = recommendation.type || 'SPEAK';
  const rule = EXPIRY_RULES[type] || EXPIRY_RULES.SPEAK;

  if (rule.expiryDays === Infinity) {
    return false; // Never expires
  }

  const expiryTime = new Date(recommendation.createdAt);
  expiryTime.setDate(expiryTime.getDate() + rule.expiryDays);

  return new Date() > expiryTime;
}

/**
 * Get days remaining until expiry
 *
 * @param {object} recommendation - Recommendation object
 * @returns {number} Days remaining (negative if already expired)
 */
export function getDaysUntilExpiry(recommendation) {
  if (!recommendation.createdAt) {
    return 0;
  }

  const type = recommendation.type || 'SPEAK';
  const rule = EXPIRY_RULES[type] || EXPIRY_RULES.SPEAK;

  if (rule.expiryDays === Infinity) {
    return 999; // Effectively never
  }

  const expiryTime = new Date(recommendation.createdAt);
  expiryTime.setDate(expiryTime.getDate() + rule.expiryDays);

  const now = new Date();
  const daysRemaining = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return Math.ceil(daysRemaining);
}

/**
 * Fetch expired recommendations for a user
 *
 * @param {string} userId - User ID
 * @param {number} limit - Max recommendations to return
 * @returns {Promise<Array>} Expired recommendations
 */
export async function getExpiredRecommendations(userId, limit = 50) {
  try {
    const allRecommendations = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.isArchived, false)
        )
      )
      .orderBy(desc(recommendationsHistoryTable.createdAt))
      .limit(limit * 2); // Fetch more to account for filtering

    return allRecommendations.filter((r) => isExpired(r)).slice(0, limit);
  } catch (error) {
    console.error('Error fetching expired recommendations:', error);
    return [];
  }
}

/**
 * Archive expired recommendations
 * (Remove from active feed, keep in history)
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Archival result
 */
export async function archiveExpiredRecommendations(userId) {
  try {
    const expired = await getExpiredRecommendations(userId, 100);

    if (expired.length === 0) {
      return { archived: 0, message: 'No expired recommendations to archive' };
    }

    // Archive each expired recommendation
    const archivalPromises = expired.map((rec) =>
      db
        .update(recommendationsHistoryTable)
        .set({
          isArchived: true,
          archivedAt: new Date(),
        })
        .where(
          and(
            eq(recommendationsHistoryTable.userId, userId),
            eq(recommendationsHistoryTable.id, rec.id)
          )
        )
    );

    await Promise.all(archivalPromises);

    return {
      archived: expired.length,
      message: `Archived ${expired.length} expired recommendations`,
    };
  } catch (error) {
    console.error('Error archiving expired recommendations:', error);
    return { archived: 0, error: error.message };
  }
}

/**
 * Check if a correlation needs revalidation
 * (after being dismissed or marked inaccurate)
 *
 * @param {object} correlation - Correlation object
 * @returns {boolean} True if should be revalidated
 */
export function needsRevalidation(correlation) {
  const override = correlation.metadata?.lastOverride;
  if (!override) {
    return false; // No override = no revalidation needed
  }

  // Check if revalidation was scheduled
  const revalidateAt = correlation.metadata?.revalidateAt;
  if (!revalidateAt) {
    return false; // No scheduled revalidation
  }

  // Check if revalidation time has passed
  return new Date() > new Date(revalidateAt);
}

/**
 * Get correlations that need revalidation
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Correlations needing revalidation
 */
export async function getCorrelationsNeedingRevalidation(userId) {
  try {
    const allCorrelations = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.userId, userId));

    return allCorrelations.filter((c) => needsRevalidation(c));
  } catch (error) {
    console.error('Error fetching correlations needing revalidation:', error);
    return [];
  }
}

/**
 * Revalidate a correlation
 * (Unhide it and reset confidence)
 *
 * @param {string} userId - User ID
 * @param {number} correlationId - Correlation ID
 * @returns {Promise<object>} Revalidation result
 */
export async function revalidateCorrelation(userId, correlationId) {
  try {
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

    // Reset override metadata
    const updatedMetadata = {
      ...correlation.metadata,
      lastOverride: {
        ...correlation.metadata?.lastOverride,
        revalidatedAt: new Date().toISOString(),
        revalidatedConfidence: correlation.confidence,
      },
    };

    // Unhide correlation
    await db
      .update(userCorrelationsTable)
      .set({
        isArchived: false,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          eq(userCorrelationsTable.id, correlationId)
        )
      );

    return {
      success: true,
      correlationId,
      message: 'Correlation revalidated and unhidden',
      confidence: correlation.confidence,
    };
  } catch (error) {
    console.error('Error revalidating correlation:', error);
    throw error;
  }
}

/**
 * Get expiry stats for user
 * (Shows how many recommendations are expiring soon)
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} Expiry statistics
 */
export async function getExpiryStats(userId) {
  try {
    const recommendations = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.isArchived, false)
        )
      );

    const stats = {
      total: recommendations.length,
      expired: 0,
      expiringToday: 0,
      expiringThisWeek: 0,
      byType: {},
      correlationsNeedingRevalidation: 0,
    };

    recommendations.forEach((rec) => {
      const daysRemaining = getDaysUntilExpiry(rec);
      if (daysRemaining < 0) {
        stats.expired++;
      } else if (daysRemaining === 0) {
        stats.expiringToday++;
      } else if (daysRemaining <= 7) {
        stats.expiringThisWeek++;
      }

      const type = rec.type || 'SPEAK';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting expiry stats:', error);
    return { total: 0 };
  }
}

/**
 * Clean up old recommendations
 * (Delete recommendations older than 90 days)
 *
 * @param {string} userId - User ID
 * @param {number} daysOld - Age threshold for deletion
 * @returns {Promise<object>} Cleanup result
 */
export async function cleanupOldRecommendations(userId, daysOld = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // For soft delete, just mark as archived
    // For hard delete, can add a deleteAt field
    await db
      .update(recommendationsHistoryTable)
      .set({
        isArchived: true,
        archivedAt: new Date(),
      })
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          lt(recommendationsHistoryTable.createdAt, cutoffDate),
          eq(recommendationsHistoryTable.isArchived, false)
        )
      );

    return {
      success: true,
      message: `Cleaned up recommendations older than ${daysOld} days`,
    };
  } catch (error) {
    console.error('Error cleaning up old recommendations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get human-readable expiry message
 *
 * @param {object} recommendation - Recommendation object
 * @returns {string} Human-readable expiry message
 */
export function getExpiryMessage(recommendation) {
  const daysRemaining = getDaysUntilExpiry(recommendation);

  if (daysRemaining < 0) {
    return `Expired ${Math.abs(daysRemaining)} days ago`;
  }
  if (daysRemaining === 0) {
    return 'Expires today';
  }
  if (daysRemaining === 1) {
    return 'Expires tomorrow';
  }
  if (daysRemaining <= 7) {
    return `Expires in ${daysRemaining} days`;
  }

  return `Expires in ${Math.ceil(daysRemaining / 7)} weeks`;
}
