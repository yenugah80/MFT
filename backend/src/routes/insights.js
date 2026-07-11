/**
 * Insights API Routes
 *
 * Provides predictive insights, behavioral correlations, and weekly narratives
 * for premium users. Powers the 5W2H intelligent wellness system.
 *
 * Core Endpoints:
 * - GET /api/insights/predictive - Energy, mood, nutrient predictions
 * - GET /api/insights/correlations - Behavioral pattern discoveries
 * - GET /api/insights/weekly-narrative - Weekly health story
 * - GET /api/insights/what-to-change - Priority change recommendation
 * - GET /api/insights/ai-analysis - OpenAI-powered deep pattern analysis
 * - GET /api/insights/patterns/personalized - Temporal & activity-mood patterns
 *
 * Novel Correlation Discovery:
 * - GET /api/insights/novel-correlations - Auto-discovered user-specific patterns
 *     (pairwise factor scanning with lag analysis and novelty scoring)
 *
 * Outcome Verification (Feedback Loop):
 * - POST /api/insights/recommendations/track - Track recommendation actions
 * - POST /api/insights/recommendations/verify - Verify recommendation outcomes
 * - POST /api/insights/verification/process-pending - Batch verification processing
 *
 * Prediction Calibration:
 * - POST /api/insights/predictions/log - Log predictions for calibration
 * - POST /api/insights/predictions/verify - Verify predictions against outcomes
 * - GET /api/insights/predictions/accuracy - Get prediction accuracy stats
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { and, eq, gte, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  dailyNutritionSummaryTable,
  nutritionGoalsTable,
  moodMealCorrelationsTable,
  insightFeedbackTable,
} from '../db/schema.js';
import { generateDailyStoryLine, calculateDailyScore } from '../services/storyLineService.js';
import { generateMoodInsights, generateBasicMoodInsights } from '../services/moodInsightService.js';
import { errors } from '../utils/errorResponse.js';
import { computeUserCorrelations } from '../services/correlationEngineService.js';
import { openaiClient as openai } from '../services/apiClients/OpenAIClient.js';
import { discoverNovelCorrelations, getNovelInsights } from '../services/autoCorrelationDiscoveryService.js';
import {
  trackRecommendationAction,
  verifyRecommendationOutcome,
  processPendingVerifications,
  logPrediction,
  verifyPrediction,
  calculatePredictionAccuracy,
  getPredictionAccuracyStats,
  measureImplicitOutcomes,
} from '../services/outcomeVerificationService.js';

const router = express.Router();

// Require authentication for all routes
router.use(requireAuth());

/**
 * GET /api/insights/predictive
 * Returns predictive insights for energy, mood, and nutrients
 */
router.get('/predictive', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { days = 14 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Fetch historical data for predictions
    const [foodLogs, moodLogs, waterLogs, goals] = await Promise.all([
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      db.select()
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(waterLogTable.loggedDate)),

      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),
    ]);

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0 };

    // Calculate predictions
    const predictions = generatePredictiveInsights(foodLogs, moodLogs, waterLogs, userGoals);

    res.json({
      success: true,
      dataPoints: foodLogs.length + moodLogs.length,
      lookbackDays: parseInt(days),
      predictions,
    });
  } catch (error) {
    console.error('[Insights] Predictive error:', error);
    errors.internal(res, 'Failed to generate predictive insights');
  }
});

/**
 * GET /api/insights/correlations
 * Returns discovered behavioral correlations
 */
router.get('/correlations', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { limit = 5 } = req.query;

    // Fetch stored correlations from the database
    const correlations = await db.select()
      .from(moodMealCorrelationsTable)
      .where(eq(moodMealCorrelationsTable.userId, userId))
      .orderBy(desc(moodMealCorrelationsTable.strength))
      .limit(parseInt(limit));

    // If no stored correlations, generate rule-based ones
    if (correlations.length === 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      const [moods, foods] = await Promise.all([
        db.select().from(moodLogTable)
          .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, startDate))),
        db.select().from(foodLogTable)
          .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, startDate))),
      ]);

      const generatedCorrelations = generateBehavioralCorrelations(moods, foods);
      return res.json({
        success: true,
        correlations: generatedCorrelations,
        source: 'generated',
      });
    }

    // Transform stored correlations to frontend format
    const transformedCorrelations = correlations.map(corr => ({
      id: corr.id,
      factor: formatMealPattern(corr.mealPattern),
      outcome: corr.moodPattern,
      type: getMoodType(corr.moodPattern),
      correlation: Math.round(parseFloat(corr.strength) * 100),
      dataPoints: corr.occurrences,
      instances: corr.occurrences,
      confidence: Math.round(parseFloat(corr.confidence) * 100),
      explanation: generateExplanation(corr.mealPattern, corr.moodPattern),
      suggestion: generateSuggestion(corr.mealPattern, corr.moodPattern),
    }));

    res.json({
      success: true,
      correlations: transformedCorrelations,
      source: 'stored',
    });
  } catch (error) {
    console.error('[Insights] Correlations error:', error);
    errors.internal(res, 'Failed to fetch correlations');
  }
});

/**
 * GET /api/insights/weekly-narrative
 * Returns the weekly health story narrative
 */
router.get('/weekly-narrative', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Get date range for this week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Fetch all data for this week
    const [foodLogs, moodLogs, waterLogs, summaries, goals] = await Promise.all([
      db.select().from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, weekStart)
        )),

      db.select().from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, weekStart)
        )),

      db.select().from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, weekStart)
        )),

      db.select().from(dailyNutritionSummaryTable)
        .where(and(
          eq(dailyNutritionSummaryTable.userId, userId),
          gte(dailyNutritionSummaryTable.date, weekStart)
        ))
        .orderBy(desc(dailyNutritionSummaryTable.date)),

      db.select().from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),
    ]);

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0 };

    // Generate the weekly narrative
    const narrative = generateWeeklyNarrative(foodLogs, moodLogs, waterLogs, summaries, userGoals, weekStart, weekEnd);

    res.json({
      success: true,
      ...narrative,
    });
  } catch (error) {
    console.error('[Insights] Weekly narrative error:', error);
    errors.internal(res, 'Failed to generate weekly narrative');
  }
});

/**
 * GET /api/insights/what-to-change
 * Returns the #1 priority change recommendation
 */
router.get('/what-to-change', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    // Fetch data to analyze
    const [foodLogs, moodLogs, waterLogs, goals] = await Promise.all([
      db.select().from(foodLogTable)
        .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, startDate))),
      db.select().from(moodLogTable)
        .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, startDate))),
      db.select().from(waterLogTable)
        .where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, startDate))),
      db.select().from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),
    ]);

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0, dailyProtein: 100 };

    // Generate the priority recommendation
    const recommendation = generateWhatToChange(foodLogs, moodLogs, waterLogs, userGoals);

    res.json({
      success: true,
      dataPoints: foodLogs.length + moodLogs.length + waterLogs.length,
      ...recommendation,
    });
  } catch (error) {
    console.error('[Insights] What to change error:', error);
    errors.internal(res, 'Failed to generate recommendation');
  }
});

/**
 * GET /api/insights/ai-analysis
 * OpenAI-powered deep pattern analysis - generates comprehensive insights
 * This is a premium feature that uses GPT-4o for sophisticated analysis
 */
router.get('/ai-analysis', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { days = 14 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Fetch all user data for comprehensive analysis
    const [foodLogs, moodLogs, waterLogs, goals, summaries] = await Promise.all([
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      db.select()
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(waterLogTable.loggedDate)),

      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),

      db.select()
        .from(dailyNutritionSummaryTable)
        .where(and(
          eq(dailyNutritionSummaryTable.userId, userId),
          gte(dailyNutritionSummaryTable.date, startDate)
        ))
        .orderBy(desc(dailyNutritionSummaryTable.date)),
    ]);

    // Check minimum data requirements
    if (foodLogs.length < 5 || moodLogs.length < 3) {
      return res.json({
        success: true,
        hasEnoughData: false,
        message: 'Need more data for AI analysis',
        dataStatus: {
          foodLogs: foodLogs.length,
          moodLogs: moodLogs.length,
          waterLogs: waterLogs.length,
          minimumRequired: { food: 5, mood: 3 },
        },
        insights: [],
        patterns: [],
        recommendations: [],
      });
    }

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0, dailyProtein: 100 };

    // Prepare data summaries for AI
    const dataSummary = prepareDataForAI(foodLogs, moodLogs, waterLogs, userGoals);

    // Generate AI-powered insights
    const aiInsights = await generateAIPatternAnalysis(dataSummary, userGoals);

    res.json({
      success: true,
      hasEnoughData: true,
      dataPoints: {
        food: foodLogs.length,
        mood: moodLogs.length,
        water: waterLogs.length,
      },
      lookbackDays: parseInt(days),
      ...aiInsights,
    });
  } catch (error) {
    console.error('[Insights] AI analysis error:', error);

    // Fallback to rule-based if AI fails
    try {
      const fallbackInsights = generateFallbackInsights();
      return res.json({
        success: true,
        source: 'fallback',
        ...fallbackInsights,
      });
    } catch (fallbackError) {
      errors.internal(res, 'Failed to generate AI analysis');
    }
  }
});

/**
 * GET /api/insights/patterns/personalized
 * Returns personalized behavioral patterns discovered from correlation engine
 *
 * These are deep temporal patterns like:
 * - "Every time you skip breakfast, your 3pm mood crashes"
 * - "High-sugar dinners make you anxious the next morning"
 * - "On days you drink enough water, you're less irritable"
 * - "Morning exercise gives you all-day energy"
 */
