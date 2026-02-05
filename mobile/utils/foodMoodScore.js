/**
 * FoodMoodScore - Your Signature Metric
 * A composite score (0-100) that captures food quality + mood + energy
 * This is THE differentiator - no other app has this
 */

/**
 * Calculate the FoodMoodScore based on multiple factors
 * @param {Object} params - Score calculation parameters
 * @returns {Object} - Score details with breakdown
 */
export function calculateFoodMoodScore({
  // Nutrition factors
  calories = 0,
  calorieGoal = 2000,
  protein = 0,
  proteinGoal = 150,
  carbs = 0,
  carbsGoal = 250,
  fats = 0,
  fatsGoal = 65,
  fiber = 0,
  fiberGoal = 30,

  // Hydration
  waterIntake = 0,
  waterGoal = 2.5,

  // Mood data
  moodLogs = [],

  // Meal timing
  meals = [],

  // Historical context
  streak = 0,
}) {
  const breakdown = {
    nutrition: 0,
    hydration: 0,
    mood: 0,
    consistency: 0,
    timing: 0,
  };

  // 1. NUTRITION SCORE (0-35 points)
  // Reward hitting targets, penalize extremes
  const calorieRatio = calorieGoal > 0 ? calories / calorieGoal : 0;
  const proteinRatio = proteinGoal > 0 ? protein / proteinGoal : 0;
  const fiberRatio = fiberGoal > 0 ? fiber / fiberGoal : 0;

  // Calories: Best score at 90-110% of goal
  let calorieScore = 0;
  if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
    calorieScore = 10; // Perfect range
  } else if (calorieRatio >= 0.7 && calorieRatio <= 1.2) {
    calorieScore = 7; // Acceptable
  } else if (calorieRatio >= 0.5 && calorieRatio <= 1.3) {
    calorieScore = 4; // Needs work
  } else {
    calorieScore = 1; // Way off
  }

  // Protein: Higher is better (up to goal)
  const proteinScore = Math.min(proteinRatio, 1) * 15;

  // Fiber: Higher is better (up to goal)
  const fiberScore = Math.min(fiberRatio, 1) * 10;

  breakdown.nutrition = Math.round(calorieScore + proteinScore + fiberScore);

  // 2. HYDRATION SCORE (0-20 points)
  const hydrationRatio = waterGoal > 0 ? waterIntake / waterGoal : 0;
  if (hydrationRatio >= 1) {
    breakdown.hydration = 20;
  } else if (hydrationRatio >= 0.8) {
    breakdown.hydration = 16;
  } else if (hydrationRatio >= 0.6) {
    breakdown.hydration = 12;
  } else if (hydrationRatio >= 0.4) {
    breakdown.hydration = 8;
  } else {
    breakdown.hydration = Math.round(hydrationRatio * 20);
  }

  // 3. MOOD SCORE (0-25 points)
  if (moodLogs.length > 0) {
    const avgMood = moodLogs.reduce((sum, log) => sum + (log.intensity || 5), 0) / moodLogs.length;
    // Mood is 1-10, normalize to 0-25
    breakdown.mood = Math.round((avgMood / 10) * 25);
  } else {
    // No mood data - give neutral score
    breakdown.mood = 12;
  }

  // 4. CONSISTENCY SCORE (0-10 points)
  // Based on streak
  if (streak >= 30) {
    breakdown.consistency = 10;
  } else if (streak >= 14) {
    breakdown.consistency = 8;
  } else if (streak >= 7) {
    breakdown.consistency = 6;
  } else if (streak >= 3) {
    breakdown.consistency = 4;
  } else if (streak >= 1) {
    breakdown.consistency = 2;
  } else {
    breakdown.consistency = 0;
  }

  // 5. MEAL TIMING SCORE (0-10 points)
  // Reward regular meal patterns
  if (meals.length >= 3) {
    const hasBreakfast = meals.some(m => {
      const hour = new Date(m.timestamp || m.loggedDate).getHours();
      return hour >= 6 && hour <= 10;
    });
    const hasLunch = meals.some(m => {
      const hour = new Date(m.timestamp || m.loggedDate).getHours();
      return hour >= 11 && hour <= 14;
    });
    const hasDinner = meals.some(m => {
      const hour = new Date(m.timestamp || m.loggedDate).getHours();
      return hour >= 17 && hour <= 21;
    });

    let timingPoints = 0;
    if (hasBreakfast) timingPoints += 4;
    if (hasLunch) timingPoints += 3;
    if (hasDinner) timingPoints += 3;
    breakdown.timing = timingPoints;
  } else if (meals.length > 0) {
    breakdown.timing = meals.length * 2;
  }

  // Calculate total score
  const totalScore = Math.min(100, Math.max(0,
    breakdown.nutrition +
    breakdown.hydration +
    breakdown.mood +
    breakdown.consistency +
    breakdown.timing
  ));

  // Determine score tier and label
  let tier, label, color, emoji;
  if (totalScore >= 85) {
    tier = 'excellent';
    label = 'Thriving';
    color = '#10B981';
    emoji = '🔥';
  } else if (totalScore >= 70) {
    tier = 'good';
    label = 'Energized';
    color = '#6B4EFF';
    emoji = '⚡';
  } else if (totalScore >= 55) {
    tier = 'okay';
    label = 'Balanced';
    color = '#F59E0B';
    emoji = '👍';
  } else if (totalScore >= 40) {
    tier = 'fair';
    label = 'Building';
    color = '#F97316';
    emoji = '💪';
  } else {
    tier = 'low';
    label = 'Starting';
    color = '#EF4444';
    emoji = '🌱';
  }

  // Generate improvement tips
  const tips = [];
  if (breakdown.nutrition < 20) {
    tips.push({ area: 'nutrition', tip: 'Focus on protein-rich meals', icon: 'nutrition-outline' });
  }
  if (breakdown.hydration < 12) {
    tips.push({ area: 'hydration', tip: 'Drink more water throughout the day', icon: 'water-outline' });
  }
  if (breakdown.mood < 15 && moodLogs.length === 0) {
    tips.push({ area: 'mood', tip: 'Log your mood to unlock insights', icon: 'happy-outline' });
  }
  if (breakdown.consistency < 4) {
    tips.push({ area: 'consistency', tip: 'Keep your streak going!', icon: 'flame-outline' });
  }
  if (breakdown.timing < 6) {
    tips.push({ area: 'timing', tip: 'Try eating at regular times', icon: 'time-outline' });
  }

  return {
    score: Math.round(totalScore),
    tier,
    label,
    color,
    emoji,
    breakdown,
    tips: tips.slice(0, 2), // Top 2 tips
    maxBreakdown: {
      nutrition: 35,
      hydration: 20,
      mood: 25,
      consistency: 10,
      timing: 10,
    },
  };
}

