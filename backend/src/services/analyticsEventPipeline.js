/**
 * Analytics Event Pipeline - Staff-Level Production System
 *
 * Features:
 * - Standardized event schema with validation
 * - Real-time aggregation with sliding windows
 * - Batch processing with backpressure
 * - Event enrichment with user context
 * - Anomaly detection for metrics
 * - Funnel analysis support
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// In-memory cache for real-time aggregations
const aggregationCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const anomalyCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

// ============================================================================
// EVENT SCHEMA DEFINITIONS
// ============================================================================

export const EventCategories = {
  ENGAGEMENT: 'engagement',
  GAMIFICATION: 'gamification',
  RECOMMENDATION: 'recommendation',
  HEALTH: 'health',
  ONBOARDING: 'onboarding',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  NOTIFICATION: 'notification',
  FEEDBACK: 'feedback',
  CONVERSION: 'conversion',
};

export const EventSchemas = {
  // Engagement Events
  session_start: {
    category: EventCategories.ENGAGEMENT,
    requiredProps: ['session_id'],
    optionalProps: ['referrer', 'entry_point', 'utm_source', 'utm_campaign'],
  },
  session_end: {
    category: EventCategories.ENGAGEMENT,
    requiredProps: ['session_id', 'duration_seconds'],
    optionalProps: ['screens_viewed', 'actions_taken'],
  },
  screen_view: {
    category: EventCategories.ENGAGEMENT,
    requiredProps: ['screen_name'],
    optionalProps: ['previous_screen', 'time_on_screen_ms'],
  },
  feature_used: {
    category: EventCategories.ENGAGEMENT,
    requiredProps: ['feature_name'],
    optionalProps: ['feature_variant', 'time_to_use_ms'],
  },

  // Gamification Events
  xp_earned: {
    category: EventCategories.GAMIFICATION,
    requiredProps: ['amount', 'source'],
    optionalProps: ['multiplier', 'streak_bonus'],
  },
  level_up: {
    category: EventCategories.GAMIFICATION,
    requiredProps: ['new_level', 'previous_level'],
    optionalProps: ['total_xp', 'days_to_level'],
  },
  achievement_unlocked: {
    category: EventCategories.GAMIFICATION,
    requiredProps: ['achievement_id', 'achievement_name'],
    optionalProps: ['xp_reward', 'rarity'],
  },
  streak_updated: {
    category: EventCategories.GAMIFICATION,
    requiredProps: ['streak_days', 'action'],
    optionalProps: ['previous_streak', 'freeze_used'],
  },

  // Recommendation Events
  recommendation_shown: {
    category: EventCategories.RECOMMENDATION,
    requiredProps: ['recommendation_id', 'recommendation_type'],
    optionalProps: ['position', 'personalization_score', 'context'],
  },
  recommendation_clicked: {
    category: EventCategories.RECOMMENDATION,
    requiredProps: ['recommendation_id', 'recommendation_type'],
    optionalProps: ['time_to_click_ms', 'position'],
  },
  recommendation_accepted: {
    category: EventCategories.RECOMMENDATION,
    requiredProps: ['recommendation_id', 'recommendation_type'],
    optionalProps: ['modified', 'portion_adjusted'],
  },
  recommendation_dismissed: {
    category: EventCategories.RECOMMENDATION,
    requiredProps: ['recommendation_id', 'recommendation_type'],
    optionalProps: ['dismiss_reason', 'time_shown_ms'],
  },
  recommendation_feedback: {
    category: EventCategories.FEEDBACK,
    requiredProps: ['recommendation_id', 'feedback_type'],
    optionalProps: ['rating', 'comment', 'improvement_suggestion'],
  },

  // Health Events
  food_logged: {
    category: EventCategories.HEALTH,
    requiredProps: ['log_method', 'meal_type'],
    optionalProps: ['calories', 'macros', 'time_to_log_ms', 'ai_assisted'],
  },
  water_logged: {
    category: EventCategories.HEALTH,
    requiredProps: ['amount_ml', 'beverage_type'],
    optionalProps: ['goal_progress_percent'],
  },
  mood_logged: {
    category: EventCategories.HEALTH,
    requiredProps: ['mood', 'intensity'],
    optionalProps: ['tags', 'note_added'],
  },
  activity_logged: {
    category: EventCategories.HEALTH,
    requiredProps: ['activity_type', 'duration_minutes'],
    optionalProps: ['calories_burned', 'intensity'],
  },

  // Notification Events
  notification_sent: {
    category: EventCategories.NOTIFICATION,
    requiredProps: ['notification_type', 'channel'],
    optionalProps: ['priority', 'scheduled_time'],
  },
  notification_received: {
    category: EventCategories.NOTIFICATION,
    requiredProps: ['notification_type'],
    optionalProps: ['latency_ms', 'in_foreground'],
  },
  notification_clicked: {
    category: EventCategories.NOTIFICATION,
    requiredProps: ['notification_type'],
    optionalProps: ['time_to_click_seconds', 'action_taken'],
  },
  notification_dismissed: {
    category: EventCategories.NOTIFICATION,
    requiredProps: ['notification_type'],
    optionalProps: ['dismiss_reason', 'snoozed_until'],
  },

  // Performance Events
  api_latency: {
    category: EventCategories.PERFORMANCE,
    requiredProps: ['endpoint', 'latency_ms', 'status_code'],
    optionalProps: ['cache_hit', 'payload_size_bytes'],
  },
  render_time: {
    category: EventCategories.PERFORMANCE,
    requiredProps: ['component', 'render_ms'],
    optionalProps: ['re_render_count', 'data_size'],
  },
  cache_operation: {
    category: EventCategories.PERFORMANCE,
    requiredProps: ['operation', 'cache_type', 'hit'],
    optionalProps: ['key_pattern', 'ttl_remaining'],
  },

  // Error Events
  error_occurred: {
    category: EventCategories.ERROR,
    requiredProps: ['error_type', 'error_message'],
    optionalProps: ['stack_trace', 'component', 'user_action'],
  },
  api_error: {
    category: EventCategories.ERROR,
    requiredProps: ['endpoint', 'status_code', 'error_message'],
    optionalProps: ['request_id', 'retry_count'],
  },

  // Conversion Events
  trial_started: {
    category: EventCategories.CONVERSION,
    requiredProps: ['trial_type'],
    optionalProps: ['referrer', 'onboarding_variant'],
  },
  subscription_started: {
    category: EventCategories.CONVERSION,
    requiredProps: ['plan_type', 'billing_period'],
    optionalProps: ['discount_code', 'trial_converted'],
  },
  goal_achieved: {
    category: EventCategories.CONVERSION,
    requiredProps: ['goal_type'],
    optionalProps: ['days_to_achieve', 'streak_at_achievement'],
  },
};

// ============================================================================
// EVENT VALIDATION & ENRICHMENT
// ============================================================================

/**
 * Validate event against schema
 */