router.get('/patterns/personalized', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { windowDays = 21 } = req.query;

    // Compute correlations using the enhanced correlation engine
    const result = await computeUserCorrelations(userId, {
      windowTypes: ['7d', '30d'], // Use 7-day and 30-day windows for personalized patterns
    });

    // Extract correlations array from result object
    const correlations = result?.correlations || [];

    if (!correlations || correlations.length === 0) {
      return res.json({
        success: true,
        hasEnoughData: false,
        message: 'Keep logging meals, mood, water, and activities to discover your personal patterns.',
        patterns: [],
        categories: {
          mealTiming: [],
          nextDayCarryover: [],
          hydration: [],
          activity: [],
          general: [],
        },
      });
    }

    // Transform correlations into user-friendly pattern statements
    const allPatterns = correlations
      .map(corr => formatCorrelationToPattern(corr))
      .filter(p => p !== null) // Remove null patterns
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

    // Deduplicate patterns - keep only the highest confidence pattern for each rule type
    const seenRules = new Set();
    const formattedPatterns = allPatterns.filter(pattern => {
      const key = pattern.type || pattern.statement;
      if (seenRules.has(key)) {
        return false; // Skip duplicate (already have higher confidence version)
      }
      seenRules.add(key);
      return true;
    });

    // Group patterns by category
    const categories = {
      mealTiming: formattedPatterns.filter(p => p.category === 'meal-timing'),
      nextDayCarryover: formattedPatterns.filter(p => p.category === 'next-day-carryover'),
      hydration: formattedPatterns.filter(p => p.category === 'hydration'),
      activity: formattedPatterns.filter(p => p.category === 'activity'),
      general: formattedPatterns.filter(p => !['meal-timing', 'next-day-carryover', 'hydration', 'activity'].includes(p.category)),
    };

    // Calculate overall data quality score
    const dataQuality = calculateDataQuality(correlations);

    res.json({
      success: true,
      hasEnoughData: true,
      windowDays: parseInt(windowDays),
      patternsFound: formattedPatterns.length,
      dataQuality,
      patterns: formattedPatterns,
      categories,
      // Top insight - most confident/impactful pattern
      topInsight: formattedPatterns.length > 0 ? formattedPatterns[0] : null,
    });
  } catch (error) {
    console.error('[Insights] Personalized patterns error:', error);
    // PRODUCTION FIX: Return graceful fallback instead of 500
    res.json({
      success: false,
      hasEnoughData: false,
      message: 'Personalized patterns temporarily unavailable. Keep logging to build your pattern history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      patterns: [],
      categories: {
        mealTiming: [],
        nextDayCarryover: [],
        hydration: [],
        activity: [],
        general: [],
      },
      topInsight: null,
    });
  }
});

/**
 * Transform a correlation object into a user-friendly pattern statement
 * Handles both the new correlation engine format and legacy format
 */