/**
 * Calculate weekly trend for FoodMoodScore
 * @param {Array} dailyScores - Array of daily score objects
 * @returns {Object} - Trend analysis
 */
export function calculateScoreTrend(dailyScores = []) {
  if (dailyScores.length < 2) {
    return { trend: 'neutral', change: 0, message: 'Keep logging to see trends' };
  }

  const recent = dailyScores.slice(-3);
  const older = dailyScores.slice(-7, -3);

  if (older.length === 0) {
    return { trend: 'neutral', change: 0, message: 'Building your trend data' };
  }

  const recentAvg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.score, 0) / older.length;
  const change = Math.round(recentAvg - olderAvg);

  let trend, message;
  if (change >= 5) {
    trend = 'up';
    message = `Up ${change} points this week!`;
  } else if (change <= -5) {
    trend = 'down';
    message = `Down ${Math.abs(change)} points - let's bounce back`;
  } else {
    trend = 'stable';
    message = 'Holding steady';
  }

  return { trend, change, message, recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg) };
}

/**
 * Analyze patterns to predict tomorrow's potential score
 * @param {Object} params - Analysis parameters
 * @returns {Object} - Prediction with confidence
 */
export function predictTomorrowScore({
  todaysMeals = [],
  todaysMood = null,
  historicalPatterns = [],
  currentScore = 50,
}) {
  const predictions = [];
  let confidenceSum = 0;
  let predictionSum = 0;

  // Analyze late-night eating
  const lateNightMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 21 || hour < 5;
  });

  if (lateNightMeals.length > 0) {
    predictions.push({
      factor: 'Late-night eating detected',
      impact: -8,
      confidence: 0.7,
      suggestion: 'Try to finish eating by 8pm tomorrow',
      icon: 'moon-outline',
    });
    predictionSum += -8 * 0.7;
    confidenceSum += 0.7;
  }

  // Analyze high-carb dinner
  const dinnerMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 17 && hour <= 21;
  });

  const dinnerCarbs = dinnerMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  if (dinnerCarbs > 100) {
    predictions.push({
      factor: 'Heavy carb dinner',
      impact: -5,
      confidence: 0.6,
      suggestion: 'Balance with protein-rich breakfast',
      icon: 'restaurant-outline',
    });
    predictionSum += -5 * 0.6;
    confidenceSum += 0.6;
  }

  // Analyze protein intake
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  if (totalProtein >= 100) {
    predictions.push({
      factor: 'Strong protein intake',
      impact: +6,
      confidence: 0.75,
      suggestion: 'Great job! Maintain this tomorrow',
      icon: 'fitness-outline',
    });
    predictionSum += 6 * 0.75;
    confidenceSum += 0.75;
  }

  // Analyze mood trend
  if (todaysMood && todaysMood >= 7) {
    predictions.push({
      factor: 'Positive mood today',
      impact: +4,
      confidence: 0.5,
      suggestion: 'Keep the momentum going',
      icon: 'happy-outline',
    });
    predictionSum += 4 * 0.5;
    confidenceSum += 0.5;
  }

  // Calculate predicted score
  const avgImpact = confidenceSum > 0 ? predictionSum / confidenceSum : 0;
  const predictedScore = Math.min(100, Math.max(0, Math.round(currentScore + avgImpact)));

  // Overall confidence
  const overallConfidence = predictions.length > 0
    ? Math.min(0.85, predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)
    : 0.3;

  return {
    predictedScore,
    currentScore,
    change: predictedScore - currentScore,
    confidence: overallConfidence,
    predictions: predictions.slice(0, 3),
    summary: predictions.length > 0
      ? `Based on ${predictions.length} factor${predictions.length > 1 ? 's' : ''} detected today`
      : 'Keep logging for more accurate predictions',
  };
}

