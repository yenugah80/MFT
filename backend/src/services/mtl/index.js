/**
 * Multi-Task Learning Service - Main Entry Point
 *
 * Unified API for multi-task health prediction with meta-learning.
 * This service orchestrates feature encoding, model inference, and personalization.
 *
 * CAPABILITIES:
 * 1. Predict multiple health outcomes simultaneously (mood, energy, sleep, etc.)
 * 2. Handle cold start with population-level meta-learned initialization
 * 3. Personalize rapidly with few-shot adaptation
 * 4. Provide uncertainty-aware predictions with confidence intervals
 *
 * API SURFACE:
 * - predictHealthOutcomes(userId, date) - Main prediction function
 * - getPersonalizationStatus(userId) - Check personalization level
 * - trainUserModel(userId) - Trigger personalization update
 * - getModelInsights(userId) - Get model explanation data
 *
 * INTEGRATION:
 * - Used by recommendation orchestrator for informed decisions
 * - Feeds into drift detection for monitoring
 * - Provides data for frontend visualizations
 */

import { db } from '../../db/index.js';
import { gamificationTable, profilesTable, moodLogTable, foodLogTable } from '../../db/schema.js';
import { eq, gte, desc, and, sql } from 'drizzle-orm';

import { encodeUserDay, getFeatureDimension } from './featureEncoder.js';
import { MultiTaskModel, createModel } from './multiTaskModel.js';
import {
  getInitialParams,
  personalizeModel,
  getPersonalizationLevel,
  coldStartAwarePrediction,
} from './metaLearner.js';

/**
 * ============================================
 * USER MODEL CACHE
 * ============================================
 */

// In-memory cache for user models (in production, use Redis)
const userModelCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get or create model for user
 */
async function getUserModel(userId) {
  const cached = userModelCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.model;
  }

  // Check how much data user has
  const userStats = await getUserDataStats(userId);

  // Get appropriate initialization
  const { params, source } = await getInitialParams(userId);

  // Create and initialize model
  const model = createModel();
  model.setParams(params);

  // Cache the model
  userModelCache.set(userId, {
    model,
    timestamp: Date.now(),
    source,
    daysOfData: userStats.daysWithLogs,
  });

  return model;
}

/**
 * Get user data statistics
 */
async function getUserDataStats(userId) {
  try {
    const stats = await db
      .select({
        totalMeals: gamificationTable.totalMealsLogged,
        streak: gamificationTable.streak,
      })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    const gamStats = stats[0] || {};

    return {
      totalMeals: gamStats.totalMeals || 0,
      daysWithLogs: gamStats.totalMeals ? Math.ceil(gamStats.totalMeals / 2.5) : 0,
      streak: gamStats.streak || 0,
    };
  } catch (error) {
    return { totalMeals: 0, daysWithLogs: 0, streak: 0 };
  }
}

/**
 * ============================================
 * MAIN API FUNCTIONS
 * ============================================
 */

/**
 * Predict health outcomes for a user on a given date
 *
 * @param {string} userId - User ID
 * @param {Date|string} date - Target date (default: today)
 * @returns {Promise<Object>} Predictions with confidence and personalization info
 */