function formatCorrelationToPattern(correlation) {
  // Handle the correlation engine's format (ruleName, correlationType, etc.)
  const ruleName = correlation.ruleName || correlation.type;
  const strength = correlation.strength || 0;
  const confidence = correlation.confidence || 0;
  const occurrences = correlation.occurrences || 1;
  const expectedOutcome = correlation.expectedOutcome || correlation.explanation || '';

  // Generate natural language statement based on rule name
  let statement = '';
  let category = 'general';
  let icon = 'analytics-outline';
  let impactType = 'neutral';

  // Determine if this is a positive or negative pattern based on the rule
  const isPositive = strength > 0 && !ruleName?.includes('crash') && !ruleName?.includes('negative');
  impactType = isPositive ? 'positive' : 'negative';

  // Map correlation engine rule names to user-friendly patterns
  switch (ruleName) {
    // High NOVA/Sugar mood impacts
    case 'high_nova_mood_crash':
      category = 'meal-timing';
      icon = 'nutrition-outline';
      impactType = 'negative';
      statement = 'High-sugar, processed foods tend to cause mood dips 2-4 hours later';
      break;

    // Breakfast patterns
    case 'breakfast_skip_afternoon_crash':
    case 'breakfast-skip-afternoon-crash':
      category = 'meal-timing';
      icon = 'sunny-outline';
      impactType = 'negative';
      statement = 'When you skip breakfast, your mood tends to crash around 3pm';
      break;

    case 'breakfast_afternoon_boost':
    case 'breakfast-afternoon-boost':
      category = 'meal-timing';
      icon = 'sunny-outline';
      impactType = 'positive';
      statement = 'Having breakfast keeps your afternoon mood stable';
      break;

    case 'protein_breakfast_energy':
    case 'protein-breakfast-energy':
      category = 'meal-timing';
      icon = 'fitness-outline';
      impactType = 'positive';
      statement = 'Protein-rich breakfasts give you sustained energy through the morning';
      break;

    // Sugar dinner patterns
    case 'high_sugar_dinner_morning_anxiety':
    case 'high-sugar-dinner-morning-anxiety':
      category = 'next-day-carryover';
      icon = 'moon-outline';
      impactType = 'negative';
      statement = 'High-sugar dinners tend to make you feel anxious the next morning';
      break;

    case 'evening_meal_next_day':
      category = 'next-day-carryover';
      icon = 'moon-outline';
      statement = 'What you eat in the evening affects how you feel the next morning';
      break;

    // Hydration patterns
    case 'hydration_mood_correlation':
    case 'hydration_mood_stability':
    case 'hydration-mood-stability':
      category = 'hydration';
      icon = 'water-outline';
      impactType = isPositive ? 'positive' : 'negative';
      statement = isPositive
        ? 'On days you drink enough water, you\'re noticeably less irritable'
        : 'Low hydration days tend to correlate with more irritability';
      break;

    case 'dehydration_mood_impact':
    case 'dehydration-mood-impact':
      category = 'hydration';
      icon = 'water-outline';
      impactType = 'negative';
      statement = 'Poor hydration days show higher negative moods and irritability';
      break;

    // Activity patterns
    case 'exercise_mood_boost':
    case 'exercise-mood-boost':
    case 'activity_mood_correlation':
      category = 'activity';
      icon = 'barbell-outline';
      impactType = 'positive';
      statement = 'Exercise gives you a same-day mood boost';
      break;

    case 'morning_exercise_energy':
    case 'morning-exercise-all-day-energy':
      category = 'activity';
      icon = 'sunny-outline';
      impactType = 'positive';
      statement = 'Morning workouts give you energy that lasts all day';
      break;

    case 'sedentary_mood_impact':
    case 'sedentary-mood-impact':
      category = 'activity';
      icon = 'walk-outline';
      impactType = 'negative';
      statement = 'Days without physical activity tend to have lower mood scores';
      break;

    case 'consistent_exercise_stability':
    case 'consistent-exercise-stability':
      category = 'activity';
      icon = 'trending-up-outline';
      impactType = 'positive';
      statement = 'Regular exercise is keeping your mood consistently positive';
      break;

    // Generic fallback
    default:
      // Try to generate a meaningful statement from the correlation data
      if (expectedOutcome) {
        statement = expectedOutcome;
      } else if (correlation.signalA && correlation.signalB) {
        const signalA = formatSignalName(correlation.signalA);
        const signalB = formatSignalName(correlation.signalB);
        statement = `${signalA} appears to affect ${signalB}`;
      } else {
        statement = 'A pattern was detected in your data';
      }
  }

  // Calculate user-friendly confidence label
  let confidenceLabel = 'possible';
  if (confidence >= 0.8) confidenceLabel = 'very likely';
  else if (confidence >= 0.65) confidenceLabel = 'likely';
  else if (confidence >= 0.5) confidenceLabel = 'possible';

  return {
    id: `${ruleName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: ruleName,
    category,
    icon,
    statement,
    impactType,
    strength: Math.abs(strength),
    confidence,
    confidenceLabel,
    occurrences,
    suggestion: generateSuggestionForPattern(ruleName, impactType),
    // Include raw data for debugging/details
    _raw: {
      signalA: correlation.signalA,
      signalB: correlation.signalB,
      windowType: correlation.windowType,
      expectedOutcome,
    },
  };
}

/**
 * Format signal name to human-readable text
 */
function formatSignalName(signal) {
  if (!signal) return 'unknown';
  return signal
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
}

/**
 * Generate actionable suggestion for a pattern type
 */
function generateSuggestionForPattern(type, impactType) {
  // Normalize the type to handle both underscore and hyphen formats
  const normalizedType = type?.replace(/_/g, '-');

  const suggestions = {
    // High NOVA/Sugar patterns
    'high-nova-mood-crash': 'Try adding protein or fiber to meals to stabilize blood sugar and prevent mood dips.',

    // Breakfast patterns
    'breakfast-skip-afternoon-crash': 'Try having a light breakfast, even just yogurt or fruit, to prevent the afternoon energy dip.',
    'breakfast-afternoon-boost': 'Keep up the breakfast habit! Your body clearly benefits from morning fuel.',
    'protein-breakfast-energy': 'Keep including protein in breakfast - eggs, yogurt, or nuts work great.',

    // Dinner/carryover patterns
    'high-sugar-dinner-morning-anxiety': 'Consider reducing sugar at dinner - try protein-rich foods instead.',
    'evening-meal-next-day': 'Pay attention to what you eat in the evening - it affects tomorrow\'s energy.',

    // Hydration patterns
    'hydration-mood-stability': impactType === 'positive'
      ? 'Great job staying hydrated! Keep aiming for your water goal.'
      : 'Try setting water reminders throughout the day.',
    'hydration-mood-correlation': impactType === 'positive'
      ? 'Staying hydrated is clearly working for your mood!'
      : 'Try drinking more water - your mood may improve.',
    'dehydration-mood-impact': 'Start each meal with a glass of water to build the habit.',

    // Activity patterns
    'exercise-mood-boost': 'Your mood loves activity! Try to move a little every day.',
    'activity-mood-correlation': 'Physical activity is great for your mood - keep it up!',
    'morning-exercise-all-day-energy': 'Morning workouts work well for you - consider making them a routine.',
    'morning-exercise-energy': 'Morning workouts work well for you - consider making them a routine.',
    'sedentary-mood-impact': 'Even a short 10-minute walk can help boost your mood.',
    'consistent-exercise-stability': 'Your consistent exercise is paying off - keep it up!',

    // Timing patterns
    'meal-timing-stability': 'Eating at regular times helps regulate your energy and mood.',
    'evening-exercise-next-day-impact': impactType === 'positive'
      ? 'Evening exercise works well for you!'
      : 'Consider moving intense workouts earlier in the day.',
  };

  return suggestions[normalizedType] || 'Keep tracking to learn more about your patterns.';
}

/**
 * Calculate data quality score based on correlation confidence and occurrences
 */
function calculateDataQuality(correlations) {
  if (!correlations || correlations.length === 0) {
    return { score: 0, label: 'insufficient', suggestion: 'Log more meals, mood, and activities' };
  }

  const avgConfidence = correlations.reduce((sum, c) => sum + (c.confidence || 0), 0) / correlations.length;
  const totalOccurrences = correlations.reduce((sum, c) => sum + (c.occurrences || 1), 0);

  // Score based on confidence and number of patterns found
  const score = Math.round((avgConfidence * 50) + Math.min(correlations.length * 5, 50));

  let label = 'basic';
  let suggestion = 'Keep logging to improve pattern detection';

  if (score >= 80) {
    label = 'excellent';
    suggestion = 'Great data! Patterns are highly reliable';
  } else if (score >= 60) {
    label = 'good';
    suggestion = 'Solid patterns detected with good confidence';
  } else if (score >= 40) {
    label = 'moderate';
    suggestion = 'More consistent logging will improve insights';
  }

  return { score, label, suggestion, avgConfidence: Math.round(avgConfidence * 100), patternsFound: correlations.length };
}

/**
 * Prepare data summary for AI analysis
 */
function prepareDataForAI(foodLogs, moodLogs, waterLogs, goals) {
  // Food summary
  const foodStats = {
    totalMeals: foodLogs.length,
    avgCalories: Math.round(foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0) / foodLogs.length),
    avgProtein: Math.round(foodLogs.reduce((sum, f) => sum + (f.protein || 0), 0) / foodLogs.length),
    avgCarbs: Math.round(foodLogs.reduce((sum, f) => sum + (f.carbs || 0), 0) / foodLogs.length),
    avgFat: Math.round(foodLogs.reduce((sum, f) => sum + (f.fats || 0), 0) / foodLogs.length),
    avgSugar: Math.round(foodLogs.reduce((sum, f) => sum + (f.sugar || 0), 0) / foodLogs.length),
    avgNovaScore: (foodLogs.reduce((sum, f) => sum + (f.novaScore || 1), 0) / foodLogs.length).toFixed(1),
    mealsByTime: analyzeMealTiming(foodLogs),
    topFoods: getTopFoods(foodLogs),
  };

  // Mood summary
  const moodStats = {
    totalEntries: moodLogs.length,
    avgIntensity: (moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length).toFixed(1),
    avgEnergy: (moodLogs.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / moodLogs.length).toFixed(1),
    moodDistribution: getMoodDistribution(moodLogs),
    dominantMood: getDominantMood(moodLogs),
    moodByTime: analyzeMoodTiming(moodLogs),
  };

  // Water summary
  const waterStats = {
    totalLogs: waterLogs.length,
    avgDailyIntake: calculateAvgDailyWater(waterLogs),
    goalProgress: calculateWaterGoalProgress(waterLogs, goals.waterLiters || 2.0),
    hydrationPattern: analyzeHydrationPattern(waterLogs),
  };

  // Temporal patterns
  const temporalPatterns = analyzeTemporalPatterns(foodLogs, moodLogs, waterLogs);

  return {
    food: foodStats,
    mood: moodStats,
    water: waterStats,
    temporal: temporalPatterns,
    goals,
  };
}

/**
 * Generate AI-powered pattern analysis using OpenAI
 */
async function generateAIPatternAnalysis(dataSummary, goals) {
  const systemPrompt = `You are an expert nutritionist and health data analyst. Your role is to analyze food, mood, and hydration data to identify meaningful patterns and provide actionable insights.

CRITICAL RULES:
- Use probabilistic language: "tends to", "may", "appears to correlate with", "often"
- NEVER use diagnostic language: "you have", "you are", "definitely"
- Focus on patterns and correlations, not causation
- Only report patterns with sufficient evidence (at least 5+ occurrences)
- Be encouraging and supportive
- Provide specific, actionable recommendations
- Reference specific numbers from the data

DATA QUALITY RULES:
- Zero values (0g sugar, 0 calories) usually mean MISSING DATA, not actual zeros
- NEVER celebrate 0g of any nutrient as an "achievement" - it indicates incomplete tracking
- Only create achievements for ACTUAL progress toward goals (>50% of goal reached)
- If data looks suspicious (all zeros, impossible values), skip that metric

INSIGHT STRUCTURE RULES:
- Title: What the pattern IS (e.g., "Evening meals tend to improve next-day mood")
- Statement: Evidence and data points supporting it
- Suggestion: DIFFERENT from title - specific action to take (e.g., "Try having dinner before 7pm")
- NEVER make title and suggestion the same text`;

  const userPrompt = `Analyze this health data and identify patterns:

**FOOD DATA (${dataSummary.food.totalMeals} meals):**
- Average daily: ${dataSummary.food.avgCalories} cal, ${dataSummary.food.avgProtein}g protein, ${dataSummary.food.avgCarbs}g carbs, ${dataSummary.food.avgFat}g fat
- Sugar intake: avg ${dataSummary.food.avgSugar}g per meal ${dataSummary.food.avgSugar === 0 ? '(likely incomplete tracking - ignore for achievements)' : ''}
- Food processing level (NOVA): ${dataSummary.food.avgNovaScore}/4
- Meal timing: ${JSON.stringify(dataSummary.food.mealsByTime)}
- Frequent foods: ${dataSummary.food.topFoods.join(', ')}

**MOOD DATA (${dataSummary.mood.totalEntries} entries):**
- Average intensity: ${dataSummary.mood.avgIntensity}/10
- Average energy: ${dataSummary.mood.avgEnergy}/10
- Dominant mood: ${dataSummary.mood.dominantMood}
- Distribution: ${JSON.stringify(dataSummary.mood.moodDistribution)}
- Timing patterns: ${JSON.stringify(dataSummary.mood.moodByTime)}

**HYDRATION DATA (${dataSummary.water.totalLogs} logs):**
- Daily average: ${dataSummary.water.avgDailyIntake}L
- Goal progress: ${dataSummary.water.goalProgress}%
- Pattern: ${dataSummary.water.hydrationPattern}

**USER GOALS:**
- Daily calories: ${goals.dailyCalories || 2000}
- Daily protein: ${goals.dailyProtein || 100}g
- Water target: ${goals.waterLiters || 2.0}L

Provide analysis in this JSON format:
{
  "insights": [
    {
      "type": "correlation" | "prediction" | "recommendation" | "achievement",
      "title": "What the pattern IS (5-8 words, e.g. 'Morning protein boosts afternoon energy')",
      "statement": "Evidence: specific data points that support this (1-2 sentences)",
      "confidence": 0.7-1.0 (only include insights with 70%+ confidence),
      "evidencePoints": ["specific data point 1", "specific data point 2"],
      "affectedDomains": ["energy", "mood", "nutrition", "hydration"],
      "suggestion": "DIFFERENT from title - specific action (e.g. 'Add eggs or yogurt to breakfast')"
    }
  ],
  NOTE: Only create "achievement" type for REAL progress (hitting >50% of a goal). Never celebrate 0g values.
  "patterns": [
    {
      "pattern": "When X happens, Y tends to follow",
      "factor": "X (cause/trigger)",
      "outcome": "Y (effect/result)",
      "strength": 0.0-1.0,
      "occurrences": number,
      "type": "positive" | "negative" | "neutral",
      "timelag": "immediate" | "2-4 hours" | "next day"
    }
  ],
  "priorityRecommendation": {
    "title": "Top change to make",
    "why": "Reason based on data",
    "impact": "Expected benefit",
    "difficulty": "easy" | "medium" | "hard"
  },
  "weeklyStory": "2-3 sentence narrative summarizing the week's health patterns"
}`;

  try {
    const response = await openai.chatCompletionJSON(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.3,
      }
    );

    // Add source attribution
    return {
      source: 'ai',
      model: 'gpt-4o-mini',
      analyzedAt: new Date().toISOString(),
      ...response,
    };
  } catch (error) {
    console.error('[AI Analysis] OpenAI call failed:', error);
    throw error;
  }
}

/**
 * Generate fallback insights if AI fails
 */
function generateFallbackInsights() {
  return {
    insights: [
      {
        type: 'recommendation',
        title: 'Keep logging for insights',
        statement: 'Continue tracking your meals and mood to unlock personalized patterns.',
        confidence: 0.5,
        evidencePoints: [],
        affectedDomains: ['nutrition'],
        suggestion: 'Log at least 2 meals and 1 mood entry daily',
      }
    ],
    patterns: [],
    priorityRecommendation: {
      title: 'Build your data baseline',
      why: 'More data enables better insights',
      impact: 'Unlock personalized recommendations',
      difficulty: 'easy',
    },
    weeklyStory: 'Keep logging to build your personal health profile.',
  };
}

// AI Helper Functions
function analyzeMealTiming(foodLogs) {
  const timing = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
  foodLogs.forEach(log => {
    const hour = new Date(log.loggedDate).getHours();
    if (hour >= 5 && hour < 10) timing.breakfast++;
    else if (hour >= 11 && hour < 14) timing.lunch++;
    else if (hour >= 17 && hour < 21) timing.dinner++;
    else timing.snacks++;
  });
  return timing;
}

function getTopFoods(foodLogs) {
  const foodCounts = {};
  foodLogs.forEach(log => {
    const name = log.foodName || 'Unknown';
    foodCounts[name] = (foodCounts[name] || 0) + 1;
  });
  return Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}

function getMoodDistribution(moodLogs) {
  const dist = {};
  moodLogs.forEach(log => {
    const mood = log.mood || 'neutral';
    dist[mood] = (dist[mood] || 0) + 1;
  });
  return dist;
}

function getDominantMood(moodLogs) {
  const dist = getMoodDistribution(moodLogs);
  return Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
}

function analyzeMoodTiming(moodLogs) {
  const timing = { morning: [], afternoon: [], evening: [] };
  moodLogs.forEach(log => {
    const hour = new Date(log.loggedDate).getHours();
    const mood = log.mood || 'neutral';
    if (hour >= 5 && hour < 12) timing.morning.push(mood);
    else if (hour >= 12 && hour < 18) timing.afternoon.push(mood);
    else timing.evening.push(mood);
  });
  return {
    morning: getDominantFromArray(timing.morning),
    afternoon: getDominantFromArray(timing.afternoon),
    evening: getDominantFromArray(timing.evening),
  };
}

function getDominantFromArray(arr) {
  if (!arr.length) return null;
  const counts = {};
  arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function calculateAvgDailyWater(waterLogs) {
  if (!waterLogs.length) return 0;
  const dailyTotals = {};
  waterLogs.forEach(log => {
    const date = new Date(log.loggedDate).toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + parseFloat(log.hydrationLiters || log.amountLiters || 0);
  });
  const total = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
  return (total / Object.keys(dailyTotals).length).toFixed(1);
}

function calculateWaterGoalProgress(waterLogs, goal) {
  if (!waterLogs.length) return 0;
  const dailyTotals = {};
  waterLogs.forEach(log => {
    const date = new Date(log.loggedDate).toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + parseFloat(log.hydrationLiters || log.amountLiters || 0);
  });
  const goalDays = Object.values(dailyTotals).filter(v => v >= goal).length;
  return Math.round((goalDays / Object.keys(dailyTotals).length) * 100);
}

function analyzeHydrationPattern(waterLogs) {
  if (!waterLogs.length) return 'insufficient data';
  const avgDailyWater = calculateAvgDailyWater(waterLogs);
  if (avgDailyWater >= 2.5) return 'excellent';
  if (avgDailyWater >= 2.0) return 'good';
  if (avgDailyWater >= 1.5) return 'moderate';
  return 'needs improvement';
}

function analyzeTemporalPatterns(foodLogs, moodLogs, waterLogs) {
  // Analyze day-of-week patterns
  const dayPatterns = {};
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  foodLogs.forEach(log => {
    const day = days[new Date(log.loggedDate).getDay()];
    if (!dayPatterns[day]) dayPatterns[day] = { meals: 0, avgCalories: 0 };
    dayPatterns[day].meals++;
    dayPatterns[day].avgCalories += log.calories || 0;
  });

  // Calculate averages
  Object.keys(dayPatterns).forEach(day => {
    if (dayPatterns[day].meals > 0) {
      dayPatterns[day].avgCalories = Math.round(dayPatterns[day].avgCalories / dayPatterns[day].meals);
    }
  });

  return { byDayOfWeek: dayPatterns };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate predictive insights based on historical patterns
 * Returns predictions from Day 2 onwards with early-stage insights
 */
function generatePredictiveInsights(foodLogs, moodLogs, waterLogs, goals) {
  const predictions = {};
  const totalDataDays = new Set([
    ...foodLogs.map(f => new Date(f.loggedDate).toDateString()),
    ...moodLogs.map(m => new Date(m.loggedDate).toDateString()),
    ...waterLogs.map(w => new Date(w.loggedDate).toDateString()),
  ]).size;

  // Minimum 2 days required for any predictions
  const MIN_DAYS = 2;
  const hasMinimumData = totalDataDays >= MIN_DAYS;

  // Energy Prediction
  const hourlyEnergy = analyzeEnergyPatterns(foodLogs, moodLogs);
  const energyDipHour = findEnergyDip(hourlyEnergy);

  if (energyDipHour) {
    predictions.energy = {
      statement: `Based on your meal timing, you may experience an energy dip around ${formatHour(energyDipHour)}.`,
      hourlyLevels: hourlyEnergy,
      prevention: `Have a protein-rich snack at ${formatHour(energyDipHour - 1)} to maintain steady energy`,
      confidence: calculateConfidence(moodLogs.length, 7),
    };
  } else if (hasMinimumData && foodLogs.length > 0) {
    // Early-stage energy prediction based on meal distribution
    const avgMealsPerDay = foodLogs.length / Math.max(totalDataDays, 1);
    const hasRegularMeals = avgMealsPerDay >= 2;
    const confidenceLevel = Math.min(80, 30 + (totalDataDays * 5));
    predictions.energy = {
      statement: hasRegularMeals
        ? `Your meal pattern shows ${Math.round(avgMealsPerDay)} meals/day. This supports steady energy.`
        : `Logging ${Math.round(avgMealsPerDay)} meal/day so far. Aim for 3 meals for optimal energy.`,
      hourlyLevels: hourlyEnergy,
      prevention: hasRegularMeals
        ? `Keep up your current routine with balanced meals`
        : `Try adding breakfast and a midday meal for better energy`,
      confidence: confidenceLevel,
      type: 'early',
      daysAnalyzed: totalDataDays,
    };
  }

  // Mood Pattern
  const moodPatterns = analyzeMoodPatterns(moodLogs, foodLogs);
  if (moodPatterns.correlation) {
    predictions.mood = {
      statement: moodPatterns.statement,
      moodScores: moodPatterns.scores,
      factor: moodPatterns.factor,
      percentage: moodPatterns.percentage,
      suggestion: moodPatterns.suggestion,
      confidence: moodPatterns.confidence,
    };
  } else if (hasMinimumData && moodLogs.length >= 1) {
    // Early-stage mood insight
    const avgMood = moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length;
    const moodTrend = avgMood >= 7 ? 'great' : avgMood >= 5 ? 'good' : 'could improve';
    const confidenceLevel = Math.min(75, 25 + (moodLogs.length * 8));
    predictions.mood = {
      statement: moodLogs.length === 1
        ? `First mood logged at ${Math.round(avgMood)}/10. Keep tracking to see patterns emerge.`
        : `Average mood: ${avgMood.toFixed(1)}/10 across ${moodLogs.length} entries. ${moodTrend === 'great' ? 'Looking great!' : 'Keep logging to find what affects it.'}`,
      moodScores: { average: Math.round(avgMood * 10) / 10, count: moodLogs.length },
      factor: 'overall wellness',
      percentage: Math.round(avgMood * 10),
      suggestion: moodTrend === 'great'
        ? 'Note what you did today - it\'s working!'
        : 'Track meals and activities to find mood boosters',
      confidence: confidenceLevel,
      type: 'early',
      daysAnalyzed: totalDataDays,
    };
  }

  // Nutrient Projection
  const nutrientGaps = analyzeNutrientGaps(foodLogs, goals);
  if (nutrientGaps.length > 0) {
    predictions.nutrients = {
      statement: `At your current rate, you may fall short on ${nutrientGaps.map(n => n.name).join(' and ')} this week.`,
      nutrients: nutrientGaps,
      recommendation: generateNutrientRecommendation(nutrientGaps),
      confidence: calculateConfidence(foodLogs.length, 7),
    };
  } else if (hasMinimumData && foodLogs.length >= 1) {
    // Early-stage nutrient insight
    const avgCalories = foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0) / foodLogs.length;
    const avgProtein = foodLogs.reduce((sum, f) => sum + (f.protein || 0), 0) / foodLogs.length;
    const calorieGoal = goals.dailyCalories || 2000;
    const proteinGoal = goals.proteinG || 50;

    const meetsCalories = avgCalories >= calorieGoal * 0.8;
    const meetsProtein = avgProtein >= proteinGoal * 0.8;

    const confidenceLevel = Math.min(75, 25 + (foodLogs.length * 5));
    predictions.nutrients = {
      statement: foodLogs.length === 1
        ? `First meal: ${Math.round(avgCalories)} cal, ${Math.round(avgProtein)}g protein. Keep logging!`
        : meetsCalories && meetsProtein
        ? `Averaging ${Math.round(avgCalories)} cal & ${Math.round(avgProtein)}g protein. On track!`
        : `Averaging ${Math.round(avgCalories)} cal across ${foodLogs.length} meals. Goal: ${calorieGoal}.`,
      nutrients: [
        { name: 'Calories', current: Math.round(avgCalories), goal: calorieGoal },
        { name: 'Protein', current: Math.round(avgProtein), goal: proteinGoal },
      ],
      recommendation: foodLogs.length < 3
        ? 'Log more meals to get accurate daily averages'
        : meetsCalories && meetsProtein
        ? 'Maintain your current balanced approach'
        : 'Consider adding lean protein sources',
      confidence: confidenceLevel,
      type: 'early',
      daysAnalyzed: totalDataDays,
    };
  }

  return predictions;
}

/**
 * Generate behavioral correlations from mood and food data
 */
function generateBehavioralCorrelations(moods, foods) {
  const correlations = [];

  // Analyze breakfast timing correlation
  const breakfastLogs = foods.filter(f => {
    const hour = new Date(f.loggedDate).getHours();
    return hour >= 5 && hour < 10;
  });

  if (breakfastLogs.length > 5) {
    const earlyBreakfastDays = breakfastLogs.filter(f => new Date(f.loggedDate).getHours() < 8);
    const waterOnEarlyDays = earlyBreakfastDays.length; // Simplified correlation

    if (earlyBreakfastDays.length / breakfastLogs.length > 0.5) {
      correlations.push({
        id: 'breakfast-timing',
        factor: 'eat breakfast before 8am',
        outcome: 'more consistent energy',
        type: 'positive',
        correlation: Math.round((earlyBreakfastDays.length / breakfastLogs.length) * 100),
        dataPoints: breakfastLogs.length,
        instances: earlyBreakfastDays.length,
        confidence: Math.min(85, 50 + breakfastLogs.length * 2),
        explanation: 'Early eaters tend to maintain more consistent energy throughout the day.',
        suggestion: 'Keep up the early breakfast habit to maintain good energy levels',
      });
    }
  }

  // Analyze sugar-energy correlation
  const highSugarMeals = foods.filter(f => (f.sugar || 0) > 20);
  const lowEnergyMoods = moods.filter(m => (m.energyLevel || 5) < 5);

  if (highSugarMeals.length > 3 && lowEnergyMoods.length > 3) {
    correlations.push({
      id: 'sugar-energy',
      factor: 'high-sugar lunch',
      outcome: 'afternoon tiredness',
      type: 'negative',
      correlation: Math.min(75, highSugarMeals.length * 5),
      dataPoints: foods.length,
      instances: highSugarMeals.length,
      confidence: Math.min(80, 45 + highSugarMeals.length * 3),
      explanation: 'Sugar spikes lead to crashes, affecting your energy in the afternoon.',
      suggestion: 'Try protein + fiber at lunch to avoid the crash',
    });
  }

  // Analyze protein-mood correlation
  const avgProtein = foods.reduce((sum, f) => sum + (f.protein || 0), 0) / Math.max(foods.length, 1);
  const avgMood = moods.reduce((sum, m) => sum + (m.intensity || 5), 0) / Math.max(moods.length, 1);

  if (avgProtein > 25 && avgMood > 6.5) {
    correlations.push({
      id: 'protein-mood',
      factor: 'adequate protein intake',
      outcome: 'stable mood',
      type: 'positive',
      correlation: Math.round(avgMood * 10),
      dataPoints: foods.length,
      instances: foods.filter(f => (f.protein || 0) > 20).length,
      confidence: Math.min(78, 50 + moods.length * 2),
      explanation: 'Protein helps maintain stable blood sugar, supporting steady mood.',
      suggestion: 'Continue including protein in each meal for mood stability',
    });
  }

  return correlations.slice(0, 5);
}

/**
 * Generate weekly narrative story
 */
function generateWeeklyNarrative(foodLogs, moodLogs, waterLogs, summaries, goals, weekStart, weekEnd) {
  const totalMeals = foodLogs.length;
  const mealGoal = 21; // 3 meals x 7 days

  // Calculate water goal days
  const waterByDay = {};
  waterLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    waterByDay[dateKey] = (waterByDay[dateKey] || 0) + parseFloat(log.amountLiters || log.hydrationLiters || 0);
  });
  const waterGoalDays = Object.values(waterByDay).filter(l => l >= (goals.waterLiters || 2.0)).length;

  // Calculate average mood
  const avgMood = moodLogs.length > 0
    ? moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length
    : 5;

  // Calculate average nutri-score
  const nutriScores = foodLogs.filter(f => f.nutriScore).map(f => f.nutriScore);
  const avgNutriScore = nutriScores.length > 0
    ? nutriScores.reduce((sum, s) => sum + s, 0) / nutriScores.length
    : 3;
  const nutriGrade = getNutriGrade(avgNutriScore);

  // Generate narrative
  const highlights = [];
  let narrative = 'This week ';

  if (waterGoalDays >= 5) {
    narrative += `showed real progress in your hydration habitsâ€”you hit your water goal ${waterGoalDays} out of 7 days. `;
    highlights.push(`Hydration goal met ${waterGoalDays}/7 days`);
  } else if (waterGoalDays >= 3) {
    narrative += `you made solid progress with hydration, hitting your goal ${waterGoalDays} days. `;
    highlights.push(`Hydration goal met ${waterGoalDays}/7 days`);
  }

  if (nutriGrade === 'B' || nutriGrade === 'A') {
    narrative += `Your average Nutri-Score was a solid ${nutriGrade}. `;
    highlights.push(`Average Nutri-Score: ${nutriGrade}`);
  }

  if (avgMood >= 7) {
    narrative += `Overall mood has been positive with an average of ${avgMood.toFixed(1)}/10. `;
    highlights.push(`Mood average: ${avgMood.toFixed(1)}/10`);
  }

  if (totalMeals >= 18) {
    narrative += `Great job logging ${totalMeals} meals this week! `;
    highlights.push(`${totalMeals} meals logged`);
  }

  if (!narrative.includes('This week ')) {
    narrative = 'This week you logged your meals and tracked your wellness. Keep building the habit for more insights!';
  }

  // Focus areas
  const focusAreas = [];
  if (waterGoalDays < 5) {
    focusAreas.push({ text: 'Aim for 5+ water goal days next week', priority: 'high' });
  }
  if (totalMeals < 14) {
    focusAreas.push({ text: 'Try to log at least 2 meals per day', priority: 'medium' });
  }
  if (avgMood < 6) {
    focusAreas.push({ text: 'Notice what affects your mood throughout the day', priority: 'medium' });
  }

  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    weekRange: 'This Week',
    dateLabel: `${startStr} - ${endStr}`,
    narrative: narrative.trim(),
    highlights,
    metrics: {
      mealsLogged: { value: `${totalMeals}/${mealGoal}`, trend: totalMeals >= 18 ? 'up' : null },
      nutriScore: { current: nutriGrade, previous: null },
      waterGoalDays: { value: `${waterGoalDays}/7`, trend: waterGoalDays >= 5 ? 'up' : null },
      moodAverage: { value: avgMood.toFixed(1), trend: avgMood >= 7 ? 'up' : null },
    },
    focusAreas,
  };
}

/**
 * Generate the #1 priority change recommendation
 */
function generateWhatToChange(foodLogs, moodLogs, waterLogs, goals) {
  const issues = [];

  // Check for nutrient gaps
  const avgProtein = foodLogs.reduce((sum, f) => sum + (f.protein || 0), 0) / Math.max(foodLogs.length, 1);
  if (avgProtein < (goals.dailyProtein || 100) * 0.7) {
    issues.push({
      type: 'protein',
      severity: 3,
      title: 'Increase protein intake',
      whyMatters: [
        `Your protein is ${Math.round(avgProtein)}g/day, below the ${goals.dailyProtein || 100}g target`,
        'Protein helps maintain muscle and stabilizes energy',
        'Higher protein meals tend to correlate with better mood in your logs',
      ],
    });
  }

  // Check for hydration
  const waterByDay = {};
  waterLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    waterByDay[dateKey] = (waterByDay[dateKey] || 0) + parseFloat(log.amountLiters || log.hydrationLiters || 0);
  });
  const avgWater = Object.values(waterByDay).reduce((sum, v) => sum + v, 0) / Math.max(Object.keys(waterByDay).length, 1);

  if (avgWater < (goals.waterLiters || 2.0) * 0.8) {
    issues.push({
      type: 'hydration',
      severity: 2,
      title: 'Improve hydration',
      whyMatters: [
        `You're averaging ${avgWater.toFixed(1)}L/day, below your ${goals.waterLiters || 2.0}L goal`,
        'Proper hydration supports energy and cognitive function',
        'Many of your lower energy days correlate with low water intake',
      ],
    });
  }

  // Check for meal logging consistency
  if (foodLogs.length < 14) {
    issues.push({
      type: 'logging',
      severity: 1,
      title: 'Log meals more consistently',
      whyMatters: [
        'More data helps us provide better personalized insights',
        'Consistent logging reveals patterns you might not notice',
        'Aim for at least 2 meals logged per day',
      ],
    });
  }

  // Sort by severity and return the top issue
  issues.sort((a, b) => b.severity - a.severity);

  if (issues.length === 0) {
    return {
      title: 'Keep up the great work!',
      subtitle: "You're hitting your goals. Consider setting new targets to continue growing.",
      whyMatters: ['Your nutrition and hydration are on track', 'Mood patterns are stable'],
      difficulty: 'easy',
      impact: 'medium',
      confidence: 75,
      dataPoints: foodLogs.length + moodLogs.length,
    };
  }

  const topIssue = issues[0];

  return {
    title: topIssue.title,
    subtitle: getSubtitle(topIssue.type),
    whyMatters: topIssue.whyMatters,
    difficulty: 'easy',
    impact: 'high',
    timeRequired: getTimeRequired(topIssue.type),
    schedule: getSchedule(topIssue.type),
    alternatives: issues.slice(1, 3).map(i => i.title),
    confidence: Math.min(90, 60 + foodLogs.length),
    dataPoints: foodLogs.length + moodLogs.length + waterLogs.length,
  };
}

