/**
 * Correlation Engine Service
 *
 * Rule-first, deterministic correlation detection system.
 * Discovers patterns between mood, food, hydration, stress, and activity.
 *
 * Daily workflow:
 * 1. Fetch user's logs (food, mood, water) for different windows (4h, 24h, 7d, 30d, 60d)
 * 2. Extract signals from logs (nova_score, mood_intensity, hydration_level, etc.)
 * 3. Run correlation rules (detect patterns)
 * 4. Calculate scores (strength, confidence, health impact)
 * 5. Store/update correlations in database
 * 6. Return structured correlation data for orchestrator
 */

import { db } from '../db/index.js';
import {
  userCorrelationsTable,
  correlationEvidenceTable,
  foodLogTable,
  moodLogTable,
  waterLogTable,
  nutritionGoalsTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, between, desc, sql } from 'drizzle-orm';

/**
 * ============================================
 * SIGNAL EXTRACTION LAYER
 * ============================================
 */

/**
 * Extract signals from a food log entry
 */
function extractFoodSignals(foodLog) {
  if (!foodLog) return null;

  const carbs = parseInt(foodLog.carbs) || 0;
  const protein = parseInt(foodLog.protein) || 0;
  const calories = parseInt(foodLog.calories) || 0;
  const novaScore = parseInt(foodLog.novaScore) || 0;
  const micros = foodLog.micros || {};

  // Calculate macro ratios
  const macroRatio = calories > 0 ? {
    proteinPercent: (protein * 4 / calories) * 100,
    carbPercent: (carbs * 4 / calories) * 100,
    fatPercent: ((parseInt(foodLog.fats) || 0) * 9 / calories) * 100,
  } : { proteinPercent: 0, carbPercent: 0, fatPercent: 0 };

  const fiber = parseInt(micros.fiber) || 0;
  const sugar = parseInt(micros.sugar) || 0;

  return {
    foodName: foodLog.foodName,
    calories,
    carbs,
    protein,
    fiber,
    sugar,
    novaScore,
    novaLevel: novaScore >= 3 ? 'high_processed' : 'minimally_processed',
    isHighSugar: sugar > 20 && fiber < 5,
    isHighNova: novaScore >= 3,
    macroRatio,
    cuisineType: foodLog.cuisine || 'unknown',
    mealType: foodLog.mealType,
    loggedTime: new Date(foodLog.loggedDate),
  };
}

/**
 * Extract signals from a mood log entry
 */
function extractMoodSignals(moodLog) {
  if (!moodLog) return null;

  const intensity = parseInt(moodLog.intensity) || 5;
  const energyLevel = parseInt(moodLog.energyLevel) || 5;
  const tags = moodLog.tags || {};

  const moodValence = mapMoodToValence(moodLog.mood);
  const arousal = intensity;

  // Detect negative mood patterns
  const isNegativeMood = ['tired', 'stressed', 'sad'].includes(moodLog.mood);
  const isLowEnergy = energyLevel < 5;

  return {
    mood: moodLog.mood,
    intensity,
    energyLevel,
    valence: moodValence, // -1 to 1
    arousal,
    isNegativeMood,
    isLowEnergy,
    tags,
    stressLevel: tags.stress ? parseInt(tags.stress) || 5 : 5,
    sleepQuality: tags.sleep || 'unknown', // good, ok, poor
    exerciseLevel: tags.exercise || 'none', // none, light, moderate, intense
    loggedTime: new Date(moodLog.loggedDate),
    dayKey: moodLog.dayKey,
  };
}

/**
 * Extract signals from water log entry
 */
function extractWaterSignals(waterLog) {
  if (!waterLog) return null;

  const hydrationLiters = parseFloat(waterLog.hydrationLiters) || 0;
  const actualLiters = parseFloat(waterLog.amountLiters) || 0;

  return {
    hydrationLiters,
    actualLiters,
    beverageType: waterLog.beverageType || 'water',
    hydrationFactor: parseFloat(waterLog.hydrationFactor) || 1.0,
    loggedTime: new Date(waterLog.loggedDate),
  };
}

/**
 * Map mood category to valence (-1 to 1)
 */
function mapMoodToValence(mood) {
  const moodMap = {
    happy: 1.0,
    energized: 0.8,
    calm: 0.6,
    focused: 0.4,
    neutral: 0,
    tired: -0.4,
    stressed: -0.6,
    sad: -1.0,
  };
  return moodMap[mood] || 0;
}

/**
 * Calculate hours between two timestamps
 */
function getHoursBetween(time1, time2) {
  const diff = Math.abs(time2 - time1);
  return diff / (1000 * 60 * 60);
}

/**
 * ============================================
 * CORRELATION DETECTION RULES
 * ============================================
 */

/**
 * Rule: High NOVA + High Sugar → Mood Crash (2-4h later)
 *
 * WHAT: Processed, high-sugar foods cause mood dips
 * WHY: Blood glucose spike → insulin response → energy/dopamine crash
 * WHEN: 2-4 hours after meal
 * HOW AFFECTS: Mood intensity drops, energy crashes
 * CORRELATION: NOVA score + sugar grams vs mood intensity + energy level
 */
function detectHighNovaMoodCrash(foodSignals, moodSignals, windowHours = 4) {
  if (!foodSignals || !moodSignals) return null;
  if (!foodSignals.isHighSugar || !foodSignals.isHighNova) return null;

  const timeLag = getHoursBetween(foodSignals.loggedTime, moodSignals.loggedTime);
  if (timeLag < 1.5 || timeLag > windowHours) return null; // Expected lag: 2-4h

  // Match pattern: mood intensity drops after high-NOVA meal
  const isNegativeResponse = moodSignals.intensity < 5 && moodSignals.isLowEnergy;
  if (!isNegativeResponse) return null;

  return {
    ruleName: 'high_nova_mood_crash',
    correlationType: 'mood_food',
    severity: 'moderate',
    strength: 0.7, // Will be updated with multiple occurrences
    confidence: 0.6, // Base confidence, adjusted by occurrence count
    timeLag: Math.round(timeLag * 60), // Convert to minutes
    evidence: {
      foodName: foodSignals.foodName,
      novaScore: foodSignals.novaScore,
      sugarGrams: foodSignals.sugar,
      moodBefore: 'baseline',
      moodAfter: moodSignals.intensity,
      energyAfter: moodSignals.energyLevel,
    },
  };
}

/**
 * Rule: Dehydration → Fatigue + Mood Decline (same day)
 *
 * WHAT: Low hydration correlates with tired mood and low energy
 * WHY: Dehydration affects cognitive function, mood, physical stamina
 * WHEN: Same day, cumulative effect
 * HOW AFFECTS: Energy crashes, mood negativity, focus issues
 */
function detectDehydrationFatigue(dailyWaterTotal, moodSignals, hydrationGoal) {
  if (!moodSignals) return null;

  const hydrationDeficit = Math.max(0, 1 - (dailyWaterTotal / hydrationGoal));
  const isSeverelyDehydrated = hydrationDeficit > 0.3; // Less than 70% of goal
  const isNegativeMood = moodSignals.isNegativeMood && moodSignals.isLowEnergy;

  if (!isSeverelyDehydrated || !isNegativeMood) return null;

  return {
    ruleName: 'dehydration_fatigue_mood',
    correlationType: 'hydration_mood',
    severity: 'moderate',
    strength: hydrationDeficit * 0.8,
    confidence: 0.7,
    evidence: {
      hydrationDeficit: hydrationDeficit * 100,
      moodType: moodSignals.mood,
      energyLevel: moodSignals.energyLevel,
    },
  };
}

/**
 * Rule: Stress + Meal Skipping or Overeating (same day)
 *
 * WHAT: Stressed mood correlates with eating pattern disruption
 * WHY: Stress hormones affect appetite and eating behavior
 * WHEN: Same day or 4h window
 * HOW AFFECTS: Nutrition consistency, energy, recovery
 */
function detectStressEatingPattern(stressIntensity, mealCount, expectedMeals, calorieDeviation) {
  if (stressIntensity < 6) return null; // Only detect if high stress (6+/10)

  const isMealSkipping = mealCount < expectedMeals - 1;
  const isOvereating = calorieDeviation > 500; // 500+ cal over goal

  if (!isMealSkipping && !isOvereating) return null;

  const pattern = isMealSkipping ? 'meal_skipping' : 'comfort_eating';

  return {
    ruleName: 'stress_eating_disruption',
    correlationType: 'stress_eating',
    severity: 'moderate',
    strength: 0.7,
    confidence: 0.65,
    evidence: {
      stressLevel: stressIntensity,
      pattern,
      mealCount,
      expectedMeals,
      calorieDeviation,
    },
  };
}

/**
 * Rule: High Caffeine → Energy Spike + Later Crash
 *
 * WHAT: Multiple caffeinated beverages correlate with energy spikes and crashes
 * WHY: Caffeine blocks adenosine, causing energy spike followed by crash
 * WHEN: 3-6 hours after consumption
 * HOW AFFECTS: Energy levels, mood stability, sleep quality
 */
function detectCaffeineEnergyPattern(waterSignals, moodSignals, windowHours = 6) {
  if (!waterSignals || !moodSignals || waterSignals.length === 0) return null;

  // Count caffeine beverages (coffee, tea, energy drinks)
  const caffeineBeverages = waterSignals.filter(w =>
    ['coffee', 'tea', 'energy'].includes(w.beverageType?.toLowerCase())
  );

  if (caffeineBeverages.length < 2) return null;

  // Look for energy crashes 3-6 hours after caffeine
  const crashes = [];
  for (const caffeine of caffeineBeverages) {
    for (const mood of moodSignals) {
      const timeLag = getHoursBetween(caffeine.loggedTime, mood.loggedTime);
      if (timeLag >= 3 && timeLag <= windowHours && mood.isLowEnergy) {
        crashes.push({ caffeine, mood, timeLag });
      }
    }
  }

  if (crashes.length === 0) return null;

  return {
    ruleName: 'caffeine_energy_crash',
    correlationType: 'beverage_energy',
    severity: 'moderate',
    strength: Math.min(crashes.length / 2, 1.0),
    confidence: 0.65,
    evidence: {
      caffeineCount: caffeineBeverages.length,
      crashCount: crashes.length,
      beverageTypes: [...new Set(caffeineBeverages.map(c => c.beverageType))],
      avgTimeLag: Math.round(crashes.reduce((sum, c) => sum + c.timeLag, 0) / crashes.length * 60),
    },
  };
}

