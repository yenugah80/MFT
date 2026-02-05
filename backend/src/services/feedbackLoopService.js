/**
 * Feedback Loop System - Staff-Level Production System
 *
 * Features:
 * - Explicit feedback (likes, saves, dismisses)
 * - Implicit signals (view time, scroll depth, re-visits)
 * - Recommendation quality scoring
 * - Model retraining triggers
 * - User preference learning
 * - Collaborative filtering signals
 */

import { db } from '../config/db.js';
import { sql, and, eq, gte, desc } from 'drizzle-orm';
import {
  recommendationsHistoryTable,
  insightFeedbackTable,
  insightActionsTable,
  recommendationArmsTable,
} from '../db/schema.js';

// ============================================================================
// FEEDBACK TYPES & SCHEMAS
// ============================================================================

export const FeedbackTypes = {
  // Explicit Feedback
  LIKE: 'like',
  DISLIKE: 'dislike',
  SAVE: 'save',
  UNSAVE: 'unsave',
  DISMISS: 'dismiss',
  REPORT: 'report',

  // Implicit Signals
  VIEW: 'view',
  CLICK: 'click',
  HOVER: 'hover',
  SCROLL: 'scroll',
  SHARE: 'share',
  COMPLETE: 'complete',
  RETURN: 'return',
};

export const DismissReasons = {
  NOT_RELEVANT: 'not_relevant',
  ALREADY_EATEN: 'already_eaten',
  DONT_LIKE: 'dont_like',
  TOO_EXPENSIVE: 'too_expensive',
  NO_INGREDIENTS: 'no_ingredients',
  TOO_COMPLEX: 'too_complex',
  WRONG_TIME: 'wrong_time',
  DIETARY_RESTRICTION: 'dietary_restriction',
  OTHER: 'other',
};

export const ReportReasons = {
  INACCURATE_NUTRITION: 'inaccurate_nutrition',
  WRONG_FOOD: 'wrong_food',
  INAPPROPRIATE: 'inappropriate',
  HARMFUL_ADVICE: 'harmful_advice',
  SPAM: 'spam',
  OTHER: 'other',
};

// ============================================================================
// FEEDBACK COLLECTION
// ============================================================================

/**
 * Record explicit feedback (like, save, dismiss)
 */
export async function recordExplicitFeedback(userId, itemId, itemType, feedbackType, metadata = {}) {
  try {
    // Validate feedback type
    if (!Object.values(FeedbackTypes).includes(feedbackType)) {
      throw new Error(`Invalid feedback type: ${feedbackType}`);
    }

    const feedback = {
      userId,
      itemId,
      itemType, // 'recommendation', 'insight', 'food', 'achievement'
      feedbackType,
      metadata: JSON.stringify(metadata),
      createdAt: new Date(),
    };

    // Insert feedback record
    await db.execute(sql`
      INSERT INTO feedback_signals (
        user_id, item_id, item_type, feedback_type, metadata, created_at
      ) VALUES (
        ${userId}, ${itemId}, ${itemType}, ${feedbackType}, ${feedback.metadata}, ${feedback.createdAt}
      )
      ON CONFLICT (user_id, item_id, feedback_type)
      DO UPDATE SET metadata = ${feedback.metadata}, created_at = ${feedback.createdAt}
    `);

    // Update recommendation history if applicable
    if (itemType === 'recommendation') {
      await updateRecommendationFeedback(userId, itemId, feedbackType, metadata);
    }

    // Update insight feedback if applicable
    if (itemType === 'insight') {
      await updateInsightFeedback(userId, itemId, feedbackType, metadata);
    }

    // Calculate quality impact
    const qualityDelta = calculateQualityDelta(feedbackType, metadata);

    // Update Thompson Sampling arms for recommendation improvement
    if (itemType === 'recommendation') {
      await updateThompsonSamplingArms(userId, itemId, feedbackType);
    }

    // Check if retraining is needed
    await checkRetrainingTrigger(userId, itemType);

    return {
      success: true,
      feedbackId: `${userId}:${itemId}:${feedbackType}`,
      qualityDelta,
    };
  } catch (error) {
    console.error('[Feedback] Error recording feedback:', error.message);
    throw error;
  }
}

/**
 * Record implicit signal (view time, scroll, etc.)
 */
