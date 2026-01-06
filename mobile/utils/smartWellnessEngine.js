/**
 * Smart Wellness Engine - Competitive Food-Mood Analytics
 *
 * This is NOT a simple point calculator. This is a personal health intelligence system.
 *
 * Key Differentiators:
 * 1. LEARNS from YOUR data - not generic formulas
 * 2. CORRELATES food with mood outcomes
 * 3. PREDICTS how you'll feel based on what you eat
 * 4. ACTIONABLE - tells you exactly what to change
 * 5. CELEBRATES micro-wins to build habits
 */

// ============================================
// CORRELATION ANALYSIS ENGINE
// ============================================

/**
 * Analyze correlations between food patterns and mood outcomes
 * This is what makes this competitive - actual pattern detection
 *
 * @param {Array} historicalData - Array of daily data with food logs and mood logs
 * @returns {Object} - Correlation insights
 */
export function analyzeFoodMoodCorrelations(historicalData = []) {
  if (!historicalData || historicalData.length < 7) {
    return {
      hasEnoughData: false,
      daysAnalyzed: historicalData?.length || 0,
      daysNeeded: 7,
      correlations: [],
      topInsight: "Log meals and mood for 7 days to unlock personalized insights",
    };
  }

  const correlations = [];
  const patterns = {
    highProteinDays: [],
    lowProteinDays: [],
    highCarbDays: [],
    lowCarbDays: [],
    wellHydratedDays: [],
    dehydratedDays: [],
    breakfastDays: [],
    noBreakfastDays: [],
    earlyDinnerDays: [],
    lateDinnerDays: [],
  };

  // Categorize each day
  historicalData.forEach(day => {
    const nutrition = day.nutrition || {};
    const moodLogs = day.moodLogs || [];
    const foodLogs = day.foodLogs || [];
    const water = day.waterIntakeLiters || 0;

    if (moodLogs.length === 0) return; // Skip days without mood data

    const avgMood = moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length;
    const avgEnergy = moodLogs.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / moodLogs.length;

    const protein = nutrition.totalProtein || 0;
    const carbs = nutrition.totalCarbs || 0;
    const calories = nutrition.totalCalories || 0;

    // Protein analysis
    if (protein >= 100) {
      patterns.highProteinDays.push({ mood: avgMood, energy: avgEnergy });
    } else if (protein < 50) {
      patterns.lowProteinDays.push({ mood: avgMood, energy: avgEnergy });
    }

    // Carb analysis
    if (carbs >= 200) {
      patterns.highCarbDays.push({ mood: avgMood, energy: avgEnergy });
    } else if (carbs < 100) {
      patterns.lowCarbDays.push({ mood: avgMood, energy: avgEnergy });
    }

    // Hydration analysis
    if (water >= 2.0) {
      patterns.wellHydratedDays.push({ mood: avgMood, energy: avgEnergy });
    } else if (water < 1.0) {
      patterns.dehydratedDays.push({ mood: avgMood, energy: avgEnergy });
    }

    // Meal timing analysis
    const hasBreakfast = foodLogs.some(log => {
      const hour = new Date(log.timestamp || log.loggedDate).getHours();
      return hour >= 6 && hour <= 10;
    });

    if (hasBreakfast) {
      patterns.breakfastDays.push({ mood: avgMood, energy: avgEnergy });
    } else if (foodLogs.length > 0) {
      patterns.noBreakfastDays.push({ mood: avgMood, energy: avgEnergy });
    }

    // Dinner timing
    const dinnerLog = foodLogs.find(log => {
      const hour = new Date(log.timestamp || log.loggedDate).getHours();
      return hour >= 17 && hour <= 23;
    });

    if (dinnerLog) {
      const dinnerHour = new Date(dinnerLog.timestamp || dinnerLog.loggedDate).getHours();
      if (dinnerHour <= 19) {
        patterns.earlyDinnerDays.push({ mood: avgMood, energy: avgEnergy });
      } else {
        patterns.lateDinnerDays.push({ mood: avgMood, energy: avgEnergy });
      }
    }
  });

  // Calculate correlation insights
  const calculateAvg = (arr, key) => {
    if (arr.length === 0) return null;
    return arr.reduce((sum, item) => sum + item[key], 0) / arr.length;
  };

  const generateCorrelation = (highGroup, lowGroup, factor, highLabel, lowLabel) => {
    const highMood = calculateAvg(highGroup, 'mood');
    const lowMood = calculateAvg(lowGroup, 'mood');
    const highEnergy = calculateAvg(highGroup, 'energy');
    const lowEnergy = calculateAvg(lowGroup, 'energy');

    if (highMood === null || lowMood === null) return null;
    if (highGroup.length < 3 || lowGroup.length < 3) return null;

    const moodDiff = highMood - lowMood;
    const energyDiff = highEnergy - lowEnergy;

    if (Math.abs(moodDiff) < 0.5 && Math.abs(energyDiff) < 0.5) return null;

    return {
      factor,
      highLabel,
      lowLabel,
      moodImpact: Math.round(moodDiff * 10) / 10,
      energyImpact: Math.round(energyDiff * 10) / 10,
      confidence: Math.min(highGroup.length, lowGroup.length) >= 5 ? 'high' : 'medium',
      sampleSize: { high: highGroup.length, low: lowGroup.length },
      insight: moodDiff > 0
        ? `${highLabel} correlates with +${moodDiff.toFixed(1)} mood points`
        : `${lowLabel} correlates with +${Math.abs(moodDiff).toFixed(1)} mood points`,
      recommendation: moodDiff > 0.5
        ? `Try to ${highLabel.toLowerCase()} more often`
        : moodDiff < -0.5
        ? `Consider ${lowLabel.toLowerCase()}`
        : null,
    };
  };

  // Generate all correlations
  const proteinCorr = generateCorrelation(
    patterns.highProteinDays, patterns.lowProteinDays,
    'protein', 'High protein (100g+)', 'Low protein (<50g)'
  );
  if (proteinCorr) correlations.push(proteinCorr);

  const carbCorr = generateCorrelation(
    patterns.lowCarbDays, patterns.highCarbDays,
    'carbs', 'Low carb (<100g)', 'High carb (200g+)'
  );
  if (carbCorr) correlations.push(carbCorr);

  const hydrationCorr = generateCorrelation(
    patterns.wellHydratedDays, patterns.dehydratedDays,
    'hydration', 'Well hydrated (2L+)', 'Dehydrated (<1L)'
  );
  if (hydrationCorr) correlations.push(hydrationCorr);

  const breakfastCorr = generateCorrelation(
    patterns.breakfastDays, patterns.noBreakfastDays,
    'breakfast', 'Eating breakfast', 'Skipping breakfast'
  );
  if (breakfastCorr) correlations.push(breakfastCorr);

  const dinnerCorr = generateCorrelation(
    patterns.earlyDinnerDays, patterns.lateDinnerDays,
    'dinnerTiming', 'Early dinner (before 7pm)', 'Late dinner (after 7pm)'
  );
  if (dinnerCorr) correlations.push(dinnerCorr);

  // Sort by impact
  correlations.sort((a, b) => Math.abs(b.moodImpact) - Math.abs(a.moodImpact));

  return {
    hasEnoughData: true,
    daysAnalyzed: historicalData.length,
    correlations,
    topInsight: correlations[0]?.insight || "Keep logging to discover your patterns",
    topRecommendation: correlations[0]?.recommendation || null,
    patterns: {
      bestForMood: correlations.filter(c => c.moodImpact > 0.5).map(c => c.highLabel),
      worstForMood: correlations.filter(c => c.moodImpact < -0.5).map(c => c.lowLabel),
    },
  };
}

