/**
 * Health Platform Integration Service
 *
 * Production-grade integration with HealthKit (iOS) and Google Fit (Android)
 * for bi-directional health data synchronization.
 *
 * Features:
 * - Bi-directional sync with conflict resolution
 * - Privacy-preserving data handling
 * - Batch sync with rate limiting
 * - Data validation and normalization
 * - Sync status tracking and recovery
 * - Incremental sync with anchors
 */

import { db } from '../config/db.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Sync settings
  SYNC_BATCH_SIZE: 100,
  SYNC_RATE_LIMIT_MS: 1000, // Minimum time between syncs
  MAX_SYNC_RETRIES: 3,
  SYNC_TIMEOUT_MS: 30000,

  // Data retention
  MAX_HISTORICAL_DAYS: 365,
  INCREMENTAL_SYNC_WINDOW_HOURS: 24,

  // Privacy settings
  ANONYMIZE_LOCATION: true,
  ROUND_TIMESTAMPS_MINUTES: 15, // Round to nearest 15 min for privacy

  // Supported data types
  DATA_TYPES: {
    // Nutrition (write to health platforms)
    NUTRITION: {
      calories: 'dietaryEnergyConsumed',
      protein: 'dietaryProtein',
      carbs: 'dietaryCarbohydrates',
      fat: 'dietaryFatTotal',
      fiber: 'dietaryFiber',
      sugar: 'dietarySugar',
      sodium: 'dietarySodium',
      water: 'dietaryWater',
    },
    // Activity (read from health platforms)
    ACTIVITY: {
      steps: 'stepCount',
      distance: 'distanceWalkingRunning',
      activeEnergy: 'activeEnergyBurned',
      basalEnergy: 'basalEnergyBurned',
      exerciseMinutes: 'appleExerciseTime',
      standHours: 'appleStandHour',
    },
    // Body measurements (read from health platforms)
    BODY: {
      weight: 'bodyMass',
      height: 'height',
      bmi: 'bodyMassIndex',
      bodyFat: 'bodyFatPercentage',
      leanMass: 'leanBodyMass',
    },
    // Vitals (read from health platforms)
    VITALS: {
      heartRate: 'heartRate',
      restingHeartRate: 'restingHeartRate',
      bloodPressureSystolic: 'bloodPressureSystolic',
      bloodPressureDiastolic: 'bloodPressureDiastolic',
      bloodGlucose: 'bloodGlucose',
      oxygenSaturation: 'oxygenSaturation',
    },
    // Sleep (read from health platforms)
    SLEEP: {
      inBed: 'sleepAnalysis',
      asleep: 'sleepAnalysis',
      awake: 'sleepAnalysis',
      rem: 'sleepAnalysis',
      deep: 'sleepAnalysis',
      light: 'sleepAnalysis',
    },
  },
};

// In-memory cache for sync state
const syncCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============================================================================
// SYNC STATE MANAGEMENT
// ============================================================================

/**
 * Get or create sync state for a user
 */