/**
 * Rule: Evening Caffeine → Poor Sleep Quality
 *
 * WHAT: Coffee/tea after 4pm correlates with poor sleep
 * WHY: Caffeine has 6-hour half-life, blocks sleep signals
 * WHEN: 16:00+ caffeine → that night's sleep
 * HOW AFFECTS: Sleep quality, next-day energy, recovery
 */
function detectEveningCaffeineSleepImpact(waterSignals, moodSignals) {
  if (!waterSignals || !moodSignals) return null;

  // Find caffeine after 4pm
  const eveningCaffeine = waterSignals.filter(w => {
    const hour = w.loggedTime.getHours();
    return hour >= 16 && ['coffee', 'tea', 'energy'].includes(w.beverageType?.toLowerCase());
  });

  if (eveningCaffeine.length === 0) return null;

  // Look for poor sleep indicators next day
  const poorSleepMoods = moodSignals.filter(m =>
    m.sleepQuality === 'poor' && m.loggedTime.getHours() < 12
  );

  if (poorSleepMoods.length === 0) return null;

  return {
    ruleName: 'evening_caffeine_sleep_impact',
    correlationType: 'beverage_sleep',
    severity: 'moderate',
    strength: Math.min(eveningCaffeine.length * 0.4, 1.0),
    confidence: 0.7,
    evidence: {
      eveningCaffeineCount: eveningCaffeine.length,
      lastCaffeineTime: Math.max(...eveningCaffeine.map(c => c.loggedTime.getHours())),
      beverageTypes: [...new Set(eveningCaffeine.map(c => c.beverageType))],
      poorSleepCount: poorSleepMoods.length,
    },
  };
}

/**
 * Rule: Beverage Variety → Better Hydration Compliance
 *
 * WHAT: Users who drink variety of beverages hit hydration goals more often
 * WHY: Variety makes hydration more enjoyable and sustainable
 * WHEN: Daily pattern
 * HOW AFFECTS: Hydration consistency, goal achievement
 */
function detectBeverageVarietyHydration(waterSignals, hydrationGoal) {
  if (!waterSignals || waterSignals.length < 3) return null;

  // Calculate beverage variety
  const beverageTypes = new Set(waterSignals.map(w => w.beverageType || 'water'));
  const variety = beverageTypes.size;

  // Calculate total hydration
  const totalHydration = waterSignals.reduce((sum, w) => sum + w.hydrationLiters, 0);
  const goalPercent = (totalHydration / hydrationGoal) * 100;

  // High variety + high goal achievement = positive correlation
  const isHighVariety = variety >= 3;
  const isGoalMet = goalPercent >= 80;

  if (!isHighVariety || !isGoalMet) return null;

  return {
    ruleName: 'beverage_variety_compliance',
    correlationType: 'beverage_hydration',
    severity: 'positive',
    strength: Math.min((variety / 5) * (goalPercent / 100), 1.0),
    confidence: 0.6,
    evidence: {
      beverageVariety: variety,
      beverageTypes: [...beverageTypes],
      totalHydration,
      goalPercent: Math.round(goalPercent),
    },
  };
}

/**
 * Rule: Alcohol → Next-Day Mood Impact
 *
 * WHAT: Alcohol consumption correlates with lower next-day mood/energy
 * WHY: Alcohol disrupts sleep, dehydrates, affects neurotransmitters
 * WHEN: Evening alcohol → next morning
 * HOW AFFECTS: Sleep quality, mood, energy, hydration
 */
function detectAlcoholMoodImpact(waterSignals, nextDayMoods) {
  if (!waterSignals || !nextDayMoods) return null;

  // Check for alcohol (if tracked as beverage type)
  const alcoholSignals = waterSignals.filter(w =>
    w.beverageType?.toLowerCase() === 'alcohol'
  );

  if (alcoholSignals.length === 0) return null;

  // Look for low mood/energy next morning
  const lowMoodMornings = nextDayMoods.filter(m =>
    m.loggedTime.getHours() < 12 &&
    (m.isLowEnergy || m.isNegativeMood || m.sleepQuality === 'poor')
  );

  if (lowMoodMornings.length === 0) return null;

  return {
    ruleName: 'alcohol_mood_impact',
    correlationType: 'beverage_mood',
    severity: 'moderate',
    strength: 0.7,
    confidence: 0.6,
    evidence: {
      alcoholCount: alcoholSignals.length,
      lowMoodMornings: lowMoodMornings.length,
      avgMorningEnergy: Math.round(lowMoodMornings.reduce((s, m) => s + m.energyLevel, 0) / lowMoodMornings.length * 10) / 10,
    },
  };
}

/**
 * Rule: Late Heavy Meal → Poor Sleep → Morning Sluggishness
 *
 * WHAT: Heavy meals after 9pm predict poor sleep and low morning energy
 * WHY: Digestion at night interferes with sleep quality
 * WHEN: Evening meal (21:00+) → next morning (6:00-10:00)
 * HOW AFFECTS: Sleep quality, next-day energy, morning mood
 */
function detectLateHeavyMealSleepImpact(foodLog, nextMorningMood, sleepTag) {
  if (!foodLog || !nextMorningMood) return null;

  const hour = foodLog.loggedTime.getHours();
  const isLateHeavy = hour >= 21 && parseInt(foodLog.calories) > 500;

  if (!isLateHeavy) return null;
  if (sleepTag !== 'poor' && sleepTag !== 'ok') return null; // Only if poor/ok sleep

  const isSluggish = nextMorningMood.intensity < 5 && nextMorningMood.isLowEnergy;
  if (!isSluggish) return null;

  return {
    ruleName: 'late_heavy_meal_sleep_impact',
    correlationType: 'meal_timing_sleep',
    severity: 'moderate',
    strength: 0.7,
    confidence: 0.7,
    timeLag: 12 * 60, // 12 hours to next morning
    evidence: {
      mealTime: hour,
      mealCalories: foodLog.calories,
      sleepQuality: sleepTag,
      nextMorningEnergy: nextMorningMood.energyLevel,
    },
  };
}

/**
 * ============================================
 * TEMPORAL PATTERN DETECTION RULES
 * ============================================
 * These rules detect time-based patterns like:
 * - "Every time I skip breakfast, my 3 p.m. mood crashes"
 * - "High-sugar dinners make me anxious the next morning"
 * - "On days I drink enough water, I'm less irritable"
 */

/**
 * Rule: Breakfast Skipping → Afternoon Mood Crash
 *
 * WHAT: Skipping breakfast correlates with afternoon mood dips (2-4pm)
 * WHY: Blood sugar dysregulation, cortisol patterns, metabolism disruption
 * WHEN: No breakfast by 10am → mood log between 14:00-17:00
 * HOW AFFECTS: Energy crashes, irritability, focus issues in afternoon
 */
function detectBreakfastSkipAfternoonCrash(dayFoodLogs, dayMoodLogs, dayKey) {
  if (!dayFoodLogs || !dayMoodLogs || dayMoodLogs.length === 0) return null;

  // Check for breakfast (meals before 10am)
  const breakfastMeals = dayFoodLogs.filter(f => {
    const hour = f.loggedTime.getHours();
    return hour >= 5 && hour < 10;
  });

  const hasBreakfast = breakfastMeals.length > 0;
  if (hasBreakfast) return null; // No pattern if they ate breakfast

  // Look for afternoon mood logs (2pm - 5pm)
  const afternoonMoods = dayMoodLogs.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 14 && hour <= 17;
  });

  if (afternoonMoods.length === 0) return null;

  // Check for negative mood pattern in afternoon
  const negativeMoods = afternoonMoods.filter(m =>
    m.isNegativeMood || m.isLowEnergy || m.mood === 'tired' || m.mood === 'stressed'
  );

  if (negativeMoods.length === 0) return null;

  const avgEnergy = afternoonMoods.reduce((sum, m) => sum + m.energyLevel, 0) / afternoonMoods.length;
  const avgIntensity = afternoonMoods.reduce((sum, m) => sum + m.intensity, 0) / afternoonMoods.length;

  return {
    ruleName: 'breakfast_skip_afternoon_crash',
    correlationType: 'meal_timing_mood',
    severity: avgEnergy < 4 ? 'high' : 'moderate',
    strength: Math.min((5 - avgEnergy) / 5, 1.0) * 0.8,
    confidence: 0.7,
    timeLag: 6 * 60, // ~6 hours from missed breakfast to afternoon crash
    evidence: {
      dayKey,
      hasBreakfast: false,
      afternoonMoodCount: afternoonMoods.length,
      negativeMoodCount: negativeMoods.length,
      avgAfternoonEnergy: Math.round(avgEnergy * 10) / 10,
      avgAfternoonIntensity: Math.round(avgIntensity * 10) / 10,
      moodTypes: [...new Set(negativeMoods.map(m => m.mood))],
    },
  };
}

/**
 * Rule: High-Sugar Dinner → Next Morning Anxiety/Low Mood
 *
 * WHAT: High sugar intake at dinner predicts anxious/stressed morning mood
 * WHY: Blood sugar spike → crash during sleep → cortisol dysregulation → morning anxiety
 * WHEN: Dinner (18:00-22:00) with >30g sugar → next morning (6:00-10:00) mood
 * HOW AFFECTS: Morning anxiety, stress, low energy, irritability
 */
function detectHighSugarDinnerMorningAnxiety(dinnerFoodLogs, nextMorningMoods) {
  if (!dinnerFoodLogs || dinnerFoodLogs.length === 0 || !nextMorningMoods || nextMorningMoods.length === 0) return null;

  // Calculate total dinner sugar (meals 18:00-22:00)
  const dinnerMeals = dinnerFoodLogs.filter(f => {
    const hour = f.loggedTime.getHours();
    return hour >= 18 && hour <= 22;
  });

  if (dinnerMeals.length === 0) return null;

  const totalDinnerSugar = dinnerMeals.reduce((sum, f) => sum + (f.sugar || 0), 0);
  const isHighSugar = totalDinnerSugar > 30; // >30g sugar at dinner

  if (!isHighSugar) return null;

  // Check morning moods (6am-10am next day)
  const morningMoods = nextMorningMoods.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 6 && hour <= 10;
  });

  if (morningMoods.length === 0) return null;

  // Look for anxiety/stress/irritability indicators
  const anxiousMoods = morningMoods.filter(m =>
    m.mood === 'stressed' || m.mood === 'anxious' ||
    m.stressLevel > 6 || m.isNegativeMood
  );

  if (anxiousMoods.length === 0) return null;

  const avgMorningStress = morningMoods.reduce((sum, m) => sum + m.stressLevel, 0) / morningMoods.length;
  const avgMorningEnergy = morningMoods.reduce((sum, m) => sum + m.energyLevel, 0) / morningMoods.length;

  return {
    ruleName: 'high_sugar_dinner_morning_anxiety',
    correlationType: 'carryover_next_day',
    severity: avgMorningStress > 7 ? 'high' : 'moderate',
    strength: Math.min(totalDinnerSugar / 50, 1.0) * 0.75,
    confidence: 0.65,
    timeLag: 12 * 60, // ~12 hours overnight
    evidence: {
      dinnerSugarGrams: totalDinnerSugar,
      dinnerMealCount: dinnerMeals.length,
      morningMoodCount: morningMoods.length,
      anxiousMoodCount: anxiousMoods.length,
      avgMorningStress: Math.round(avgMorningStress * 10) / 10,
      avgMorningEnergy: Math.round(avgMorningEnergy * 10) / 10,
      dinnerFoods: dinnerMeals.map(f => f.foodName).slice(0, 3),
    },
  };
}

