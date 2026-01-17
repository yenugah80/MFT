/**
 * Personalized Pattern Engine
 *
 * A robust, production-grade pattern detection system that analyzes user data
 * to discover meaningful behavioral correlations:
 *
 * - "When you skip breakfast, your mood tends to crash around 3pm"
 * - "High-sugar dinners make you anxious the next morning"
 * - "On days you drink enough water, you're noticeably less irritable"
 * - "Morning workouts give you energy that lasts all day"
 *
 * Architecture:
 * - Temporal Pattern Detection: Analyzes time-of-day and day-over-day patterns
 * - Statistical Significance: Uses Bayesian inference with scientific priors
 * - Multi-Domain Analysis: Food, mood, hydration, activity correlations
 * - Graceful Degradation: Works with limited data, improves with more
 *
 * @module personalizedPatternEngine
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  // Minimum data requirements
  MIN_DAYS_FOR_ANALYSIS: 3,
  MIN_MOOD_LOGS: 5,
  MIN_FOOD_LOGS: 7,
  MIN_WATER_LOGS: 3,

  // Confidence thresholds
  HIGH_CONFIDENCE: 0.75,
  MEDIUM_CONFIDENCE: 0.55,
  LOW_CONFIDENCE: 0.40,

  // Time windows (hours)
  IMMEDIATE_EFFECT_WINDOW: 4,    // Effect within 4 hours
  SAME_DAY_WINDOW: 12,           // Same-day effect
  NEXT_DAY_WINDOW: 24,           // Next-day carryover

  // Meal timing boundaries (24h format)
  BREAKFAST_START: 5,
  BREAKFAST_END: 10,
  LUNCH_START: 11,
  LUNCH_END: 14,
  DINNER_START: 17,
  DINNER_END: 21,
  AFTERNOON_CRASH_WINDOW: { start: 14, end: 17 },

  // Thresholds
  HIGH_SUGAR_THRESHOLD: 25,      // grams per meal
  LOW_PROTEIN_THRESHOLD: 10,     // grams per meal
  HIGH_PROTEIN_THRESHOLD: 20,    // grams per meal
  DEHYDRATION_THRESHOLD: 1.5,    // liters per day
  OPTIMAL_HYDRATION: 2.5,        // liters per day
  MORNING_EXERCISE_END: 10,      // Before 10am
};

// Scientific priors based on research
const SCIENTIFIC_PRIORS = {
  BREAKFAST_SKIP_CRASH: {
    baseProbability: 0.65,
    evidenceLevel: 'moderate',
    mechanism: 'Blood sugar regulation after overnight fast',
    sources: ['Glycemic Index Research', 'Circadian Rhythm Studies'],
  },
  HIGH_SUGAR_MOOD_CRASH: {
    baseProbability: 0.70,
    evidenceLevel: 'strong',
    mechanism: 'Rapid glucose spike followed by insulin response',
    sources: ['WHO Nutritional Guidelines', 'Glycemic Load Studies'],
  },
  HYDRATION_MOOD: {
    baseProbability: 0.60,
    evidenceLevel: 'moderate',
    mechanism: 'Brain function requires adequate hydration',
    sources: ['CDC NHANES', 'Cognitive Function Studies'],
  },
  EXERCISE_MOOD_BOOST: {
    baseProbability: 0.80,
    evidenceLevel: 'strong',
    mechanism: 'Endorphin release, BDNF, neuroplasticity',
    sources: ['CDC Physical Activity Guidelines', 'Meta-analyses'],
  },
  MORNING_EXERCISE_ENERGY: {
    baseProbability: 0.72,
    evidenceLevel: 'moderate',
    mechanism: 'Circadian cortisol alignment, metabolic activation',
    sources: ['Circadian Rhythm Research'],
  },
};

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze all available data to detect personalized patterns
 *
 * @param {Object} data - User's health data
 * @param {Array} data.foodLogs - Food log entries with nutrition data
 * @param {Array} data.moodLogs - Mood entries with intensity, energy, mood type
 * @param {Array} data.waterLogs - Water intake entries
 * @param {Array} data.activityLogs - Activity/exercise entries
 * @param {Object} options - Analysis options
 * @returns {Object} Detected patterns with confidence scores
 */