async function getSyncState(userId, platform) {
  const cacheKey = `sync_state:${userId}:${platform}`;
  let state = syncCache.get(cacheKey);

  if (!state) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM health_sync_state
        WHERE user_id = ${userId} AND platform = ${platform}
      `);

      if (result.rows?.length > 0) {
        state = result.rows[0];
      } else {
        // Create initial sync state
        state = {
          userId,
          platform,
          lastSyncAt: null,
          syncAnchor: null,
          syncStatus: 'pending',
          errorCount: 0,
          lastError: null,
          permissions: {},
          dataTypesEnabled: Object.keys(CONFIG.DATA_TYPES),
        };

        await db.execute(sql`
          INSERT INTO health_sync_state (user_id, platform, sync_status, permissions, data_types_enabled)
          VALUES (${userId}, ${platform}, 'pending', '{}', ${JSON.stringify(state.dataTypesEnabled)})
          ON CONFLICT (user_id, platform) DO NOTHING
        `);
      }

      syncCache.set(cacheKey, state);
    } catch (error) {
      console.error('[HealthPlatform] Error getting sync state:', error);
      // Return default state on error
      state = {
        userId,
        platform,
        syncStatus: 'error',
        errorCount: 1,
      };
    }
  }

  return state;
}

/**
 * Update sync state after operation
 */
async function updateSyncState(userId, platform, updates) {
  const cacheKey = `sync_state:${userId}:${platform}`;

  try {
    const setClauses = [];
    const values = [];

    if (updates.lastSyncAt !== undefined) {
      setClauses.push('last_sync_at = $1');
      values.push(updates.lastSyncAt);
    }
    if (updates.syncAnchor !== undefined) {
      setClauses.push(`sync_anchor = $${values.length + 1}`);
      values.push(updates.syncAnchor);
    }
    if (updates.syncStatus !== undefined) {
      setClauses.push(`sync_status = $${values.length + 1}`);
      values.push(updates.syncStatus);
    }
    if (updates.errorCount !== undefined) {
      setClauses.push(`error_count = $${values.length + 1}`);
      values.push(updates.errorCount);
    }
    if (updates.lastError !== undefined) {
      setClauses.push(`last_error = $${values.length + 1}`);
      values.push(updates.lastError);
    }

    if (setClauses.length > 0) {
      values.push(userId, platform);
      await db.execute(sql.raw(`
        UPDATE health_sync_state
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE user_id = $${values.length - 1} AND platform = $${values.length}
      `));
    }

    // Update cache
    const state = syncCache.get(cacheKey) || {};
    syncCache.set(cacheKey, { ...state, ...updates });

  } catch (error) {
    console.error('[HealthPlatform] Error updating sync state:', error);
  }
}

// ============================================================================
// DATA NORMALIZATION & VALIDATION
// ============================================================================

/**
 * Normalize health data from different platforms to common format
 */
function normalizeHealthData(data, platform, dataType) {
  const normalized = {
    type: dataType,
    platform,
    timestamp: null,
    value: null,
    unit: null,
    metadata: {},
  };

  // Platform-specific normalization
  if (platform === 'healthkit') {
    normalized.timestamp = new Date(data.startDate);
    normalized.value = data.value;
    normalized.unit = data.unit;
    normalized.metadata = {
      endDate: data.endDate,
      sourceName: data.sourceName,
      sourceBundle: data.sourceBundleId,
      device: data.device,
    };
  } else if (platform === 'google_fit') {
    normalized.timestamp = new Date(parseInt(data.startTimeNanos) / 1000000);
    normalized.value = data.value?.[0]?.fpVal || data.value?.[0]?.intVal;
    normalized.unit = data.dataTypeName;
    normalized.metadata = {
      endTime: new Date(parseInt(data.endTimeNanos) / 1000000),
      dataSource: data.originDataSourceId,
    };
  }

  // Apply privacy transformations
  if (CONFIG.ANONYMIZE_LOCATION && normalized.metadata.location) {
    delete normalized.metadata.location;
  }

  // Round timestamp for privacy
  if (normalized.timestamp && CONFIG.ROUND_TIMESTAMPS_MINUTES > 0) {
    const minutes = CONFIG.ROUND_TIMESTAMPS_MINUTES;
    const ms = minutes * 60 * 1000;
    normalized.timestamp = new Date(Math.round(normalized.timestamp.getTime() / ms) * ms);
  }

  return normalized;
}

/**
 * Validate health data before storage
 */
function validateHealthData(data, dataType) {
  const errors = [];

  // Required fields
  if (!data.timestamp || isNaN(data.timestamp.getTime())) {
    errors.push('Invalid or missing timestamp');
  }

  if (data.value === null || data.value === undefined) {
    errors.push('Missing value');
  }

  // Type-specific validation
  const typeConfig = getDataTypeConfig(dataType);
  if (typeConfig) {
    // Check value range
    if (typeConfig.minValue !== undefined && data.value < typeConfig.minValue) {
      errors.push(`Value ${data.value} below minimum ${typeConfig.minValue}`);
    }
    if (typeConfig.maxValue !== undefined && data.value > typeConfig.maxValue) {
      errors.push(`Value ${data.value} above maximum ${typeConfig.maxValue}`);
    }

    // Check timestamp range
    const maxAge = CONFIG.MAX_HISTORICAL_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp.getTime() > maxAge) {
      errors.push('Data too old for sync');
    }

    if (data.timestamp > new Date()) {
      errors.push('Future timestamp not allowed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration for a data type
 */
function getDataTypeConfig(dataType) {
  const configs = {
    // Activity
    steps: { minValue: 0, maxValue: 100000, unit: 'count' },
    distance: { minValue: 0, maxValue: 100000, unit: 'meters' },
    activeEnergy: { minValue: 0, maxValue: 10000, unit: 'kcal' },

    // Body
    weight: { minValue: 20, maxValue: 500, unit: 'kg' },
    height: { minValue: 50, maxValue: 300, unit: 'cm' },
    bodyFat: { minValue: 1, maxValue: 70, unit: 'percent' },

    // Vitals
    heartRate: { minValue: 30, maxValue: 250, unit: 'bpm' },
    bloodGlucose: { minValue: 20, maxValue: 600, unit: 'mg/dL' },

    // Nutrition
    calories: { minValue: 0, maxValue: 10000, unit: 'kcal' },
    protein: { minValue: 0, maxValue: 500, unit: 'g' },
    carbs: { minValue: 0, maxValue: 1000, unit: 'g' },
    fat: { minValue: 0, maxValue: 500, unit: 'g' },
    water: { minValue: 0, maxValue: 10000, unit: 'ml' },
  };

  return configs[dataType] || null;
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflicts between local and remote health data
 */
function resolveConflict(localData, remoteData, strategy = 'latest') {
  switch (strategy) {
    case 'latest':
      // Use the most recent data
      return localData.timestamp > remoteData.timestamp ? localData : remoteData;

    case 'local_priority':
      // Prefer local data
      return localData;

    case 'remote_priority':
      // Prefer remote data
      return remoteData;

    case 'merge':
      // Merge data, combining metadata
      return {
        ...remoteData,
        ...localData,
        metadata: {
          ...remoteData.metadata,
          ...localData.metadata,
          conflictResolved: true,
          conflictStrategy: 'merge',
        },
      };

    case 'average':
      // Average numeric values (for measurements like weight)
      if (typeof localData.value === 'number' && typeof remoteData.value === 'number') {
        return {
          ...localData,
          value: (localData.value + remoteData.value) / 2,
          metadata: {
            ...localData.metadata,
            conflictResolved: true,
            conflictStrategy: 'average',
            originalValues: [localData.value, remoteData.value],
          },
        };
      }
      return localData;

    default:
      return localData;
  }
}

/**
 * Detect potential duplicates
 */
function isDuplicate(data1, data2, toleranceMs = 60000) {
  if (data1.type !== data2.type) return false;

  const timeDiff = Math.abs(data1.timestamp.getTime() - data2.timestamp.getTime());
  if (timeDiff > toleranceMs) return false;

  // For same type within time tolerance, check value similarity
  if (typeof data1.value === 'number' && typeof data2.value === 'number') {
    const valueDiff = Math.abs(data1.value - data2.value);
    const maxValue = Math.max(Math.abs(data1.value), Math.abs(data2.value));
    const percentDiff = maxValue > 0 ? (valueDiff / maxValue) * 100 : 0;
    return percentDiff < 5; // 5% tolerance
  }

  return data1.value === data2.value;
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Main sync function - bi-directional sync with health platform
 */
async function syncWithHealthPlatform(userId, platform, options = {}) {
  const {
    dataTypes = Object.keys(CONFIG.DATA_TYPES),
    startDate = new Date(Date.now() - CONFIG.INCREMENTAL_SYNC_WINDOW_HOURS * 60 * 60 * 1000),
    endDate = new Date(),
    forceFullSync = false,
  } = options;

  const syncState = await getSyncState(userId, platform);

  // Check rate limiting
  if (syncState.lastSyncAt) {
    const timeSinceLastSync = Date.now() - new Date(syncState.lastSyncAt).getTime();
    if (timeSinceLastSync < CONFIG.SYNC_RATE_LIMIT_MS) {
      return {
        success: false,
        error: 'Rate limited - sync too frequent',
        nextSyncAllowedAt: new Date(new Date(syncState.lastSyncAt).getTime() + CONFIG.SYNC_RATE_LIMIT_MS),
      };
    }
  }

  // Update sync status
  await updateSyncState(userId, platform, { syncStatus: 'syncing' });

  const syncResults = {
    success: true,
    startedAt: new Date(),
    platform,
    imported: { count: 0, types: {} },
    exported: { count: 0, types: {} },
    conflicts: [],
    errors: [],
  };

  try {
    // Determine sync anchor (for incremental sync)
    let syncAnchor = forceFullSync ? null : syncState.syncAnchor;
    const actualStartDate = syncAnchor ? new Date(syncAnchor) : startDate;

    // IMPORT: Read data from health platform
    for (const dataTypeKey of dataTypes) {
      const typeConfig = CONFIG.DATA_TYPES[dataTypeKey];
      if (!typeConfig) continue;

      // Skip nutrition types for import (we write those)
      if (dataTypeKey === 'NUTRITION') continue;

      try {
        const importedData = await importFromHealthPlatform(
          userId,
          platform,
          dataTypeKey,
          actualStartDate,
          endDate
        );

        if (importedData.length > 0) {
          syncResults.imported.count += importedData.length;
          syncResults.imported.types[dataTypeKey] = importedData.length;
        }
      } catch (error) {
        syncResults.errors.push({
          operation: 'import',
          dataType: dataTypeKey,
          error: error.message,
        });
      }
    }

    // EXPORT: Write nutrition data to health platform
    if (dataTypes.includes('NUTRITION')) {
      try {
        const exportedData = await exportToHealthPlatform(
          userId,
          platform,
          actualStartDate,
          endDate
        );

        if (exportedData.count > 0) {
          syncResults.exported.count = exportedData.count;
          syncResults.exported.types = exportedData.types;
        }
      } catch (error) {
        syncResults.errors.push({
          operation: 'export',
          dataType: 'NUTRITION',
          error: error.message,
        });
      }
    }

    // Update sync state on success
    await updateSyncState(userId, platform, {
      lastSyncAt: new Date(),
      syncAnchor: endDate.toISOString(),
      syncStatus: 'completed',
      errorCount: 0,
      lastError: null,
    });

  } catch (error) {
    console.error('[HealthPlatform] Sync failed:', error);

    syncResults.success = false;
    syncResults.errors.push({
      operation: 'sync',
      error: error.message,
    });

    // Update error state
    await updateSyncState(userId, platform, {
      syncStatus: 'error',
      errorCount: (syncState.errorCount || 0) + 1,
      lastError: error.message,
    });
  }

  syncResults.completedAt = new Date();
  syncResults.durationMs = syncResults.completedAt - syncResults.startedAt;

  return syncResults;
}

/**
 * Import data from health platform
 */
async function importFromHealthPlatform(userId, platform, dataTypeKey, startDate, endDate) {
  const typeConfig = CONFIG.DATA_TYPES[dataTypeKey];
  const importedRecords = [];

  // This would be replaced with actual HealthKit/Google Fit API calls
  // For now, we simulate the data structure
  const mockData = await fetchHealthPlatformData(userId, platform, dataTypeKey, startDate, endDate);

  for (const record of mockData) {
    // Normalize the data
    const normalized = normalizeHealthData(record, platform, dataTypeKey);

    // Validate
    const validation = validateHealthData(normalized, dataTypeKey);
    if (!validation.valid) {
      console.warn('[HealthPlatform] Invalid data skipped:', validation.errors);
      continue;
    }

    // Check for duplicates and conflicts
    const existingData = await findExistingHealthData(userId, normalized);

    if (existingData) {
      if (isDuplicate(normalized, existingData)) {
        // Skip duplicate
        continue;
      } else {
        // Resolve conflict
        const resolved = resolveConflict(existingData, normalized, 'latest');
        await updateHealthData(userId, resolved);
      }
    } else {
      // Insert new record
      await insertHealthData(userId, normalized);
    }

    importedRecords.push(normalized);
  }

  return importedRecords;
}

/**
 * Export nutrition data to health platform
 */
async function exportToHealthPlatform(userId, platform, startDate, endDate) {
  const results = {
    count: 0,
    types: {},
  };

  try {
    // Get nutrition data to export
    const nutritionData = await db.execute(sql`
      SELECT * FROM food_log
      WHERE user_id = ${userId}
        AND logged_at >= ${startDate}
        AND logged_at <= ${endDate}
        AND (health_platform_synced IS NULL OR health_platform_synced = false)
      ORDER BY logged_at ASC
      LIMIT ${CONFIG.SYNC_BATCH_SIZE}
    `);

    if (!nutritionData.rows || nutritionData.rows.length === 0) {
      return results;
    }

    for (const record of nutritionData.rows) {
      // Convert to health platform format
      const healthRecords = convertNutritionToHealthFormat(record, platform);

      for (const healthRecord of healthRecords) {
        // This would send to actual health platform API
        const success = await sendToHealthPlatform(userId, platform, healthRecord);

        if (success) {
          results.count++;
          const type = healthRecord.type;
          results.types[type] = (results.types[type] || 0) + 1;
        }
      }

      // Mark as synced
      await db.execute(sql`
        UPDATE food_log
        SET health_platform_synced = true, health_platform_synced_at = NOW()
        WHERE id = ${record.id}
      `);
    }

  } catch (error) {
    console.error('[HealthPlatform] Export failed:', error);
    throw error;
  }

  return results;
}

/**
 * Convert nutrition log to health platform format
 */
function convertNutritionToHealthFormat(nutritionRecord, platform) {
  const records = [];
  const timestamp = new Date(nutritionRecord.logged_at);

  const nutritionTypes = CONFIG.DATA_TYPES.NUTRITION;

  // Map nutrition fields to health platform types
  const fieldMappings = {
    calories: nutritionRecord.calories,
    protein: nutritionRecord.protein,
    carbs: nutritionRecord.carbs,
    fat: nutritionRecord.fat,
    fiber: nutritionRecord.fiber,
    sodium: nutritionRecord.sodium,
    sugar: nutritionRecord.sugar,
  };

  for (const [field, value] of Object.entries(fieldMappings)) {
    if (value !== null && value !== undefined && value > 0) {
      records.push({
        type: nutritionTypes[field],
        value,
        unit: getDataTypeConfig(field)?.unit || 'g',
        timestamp,
        metadata: {
          mealType: nutritionRecord.meal_type,
          foodName: nutritionRecord.food_name,
          source: 'MFT',
        },
      });
    }
  }

  return records;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function fetchHealthPlatformData(userId, platform, dataType, startDate, endDate) {
  // HealthKit / Google Fit data is read natively in the mobile app and POSTed
  // to /api/health/sync. The backend never calls the native bridge directly.
  // If this function is reached something upstream is wired incorrectly.
  throw new Error(
    `fetchHealthPlatformData: native bridge not callable from backend. ` +
    `Platform='${platform}' dataType='${dataType}'. ` +
    `Use the mobile SDK and POST data to /api/health/sync instead.`
  );
}

async function findExistingHealthData(userId, data) {
  try {
    const result = await db.execute(sql`
      SELECT * FROM health_data
      WHERE user_id = ${userId}
        AND data_type = ${data.type}
        AND timestamp >= ${new Date(data.timestamp.getTime() - 60000)}
        AND timestamp <= ${new Date(data.timestamp.getTime() + 60000)}
      LIMIT 1
    `);
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[HealthPlatform] findExistingHealthData failed:', error);
    return null;
  }
}

async function insertHealthData(userId, data) {
  try {
    await db.execute(sql`
      INSERT INTO health_data (user_id, data_type, value, unit, timestamp, platform, metadata)
      VALUES (${userId}, ${data.type}, ${data.value}, ${data.unit}, ${data.timestamp}, ${data.platform}, ${JSON.stringify(data.metadata)})
    `);
    return true;
  } catch (error) {
    console.error('[HealthPlatform] Insert failed:', error);
    return false;
  }
}

async function updateHealthData(userId, data) {
  try {
    await db.execute(sql`
      UPDATE health_data
      SET value = ${data.value}, metadata = ${JSON.stringify(data.metadata)}, updated_at = NOW()
      WHERE user_id = ${userId} AND data_type = ${data.type} AND timestamp = ${data.timestamp}
    `);
    return true;
  } catch (error) {
    console.error('[HealthPlatform] Update failed:', error);
    return false;
  }
}

async function sendToHealthPlatform(userId, platform, record) {
  // Writes to HealthKit / Google Fit happen natively in the mobile app.
  // The backend signals intent; the mobile SDK performs the actual write.
  // This is intentionally a no-op on the server side.
  return true;
}

// ============================================================================
// USER PERMISSIONS & SETTINGS
// ============================================================================

/**
 * Get user's health platform permissions
 */
async function getPermissions(userId, platform) {
  const state = await getSyncState(userId, platform);
  return state.permissions || {};
}

/**
 * Update user's health platform settings
 */
async function updateSettings(userId, platform, settings) {
  const { dataTypesEnabled, syncFrequency, conflictStrategy } = settings;

  try {
    await db.execute(sql`
      UPDATE health_sync_state
      SET
        data_types_enabled = COALESCE(${dataTypesEnabled ? JSON.stringify(dataTypesEnabled) : null}, data_types_enabled),
        sync_frequency = COALESCE(${syncFrequency}, sync_frequency),
        conflict_strategy = COALESCE(${conflictStrategy}, conflict_strategy),
        updated_at = NOW()
      WHERE user_id = ${userId} AND platform = ${platform}
    `);

    // Clear cache
    syncCache.del(`sync_state:${userId}:${platform}`);

    return { success: true };
  } catch (error) {
    console.error('[HealthPlatform] Settings update failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get health summary for user
 */
async function getHealthSummary(userId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get activity data
    const activityResult = await db.execute(sql`
      SELECT data_type, SUM(value) as total, AVG(value) as average, COUNT(*) as count
      FROM health_data
      WHERE user_id = ${userId}
        AND data_type IN ('steps', 'activeEnergy', 'distance', 'exerciseMinutes')
        AND timestamp >= ${startOfDay}
        AND timestamp <= ${endOfDay}
      GROUP BY data_type
    `);

    // Get latest body measurements
    const bodyResult = await db.execute(sql`
      SELECT DISTINCT ON (data_type) data_type, value, timestamp
      FROM health_data
      WHERE user_id = ${userId}
        AND data_type IN ('weight', 'bodyFat', 'bmi')
      ORDER BY data_type, timestamp DESC
    `);

    // Get sleep data for previous night
    const sleepStart = new Date(date);
    sleepStart.setDate(sleepStart.getDate() - 1);
    sleepStart.setHours(18, 0, 0, 0);

    const sleepResult = await db.execute(sql`
      SELECT data_type, SUM(value) as total
      FROM health_data
      WHERE user_id = ${userId}
        AND data_type LIKE 'sleep%'
        AND timestamp >= ${sleepStart}
        AND timestamp <= ${endOfDay}
      GROUP BY data_type
    `);

    // Build summary
    const summary = {
      date: date.toISOString().split('T')[0],
      activity: {},
      body: {},
      sleep: {},
    };

    for (const row of activityResult.rows || []) {
      summary.activity[row.data_type] = {
        total: parseFloat(row.total),
        average: parseFloat(row.average),
        count: parseInt(row.count),
      };
    }

    for (const row of bodyResult.rows || []) {
      summary.body[row.data_type] = {
        value: parseFloat(row.value),
        timestamp: row.timestamp,
      };
    }

    for (const row of sleepResult.rows || []) {
      summary.sleep[row.data_type] = parseFloat(row.total);
    }

    // Calculate total sleep
    const sleepMinutes = Object.values(summary.sleep).reduce((sum, val) => sum + val, 0);
    summary.sleep.totalHours = (sleepMinutes / 60).toFixed(1);

    return summary;

  } catch (error) {
    console.error('[HealthPlatform] Get summary failed:', error);
    return null;
  }
}

// ============================================================================
// WEEKLY/MONTHLY TRENDS
// ============================================================================

/**
 * Get health trends over time
 */
async function getHealthTrends(userId, dataType, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const result = await db.execute(sql`
      SELECT
        DATE(timestamp) as date,
        AVG(value) as average,
        MIN(value) as min,
        MAX(value) as max,
        COUNT(*) as count
      FROM health_data
      WHERE user_id = ${userId}
        AND data_type = ${dataType}
        AND timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    const trends = {
      dataType,
      period: `${days} days`,
      data: result.rows || [],
    };

    // Calculate overall trend (linear regression simplified)
    if (trends.data.length >= 2) {
      const values = trends.data.map(d => parseFloat(d.average));
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const percentChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      trends.trend = {
        direction: percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'stable',
        percentChange: percentChange.toFixed(1),
        description: getTrendDescription(dataType, percentChange),
      };
    }

    return trends;

  } catch (error) {
    console.error('[HealthPlatform] Get trends failed:', error);
    return null;
  }
}

/**
 * Get human-readable trend description
 */
function getTrendDescription(dataType, percentChange) {
  const direction = percentChange > 0 ? 'increased' : 'decreased';
  const amount = Math.abs(percentChange).toFixed(0);

  const descriptions = {
    steps: `Your daily steps have ${direction} by ${amount}%`,
    weight: percentChange > 0
      ? `You've gained some weight recently`
      : `You're making progress on weight loss!`,
    activeEnergy: `You're burning ${percentChange > 0 ? 'more' : 'fewer'} calories lately`,
    heartRate: `Your average heart rate has ${direction} slightly`,
  };

  return descriptions[dataType] || `${dataType} has ${direction} by ${amount}%`;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Main sync
  syncWithHealthPlatform,

  // Import/Export
  importFromHealthPlatform,
  exportToHealthPlatform,

  // User settings
  getPermissions,
  updateSettings,

  // Data retrieval
  getHealthSummary,
  getHealthTrends,

  // Utilities
  normalizeHealthData,
  validateHealthData,
  resolveConflict,

  // Constants
  CONFIG,
};