export async function recordImplicitSignal(userId, itemId, itemType, signalType, signalData = {}) {
  try {
    const signal = {
      userId,
      itemId,
      itemType,
      signalType,
      signalData: JSON.stringify(signalData),
      timestamp: new Date(),
    };

    // Batch insert for high-frequency signals
    await db.execute(sql`
      INSERT INTO implicit_signals (
        user_id, item_id, item_type, signal_type, signal_data, timestamp
      ) VALUES (
        ${userId}, ${itemId}, ${itemType}, ${signalType}, ${signal.signalData}, ${signal.timestamp}
      )
    `);

    // Process signal for learning
    await processImplicitSignal(userId, itemId, itemType, signalType, signalData);

    return { success: true };
  } catch (error) {
    console.error('[Feedback] Error recording implicit signal:', error.message);
    // Don't throw for implicit signals - they're not critical
    return { success: false, error: error.message };
  }
}

/**
 * Record view engagement metrics
 */
export async function recordViewEngagement(userId, itemId, itemType, engagement) {
  const { viewDurationMs, scrollDepth, interactionCount, exitAction } = engagement;

  // Calculate engagement score (0-1)
  const engagementScore = calculateEngagementScore(viewDurationMs, scrollDepth, interactionCount);

  await db.execute(sql`
    INSERT INTO view_engagement (
      user_id, item_id, item_type, view_duration_ms, scroll_depth,
      interaction_count, exit_action, engagement_score, created_at
    ) VALUES (
      ${userId}, ${itemId}, ${itemType}, ${viewDurationMs}, ${scrollDepth},
      ${interactionCount}, ${exitAction}, ${engagementScore}, NOW()
    )
  `);

  // Update recommendation if applicable
  if (itemType === 'recommendation' && viewDurationMs > 0) {
    await db.execute(sql`
      UPDATE recommendations_history
      SET viewed_at = COALESCE(viewed_at, NOW()),
          interaction_status = CASE
            WHEN interaction_status = 'shown' THEN 'viewed'
            ELSE interaction_status
          END
      WHERE recommendation_id = ${itemId}
    `);
  }

  return { engagementScore };
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

/**
 * Calculate quality delta from feedback
 */
function calculateQualityDelta(feedbackType, metadata) {
  const weights = {
    [FeedbackTypes.LIKE]: 1.0,
    [FeedbackTypes.SAVE]: 0.8,
    [FeedbackTypes.COMPLETE]: 1.2,
    [FeedbackTypes.CLICK]: 0.3,
    [FeedbackTypes.SHARE]: 1.0,
    [FeedbackTypes.DISLIKE]: -0.8,
    [FeedbackTypes.DISMISS]: -0.4,
    [FeedbackTypes.REPORT]: -1.5,
    [FeedbackTypes.VIEW]: 0.1,
    [FeedbackTypes.RETURN]: 0.5,
  };

  let delta = weights[feedbackType] || 0;

  // Adjust based on dismiss reason
  if (feedbackType === FeedbackTypes.DISMISS && metadata.reason) {
    const reasonWeights = {
      [DismissReasons.NOT_RELEVANT]: -0.6,
      [DismissReasons.DONT_LIKE]: -0.5,
      [DismissReasons.DIETARY_RESTRICTION]: -0.2, // Not the system's fault
      [DismissReasons.NO_INGREDIENTS]: -0.1,
      [DismissReasons.TOO_COMPLEX]: -0.3,
      [DismissReasons.ALREADY_EATEN]: 0, // Neutral
    };
    delta = reasonWeights[metadata.reason] ?? delta;
  }

  return delta;
}

/**
 * Calculate engagement score from view metrics
 */
function calculateEngagementScore(viewDurationMs, scrollDepth, interactionCount) {
  // Normalize each component (0-1)
  const durationScore = Math.min(viewDurationMs / 30000, 1); // Max at 30s
  const scrollScore = scrollDepth || 0;
  const interactionScore = Math.min(interactionCount / 5, 1); // Max at 5 interactions

  // Weighted average
  return (durationScore * 0.4 + scrollScore * 0.3 + interactionScore * 0.3);
}

/**
 * Calculate recommendation quality score
 */
export async function calculateRecommendationQuality(recommendationId) {
  const result = await db.execute(sql`
    WITH feedback AS (
      SELECT
        feedback_type,
        COUNT(*) as count
      FROM feedback_signals
      WHERE item_id = ${recommendationId}
        AND item_type = 'recommendation'
      GROUP BY feedback_type
    ),
    engagement AS (
      SELECT
        AVG(engagement_score) as avg_engagement,
        COUNT(*) as view_count
      FROM view_engagement
      WHERE item_id = ${recommendationId}
        AND item_type = 'recommendation'
    )
    SELECT
      COALESCE(SUM(CASE
        WHEN feedback_type = 'like' THEN count * 1.0
        WHEN feedback_type = 'save' THEN count * 0.8
        WHEN feedback_type = 'complete' THEN count * 1.2
        WHEN feedback_type = 'dislike' THEN count * -0.8
        WHEN feedback_type = 'dismiss' THEN count * -0.4
        ELSE 0
      END), 0) as feedback_score,
      e.avg_engagement,
      e.view_count
    FROM feedback f
    CROSS JOIN engagement e
    GROUP BY e.avg_engagement, e.view_count
  `);

  if (result.rows.length === 0) {
    return { quality_score: 0.5, confidence: 0 }; // Default neutral
  }

  const { feedback_score, avg_engagement, view_count } = result.rows[0];

  // Combine feedback and engagement
  const feedbackComponent = Math.tanh(feedback_score / 10) * 0.5 + 0.5; // Normalize to 0-1
  const engagementComponent = avg_engagement || 0.5;

  // Confidence based on sample size
  const confidence = Math.min(view_count / 100, 1);

  // Weighted combination
  const qualityScore = feedbackComponent * 0.6 + engagementComponent * 0.4;

  return {
    quality_score: qualityScore,
    feedback_component: feedbackComponent,
    engagement_component: engagementComponent,
    confidence,
    sample_size: view_count,
  };
}

// ============================================================================
// PREFERENCE LEARNING
// ============================================================================

/**
 * Learn user preferences from feedback history
 */
export async function learnUserPreferences(userId) {
  // Get recent feedback
  const feedback = await db.execute(sql`
    SELECT
      f.item_id,
      f.feedback_type,
      f.metadata,
      r.food_name,
      r.recommendation_type,
      r.calories,
      r.protein,
      r.carbs,
      r.fats
    FROM feedback_signals f
    LEFT JOIN recommendations_history r ON r.recommendation_id = f.item_id
    WHERE f.user_id = ${userId}
      AND f.item_type = 'recommendation'
      AND f.created_at > NOW() - INTERVAL '30 days'
    ORDER BY f.created_at DESC
    LIMIT 100
  `);

  if (feedback.rows.length < 10) {
    return { learned: false, reason: 'insufficient_data' };
  }

  // Extract patterns
  const preferences = {
    liked_types: {},
    disliked_types: {},
    calorie_range: { likes: [], dislikes: [] },
    protein_range: { likes: [], dislikes: [] },
    dismiss_patterns: {},
  };

  for (const row of feedback.rows) {
    const isPositive = [FeedbackTypes.LIKE, FeedbackTypes.SAVE, FeedbackTypes.COMPLETE].includes(row.feedback_type);
    const isNegative = [FeedbackTypes.DISLIKE, FeedbackTypes.DISMISS].includes(row.feedback_type);

    if (row.recommendation_type) {
      if (isPositive) {
        preferences.liked_types[row.recommendation_type] = (preferences.liked_types[row.recommendation_type] || 0) + 1;
      }
      if (isNegative) {
        preferences.disliked_types[row.recommendation_type] = (preferences.disliked_types[row.recommendation_type] || 0) + 1;
      }
    }

    if (row.calories) {
      if (isPositive) preferences.calorie_range.likes.push(row.calories);
      if (isNegative) preferences.calorie_range.dislikes.push(row.calories);
    }

    if (row.protein) {
      if (isPositive) preferences.protein_range.likes.push(row.protein);
      if (isNegative) preferences.protein_range.dislikes.push(row.protein);
    }

    if (row.feedback_type === FeedbackTypes.DISMISS && row.metadata) {
      try {
        const meta = JSON.parse(row.metadata);
        if (meta.reason) {
          preferences.dismiss_patterns[meta.reason] = (preferences.dismiss_patterns[meta.reason] || 0) + 1;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // Calculate preference scores
  const preferenceScores = {};

  // Type preferences
  for (const type of Object.keys({ ...preferences.liked_types, ...preferences.disliked_types })) {
    const likes = preferences.liked_types[type] || 0;
    const dislikes = preferences.disliked_types[type] || 0;
    preferenceScores[type] = (likes - dislikes) / (likes + dislikes);
  }

  // Calorie preference range
  if (preferences.calorie_range.likes.length > 0) {
    preferences.preferred_calorie_range = {
      min: Math.min(...preferences.calorie_range.likes) * 0.9,
      max: Math.max(...preferences.calorie_range.likes) * 1.1,
      avg: preferences.calorie_range.likes.reduce((a, b) => a + b, 0) / preferences.calorie_range.likes.length,
    };
  }

  // Store learned preferences
  await db.execute(sql`
    INSERT INTO user_learned_preferences (
      user_id, preference_type, preference_data, confidence, updated_at
    ) VALUES (
      ${userId}, 'recommendation_preferences', ${JSON.stringify(preferenceScores)},
      ${Math.min(feedback.rows.length / 50, 1)}, NOW()
    )
    ON CONFLICT (user_id, preference_type)
    DO UPDATE SET
      preference_data = ${JSON.stringify(preferenceScores)},
      confidence = ${Math.min(feedback.rows.length / 50, 1)},
      updated_at = NOW()
  `);

  return {
    learned: true,
    preference_scores: preferenceScores,
    sample_size: feedback.rows.length,
    confidence: Math.min(feedback.rows.length / 50, 1),
  };
}

// ============================================================================
// THOMPSON SAMPLING INTEGRATION
// ============================================================================

/**
 * Update Thompson Sampling arms based on feedback
 */
async function updateThompsonSamplingArms(userId, recommendationId, feedbackType) {
  try {
    // Get recommendation type
    const rec = await db.execute(sql`
      SELECT recommendation_type, meal_type
      FROM recommendations_history
      WHERE recommendation_id = ${recommendationId}
    `);

    if (rec.rows.length === 0) return;

    const { recommendation_type, meal_type } = rec.rows[0];
    const armKey = `${recommendation_type}:${meal_type || 'any'}`;

    // Determine success/failure
    const isSuccess = [FeedbackTypes.LIKE, FeedbackTypes.SAVE, FeedbackTypes.COMPLETE].includes(feedbackType);

    // Update arm
    if (isSuccess) {
      await db.execute(sql`
        UPDATE recommendation_arms
        SET
          alpha = alpha + 1,
          successes = successes + 1,
          trials = trials + 1,
          last_updated = NOW()
        WHERE user_id = ${userId} AND arm_key = ${armKey}
      `);
    } else {
      await db.execute(sql`
        UPDATE recommendation_arms
        SET
          beta = beta + 1,
          trials = trials + 1,
          last_updated = NOW()
        WHERE user_id = ${userId} AND arm_key = ${armKey}
      `);
    }
  } catch (error) {
    console.error('[Feedback] Error updating Thompson arms:', error.message);
  }
}

// ============================================================================
// RETRAINING TRIGGERS
// ============================================================================

/**
 * Check if model retraining should be triggered
 */
async function checkRetrainingTrigger(userId, itemType) {
  // Get recent feedback volume
  const result = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN feedback_type IN ('dislike', 'dismiss', 'report') THEN 1 ELSE 0 END) as negative
    FROM feedback_signals
    WHERE user_id = ${userId}
      AND item_type = ${itemType}
      AND created_at > NOW() - INTERVAL '24 hours'
  `);

  const { total, negative } = result.rows[0];

  // Trigger retraining if negative ratio is high
  if (total >= 10 && negative / total > 0.4) {
    console.log(`[Feedback] Retraining trigger for user ${userId}: ${negative}/${total} negative`);

    // Mark for retraining
    await db.execute(sql`
      INSERT INTO retraining_queue (
        user_id, trigger_reason, negative_ratio, sample_size, queued_at
      ) VALUES (
        ${userId}, 'high_negative_feedback', ${negative / total}, ${total}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        trigger_reason = 'high_negative_feedback',
        negative_ratio = ${negative / total},
        sample_size = ${total},
        queued_at = NOW()
    `);

    return true;
  }

  return false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update recommendation feedback status
 */
async function updateRecommendationFeedback(userId, itemId, feedbackType, metadata) {
  let status = 'viewed';
  if (feedbackType === FeedbackTypes.LIKE || feedbackType === FeedbackTypes.SAVE) {
    status = 'accepted';
  } else if (feedbackType === FeedbackTypes.DISMISS || feedbackType === FeedbackTypes.DISLIKE) {
    status = 'rejected';
  }

  await db.execute(sql`
    UPDATE recommendations_history
    SET
      interaction_status = ${status},
      interacted_at = NOW(),
      rejection_reason = ${metadata.reason || null}
    WHERE recommendation_id = ${itemId}
  `);
}

/**
 * Update insight feedback
 */
async function updateInsightFeedback(userId, itemId, feedbackType, metadata) {
  const wasHelpful = [FeedbackTypes.LIKE, FeedbackTypes.SAVE].includes(feedbackType);
  const dismissed = feedbackType === FeedbackTypes.DISMISS;

  await db.execute(sql`
    INSERT INTO insight_feedback (
      user_id, insight_type, insight_id, was_helpful, dismissed,
      dismiss_reason, accuracy_rating, updated_at
    ) VALUES (
      ${userId}, 'recommendation', ${itemId}, ${wasHelpful}, ${dismissed},
      ${metadata.reason || null}, ${metadata.rating || null}, NOW()
    )
    ON CONFLICT (user_id, insight_type, insight_id)
    DO UPDATE SET
      was_helpful = ${wasHelpful},
      dismissed = ${dismissed},
      dismiss_reason = ${metadata.reason || null},
      accuracy_rating = ${metadata.rating || null},
      updated_at = NOW()
  `);
}

/**
 * Process implicit signal for learning
 */
async function processImplicitSignal(userId, itemId, itemType, signalType, signalData) {
  // View signals - update view tracking
  if (signalType === FeedbackTypes.VIEW && itemType === 'recommendation') {
    await db.execute(sql`
      UPDATE recommendations_history
      SET viewed_at = COALESCE(viewed_at, NOW())
      WHERE recommendation_id = ${itemId}
    `);
  }

  // Return signals - strong positive indicator
  if (signalType === FeedbackTypes.RETURN) {
    // User came back to this item - positive signal
    await recordExplicitFeedback(userId, itemId, itemType, FeedbackTypes.RETURN, {
      implicit: true,
      return_count: signalData.return_count || 1,
    });
  }
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

/**
 * Get feedback analytics for a user
 */
export async function getUserFeedbackAnalytics(userId, days = 30) {
  const result = await db.execute(sql`
    SELECT
      item_type,
      feedback_type,
      COUNT(*) as count,
      DATE(created_at) as date
    FROM feedback_signals
    WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY item_type, feedback_type, DATE(created_at)
    ORDER BY date DESC
  `);

  return {
    user_id: userId,
    period_days: days,
    feedback_breakdown: result.rows,
  };
}

/**
 * Get global feedback trends
 */
export async function getGlobalFeedbackTrends(days = 7) {
  const result = await db.execute(sql`
    SELECT
      DATE(created_at) as date,
      item_type,
      feedback_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM feedback_signals
    WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY DATE(created_at), item_type, feedback_type
    ORDER BY date DESC, count DESC
  `);

  return {
    period_days: days,
    trends: result.rows,
  };
}

/**
 * Get saved items for a user
 */
export async function getSavedItems(userId, itemType = null, limit = 50) {
  const result = await db.execute(sql`
    SELECT
      f.item_id,
      f.item_type,
      f.created_at,
      r.food_name,
      r.recommendation_type,
      r.calories,
      r.protein,
      r.carbs,
      r.fats,
      r.reason
    FROM feedback_signals f
    LEFT JOIN recommendations_history r ON r.recommendation_id = f.item_id AND f.item_type = 'recommendation'
    WHERE f.user_id = ${userId}
      AND f.feedback_type = 'save'
      ${itemType ? sql`AND f.item_type = ${itemType}` : sql``}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `);

  return {
    user_id: userId,
    saved_items: result.rows,
    count: result.rows.length,
  };
}

export default {
  recordExplicitFeedback,
  recordImplicitSignal,
  recordViewEngagement,
  calculateRecommendationQuality,
  learnUserPreferences,
  getUserFeedbackAnalytics,
  getGlobalFeedbackTrends,
  getSavedItems,
  FeedbackTypes,
  DismissReasons,
  ReportReasons,
};