export function analyzePersonalizedPatterns(data, options = {}) {
  const {
    foodLogs = [],
    moodLogs = [],
    waterLogs = [],
    activityLogs = [],
  } = data;

  const {
    minConfidence = CONFIG.LOW_CONFIDENCE,
    maxPatterns = 10,
  } = options;

  // Check data sufficiency
  const dataQuality = assessDataQuality(foodLogs, moodLogs, waterLogs, activityLogs);

  if (!dataQuality.canAnalyze) {
    return {
      success: true,
      hasEnoughData: false,
      message: dataQuality.message,
      suggestion: dataQuality.suggestion,
      patterns: [],
      categories: createEmptyCategories(),
      dataQuality,
    };
  }

  // Normalize and group data by date
  const dailyData = groupDataByDate(foodLogs, moodLogs, waterLogs, activityLogs);

  // Run all pattern detectors
  const patterns = [
    ...detectBreakfastPatterns(dailyData),
    ...detectMealTimingPatterns(dailyData),
    ...detectSugarMoodPatterns(dailyData),
    ...detectHydrationMoodPatterns(dailyData),
    ...detectActivityMoodPatterns(dailyData),
    ...detectNextDayCarryoverPatterns(dailyData),
    ...detectProteinEnergyPatterns(dailyData),
  ];

  // Filter by confidence and sort
  const significantPatterns = patterns
    .filter(p => p.confidence >= minConfidence)
    .sort((a, b) => {
      // Sort by confidence first, then by impact
      if (Math.abs(b.confidence - a.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      return Math.abs(b.strength) - Math.abs(a.strength);
    })
    .slice(0, maxPatterns);

  // Group by category
  const categories = groupPatternsByCategory(significantPatterns);

  return {
    success: true,
    hasEnoughData: true,
    patternsFound: significantPatterns.length,
    patterns: significantPatterns,
    categories,
    topInsight: significantPatterns[0] || null,
    dataQuality,
    analyzedDays: Object.keys(dailyData).length,
  };
}

// ============================================================================
// DATA QUALITY ASSESSMENT
// ============================================================================

function assessDataQuality(foodLogs, moodLogs, waterLogs, activityLogs) {
  const totalFood = foodLogs.length;
  const totalMood = moodLogs.length;
  const totalWater = waterLogs.length;
  const totalActivity = activityLogs.length;

  // Calculate unique days logged
  const allDates = new Set([
    ...foodLogs.map(l => getDateKey(l.loggedDate || l.createdAt)),
    ...moodLogs.map(l => getDateKey(l.loggedDate || l.createdAt)),
    ...waterLogs.map(l => getDateKey(l.loggedDate || l.createdAt)),
  ]);
  const uniqueDays = allDates.size;

  // Determine if we can analyze
  const canAnalyze = (
    totalMood >= CONFIG.MIN_MOOD_LOGS &&
    totalFood >= CONFIG.MIN_FOOD_LOGS &&
    uniqueDays >= CONFIG.MIN_DAYS_FOR_ANALYSIS
  );

  // Calculate quality score (0-100)
  let score = 0;
  score += Math.min(totalMood / 20, 1) * 25;        // Up to 25 points for mood
  score += Math.min(totalFood / 30, 1) * 25;        // Up to 25 points for food
  score += Math.min(totalWater / 20, 1) * 15;       // Up to 15 points for water
  score += Math.min(totalActivity / 10, 1) * 15;   // Up to 15 points for activity
  score += Math.min(uniqueDays / 14, 1) * 20;       // Up to 20 points for days

  let label = 'insufficient';
  if (score >= 80) label = 'excellent';
  else if (score >= 60) label = 'good';
  else if (score >= 40) label = 'moderate';
  else if (score >= 20) label = 'basic';

  // Generate helpful message
  let message = 'Keep logging to discover your patterns.';
  let suggestion = 'Log meals, mood, and water daily for best results.';

  if (!canAnalyze) {
    if (totalMood < CONFIG.MIN_MOOD_LOGS) {
      message = `Need ${CONFIG.MIN_MOOD_LOGS - totalMood} more mood entries to start analysis.`;
      suggestion = 'Log how you feel a few times today!';
    } else if (totalFood < CONFIG.MIN_FOOD_LOGS) {
      message = `Need ${CONFIG.MIN_FOOD_LOGS - totalFood} more food entries to start analysis.`;
      suggestion = 'Log your meals to see how food affects your mood.';
    } else if (uniqueDays < CONFIG.MIN_DAYS_FOR_ANALYSIS) {
      message = `Need ${CONFIG.MIN_DAYS_FOR_ANALYSIS - uniqueDays} more days of data.`;
      suggestion = 'Keep logging daily - patterns emerge over time!';
    }
  }

  return {
    canAnalyze,
    score: Math.round(score),
    label,
    message,
    suggestion,
    metrics: {
      foodLogs: totalFood,
      moodLogs: totalMood,
      waterLogs: totalWater,
      activityLogs: totalActivity,
      uniqueDays,
    },
    patternsFound: 0, // Will be updated later
  };
}

// ============================================================================
// DATA GROUPING UTILITIES
// ============================================================================

function getDateKey(dateInput) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  return date.toISOString().split('T')[0];
}

function getHour(dateInput) {
  if (!dateInput) return 12;
  const date = new Date(dateInput);
  return date.getHours();
}

function groupDataByDate(foodLogs, moodLogs, waterLogs, activityLogs) {
  const dailyData = {};

  // Helper to ensure day exists
  const ensureDay = (dateKey) => {
    if (!dateKey) return null;
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
        allFood: [],
        moods: { morning: [], afternoon: [], evening: [], all: [] },
        water: { total: 0, logs: [] },
        activities: [],
        metrics: {},
      };
    }
    return dailyData[dateKey];
  };

  // Group food logs by meal time
  foodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.createdAt);
    const day = ensureDay(dateKey);
    if (!day) return;

    const hour = getHour(log.loggedDate || log.createdAt);
    const mealData = {
      ...log,
      hour,
      sugar: log.sugar || 0,
      protein: log.protein || 0,
      carbs: log.carbs || 0,
      calories: log.calories || 0,
      novaScore: log.novaScore || 2,
    };

    day.allFood.push(mealData);

    if (hour >= CONFIG.BREAKFAST_START && hour < CONFIG.BREAKFAST_END) {
      day.meals.breakfast.push(mealData);
    } else if (hour >= CONFIG.LUNCH_START && hour < CONFIG.LUNCH_END) {
      day.meals.lunch.push(mealData);
    } else if (hour >= CONFIG.DINNER_START && hour < CONFIG.DINNER_END) {
      day.meals.dinner.push(mealData);
    } else {
      day.meals.snacks.push(mealData);
    }
  });

  // Group mood logs by time of day
  moodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.createdAt);
    const day = ensureDay(dateKey);
    if (!day) return;

    const hour = getHour(log.loggedDate || log.createdAt);
    const moodData = {
      ...log,
      hour,
      intensity: log.intensity || 5,
      energyLevel: log.energyLevel || log.energy || 5,
      mood: log.mood || 'neutral',
      isNegative: ['stressed', 'anxious', 'tired', 'sad', 'irritated', 'angry'].includes(log.mood?.toLowerCase()),
      isPositive: ['happy', 'calm', 'energized', 'focused', 'content', 'excited'].includes(log.mood?.toLowerCase()),
    };

    day.moods.all.push(moodData);

    if (hour >= 5 && hour < 12) {
      day.moods.morning.push(moodData);
    } else if (hour >= 12 && hour < 17) {
      day.moods.afternoon.push(moodData);
    } else {
      day.moods.evening.push(moodData);
    }
  });

  // Aggregate water logs
  waterLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.createdAt);
    const day = ensureDay(dateKey);
    if (!day) return;

    const amount = parseFloat(log.hydrationLiters || log.amountLiters || log.amount || 0);
    day.water.total += amount;
    day.water.logs.push({ ...log, amount });
  });

  // Add activity logs
  activityLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt || log.loggedDate || log.createdAt);
    const day = ensureDay(dateKey);
    if (!day) return;

    const hour = getHour(log.loggedAt || log.loggedDate || log.createdAt);
    day.activities.push({
      ...log,
      hour,
      duration: log.durationMinutes || log.duration || 0,
      intensity: log.intensity || 'moderate',
      type: log.activityType || log.type || 'general',
      isMorning: hour < CONFIG.MORNING_EXERCISE_END,
    });
  });

  // Calculate daily metrics
  Object.values(dailyData).forEach(day => {
    day.metrics = {
      hadBreakfast: day.meals.breakfast.length > 0,
      hadLunch: day.meals.lunch.length > 0,
      hadDinner: day.meals.dinner.length > 0,
      totalMeals: day.allFood.length,
      totalSugar: day.allFood.reduce((sum, f) => sum + (f.sugar || 0), 0),
      totalProtein: day.allFood.reduce((sum, f) => sum + (f.protein || 0), 0),
      totalCalories: day.allFood.reduce((sum, f) => sum + (f.calories || 0), 0),
      avgNovaScore: day.allFood.length > 0
        ? day.allFood.reduce((sum, f) => sum + (f.novaScore || 2), 0) / day.allFood.length
        : null,
      dinnerSugar: day.meals.dinner.reduce((sum, f) => sum + (f.sugar || 0), 0),
      breakfastProtein: day.meals.breakfast.reduce((sum, f) => sum + (f.protein || 0), 0),
      waterIntake: day.water.total,
      isHydrated: day.water.total >= CONFIG.OPTIMAL_HYDRATION,
      isDehydrated: day.water.total > 0 && day.water.total < CONFIG.DEHYDRATION_THRESHOLD,
      hadExercise: day.activities.length > 0,
      hadMorningExercise: day.activities.some(a => a.isMorning),
      exerciseMinutes: day.activities.reduce((sum, a) => sum + (a.duration || 0), 0),
      avgMoodIntensity: day.moods.all.length > 0
        ? day.moods.all.reduce((sum, m) => sum + m.intensity, 0) / day.moods.all.length
        : null,
      avgEnergyLevel: day.moods.all.length > 0
        ? day.moods.all.reduce((sum, m) => sum + m.energyLevel, 0) / day.moods.all.length
        : null,
      avgAfternoonMood: day.moods.afternoon.length > 0
        ? day.moods.afternoon.reduce((sum, m) => sum + m.intensity, 0) / day.moods.afternoon.length
        : null,
      avgMorningMood: day.moods.morning.length > 0
        ? day.moods.morning.reduce((sum, m) => sum + m.intensity, 0) / day.moods.morning.length
        : null,
      hasNegativeMood: day.moods.all.some(m => m.isNegative),
      hasPositiveMood: day.moods.all.some(m => m.isPositive),
    };
  });

  return dailyData;
}