/**
 * Rule: High-Carb Late Dinner → Next Morning Sluggishness
 *
 * WHAT: Heavy carb intake at dinner predicts sluggish/tired morning
 * WHY: Insulin response, blood sugar patterns during sleep, glycogen storage
 * WHEN: Dinner with >60g carbs after 20:00 → morning fatigue
 */
function detectHighCarbDinnerMorningSluggish(dinnerFoodLogs, nextMorningMoods) {
  if (!dinnerFoodLogs || dinnerFoodLogs.length === 0 || !nextMorningMoods || nextMorningMoods.length === 0) return null;

  // Calculate total late dinner carbs (meals after 20:00)
  const lateDinnerMeals = dinnerFoodLogs.filter(f => {
    const hour = f.loggedTime.getHours();
    return hour >= 20;
  });

  if (lateDinnerMeals.length === 0) return null;

  const totalCarbs = lateDinnerMeals.reduce((sum, f) => sum + (f.carbs || 0), 0);
  const isHighCarb = totalCarbs > 60;

  if (!isHighCarb) return null;

  // Check morning moods
  const morningMoods = nextMorningMoods.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 6 && hour <= 10;
  });

  if (morningMoods.length === 0) return null;

  // Look for sluggish/tired morning
  const sluggishMoods = morningMoods.filter(m =>
    m.mood === 'tired' || m.isLowEnergy || m.energyLevel < 5
  );

  if (sluggishMoods.length === 0) return null;

  return {
    ruleName: 'high_carb_dinner_morning_sluggish',
    correlationType: 'carryover_next_day',
    severity: 'moderate',
    strength: Math.min(totalCarbs / 100, 1.0) * 0.7,
    confidence: 0.6,
    timeLag: 10 * 60,
    evidence: {
      dinnerCarbs: totalCarbs,
      dinnerTime: Math.max(...lateDinnerMeals.map(f => f.loggedTime.getHours())),
      sluggishMoodCount: sluggishMoods.length,
      avgMorningEnergy: Math.round(morningMoods.reduce((s, m) => s + m.energyLevel, 0) / morningMoods.length * 10) / 10,
    },
  };
}

/**
 * Rule: Daily Hydration Goal → Mood Stability (Less Irritability)
 *
 * WHAT: Meeting daily hydration goal correlates with stable mood throughout the day
 * WHY: Proper hydration affects cognitive function, emotional regulation, neurotransmitter balance
 * WHEN: Daily aggregate hydration vs overall mood stability
 * HOW AFFECTS: Reduced irritability, more stable energy, better focus
 */
function detectDailyHydrationMoodStability(dailyWaterTotal, dayMoodLogs, hydrationGoal, dayKey) {
  if (!dayMoodLogs || dayMoodLogs.length < 2) return null;

  const hydrationPercent = (dailyWaterTotal / hydrationGoal) * 100;
  const isWellHydrated = hydrationPercent >= 80;

  // Calculate mood stability (variance in mood intensity/energy across the day)
  const energyLevels = dayMoodLogs.map(m => m.energyLevel);
  const avgEnergy = energyLevels.reduce((s, e) => s + e, 0) / energyLevels.length;
  const energyVariance = energyLevels.reduce((s, e) => s + Math.pow(e - avgEnergy, 2), 0) / energyLevels.length;
  const energyStability = Math.max(0, 1 - (energyVariance / 10)); // 0-1 stability score

  // Count irritability/negative moods
  const negativeMoods = dayMoodLogs.filter(m =>
    m.mood === 'stressed' || m.mood === 'irritated' || m.mood === 'angry' ||
    m.isNegativeMood
  );
  const irritabilityRate = negativeMoods.length / dayMoodLogs.length;

  // Detect positive pattern: well hydrated + stable mood + low irritability
  if (isWellHydrated && energyStability > 0.6 && irritabilityRate < 0.3) {
    return {
      ruleName: 'hydration_mood_stability_positive',
      correlationType: 'hydration_mood',
      severity: 'positive',
      strength: Math.min(hydrationPercent / 100, 1.0) * energyStability,
      confidence: 0.7,
      evidence: {
        dayKey,
        hydrationPercent: Math.round(hydrationPercent),
        hydrationLiters: Math.round(dailyWaterTotal * 10) / 10,
        moodLogCount: dayMoodLogs.length,
        energyStability: Math.round(energyStability * 100) / 100,
        irritabilityRate: Math.round(irritabilityRate * 100),
        avgEnergy: Math.round(avgEnergy * 10) / 10,
      },
    };
  }

  // Detect negative pattern: poorly hydrated + unstable mood + high irritability
  if (!isWellHydrated && (energyStability < 0.4 || irritabilityRate > 0.4)) {
    return {
      ruleName: 'dehydration_mood_instability',
      correlationType: 'hydration_mood',
      severity: 'moderate',
      strength: Math.min((100 - hydrationPercent) / 50, 1.0) * (1 - energyStability),
      confidence: 0.65,
      evidence: {
        dayKey,
        hydrationPercent: Math.round(hydrationPercent),
        hydrationDeficit: Math.round(100 - hydrationPercent),
        moodLogCount: dayMoodLogs.length,
        energyStability: Math.round(energyStability * 100) / 100,
        irritabilityRate: Math.round(irritabilityRate * 100),
        negativeMoodTypes: [...new Set(negativeMoods.map(m => m.mood))],
      },
    };
  }

  return null;
}

/**
 * Rule: Meal Timing Regularity → Mood Stability
 *
 * WHAT: Consistent meal timing correlates with stable mood patterns
 * WHY: Circadian rhythm alignment, blood sugar stability, metabolic predictability
 * WHEN: Week-over-week meal timing consistency
 */
function detectMealTimingMoodStability(weekFoodLogs, weekMoodLogs) {
  if (!weekFoodLogs || weekFoodLogs.length < 7 || !weekMoodLogs || weekMoodLogs.length < 7) return null;

  // Group meals by day
  const mealsByDay = {};
  weekFoodLogs.forEach(f => {
    const dayKey = f.loggedTime.toISOString().split('T')[0];
    if (!mealsByDay[dayKey]) mealsByDay[dayKey] = [];
    mealsByDay[dayKey].push(f.loggedTime.getHours());
  });

  // Calculate meal timing variance (how consistent are meal times across days)
  const dailyFirstMeals = Object.values(mealsByDay).map(hours => Math.min(...hours)).filter(h => h > 0);
  if (dailyFirstMeals.length < 3) return null;

  const avgFirstMeal = dailyFirstMeals.reduce((s, h) => s + h, 0) / dailyFirstMeals.length;
  const firstMealVariance = dailyFirstMeals.reduce((s, h) => s + Math.pow(h - avgFirstMeal, 2), 0) / dailyFirstMeals.length;

  const isConsistentTiming = firstMealVariance < 4; // Less than 2hr variance in first meal

  // Calculate weekly mood stability
  const energyLevels = weekMoodLogs.map(m => m.energyLevel);
  const avgEnergy = energyLevels.reduce((s, e) => s + e, 0) / energyLevels.length;
  const energyVariance = energyLevels.reduce((s, e) => s + Math.pow(e - avgEnergy, 2), 0) / energyLevels.length;

  if (isConsistentTiming && energyVariance < 3) {
    return {
      ruleName: 'consistent_meal_timing_mood_stability',
      correlationType: 'meal_timing_mood',
      severity: 'positive',
      strength: Math.max(0, 1 - (firstMealVariance / 8)) * 0.7,
      confidence: 0.6,
      evidence: {
        avgFirstMealTime: Math.round(avgFirstMeal * 10) / 10,
        firstMealVariance: Math.round(firstMealVariance * 100) / 100,
        daysTracked: Object.keys(mealsByDay).length,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        energyVariance: Math.round(energyVariance * 100) / 100,
      },
    };
  }

  return null;
}

/**
 * Rule: Protein-Rich Breakfast → Sustained Energy
 *
 * WHAT: High-protein breakfast predicts stable energy throughout morning
 * WHY: Protein slows glucose absorption, promotes satiety, stabilizes blood sugar
 * WHEN: Breakfast with >15g protein → late morning energy (10am-12pm)
 */
function detectProteinBreakfastSustainedEnergy(breakfastLogs, lateMorningMoods) {
  if (!breakfastLogs || breakfastLogs.length === 0 || !lateMorningMoods || lateMorningMoods.length === 0) return null;

  const totalProtein = breakfastLogs.reduce((sum, f) => sum + (f.protein || 0), 0);
  const isHighProtein = totalProtein >= 15;

  if (!isHighProtein) return null;

  // Check late morning moods (10am-12pm)
  const lateMorning = lateMorningMoods.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 10 && hour <= 12;
  });

  if (lateMorning.length === 0) return null;

  const avgEnergy = lateMorning.reduce((s, m) => s + m.energyLevel, 0) / lateMorning.length;
  const hasGoodEnergy = avgEnergy >= 6;

  if (!hasGoodEnergy) return null;

  return {
    ruleName: 'protein_breakfast_sustained_energy',
    correlationType: 'meal_timing_mood',
    severity: 'positive',
    strength: Math.min(totalProtein / 25, 1.0) * 0.75,
    confidence: 0.65,
    evidence: {
      breakfastProtein: totalProtein,
      lateMorningEnergy: Math.round(avgEnergy * 10) / 10,
      breakfastFoods: breakfastLogs.map(f => f.foodName).slice(0, 3),
    },
  };
}

/**
 * ============================================
 * ACTIVITY-MOOD PATTERN RULES
 * ============================================
 */

/**
 * Extract signals from activity log entry
 */