// ============================================
// PERSONALIZED WELLNESS SCORE
// ============================================

/**
 * Calculate a personalized wellness score based on YOUR patterns
 * Not generic formulas - this adapts to what works for YOU
 *
 * @param {Object} params - Today's data + historical patterns
 * @returns {Object} - Personalized score with insights
 */
export function calculatePersonalizedWellnessScore({
  // Today's data
  today = {},
  goals = {},

  // Historical data for personalization
  historicalData = [],
  correlations = null,

  // User context
  streak = 0,
}) {
  const nutrition = today.nutrition || {};
  const moodLogs = today.moodLogs || [];
  const foodLogs = today.foodLogs || [];
  const water = today.waterIntakeLiters || 0;

  // Base metrics
  const calories = nutrition.totalCalories || 0;
  const protein = nutrition.totalProtein || 0;
  const carbs = nutrition.totalCarbs || 0;
  const fats = nutrition.totalFats || 0;
  const fiber = nutrition.totalFiber || 0;

  const calorieGoal = goals.dailyCalories || 2000;
  const proteinGoal = goals.proteinG || 150;
  const waterGoal = goals.waterLiters || 2.5;

  // ============================================
  // DYNAMIC SCORING (learns from your data)
  // ============================================

  const breakdown = {
    nutrition: { score: 0, max: 30, factors: [] },
    hydration: { score: 0, max: 20, factors: [] },
    mood: { score: 0, max: 25, factors: [] },
    habits: { score: 0, max: 15, factors: [] },
    personalBonus: { score: 0, max: 10, factors: [] },
  };

  // 1. NUTRITION SCORE (0-30)
  const calorieRatio = calorieGoal > 0 ? calories / calorieGoal : 0;
  const proteinRatio = proteinGoal > 0 ? protein / proteinGoal : 0;

  // Calorie adherence (0-12)
  if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
    breakdown.nutrition.score += 12;
    breakdown.nutrition.factors.push({ label: 'Perfect calorie range', points: 12, icon: 'checkmark-circle' });
  } else if (calorieRatio >= 0.75 && calorieRatio <= 1.25) {
    breakdown.nutrition.score += 8;
    breakdown.nutrition.factors.push({ label: 'Good calorie range', points: 8, icon: 'checkmark' });
  } else if (calorieRatio > 0) {
    breakdown.nutrition.score += 3;
    breakdown.nutrition.factors.push({ label: 'Calories logged', points: 3, icon: 'alert' });
  }

  // Protein (0-12)
  if (proteinRatio >= 1.0) {
    breakdown.nutrition.score += 12;
    breakdown.nutrition.factors.push({ label: 'Protein goal hit!', points: 12, icon: 'barbell' });
  } else if (proteinRatio >= 0.8) {
    breakdown.nutrition.score += 9;
    breakdown.nutrition.factors.push({ label: '80%+ protein', points: 9, icon: 'barbell' });
  } else if (proteinRatio >= 0.5) {
    breakdown.nutrition.score += 5;
    breakdown.nutrition.factors.push({ label: '50%+ protein', points: 5, icon: 'barbell' });
  }

  // Fiber bonus (0-6)
  const fiberRatio = fiber / 30;
  if (fiberRatio >= 1.0) {
    breakdown.nutrition.score += 6;
    breakdown.nutrition.factors.push({ label: 'Fiber goal met', points: 6, icon: 'leaf' });
  } else if (fiberRatio >= 0.5) {
    breakdown.nutrition.score += 3;
    breakdown.nutrition.factors.push({ label: 'Good fiber intake', points: 3, icon: 'leaf' });
  }

  // 2. HYDRATION (0-20)
  const hydrationRatio = waterGoal > 0 ? water / waterGoal : 0;

  if (hydrationRatio >= 1.0) {
    breakdown.hydration.score = 20;
    breakdown.hydration.factors.push({ label: 'Fully hydrated!', points: 20, icon: 'water' });
  } else if (hydrationRatio >= 0.8) {
    breakdown.hydration.score = 16;
    breakdown.hydration.factors.push({ label: '80%+ hydration', points: 16, icon: 'water' });
  } else if (hydrationRatio >= 0.6) {
    breakdown.hydration.score = 12;
    breakdown.hydration.factors.push({ label: '60%+ hydration', points: 12, icon: 'water-outline' });
  } else if (hydrationRatio >= 0.4) {
    breakdown.hydration.score = 8;
    breakdown.hydration.factors.push({ label: 'Some water logged', points: 8, icon: 'water-outline' });
  } else if (water > 0) {
    breakdown.hydration.score = 4;
    breakdown.hydration.factors.push({ label: 'Water tracked', points: 4, icon: 'water-outline' });
  }

  // 3. MOOD (0-25)
  if (moodLogs.length > 0) {
    const avgMood = moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length;
    const avgEnergy = moodLogs.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / moodLogs.length;

    // Mood score (0-15)
    const moodScore = Math.round((avgMood / 10) * 15);
    breakdown.mood.score += moodScore;
    breakdown.mood.factors.push({
      label: `Mood: ${avgMood.toFixed(1)}/10`,
      points: moodScore,
      icon: avgMood >= 7 ? 'happy' : avgMood >= 4 ? 'happy-outline' : 'sad-outline'
    });

    // Energy score (0-10)
    const energyScore = Math.round((avgEnergy / 10) * 10);
    breakdown.mood.score += energyScore;
    breakdown.mood.factors.push({
      label: `Energy: ${avgEnergy.toFixed(1)}/10`,
      points: energyScore,
      icon: 'flash'
    });
  } else {
    // Encourage logging mood
    breakdown.mood.score = 8; // Neutral baseline
    breakdown.mood.factors.push({ label: 'Log mood for full score', points: 8, icon: 'help-circle' });
  }

  // 4. HABITS (0-15)
  // Streak bonus (0-8)
  if (streak >= 30) {
    breakdown.habits.score += 8;
    breakdown.habits.factors.push({ label: `${streak} day streak!`, points: 8, icon: 'flame' });
  } else if (streak >= 14) {
    breakdown.habits.score += 6;
    breakdown.habits.factors.push({ label: `${streak} day streak`, points: 6, icon: 'flame' });
  } else if (streak >= 7) {
    breakdown.habits.score += 4;
    breakdown.habits.factors.push({ label: `${streak} day streak`, points: 4, icon: 'flame' });
  } else if (streak >= 1) {
    breakdown.habits.score += 2;
    breakdown.habits.factors.push({ label: `${streak} day streak`, points: 2, icon: 'flame-outline' });
  }

  // Meal timing (0-7)
  if (foodLogs.length >= 3) {
    const hasBreakfast = foodLogs.some(log => {
      const hour = new Date(log.timestamp || log.loggedDate).getHours();
      return hour >= 6 && hour <= 10;
    });
    const hasLunch = foodLogs.some(log => {
      const hour = new Date(log.timestamp || log.loggedDate).getHours();
      return hour >= 11 && hour <= 14;
    });
    const hasDinner = foodLogs.some(log => {
      const hour = new Date(log.timestamp || log.loggedDate).getHours();
      return hour >= 17 && hour <= 21;
    });

    let timingScore = 0;
    if (hasBreakfast) timingScore += 3;
    if (hasLunch) timingScore += 2;
    if (hasDinner) timingScore += 2;

    breakdown.habits.score += timingScore;
    if (timingScore >= 5) {
      breakdown.habits.factors.push({ label: 'Regular meal times', points: timingScore, icon: 'time' });
    }
  }

  // 5. PERSONAL BONUS (0-10) - Based on YOUR correlations
  if (correlations?.hasEnoughData && correlations.correlations.length > 0) {
    let personalBonus = 0;

    correlations.correlations.forEach(corr => {
      if (corr.moodImpact > 0.5) {
        // Check if today follows the positive pattern
        if (corr.factor === 'protein' && protein >= 100) {
          personalBonus += 3;
          breakdown.personalBonus.factors.push({
            label: 'Following your protein pattern',
            points: 3,
            icon: 'trending-up'
          });
        }
        if (corr.factor === 'hydration' && water >= 2.0) {
          personalBonus += 3;
          breakdown.personalBonus.factors.push({
            label: 'Staying well hydrated',
            points: 3,
            icon: 'trending-up'
          });
        }
        if (corr.factor === 'breakfast') {
          const hasBreakfast = foodLogs.some(log => {
            const hour = new Date(log.timestamp || log.loggedDate).getHours();
            return hour >= 6 && hour <= 10;
          });
          if (hasBreakfast) {
            personalBonus += 2;
            breakdown.personalBonus.factors.push({
              label: 'Ate breakfast (works for you!)',
              points: 2,
              icon: 'sunny'
            });
          }
        }
      }
    });

    breakdown.personalBonus.score = Math.min(10, personalBonus);
  }

  // Calculate total score
  const totalScore = Math.min(100, Math.max(0,
    breakdown.nutrition.score +
    breakdown.hydration.score +
    breakdown.mood.score +
    breakdown.habits.score +
    breakdown.personalBonus.score
  ));

  // Determine tier
  let tier, label, emoji, color;
  if (totalScore >= 85) {
    tier = 'excellent';
    label = 'Thriving';
    emoji = '🌟';
    color = '#10B981';
  } else if (totalScore >= 70) {
    tier = 'great';
    label = 'Great';
    emoji = '💪';
    color = '#6B4EFF';
  } else if (totalScore >= 55) {
    tier = 'good';
    label = 'Good';
    emoji = '👍';
    color = '#3B82F6';
  } else if (totalScore >= 40) {
    tier = 'fair';
    label = 'Building';
    emoji = '📈';
    color = '#F59E0B';
  } else {
    tier = 'starting';
    label = 'Getting Started';
    emoji = '🌱';
    color = '#6B7280';
  }

  return {
    score: totalScore,
    tier,
    label,
    emoji,
    color,
    breakdown,
    isPersonalized: correlations?.hasEnoughData || false,
  };
}