// ============================================================================
// PATTERN DETECTORS
// ============================================================================

/**
 * Detect breakfast skip → afternoon crash pattern
 */
function detectBreakfastPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData);

  // Separate days by breakfast status
  const daysWithBreakfast = days.filter(d => d.metrics.hadBreakfast && d.metrics.avgAfternoonMood !== null);
  const daysWithoutBreakfast = days.filter(d => !d.metrics.hadBreakfast && d.metrics.avgAfternoonMood !== null);

  if (daysWithoutBreakfast.length >= 2 && daysWithBreakfast.length >= 2) {
    // Calculate average afternoon mood for each group
    const avgMoodWithBreakfast = daysWithBreakfast.reduce((sum, d) => sum + d.metrics.avgAfternoonMood, 0) / daysWithBreakfast.length;
    const avgMoodWithoutBreakfast = daysWithoutBreakfast.reduce((sum, d) => sum + d.metrics.avgAfternoonMood, 0) / daysWithoutBreakfast.length;

    const moodDifference = avgMoodWithBreakfast - avgMoodWithoutBreakfast;

    if (moodDifference > 0.5) {
      // Breakfast helps afternoon mood
      const occurrences = daysWithoutBreakfast.length;
      const confidence = calculateConfidence(occurrences, moodDifference, SCIENTIFIC_PRIORS.BREAKFAST_SKIP_CRASH);

      patterns.push(createPattern({
        type: 'breakfast_skip_afternoon_crash',
        category: 'meal-timing',
        icon: 'sunny-outline',
        statement: 'When you skip breakfast, your mood tends to dip in the afternoon',
        impactType: 'negative',
        strength: -moodDifference / 5,
        confidence,
        occurrences,
        suggestion: 'Even a small breakfast like yogurt or fruit can help stabilize your afternoon energy.',
        evidence: {
          avgMoodWithBreakfast: avgMoodWithBreakfast.toFixed(1),
          avgMoodWithoutBreakfast: avgMoodWithoutBreakfast.toFixed(1),
          daysAnalyzed: days.length,
        },
      }));
    }

    if (moodDifference > 1.0) {
      // Strong positive effect of breakfast
      patterns.push(createPattern({
        type: 'breakfast_afternoon_boost',
        category: 'meal-timing',
        icon: 'sunny-outline',
        statement: 'Having breakfast keeps your afternoon mood noticeably more stable',
        impactType: 'positive',
        strength: moodDifference / 5,
        confidence: calculateConfidence(daysWithBreakfast.length, moodDifference, SCIENTIFIC_PRIORS.BREAKFAST_SKIP_CRASH),
        occurrences: daysWithBreakfast.length,
        suggestion: 'Keep up the breakfast habit! Your body clearly benefits from morning fuel.',
      }));
    }
  }

  return patterns;
}