function extractActivitySignals(activityLog) {
  if (!activityLog) return null;

  return {
    type: activityLog.type || 'general',
    durationMinutes: parseInt(activityLog.duration_minutes) || 0,
    intensity: activityLog.intensity || 'moderate',
    loggedTime: new Date(activityLog.logged_at),
    dayKey: new Date(activityLog.logged_at).toISOString().split('T')[0],
  };
}

/**
 * Rule: Exercise → Same-Day Mood Boost
 *
 * WHAT: Physical activity correlates with improved mood on the same day
 * WHY: Exercise releases endorphins, reduces cortisol, improves neurotransmitter balance
 * WHEN: Activity logged → mood within 0-6 hours after
 * RESEARCH: 30+ min moderate activity → 25-30% mood improvement (acute effect)
 */
function detectExerciseMoodBoost(dayActivityLogs, dayMoodLogs, dayKey) {
  if (!dayActivityLogs || dayActivityLogs.length === 0 || !dayMoodLogs || dayMoodLogs.length === 0) return null;

  // Calculate total exercise duration
  const totalMinutes = dayActivityLogs.reduce((sum, a) => sum + a.durationMinutes, 0);
  const hasSignificantExercise = totalMinutes >= 20;

  if (!hasSignificantExercise) return null;

  // Find moods AFTER exercise
  const lastExerciseTime = Math.max(...dayActivityLogs.map(a => a.loggedTime.getTime()));
  const postExerciseMoods = dayMoodLogs.filter(m => {
    const moodTime = m.loggedTime.getTime();
    const hoursAfter = (moodTime - lastExerciseTime) / (1000 * 60 * 60);
    return hoursAfter > 0 && hoursAfter <= 6;
  });

  if (postExerciseMoods.length === 0) return null;

  // Check for positive mood
  const positiveMoods = postExerciseMoods.filter(m =>
    m.mood === 'happy' || m.mood === 'energized' || m.mood === 'calm' ||
    m.valence > 0.3 || m.energyLevel >= 6
  );

  if (positiveMoods.length === 0) return null;

  const avgEnergy = postExerciseMoods.reduce((s, m) => s + m.energyLevel, 0) / postExerciseMoods.length;
  const avgValence = postExerciseMoods.reduce((s, m) => s + m.valence, 0) / postExerciseMoods.length;

  return {
    ruleName: 'exercise_mood_boost',
    correlationType: 'activity_mood',
    severity: 'positive',
    strength: Math.min(totalMinutes / 60, 1.0) * 0.8,
    confidence: 0.7,
    timeLag: 2 * 60, // ~2 hours average
    evidence: {
      dayKey,
      totalMinutes,
      activityTypes: [...new Set(dayActivityLogs.map(a => a.type))],
      positiveMoodCount: positiveMoods.length,
      avgPostExerciseEnergy: Math.round(avgEnergy * 10) / 10,
      avgPostExerciseValence: Math.round(avgValence * 100) / 100,
    },
  };
}

/**
 * Rule: Morning Exercise → All-Day Energy Stability
 *
 * WHAT: Morning exercise (before 10am) predicts stable energy throughout the day
 * WHY: Morning exercise aligns with cortisol patterns, jump-starts metabolism
 * WHEN: Exercise 5-10am → energy levels through afternoon (12-6pm)
 */
function detectMorningExerciseAllDayEnergy(dayActivityLogs, dayMoodLogs, dayKey) {
  if (!dayActivityLogs || dayActivityLogs.length === 0 || !dayMoodLogs || dayMoodLogs.length < 2) return null;

  // Check for morning exercise (5-10am)
  const morningExercise = dayActivityLogs.filter(a => {
    const hour = a.loggedTime.getHours();
    return hour >= 5 && hour < 10;
  });

  const morningMinutes = morningExercise.reduce((s, a) => s + a.durationMinutes, 0);
  const hasSignificantMorningExercise = morningMinutes >= 15;

  if (!hasSignificantMorningExercise) return null;

  // Check afternoon mood (12-6pm)
  const afternoonMoods = dayMoodLogs.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 12 && hour <= 18;
  });

  if (afternoonMoods.length === 0) return null;

  const avgAfternoonEnergy = afternoonMoods.reduce((s, m) => s + m.energyLevel, 0) / afternoonMoods.length;
  const hasStableAfternoonEnergy = avgAfternoonEnergy >= 6;

  if (!hasStableAfternoonEnergy) return null;

  return {
    ruleName: 'morning_exercise_all_day_energy',
    correlationType: 'activity_mood',
    severity: 'positive',
    strength: Math.min(morningMinutes / 45, 1.0) * 0.75,
    confidence: 0.65,
    evidence: {
      dayKey,
      morningExerciseMinutes: morningMinutes,
      exerciseTypes: [...new Set(morningExercise.map(a => a.type))],
      avgAfternoonEnergy: Math.round(avgAfternoonEnergy * 10) / 10,
      afternoonMoodCount: afternoonMoods.length,
    },
  };
}

/**
 * Rule: Sedentary Day → Lower Mood/Energy
 *
 * WHAT: Days with no physical activity correlate with lower mood/energy
 * WHY: Lack of movement reduces blood flow, endorphins, and circadian rhythm strength
 * WHEN: No activity logged on a day → mood entries that day
 */
function detectSedentaryDayMoodImpact(dayActivityLogs, dayMoodLogs, dayKey) {
  // Only trigger if no activity and has mood data
  if (!dayMoodLogs || dayMoodLogs.length === 0) return null;

  const totalMinutes = dayActivityLogs ? dayActivityLogs.reduce((s, a) => s + a.durationMinutes, 0) : 0;
  const isSedentary = totalMinutes < 10;

  if (!isSedentary) return null;

  // Check for low mood/energy
  const lowMoods = dayMoodLogs.filter(m =>
    m.isLowEnergy || m.isNegativeMood || m.energyLevel < 5 || m.mood === 'tired'
  );

  if (lowMoods.length === 0) return null;

  const avgEnergy = dayMoodLogs.reduce((s, m) => s + m.energyLevel, 0) / dayMoodLogs.length;

  return {
    ruleName: 'sedentary_day_lower_mood',
    correlationType: 'activity_mood',
    severity: 'moderate',
    strength: Math.min(lowMoods.length / dayMoodLogs.length, 1.0) * 0.7,
    confidence: 0.6,
    evidence: {
      dayKey,
      activityMinutes: totalMinutes,
      lowMoodCount: lowMoods.length,
      totalMoodCount: dayMoodLogs.length,
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      moodTypes: [...new Set(lowMoods.map(m => m.mood))],
    },
  };
}

/**
 * Rule: Exercise Intensity → Next-Day Recovery
 *
 * WHAT: High-intensity exercise affects next-day energy/mood
 * WHY: Intense exercise requires recovery time; insufficient rest leads to fatigue
 * WHEN: High-intensity evening exercise → next morning mood
 */
function detectHighIntensityRecoveryImpact(eveningActivityLogs, nextMorningMoods) {
  if (!eveningActivityLogs || eveningActivityLogs.length === 0 || !nextMorningMoods || nextMorningMoods.length === 0) return null;

  // Check for high-intensity evening exercise (after 6pm)
  const eveningIntense = eveningActivityLogs.filter(a => {
    const hour = a.loggedTime.getHours();
    return hour >= 18 && (a.intensity === 'high' || a.intensity === 'intense');
  });

  const intenseMinutes = eveningIntense.reduce((s, a) => s + a.durationMinutes, 0);
  const hasIntenseEvening = intenseMinutes >= 30;

  if (!hasIntenseEvening) return null;

  // Check next morning (6-10am)
  const morningMoods = nextMorningMoods.filter(m => {
    const hour = m.loggedTime.getHours();
    return hour >= 6 && hour <= 10;
  });

  if (morningMoods.length === 0) return null;

  const avgMorningEnergy = morningMoods.reduce((s, m) => s + m.energyLevel, 0) / morningMoods.length;

  // Detect if low energy next morning (could be good recovery day OR overtrained)
  if (avgMorningEnergy < 5) {
    return {
      ruleName: 'high_intensity_recovery_impact',
      correlationType: 'activity_recovery',
      severity: 'moderate',
      strength: Math.min(intenseMinutes / 60, 1.0) * 0.7,
      confidence: 0.6,
      timeLag: 12 * 60,
      evidence: {
        eveningIntenseMinutes: intenseMinutes,
        exerciseTypes: [...new Set(eveningIntense.map(a => a.type))],
        avgNextMorningEnergy: Math.round(avgMorningEnergy * 10) / 10,
      },
    };
  }

  return null;
}

/**
 * Rule: Consistent Exercise → Mood Stability Over Time
 *
 * WHAT: Regular exercise pattern correlates with more stable mood over weeks
 * WHY: Chronic exercise effects on neurotransmitters, sleep quality, stress resilience
 * WHEN: 3+ exercise days per week → overall mood stability
 */
function detectConsistentExerciseMoodStability(weekActivityLogs, weekMoodLogs) {
  if (!weekActivityLogs || weekActivityLogs.length < 3 || !weekMoodLogs || weekMoodLogs.length < 7) return null;

  // Count active days (20+ minutes)
  const activeDays = new Set();
  weekActivityLogs.forEach(a => {
    if (a.durationMinutes >= 20) {
      activeDays.add(a.dayKey);
    }
  });

  const activeDayCount = activeDays.size;
  const isConsistentlyActive = activeDayCount >= 3;

  if (!isConsistentlyActive) return null;

  // Calculate mood stability over the week
  const energyLevels = weekMoodLogs.map(m => m.energyLevel);
  const avgEnergy = energyLevels.reduce((s, e) => s + e, 0) / energyLevels.length;
  const energyVariance = energyLevels.reduce((s, e) => s + Math.pow(e - avgEnergy, 2), 0) / energyLevels.length;
  const isStableMood = energyVariance < 3 && avgEnergy >= 5.5;

  if (!isStableMood) return null;

  return {
    ruleName: 'consistent_exercise_mood_stability',
    correlationType: 'activity_mood',
    severity: 'positive',
    strength: Math.min(activeDayCount / 5, 1.0) * 0.75,
    confidence: 0.65,
    evidence: {
      activeDays: activeDayCount,
      totalActivityMinutes: weekActivityLogs.reduce((s, a) => s + a.durationMinutes, 0),
      avgWeeklyEnergy: Math.round(avgEnergy * 10) / 10,
      energyStability: Math.round((1 - energyVariance / 10) * 100) / 100,
      activeDaysList: [...activeDays],
    },
  };
}

/**
 * ============================================
 * SCORING & CONFIDENCE CALCULATION
 * ============================================
 */

