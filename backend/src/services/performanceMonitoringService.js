/**
 * Performance Monitoring Service - Staff-Level Production System
 *
 * Features:
 * - Request latency tracking with percentiles
 * - Cache hit/miss ratio monitoring
 * - Error rate tracking per endpoint
 * - Anomaly detection with alerting
 * - Real-time dashboard metrics
 * - SLO/SLI monitoring
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// In-memory metrics storage
const metricsCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const alertsCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// ============================================================================
// SLO DEFINITIONS
// ============================================================================

export const SLODefinitions = {
  // Latency SLOs
  API_LATENCY_P50: { target: 200, unit: 'ms' },
  API_LATENCY_P95: { target: 500, unit: 'ms' },
  API_LATENCY_P99: { target: 1000, unit: 'ms' },

  // Availability SLOs
  ERROR_RATE: { target: 0.01, unit: 'percent' }, // < 1%
  UPTIME: { target: 0.999, unit: 'percent' }, // 99.9%

  // Cache SLOs
  CACHE_HIT_RATE: { target: 0.8, unit: 'percent' }, // > 80%

  // AI/Recommendation SLOs
  RECOMMENDATION_LATENCY_P95: { target: 2000, unit: 'ms' },
  AI_ANALYSIS_LATENCY_P95: { target: 5000, unit: 'ms' },
};

// ============================================================================
// METRIC COLLECTION
// ============================================================================

/**
 * Record API request metrics
 */
export function recordRequestMetrics(endpoint, method, statusCode, latencyMs, metadata = {}) {
  const timestamp = Date.now();
  const hourKey = Math.floor(timestamp / 3600000);
  const minuteKey = Math.floor(timestamp / 60000);

  // Metric keys
  const latencyKey = `latency:${endpoint}:${hourKey}`;
  const errorKey = `errors:${endpoint}:${hourKey}`;
  const requestKey = `requests:${endpoint}:${minuteKey}`;

  // Initialize or update latency metrics
  const latencyMetrics = metricsCache.get(latencyKey) || {
    values: [],
    sum: 0,
    count: 0,
    min: Infinity,
    max: 0,
    errors: 0,
  };

  latencyMetrics.values.push(latencyMs);
  if (latencyMetrics.values.length > 1000) {
    // Keep last 1000 samples
    latencyMetrics.values = latencyMetrics.values.slice(-1000);
  }
  latencyMetrics.sum += latencyMs;
  latencyMetrics.count++;
  latencyMetrics.min = Math.min(latencyMetrics.min, latencyMs);
  latencyMetrics.max = Math.max(latencyMetrics.max, latencyMs);

  if (statusCode >= 400) {
    latencyMetrics.errors++;
  }

  metricsCache.set(latencyKey, latencyMetrics, 7200);

  // Track errors separately
  if (statusCode >= 400) {
    const errorMetrics = metricsCache.get(errorKey) || { count: 0, byStatus: {} };
    errorMetrics.count++;
    errorMetrics.byStatus[statusCode] = (errorMetrics.byStatus[statusCode] || 0) + 1;
    metricsCache.set(errorKey, errorMetrics, 7200);
  }

  // Track request rate
  const requestCount = metricsCache.get(requestKey) || 0;
  metricsCache.set(requestKey, requestCount + 1, 300);

  // Check for anomalies
  detectLatencyAnomaly(endpoint, latencyMs, latencyMetrics);

  // Persist to DB periodically (every 100 requests)
  if (latencyMetrics.count % 100 === 0) {
    persistMetrics(endpoint, hourKey, latencyMetrics).catch(console.error);
  }

  return { recorded: true };
}

/**
 * Record cache operation
 */
