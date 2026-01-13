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
 * PERSONALIZED BODY INTELLIGENCE SYSTEM
 *
 * This system learns YOUR unique patterns - how YOUR body responds to food,
 * hydration, and lifestyle choices. It combines:
 *
 * 1. SCIENTIFIC BASELINE - Research-backed starting points
 * 2. PERSONAL LEARNING - Adapts weights based on YOUR historical correlations
 * 3. PROGRESSIVE INSIGHTS - Gets smarter as you log more data
 *
 * Research Foundation:
 * - Harvard Health Nutritional Psychiatry
 * - PMC7322666: Dietary patterns and mental health
 * - PMC3718776: Protein and cognition (+3.5%)
 * - PMC4207053: Hydration and cognitive function
 * - PMC11522855: Sugar intake and mood (23% risk at >50g)
 * - PMC10528427: Meal timing and circadian rhythm
 * - PMC10055576: Fiber and gut-brain axis
 */

// Scientific baseline impact values (adjusted by personal learning)
const BASELINE_IMPACTS = {
  LATE_NIGHT_EATING_HEAVY: -8,
  LATE_NIGHT_EATING_LIGHT: -4,
  PROTEIN_BREAKFAST: +4,
  SKIPPED_BREAKFAST: -3,
  REGULAR_MEAL_PATTERN: +5,
  HIGH_PROTEIN: +5,
  LOW_PROTEIN: -4,
  HIGH_FIBER: +4,
  LOW_FIBER: -3,
  HIGH_SUGAR: -5,
  VERY_HIGH_SUGAR: -8,
  BALANCED_CALORIES: +4,
  EXCESS_CALORIES: -4,
  LOW_CALORIES: -4,
  HEAVY_EVENING_CARBS: -4,
  BALANCED_MACROS: +3,
  WELL_HYDRATED: +4,
  MILD_DEHYDRATION: -3,
  POSITIVE_MOOD: +3,
  LOW_MOOD: -2,
};

/**
 * Learn personal correlation weights from historical data
 * This makes the system adapt to YOUR unique body responses
 */
function learnPersonalWeights(historicalPatterns = []) {
  const personalWeights = { ...BASELINE_IMPACTS };

  if (historicalPatterns.length < 7) {
    // Not enough data - use scientific baseline
    return { weights: personalWeights, learningLevel: 'baseline', dataPoints: historicalPatterns.length };
  }

  // Analyze personal correlations from history
  const correlations = {};

  historicalPatterns.forEach(day => {
    if (!day.mood || !day.meals) return;

    const moodScore = day.mood.intensity || 5;
    const hadBreakfastProtein = day.meals.some(m => {
      const hour = new Date(m.timestamp || m.loggedDate).getHours();
      return hour >= 6 && hour <= 10 && (m.protein || 0) >= 20;
    });
    const hadLateNight = day.meals.some(m => {
      const hour = new Date(m.timestamp || m.loggedDate).getHours();
      return hour >= 21 || hour < 5;
    });
    const totalSugar = day.meals.reduce((sum, m) => sum + (m.sugar || 0), 0);
    const totalFiber = day.meals.reduce((sum, m) => sum + (m.fiber || 0), 0);
    const hydration = day.water || 0;

    // Track correlations
    if (hadBreakfastProtein) {
      if (!correlations.breakfastProtein) correlations.breakfastProtein = [];
      correlations.breakfastProtein.push(moodScore);
    }
    if (hadLateNight) {
      if (!correlations.lateNight) correlations.lateNight = [];
      correlations.lateNight.push(moodScore);
    }
    if (totalSugar > 50) {
      if (!correlations.highSugar) correlations.highSugar = [];
      correlations.highSugar.push(moodScore);
    }
    if (totalFiber >= 20) {
      if (!correlations.highFiber) correlations.highFiber = [];
      correlations.highFiber.push(moodScore);
    }
    if (hydration >= 2) {
      if (!correlations.wellHydrated) correlations.wellHydrated = [];
      correlations.wellHydrated.push(moodScore);
    }
  });

  // Calculate personal adjustments based on YOUR data
  const avgMood = historicalPatterns
    .filter(d => d.mood)
    .reduce((sum, d) => sum + (d.mood.intensity || 5), 0) /
    Math.max(1, historicalPatterns.filter(d => d.mood).length);

  // Adjust weights based on personal correlations
  if (correlations.breakfastProtein && correlations.breakfastProtein.length >= 3) {
    const avgWithProtein = correlations.breakfastProtein.reduce((a, b) => a + b, 0) / correlations.breakfastProtein.length;
    const personalImpact = (avgWithProtein - avgMood) * 1.5; // Scale to impact points
    personalWeights.PROTEIN_BREAKFAST = Math.round(BASELINE_IMPACTS.PROTEIN_BREAKFAST + personalImpact);
  }

  if (correlations.lateNight && correlations.lateNight.length >= 3) {
    const avgLateNight = correlations.lateNight.reduce((a, b) => a + b, 0) / correlations.lateNight.length;
    const personalImpact = (avgLateNight - avgMood) * 1.5;
    personalWeights.LATE_NIGHT_EATING_HEAVY = Math.round(Math.min(-2, BASELINE_IMPACTS.LATE_NIGHT_EATING_HEAVY + personalImpact));
  }

  if (correlations.highSugar && correlations.highSugar.length >= 3) {
    const avgHighSugar = correlations.highSugar.reduce((a, b) => a + b, 0) / correlations.highSugar.length;
    const personalImpact = (avgHighSugar - avgMood) * 1.5;
    personalWeights.HIGH_SUGAR = Math.round(Math.min(-2, BASELINE_IMPACTS.HIGH_SUGAR + personalImpact));
  }

  const learningLevel = historicalPatterns.length >= 30 ? 'personalized' :
    historicalPatterns.length >= 14 ? 'learning' : 'early';

  return { weights: personalWeights, learningLevel, dataPoints: historicalPatterns.length };
}