// Helper functions
function analyzeEnergyPatterns(foodLogs, moodLogs) {
  const hourlyEnergy = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);

  moodLogs.forEach(m => {
    const hour = new Date(m.loggedDate).getHours();
    hourlyEnergy[hour] += m.energyLevel || 5;
    hourlyCounts[hour]++;
  });

  return hourlyEnergy.map((sum, i) => hourlyCounts[i] > 0 ? Math.round(sum / hourlyCounts[i] * 10) : 50);
}

function findEnergyDip(hourlyEnergy) {
  let minEnergy = 100;
  let dipHour = null;

  for (let i = 12; i < 18; i++) {
    if (hourlyEnergy[i] < minEnergy && hourlyEnergy[i] < 50) {
      minEnergy = hourlyEnergy[i];
      dipHour = i;
    }
  }

  return dipHour;
}

function analyzeMoodPatterns(moodLogs, foodLogs) {
  if (moodLogs.length < 7) return { correlation: false };

  const lowEnergyMoods = moodLogs.filter(m => (m.energyLevel || 5) < 5);
  const highSugarMeals = foodLogs.filter(f => (f.sugar || 0) > 25);

  if (lowEnergyMoods.length > 3 && highSugarMeals.length > 3) {
    return {
      correlation: true,
      statement: 'High-sugar lunches correlate with afternoon tiredness in your patterns.',
      scores: moodLogs.slice(0, 7).map(m => m.intensity || 5),
      factor: 'High-sugar lunches',
      percentage: Math.round((lowEnergyMoods.length / moodLogs.length) * 100),
      suggestion: 'Try a balanced lunch with protein and fiber',
      confidence: Math.min(75, 50 + moodLogs.length),
    };
  }

  return { correlation: false };
}