/**
 * Detect sugar → mood crash patterns
 */
function detectSugarMoodPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData);

  // Find days with high sugar meals followed by mood data
  const highSugarDays = days.filter(d =>
    d.metrics.totalSugar > CONFIG.HIGH_SUGAR_THRESHOLD * 2 &&
    d.moods.all.length > 0
  );

  const lowSugarDays = days.filter(d =>
    d.metrics.totalSugar <= CONFIG.HIGH_SUGAR_THRESHOLD &&
    d.moods.all.length > 0
  );

  if (highSugarDays.length >= 2 && lowSugarDays.length >= 2) {
    const avgMoodHighSugar = highSugarDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / highSugarDays.length;
    const avgMoodLowSugar = lowSugarDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / lowSugarDays.length;

    const moodDifference = avgMoodLowSugar - avgMoodHighSugar;

    if (moodDifference > 0.3) {
      const confidence = calculateConfidence(
        highSugarDays.length,
        moodDifference,
        SCIENTIFIC_PRIORS.HIGH_SUGAR_MOOD_CRASH
      );

      patterns.push(createPattern({
        type: 'high_nova_mood_crash',
        category: 'meal-timing',
        icon: 'nutrition-outline',
        statement: 'High-sugar meals tend to be followed by mood dips',
        impactType: 'negative',
        strength: -moodDifference / 5,
        confidence,
        occurrences: highSugarDays.length,
        suggestion: 'Try adding protein or fiber to meals to stabilize blood sugar and prevent mood dips.',
        evidence: {
          avgMoodHighSugar: avgMoodHighSugar.toFixed(1),
          avgMoodLowSugar: avgMoodLowSugar.toFixed(1),
        },
      }));
    }
  }

  return patterns;
}