/**
 * Calculate confidence based on pattern strength, occurrence count, and confounders
 */
function calculateConfidence(occurrences, baseConfidence, confounderPenalties) {
  // Base confidence from occurrence count
  let confidence = Math.min(occurrences / 3, 1.0) * baseConfidence;

  // Apply confounding penalties
  let totalPenalty = 0;
  if (confounderPenalties.hasPoorSleep) totalPenalty += 0.2; // Sleep is strong signal
  if (confounderPenalties.hasHighStress) totalPenalty += 0.15;
  if (confounderPenalties.hasExercise) totalPenalty += 0.1;

  confidence = Math.max(0, confidence * (1 - totalPenalty));
  return Math.min(confidence, 1.0);
}

/**
 * Determine health impact severity based on affected domains and frequency
 */
function determineHealthImpactSeverity(affectedDomains, occurrences, isPositive = false) {
  if (isPositive) return 'positive';

  const severityScore = affectedDomains.length + (occurrences >= 3 ? 1 : 0);

  if (severityScore >= 4) return 'high';
  if (severityScore >= 2) return 'moderate';
  return 'low';
}

/**
 * ============================================
 * MAIN CORRELATION COMPUTATION
 * ============================================
 */

/**
 * Compute correlations for a user
 * Called daily as part of the orchestration pipeline
 */