function analyzeNutrientGaps(foodLogs, goals) {
  if (foodLogs.length < 7) return [];

  const gaps = [];
  const avgProtein = foodLogs.reduce((sum, f) => sum + (f.protein || 0), 0) / foodLogs.length;
  const goalProtein = goals.dailyProtein || 100;

  if (avgProtein < goalProtein * 0.7) {
    gaps.push({
      name: 'Protein',
      current: Math.round((avgProtein / goalProtein) * 100),
      target: 100,
      projected: Math.round((avgProtein / goalProtein) * 100) + 5,
      unit: 'g',
    });
  }

  return gaps;
}

function generateNutrientRecommendation(gaps) {
  if (gaps.some(g => g.name === 'Protein')) {
    return 'Add a protein source to each meal - eggs, Greek yogurt, or lean meat';
  }
  return 'Focus on nutrient-dense whole foods';
}

function calculateConfidence(dataPoints, minRequired) {
  return Math.min(90, 50 + Math.round((dataPoints / minRequired) * 30));
}

function formatHour(hour) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'am' : 'pm';
  return `${h}${ampm}`;
}

function formatMealPattern(pattern) {
  if (!pattern) return 'certain foods';
  const { avgCarbs, avgProtein, avgNova } = pattern;

  if (avgCarbs > 60) return 'high-carb meals';
  if (avgProtein > 30) return 'high-protein meals';
  if (avgNova > 3) return 'processed foods';
  return 'balanced meals';
}

function getMoodType(mood) {
  const positives = ['happy', 'calm', 'energized', 'content', 'focused'];
  const negatives = ['stressed', 'tired', 'anxious', 'sad', 'irritated'];

  if (positives.includes(mood)) return 'positive';
  if (negatives.includes(mood)) return 'negative';
  return 'neutral';
}

function generateExplanation(mealPattern, mood) {
  const pattern = formatMealPattern(mealPattern);
  return `Your ${pattern} tend to be followed by feeling ${mood}.`;
}

function generateSuggestion(mealPattern, mood) {
  const moodType = getMoodType(mood);
  if (moodType === 'positive') return 'Keep up this pattern for continued well-being';
  return 'Consider adjusting meal composition to improve how you feel';
}

function getNutriGrade(score) {
  if (score <= 1.5) return 'A';
  if (score <= 2.5) return 'B';
  if (score <= 3.5) return 'C';
  if (score <= 4.5) return 'D';
  return 'E';
}

function getSubtitle(type) {
  const subtitles = {
    protein: 'Small protein additions can significantly improve your energy and mood stability.',
    hydration: 'Better hydration supports energy, focus, and overall well-being.',
    logging: 'More data helps us provide better personalized recommendations.',
  };
  return subtitles[type] || 'A small change can make a big difference.';
}

function getTimeRequired(type) {
  const times = {
    protein: '2 min prep',
    hydration: 'No extra time',
    logging: '1 min per meal',
  };
  return times[type] || '5 min';
}