/**
 * Detect hydration → mood correlation
 */
function detectHydrationMoodPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData).filter(d =>
    d.water.total > 0 && d.moods.all.length > 0
  );

  if (days.length < 3) return patterns;

  const hydratedDays = days.filter(d => d.metrics.isHydrated);
  const dehydratedDays = days.filter(d => d.metrics.isDehydrated);

  // Check hydrated vs dehydrated mood difference
  if (hydratedDays.length >= 2 && dehydratedDays.length >= 1) {
    const avgMoodHydrated = hydratedDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / hydratedDays.length;
    const avgMoodDehydrated = dehydratedDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / dehydratedDays.length;

    const moodDifference = avgMoodHydrated - avgMoodDehydrated;

    if (moodDifference > 0.3) {
      const confidence = calculateConfidence(
        hydratedDays.length + dehydratedDays.length,
        moodDifference,
        SCIENTIFIC_PRIORS.HYDRATION_MOOD
      );

      patterns.push(createPattern({
        type: 'hydration_mood_correlation',
        category: 'hydration',
        icon: 'water-outline',
        statement: "On days you drink enough water, you're noticeably less irritable",
        impactType: 'positive',
        strength: moodDifference / 5,
        confidence,
        occurrences: hydratedDays.length,
        suggestion: 'Great job staying hydrated! Keep aiming for your water goal.',
        evidence: {
          avgMoodHydrated: avgMoodHydrated.toFixed(1),
          avgMoodDehydrated: avgMoodDehydrated.toFixed(1),
          hydratedDays: hydratedDays.length,
        },
      }));
    }

    if (dehydratedDays.length >= 2 && moodDifference > 0.5) {
      patterns.push(createPattern({
        type: 'dehydration_mood_impact',
        category: 'hydration',
        icon: 'water-outline',
        statement: 'Poor hydration days show higher negative moods',
        impactType: 'negative',
        strength: -moodDifference / 5,
        confidence: calculateConfidence(dehydratedDays.length, moodDifference, SCIENTIFIC_PRIORS.HYDRATION_MOOD),
        occurrences: dehydratedDays.length,
        suggestion: 'Try setting water reminders or starting each meal with a glass of water.',
      }));
    }
  }

  // General correlation
  if (days.length >= 5) {
    const correlation = calculateCorrelation(
      days.map(d => d.water.total),
      days.map(d => d.metrics.avgMoodIntensity)
    );

    if (Math.abs(correlation) > 0.3) {
      const isPositive = correlation > 0;
      patterns.push(createPattern({
        type: 'hydration_mood_stability',
        category: 'hydration',
        icon: 'water-outline',
        statement: isPositive
          ? 'Your mood tends to be better on days with higher water intake'
          : 'There may be a connection between hydration and how you feel',
        impactType: isPositive ? 'positive' : 'neutral',
        strength: correlation,
        confidence: Math.min(0.85, 0.5 + Math.abs(correlation) * 0.5),
        occurrences: days.length,
        suggestion: isPositive
          ? 'Staying hydrated is clearly working for your mood!'
          : 'Try drinking more water - your mood may improve.',
      }));
    }
  }

  return patterns;
}