export function recordCacheMetrics(cacheType, operation, hit, keyPattern = null) {
  const hourKey = Math.floor(Date.now() / 3600000);
  const cacheKey = `cache:${cacheType}:${hourKey}`;

  const cacheMetrics = metricsCache.get(cacheKey) || {
    hits: 0,
    misses: 0,
    operations: {},
    patterns: {},
  };

  if (hit) {
    cacheMetrics.hits++;
  } else {
    cacheMetrics.misses++;
  }

  cacheMetrics.operations[operation] = (cacheMetrics.operations[operation] || 0) + 1;

  if (keyPattern) {
    cacheMetrics.patterns[keyPattern] = (cacheMetrics.patterns[keyPattern] || 0) + 1;
  }

  metricsCache.set(cacheKey, cacheMetrics, 7200);

  // Alert if hit rate drops below SLO
  const hitRate = cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses);
  if (cacheMetrics.hits + cacheMetrics.misses > 100 && hitRate < SLODefinitions.CACHE_HIT_RATE.target) {
    createAlert({
      type: 'slo_breach',
      metric: 'cache_hit_rate',
      value: hitRate,
      threshold: SLODefinitions.CACHE_HIT_RATE.target,
      cacheType,
    });
  }

  return { hitRate };
}

/**
 * Record error
 */