// ============================================
// PREDICTIVE INSIGHTS
// ============================================

/**
 * Predict tomorrow's wellness based on today's choices
 *
 * @param {Object} today - Today's data
 * @param {Object} correlations - User's patterns
 * @returns {Object} - Prediction
 */
export function predictTomorrowsWellness(today, correlations) {
  if (!correlations?.hasEnoughData) {
    return {
      hasPrediction: false,
      message: "Keep logging for 7+ days to unlock predictions",
    };
  }

  const nutrition = today.nutrition || {};
  const water = today.waterIntakeLiters || 0;
  const protein = nutrition.totalProtein || 0;

  let predictedMood = 5; // Baseline
  const factors = [];

  correlations.correlations.forEach(corr => {
    if (corr.factor === 'protein') {
      if (protein >= 100 && corr.moodImpact > 0) {
        predictedMood += corr.moodImpact * 0.5;
        factors.push({ positive: true, text: `High protein today (+${(corr.moodImpact * 0.5).toFixed(1)})` });
      } else if (protein < 50 && corr.moodImpact > 0) {
        predictedMood -= corr.moodImpact * 0.3;
        factors.push({ positive: false, text: `Low protein may affect mood` });
      }
    }

    if (corr.factor === 'hydration') {
      if (water >= 2.0 && corr.moodImpact > 0) {
        predictedMood += corr.moodImpact * 0.4;
        factors.push({ positive: true, text: `Good hydration (+${(corr.moodImpact * 0.4).toFixed(1)})` });
      } else if (water < 1.0 && corr.moodImpact > 0) {
        predictedMood -= corr.moodImpact * 0.4;
        factors.push({ positive: false, text: `Low water may impact energy` });
      }
    }
  });

  predictedMood = Math.min(10, Math.max(1, predictedMood));

  return {
    hasPrediction: true,
    predictedMood: Math.round(predictedMood * 10) / 10,
    confidence: factors.length >= 2 ? 'medium' : 'low',
    factors,
    message: predictedMood >= 7
      ? "You're set up for a great day tomorrow!"
      : predictedMood >= 5
      ? "Tomorrow looks balanced"
      : "Consider adjustments for better energy tomorrow",
  };
}

