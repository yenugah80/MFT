/**
 * Outcome Tracking API Routes
 *
 * Provides real analytics data for recommendation effectiveness:
 * - GET /api/outcomes/stats - Effectiveness rate & total recommendations
 * - GET /api/outcomes/confidence - Data quality confidence score
 *
 * Part of the 5W2H Visual Intelligence System.
 */

import express from 'express';
import { eq, and, gte, count, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import {
  recommendationsHistoryTable,
  foodLogTable,
  waterLogTable,
  moodLogTable,
  dailyNutritionSummaryTable,
} from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { errors } from '../utils/errorResponse.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth());

/**
 * GET /api/outcomes/stats
 *
 * Returns real outcome tracking statistics:
 * - effectivenessRate: % of recommendations that led to user action
 * - totalRecommendations: Total recommendations tracked
 * - acceptedCount: Recommendations user accepted
 * - loggedCount: Recommendations that were actually logged as food
 */
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { days = 30 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get all recommendations in time period
    const recommendations = await db
      .select({
        interactionStatus: recommendationsHistoryTable.interactionStatus,
        wasLogged: recommendationsHistoryTable.wasLogged,
      })
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          gte(recommendationsHistoryTable.shownAt, daysAgo)
        )
      );

    const totalRecommendations = recommendations.length;

    if (totalRecommendations === 0) {
      return res.json({
        effectivenessRate: 0,
        totalRecommendations: 0,
        acceptedCount: 0,
        loggedCount: 0,
        viewedCount: 0,
        periodDays: parseInt(days),
        message: 'No recommendations tracked yet',
      });
    }

    // Calculate stats
    const acceptedCount = recommendations.filter(
      r => r.interactionStatus === 'accepted' || r.interactionStatus === 'customized'
    ).length;

    const loggedCount = recommendations.filter(r => r.wasLogged === true).length;
    const viewedCount = recommendations.filter(r => r.interactionStatus !== 'shown').length;

    // Effectiveness = recommendations that led to actual food logging
    const effectivenessRate = Math.round((loggedCount / totalRecommendations) * 100);

    res.json({
      effectivenessRate,
      totalRecommendations,
      acceptedCount,
      loggedCount,
      viewedCount,
      periodDays: parseInt(days),
    });
  } catch (error) {
    console.error('[Outcomes] Stats error:', error);
    next(errors.internal('Failed to fetch outcome stats'));
  }
});

/**
 * GET /api/outcomes/confidence
 *
 * Calculates real confidence score based on data quality:
 * - Data points from different sources
 * - Recency of data
 * - Consistency of logging
 *
 * Returns a 0-1 confidence score with breakdown.
 */
router.get('/confidence', async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { days = 14 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Parallel fetch all data sources
    const [foodLogs, waterLogs, moodLogs] = await Promise.all([
      db
        .select({ count: count(), source: foodLogTable.aiModel })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, daysAgo)
          )
        ),
      db
        .select({ count: count() })
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, daysAgo)
          )
        ),
      db
        .select({ count: count() })
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, daysAgo)
          )
        ),
    ]);

    const foodCount = foodLogs[0]?.count || 0;
    const waterCount = waterLogs[0]?.count || 0;
    const moodCount = moodLogs[0]?.count || 0;

    const totalDataPoints = foodCount + waterCount + moodCount;

    // Calculate confidence factors
    const factors = {
      // Data volume (0-0.4): More data = higher confidence
      volume: Math.min(totalDataPoints / 50, 1) * 0.4,

      // Diversity (0-0.3): Data from multiple sources = higher confidence
      diversity: calculateDiversityScore(foodCount, waterCount, moodCount) * 0.3,

      // Recency (0-0.2): Recent data = higher confidence
      recency: 0.2, // Assumed recent since we filter by days

      // Consistency (0-0.1): Regular logging = higher confidence
      consistency: calculateConsistencyScore(foodCount, parseInt(days)) * 0.1,
    };

    const totalConfidence = Math.min(
      factors.volume + factors.diversity + factors.recency + factors.consistency,
      1
    );

    res.json({
      confidence: parseFloat(totalConfidence.toFixed(2)),
      dataPoints: totalDataPoints,
      breakdown: {
        food: foodCount,
        water: waterCount,
        mood: moodCount,
      },
      factors,
      periodDays: parseInt(days),
    });
  } catch (error) {
    console.error('[Outcomes] Confidence error:', error);
    next(errors.internal('Failed to calculate confidence'));
  }
});