function getSchedule(type) {
  if (type === 'protein') {
    return [
      { day: 'Mon', task: 'Add eggs to breakfast' },
      { day: 'Wed', task: 'Greek yogurt as snack' },
      { day: 'Fri', task: 'Chicken or fish at dinner' },
    ];
  }
  if (type === 'hydration') {
    return [
      { day: 'Daily', task: 'Glass of water with each meal' },
      { day: 'Morning', task: 'Start with a full glass' },
      { day: 'Afternoon', task: 'Refill bottle at 2pm' },
    ];
  }
  return [];
}

/**
 * GET /api/insights/combined
 * Returns all basic insights in a single API call for faster loading
 *
 * PERFORMANCE OPTIMIZED:
 * - Combines predictive, correlations, weekly-narrative, and what-to-change
 * - Single DB connection for all queries
 * - Reduces API round-trips from 4 to 1
 * - AI analysis is separate (slower, cached longer)
 */
router.get('/combined', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { days = 14 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Get date range for this week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('[Insights] Combined endpoint - fetching all data...');
    const fetchStart = Date.now();

    // Single batch of all DB queries - much faster than 4 separate requests
    const [foodLogs, moodLogs, waterLogs, goals, summaries, storedCorrelations] = await Promise.all([
      db.select()
        .from(foodLogTable)
        .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, startDate)))
        .orderBy(desc(foodLogTable.loggedDate)),

      db.select()
        .from(moodLogTable)
        .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, startDate)))
        .orderBy(desc(moodLogTable.loggedDate)),

      db.select()
        .from(waterLogTable)
        .where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, startDate)))
        .orderBy(desc(waterLogTable.loggedDate)),

      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),

      db.select()
        .from(dailyNutritionSummaryTable)
        .where(and(eq(dailyNutritionSummaryTable.userId, userId), gte(dailyNutritionSummaryTable.date, weekStart)))
        .orderBy(desc(dailyNutritionSummaryTable.date)),

      db.select()
        .from(moodMealCorrelationsTable)
        .where(eq(moodMealCorrelationsTable.userId, userId))
        .orderBy(desc(moodMealCorrelationsTable.strength))
        .limit(5),
    ]);

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0, dailyProtein: 100 };

    console.log(`[Insights] Combined data fetched in ${Date.now() - fetchStart}ms`);

    // Generate all insights in parallel
    const [predictions, correlations, narrative, recommendation] = await Promise.all([
      // Predictive insights
      Promise.resolve(generatePredictiveInsights(foodLogs, moodLogs, waterLogs, userGoals)),

      // Correlations (use stored or generate)
      Promise.resolve(
        storedCorrelations.length > 0
          ? storedCorrelations.map(corr => ({
              id: corr.id,
              factor: formatMealPattern(corr.mealPattern),
              outcome: corr.moodPattern,
              type: getMoodType(corr.moodPattern),
              correlation: Math.round(parseFloat(corr.strength) * 100),
              dataPoints: corr.occurrences,
              instances: corr.occurrences,
              confidence: Math.round(parseFloat(corr.confidence) * 100),
              explanation: generateExplanation(corr.mealPattern, corr.moodPattern),
              suggestion: generateSuggestion(corr.mealPattern, corr.moodPattern),
            }))
          : generateBehavioralCorrelations(moodLogs, foodLogs)
      ),

      // Weekly narrative
      Promise.resolve(generateWeeklyNarrative(foodLogs, moodLogs, waterLogs, summaries, userGoals, weekStart, weekEnd)),

      // What to change
      Promise.resolve(generateWhatToChange(foodLogs, moodLogs, waterLogs, userGoals)),
    ]);

    console.log(`[Insights] Combined endpoint total time: ${Date.now() - fetchStart}ms`);

    res.json({
      success: true,
      dataPoints: {
        food: foodLogs.length,
        mood: moodLogs.length,
        water: waterLogs.length,
      },
      lookbackDays: parseInt(days),

      // Predictive insights
      predictions,

      // Correlations
      correlations,
      correlationsSource: storedCorrelations.length > 0 ? 'stored' : 'generated',

      // Weekly narrative
      weeklyNarrative: narrative,

      // What to change
      whatToChange: {
        ...recommendation,
        dataPoints: foodLogs.length + moodLogs.length + waterLogs.length,
      },
    });
  } catch (error) {
    console.error('[Insights] Combined endpoint error:', error);
    errors.internal(res, 'Failed to fetch combined insights');
  }
});

/**
 * GET /api/insights/user-patterns
 * Returns user behavioral patterns for smart notification scheduling
 *
 * Used by the mobile app's smart notification engine to:
 * - Schedule notifications at optimal times based on user behavior
 * - Generate data-driven, personalized notification content
 * - Determine user lifecycle stage for appropriate messaging
 */
router.get('/user-patterns', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Get data from the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all relevant data for pattern analysis
    const [foodLogs, moodLogs, waterLogs, goals] = await Promise.all([
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      db.select()
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate)
        ))
        .orderBy(desc(waterLogTable.loggedDate)),

      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),
    ]);

    const userGoals = goals[0] || { dailyCalories: 2000, waterLiters: 2.0 };

    // Calculate hydration patterns
    const hydrationPatterns = analyzeHydrationPatterns(waterLogs);

    // Calculate meal timing patterns
    const mealPatterns = analyzeMealTimingPatterns(foodLogs);

    // Calculate activity patterns (from mood logs with energy data)
    const activityPatterns = analyzeActivityPatternsFromMood(moodLogs);

    // Calculate overall user stats
    const totalDaysActive = calculateActiveDays(foodLogs, moodLogs, waterLogs);
    const currentStreak = calculateCurrentStreak(foodLogs, waterLogs);
    const longestStreak = calculateLongestStreak(foodLogs, waterLogs);

    // Determine lifecycle stage
    const lifecycleStage = determineLifecycleStage(totalDaysActive, currentStreak, foodLogs.length);

    // Calculate average daily logs
    const averageDailyLogs = calculateAverageDailyLogs(foodLogs, moodLogs, waterLogs);

    res.json({
      success: true,

      // User lifecycle
      totalDaysActive,
      currentStreak,
      longestStreak,
      lifecycleStage,
      averageDailyLogs,

      // Hydration patterns
      hydration: {
        peakHours: hydrationPatterns.peakHours,
        consistency: hydrationPatterns.consistency,
        preferredBeverages: hydrationPatterns.preferredBeverages,
        avgDailyIntake: hydrationPatterns.avgDailyIntake,
        goalAchievementRate: hydrationPatterns.goalAchievementRate,
      },

      // Meal patterns
      meals: {
        typicalTimes: mealPatterns.typicalTimes,
        loggingRate: mealPatterns.loggingRate,
        preferredCuisines: mealPatterns.preferredCuisines,
        breakfastFrequency: mealPatterns.breakfastFrequency,
      },

      // Activity patterns (derived from mood/energy logs)
      activity: {
        peakHours: activityPatterns.peakHours,
        avgEnergyLevel: activityPatterns.avgEnergyLevel,
      },

      // Raw counts for debugging
      dataPoints: {
        food: foodLogs.length,
        mood: moodLogs.length,
        water: waterLogs.length,
      },
    });
  } catch (error) {
    console.error('[Insights] User patterns error:', error);
    errors.internal(res, 'Failed to analyze user patterns');
  }
});

/**
 * Analyze hydration patterns from water logs
 */
function analyzeHydrationPatterns(waterLogs) {
  if (!waterLogs.length) {
    return {
      peakHours: [],
      consistency: 0,
      preferredBeverages: [],
      avgDailyIntake: 0,
      goalAchievementRate: 0,
    };
  }

  // Analyze peak logging hours
  const hourCounts = new Array(24).fill(0);
  const beverageCounts = {};
  const dailyTotals = {};

  waterLogs.forEach(log => {
    const date = new Date(log.loggedDate);
    const hour = date.getHours();
    const dateKey = date.toISOString().split('T')[0];

    hourCounts[hour]++;

    const beverage = log.beverageType || 'water';
    beverageCounts[beverage] = (beverageCounts[beverage] || 0) + 1;

    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) +
      parseFloat(log.amountLiters || log.hydrationLiters || 0);
  });

  // Find top 3 peak hours
  const sortedHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour);

  // Find preferred beverages
  const preferredBeverages = Object.entries(beverageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  // Calculate average daily intake
  const dailyValues = Object.values(dailyTotals);
  const avgDailyIntake = dailyValues.length > 0
    ? dailyValues.reduce((sum, v) => sum + v, 0) / dailyValues.length
    : 0;

  // Calculate consistency (days with logs / total days in range)
  const dayCount = Object.keys(dailyTotals).length;
  const totalDays = 30; // Last 30 days
  const consistency = dayCount / totalDays;

  // Goal achievement rate (days meeting 2L goal)
  const goalDays = dailyValues.filter(v => v >= 2.0).length;
  const goalAchievementRate = dayCount > 0 ? goalDays / dayCount : 0;

  return {
    peakHours: sortedHours,
    consistency,
    preferredBeverages,
    avgDailyIntake: Math.round(avgDailyIntake * 10) / 10,
    goalAchievementRate: Math.round(goalAchievementRate * 100) / 100,
  };
}

/**
 * Analyze meal timing patterns
 */
function analyzeMealTimingPatterns(foodLogs) {
  if (!foodLogs.length) {
    return {
      typicalTimes: [],
      loggingRate: 0,
      preferredCuisines: [],
      breakfastFrequency: 0,
    };
  }

  // Categorize meals by time of day
  const mealTimes = {
    breakfast: { hours: [], count: 0 }, // 5-10am
    lunch: { hours: [], count: 0 },     // 11am-2pm
    dinner: { hours: [], count: 0 },    // 5-9pm
    snacks: { hours: [], count: 0 },    // other times
  };

  const cuisineCounts = {};
  const daysWithFood = new Set();

  foodLogs.forEach(log => {
    const date = new Date(log.loggedDate);
    const hour = date.getHours();
    const dateKey = date.toISOString().split('T')[0];

    daysWithFood.add(dateKey);

    if (hour >= 5 && hour < 10) {
      mealTimes.breakfast.hours.push(hour);
      mealTimes.breakfast.count++;
    } else if (hour >= 11 && hour < 14) {
      mealTimes.lunch.hours.push(hour);
      mealTimes.lunch.count++;
    } else if (hour >= 17 && hour < 21) {
      mealTimes.dinner.hours.push(hour);
      mealTimes.dinner.count++;
    } else {
      mealTimes.snacks.hours.push(hour);
      mealTimes.snacks.count++;
    }

    // Track cuisines if available
    if (log.cuisine) {
      cuisineCounts[log.cuisine] = (cuisineCounts[log.cuisine] || 0) + 1;
    }
  });

  // Calculate typical times for each meal type
  const typicalTimes = Object.entries(mealTimes)
    .filter(([_, data]) => data.count > 0)
    .map(([meal, data]) => {
      const avgHour = data.hours.length > 0
        ? Math.round(data.hours.reduce((a, b) => a + b, 0) / data.hours.length)
        : null;
      return { meal, hour: avgHour, frequency: data.count };
    })
    .filter(t => t.hour !== null);

  // Logging rate (days with logs / total days)
  const loggingRate = daysWithFood.size / 30;

  // Breakfast frequency
  const breakfastFrequency = daysWithFood.size > 0
    ? mealTimes.breakfast.count / daysWithFood.size
    : 0;

  // Top cuisines
  const preferredCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  return {
    typicalTimes,
    loggingRate: Math.round(loggingRate * 100) / 100,
    preferredCuisines,
    breakfastFrequency: Math.round(breakfastFrequency * 100) / 100,
  };
}