// ============================================
// MICRO-CELEBRATIONS
// ============================================

/**
 * Generate micro-celebrations for achievements
 *
 * @param {Object} today - Today's data
 * @param {Object} goals - User's goals
 * @param {Object} yesterday - Yesterday's data (for comparisons)
 * @returns {Array} - Celebrations
 */
export function generateCelebrations(today, goals, yesterday = null) {
  const celebrations = [];
  const nutrition = today.nutrition || {};
  const water = today.waterIntakeLiters || 0;
  const moodLogs = today.moodLogs || [];

  // Water goal
  if (water >= (goals.waterLiters || 2.5)) {
    celebrations.push({
      type: 'goal',
      icon: '💧',
      title: 'Hydration Goal!',
      message: 'You hit your water target today',
      color: '#3B82F6',
    });
  }

  // Protein goal
  if ((nutrition.totalProtein || 0) >= (goals.proteinG || 150)) {
    celebrations.push({
      type: 'goal',
      icon: '💪',
      title: 'Protein Champion!',
      message: 'You crushed your protein goal',
      color: '#8B5CF6',
    });
  }

  // Calorie accuracy
  const calorieRatio = (nutrition.totalCalories || 0) / (goals.dailyCalories || 2000);
  if (calorieRatio >= 0.95 && calorieRatio <= 1.05) {
    celebrations.push({
      type: 'precision',
      icon: '🎯',
      title: 'Perfect Balance!',
      message: 'Calories within 5% of your goal',
      color: '#10B981',
    });
  }

  // Mood improvement
  if (moodLogs.length > 0 && yesterday?.moodLogs?.length > 0) {
    const todayAvg = moodLogs.reduce((s, m) => s + (m.intensity || 5), 0) / moodLogs.length;
    const yesterdayAvg = yesterday.moodLogs.reduce((s, m) => s + (m.intensity || 5), 0) / yesterday.moodLogs.length;

    if (todayAvg > yesterdayAvg + 1) {
      celebrations.push({
        type: 'improvement',
        icon: '📈',
        title: 'Mood Boost!',
        message: `Your mood improved by ${(todayAvg - yesterdayAvg).toFixed(1)} points`,
        color: '#F59E0B',
      });
    }
  }

  // High mood
  if (moodLogs.length > 0) {
    const avgMood = moodLogs.reduce((s, m) => s + (m.intensity || 5), 0) / moodLogs.length;
    if (avgMood >= 8) {
      celebrations.push({
        type: 'mood',
        icon: '🌟',
        title: 'Amazing Day!',
        message: 'Your mood is excellent today',
        color: '#10B981',
      });
    }
  }

  // Fiber hero
  if ((nutrition.totalFiber || 0) >= 30) {
    celebrations.push({
      type: 'goal',
      icon: '🥬',
      title: 'Fiber Hero!',
      message: 'Great job getting your daily fiber',
      color: '#22C55E',
    });
  }

  return celebrations;
}