/**
 * Detect patterns from historical data
 * @param {Object} params - Historical data
 * @returns {Array} - Detected patterns with insights
 */
export function detectPatterns({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  days = 30,
}) {
  const patterns = [];

  // Need minimum data
  if (foodLogs.length < 10 || moodLogs.length < 5) {
    return [{
      id: 'need-data',
      title: 'Building Your Pattern Profile',
      message: `Log ${Math.max(0, 10 - foodLogs.length)} more meals and ${Math.max(0, 5 - moodLogs.length)} more moods to unlock patterns`,
      confidence: 0,
      type: 'info',
      icon: 'analytics-outline',
    }];
  }

  // Pattern 1: Morning protein → Better mood
  const daysWithMorningProtein = new Set();
  const daysWithoutMorningProtein = new Set();

  foodLogs.forEach(log => {
    const date = new Date(log.timestamp || log.loggedDate);
    const dateKey = date.toISOString().split('T')[0];
    const hour = date.getHours();
    const protein = log.protein || 0;

    if (hour >= 6 && hour <= 10 && protein >= 20) {
      daysWithMorningProtein.add(dateKey);
    } else if (hour >= 6 && hour <= 10 && protein < 10) {
      daysWithoutMorningProtein.add(dateKey);
    }
  });

  // Calculate mood averages for each group
  const moodByDate = {};
  moodLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!moodByDate[dateKey]) moodByDate[dateKey] = [];
    moodByDate[dateKey].push(log.intensity || 5);
  });

  let morningProteinMoodSum = 0, morningProteinMoodCount = 0;
  let noMorningProteinMoodSum = 0, noMorningProteinMoodCount = 0;

  daysWithMorningProtein.forEach(dateKey => {
    if (moodByDate[dateKey]) {
      const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
      morningProteinMoodSum += avgMood;
      morningProteinMoodCount++;
    }
  });

  daysWithoutMorningProtein.forEach(dateKey => {
    if (moodByDate[dateKey]) {
      const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
      noMorningProteinMoodSum += avgMood;
      noMorningProteinMoodCount++;
    }
  });

  if (morningProteinMoodCount >= 3 && noMorningProteinMoodCount >= 3) {
    const avgWithProtein = morningProteinMoodSum / morningProteinMoodCount;
    const avgWithoutProtein = noMorningProteinMoodSum / noMorningProteinMoodCount;
    const difference = avgWithProtein - avgWithoutProtein;

    if (difference > 0.5) {
      patterns.push({
        id: 'morning-protein',
        title: 'Morning Protein Boosts Your Mood',
        message: `When you eat protein at breakfast, your mood averages ${avgWithProtein.toFixed(1)} vs ${avgWithoutProtein.toFixed(1)} without`,
        confidence: Math.min(0.9, 0.5 + (morningProteinMoodCount / 20)),
        type: 'positive',
        icon: 'sunny-outline',
        action: 'Try eggs or Greek yogurt tomorrow morning',
        stats: {
          withProtein: avgWithProtein.toFixed(1),
          withoutProtein: avgWithoutProtein.toFixed(1),
          improvement: `+${(difference).toFixed(1)}`,
        },
      });
    }
  }

  // Pattern 2: Hydration → Energy correlation
  const wellHydratedDays = new Set();
  const poorlyHydratedDays = new Set();

  // Group water logs by date
  const waterByDate = {};
  waterLogs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!waterByDate[dateKey]) waterByDate[dateKey] = 0;
    waterByDate[dateKey] += (log.amountLiters || log.hydrationLiters || 0);
  });

  Object.entries(waterByDate).forEach(([dateKey, total]) => {
    if (total >= 2) {
      wellHydratedDays.add(dateKey);
    } else if (total < 1.5) {
      poorlyHydratedDays.add(dateKey);
    }
  });

  let hydratedMoodSum = 0, hydratedMoodCount = 0;
  let dehydratedMoodSum = 0, dehydratedMoodCount = 0;

  wellHydratedDays.forEach(dateKey => {
    if (moodByDate[dateKey]) {
      const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
      hydratedMoodSum += avgMood;
      hydratedMoodCount++;
    }
  });

  poorlyHydratedDays.forEach(dateKey => {
    if (moodByDate[dateKey]) {
      const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
      dehydratedMoodSum += avgMood;
      dehydratedMoodCount++;
    }
  });

  if (hydratedMoodCount >= 2 && dehydratedMoodCount >= 2) {
    const avgHydrated = hydratedMoodSum / hydratedMoodCount;
    const avgDehydrated = dehydratedMoodSum / dehydratedMoodCount;
    const difference = avgHydrated - avgDehydrated;

    if (difference > 0.3) {
      patterns.push({
        id: 'hydration-mood',
        title: 'Hydration Affects Your Energy',
        message: `Well-hydrated days: mood ${avgHydrated.toFixed(1)}, low water days: ${avgDehydrated.toFixed(1)}`,
        confidence: Math.min(0.85, 0.4 + (hydratedMoodCount / 15)),
        type: 'positive',
        icon: 'water-outline',
        action: 'Aim for 8 glasses by 3pm',
        stats: {
          hydrated: avgHydrated.toFixed(1),
          dehydrated: avgDehydrated.toFixed(1),
          improvement: `+${(difference).toFixed(1)}`,
        },
      });
    }
  }

  // Pattern 3: Meal regularity
  const mealCountByDate = {};
  foodLogs.forEach(log => {
    const dateKey = new Date(log.timestamp || log.loggedDate).toISOString().split('T')[0];
    if (!mealCountByDate[dateKey]) mealCountByDate[dateKey] = 0;
    mealCountByDate[dateKey]++;
  });

  const regularDays = Object.entries(mealCountByDate).filter(([_, count]) => count >= 3).map(([date]) => date);
  const irregularDays = Object.entries(mealCountByDate).filter(([_, count]) => count < 2).map(([date]) => date);

  if (regularDays.length >= 3 && irregularDays.length >= 3) {
    let regularMoodSum = 0, regularMoodCount = 0;
    let irregularMoodSum = 0, irregularMoodCount = 0;

    regularDays.forEach(dateKey => {
      if (moodByDate[dateKey]) {
        const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
        regularMoodSum += avgMood;
        regularMoodCount++;
      }
    });

    irregularDays.forEach(dateKey => {
      if (moodByDate[dateKey]) {
        const avgMood = moodByDate[dateKey].reduce((a, b) => a + b, 0) / moodByDate[dateKey].length;
        irregularMoodSum += avgMood;
        irregularMoodCount++;
      }
    });

    if (regularMoodCount >= 2 && irregularMoodCount >= 2) {
      const avgRegular = regularMoodSum / regularMoodCount;
      const avgIrregular = irregularMoodSum / irregularMoodCount;

      if (avgRegular > avgIrregular + 0.3) {
        patterns.push({
          id: 'meal-regularity',
          title: 'Regular Meals = Stable Energy',
          message: `3+ meals/day: mood ${avgRegular.toFixed(1)}, skipped meals: ${avgIrregular.toFixed(1)}`,
          confidence: Math.min(0.8, 0.4 + (regularMoodCount / 10)),
          type: 'insight',
          icon: 'time-outline',
          action: 'Set meal reminders for consistency',
        });
      }
    }
  }

  // Sort by confidence and return top patterns
  return patterns
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export default {
  calculateFoodMoodScore,
  calculateScoreTrend,
  predictTomorrowScore,
  detectPatterns,
};