export async function predictHealthOutcomes(userId, date = new Date()) {
  try {
    // Get user stats for personalization level
    const userStats = await getUserDataStats(userId);
    const personalization = getPersonalizationLevel(userStats.daysWithLogs);

    // Encode features for the day
    const encoded = await encodeUserDay(userId, date, {
      includeHistory: userStats.daysWithLogs >= 3,
      historyDays: Math.min(userStats.daysWithLogs, 7),
    });

    // Get model and predict
    const model = await getUserModel(userId);
    const rawPredictions = model.predict(encoded.featureVector);

    // Get task uncertainties
    const uncertainties = model.getTaskUncertainties();

    // Format predictions for API response
    const predictions = formatPredictions(rawPredictions, uncertainties, personalization);

    return {
      success: true,
      userId,
      date: date instanceof Date ? date.toISOString().split('T')[0] : date,
      predictions,
      personalization: {
        level: personalization.level,
        description: personalization.description,
        confidence: personalization.confidence,
        daysOfData: userStats.daysWithLogs,
        daysToFullPersonalization: Math.max(0, 7 - userStats.daysWithLogs),
      },
      metadata: {
        dataCompleteness: encoded.metadata.dataCompleteness,
        featuresDim: encoded.featureVector.length,
      },
    };
  } catch (error) {
    console.error('[MTL Service] Error predicting outcomes:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format predictions for user-friendly output
 */
function formatPredictions(rawPredictions, uncertainties, personalization) {
  const formatted = {};

  for (const [task, pred] of Object.entries(rawPredictions)) {
    const uncertainty = uncertainties[task] || { confidence: 0.5 };

    formatted[task] = {
      value: roundTo(pred.value, 2),
      confidence: roundTo(personalization.confidence * uncertainty.confidence, 2),
      range: pred.lower && pred.upper ? {
        low: roundTo(Math.max(1, pred.lower), 1),
        high: roundTo(Math.min(5, pred.upper), 1),
      } : null,
      interpretation: interpretPrediction(task, pred.value),
      taskType: pred.taskType,
    };

    // Add binary-specific fields
    if (pred.taskType === 'binary') {
      formatted[task].probability = roundTo(pred.probability, 2);
      formatted[task].predicted = pred.predicted;
    }
  }

  return formatted;
}

/**
 * Interpret prediction value for UI display
 */
function interpretPrediction(task, value) {
  const interpretations = {
    mood: [
      { max: 1.5, label: 'Low', color: 'negative' },
      { max: 2.5, label: 'Below Average', color: 'warning' },
      { max: 3.5, label: 'Moderate', color: 'neutral' },
      { max: 4.5, label: 'Good', color: 'positive' },
      { max: 5, label: 'Excellent', color: 'excellent' },
    ],
    energy: [
      { max: 1.5, label: 'Very Low', color: 'negative' },
      { max: 2.5, label: 'Low', color: 'warning' },
      { max: 3.5, label: 'Moderate', color: 'neutral' },
      { max: 4.5, label: 'High', color: 'positive' },
      { max: 5, label: 'Very High', color: 'excellent' },
    ],
    sleep: [
      { max: 1.5, label: 'Poor', color: 'negative' },
      { max: 2.5, label: 'Fair', color: 'warning' },
      { max: 3.5, label: 'Adequate', color: 'neutral' },
      { max: 4.5, label: 'Good', color: 'positive' },
      { max: 5, label: 'Excellent', color: 'excellent' },
    ],
    hydration: [
      { max: 0.5, label: 'Inadequate', color: 'warning' },
      { max: 1, label: 'Adequate', color: 'positive' },
    ],
    compliance: [
      { max: 0.5, label: 'Off Track', color: 'warning' },
      { max: 1, label: 'On Track', color: 'positive' },
    ],
  };

  const taskInterps = interpretations[task] || interpretations.mood;
  const interp = taskInterps.find(i => value <= i.max) || taskInterps[taskInterps.length - 1];

  return {
    label: interp.label,
    color: interp.color,
  };
}

/**
 * Get personalization status for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Personalization status and progress
 */
export async function getPersonalizationStatus(userId) {
  try {
    const userStats = await getUserDataStats(userId);
    const personalization = getPersonalizationLevel(userStats.daysWithLogs);

    // Calculate progress
    const progress = Math.min(100, (userStats.daysWithLogs / 7) * 100);

    // Get model info
    const cached = userModelCache.get(userId);

    return {
      success: true,
      userId,
      status: {
        level: personalization.level,
        description: personalization.description,
        progress: roundTo(progress, 0),
        daysOfData: userStats.daysWithLogs,
        daysRemaining: Math.max(0, 7 - userStats.daysWithLogs),
      },
      weights: {
        personalized: roundTo(personalization.personalizedWeight * 100, 0),
        population: roundTo(personalization.populationWeight * 100, 0),
      },
      model: {
        cached: !!cached,
        source: cached?.source || 'unknown',
        cacheAge: cached ? Math.floor((Date.now() - cached.timestamp) / 1000 / 60) : null,
      },
    };
  } catch (error) {
    console.error('[MTL Service] Error getting personalization status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger model personalization update for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function updateUserModel(userId) {
  try {
    // Get user's recent data for adaptation
    const recentData = await getRecentUserData(userId, 7);

    if (recentData.length < 3) {
      return {
        success: false,
        error: 'Insufficient data for personalization (need at least 3 days)',
      };
    }

    // Get current params
    const { params } = await getInitialParams(userId);

    // Personalize model
    const result = await personalizeModel(userId, recentData, params);

    // Update cache
    const model = createModel();
    model.setParams(result.params);
    userModelCache.set(userId, {
      model,
      timestamp: Date.now(),
      source: 'personalized',
      daysOfData: recentData.length,
    });

    return {
      success: true,
      userId,
      adaptationSteps: result.adaptationSteps,
      dataUsed: result.supportSetSize,
    };
  } catch (error) {
    console.error('[MTL Service] Error updating user model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent user data for adaptation
 */
async function getRecentUserData(userId, days) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get mood logs
    const moodLogs = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedAt, startDate)
        )
      )
      .orderBy(desc(moodLogTable.loggedAt));

    // Group by date and calculate averages
    const byDate = {};
    for (const log of moodLogs) {
      const dateKey = new Date(log.loggedAt).toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { moods: [], energies: [] };
      }
      byDate[dateKey].moods.push(log.intensity || 3);
      if (log.energy) byDate[dateKey].energies.push(log.energy);
    }

    return Object.entries(byDate).map(([date, data]) => ({
      date,
      mood: data.moods.reduce((a, b) => a + b, 0) / data.moods.length,
      energy: data.energies.length > 0
        ? data.energies.reduce((a, b) => a + b, 0) / data.energies.length
        : 3,
    }));
  } catch (error) {
    console.error('[MTL Service] Error getting recent user data:', error);
    return [];
  }
}

/**
 * Get model insights for visualization
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Model insights for frontend display
 */
export async function getModelInsights(userId) {
  try {
    const userStats = await getUserDataStats(userId);
    const personalization = getPersonalizationLevel(userStats.daysWithLogs);
    const model = await getUserModel(userId);
    const uncertainties = model.getTaskUncertainties();

    // Format for visualization
    const taskInsights = {};
    for (const [task, unc] of Object.entries(uncertainties)) {
      taskInsights[task] = {
        modelConfidence: roundTo(unc.confidence, 2),
        uncertainty: roundTo(unc.std, 3),
        reliabilityLabel: unc.confidence > 0.7 ? 'High' :
          unc.confidence > 0.4 ? 'Moderate' : 'Building',
      };
    }

    return {
      success: true,
      userId,
      personalization: {
        level: personalization.level,
        progress: roundTo((userStats.daysWithLogs / 7) * 100, 0),
        description: personalization.description,
      },
      tasks: taskInsights,
      dataQuality: {
        daysOfData: userStats.daysWithLogs,
        currentStreak: userStats.streak,
        recommendation: userStats.daysWithLogs < 7
          ? 'Keep logging daily to improve prediction accuracy'
          : 'Your predictions are fully personalized',
      },
    };
  } catch (error) {
    console.error('[MTL Service] Error getting model insights:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Utility: Round to decimal places
 */
function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * ============================================
 * BATCH OPERATIONS
 * ============================================
 */

/**
 * Predict outcomes for multiple users (for batch processing)
 */
export async function batchPredictOutcomes(userIds, date = new Date()) {
  const results = await Promise.all(
    userIds.map(userId =>
      predictHealthOutcomes(userId, date).catch(err => ({
        success: false,
        userId,
        error: err.message,
      }))
    )
  );

  return {
    success: true,
    date: date instanceof Date ? date.toISOString().split('T')[0] : date,
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
  };
}

/**
 * Clear model cache (for maintenance)
 */
export function clearModelCache(userId = null) {
  if (userId) {
    userModelCache.delete(userId);
    return { cleared: 1 };
  }

  const count = userModelCache.size;
  userModelCache.clear();
  return { cleared: count };
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

export default {
  predictHealthOutcomes,
  getPersonalizationStatus,
  updateUserModel,
  getModelInsights,
  batchPredictOutcomes,
  clearModelCache,
};