/**
 * Detect activity → mood patterns
 */
function detectActivityMoodPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData).filter(d => d.moods.all.length > 0);

  const exerciseDays = days.filter(d => d.metrics.hadExercise);
  const restDays = days.filter(d => !d.metrics.hadExercise);

  if (exerciseDays.length >= 2 && restDays.length >= 2) {
    const avgMoodExercise = exerciseDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / exerciseDays.length;
    const avgMoodRest = restDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / restDays.length;

    const moodDifference = avgMoodExercise - avgMoodRest;

    if (moodDifference > 0.3) {
      const confidence = calculateConfidence(
        exerciseDays.length,
        moodDifference,
        SCIENTIFIC_PRIORS.EXERCISE_MOOD_BOOST
      );

      patterns.push(createPattern({
        type: 'exercise_mood_boost',
        category: 'activity',
        icon: 'barbell-outline',
        statement: 'Exercise gives you a same-day mood boost',
        impactType: 'positive',
        strength: moodDifference / 5,
        confidence,
        occurrences: exerciseDays.length,
        suggestion: 'Your mood loves activity! Try to move a little every day.',
        evidence: {
          avgMoodExercise: avgMoodExercise.toFixed(1),
          avgMoodRest: avgMoodRest.toFixed(1),
        },
      }));
    }

    // Check for sedentary impact
    if (moodDifference > 0.5 && restDays.length >= 3) {
      patterns.push(createPattern({
        type: 'sedentary_mood_impact',
        category: 'activity',
        icon: 'walk-outline',
        statement: 'Days without physical activity tend to have lower mood scores',
        impactType: 'negative',
        strength: -moodDifference / 5,
        confidence: Math.min(0.75, 0.5 + restDays.length * 0.05),
        occurrences: restDays.length,
        suggestion: 'Even a short 10-minute walk can help boost your mood.',
      }));
    }
  }

  // Morning exercise specific pattern
  const morningExerciseDays = days.filter(d => d.metrics.hadMorningExercise);
  if (morningExerciseDays.length >= 2) {
    const avgEnergyMorningExercise = morningExerciseDays.reduce((sum, d) => sum + d.metrics.avgEnergyLevel, 0) / morningExerciseDays.length;
    const otherDays = days.filter(d => !d.metrics.hadMorningExercise && d.metrics.avgEnergyLevel !== null);

    if (otherDays.length >= 2) {
      const avgEnergyOther = otherDays.reduce((sum, d) => sum + d.metrics.avgEnergyLevel, 0) / otherDays.length;
      const energyDifference = avgEnergyMorningExercise - avgEnergyOther;

      if (energyDifference > 0.5) {
        patterns.push(createPattern({
          type: 'morning_exercise_energy',
          category: 'activity',
          icon: 'sunny-outline',
          statement: 'Morning workouts give you energy that lasts all day',
          impactType: 'positive',
          strength: energyDifference / 5,
          confidence: calculateConfidence(morningExerciseDays.length, energyDifference, SCIENTIFIC_PRIORS.MORNING_EXERCISE_ENERGY),
          occurrences: morningExerciseDays.length,
          suggestion: 'Morning workouts work well for you - consider making them a routine.',
        }));
      }
    }
  }

  // Consistent exercise pattern
  if (exerciseDays.length >= 5) {
    const exerciseRate = exerciseDays.length / days.length;
    if (exerciseRate > 0.5) {
      const avgMood = exerciseDays.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / exerciseDays.length;
      if (avgMood > 6) {
        patterns.push(createPattern({
          type: 'consistent_exercise_stability',
          category: 'activity',
          icon: 'trending-up-outline',
          statement: 'Regular exercise is keeping your mood consistently positive',
          impactType: 'positive',
          strength: 0.6,
          confidence: Math.min(0.85, 0.5 + exerciseRate * 0.3),
          occurrences: exerciseDays.length,
          suggestion: 'Your consistent exercise is paying off - keep it up!',
        }));
      }
    }
  }

  return patterns;
}

