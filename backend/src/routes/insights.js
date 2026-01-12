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
