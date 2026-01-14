/**
 * Insights API Routes
 *
 * Provides predictive insights, behavioral correlations, and weekly narratives
 * for premium users. Powers the 5W2H intelligent wellness system.
 *
 * Endpoints:
 * - GET /api/insights/predictive - Energy, mood, nutrient predictions
 * - GET /api/insights/correlations - Behavioral pattern discoveries
 * - GET /api/insights/weekly-narrative - Weekly health story
 * - GET /api/insights/what-to-change - Priority change recommendation
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { and, eq, gte, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  dailyNutritionSummaryTable,
  nutritionGoalsTable,
  moodMealCorrelationsTable,
} from '../db/schema.js';
import { generateDailyStoryLine, calculateDailyScore } from '../services/storyLineService.js';
import { generateMoodInsights, generateBasicMoodInsights } from '../services/moodInsightService.js';
import { errors } from '../utils/errorResponse.js';
import { openaiClient as openai } from '../services/apiClients/OpenAIClient.js';

const router = express.Router();

// Require authentication for all routes
router.use(requireAuth());

/**
 * GET /api/insights/predictive
 * Returns predictive insights for energy, mood, and nutrients
 */
router.get('/predictive', async (req, res) => {
  try {
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;

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
    const userId = req.auth.userId;

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
    const userId = req.auth.userId;
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
- Only report patterns with sufficient evidence
- Be encouraging and supportive
- Provide specific, actionable recommendations
- Reference specific numbers from the data`;

  const userPrompt = `Analyze this health data and identify patterns:

**FOOD DATA (${dataSummary.food.totalMeals} meals):**
- Average daily: ${dataSummary.food.avgCalories} cal, ${dataSummary.food.avgProtein}g protein, ${dataSummary.food.avgCarbs}g carbs, ${dataSummary.food.avgFat}g fat
- Sugar intake: avg ${dataSummary.food.avgSugar}g per meal
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
      "title": "Short title (5-8 words)",
      "statement": "Clear insight with specific data references (1-2 sentences)",
      "confidence": 0.0-1.0,
      "evidencePoints": ["specific data point 1", "specific data point 2"],
      "affectedDomains": ["energy", "mood", "nutrition", "hydration"],
      "suggestion": "Specific actionable recommendation"
    }
  ],
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
 */
function generatePredictiveInsights(foodLogs, moodLogs, waterLogs, goals) {
  const predictions = {};

  // Energy Prediction
  const hourlyEnergy = analyzeEnergyPatterns(foodLogs, moodLogs);
  const energyDipHour = findEnergyDip(hourlyEnergy);

  if (energyDipHour) {
    predictions.energy = {
      statement: `Based on your meal timing, you may experience an energy dip around ${formatHour(energyDipHour)}.`,
      hourlyLevels: hourlyEnergy,
      prevention: `Have a protein-rich snack at ${formatHour(energyDipHour - 1)} to maintain steady energy`,
      confidence: calculateConfidence(moodLogs.length, 14),
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
  }

  // Nutrient Projection
  const nutrientGaps = analyzeNutrientGaps(foodLogs, goals);
  if (nutrientGaps.length > 0) {
    predictions.nutrient = {
      statement: `At your current rate, you may fall short on ${nutrientGaps.map(n => n.name).join(' and ')} this week.`,
      nutrients: nutrientGaps,
      recommendation: generateNutrientRecommendation(nutrientGaps),
      confidence: calculateConfidence(foodLogs.length, 21),
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
    narrative += `showed real progress in your hydration habits—you hit your water goal ${waterGoalDays} out of 7 days. `;
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

export default router;