/**
 * Detect next-day carryover patterns
 */
function detectNextDayCarryoverPatterns(dailyData) {
  const patterns = [];
  const sortedDates = Object.keys(dailyData).sort();

  if (sortedDates.length < 4) return patterns;

  // Track high-sugar dinners and next morning mood
  const dinnerMorningPairs = [];

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const today = dailyData[sortedDates[i]];
    const tomorrow = dailyData[sortedDates[i + 1]];

    if (today.meals.dinner.length > 0 && tomorrow.moods.morning.length > 0) {
      dinnerMorningPairs.push({
        dinnerSugar: today.metrics.dinnerSugar,
        morningMood: tomorrow.moods.morning.reduce((sum, m) => sum + m.intensity, 0) / tomorrow.moods.morning.length,
        morningAnxiety: tomorrow.moods.morning.some(m => m.mood?.toLowerCase() === 'anxious'),
      });
    }
  }

  if (dinnerMorningPairs.length >= 3) {
    // High sugar dinner analysis
    const highSugarDinners = dinnerMorningPairs.filter(p => p.dinnerSugar > CONFIG.HIGH_SUGAR_THRESHOLD);
    const lowSugarDinners = dinnerMorningPairs.filter(p => p.dinnerSugar <= CONFIG.HIGH_SUGAR_THRESHOLD / 2);

    if (highSugarDinners.length >= 2 && lowSugarDinners.length >= 1) {
      const avgMoodHighSugar = highSugarDinners.reduce((sum, p) => sum + p.morningMood, 0) / highSugarDinners.length;
      const avgMoodLowSugar = lowSugarDinners.reduce((sum, p) => sum + p.morningMood, 0) / lowSugarDinners.length;

      const moodDifference = avgMoodLowSugar - avgMoodHighSugar;

      if (moodDifference > 0.3) {
        patterns.push(createPattern({
          type: 'high_sugar_dinner_morning_anxiety',
          category: 'next-day-carryover',
          icon: 'moon-outline',
          statement: 'High-sugar dinners tend to affect how you feel the next morning',
          impactType: 'negative',
          strength: -moodDifference / 5,
          confidence: calculateConfidence(highSugarDinners.length, moodDifference, SCIENTIFIC_PRIORS.HIGH_SUGAR_MOOD_CRASH),
          occurrences: highSugarDinners.length,
          suggestion: 'Consider reducing sugar at dinner - try protein-rich foods instead.',
          evidence: {
            avgMorningMoodHighSugar: avgMoodHighSugar.toFixed(1),
            avgMorningMoodLowSugar: avgMoodLowSugar.toFixed(1),
          },
        }));
      }
    }
  }

  return patterns;
}

/**
 * Detect protein → energy patterns
 */
function detectProteinEnergyPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData).filter(d =>
    d.meals.breakfast.length > 0 && d.moods.all.length > 0
  );

  if (days.length < 3) return patterns;

  const highProteinBreakfast = days.filter(d => d.metrics.breakfastProtein >= CONFIG.HIGH_PROTEIN_THRESHOLD);
  const lowProteinBreakfast = days.filter(d => d.metrics.breakfastProtein < CONFIG.LOW_PROTEIN_THRESHOLD && d.metrics.breakfastProtein > 0);

  if (highProteinBreakfast.length >= 2 && lowProteinBreakfast.length >= 1) {
    const avgEnergyHighProtein = highProteinBreakfast.reduce((sum, d) => sum + d.metrics.avgEnergyLevel, 0) / highProteinBreakfast.length;
    const avgEnergyLowProtein = lowProteinBreakfast.reduce((sum, d) => sum + d.metrics.avgEnergyLevel, 0) / lowProteinBreakfast.length;

    const energyDifference = avgEnergyHighProtein - avgEnergyLowProtein;

    if (energyDifference > 0.3) {
      patterns.push(createPattern({
        type: 'protein_breakfast_energy',
        category: 'meal-timing',
        icon: 'fitness-outline',
        statement: 'Protein-rich breakfasts give you sustained energy through the morning',
        impactType: 'positive',
        strength: energyDifference / 5,
        confidence: Math.min(0.75, 0.5 + highProteinBreakfast.length * 0.08),
        occurrences: highProteinBreakfast.length,
        suggestion: 'Keep including protein in breakfast - eggs, yogurt, or nuts work great.',
        evidence: {
          avgEnergyHighProtein: avgEnergyHighProtein.toFixed(1),
          avgEnergyLowProtein: avgEnergyLowProtein.toFixed(1),
        },
      }));
    }
  }

  return patterns;
}