/**
 * Analyze activity patterns from mood/energy logs
 */
function analyzeActivityPatternsFromMood(moodLogs) {
  if (!moodLogs.length) {
    return { peakHours: [], avgEnergyLevel: 0 };
  }

  // Find hours with high energy
  const hourlyEnergy = new Array(24).fill(null).map(() => []);

  moodLogs.forEach(log => {
    const hour = new Date(log.loggedDate).getHours();
    const energy = log.energyLevel || 5;
    hourlyEnergy[hour].push(energy);
  });

  // Calculate average energy per hour
  const avgByHour = hourlyEnergy.map((energies, hour) => ({
    hour,
    avgEnergy: energies.length > 0
      ? energies.reduce((a, b) => a + b, 0) / energies.length
      : 0,
    count: energies.length,
  }));

  // Find peak activity hours (highest energy)
  const peakHours = avgByHour
    .filter(h => h.count > 0 && h.avgEnergy >= 6)
    .sort((a, b) => b.avgEnergy - a.avgEnergy)
    .slice(0, 3)
    .map(h => h.hour);

  // Overall average energy
  const allEnergies = moodLogs.map(m => m.energyLevel || 5);
  const avgEnergyLevel = allEnergies.length > 0
    ? allEnergies.reduce((a, b) => a + b, 0) / allEnergies.length
    : 0;

  return {
    peakHours,
    avgEnergyLevel: Math.round(avgEnergyLevel * 10) / 10,
  };
}

/**
 * Calculate total active days (days with any log)
 */
function calculateActiveDays(foodLogs, moodLogs, waterLogs) {
  const activeDays = new Set();

  [...foodLogs, ...moodLogs, ...waterLogs].forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    activeDays.add(dateKey);
  });

  return activeDays.size;
}

/**
 * Calculate current streak (consecutive days with logs)
 */
function calculateCurrentStreak(foodLogs, waterLogs) {
  const logDates = new Set();

  [...foodLogs, ...waterLogs].forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    logDates.add(dateKey);
  });

  const sortedDates = Array.from(logDates).sort().reverse();
  if (sortedDates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if streak includes today or yesterday
  if (!sortedDates.includes(today) && !sortedDates.includes(yesterday)) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(sortedDates[0]);

  for (const dateStr of sortedDates) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - streak);
    const expectedStr = expectedDate.toISOString().split('T')[0];

    if (dateStr === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate longest streak ever
 */
function calculateLongestStreak(foodLogs, waterLogs) {
  const logDates = new Set();

  [...foodLogs, ...waterLogs].forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    logDates.add(dateKey);
  });

  const sortedDates = Array.from(logDates).sort();
  if (sortedDates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.round((currDate - prevDate) / 86400000);

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Determine user lifecycle stage
 */
function determineLifecycleStage(totalDaysActive, currentStreak, foodLogCount) {
  if (totalDaysActive < 3 || foodLogCount < 5) {
    return 'newcomer';
  }
  if (totalDaysActive < 14 || currentStreak < 5) {
    return 'building';
  }
  if (totalDaysActive < 30 || currentStreak < 14) {
    return 'established';
  }
  return 'expert';
}

/**
 * Calculate average daily logs
 */
function calculateAverageDailyLogs(foodLogs, moodLogs, waterLogs) {
  const dailyCounts = {};

  [...foodLogs, ...moodLogs, ...waterLogs].forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  const counts = Object.values(dailyCounts);
  if (counts.length === 0) return 0;

  return Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10;
}

// ============================================================================
// NOVEL CORRELATIONS ENDPOINT - Auto-discovered user-specific patterns
// ============================================================================

/**
 * GET /api/insights/novel-correlations
 * Discovers novel, user-specific correlations using pairwise factor analysis
 * with lag analysis and novelty scoring.
 */
router.get('/novel-correlations', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { lookbackDays = 30, limit = 5 } = req.query;

    // Get novel correlations with full statistical analysis
    const discovery = await discoverNovelCorrelations(
      userId,
      parseInt(lookbackDays)
    );

    // Get user-friendly insights (internally calls discoverNovelCorrelations)
    const insightsResult = await getNovelInsights(userId, parseInt(limit));

    // Handle case where discovery returns success: false
    const correlations = discovery?.correlations || [];

    res.json({
      success: true,
      data: {
        correlations: correlations.slice(0, parseInt(limit)),
        insights: insightsResult?.insights || [],
        hasEnoughData: discovery?.success && insightsResult?.hasEnoughData,
        daysAnalyzed: discovery?.daysAnalyzed || 0,
        meta: {
          lookbackDays: parseInt(lookbackDays),
          totalDiscovered: correlations.length,
          minimumSampleSize: 10,
          significanceLevel: 0.05,
        },
      },
    });
  } catch (error) {
    console.error('[NovelCorrelations] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover novel correlations',
      message: error.message,
    });
  }
});

/**
 * GET /api/insights/unified-correlations
 * Returns a unified view of correlations from both:
 * - Rule-based correlation engine (verified patterns)
 * - Auto-discovery engine (novel patterns)
 *
 * Deduplicates, ranks by importance, and provides a single stream.
 */
router.get('/unified-correlations', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { limit = 10, lookbackDays = 30 } = req.query;

    // Fetch from both systems in parallel
    const [ruleBasedResult, novelResult] = await Promise.all([
      // Rule-based correlations
      computeUserCorrelations(userId).catch(err => {
        console.warn('[UnifiedCorrelations] Rule-based error:', err.message);
        return { success: false, correlations: [] };
      }),
      // Auto-discovered correlations
      discoverNovelCorrelations(userId, parseInt(lookbackDays)).catch(err => {
        console.warn('[UnifiedCorrelations] Novel discovery error:', err.message);
        return { success: false, correlations: [] };
      }),
    ]);

    const ruleBased = ruleBasedResult?.correlations || [];
    const novel = novelResult?.correlations || [];

    // Normalize both to a common format
    const normalizedRuleBased = ruleBased.map(c => ({
      id: c.id || `rule-${c.correlationType}-${c.ruleName}`,
      source: 'rule_based',
      type: c.correlationType,
      ruleName: c.ruleName,
      title: formatCorrelationTitle(c),
      description: c.expectedOutcome || c.description,
      strength: parseFloat(c.strength) || 0,
      confidence: parseFloat(c.confidence) || 0,
      occurrences: c.occurrences || 0,
      healthImpact: c.healthImpactSeverity || 'moderate',
      domains: c.affectedDomains || [],
      evidence: c.evidenceJson || {},
      signalA: { name: c.signalA, value: c.signalAValue, unit: c.signalAUnit },
      signalB: { name: c.signalB, value: c.signalBValue, unit: c.signalBUnit },
      isActive: c.isActive !== false,
      firstObserved: c.firstObservedDate,
      lastObserved: c.lastObservedDate,
    }));

    const normalizedNovel = novel.map(c => ({
      id: c.id || `novel-${c.factorA}-${c.factorB}-${c.lagHours}`,
      source: 'auto_discovery',
      type: 'discovered',
      ruleName: null,
      title: `${formatFactorName(c.factorA)} affects ${formatFactorName(c.factorB)}`,
      description: c.description || generateNovelDescription(c),
      strength: Math.abs(c.correlation) || 0,
      confidence: c.confidence || 0,
      occurrences: c.sampleSize || 0,
      healthImpact: c.noveltyScore > 0.7 ? 'novel' : 'moderate',
      domains: [c.factorA.split('_')[0], c.factorB.split('_')[0]],
      evidence: {
        correlation: c.correlation,
        pValue: c.pValue,
        lagHours: c.lagHours,
        noveltyScore: c.noveltyScore,
        sampleSize: c.sampleSize,
      },
      signalA: { name: c.factorA, value: null, unit: null },
      signalB: { name: c.factorB, value: null, unit: null },
      isActive: true,
      firstObserved: null,
      lastObserved: null,
    }));

    // Merge and deduplicate
    const allCorrelations = [...normalizedRuleBased, ...normalizedNovel];

    // Deduplicate by similar patterns
    const deduped = deduplicateCorrelations(allCorrelations);

    // Rank by importance (combination of confidence, occurrences, novelty)
    const ranked = deduped.sort((a, b) => {
      const scoreA = computeImportanceScore(a);
      const scoreB = computeImportanceScore(b);
      return scoreB - scoreA;
    });

    // Limit results
    const limited = ranked.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        correlations: limited,
        meta: {
          totalRuleBased: normalizedRuleBased.length,
          totalNovel: normalizedNovel.length,
          totalBeforeDedup: allCorrelations.length,
          totalAfterDedup: deduped.length,
          returned: limited.length,
          sources: {
            ruleBased: ruleBasedResult?.success !== false,
            novel: novelResult?.success !== false,
          },
        },
      },
    });
  } catch (error) {
    console.error('[UnifiedCorrelations] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unified correlations',
      message: error.message,
    });
  }
});

// Helper functions for unified correlations
function formatCorrelationTitle(correlation) {
  const titles = {
    'food_mood': 'Food affects your mood',
    'hydration_mood': 'Hydration affects your energy',
    'beverage_energy': 'Caffeine affects your energy',
    'beverage_sleep': 'Evening caffeine affects sleep',
    'meal_timing_mood': 'Meal timing affects mood',
    'carryover_next_day': 'Evening food affects tomorrow',
    'activity_mood': 'Activity affects mood',
  };
  return titles[correlation.correlationType] || correlation.ruleName?.replace(/_/g, ' ') || 'Pattern detected';
}