/**
 * GET /api/outcomes/wellness-confidence
 *
 * Returns confidence score specifically for the wellness score calculation.
 * Based on data sources used in the wellness calculation.
 */
router.get('/wellness-confidence', async (req, res, next) => {
  try {
    const userId = req.auth.userId;

    // Get today's data
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [foodLogs, waterLogs, moodLogs] = await Promise.all([
      db
        .select({
          id: foodLogTable.id,
          aiConfidence: foodLogTable.aiConfidence,
          aiModel: foodLogTable.aiModel,
          barcode: foodLogTable.barcode,
        })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, todayStart)
          )
        ),
      db
        .select({ count: count() })
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, todayStart)
          )
        ),
      db
        .select({ count: count() })
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, todayStart)
          )
        ),
    ]);

    // Calculate nutrition confidence based on data sources
    let nutritionConfidence = 0.5; // Base confidence
    if (foodLogs.length > 0) {
      const barcodeCount = foodLogs.filter(f => f.barcode).length;
      const aiConfidences = foodLogs
        .filter(f => f.aiConfidence)
        .map(f => parseFloat(f.aiConfidence));

      // Barcode scans are most accurate (0.95)
      // AI estimates vary (use actual aiConfidence)
      const avgAiConfidence = aiConfidences.length > 0
        ? aiConfidences.reduce((a, b) => a + b, 0) / aiConfidences.length
        : 0.7;

      const barcodeWeight = barcodeCount / foodLogs.length;
      const aiWeight = 1 - barcodeWeight;

      nutritionConfidence = barcodeWeight * 0.95 + aiWeight * avgAiConfidence;
    }

    // Water and mood are user-reported (high confidence)
    const hydrationConfidence = waterLogs[0]?.count > 0 ? 0.9 : 0.5;
    const moodConfidence = moodLogs[0]?.count > 0 ? 0.85 : 0.5;

    // Habits confidence based on streak (would need gamification data)
    const habitsConfidence = 0.8; // Default for now

    // Weighted average matching wellness score weights
    const overallConfidence =
      nutritionConfidence * 0.3 +
      hydrationConfidence * 0.25 +
      moodConfidence * 0.25 +
      habitsConfidence * 0.2;

    res.json({
      confidence: parseFloat(overallConfidence.toFixed(2)),
      breakdown: {
        nutrition: parseFloat(nutritionConfidence.toFixed(2)),
        hydration: parseFloat(hydrationConfidence.toFixed(2)),
        mood: parseFloat(moodConfidence.toFixed(2)),
        habits: parseFloat(habitsConfidence.toFixed(2)),
      },
      dataPoints: {
        food: foodLogs.length,
        water: waterLogs[0]?.count || 0,
        mood: moodLogs[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('[Outcomes] Wellness confidence error:', error);
    next(errors.internal('Failed to calculate wellness confidence'));
  }
});

// Helper: Calculate diversity score
function calculateDiversityScore(food, water, mood) {
  const sources = [food > 0, water > 0, mood > 0].filter(Boolean).length;
  return sources / 3;
}

// Helper: Calculate consistency score
function calculateConsistencyScore(foodCount, days) {
  const expectedMeals = days * 3; // Expect ~3 meals per day
  return Math.min(foodCount / expectedMeals, 1);
}

export default router;