// ============================================
// ACTIONABLE RECOMMENDATIONS
// ============================================

/**
 * Generate specific, actionable recommendations
 * Not generic "eat better" - specific "add 30g protein to lunch"
 *
 * @param {Object} today - Today's data
 * @param {Object} goals - User's goals
 * @param {Object} correlations - User's patterns
 * @returns {Array} - Specific recommendations
 */
export function generateSmartRecommendations(today, goals, correlations = null) {
  const recommendations = [];
  const nutrition = today.nutrition || {};
  const water = today.waterIntakeLiters || 0;
  const moodLogs = today.moodLogs || [];
  const foodLogs = today.foodLogs || [];

  const calories = nutrition.totalCalories || 0;
  const protein = nutrition.totalProtein || 0;
  const calorieGoal = goals.dailyCalories || 2000;
  const proteinGoal = goals.proteinG || 150;
  const waterGoal = goals.waterLiters || 2.5;

  const remainingCalories = Math.max(0, calorieGoal - calories);
  const remainingProtein = Math.max(0, proteinGoal - protein);
  const remainingWater = Math.max(0, waterGoal - water);

  const hour = new Date().getHours();

  // Protein recommendation
  if (remainingProtein > 30 && hour < 20) {
    recommendations.push({
      priority: 'high',
      icon: 'barbell',
      title: `Add ${Math.round(remainingProtein)}g protein`,
      message: hour < 14
        ? 'Add chicken or Greek yogurt to lunch'
        : 'Consider a protein-rich dinner',
      action: 'Log protein-rich meal',
      color: '#8B5CF6',
    });
  }

  // Water recommendation
  if (remainingWater > 0.5 && hour < 21) {
    const glasses = Math.ceil(remainingWater / 0.25);
    recommendations.push({
      priority: remainingWater > 1 ? 'high' : 'medium',
      icon: 'water',
      title: `Drink ${glasses} more glasses`,
      message: `${remainingWater.toFixed(1)}L to reach your goal`,
      action: 'Log water',
      color: '#3B82F6',
    });
  }

  // Calorie recommendation
  if (remainingCalories > 500 && hour >= 17 && hour < 21) {
    recommendations.push({
      priority: 'medium',
      icon: 'restaurant',
      title: `${Math.round(remainingCalories)} cal remaining`,
      message: 'Have a balanced dinner to hit your goal',
      action: 'Log dinner',
      color: '#10B981',
    });
  } else if (calories > calorieGoal * 1.2) {
    recommendations.push({
      priority: 'low',
      icon: 'alert-circle',
      title: 'Over calorie goal',
      message: 'Consider a lighter dinner or extra activity',
      action: null,
      color: '#F59E0B',
    });
  }

  // Mood logging
  if (moodLogs.length === 0 && hour >= 10) {
    recommendations.push({
      priority: 'medium',
      icon: 'happy',
      title: 'Log your mood',
      message: 'Track how you feel to unlock insights',
      action: 'Log mood',
      color: '#F59E0B',
    });
  }

  // Personalized recommendation based on correlations
  if (correlations?.hasEnoughData && correlations.topRecommendation) {
    recommendations.push({
      priority: 'high',
      icon: 'bulb',
      title: 'Personal insight',
      message: correlations.topRecommendation,
      action: null,
      color: '#6B4EFF',
      isPersonalized: true,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 3); // Top 3
}

// ============================================
// MAIN EXPORT - COMPREHENSIVE WELLNESS ANALYSIS
// ============================================

/**
 * Main function: Complete wellness analysis for dashboard
 *
 * @param {Object} params - All needed data
 * @returns {Object} - Complete wellness analysis
 */
export function analyzeWellness({
  today = {},
  goals = {},
  historicalData = [],
  streak = 0,
  yesterday = null,
}) {
  // 1. Analyze correlations from history
  const correlations = analyzeFoodMoodCorrelations(historicalData);

  // 2. Calculate personalized score
  const score = calculatePersonalizedWellnessScore({
    today,
    goals,
    historicalData,
    correlations,
    streak,
  });

  // 3. Predict tomorrow
  const prediction = predictTomorrowsWellness(today, correlations);

  // 4. Generate celebrations
  const celebrations = generateCelebrations(today, goals, yesterday);

  // 5. Generate recommendations
  const recommendations = generateSmartRecommendations(today, goals, correlations);

  return {
    score,
    correlations,
    prediction,
    celebrations,
    recommendations,
    isPersonalized: correlations.hasEnoughData,
    dataStatus: {
      daysAnalyzed: correlations.daysAnalyzed,
      daysNeeded: 7,
      hasEnoughForCorrelations: correlations.hasEnoughData,
      hasEnoughForPredictions: correlations.daysAnalyzed >= 14,
    },
  };
}

export default {
  analyzeWellness,
  analyzeFoodMoodCorrelations,
  calculatePersonalizedWellnessScore,
  predictTomorrowsWellness,
  generateCelebrations,
  generateSmartRecommendations,
};