function formatFactorName(factor) {
  if (!factor) return 'Unknown';
  return factor
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generateNovelDescription(correlation) {
  const direction = correlation.correlation > 0 ? 'increases' : 'decreases';
  const lagText = correlation.lagHours > 0 ? ` after ${correlation.lagHours}h` : '';
  return `${formatFactorName(correlation.factorA)} ${direction} ${formatFactorName(correlation.factorB)}${lagText}`;
}

function deduplicateCorrelations(correlations) {
  const seen = new Map();

  for (const corr of correlations) {
    // Create a key based on the pattern essence
    const key = [
      corr.signalA?.name || '',
      corr.signalB?.name || '',
      corr.type,
    ].sort().join('|');

    const existing = seen.get(key);
    if (!existing || computeImportanceScore(corr) > computeImportanceScore(existing)) {
      seen.set(key, corr);
    }
  }

  return Array.from(seen.values());
}

function computeImportanceScore(correlation) {
  // Weight factors: confidence (40%), occurrences (30%), novelty (20%), recency (10%)
  const confidenceScore = (correlation.confidence || 0) * 0.4;

  const occurrenceScore = Math.min((correlation.occurrences || 0) / 20, 1) * 0.3;

  const noveltyScore = correlation.source === 'auto_discovery'
    ? (correlation.evidence?.noveltyScore || 0.5) * 0.2
    : 0.1; // Rule-based gets baseline novelty

  const recencyScore = correlation.lastObserved
    ? (1 - Math.min((Date.now() - new Date(correlation.lastObserved).getTime()) / (30 * 24 * 60 * 60 * 1000), 1)) * 0.1
    : 0.05;

  return confidenceScore + occurrenceScore + noveltyScore + recencyScore;
}

// ============================================================================
// OUTCOME VERIFICATION ENDPOINTS - Feedback loop for recommendation effectiveness
// ============================================================================

/**
 * POST /api/insights/recommendations/track
 * Track user action on a recommendation (shown, clicked, completed, dismissed)
 */
router.post('/recommendations/track', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { recommendationId, recommendationType, domain, actionType, title, action, difficultyTier, context } = req.body;

    if (!recommendationType || !domain || !actionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recommendationType, domain, actionType',
      });
    }

    // Build recommendation object to pass to service
    const recommendation = {
      id: recommendationId,
      type: recommendationType,
      domain,
      title,
      action,
      difficultyTier,
      context,
    };

    const result = await trackRecommendationAction(userId, recommendation, actionType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[TrackRecommendation] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track recommendation action',
      message: error.message,
    });
  }
});

/**
 * POST /api/insights/recommendations/verify
 * Verify outcome of a specific recommendation
 */
router.post('/recommendations/verify', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { actionId } = req.body;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: actionId',
      });
    }

    const result = await verifyRecommendationOutcome(userId, actionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[VerifyRecommendation] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify recommendation outcome',
      message: error.message,
    });
  }
});

/**
 * POST /api/insights/verification/process-pending
 * Process all pending verifications (batch operation for current user's data)
 */
router.post('/verification/process-pending', async (req, res) => {
  try {
    // Note: processPendingVerifications processes all pending verifications globally
    // It filters by expectedOutcomeTime, not by userId
    const results = await processPendingVerifications();

    res.json({
      success: true,
      data: {
        processed: results?.length || 0,
        results: results || [],
      },
    });
  } catch (error) {
    console.error('[ProcessPendingVerifications] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process pending verifications',
      message: error.message,
    });
  }
});

/**
 * POST /api/insights/predictions/log
 * Log a prediction for later accuracy verification
 */
router.post('/predictions/log', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { predictionType, predictedValue, confidence, intervalLow, intervalHigh, context } = req.body;

    if (!predictionType || predictedValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: predictionType, predictedValue',
      });
    }

    // Build prediction object to pass to service
    const prediction = {
      value: predictedValue,
      confidence,
      interval: intervalLow !== undefined ? { low: intervalLow, high: intervalHigh } : null,
      context,
    };

    const result = await logPrediction(userId, predictionType, prediction);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[LogPrediction] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log prediction',
      message: error.message,
    });
  }
});

/**
 * POST /api/insights/predictions/verify
 * Verify a prediction against actual outcome
 */
router.post('/predictions/verify', async (req, res) => {
  try {
    const { predictionId, actualValue } = req.body;

    if (!predictionId || actualValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: predictionId, actualValue',
      });
    }

    const result = await verifyPrediction(predictionId, actualValue);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[VerifyPrediction] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify prediction',
      message: error.message,
    });
  }
});

/**
 * GET /api/insights/predictions/accuracy
 * Get prediction accuracy statistics for the user
 */
router.get('/predictions/accuracy', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { predictionType } = req.query;

    const accuracy = await calculatePredictionAccuracy(
      userId,
      predictionType || null
    );

    res.json({
      success: true,
      data: accuracy,
    });
  } catch (error) {
    console.error('[PredictionAccuracy] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate prediction accuracy',
      message: error.message,
    });
  }
});

// ============================================================================
// INSIGHT FEEDBACK ENDPOINTS
// ============================================================================

/**
 * POST /api/insights/feedback
 * Submit feedback (thumbs up/down) on an insight
 *
 * This closes the feedback loop by allowing users to rate insights,
 * which feeds back into the learning system.
 */
router.post('/feedback', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const {
      insightId,
      insightType, // 'correlation', 'prediction', 'recommendation', 'pattern'
      feedbackType, // 'helpful' (thumbs up), 'not_helpful' (thumbs down), 'dismiss'
      insightContent, // Optional: the insight text for context
      additionalContext, // Optional: any additional context
    } = req.body;

    if (!insightId || !insightType || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: insightId, insightType, feedbackType',
      });
    }

    // Validate feedback type
    const validFeedbackTypes = ['helpful', 'not_helpful', 'dismiss', 'acted_on'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid feedbackType. Must be one of: ${validFeedbackTypes.join(', ')}`,
      });
    }

    // Check if feedback already exists for this insight
    const [existing] = await db
      .select()
      .from(insightFeedbackTable)
      .where(and(
        eq(insightFeedbackTable.userId, userId),
        eq(insightFeedbackTable.insightId, insightId)
      ))
      .limit(1);

    let record;
    if (existing) {
      // Update existing feedback
      [record] = await db
        .update(insightFeedbackTable)
        .set({
          feedbackType,
          additionalContext: additionalContext || existing.additionalContext,
          updatedAt: new Date(),
        })
        .where(eq(insightFeedbackTable.id, existing.id))
        .returning();
    } else {
      // Insert new feedback
      [record] = await db
        .insert(insightFeedbackTable)
        .values({
          userId,
          insightId,
          insightType,
          feedbackType,
          insightContent: insightContent || null,
          additionalContext: additionalContext || null,
        })
        .returning();
    }

    // If the user found it helpful, this is positive signal
    // If not helpful, this is negative signal for future insights
    const isPositive = feedbackType === 'helpful' || feedbackType === 'acted_on';

    res.json({
      success: true,
      data: {
        feedbackId: record.id,
        insightId,
        feedbackType,
        isPositive,
        message: isPositive
          ? 'Thanks for the feedback! We\'ll show more insights like this.'
          : 'Got it! We\'ll adjust future insights based on your feedback.',
      },
    });
  } catch (error) {
    console.error('[InsightFeedback] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
      message: error.message,
    });
  }
});

/**
 * GET /api/insights/feedback
 * Get feedback history for the user
 */
router.get('/feedback', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { limit = 50, insightType } = req.query;

    const conditions = [eq(insightFeedbackTable.userId, userId)];
    if (insightType) {
      conditions.push(eq(insightFeedbackTable.insightType, insightType));
    }

    const feedback = await db
      .select()
      .from(insightFeedbackTable)
      .where(and(...conditions))
      .orderBy(desc(insightFeedbackTable.createdAt))
      .limit(parseInt(limit));

    // Calculate summary stats
    const helpful = feedback.filter(f => f.feedbackType === 'helpful' || f.feedbackType === 'acted_on').length;
    const notHelpful = feedback.filter(f => f.feedbackType === 'not_helpful').length;
    const dismissed = feedback.filter(f => f.feedbackType === 'dismiss').length;

    res.json({
      success: true,
      data: {
        feedback,
        summary: {
          total: feedback.length,
          helpful,
          notHelpful,
          dismissed,
          helpfulRate: feedback.length > 0 ? Math.round((helpful / feedback.length) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('[GetFeedback] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback history',
      message: error.message,
    });
  }
});

/**
 * GET /api/insights/stats
 * Get comprehensive insight accuracy and learning stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Get prediction accuracy stats
    const predictionStats = await getPredictionAccuracyStats(userId);

    // Get feedback stats
    const feedback = await db
      .select()
      .from(insightFeedbackTable)
      .where(eq(insightFeedbackTable.userId, userId));

    const feedbackByType = {};
    for (const f of feedback) {
      if (!feedbackByType[f.insightType]) {
        feedbackByType[f.insightType] = { helpful: 0, notHelpful: 0, total: 0 };
      }
      feedbackByType[f.insightType].total++;
      if (f.feedbackType === 'helpful' || f.feedbackType === 'acted_on') {
        feedbackByType[f.insightType].helpful++;
      } else if (f.feedbackType === 'not_helpful') {
        feedbackByType[f.insightType].notHelpful++;
      }
    }

    // Calculate helpfulness rate per type
    for (const [type, stats] of Object.entries(feedbackByType)) {
      stats.helpfulRate = stats.total > 0
        ? Math.round((stats.helpful / stats.total) * 100)
        : 0;
    }

    res.json({
      success: true,
      data: {
        predictions: predictionStats,
        feedback: {
          total: feedback.length,
          byType: feedbackByType,
        },
        learningStatus: {
          hasEnoughFeedback: feedback.length >= 10,
          hasCalibratedPredictions: predictionStats.hasData && predictionStats.totalPredictions >= 10,
        },
      },
    });
  } catch (error) {
    console.error('[InsightStats] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insight stats',
      message: error.message,
    });
  }
});

/**
 * POST /api/insights/implicit-outcomes
 * Process implicit outcomes from user behavior
 * (For predictions that didn't receive explicit feedback)
 */
router.post('/implicit-outcomes', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const results = await measureImplicitOutcomes(userId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[ImplicitOutcomes] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process implicit outcomes',
      message: error.message,
    });
  }
});

export default router;