export function recordError(errorType, errorMessage, metadata = {}) {
  const timestamp = Date.now();
  const hourKey = Math.floor(timestamp / 3600000);
  const errorKey = `error_log:${hourKey}`;

  const errorLog = metricsCache.get(errorKey) || [];
  errorLog.push({
    type: errorType,
    message: errorMessage,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // Keep last 100 errors
  if (errorLog.length > 100) {
    errorLog.shift();
  }

  metricsCache.set(errorKey, errorLog, 7200);

  // Track error rate
  const errorCountKey = `error_count:${errorType}:${hourKey}`;
  const errorCount = metricsCache.get(errorCountKey) || 0;
  metricsCache.set(errorCountKey, errorCount + 1, 7200);

  return { logged: true };
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect latency anomalies using Z-score
 */
function detectLatencyAnomaly(endpoint, latencyMs, metrics) {
  if (metrics.count < 50) return; // Need baseline

  const mean = metrics.sum / metrics.count;
  const sortedValues = [...metrics.values].sort((a, b) => a - b);
  const variance = sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sortedValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return;

  const zScore = (latencyMs - mean) / stdDev;

  // Alert on significant anomalies
  if (Math.abs(zScore) > 3) {
    const severity = Math.abs(zScore) > 4 ? 'high' : 'medium';
    createAlert({
      type: 'latency_anomaly',
      endpoint,
      value: latencyMs,
      mean,
      stdDev,
      zScore,
      severity,
    });
  }
}

/**
 * Detect error rate anomalies
 */
async function detectErrorRateAnomaly(endpoint) {
  const hourKey = Math.floor(Date.now() / 3600000);
  const latencyKey = `latency:${endpoint}:${hourKey}`;
  const metrics = metricsCache.get(latencyKey);

  if (!metrics || metrics.count < 100) return;

  const errorRate = metrics.errors / metrics.count;

  if (errorRate > SLODefinitions.ERROR_RATE.target) {
    createAlert({
      type: 'slo_breach',
      metric: 'error_rate',
      endpoint,
      value: errorRate,
      threshold: SLODefinitions.ERROR_RATE.target,
      severity: errorRate > 0.05 ? 'high' : 'medium',
    });
  }
}

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Create alert
 */
function createAlert(alertData) {
  const alertId = `alert:${alertData.type}:${alertData.metric || alertData.endpoint}:${Date.now()}`;

  const alert = {
    id: alertId,
    ...alertData,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };

  // Check for duplicate recent alerts
  const recentKey = `recent_alert:${alertData.type}:${alertData.metric || alertData.endpoint}`;
  if (alertsCache.get(recentKey)) {
    return; // Dedupe
  }

  // Mark as recent (5 minute cooldown)
  alertsCache.set(recentKey, true, 300);

  // Store alert
  const alertsKey = 'active_alerts';
  const activeAlerts = alertsCache.get(alertsKey) || [];
  activeAlerts.push(alert);
  alertsCache.set(alertsKey, activeAlerts, 86400);

  console.warn(`[Performance Alert] ${alert.type}: ${JSON.stringify(alertData)}`);

  return alert;
}

/**
 * Get active alerts
 */
export function getActiveAlerts() {
  return alertsCache.get('active_alerts') || [];
}

/**
 * Acknowledge alert
 */
export function acknowledgeAlert(alertId) {
  const alertsKey = 'active_alerts';
  const activeAlerts = alertsCache.get(alertsKey) || [];
  const alert = activeAlerts.find(a => a.id === alertId);

  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alertsCache.set(alertsKey, activeAlerts, 86400);
    return { success: true };
  }

  return { success: false, error: 'alert_not_found' };
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Get real-time dashboard metrics
 */
export function getDashboardMetrics() {
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000);
  const currentMinute = Math.floor(now / 60000);

  const metrics = {
    timestamp: new Date().toISOString(),
    latency: {},
    errors: {},
    cache: {},
    throughput: {},
    sloStatus: {},
    alerts: getActiveAlerts().slice(-10),
  };

  // Collect latency metrics
  const latencyKeys = metricsCache.keys().filter(k => k.startsWith(`latency:`));
  for (const key of latencyKeys) {
    const parts = key.split(':');
    const endpoint = parts[1];
    const hour = parseInt(parts[2]);

    if (hour !== currentHour) continue;

    const data = metricsCache.get(key);
    if (!data || data.count === 0) continue;

    const sorted = [...data.values].sort((a, b) => a - b);
    metrics.latency[endpoint] = {
      count: data.count,
      avg: Math.round(data.sum / data.count),
      min: data.min,
      max: data.max,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      errorRate: (data.errors / data.count * 100).toFixed(2) + '%',
    };
  }

  // Collect cache metrics
  const cacheKeys = metricsCache.keys().filter(k => k.startsWith(`cache:`));
  for (const key of cacheKeys) {
    const parts = key.split(':');
    const cacheType = parts[1];
    const hour = parseInt(parts[2]);

    if (hour !== currentHour) continue;

    const data = metricsCache.get(key);
    if (!data) continue;

    const total = data.hits + data.misses;
    metrics.cache[cacheType] = {
      total,
      hits: data.hits,
      misses: data.misses,
      hitRate: total > 0 ? ((data.hits / total) * 100).toFixed(1) + '%' : 'N/A',
      operations: data.operations,
    };
  }

  // Calculate SLO status
  for (const endpoint of Object.keys(metrics.latency)) {
    const latency = metrics.latency[endpoint];

    metrics.sloStatus[endpoint] = {
      p50_ok: latency.p50 <= SLODefinitions.API_LATENCY_P50.target,
      p95_ok: latency.p95 <= SLODefinitions.API_LATENCY_P95.target,
      p99_ok: latency.p99 <= SLODefinitions.API_LATENCY_P99.target,
      error_ok: parseFloat(latency.errorRate) <= SLODefinitions.ERROR_RATE.target * 100,
    };
  }

  for (const cacheType of Object.keys(metrics.cache)) {
    const cache = metrics.cache[cacheType];
    metrics.sloStatus[`cache_${cacheType}`] = {
      hit_rate_ok: parseFloat(cache.hitRate) >= SLODefinitions.CACHE_HIT_RATE.target * 100,
    };
  }

  return metrics;
}

/**
 * Get historical metrics for a time range
 */
export async function getHistoricalMetrics(startTime, endTime, endpoint = null) {
  const result = await db.execute(sql`
    SELECT
      endpoint,
      hour_bucket,
      request_count,
      error_count,
      avg_latency_ms,
      p50_latency_ms,
      p95_latency_ms,
      p99_latency_ms,
      min_latency_ms,
      max_latency_ms
    FROM performance_metrics
    WHERE hour_bucket BETWEEN ${startTime} AND ${endTime}
      ${endpoint ? sql`AND endpoint = ${endpoint}` : sql``}
    ORDER BY hour_bucket DESC
  `);

  return {
    startTime,
    endTime,
    endpoint,
    metrics: result.rows,
  };
}

/**
 * Get SLO compliance report
 */
export async function getSLOComplianceReport(days = 30) {
  const result = await db.execute(sql`
    SELECT
      endpoint,
      COUNT(*) as total_hours,
      SUM(CASE WHEN p50_latency_ms <= ${SLODefinitions.API_LATENCY_P50.target} THEN 1 ELSE 0 END) as p50_compliant,
      SUM(CASE WHEN p95_latency_ms <= ${SLODefinitions.API_LATENCY_P95.target} THEN 1 ELSE 0 END) as p95_compliant,
      SUM(CASE WHEN p99_latency_ms <= ${SLODefinitions.API_LATENCY_P99.target} THEN 1 ELSE 0 END) as p99_compliant,
      SUM(CASE WHEN error_count::float / NULLIF(request_count, 0) <= ${SLODefinitions.ERROR_RATE.target} THEN 1 ELSE 0 END) as error_compliant,
      AVG(avg_latency_ms) as overall_avg_latency,
      SUM(error_count)::float / NULLIF(SUM(request_count), 0) as overall_error_rate
    FROM performance_metrics
    WHERE hour_bucket > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY endpoint
    ORDER BY total_hours DESC
  `);

  return {
    period_days: days,
    slo_targets: SLODefinitions,
    compliance: result.rows.map(row => ({
      endpoint: row.endpoint,
      total_hours: parseInt(row.total_hours),
      p50_compliance: (row.p50_compliant / row.total_hours * 100).toFixed(1) + '%',
      p95_compliance: (row.p95_compliant / row.total_hours * 100).toFixed(1) + '%',
      p99_compliance: (row.p99_compliant / row.total_hours * 100).toFixed(1) + '%',
      error_compliance: (row.error_compliant / row.total_hours * 100).toFixed(1) + '%',
      avg_latency: Math.round(row.overall_avg_latency),
      error_rate: (row.overall_error_rate * 100).toFixed(2) + '%',
    })),
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Persist metrics to database
 */
async function persistMetrics(endpoint, hourKey, metrics) {
  try {
    const sorted = [...metrics.values].sort((a, b) => a - b);
    const hourBucket = new Date(hourKey * 3600000);

    await db.execute(sql`
      INSERT INTO performance_metrics (
        endpoint, hour_bucket, request_count, error_count,
        avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms,
        min_latency_ms, max_latency_ms, created_at
      ) VALUES (
        ${endpoint}, ${hourBucket}, ${metrics.count}, ${metrics.errors},
        ${Math.round(metrics.sum / metrics.count)},
        ${sorted[Math.floor(sorted.length * 0.5)] || 0},
        ${sorted[Math.floor(sorted.length * 0.95)] || 0},
        ${sorted[Math.floor(sorted.length * 0.99)] || 0},
        ${metrics.min}, ${metrics.max}, NOW()
      )
      ON CONFLICT (endpoint, hour_bucket) DO UPDATE SET
        request_count = performance_metrics.request_count + ${metrics.count},
        error_count = performance_metrics.error_count + ${metrics.errors},
        avg_latency_ms = (performance_metrics.avg_latency_ms + ${Math.round(metrics.sum / metrics.count)}) / 2,
        max_latency_ms = GREATEST(performance_metrics.max_latency_ms, ${metrics.max}),
        min_latency_ms = LEAST(performance_metrics.min_latency_ms, ${metrics.min})
    `);
  } catch (error) {
    console.error('[Performance] Error persisting metrics:', error.message);
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Express middleware for automatic request tracking
 */
export function performanceMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
      const latencyMs = Date.now() - startTime;
      const endpoint = normalizeEndpoint(req.path);

      recordRequestMetrics(endpoint, req.method, res.statusCode, latencyMs, {
        userAgent: req.headers['user-agent'],
        userId: req.auth?.userId,
      });

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Normalize endpoint paths (remove IDs)
 */
function normalizeEndpoint(path) {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/user_[a-zA-Z0-9]+/g, '/:userId'); // Clerk user IDs
}

export default {
  recordRequestMetrics,
  recordCacheMetrics,
  recordError,
  getDashboardMetrics,
  getHistoricalMetrics,
  getSLOComplianceReport,
  getActiveAlerts,
  acknowledgeAlert,
  performanceMiddleware,
  SLODefinitions,
};