export async function computeUserCorrelations(userId, options = {}) {
  const {
    windowTypes = ['4h', '24h', '7d', '30d'],
    forceRecompute = false,
  } = options;

  try {
    console.log(`[Correlation Engine] Computing correlations for user: ${userId}`);

    // Fetch user lifecycle stage (determines min confidence thresholds)
    const userProfile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    const user = userProfile[0];
    if (!user) throw new Error(`User not found: ${userId}`);

    // Fetch user's nutrition goal
    const goalResult = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    const goal = goalResult[0];
    const hydrationGoal = goal ? parseFloat(goal.waterLiters) : 3.0;

    const correlations = [];

    // For each window type, compute correlations
    for (const windowType of windowTypes) {
      const windowDays = parseWindowTypeToDays(windowType);
      const correlationsForWindow = await computeWindowCorrelations(
        userId,
        windowDays,
        windowType,
        hydrationGoal,
        user
      );

      correlations.push(...correlationsForWindow);
    }

    console.log(`[Correlation Engine] Found ${correlations.length} correlations for user ${userId}`);

    return {
      userId,
      computedAt: new Date(),
      windowTypes,
      correlationCount: correlations.length,
      correlations,
    };
  } catch (error) {
    console.error(`[Correlation Engine] Error computing correlations for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Compute correlations for a specific time window
 */
async function computeWindowCorrelations(userId, windowDays, windowType, hydrationGoal, userProfile) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Fetch all relevant logs for the window (including activity logs)
  const [foodLogs, moodLogs, waterLogs, activityLogs] = await Promise.all([
    db
      .select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, windowStart),
          lte(foodLogTable.loggedDate, now)
        )
      )
      .orderBy(foodLogTable.loggedDate),

    db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, windowStart),
          lte(moodLogTable.loggedDate, now)
        )
      )
      .orderBy(moodLogTable.loggedDate),

    db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, windowStart),
          lte(waterLogTable.loggedDate, now)
        )
      )
      .orderBy(waterLogTable.loggedDate),

    // Fetch activity logs via raw SQL (table may not exist in all deployments)
    (async () => {
      try {
        const result = await db.execute(sql`
          SELECT * FROM activity_logs
          WHERE user_id = ${userId}
            AND logged_at >= ${windowStart.toISOString()}
            AND logged_at <= ${now.toISOString()}
          ORDER BY logged_at
        `);
        return result.rows || [];
      } catch (err) {
        // Table may not exist - return empty array
        console.log('[Correlation Engine] activity_logs not available:', err.message);
        return [];
      }
    })(),
  ]);

  const correlations = [];

  if (foodLogs.length === 0 || moodLogs.length === 0) {
    console.log(`[Correlation Engine] Insufficient data for window ${windowType}: ${foodLogs.length} foods, ${moodLogs.length} moods`);
    return correlations;
  }

  // Extract signals
  const foodSignals = foodLogs.map(extractFoodSignals).filter(Boolean);
  const moodSignals = moodLogs.map(extractMoodSignals).filter(Boolean);
  const waterSignals = waterLogs.map(extractWaterSignals).filter(Boolean);
  const activitySignals = activityLogs.map(extractActivitySignals).filter(Boolean);

  // Calculate daily water totals
  const dailyWaterTotals = {};
  waterSignals.forEach((signal) => {
    const date = signal.loggedTime.toISOString().split('T')[0];
    dailyWaterTotals[date] = (dailyWaterTotals[date] || 0) + signal.hydrationLiters;
  });

  // ==========================================
  // Run correlation rules
  // ==========================================

  // Rule 1: High NOVA + Mood Crash
  const novaMoodMatches = [];
  for (const food of foodSignals) {
    for (const mood of moodSignals) {
      const match = detectHighNovaMoodCrash(food, mood, windowDays * 24);
      if (match) {
        novaMoodMatches.push({ food, mood, match });
      }
    }
  }

  if (novaMoodMatches.length >= 1) {
    // Aggregate occurrences
    const strength = Math.min(novaMoodMatches.length / 3, 1.0);
    const baseConfidence = 0.6;
    const confidence = calculateConfidence(
      novaMoodMatches.length,
      baseConfidence,
      {
        hasPoorSleep: moodSignals.some(m => m.sleepQuality === 'poor'),
        hasHighStress: moodSignals.some(m => m.stressLevel > 6),
        hasExercise: moodSignals.some(m => m.exerciseLevel !== 'none'),
      }
    );

    if (confidence >= 0.5) { // Threshold for reporting
      correlations.push({
        correlationType: 'mood_food',
        ruleName: 'high_nova_mood_crash',
        signalA: 'high_nova_carbs_sugar',
        signalAValue: Math.round(foodSignals.filter(f => f.isHighSugar && f.isHighNova).reduce((sum, f) => sum + f.sugar, 0) / foodSignals.filter(f => f.isHighSugar && f.isHighNova).length) || 0,
        signalAUnit: 'grams',
        signalB: 'mood_energy_drop',
        signalBValue: -Math.round(moodSignals.filter(m => m.isNegativeMood).reduce((sum, m) => sum + (5 - m.energyLevel), 0) / moodSignals.filter(m => m.isNegativeMood).length) || 0,
        signalBUnit: 'points',
        windowType,
        strength: Math.round(strength * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        occurrences: novaMoodMatches.length,
        healthImpactSeverity: determineHealthImpactSeverity(['mood', 'energy'], novaMoodMatches.length),
        affectedDomains: ['mood_stability', 'energy_consistency'],
        expectedOutcome: 'High-NOVA, high-sugar meals cause mood dips 2-4 hours later. Consider adding protein/fiber to stabilize blood sugar.',
        lastObservedDate: moodLogs[moodLogs.length - 1].dayKey || new Date().toISOString().split('T')[0],
        firstObservedDate: moodLogs[0].dayKey || new Date().toISOString().split('T')[0],
        isActive: true,
        evidenceJson: {
          matchCount: novaMoodMatches.length,
          avgTimeLag: Math.round(novaMoodMatches.reduce((sum, m) => sum + getHoursBetween(m.food.loggedTime, m.mood.loggedTime), 0) / novaMoodMatches.length * 60),
          examples: novaMoodMatches.slice(0, 3).map(m => ({
            food: m.food.foodName,
            sugarGrams: m.food.sugar,
            novaScore: m.food.novaScore,
            moodAfter: m.mood.mood,
            energyAfter: m.mood.energyLevel,
          })),
        },
      });
    }
  }

  // Rule 2: Dehydration + Fatigue
  for (const date in dailyWaterTotals) {
    const dailyWater = dailyWaterTotals[date];
    const dayMoods = moodSignals.filter(m => m.dayKey === date);

    if (dayMoods.length > 0) {
      for (const mood of dayMoods) {
        const dehydrationMatch = detectDehydrationFatigue(dailyWater, mood, hydrationGoal);
        if (dehydrationMatch && dehydrationMatch.confidence >= 0.5) {
          correlations.push({
            correlationType: 'hydration_mood',
            ruleName: 'dehydration_fatigue_mood',
            signalA: 'low_hydration',
            signalAValue: Math.round(dailyWater * 10) / 10,
            signalAUnit: 'liters',
            signalB: 'fatigue_mood',
            signalBValue: Math.round((7 - mood.energyLevel) * 10) / 10,
            signalBUnit: 'points',
            windowType,
            strength: Math.round(dehydrationMatch.strength * 100) / 100,
            confidence: Math.round(dehydrationMatch.confidence * 100) / 100,
            occurrences: 1, // Will accumulate
            healthImpactSeverity: 'moderate',
            affectedDomains: ['energy', 'mood', 'focus'],
            expectedOutcome: 'Low hydration (below 70% of daily goal) correlates with fatigue and low mood. Try increasing water intake throughout the day.',
            lastObservedDate: date,
            firstObservedDate: date,
            isActive: true,
            evidenceJson: {
              dailyWater,
              hydrationGoal,
              deficit: Math.round((1 - dailyWater / hydrationGoal) * 100) + '%',
              moodType: mood.mood,
              energyLevel: mood.energyLevel,
            },
          });
        }
      }
    }
  }

  // Rule 3: Caffeine Energy Pattern (multiple caffeine → energy crash)
  const caffeinePattern = detectCaffeineEnergyPattern(waterSignals, moodSignals);
  if (caffeinePattern && caffeinePattern.confidence >= 0.5) {
    correlations.push({
      correlationType: 'beverage_energy',
      ruleName: 'caffeine_energy_crash',
      signalA: 'caffeine_intake',
      signalAValue: caffeinePattern.evidence.caffeineCount,
      signalAUnit: 'drinks',
      signalB: 'energy_crash',
      signalBValue: caffeinePattern.evidence.crashCount,
      signalBUnit: 'occurrences',
      windowType,
      strength: Math.round(caffeinePattern.strength * 100) / 100,
      confidence: Math.round(caffeinePattern.confidence * 100) / 100,
      occurrences: caffeinePattern.evidence.crashCount,
      healthImpactSeverity: 'moderate',
      affectedDomains: ['energy', 'focus', 'mood_stability'],
      expectedOutcome: 'Multiple caffeine drinks lead to energy crashes 3-6 hours later. Try spacing out caffeine intake or switching to lower-caffeine options in the afternoon.',
      lastObservedDate: new Date().toISOString().split('T')[0],
      firstObservedDate: new Date().toISOString().split('T')[0],
      isActive: true,
      evidenceJson: caffeinePattern.evidence,
    });
  }

  // Rule 4: Evening Caffeine Sleep Impact
  const eveningCaffeineMatch = detectEveningCaffeineSleepImpact(waterSignals, moodSignals);
  if (eveningCaffeineMatch && eveningCaffeineMatch.confidence >= 0.5) {
    correlations.push({
      correlationType: 'beverage_sleep',
      ruleName: 'evening_caffeine_sleep_impact',
      signalA: 'evening_caffeine',
      signalAValue: eveningCaffeineMatch.evidence.eveningCaffeineCount,
      signalAUnit: 'drinks',
      signalB: 'poor_sleep',
      signalBValue: eveningCaffeineMatch.evidence.poorSleepCount,
      signalBUnit: 'mornings',
      windowType,
      strength: Math.round(eveningCaffeineMatch.strength * 100) / 100,
      confidence: Math.round(eveningCaffeineMatch.confidence * 100) / 100,
      occurrences: eveningCaffeineMatch.evidence.eveningCaffeineCount,
      healthImpactSeverity: 'moderate',
      affectedDomains: ['sleep', 'energy', 'recovery'],
      expectedOutcome: `Caffeine after 4pm is affecting your sleep. Last caffeine at ${eveningCaffeineMatch.evidence.lastCaffeineTime}:00 may delay sleep onset. Try cutting caffeine by 2pm.`,
      lastObservedDate: new Date().toISOString().split('T')[0],
      firstObservedDate: new Date().toISOString().split('T')[0],
      isActive: true,
      evidenceJson: eveningCaffeineMatch.evidence,
    });
  }

  // Rule 5: Beverage Variety → Better Hydration
  const varietyMatch = detectBeverageVarietyHydration(waterSignals, hydrationGoal);
  if (varietyMatch && varietyMatch.confidence >= 0.5) {
    correlations.push({
      correlationType: 'beverage_hydration',
      ruleName: 'beverage_variety_compliance',
      signalA: 'beverage_variety',
      signalAValue: varietyMatch.evidence.beverageVariety,
      signalAUnit: 'types',
      signalB: 'hydration_goal',
      signalBValue: varietyMatch.evidence.goalPercent,
      signalBUnit: 'percent',
      windowType,
      strength: Math.round(varietyMatch.strength * 100) / 100,
      confidence: Math.round(varietyMatch.confidence * 100) / 100,
      occurrences: 1,
      healthImpactSeverity: 'positive',
      affectedDomains: ['hydration', 'goal_compliance'],
      expectedOutcome: `Great job! Drinking ${varietyMatch.evidence.beverageVariety} different beverages helps you stay hydrated. Keep the variety going!`,
      lastObservedDate: new Date().toISOString().split('T')[0],
      firstObservedDate: new Date().toISOString().split('T')[0],
      isActive: true,
      evidenceJson: varietyMatch.evidence,
    });
  }

  // ==========================================
  // TEMPORAL PATTERN RULES (New)
  // ==========================================

  // Group data by day for temporal analysis
  const dayGroups = {};
  foodSignals.forEach(f => {
    const dayKey = f.loggedTime.toISOString().split('T')[0];
    if (!dayGroups[dayKey]) dayGroups[dayKey] = { foods: [], moods: [], water: 0, activities: [] };
    dayGroups[dayKey].foods.push(f);
  });
  moodSignals.forEach(m => {
    const dayKey = m.dayKey || m.loggedTime.toISOString().split('T')[0];
    if (!dayGroups[dayKey]) dayGroups[dayKey] = { foods: [], moods: [], water: 0, activities: [] };
    dayGroups[dayKey].moods.push(m);
  });
  Object.keys(dailyWaterTotals).forEach(date => {
    if (dayGroups[date]) dayGroups[date].water = dailyWaterTotals[date];
  });
  activitySignals.forEach(a => {
    const dayKey = a.dayKey;
    if (!dayGroups[dayKey]) dayGroups[dayKey] = { foods: [], moods: [], water: 0, activities: [] };
    dayGroups[dayKey].activities.push(a);
  });

  const sortedDays = Object.keys(dayGroups).sort();

  // Rule 6: Breakfast Skipping → Afternoon Mood Crash
  const breakfastSkipMatches = [];
  for (const dayKey of sortedDays) {
    const dayData = dayGroups[dayKey];
    const match = detectBreakfastSkipAfternoonCrash(dayData.foods, dayData.moods, dayKey);
    if (match) breakfastSkipMatches.push(match);
  }

  if (breakfastSkipMatches.length >= 2) {
    const avgStrength = breakfastSkipMatches.reduce((s, m) => s + m.strength, 0) / breakfastSkipMatches.length;
    correlations.push({
      correlationType: 'meal_timing_mood',
      ruleName: 'breakfast_skip_afternoon_crash',
      signalA: 'breakfast_skipped',
      signalAValue: breakfastSkipMatches.length,
      signalAUnit: 'days',
      signalB: 'afternoon_mood_crash',
      signalBValue: Math.round(breakfastSkipMatches.reduce((s, m) => s + m.evidence.avgAfternoonEnergy, 0) / breakfastSkipMatches.length * 10) / 10,
      signalBUnit: 'energy_level',
      windowType,
      strength: Math.round(avgStrength * 100) / 100,
      confidence: Math.min(0.5 + (breakfastSkipMatches.length * 0.1), 0.85),
      occurrences: breakfastSkipMatches.length,
      healthImpactSeverity: breakfastSkipMatches.length >= 3 ? 'high' : 'moderate',
      affectedDomains: ['energy', 'mood', 'focus', 'productivity'],
      expectedOutcome: `Skipping breakfast leads to afternoon energy crashes (avg ${Math.round(breakfastSkipMatches.reduce((s, m) => s + m.evidence.avgAfternoonEnergy, 0) / breakfastSkipMatches.length * 10) / 10}/10). A small protein-rich breakfast could stabilize your afternoon.`,
      lastObservedDate: breakfastSkipMatches[breakfastSkipMatches.length - 1].evidence.dayKey,
      firstObservedDate: breakfastSkipMatches[0].evidence.dayKey,
      isActive: true,
      evidenceJson: {
        occurrences: breakfastSkipMatches.length,
        avgAfternoonEnergy: Math.round(breakfastSkipMatches.reduce((s, m) => s + m.evidence.avgAfternoonEnergy, 0) / breakfastSkipMatches.length * 10) / 10,
        moodTypes: [...new Set(breakfastSkipMatches.flatMap(m => m.evidence.moodTypes))],
        days: breakfastSkipMatches.map(m => m.evidence.dayKey),
      },
    });
  }

  // Rule 7: High-Sugar Dinner → Next Morning Anxiety (Cross-day analysis)
  const sugarDinnerMatches = [];
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const dinnerDay = sortedDays[i];
    const morningDay = sortedDays[i + 1];
    const dinnerData = dayGroups[dinnerDay];
    const morningData = dayGroups[morningDay];

    const match = detectHighSugarDinnerMorningAnxiety(dinnerData.foods, morningData.moods);
    if (match) {
      match.evidence.dinnerDay = dinnerDay;
      match.evidence.morningDay = morningDay;
      sugarDinnerMatches.push(match);
    }
  }

  if (sugarDinnerMatches.length >= 2) {
    const avgSugar = sugarDinnerMatches.reduce((s, m) => s + m.evidence.dinnerSugarGrams, 0) / sugarDinnerMatches.length;
    correlations.push({
      correlationType: 'carryover_next_day',
      ruleName: 'high_sugar_dinner_morning_anxiety',
      signalA: 'dinner_sugar',
      signalAValue: Math.round(avgSugar),
      signalAUnit: 'grams',
      signalB: 'morning_anxiety',
      signalBValue: Math.round(sugarDinnerMatches.reduce((s, m) => s + m.evidence.avgMorningStress, 0) / sugarDinnerMatches.length * 10) / 10,
      signalBUnit: 'stress_level',
      windowType,
      strength: Math.round(sugarDinnerMatches.reduce((s, m) => s + m.strength, 0) / sugarDinnerMatches.length * 100) / 100,
      confidence: Math.min(0.55 + (sugarDinnerMatches.length * 0.1), 0.8),
      occurrences: sugarDinnerMatches.length,
      healthImpactSeverity: 'moderate',
      affectedDomains: ['morning_mood', 'sleep_quality', 'energy', 'stress'],
      expectedOutcome: `High-sugar dinners (avg ${Math.round(avgSugar)}g) are making your mornings more stressful. Try reducing evening sugar or adding protein/fiber to slow absorption.`,
      lastObservedDate: sugarDinnerMatches[sugarDinnerMatches.length - 1].evidence.morningDay,
      firstObservedDate: sugarDinnerMatches[0].evidence.dinnerDay,
      isActive: true,
      evidenceJson: {
        occurrences: sugarDinnerMatches.length,
        avgDinnerSugar: Math.round(avgSugar),
        avgMorningStress: Math.round(sugarDinnerMatches.reduce((s, m) => s + m.evidence.avgMorningStress, 0) / sugarDinnerMatches.length * 10) / 10,
        dinnerFoods: [...new Set(sugarDinnerMatches.flatMap(m => m.evidence.dinnerFoods))].slice(0, 5),
        dayPairs: sugarDinnerMatches.map(m => ({ dinner: m.evidence.dinnerDay, morning: m.evidence.morningDay })),
      },
    });
  }

  // Rule 8: Daily Hydration → Mood Stability
  const hydrationStabilityMatches = { positive: [], negative: [] };
  for (const dayKey of sortedDays) {
    const dayData = dayGroups[dayKey];
    const match = detectDailyHydrationMoodStability(dayData.water, dayData.moods, hydrationGoal, dayKey);
    if (match) {
      if (match.ruleName === 'hydration_mood_stability_positive') {
        hydrationStabilityMatches.positive.push(match);
      } else {
        hydrationStabilityMatches.negative.push(match);
      }
    }
  }

  // Positive hydration-mood correlation
  if (hydrationStabilityMatches.positive.length >= 2) {
    const matches = hydrationStabilityMatches.positive;
    correlations.push({
      correlationType: 'hydration_mood',
      ruleName: 'hydration_mood_stability_positive',
      signalA: 'daily_hydration',
      signalAValue: Math.round(matches.reduce((s, m) => s + m.evidence.hydrationPercent, 0) / matches.length),
      signalAUnit: 'percent',
      signalB: 'mood_stability',
      signalBValue: Math.round(matches.reduce((s, m) => s + m.evidence.energyStability, 0) / matches.length * 100) / 100,
      signalBUnit: 'stability_score',
      windowType,
      strength: Math.round(matches.reduce((s, m) => s + m.strength, 0) / matches.length * 100) / 100,
      confidence: Math.min(0.6 + (matches.length * 0.08), 0.85),
      occurrences: matches.length,
      healthImpactSeverity: 'positive',
      affectedDomains: ['mood_stability', 'energy', 'irritability'],
      expectedOutcome: `On days you drink enough water (${Math.round(matches.reduce((s, m) => s + m.evidence.hydrationPercent, 0) / matches.length)}% of goal), your mood stays more stable with ${Math.round((1 - matches.reduce((s, m) => s + m.evidence.irritabilityRate, 0) / matches.length / 100) * 100)}% less irritability. Keep it up!`,
      lastObservedDate: matches[matches.length - 1].evidence.dayKey,
      firstObservedDate: matches[0].evidence.dayKey,
      isActive: true,
      evidenceJson: {
        occurrences: matches.length,
        avgHydrationPercent: Math.round(matches.reduce((s, m) => s + m.evidence.hydrationPercent, 0) / matches.length),
        avgEnergyStability: Math.round(matches.reduce((s, m) => s + m.evidence.energyStability, 0) / matches.length * 100) / 100,
        avgIrritabilityRate: Math.round(matches.reduce((s, m) => s + m.evidence.irritabilityRate, 0) / matches.length),
        days: matches.map(m => m.evidence.dayKey),
      },
    });
  }

  // Negative dehydration-irritability correlation
  if (hydrationStabilityMatches.negative.length >= 2) {
    const matches = hydrationStabilityMatches.negative;
    correlations.push({
      correlationType: 'hydration_mood',
      ruleName: 'dehydration_mood_instability',
      signalA: 'hydration_deficit',
      signalAValue: Math.round(matches.reduce((s, m) => s + m.evidence.hydrationDeficit, 0) / matches.length),
      signalAUnit: 'percent',
      signalB: 'mood_instability',
      signalBValue: Math.round(matches.reduce((s, m) => s + m.evidence.irritabilityRate, 0) / matches.length),
      signalBUnit: 'irritability_percent',
      windowType,
      strength: Math.round(matches.reduce((s, m) => s + m.strength, 0) / matches.length * 100) / 100,
      confidence: Math.min(0.55 + (matches.length * 0.08), 0.8),
      occurrences: matches.length,
      healthImpactSeverity: 'moderate',
      affectedDomains: ['mood_stability', 'irritability', 'energy', 'focus'],
      expectedOutcome: `On days with low hydration (${Math.round(matches.reduce((s, m) => s + 100 - m.evidence.hydrationDeficit, 0) / matches.length)}% of goal), you experience ${Math.round(matches.reduce((s, m) => s + m.evidence.irritabilityRate, 0) / matches.length)}% more irritability. Try front-loading water intake in the morning.`,
      lastObservedDate: matches[matches.length - 1].evidence.dayKey,
      firstObservedDate: matches[0].evidence.dayKey,
      isActive: true,
      evidenceJson: {
        occurrences: matches.length,
        avgHydrationDeficit: Math.round(matches.reduce((s, m) => s + m.evidence.hydrationDeficit, 0) / matches.length),
        avgIrritabilityRate: Math.round(matches.reduce((s, m) => s + m.evidence.irritabilityRate, 0) / matches.length),
        negativeMoodTypes: [...new Set(matches.flatMap(m => m.evidence.negativeMoodTypes || []))],
        days: matches.map(m => m.evidence.dayKey),
      },
    });
  }

  // Rule 9: Meal Timing Consistency → Mood Stability (Week-level)
  if (windowDays >= 7) {
    const mealTimingMatch = detectMealTimingMoodStability(foodSignals, moodSignals);
    if (mealTimingMatch && mealTimingMatch.confidence >= 0.5) {
      correlations.push({
        correlationType: 'meal_timing_mood',
        ruleName: 'consistent_meal_timing_mood_stability',
        signalA: 'meal_timing_consistency',
        signalAValue: Math.round((1 - mealTimingMatch.evidence.firstMealVariance / 8) * 100),
        signalAUnit: 'consistency_percent',
        signalB: 'mood_stability',
        signalBValue: Math.round((1 - mealTimingMatch.evidence.energyVariance / 10) * 100),
        signalBUnit: 'stability_percent',
        windowType,
        strength: Math.round(mealTimingMatch.strength * 100) / 100,
        confidence: Math.round(mealTimingMatch.confidence * 100) / 100,
        occurrences: mealTimingMatch.evidence.daysTracked,
        healthImpactSeverity: 'positive',
        affectedDomains: ['circadian_rhythm', 'energy', 'mood_stability'],
        expectedOutcome: `Your consistent meal timing (first meal around ${Math.round(mealTimingMatch.evidence.avgFirstMealTime)}:00) is helping stabilize your mood. Circadian alignment is key!`,
        lastObservedDate: new Date().toISOString().split('T')[0],
        firstObservedDate: sortedDays[0],
        isActive: true,
        evidenceJson: mealTimingMatch.evidence,
      });
    }
  }

  // Rule 10: Protein Breakfast → Sustained Energy
  const proteinBreakfastMatches = [];
  for (const dayKey of sortedDays) {
    const dayData = dayGroups[dayKey];
    const breakfastLogs = dayData.foods.filter(f => f.loggedTime.getHours() >= 5 && f.loggedTime.getHours() < 10);
    const match = detectProteinBreakfastSustainedEnergy(breakfastLogs, dayData.moods);
    if (match) {
      match.evidence.dayKey = dayKey;
      proteinBreakfastMatches.push(match);
    }
  }

  if (proteinBreakfastMatches.length >= 2) {
    const avgProtein = proteinBreakfastMatches.reduce((s, m) => s + m.evidence.breakfastProtein, 0) / proteinBreakfastMatches.length;
    correlations.push({
      correlationType: 'meal_timing_mood',
      ruleName: 'protein_breakfast_sustained_energy',
      signalA: 'breakfast_protein',
      signalAValue: Math.round(avgProtein),
      signalAUnit: 'grams',
      signalB: 'late_morning_energy',
      signalBValue: Math.round(proteinBreakfastMatches.reduce((s, m) => s + m.evidence.lateMorningEnergy, 0) / proteinBreakfastMatches.length * 10) / 10,
      signalBUnit: 'energy_level',
      windowType,
      strength: Math.round(proteinBreakfastMatches.reduce((s, m) => s + m.strength, 0) / proteinBreakfastMatches.length * 100) / 100,
      confidence: Math.min(0.55 + (proteinBreakfastMatches.length * 0.1), 0.8),
      occurrences: proteinBreakfastMatches.length,
      healthImpactSeverity: 'positive',
      affectedDomains: ['energy', 'focus', 'satiety'],
      expectedOutcome: `Protein-rich breakfasts (avg ${Math.round(avgProtein)}g) keep your energy stable through late morning (avg ${Math.round(proteinBreakfastMatches.reduce((s, m) => s + m.evidence.lateMorningEnergy, 0) / proteinBreakfastMatches.length * 10) / 10}/10 energy). Great pattern!`,
      lastObservedDate: proteinBreakfastMatches[proteinBreakfastMatches.length - 1].evidence.dayKey,
      firstObservedDate: proteinBreakfastMatches[0].evidence.dayKey,
      isActive: true,
      evidenceJson: {
        occurrences: proteinBreakfastMatches.length,
        avgBreakfastProtein: Math.round(avgProtein),
        avgLateMorningEnergy: Math.round(proteinBreakfastMatches.reduce((s, m) => s + m.evidence.lateMorningEnergy, 0) / proteinBreakfastMatches.length * 10) / 10,
        breakfastFoods: [...new Set(proteinBreakfastMatches.flatMap(m => m.evidence.breakfastFoods))].slice(0, 5),
        days: proteinBreakfastMatches.map(m => m.evidence.dayKey),
      },
    });
  }

  // ==========================================
  // ACTIVITY-MOOD PATTERN RULES
  // ==========================================

  if (activitySignals.length > 0) {
    // Rule 11: Exercise → Same-Day Mood Boost
    const exerciseMoodBoostMatches = [];
    for (const dayKey of sortedDays) {
      const dayData = dayGroups[dayKey];
      if (dayData.activities.length > 0 && dayData.moods.length > 0) {
        const match = detectExerciseMoodBoost(dayData.activities, dayData.moods, dayKey);
        if (match) exerciseMoodBoostMatches.push(match);
      }
    }

    if (exerciseMoodBoostMatches.length >= 2) {
      const avgMinutes = exerciseMoodBoostMatches.reduce((s, m) => s + m.evidence.totalMinutes, 0) / exerciseMoodBoostMatches.length;
      correlations.push({
        correlationType: 'activity_mood',
        ruleName: 'exercise_mood_boost',
        signalA: 'exercise_duration',
        signalAValue: Math.round(avgMinutes),
        signalAUnit: 'minutes',
        signalB: 'post_exercise_energy',
        signalBValue: Math.round(exerciseMoodBoostMatches.reduce((s, m) => s + m.evidence.avgPostExerciseEnergy, 0) / exerciseMoodBoostMatches.length * 10) / 10,
        signalBUnit: 'energy_level',
        windowType,
        strength: Math.round(exerciseMoodBoostMatches.reduce((s, m) => s + m.strength, 0) / exerciseMoodBoostMatches.length * 100) / 100,
        confidence: Math.min(0.6 + (exerciseMoodBoostMatches.length * 0.08), 0.85),
        occurrences: exerciseMoodBoostMatches.length,
        healthImpactSeverity: 'positive',
        affectedDomains: ['mood', 'energy', 'stress_relief'],
        expectedOutcome: `Exercise (avg ${Math.round(avgMinutes)} min) boosts your mood with avg ${Math.round(exerciseMoodBoostMatches.reduce((s, m) => s + m.evidence.avgPostExerciseEnergy, 0) / exerciseMoodBoostMatches.length * 10) / 10}/10 energy afterward. Keep moving!`,
        lastObservedDate: exerciseMoodBoostMatches[exerciseMoodBoostMatches.length - 1].evidence.dayKey,
        firstObservedDate: exerciseMoodBoostMatches[0].evidence.dayKey,
        isActive: true,
        evidenceJson: {
          occurrences: exerciseMoodBoostMatches.length,
          avgDuration: Math.round(avgMinutes),
          avgPostExerciseEnergy: Math.round(exerciseMoodBoostMatches.reduce((s, m) => s + m.evidence.avgPostExerciseEnergy, 0) / exerciseMoodBoostMatches.length * 10) / 10,
          activityTypes: [...new Set(exerciseMoodBoostMatches.flatMap(m => m.evidence.activityTypes))],
          days: exerciseMoodBoostMatches.map(m => m.evidence.dayKey),
        },
      });
    }

    // Rule 12: Morning Exercise → All-Day Energy
    const morningExerciseMatches = [];
    for (const dayKey of sortedDays) {
      const dayData = dayGroups[dayKey];
      if (dayData.activities.length > 0 && dayData.moods.length >= 2) {
        const match = detectMorningExerciseAllDayEnergy(dayData.activities, dayData.moods, dayKey);
        if (match) morningExerciseMatches.push(match);
      }
    }

    if (morningExerciseMatches.length >= 2) {
      correlations.push({
        correlationType: 'activity_mood',
        ruleName: 'morning_exercise_all_day_energy',
        signalA: 'morning_exercise',
        signalAValue: Math.round(morningExerciseMatches.reduce((s, m) => s + m.evidence.morningExerciseMinutes, 0) / morningExerciseMatches.length),
        signalAUnit: 'minutes',
        signalB: 'afternoon_energy',
        signalBValue: Math.round(morningExerciseMatches.reduce((s, m) => s + m.evidence.avgAfternoonEnergy, 0) / morningExerciseMatches.length * 10) / 10,
        signalBUnit: 'energy_level',
        windowType,
        strength: Math.round(morningExerciseMatches.reduce((s, m) => s + m.strength, 0) / morningExerciseMatches.length * 100) / 100,
        confidence: Math.min(0.55 + (morningExerciseMatches.length * 0.1), 0.8),
        occurrences: morningExerciseMatches.length,
        healthImpactSeverity: 'positive',
        affectedDomains: ['energy', 'productivity', 'circadian_rhythm'],
        expectedOutcome: `Morning exercise keeps your afternoon energy high (avg ${Math.round(morningExerciseMatches.reduce((s, m) => s + m.evidence.avgAfternoonEnergy, 0) / morningExerciseMatches.length * 10) / 10}/10). Great habit!`,
        lastObservedDate: morningExerciseMatches[morningExerciseMatches.length - 1].evidence.dayKey,
        firstObservedDate: morningExerciseMatches[0].evidence.dayKey,
        isActive: true,
        evidenceJson: {
          occurrences: morningExerciseMatches.length,
          avgMorningMinutes: Math.round(morningExerciseMatches.reduce((s, m) => s + m.evidence.morningExerciseMinutes, 0) / morningExerciseMatches.length),
          exerciseTypes: [...new Set(morningExerciseMatches.flatMap(m => m.evidence.exerciseTypes))],
          days: morningExerciseMatches.map(m => m.evidence.dayKey),
        },
      });
    }

    // Rule 13: Sedentary Day → Lower Mood
    const sedentaryDayMatches = [];
    for (const dayKey of sortedDays) {
      const dayData = dayGroups[dayKey];
      const match = detectSedentaryDayMoodImpact(dayData.activities, dayData.moods, dayKey);
      if (match) sedentaryDayMatches.push(match);
    }

    if (sedentaryDayMatches.length >= 2) {
      correlations.push({
        correlationType: 'activity_mood',
        ruleName: 'sedentary_day_lower_mood',
        signalA: 'sedentary_days',
        signalAValue: sedentaryDayMatches.length,
        signalAUnit: 'days',
        signalB: 'low_energy',
        signalBValue: Math.round(sedentaryDayMatches.reduce((s, m) => s + m.evidence.avgEnergy, 0) / sedentaryDayMatches.length * 10) / 10,
        signalBUnit: 'energy_level',
        windowType,
        strength: Math.round(sedentaryDayMatches.reduce((s, m) => s + m.strength, 0) / sedentaryDayMatches.length * 100) / 100,
        confidence: Math.min(0.5 + (sedentaryDayMatches.length * 0.08), 0.75),
        occurrences: sedentaryDayMatches.length,
        healthImpactSeverity: 'moderate',
        affectedDomains: ['energy', 'mood', 'physical_health'],
        expectedOutcome: `On inactive days, your energy drops to avg ${Math.round(sedentaryDayMatches.reduce((s, m) => s + m.evidence.avgEnergy, 0) / sedentaryDayMatches.length * 10) / 10}/10. Even a short walk could help!`,
        lastObservedDate: sedentaryDayMatches[sedentaryDayMatches.length - 1].evidence.dayKey,
        firstObservedDate: sedentaryDayMatches[0].evidence.dayKey,
        isActive: true,
        evidenceJson: {
          occurrences: sedentaryDayMatches.length,
          avgEnergy: Math.round(sedentaryDayMatches.reduce((s, m) => s + m.evidence.avgEnergy, 0) / sedentaryDayMatches.length * 10) / 10,
          moodTypes: [...new Set(sedentaryDayMatches.flatMap(m => m.evidence.moodTypes))],
          days: sedentaryDayMatches.map(m => m.evidence.dayKey),
        },
      });
    }

    // Rule 14: Consistent Exercise → Mood Stability (Week-level)
    if (windowDays >= 7) {
      const consistentExerciseMatch = detectConsistentExerciseMoodStability(activitySignals, moodSignals);
      if (consistentExerciseMatch && consistentExerciseMatch.confidence >= 0.5) {
        correlations.push({
          correlationType: 'activity_mood',
          ruleName: 'consistent_exercise_mood_stability',
          signalA: 'active_days_per_week',
          signalAValue: consistentExerciseMatch.evidence.activeDays,
          signalAUnit: 'days',
          signalB: 'mood_stability',
          signalBValue: Math.round(consistentExerciseMatch.evidence.energyStability * 100),
          signalBUnit: 'stability_percent',
          windowType,
          strength: Math.round(consistentExerciseMatch.strength * 100) / 100,
          confidence: Math.round(consistentExerciseMatch.confidence * 100) / 100,
          occurrences: consistentExerciseMatch.evidence.activeDays,
          healthImpactSeverity: 'positive',
          affectedDomains: ['mood_stability', 'energy', 'stress_resilience'],
          expectedOutcome: `Exercising ${consistentExerciseMatch.evidence.activeDays} days/week keeps your mood ${Math.round(consistentExerciseMatch.evidence.energyStability * 100)}% more stable. Consistency is key!`,
          lastObservedDate: new Date().toISOString().split('T')[0],
          firstObservedDate: sortedDays[0],
          isActive: true,
          evidenceJson: consistentExerciseMatch.evidence,
        });
      }
    }
  }

  return correlations;
}

/**
 * Parse window type string to number of days
 */
function parseWindowTypeToDays(windowType) {
  const map = {
    '4h': 0.17,
    '24h': 1,
    '7d': 7,
    '15d': 15,
    '30d': 30,
    '60d': 60,
  };
  return map[windowType] || 7;
}

/**
 * ============================================
 * DATABASE PERSISTENCE
 * ============================================
 */

/**
 * Store or update a correlation in the database
 */
export async function saveCorrelation(userId, correlationData) {
  try {
    const {
      correlationType,
      ruleName,
      windowType,
      signalA,
      signalAValue,
      signalAUnit,
      signalB,
      signalBValue,
      signalBUnit,
      strength,
      confidence,
      occurrences,
      healthImpactSeverity,
      affectedDomains,
      expectedOutcome,
      lastObservedDate,
      firstObservedDate,
      isActive,
      evidenceJson,
    } = correlationData;

    // Check if correlation exists
    const existing = await db
      .select()
      .from(userCorrelationsTable)
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          eq(userCorrelationsTable.correlationType, correlationType),
          eq(userCorrelationsTable.ruleName, ruleName),
          eq(userCorrelationsTable.windowType, windowType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      return db
        .update(userCorrelationsTable)
        .set({
          strength,
          confidence,
          occurrences: Math.max(occurrences, existing[0].occurrences),
          healthImpactSeverity,
          affectedDomains,
          expectedOutcome,
          lastObservedDate,
          isActive,
          evidenceJson,
          updatedAt: new Date(),
        })
        .where(eq(userCorrelationsTable.id, existing[0].id));
    } else {
      // Insert new
      return db.insert(userCorrelationsTable).values({
        userId,
        correlationType,
        ruleName,
        signalA,
        signalAValue,
        signalAUnit,
        signalB,
        signalBValue,
        signalBUnit,
        windowType,
        strength,
        confidence,
        occurrences,
        healthImpactSeverity,
        affectedDomains,
        expectedOutcome,
        lastObservedDate,
        firstObservedDate,
        isActive,
        evidenceJson,
      });
    }
  } catch (error) {
    console.error('[Correlation Engine] Error saving correlation:', error);
    throw error;
  }
}

/**
 * Retrieve user's active correlations
 */
export async function getUserCorrelations(userId, options = {}) {
  const {
    minConfidence = 0.5,
    correlationType = null,
    limit = 10,
  } = options;

  try {
    let query = db
      .select()
      .from(userCorrelationsTable)
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          eq(userCorrelationsTable.isActive, true),
          gte(userCorrelationsTable.confidence, minConfidence)
        )
      );

    if (correlationType) {
      query = query.where(eq(userCorrelationsTable.correlationType, correlationType));
    }

    const correlations = await query
      .orderBy(desc(userCorrelationsTable.confidence))
      .limit(limit);

    return correlations;
  } catch (error) {
    console.error('[Correlation Engine] Error fetching correlations:', error);
    throw error;
  }
}

/**
 * Get evidence points for a specific correlation
 */
export async function getCorrelationEvidence(correlationId, limit = 10) {
  try {
    const evidence = await db
      .select()
      .from(correlationEvidenceTable)
      .where(eq(correlationEvidenceTable.correlationId, correlationId))
      .orderBy(desc(correlationEvidenceTable.createdAt))
      .limit(limit);

    return evidence;
  } catch (error) {
    console.error('[Correlation Engine] Error fetching evidence:', error);
    throw error;
  }
}

/**
 * Mark a correlation as inactive (user no longer observes it)
 */
export async function deactivateCorrelation(correlationId) {
  try {
    return db
      .update(userCorrelationsTable)
      .set({ isActive: false })
      .where(eq(userCorrelationsTable.id, correlationId));
  } catch (error) {
    console.error('[Correlation Engine] Error deactivating correlation:', error);
    throw error;
  }
}

export default {
  computeUserCorrelations,
  getUserCorrelations,
  getCorrelationEvidence,
  deactivateCorrelation,
  saveCorrelation,
};