/**
 * Generate personalized body insights based on today's nutrition
 * This learns YOUR unique patterns and provides actionable recommendations
 *
 * @param {Object} params - Analysis parameters
 * @returns {Object} - Personalized insights with confidence levels
 */
export function predictTomorrowScore({
  todaysMeals = [],
  todaysMood = null,
  todaysWater = 0,
  historicalPatterns = [],
  currentScore = 50,
  goals = {},
}) {
  // Learn from YOUR historical data to personalize recommendations
  const { weights: IMPACT, learningLevel, dataPoints } = learnPersonalWeights(historicalPatterns);

  const insights = [];

  // Calculate comprehensive nutrition totals
  const totals = todaysMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fat || meal.fats || 0),
    fiber: acc.fiber + (meal.fiber || 0),
    sugar: acc.sugar + (meal.sugar || 0),
    sodium: acc.sodium + (meal.sodium || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 });

  // Get goals with defaults (based on standard dietary guidelines)
  const calorieGoal = goals.dailyCalories || 2000;
  const proteinGoal = goals.proteinG || 100;
  const fiberGoal = goals.fiberG || 25;

  // ============================================================
  // MEAL TIMING ANALYSIS (Your body's natural rhythm)
  // ============================================================
  const breakfastMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 6 && hour <= 10;
  });
  const lunchMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 11 && hour <= 14;
  });
  const dinnerMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 17 && hour <= 21;
  });
  const lateNightMeals = todaysMeals.filter(m => {
    const hour = new Date(m.timestamp || m.loggedDate).getHours();
    return hour >= 21 || hour < 5;
  });

  // Late-night eating disrupts your sleep quality
  if (lateNightMeals.length > 0) {
    const lateNightCalories = lateNightMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const isHeavy = lateNightCalories > 300;
    insights.push({
      factor: 'Late-night eating',
      impact: isHeavy ? IMPACT.LATE_NIGHT_EATING_HEAVY : IMPACT.LATE_NIGHT_EATING_LIGHT,
      confidence: 0.80,
      suggestion: 'Your body recovers best when you finish eating by 8pm',
      icon: 'moon-outline',
      category: 'timing',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // Breakfast protein supports your morning focus
  const breakfastProtein = breakfastMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  if (breakfastMeals.length > 0 && breakfastProtein >= 20) {
    insights.push({
      factor: 'Protein-rich breakfast',
      impact: IMPACT.PROTEIN_BREAKFAST,
      confidence: 0.75,
      suggestion: 'Great start! This fuels your morning focus',
      icon: 'sunny-outline',
      category: 'nutrition',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (breakfastMeals.length === 0 && todaysMeals.length > 0) {
    insights.push({
      factor: 'Skipped breakfast',
      impact: IMPACT.SKIPPED_BREAKFAST,
      confidence: 0.65,
      suggestion: 'Try eggs or yogurt - your body responds well to morning protein',
      icon: 'sunny-outline',
      category: 'timing',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // Regular meal pattern supports stable energy
  if (breakfastMeals.length > 0 && lunchMeals.length > 0 && dinnerMeals.length > 0) {
    insights.push({
      factor: 'Consistent eating pattern',
      impact: IMPACT.REGULAR_MEAL_PATTERN,
      confidence: 0.75,
      suggestion: 'Your body thrives on this rhythm',
      icon: 'time-outline',
      category: 'timing',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // PROTEIN ANALYSIS (Your energy building blocks)
  // ============================================================
  const proteinRatio = proteinGoal > 0 ? totals.protein / proteinGoal : 0;
  if (proteinRatio >= 0.9) {
    insights.push({
      factor: 'Strong protein intake',
      impact: IMPACT.HIGH_PROTEIN,
      confidence: 0.80,
      suggestion: 'Your muscles and mood benefit from this',
      icon: 'fitness-outline',
      category: 'nutrition',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (proteinRatio < 0.5 && totals.protein > 0) {
    insights.push({
      factor: 'Low protein today',
      impact: IMPACT.LOW_PROTEIN,
      confidence: 0.70,
      suggestion: 'Your body needs more protein for optimal energy',
      icon: 'nutrition-outline',
      category: 'nutrition',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // FIBER ANALYSIS (Your gut health)
  // ============================================================
  const fiberRatio = fiberGoal > 0 ? totals.fiber / fiberGoal : 0;
  if (fiberRatio >= 0.8) {
    insights.push({
      factor: 'Excellent fiber intake',
      impact: IMPACT.HIGH_FIBER,
      confidence: 0.75,
      suggestion: 'Great for your gut health and steady energy',
      icon: 'leaf-outline',
      category: 'nutrition',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (totals.fiber < 10 && todaysMeals.length >= 2) {
    insights.push({
      factor: 'Low fiber today',
      impact: IMPACT.LOW_FIBER,
      confidence: 0.65,
      suggestion: 'Add veggies or whole grains for better digestion',
      icon: 'leaf-outline',
      category: 'nutrition',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // SUGAR ANALYSIS (Your energy stability)
  // ============================================================
  if (totals.sugar > 50) {
    const isVeryHigh = totals.sugar > 75;
    insights.push({
      factor: isVeryHigh ? 'Very high sugar' : 'High sugar intake',
      impact: isVeryHigh ? IMPACT.VERY_HIGH_SUGAR : IMPACT.HIGH_SUGAR,
      confidence: 0.80,
      suggestion: isVeryHigh
        ? 'This may cause energy crashes - your body prefers whole foods'
        : 'Consider swapping some sweets for fruit',
      icon: 'cafe-outline',
      category: 'nutrition',
      detail: `${Math.round(totals.sugar)}g today`,
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // CALORIE BALANCE (Your energy levels)
  // ============================================================
  const calorieRatio = calorieGoal > 0 ? totals.calories / calorieGoal : 0;
  if (calorieRatio >= 0.85 && calorieRatio <= 1.15) {
    insights.push({
      factor: 'Balanced energy',
      impact: IMPACT.BALANCED_CALORIES,
      confidence: 0.75,
      suggestion: 'Right on target for how your body works best',
      icon: 'checkmark-circle-outline',
      category: 'energy',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (calorieRatio > 1.3) {
    insights.push({
      factor: 'Heavy eating day',
      impact: IMPACT.EXCESS_CALORIES,
      confidence: 0.65,
      suggestion: 'You might feel sluggish - consider lighter meals tomorrow',
      icon: 'trending-up-outline',
      category: 'energy',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (calorieRatio < 0.6 && todaysMeals.length >= 2) {
    insights.push({
      factor: 'Under-fueled',
      impact: IMPACT.LOW_CALORIES,
      confidence: 0.65,
      suggestion: 'Your body needs more fuel to feel its best',
      icon: 'trending-down-outline',
      category: 'energy',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // MACRO BALANCE (Your nutrient mix)
  // ============================================================
  const totalMacros = totals.protein + totals.carbs + totals.fats;
  if (totalMacros > 0) {
    const proteinPct = (totals.protein / totalMacros) * 100;
    const carbsPct = (totals.carbs / totalMacros) * 100;

    // Heavy carb dinner affects sleep
    const dinnerCarbs = dinnerMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    if (dinnerCarbs > 100 && carbsPct > 60) {
      insights.push({
        factor: 'Heavy evening carbs',
        impact: IMPACT.HEAVY_EVENING_CARBS,
        confidence: 0.65,
        suggestion: 'Balance with protein for better sleep quality',
        icon: 'restaurant-outline',
        category: 'timing',
        isPersonalized: learningLevel !== 'baseline',
      });
    }

    // Well-balanced macros
    if (proteinPct >= 20 && proteinPct <= 35 && carbsPct >= 35 && carbsPct <= 55) {
      insights.push({
        factor: 'Balanced nutrition',
        impact: IMPACT.BALANCED_MACROS,
        confidence: 0.70,
        suggestion: 'Great mix of nutrients for sustained energy',
        icon: 'pie-chart-outline',
        category: 'nutrition',
        isPersonalized: learningLevel !== 'baseline',
      });
    }
  }

  // ============================================================
  // HYDRATION (Your brain function)
  // ============================================================
  if (todaysWater >= 2) {
    insights.push({
      factor: 'Well hydrated',
      impact: IMPACT.WELL_HYDRATED,
      confidence: 0.75,
      suggestion: 'Your brain thanks you for staying hydrated',
      icon: 'water-outline',
      category: 'hydration',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (todaysWater > 0 && todaysWater < 1.5) {
    insights.push({
      factor: 'Need more water',
      impact: IMPACT.MILD_DEHYDRATION,
      confidence: 0.70,
      suggestion: 'Your focus improves with better hydration',
      icon: 'water-outline',
      category: 'hydration',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // MOOD CONTINUITY (Your emotional momentum)
  // ============================================================
  if (todaysMood && todaysMood.intensity >= 7) {
    insights.push({
      factor: 'Positive momentum',
      impact: IMPACT.POSITIVE_MOOD,
      confidence: 0.55,
      suggestion: 'Ride this wave - good energy often continues',
      icon: 'happy-outline',
      category: 'mood',
      isPersonalized: learningLevel !== 'baseline',
    });
  } else if (todaysMood && todaysMood.intensity <= 4) {
    insights.push({
      factor: 'Recovery mode',
      impact: IMPACT.LOW_MOOD,
      confidence: 0.50,
      suggestion: 'Rest well tonight - tomorrow is a fresh start',
      icon: 'bed-outline',
      category: 'mood',
      isPersonalized: learningLevel !== 'baseline',
    });
  }

  // ============================================================
  // CALCULATE PERSONALIZED SCORE
  // ============================================================
  let totalImpact = 0;
  let totalWeight = 0;
  insights.forEach(p => {
    totalImpact += p.impact * p.confidence;
    totalWeight += p.confidence;
  });

  const avgImpact = totalWeight > 0 ? totalImpact / totalWeight : 0;
  const predictedScore = Math.min(100, Math.max(0, Math.round(currentScore + avgImpact)));

  // Confidence increases as we learn YOUR patterns
  const dataQuality = Math.min(1, todaysMeals.length / 3);
  const learningBonus = learningLevel === 'personalized' ? 0.15 : learningLevel === 'learning' ? 0.08 : 0;
  const overallConfidence = insights.length > 0
    ? Math.min(0.90, (insights.reduce((sum, p) => sum + p.confidence, 0) / insights.length) * dataQuality + learningBonus)
    : 0.3;

  // Sort by absolute impact (most significant first)
  const sortedInsights = insights
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 4);

  // Generate personalized summary based on learning level
  const positiveCount = sortedInsights.filter(p => p.impact > 0).length;
  const negativeCount = sortedInsights.filter(p => p.impact < 0).length;
  let summary;

  if (insights.length === 0) {
    summary = 'Log meals to unlock your personal body insights';
  } else if (learningLevel === 'personalized') {
    // Fully personalized messaging
    if (positiveCount > negativeCount) {
      summary = `Your patterns show ${positiveCount} thing${positiveCount > 1 ? 's' : ''} working well today`;
    } else if (negativeCount > positiveCount) {
      summary = `Based on your history, ${negativeCount} area${negativeCount > 1 ? 's need' : ' needs'} attention`;
    } else {
      summary = `Balanced day - your body is adapting`;
    }
  } else if (learningLevel === 'learning') {
    summary = `Learning your patterns... ${dataPoints} days of data analyzed`;
  } else {
    // Early stage - science-based
    if (positiveCount > negativeCount) {
      summary = `${positiveCount} positive signal${positiveCount > 1 ? 's' : ''} detected today`;
    } else {
      summary = `Building your personal profile - keep logging`;
    }
  }

  return {
    predictedScore,
    currentScore,
    change: predictedScore - currentScore,
    confidence: overallConfidence,
    insights: sortedInsights,
    // Keep 'predictions' for backward compatibility
    predictions: sortedInsights,
    summary,
    nutritionSummary: totals,
    // New: Learning status
    learningStatus: {
      level: learningLevel,
      dataPoints,
      isPersonalized: learningLevel === 'personalized',
      message: learningLevel === 'personalized'
        ? 'Insights are personalized to your body'
        : learningLevel === 'learning'
          ? `${30 - dataPoints} more days to unlock full personalization`
          : 'Log daily to unlock personalized insights',
    },
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
  const totalLogs = foodLogs.length + moodLogs.length;

  // Show summary of what we have, even with minimal data
  if (totalLogs === 0) {
    return [{
      id: 'no-data',
      title: 'Start Your Journey',
      message: 'Log your first meal or mood to begin tracking patterns',
      confidence: 0,
      type: 'info',
      icon: 'rocket-outline',
    }];
  }

  // With some data but not enough for patterns, show what we CAN tell them
  const hasEnoughForPatterns = foodLogs.length >= 5 && moodLogs.length >= 3;

  // Always show a data summary when we have something
  if (!hasEnoughForPatterns) {
    const summaryPattern = {
      id: 'data-summary',
      title: 'Your Activity Summary',
      message: `${foodLogs.length} meal${foodLogs.length !== 1 ? 's' : ''} and ${moodLogs.length} mood${moodLogs.length !== 1 ? 's' : ''} logged in the last ${days} days`,
      confidence: 0.3,
      type: 'info',
      icon: 'bar-chart-outline',
      stats: {
        meals: foodLogs.length,
        moods: moodLogs.length,
        waters: waterLogs.length,
      },
    };
    patterns.push(summaryPattern);

    // Still encourage more logging
    if (foodLogs.length < 5 || moodLogs.length < 3) {
      patterns.push({
        id: 'encourage-logging',
        title: 'Unlock Deeper Insights',
        message: `Log ${Math.max(0, 5 - foodLogs.length)} more meals and ${Math.max(0, 3 - moodLogs.length)} more moods for personalized patterns`,
        confidence: 0,
        type: 'info',
        icon: 'sparkles-outline',
      });
    }
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