function validateEvent(eventName, properties) {
  const schema = EventSchemas[eventName];
  if (!schema) {
    // Unknown event - allow but flag
    return { valid: true, warnings: ['unknown_event_type'] };
  }

  const errors = [];
  const warnings = [];

  // Check required properties
  for (const prop of schema.requiredProps) {
    if (properties[prop] === undefined || properties[prop] === null) {
      errors.push(`missing_required_property:${prop}`);
    }
  }

  // Check for unknown properties
  const knownProps = [...schema.requiredProps, ...schema.optionalProps];
  const unknownProps = Object.keys(properties).filter(
    p => !knownProps.includes(p) && !['user_id', 'session_id', 'timestamp', 'device'].includes(p)
  );
  if (unknownProps.length > 0) {
    warnings.push(`unknown_properties:${unknownProps.join(',')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    category: schema.category,
  };
}

/**
 * Enrich event with additional context
 */
async function enrichEvent(event, userId) {
  const enriched = { ...event };

  // Add server timestamp
  enriched.server_timestamp = new Date().toISOString();

  // Add user context if available
  if (userId) {
    try {
      const userContext = await getUserContext(userId);
      enriched.user_context = userContext;
    } catch (e) {
      // Continue without enrichment
    }
  }

  // Add event metadata
  enriched.event_metadata = {
    pipeline_version: '2.0',
    processed_at: Date.now(),
  };

  return enriched;
}

/**
 * Get user context for enrichment
 */
async function getUserContext(userId) {
  const cacheKey = `user_context:${userId}`;
  const cached = aggregationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await db.execute(sql`
      SELECT
        g.level,
        g.streak,
        g.xp,
        p.is_premium,
        p.premium_tier,
        EXTRACT(DAY FROM NOW() - p.created_at) as days_since_signup
      FROM profiles p
      LEFT JOIN gamification g ON g.user_id = p.user_id
      WHERE p.user_id = ${userId}
    `);

    if (result.rows.length > 0) {
      const context = {
        level: result.rows[0].level || 1,
        streak: result.rows[0].streak || 0,
        is_premium: result.rows[0].is_premium || false,
        premium_tier: result.rows[0].premium_tier || 'free',
        days_since_signup: Math.floor(result.rows[0].days_since_signup || 0),
        user_segment: getUserSegment(result.rows[0]),
      };
      aggregationCache.set(cacheKey, context, 300);
      return context;
    }
  } catch (e) {
    console.error('[Analytics] Failed to get user context:', e.message);
  }

  return null;
}

/**
 * Determine user segment based on attributes
 */
function getUserSegment(userData) {
  if (!userData) return 'unknown';

  const { level, streak, is_premium, days_since_signup } = userData;

  if (is_premium) return 'premium';
  if (level >= 10 && streak >= 7) return 'power_user';
  if (days_since_signup <= 7) return 'new_user';
  if (streak === 0 && days_since_signup > 14) return 'at_risk';
  return 'regular';
}

// ============================================================================
// REAL-TIME AGGREGATION
// ============================================================================

/**
 * Update real-time aggregations for an event
 */
async function updateRealTimeAggregations(event, userId) {
  const eventName = event.event;
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

  // Increment event counters
  const hourCountKey = `event_count:${eventName}:${hourKey}`;
  const dayCountKey = `event_count:${eventName}:${dayKey}`;

  aggregationCache.set(hourCountKey, (aggregationCache.get(hourCountKey) || 0) + 1, 3600);
  aggregationCache.set(dayCountKey, (aggregationCache.get(dayCountKey) || 0) + 1, 86400);

  // Track unique users
  if (userId) {
    const dauKey = `dau:${dayKey}`;
    const dauSet = aggregationCache.get(dauKey) || new Set();
    dauSet.add(userId);
    aggregationCache.set(dauKey, dauSet, 86400);
  }

  // Category-specific aggregations
  const schema = EventSchemas[eventName];
  if (schema) {
    const categoryKey = `category_count:${schema.category}:${dayKey}`;
    aggregationCache.set(categoryKey, (aggregationCache.get(categoryKey) || 0) + 1, 86400);
  }

  // Track performance metrics
  if (event.properties?.latency_ms) {
    await updatePerformanceMetrics(eventName, event.properties.latency_ms);
  }
}

/**
 * Update performance metric aggregations
 */
async function updatePerformanceMetrics(eventName, latencyMs) {
  const metricsKey = `perf_metrics:${eventName}`;
  const metrics = aggregationCache.get(metricsKey) || {
    count: 0,
    sum: 0,
    min: Infinity,
    max: 0,
    p50_values: [],
    p95_values: [],
    p99_values: [],
  };

  metrics.count++;
  metrics.sum += latencyMs;
  metrics.min = Math.min(metrics.min, latencyMs);
  metrics.max = Math.max(metrics.max, latencyMs);

  // Keep last 1000 values for percentile calculation
  metrics.p50_values.push(latencyMs);
  if (metrics.p50_values.length > 1000) {
    metrics.p50_values.shift();
  }

  aggregationCache.set(metricsKey, metrics, 3600);

  // Check for anomalies
  await detectLatencyAnomaly(eventName, latencyMs, metrics);
}

/**
 * Detect latency anomalies using Z-score
 */
async function detectLatencyAnomaly(eventName, latencyMs, metrics) {
  if (metrics.count < 100) return; // Need baseline

  const mean = metrics.sum / metrics.count;
  const sortedValues = [...metrics.p50_values].sort((a, b) => a - b);
  const variance = sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sortedValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return;

  const zScore = (latencyMs - mean) / stdDev;

  if (Math.abs(zScore) > 3) {
    // Anomaly detected
    const anomalyKey = `anomaly:${eventName}:${Date.now()}`;
    anomalyCache.set(anomalyKey, {
      event_name: eventName,
      value: latencyMs,
      mean,
      std_dev: stdDev,
      z_score: zScore,
      severity: Math.abs(zScore) > 4 ? 'high' : 'medium',
      detected_at: new Date().toISOString(),
    });

    console.warn(`[Analytics] Anomaly detected for ${eventName}: ${latencyMs}ms (z=${zScore.toFixed(2)})`);
  }
}

// ============================================================================
// FUNNEL ANALYSIS
// ============================================================================

/**
 * Track funnel step completion
 */
async function trackFunnelStep(userId, funnelId, stepId, properties = {}) {
  const funnelKey = `funnel:${funnelId}:${userId}`;
  const funnelData = aggregationCache.get(funnelKey) || {
    funnel_id: funnelId,
    user_id: userId,
    started_at: new Date().toISOString(),
    steps: {},
  };

  funnelData.steps[stepId] = {
    completed_at: new Date().toISOString(),
    time_since_start_ms: Date.now() - new Date(funnelData.started_at).getTime(),
    properties,
  };

  aggregationCache.set(funnelKey, funnelData, 86400);

  // Persist funnel progress
  try {
    await db.execute(sql`
      INSERT INTO analytics_events (event_name, timestamp, properties, user_id)
      VALUES (
        'funnel_step',
        NOW(),
        ${JSON.stringify({
          funnel_id: funnelId,
          step_id: stepId,
          time_since_start_ms: funnelData.steps[stepId].time_since_start_ms,
          ...properties,
        })},
        ${userId}
      )
    `);
  } catch (e) {
    console.error('[Analytics] Failed to persist funnel step:', e.message);
  }
}

// ============================================================================
// MAIN PIPELINE FUNCTIONS
// ============================================================================

/**
 * Process a single event through the pipeline
 */
export async function processEvent(eventName, properties, userId = null, device = null) {
  try {
    // Validate event
    const validation = validateEvent(eventName, properties);
    if (!validation.valid) {
      console.warn(`[Analytics] Invalid event ${eventName}:`, validation.errors);
      // Still process but mark as invalid
      properties._validation_errors = validation.errors;
    }

    // Create event object
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      properties,
      device: device || {},
      category: validation.category || 'unknown',
    };

    // Enrich event
    const enrichedEvent = await enrichEvent(event, userId);

    // Update real-time aggregations
    await updateRealTimeAggregations(enrichedEvent, userId);

    // Persist to database
    await db.execute(sql`
      INSERT INTO analytics_events (event_name, timestamp, properties, device, session_id, user_id)
      VALUES (
        ${eventName},
        ${new Date()},
        ${JSON.stringify(enrichedEvent.properties)},
        ${JSON.stringify(enrichedEvent.device)},
        ${properties.session_id || null},
        ${userId}
      )
    `);

    return { success: true, event_id: eventName, warnings: validation.warnings };
  } catch (error) {
    console.error('[Analytics] Pipeline error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process a batch of events
 */
export async function processBatch(events, userId = null) {
  const results = {
    processed: 0,
    failed: 0,
    warnings: [],
  };

  // Process with backpressure - max 50 concurrent
  const batchSize = 50;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const promises = batch.map(e =>
      processEvent(e.event, e.properties || {}, e.user_id || userId, e.device)
    );

    const batchResults = await Promise.allSettled(promises);
    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.success) {
        results.processed++;
        if (r.value.warnings?.length) {
          results.warnings.push(...r.value.warnings);
        }
      } else {
        results.failed++;
      }
    });
  }

  return results;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get real-time metrics
 */
export function getRealTimeMetrics() {
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

  const metrics = {
    timestamp: now.toISOString(),
    hourly_events: {},
    daily_events: {},
    dau: 0,
    category_breakdown: {},
    performance: {},
    anomalies: [],
  };

  // Collect hourly event counts
  for (const eventName of Object.keys(EventSchemas)) {
    const hourCount = aggregationCache.get(`event_count:${eventName}:${hourKey}`);
    const dayCount = aggregationCache.get(`event_count:${eventName}:${dayKey}`);
    if (hourCount) metrics.hourly_events[eventName] = hourCount;
    if (dayCount) metrics.daily_events[eventName] = dayCount;
  }

  // DAU
  const dauSet = aggregationCache.get(`dau:${dayKey}`);
  if (dauSet) metrics.dau = dauSet.size;

  // Category breakdown
  for (const category of Object.values(EventCategories)) {
    const categoryCount = aggregationCache.get(`category_count:${category}:${dayKey}`);
    if (categoryCount) metrics.category_breakdown[category] = categoryCount;
  }

  // Performance metrics
  for (const eventName of Object.keys(EventSchemas)) {
    const perfMetrics = aggregationCache.get(`perf_metrics:${eventName}`);
    if (perfMetrics && perfMetrics.count > 0) {
      const sorted = [...perfMetrics.p50_values].sort((a, b) => a - b);
      metrics.performance[eventName] = {
        count: perfMetrics.count,
        avg_ms: Math.round(perfMetrics.sum / perfMetrics.count),
        min_ms: perfMetrics.min,
        max_ms: perfMetrics.max,
        p50_ms: sorted[Math.floor(sorted.length * 0.5)],
        p95_ms: sorted[Math.floor(sorted.length * 0.95)],
        p99_ms: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
  }

  // Recent anomalies
  const anomalyKeys = anomalyCache.keys().filter(k => k.startsWith('anomaly:'));
  metrics.anomalies = anomalyKeys
    .map(k => anomalyCache.get(k))
    .filter(Boolean)
    .slice(-10);

  return metrics;
}

/**
 * Get funnel analysis
 */
export async function getFunnelAnalysis(funnelId, startDate, endDate) {
  const result = await db.execute(sql`
    WITH funnel_data AS (
      SELECT
        user_id,
        properties->>'step_id' as step_id,
        (properties->>'time_since_start_ms')::integer as time_ms,
        timestamp
      FROM analytics_events
      WHERE event_name = 'funnel_step'
        AND properties->>'funnel_id' = ${funnelId}
        AND timestamp BETWEEN ${startDate} AND ${endDate}
    ),
    step_counts AS (
      SELECT
        step_id,
        COUNT(DISTINCT user_id) as users,
        AVG(time_ms) as avg_time_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_ms) as median_time_ms
      FROM funnel_data
      GROUP BY step_id
    )
    SELECT * FROM step_counts ORDER BY users DESC
  `);

  return {
    funnel_id: funnelId,
    period: { start: startDate, end: endDate },
    steps: result.rows,
  };
}

/**
 * Get user engagement metrics
 */
export async function getUserEngagementMetrics(userId, days = 30) {
  const result = await db.execute(sql`
    SELECT
      event_name,
      COUNT(*) as count,
      MIN(timestamp) as first_occurrence,
      MAX(timestamp) as last_occurrence
    FROM analytics_events
    WHERE user_id = ${userId}
      AND timestamp > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY event_name
    ORDER BY count DESC
  `);

  const sessions = await db.execute(sql`
    SELECT
      COUNT(DISTINCT properties->>'session_id') as session_count,
      AVG((properties->>'duration_seconds')::integer) as avg_session_duration
    FROM analytics_events
    WHERE user_id = ${userId}
      AND event_name = 'session_end'
      AND timestamp > NOW() - INTERVAL '1 day' * ${days}
  `);

  return {
    user_id: userId,
    period_days: days,
    events: result.rows,
    sessions: sessions.rows[0] || { session_count: 0, avg_session_duration: 0 },
  };
}

export default {
  processEvent,
  processBatch,
  getRealTimeMetrics,
  getFunnelAnalysis,
  getUserEngagementMetrics,
  trackFunnelStep,
  EventCategories,
  EventSchemas,
};