/**
 * Detect meal timing consistency patterns
 */
function detectMealTimingPatterns(dailyData) {
  const patterns = [];
  const days = Object.values(dailyData).filter(d => d.allFood.length > 0 && d.moods.all.length > 0);

  if (days.length < 5) return patterns;

  // Calculate meal timing consistency
  const mealHours = days.flatMap(d => d.allFood.map(f => f.hour));
  if (mealHours.length < 10) return patterns;

  // Calculate standard deviation of meal times
  const avgHour = mealHours.reduce((sum, h) => sum + h, 0) / mealHours.length;
  const variance = mealHours.reduce((sum, h) => sum + Math.pow(h - avgHour, 2), 0) / mealHours.length;
  const stdDev = Math.sqrt(variance);

  // Consistent timing = lower std dev
  const isConsistent = stdDev < 3;

  if (isConsistent) {
    const avgMood = days.reduce((sum, d) => sum + d.metrics.avgMoodIntensity, 0) / days.length;
    if (avgMood > 5.5) {
      patterns.push(createPattern({
        type: 'meal_timing_stability',
        category: 'meal-timing',
        icon: 'time-outline',
        statement: 'Eating at consistent times is helping keep your mood stable',
        impactType: 'positive',
        strength: 0.5,
        confidence: Math.min(0.70, 0.45 + days.length * 0.03),
        occurrences: days.length,
        suggestion: 'Eating at regular times helps regulate your energy and mood.',
      }));
    }
  }

  return patterns;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateConfidence(occurrences, effectSize, scientificPrior) {
  // Bayesian confidence calculation
  const priorWeight = 0.3;
  const dataWeight = 0.7;

  // Prior contribution
  const priorConfidence = scientificPrior?.baseProbability || 0.5;

  // Data contribution (more occurrences = higher confidence)
  const dataConfidence = Math.min(0.9, 0.4 + occurrences * 0.1 + Math.abs(effectSize) * 0.1);

  return Math.min(0.95, priorWeight * priorConfidence + dataWeight * dataConfidence);
}

function calculateCorrelation(xArray, yArray) {
  if (xArray.length !== yArray.length || xArray.length < 3) return 0;

  const n = xArray.length;
  const sumX = xArray.reduce((a, b) => a + b, 0);
  const sumY = yArray.reduce((a, b) => a + b, 0);
  const sumXY = xArray.reduce((sum, x, i) => sum + x * yArray[i], 0);
  const sumX2 = xArray.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = yArray.reduce((sum, y) => sum + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function createPattern({
  type,
  category,
  icon,
  statement,
  impactType,
  strength,
  confidence,
  occurrences,
  suggestion,
  evidence = {},
}) {
  // Calculate confidence label
  let confidenceLabel = 'possible';
  if (confidence >= 0.8) confidenceLabel = 'very likely';
  else if (confidence >= 0.65) confidenceLabel = 'likely';
  else if (confidence >= 0.5) confidenceLabel = 'possible';

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    category,
    icon,
    statement,
    impactType,
    strength: Math.round(strength * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    confidenceLabel,
    occurrences,
    suggestion,
    _raw: evidence,
  };
}

function createEmptyCategories() {
  return {
    mealTiming: [],
    nextDayCarryover: [],
    hydration: [],
    activity: [],
    general: [],
  };
}

function groupPatternsByCategory(patterns) {
  const categories = createEmptyCategories();

  patterns.forEach(pattern => {
    const category = pattern.category;
    if (category === 'meal-timing') {
      categories.mealTiming.push(pattern);
    } else if (category === 'next-day-carryover') {
      categories.nextDayCarryover.push(pattern);
    } else if (category === 'hydration') {
      categories.hydration.push(pattern);
    } else if (category === 'activity') {
      categories.activity.push(pattern);
    } else {
      categories.general.push(pattern);
    }
  });

  return categories;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default analyzePersonalizedPatterns;

export {
  CONFIG,
  SCIENTIFIC_PRIORS,
  assessDataQuality,
  groupDataByDate,
};
