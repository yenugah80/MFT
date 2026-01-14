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
import { eq, and, gte, lte, between, desc } from 'drizzle-orm';

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

  // Fetch all relevant logs for the window
  const [foodLogs, moodLogs, waterLogs] = await Promise.all([
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
