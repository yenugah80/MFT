/**
 * Prediction Learning Service
 *
 * A closed-loop system that learns from each user individually:
 * 1. Store predictions when made
 * 2. Schedule check-ins at predicted outcome time
 * 3. Collect user feedback via push notifications
 * 4. Learn and adjust personal thresholds
 * 5. Generate "Remember when" stories
 *
 * User-first approach: "This app gets me"
 */

import { db } from '../db/index.js';
import {
  predictionLogTable,
  predictionOutcomesTable,
  userThresholdsTable,
  predictionStoriesTable,
  pendingCheckInsTable,
  accountSettingsTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { sendUserFCMNotification, FCM_NOTIFICATION_TYPES } from './fcmPushService.js';

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// WELLNESS DOMAINS
// ============================================================================

const WELLNESS_DOMAINS = {
  FOOD: 'food',
  HYDRATION: 'hydration',
  MOOD: 'mood',
  ACTIVITY: 'activity',
};

// ============================================================================
// DEFAULT THRESHOLDS BY DOMAIN
// ============================================================================

const DEFAULT_THRESHOLDS = {
  // === FOOD THRESHOLDS ===
  sugar_crash: { value: 25, unit: 'grams', domain: 'food', description: 'Sugar threshold for energy crash prediction' },
  protein_fatigue: { value: 15, unit: 'grams', domain: 'food', description: 'Minimum protein to prevent fatigue' },
  late_meal: { value: 21, unit: 'hour', domain: 'food', description: 'Hour after which meal is "late"' },
  carb_crash: { value: 60, unit: 'grams', domain: 'food', description: 'Carb threshold for crash without protein' },
  meal_gap: { value: 5, unit: 'hours', domain: 'food', description: 'Hours without food before hunger warning' },
  calorie_deficit: { value: 500, unit: 'calories', domain: 'food', description: 'Calorie deficit that may cause fatigue' },
  fiber_bloat: { value: 35, unit: 'grams', domain: 'food', description: 'Fiber threshold for potential discomfort' },

  // === HYDRATION THRESHOLDS ===
  hydration_warning: { value: 40, unit: 'percent', domain: 'hydration', description: 'Hydration % that triggers warning' },
  hydration_critical: { value: 25, unit: 'percent', domain: 'hydration', description: 'Critical low hydration level' },
  water_gap: { value: 3, unit: 'hours', domain: 'hydration', description: 'Hours without water intake' },
  caffeine_dehydration: { value: 300, unit: 'mg', domain: 'hydration', description: 'Caffeine level affecting hydration' },
  morning_hydration: { value: 500, unit: 'ml', domain: 'hydration', description: 'Target morning water intake' },
  hydration_energy_boost: { value: 70, unit: 'percent', domain: 'hydration', description: 'Hydration level for energy boost' },

  // === MOOD THRESHOLDS ===
  mood_food_delay: { value: 4, unit: 'hours', domain: 'mood', description: 'Hours after eating for mood impact' },
  mood_sugar_crash: { value: 30, unit: 'grams', domain: 'mood', description: 'Sugar level affecting mood' },
  mood_sleep_deficit: { value: 2, unit: 'hours', domain: 'mood', description: 'Sleep deficit affecting mood' },
  mood_consecutive_low: { value: 3, unit: 'count', domain: 'mood', description: 'Consecutive low mood entries to flag' },
  stress_fatigue: { value: 7, unit: 'scale', domain: 'mood', description: 'Stress level (1-10) causing fatigue' },
  mood_recovery_time: { value: 2, unit: 'hours', domain: 'mood', description: 'Time for mood to improve after intervention' },

  // === ACTIVITY THRESHOLDS ===
  activity_recovery: { value: 24, unit: 'hours', domain: 'activity', description: 'Hours needed for recovery after intense activity' },
  activity_sedentary: { value: 4, unit: 'hours', domain: 'activity', description: 'Sedentary hours before movement reminder' },
  activity_sleep_cutoff: { value: 3, unit: 'hours', domain: 'activity', description: 'Hours before bed to avoid intense activity' },
  activity_energy_requirement: { value: 1500, unit: 'calories', domain: 'activity', description: 'Calories needed for intense activity' },
  activity_hydration_need: { value: 250, unit: 'ml', domain: 'activity', description: 'Extra water per 30min activity' },
  steps_energy_correlation: { value: 8000, unit: 'steps', domain: 'activity', description: 'Steps threshold for energy assessment' },
};

// ============================================================================
// PREDICTION TYPES BY DOMAIN
// ============================================================================

const PREDICTION_TYPES = {
  // Food predictions
  ENERGY_CRASH: 'energy_crash',
  HUNGER: 'hunger',
  SLEEP_IMPACT: 'sleep_impact',
  DIGESTION_ISSUE: 'digestion_issue',

  // Hydration predictions
  DEHYDRATION: 'dehydration',
  DEHYDRATION_HEADACHE: 'dehydration_headache',
  HYDRATION_ENERGY: 'hydration_energy',

  // Mood predictions
  MOOD_DIP: 'mood_dip',
  MOOD_BOOST: 'mood_boost',
  STRESS_FATIGUE: 'stress_fatigue',

  // Activity predictions
  ACTIVITY_FATIGUE: 'activity_fatigue',
  RECOVERY_NEEDED: 'recovery_needed',
  MOVEMENT_REMINDER: 'movement_reminder',
  SLEEP_QUALITY_IMPACT: 'sleep_quality_impact',
};

// Map prediction types to their domains
const PREDICTION_DOMAIN_MAP = {
  energy_crash: WELLNESS_DOMAINS.FOOD,
  hunger: WELLNESS_DOMAINS.FOOD,
  sleep_impact: WELLNESS_DOMAINS.FOOD,
  digestion_issue: WELLNESS_DOMAINS.FOOD,
  dehydration: WELLNESS_DOMAINS.HYDRATION,
  dehydration_headache: WELLNESS_DOMAINS.HYDRATION,
  hydration_energy: WELLNESS_DOMAINS.HYDRATION,
  mood_dip: WELLNESS_DOMAINS.MOOD,
  mood_boost: WELLNESS_DOMAINS.MOOD,
  stress_fatigue: WELLNESS_DOMAINS.MOOD,
  activity_fatigue: WELLNESS_DOMAINS.ACTIVITY,
  recovery_needed: WELLNESS_DOMAINS.ACTIVITY,
  movement_reminder: WELLNESS_DOMAINS.ACTIVITY,
  sleep_quality_impact: WELLNESS_DOMAINS.ACTIVITY,
};

const OUTCOME_MAPPING = {
  '😴': { outcome: 'as_predicted', intensity: 4 },
  '😊': { outcome: 'opposite', intensity: 1 },
  '😐': { outcome: 'no_effect', intensity: 2 },
  '🤷': { outcome: 'unsure', intensity: null },
  'tired': { outcome: 'as_predicted', intensity: 4 },
  'fine': { outcome: 'opposite', intensity: 1 },
  'somewhat': { outcome: 'as_predicted', intensity: 2 },
  'no_effect': { outcome: 'no_effect', intensity: 1 },
};

// ============================================================================
// 1. STORE PREDICTIONS
// ============================================================================

/**
 * Store a prediction when made
 * Returns the prediction ID for outcome tracking
 */
export async function storePrediction(userId, prediction) {
  try {
    const {
      type,
      subtype,
      outcome,
      severity,
      predictedTime,
      windowMinutes = 60,
      trigger,
      confidence,
      confidenceFactors,
      thresholds,
      wasPersonalized,
      message,
      preventionTip,
    } = prediction;

    // Calculate expiry (2 hours after predicted time)
    const expiresAt = new Date(predictedTime.getTime() + 2 * 60 * 60 * 1000);

    const [stored] = await db
      .insert(predictionLogTable)
      .values({
        userId,
        predictionType: type,
        predictionSubtype: subtype,
        predictedOutcome: outcome,
        predictedSeverity: severity,
        predictedTime,
        predictionWindowMinutes: windowMinutes,
        triggerType: trigger.type,
        triggerData: trigger.data,
        confidence,
        confidenceFactors,
        thresholdsUsed: thresholds,
        wasPersonalized,
        userMessage: message,
        preventionTip,
        expiresAt,
      })
      .returning({ id: predictionLogTable.id });

    console.log(`[PredictionLearning] Stored prediction ${stored.id} for user ${userId}`);

    // Schedule the check-in notification
    await scheduleCheckIn(userId, stored.id, prediction);

    return { success: true, predictionId: stored.id };
  } catch (error) {
    console.error('[PredictionLearning] Error storing prediction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store a prediction from the prediction engine
 * Called automatically when generating predictions
 */
export async function trackPredictionFromEngine(userId, risk, thresholds, triggerData) {
  if (!risk || risk.severity === 'low') return null;

  const predictedTime = calculatePredictedTime(risk);

  return storePrediction(userId, {
    type: mapRiskToPredictionType(risk.type),
    subtype: risk.type,
    outcome: risk.title,
    severity: risk.severity,
    predictedTime,
    windowMinutes: 60,
    trigger: {
      type: triggerData.type || 'meal',
      data: triggerData,
    },
    confidence: 0.7, // Will be refined based on history
    confidenceFactors: {
      hasPersonalData: thresholds.isPersonalized,
      riskSeverity: risk.severity,
    },
    thresholds,
    wasPersonalized: thresholds.isPersonalized || false,
    message: risk.description || risk.title,
    preventionTip: null, // Will be added from prevention tips
  });
}

// ============================================================================
// 2. SCHEDULE CHECK-INS
// ============================================================================

/**
 * Schedule a check-in notification for a prediction
 */
async function scheduleCheckIn(userId, predictionId, prediction) {
  try {
    const { predictedTime, outcome, severity } = prediction;

    // Schedule check-in 15 minutes after predicted time
    const scheduledFor = new Date(predictedTime.getTime() + 15 * 60 * 1000);
    const windowEnd = new Date(predictedTime.getTime() + 90 * 60 * 1000);

    // Generate friendly notification content
    const { title, body, emoji, buttons } = generateCheckInContent(prediction);

    await db.insert(pendingCheckInsTable).values({
      predictionId,
      userId,
      scheduledFor,
      windowEnd,
      title,
      body,
      emoji,
      actionButtons: buttons,
    });

    console.log(`[PredictionLearning] Scheduled check-in for ${scheduledFor.toISOString()}`);
    return { success: true };
  } catch (error) {
    console.error('[PredictionLearning] Error scheduling check-in:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate user-friendly check-in notification content
 * Covers all 4 wellness domains with empathetic messaging
 */
function generateCheckInContent(prediction) {
  const { type, outcome, severity, predictedTime, subtype } = prediction;

  const hour = new Date(predictedTime).getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const formattedTime = formatTime(predictedTime);

  const templates = {
    // === FOOD DOMAIN ===
    energy_crash: {
      title: 'How\'s your energy?',
      body: `Around ${formattedTime}, we thought you might feel a dip. How do you feel now?`,
      emoji: '⚡',
      buttons: [
        { label: '😴 Tired', value: 'tired' },
        { label: '😊 Fine', value: 'fine' },
        { label: '😐 Somewhat', value: 'somewhat' },
      ],
    },
    hunger: {
      title: 'How\'s your hunger?',
      body: 'It\'s been a while since you ate. Are you feeling the effects?',
      emoji: '🍽️',
      buttons: [
        { label: '😤 Hangry', value: 'tired' },
        { label: '👍 Managing', value: 'fine' },
        { label: '🤷 Unsure', value: 'unsure' },
      ],
    },
    sleep_impact: {
      title: 'How was your sleep?',
      body: 'That late meal might have affected your rest. How do you feel this morning?',
      emoji: '🌙',
      buttons: [
        { label: '😴 Sluggish', value: 'tired' },
        { label: '✨ Rested', value: 'fine' },
        { label: '😐 So-so', value: 'somewhat' },
      ],
    },
    digestion_issue: {
      title: 'How\'s your stomach?',
      body: 'That high-fiber meal might be settling. Any discomfort?',
      emoji: '🫃',
      buttons: [
        { label: '😣 Uncomfortable', value: 'tired' },
        { label: '👍 All good', value: 'fine' },
        { label: '🤏 A little', value: 'somewhat' },
      ],
    },

    // === HYDRATION DOMAIN ===
    dehydration: {
      title: 'Hydration check',
      body: 'Have you had enough water? Your energy might be affected.',
      emoji: '💧',
      buttons: [
        { label: '🥱 Feeling it', value: 'tired' },
        { label: '💪 Hydrated', value: 'fine' },
        { label: '🤷 Not sure', value: 'unsure' },
      ],
    },
    dehydration_headache: {
      title: 'How\'s your head?',
      body: 'Low water intake can cause headaches. Any pressure or fogginess?',
      emoji: '🤕',
      buttons: [
        { label: '😵 Headache', value: 'tired' },
        { label: '😊 Clear', value: 'fine' },
        { label: '🤔 Slightly', value: 'somewhat' },
      ],
    },
    hydration_energy: {
      title: 'Energy boost check',
      body: 'You\'ve been staying hydrated! Feeling the difference?',
      emoji: '✨',
      buttons: [
        { label: '⚡ Energized', value: 'fine' },
        { label: '😐 Same as usual', value: 'somewhat' },
        { label: '🤷 Not really', value: 'tired' },
      ],
    },

    // === MOOD DOMAIN ===
    mood_dip: {
      title: 'Quick mood check',
      body: 'We noticed something that might affect your mood. How are you feeling?',
      emoji: '💭',
      buttons: [
        { label: '😔 Low', value: 'tired' },
        { label: '😊 Good', value: 'fine' },
        { label: '😐 Okay', value: 'somewhat' },
      ],
    },
    mood_boost: {
      title: 'How\'s your mood?',
      body: 'Based on your patterns, you might be feeling good right now!',
      emoji: '🌟',
      buttons: [
        { label: '😊 Great!', value: 'fine' },
        { label: '😐 Neutral', value: 'somewhat' },
        { label: '😕 Not really', value: 'tired' },
      ],
    },
    stress_fatigue: {
      title: 'Stress check-in',
      body: 'High stress can be exhausting. How are you holding up?',
      emoji: '🧘',
      buttons: [
        { label: '😓 Drained', value: 'tired' },
        { label: '💪 Coping', value: 'fine' },
        { label: '😤 Stressed', value: 'somewhat' },
      ],
    },

    // === ACTIVITY DOMAIN ===
    activity_fatigue: {
      title: 'Post-workout check',
      body: 'After that activity, how\'s your body feeling?',
      emoji: '🏃',
      buttons: [
        { label: '😫 Exhausted', value: 'tired' },
        { label: '💪 Strong', value: 'fine' },
        { label: '🦵 Sore but good', value: 'somewhat' },
      ],
    },
    recovery_needed: {
      title: 'Recovery check',
      body: 'Your body might need rest after yesterday. How are your muscles?',
      emoji: '🛌',
      buttons: [
        { label: '😣 Very sore', value: 'tired' },
        { label: '✨ Recovered', value: 'fine' },
        { label: '🤏 A bit tight', value: 'somewhat' },
      ],
    },
    movement_reminder: {
      title: 'Movement check',
      body: 'You\'ve been sitting a while. Any stiffness or low energy?',
      emoji: '🪑',
      buttons: [
        { label: '😩 Stiff', value: 'tired' },
        { label: '👍 Fine', value: 'fine' },
        { label: '🚶 Just moved', value: 'fine' },
      ],
    },
    sleep_quality_impact: {
      title: 'Sleep quality check',
      body: 'That late workout might affect tonight\'s sleep. How are you feeling?',
      emoji: '😴',
      buttons: [
        { label: '🫨 Wired', value: 'tired' },
        { label: '😌 Relaxed', value: 'fine' },
        { label: '🤷 Too early to tell', value: 'unsure' },
      ],
    },
  };

  return templates[type] || templates.energy_crash;
}

/**
 * Process pending check-ins and send notifications
 * Called by a cron job or background worker
 */
export async function processPendingCheckIns() {
  try {
    const now = new Date();

    // Get check-ins that are due
    const pending = await db
      .select()
      .from(pendingCheckInsTable)
      .where(
        and(
          eq(pendingCheckInsTable.status, 'pending'),
          lte(pendingCheckInsTable.scheduledFor, now),
          gte(pendingCheckInsTable.windowEnd, now)
        )
      )
      .limit(50);

    console.log(`[PredictionLearning] Processing ${pending.length} pending check-ins`);

    for (const checkIn of pending) {
      await sendCheckInNotification(checkIn);
    }

    // Expire old check-ins
    await db
      .update(pendingCheckInsTable)
      .set({ status: 'expired' })
      .where(
        and(
          eq(pendingCheckInsTable.status, 'pending'),
          lte(pendingCheckInsTable.windowEnd, now)
        )
      );

    return { processed: pending.length };
  } catch (error) {
    console.error('[PredictionLearning] Error processing check-ins:', error);
    return { error: error.message };
  }
}

/**
 * Send a check-in notification via FCM
 */
async function sendCheckInNotification(checkIn) {
  try {
    const result = await sendUserFCMNotification(
      db,
      checkIn.userId,
      FCM_NOTIFICATION_TYPES.REAL_TIME_ALERT,
      {
        title: checkIn.title,
        body: checkIn.body,
        data: {
          type: 'prediction_check_in',
          predictionId: String(checkIn.predictionId),
          checkInId: String(checkIn.id),
          buttons: JSON.stringify(checkIn.actionButtons),
          screen: 'check_in',
        },
        channelId: 'predictions',
      }
    );

    // Update check-in status
    await db
      .update(pendingCheckInsTable)
      .set({
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : null,
        attemptCount: sql`${pendingCheckInsTable.attemptCount} + 1`,
        lastAttemptAt: new Date(),
        failureReason: result.error || null,
      })
      .where(eq(pendingCheckInsTable.id, checkIn.id));

    // Update prediction log
    if (result.success) {
      await db
        .update(predictionLogTable)
        .set({
          checkInSentAt: new Date(),
          checkInMethod: 'push',
        })
        .where(eq(predictionLogTable.id, checkIn.predictionId));
    }

    return result;
  } catch (error) {
    console.error('[PredictionLearning] Error sending check-in:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 3. COLLECT FEEDBACK
// ============================================================================

/**
 * Record user's response to a prediction check-in
 */
export async function recordPredictionOutcome(userId, predictionId, response) {
  try {
    const { value, method = 'quick_emoji', notes, contextFactors } = response;

    // Get the original prediction
    const [prediction] = await db
      .select()
      .from(predictionLogTable)
      .where(eq(predictionLogTable.id, predictionId));

    if (!prediction) {
      return { success: false, error: 'Prediction not found' };
    }

    // Map response to outcome
    const outcomeData = OUTCOME_MAPPING[value] || { outcome: value, intensity: null };
    const isAccurate = outcomeData.outcome === 'as_predicted';

    // Calculate accuracy score (0-1)
    const accuracyScore = isAccurate
      ? 0.8 + (outcomeData.intensity || 3) * 0.05
      : outcomeData.outcome === 'unsure'
        ? 0.5
        : 0.2;

    // Store the outcome
    const [outcome] = await db
      .insert(predictionOutcomesTable)
      .values({
        predictionId,
        userId,
        actualOutcome: outcomeData.outcome,
        outcomeIntensity: outcomeData.intensity,
        timingAccuracy: 'on_time', // Could be refined with actual timing
        actualTime: new Date(),
        userNotes: notes,
        contextFactors,
        feedbackMethod: method,
        predictionAccurate: isAccurate,
        accuracyScore,
      })
      .returning({ id: predictionOutcomesTable.id });

    // Update prediction log
    await db
      .update(predictionLogTable)
      .set({
        outcomeStatus: isAccurate ? 'confirmed' : 'denied',
      })
      .where(eq(predictionLogTable.id, predictionId));

    // Update pending check-in
    await db
      .update(pendingCheckInsTable)
      .set({
        status: 'responded',
        respondedAt: new Date(),
        responseValue: value,
      })
      .where(eq(pendingCheckInsTable.predictionId, predictionId));

    // Trigger learning
    await learnFromOutcome(userId, prediction, isAccurate);

    // Maybe create a story
    await maybeCreateStory(userId, prediction, isAccurate);

    console.log(`[PredictionLearning] Recorded outcome for prediction ${predictionId}: ${outcomeData.outcome}`);

    return {
      success: true,
      outcomeId: outcome.id,
      wasAccurate: isAccurate,
      message: isAccurate
        ? 'Thanks for confirming! This helps us learn your patterns.'
        : 'Got it! We\'ll adjust our predictions for you.',
    };
  } catch (error) {
    console.error('[PredictionLearning] Error recording outcome:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. LEARNING ENGINE
// ============================================================================

/**
 * Learn from a prediction outcome and adjust thresholds
 */
async function learnFromOutcome(userId, prediction, wasAccurate) {
  try {
    const thresholdType = mapPredictionToThresholdType(prediction.predictionSubtype);
    if (!thresholdType) return;

    // Get or create user threshold
    let [threshold] = await db
      .select()
      .from(userThresholdsTable)
      .where(
        and(
          eq(userThresholdsTable.userId, userId),
          eq(userThresholdsTable.thresholdType, thresholdType)
        )
      );

    const defaultThreshold = DEFAULT_THRESHOLDS[thresholdType];

    if (!threshold) {
      // Create new threshold from defaults
      [threshold] = await db
        .insert(userThresholdsTable)
        .values({
          userId,
          thresholdType,
          thresholdValue: defaultThreshold.value,
          thresholdUnit: defaultThreshold.unit,
          source: 'default',
          initialValue: defaultThreshold.value,
          predictionsMade: 1,
          predictionsCorrect: wasAccurate ? 1 : 0,
          accuracyRate: wasAccurate ? 1.0 : 0.0,
        })
        .returning();
    } else {
      // Update existing threshold
      const newPredictionsMade = threshold.predictionsMade + 1;
      const newPredictionsCorrect = threshold.predictionsCorrect + (wasAccurate ? 1 : 0);
      const newAccuracyRate = newPredictionsCorrect / newPredictionsMade;

      // Determine if we should adjust the threshold
      const shouldAdjust =
        newPredictionsMade >= threshold.minSamplesForAdjustment &&
        Math.abs(newAccuracyRate - 0.7) > 0.15; // Too far from 70% accuracy

      let newValue = parseFloat(threshold.thresholdValue);
      let adjustmentReason = null;

      if (shouldAdjust) {
        if (newAccuracyRate > 0.85) {
          // Too accurate = threshold might be too conservative
          // Make it more aggressive (lower for crash, higher for minimums)
          newValue = thresholdType.includes('fatigue') || thresholdType.includes('warning')
            ? newValue * 1.1 // Raise minimum thresholds
            : newValue * 0.9; // Lower crash thresholds
          adjustmentReason = `Accuracy ${Math.round(newAccuracyRate * 100)}% - making more aggressive`;
        } else if (newAccuracyRate < 0.55) {
          // Too inaccurate = threshold is wrong
          newValue = thresholdType.includes('fatigue') || thresholdType.includes('warning')
            ? newValue * 0.9 // Lower minimum thresholds
            : newValue * 1.1; // Raise crash thresholds
          adjustmentReason = `Accuracy ${Math.round(newAccuracyRate * 100)}% - making more conservative`;
        }
      }

      // Update threshold
      await db
        .update(userThresholdsTable)
        .set({
          thresholdValue: newValue.toFixed(2),
          predictionsMade: newPredictionsMade,
          predictionsCorrect: newPredictionsCorrect,
          accuracyRate: newAccuracyRate.toFixed(2),
          adjustmentCount: adjustmentReason ? threshold.adjustmentCount + 1 : threshold.adjustmentCount,
          lastAdjustmentAt: adjustmentReason ? new Date() : threshold.lastAdjustmentAt,
          adjustmentReason: adjustmentReason || threshold.adjustmentReason,
          confidenceLevel: getConfidenceLevel(newPredictionsMade, newAccuracyRate),
          source: 'personal_learning',
          updatedAt: new Date(),
        })
        .where(eq(userThresholdsTable.id, threshold.id));

      if (adjustmentReason) {
        console.log(`[PredictionLearning] Adjusted ${thresholdType} for user ${userId}: ${adjustmentReason}`);
      }
    }
  } catch (error) {
    console.error('[PredictionLearning] Error learning from outcome:', error);
  }
}

/**
 * Get user's personalized thresholds
 */
export async function getUserThresholds(userId) {
  try {
    const thresholds = await db
      .select()
      .from(userThresholdsTable)
      .where(eq(userThresholdsTable.userId, userId));

    // Build threshold map with defaults for missing types
    const thresholdMap = {};

    for (const [type, defaults] of Object.entries(DEFAULT_THRESHOLDS)) {
      const userThreshold = thresholds.find((t) => t.thresholdType === type);

      thresholdMap[type] = {
        value: userThreshold ? parseFloat(userThreshold.thresholdValue) : defaults.value,
        unit: userThreshold?.thresholdUnit || defaults.unit,
        source: userThreshold?.source || 'default',
        confidence: userThreshold?.confidenceLevel || 'low',
        accuracy: userThreshold ? parseFloat(userThreshold.accuracyRate) : null,
        predictionCount: userThreshold?.predictionsMade || 0,
      };
    }

    return {
      isPersonalized: thresholds.length > 0,
      thresholds: thresholdMap,
    };
  } catch (error) {
    console.error('[PredictionLearning] Error getting thresholds:', error);
    return { isPersonalized: false, thresholds: DEFAULT_THRESHOLDS };
  }
}

// ============================================================================
// 5. STORY GENERATION
// ============================================================================

/**
 * Maybe create a "Remember when" story based on prediction outcome
 */
async function maybeCreateStory(userId, prediction, wasAccurate) {
  try {
    // Check if we have enough similar predictions to make a story
    const recentSimilar = await db
      .select()
      .from(predictionLogTable)
      .where(
        and(
          eq(predictionLogTable.userId, userId),
          eq(predictionLogTable.predictionType, prediction.predictionType),
          eq(predictionLogTable.outcomeStatus, wasAccurate ? 'confirmed' : 'denied')
        )
      )
      .orderBy(desc(predictionLogTable.createdAt))
      .limit(5);

    // Need at least 3 similar outcomes to make a story
    if (recentSimilar.length < 3) return;

    // Check if we already have a recent story of this type
    const [existingStory] = await db
      .select()
      .from(predictionStoriesTable)
      .where(
        and(
          eq(predictionStoriesTable.userId, userId),
          eq(predictionStoriesTable.storyType, wasAccurate ? 'pattern_discovered' : 'learning'),
          gte(predictionStoriesTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        )
      )
      .limit(1);

    if (existingStory) return; // Don't spam stories

    // Generate story
    const story = generateStory(prediction, recentSimilar, wasAccurate);

    await db.insert(predictionStoriesTable).values({
      userId,
      storyType: story.type,
      storyTitle: story.title,
      storyBody: story.body,
      storyEmoji: story.emoji,
      relatedPredictionIds: recentSimilar.map((p) => p.id),
      relatedDates: recentSimilar.map((p) => p.createdAt.toISOString().split('T')[0]),
      patternData: {
        predictionType: prediction.predictionType,
        subtype: prediction.predictionSubtype,
        occurrences: recentSimilar.length,
        wasAccurate,
      },
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
    });

    console.log(`[PredictionLearning] Created story for user ${userId}: ${story.title}`);
  } catch (error) {
    console.error('[PredictionLearning] Error creating story:', error);
  }
}

/**
 * Generate a user-friendly story based on wellness domain
 */
function generateStory(prediction, similarPredictions, wasAccurate) {
  const count = similarPredictions.length;
  const triggerData = prediction.triggerData || {};
  const domain = getPredictionDomain(prediction.predictionType);
  const domainEmoji = getDomainEmoji(domain);

  // Domain-specific story templates
  const storyTemplates = {
    food: {
      accurate: {
        type: 'pattern_discovered',
        emoji: '🍎',
        title: `Your body's food rhythm`,
        body: `${count} times now, ${getPatternDescription(prediction)} has affected your energy. ` +
          `We're learning exactly how your body responds to different foods.`,
      },
      inaccurate: {
        type: 'learning',
        emoji: '💪',
        title: `You handled that well!`,
        body: `We thought ${getPatternDescription(prediction)} might slow you down, but you felt great! ` +
          `Your body handles this better than average. Predictions updated.`,
      },
    },
    hydration: {
      accurate: {
        type: 'pattern_discovered',
        emoji: '💧',
        title: `Hydration insight unlocked`,
        body: `We've confirmed: ${getPatternDescription(prediction)} affects how you feel. ` +
          `${count} check-ins helped us understand your hydration needs.`,
      },
      inaccurate: {
        type: 'learning',
        emoji: '🌊',
        title: `Interesting!`,
        body: `Even with ${getPatternDescription(prediction)}, you stayed sharp! ` +
          `Your hydration tolerance is different than expected. Adjusting...`,
      },
    },
    mood: {
      accurate: {
        type: 'pattern_discovered',
        emoji: '💭',
        title: `Mood pattern discovered`,
        body: `We've noticed ${getPatternDescription(prediction)} tends to shift your mood. ` +
          `Knowing this helps us give you better heads-up.`,
      },
      inaccurate: {
        type: 'learning',
        emoji: '🌈',
        title: `Resilience noted!`,
        body: `${getPatternDescription(prediction)} didn't affect your mood like we expected. ` +
          `You're more resilient than our models predicted!`,
      },
    },
    activity: {
      accurate: {
        type: 'pattern_discovered',
        emoji: '🏃',
        title: `Activity pattern found`,
        body: `Your body responds consistently to ${getPatternDescription(prediction)}. ` +
          `We'll use this to help optimize your recovery and energy.`,
      },
      inaccurate: {
        type: 'learning',
        emoji: '⚡',
        title: `Great recovery!`,
        body: `After ${getPatternDescription(prediction)}, you bounced back faster than expected! ` +
          `Your fitness level is impressive. Updating your activity profile.`,
      },
    },
  };

  const template = storyTemplates[domain] || storyTemplates.food;
  return wasAccurate ? template.accurate : template.inaccurate;
}

/**
 * Generate cross-domain insight stories
 * These show connections between different wellness areas
 */
function generateCrossDomainStory(userId, insights) {
  const { foodMoodCorrelation, hydrationEnergyCorrelation, activitySleepCorrelation } = insights;

  if (foodMoodCorrelation && foodMoodCorrelation.strength > 0.7) {
    return {
      type: 'cross_domain_insight',
      emoji: '🔗',
      title: 'Food-Mood Connection',
      body: `We've noticed ${foodMoodCorrelation.food} tends to ${foodMoodCorrelation.effect} your mood about ${foodMoodCorrelation.delay} later. ` +
        `This is unique to you!`,
      domains: ['food', 'mood'],
    };
  }

  if (hydrationEnergyCorrelation && hydrationEnergyCorrelation.strength > 0.7) {
    return {
      type: 'cross_domain_insight',
      emoji: '⚡',
      title: 'Hydration-Energy Link',
      body: `When you hit ${hydrationEnergyCorrelation.threshold}% hydration, your energy tends to ${hydrationEnergyCorrelation.effect}. ` +
        `We'll remind you before you dip.`,
      domains: ['hydration', 'food'],
    };
  }

  if (activitySleepCorrelation && activitySleepCorrelation.strength > 0.7) {
    return {
      type: 'cross_domain_insight',
      emoji: '😴',
      title: 'Activity-Sleep Connection',
      body: `${activitySleepCorrelation.activity} in the ${activitySleepCorrelation.timeOfDay} affects your sleep quality. ` +
        `We've adjusted your activity recommendations.`,
      domains: ['activity', 'mood'],
    };
  }

  return null;
}

/**
 * Get pending stories to show user
 */
export async function getPendingStories(userId) {
  try {
    const stories = await db
      .select()
      .from(predictionStoriesTable)
      .where(
        and(
          eq(predictionStoriesTable.userId, userId),
          eq(predictionStoriesTable.userAcknowledged, false),
          gte(predictionStoriesTable.expiresAt, new Date())
        )
      )
      .orderBy(desc(predictionStoriesTable.relevanceScore))
      .limit(3);

    return stories;
  } catch (error) {
    console.error('[PredictionLearning] Error getting stories:', error);
    return [];
  }
}

/**
 * Mark story as acknowledged
 */
export async function acknowledgeStory(userId, storyId, reaction) {
  try {
    await db
      .update(predictionStoriesTable)
      .set({
        userAcknowledged: true,
        userReaction: reaction,
        shownCount: sql`${predictionStoriesTable.shownCount} + 1`,
        lastShownAt: new Date(),
      })
      .where(
        and(
          eq(predictionStoriesTable.id, storyId),
          eq(predictionStoriesTable.userId, userId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('[PredictionLearning] Error acknowledging story:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculatePredictedTime(risk) {
  const now = new Date();
  const timeWindow = risk.timeWindow || '2-3pm';

  // Parse time window like "2-3pm" or "3pm"
  const match = timeWindow.match(/(\d+)(?:-(\d+))?(?:am|pm)?/i);
  if (match) {
    let hour = parseInt(match[1]);
    if (timeWindow.toLowerCase().includes('pm') && hour < 12) hour += 12;

    const predicted = new Date(now);
    predicted.setHours(hour, 30, 0, 0);

    // If predicted time is in the past, assume tomorrow
    if (predicted < now) {
      predicted.setDate(predicted.getDate() + 1);
    }

    return predicted;
  }

  // Default: 2 hours from now
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

function mapRiskToPredictionType(riskType) {
  const mapping = {
    // Food domain
    energy_crash: PREDICTION_TYPES.ENERGY_CRASH,
    low_protein: PREDICTION_TYPES.ENERGY_CRASH,
    sugar_crash: PREDICTION_TYPES.ENERGY_CRASH,
    skipped_breakfast: PREDICTION_TYPES.HUNGER,
    late_meal: PREDICTION_TYPES.SLEEP_IMPACT,
    high_fiber: PREDICTION_TYPES.DIGESTION_ISSUE,
    meal_gap: PREDICTION_TYPES.HUNGER,

    // Hydration domain
    dehydration: PREDICTION_TYPES.DEHYDRATION,
    low_hydration: PREDICTION_TYPES.DEHYDRATION,
    caffeine_high: PREDICTION_TYPES.DEHYDRATION_HEADACHE,
    water_gap: PREDICTION_TYPES.DEHYDRATION,
    good_hydration: PREDICTION_TYPES.HYDRATION_ENERGY,

    // Mood domain
    mood_dip: PREDICTION_TYPES.MOOD_DIP,
    low_mood: PREDICTION_TYPES.MOOD_DIP,
    mood_pattern: PREDICTION_TYPES.MOOD_DIP,
    stress_high: PREDICTION_TYPES.STRESS_FATIGUE,
    sleep_mood: PREDICTION_TYPES.MOOD_DIP,
    positive_mood: PREDICTION_TYPES.MOOD_BOOST,

    // Activity domain
    post_workout: PREDICTION_TYPES.ACTIVITY_FATIGUE,
    intense_activity: PREDICTION_TYPES.RECOVERY_NEEDED,
    sedentary: PREDICTION_TYPES.MOVEMENT_REMINDER,
    late_workout: PREDICTION_TYPES.SLEEP_QUALITY_IMPACT,
    recovery_day: PREDICTION_TYPES.RECOVERY_NEEDED,
  };
  return mapping[riskType] || PREDICTION_TYPES.ENERGY_CRASH;
}

function mapPredictionToThresholdType(subtype) {
  const mapping = {
    // Food thresholds
    sugar_crash: 'sugar_crash',
    low_protein: 'protein_fatigue',
    late_meal: 'late_meal',
    high_carb: 'carb_crash',
    meal_gap: 'meal_gap',
    calorie_low: 'calorie_deficit',
    high_fiber: 'fiber_bloat',

    // Hydration thresholds
    dehydration: 'hydration_warning',
    low_hydration: 'hydration_warning',
    critical_hydration: 'hydration_critical',
    water_gap: 'water_gap',
    caffeine_high: 'caffeine_dehydration',
    morning_water: 'morning_hydration',
    good_hydration: 'hydration_energy_boost',

    // Mood thresholds
    mood_food: 'mood_food_delay',
    mood_sugar: 'mood_sugar_crash',
    sleep_deficit: 'mood_sleep_deficit',
    consecutive_low: 'mood_consecutive_low',
    stress_high: 'stress_fatigue',
    mood_recovery: 'mood_recovery_time',

    // Activity thresholds
    recovery_needed: 'activity_recovery',
    sedentary: 'activity_sedentary',
    late_workout: 'activity_sleep_cutoff',
    energy_activity: 'activity_energy_requirement',
    activity_water: 'activity_hydration_need',
    steps_low: 'steps_energy_correlation',
  };
  return mapping[subtype] || null;
}

function getConfidenceLevel(predictionCount, accuracyRate) {
  if (predictionCount >= 20 && accuracyRate >= 0.75) return 'validated';
  if (predictionCount >= 10 && accuracyRate >= 0.7) return 'high';
  if (predictionCount >= 5) return 'medium';
  return 'low';
}

function getPatternDescription(prediction) {
  const subtype = prediction.predictionSubtype || prediction.predictionType;
  const descriptions = {
    // Food patterns
    sugar_crash: 'high sugar intake',
    low_protein: 'low protein meals',
    late_meal: 'eating late at night',
    high_carb: 'high carb meals without protein',
    skipped_breakfast: 'skipping breakfast',
    calorie_low: 'eating fewer calories than usual',
    high_fiber: 'high fiber meals',

    // Hydration patterns
    dehydration: 'low hydration levels',
    low_hydration: 'not drinking enough water',
    water_gap: 'long gaps without water',
    caffeine_high: 'high caffeine intake',
    morning_water: 'morning water habits',
    good_hydration: 'staying well hydrated',

    // Mood patterns
    mood_dip: 'mood fluctuations',
    low_mood: 'lower mood periods',
    stress_high: 'high stress levels',
    sleep_mood: 'sleep affecting mood',
    positive_mood: 'positive mood triggers',

    // Activity patterns
    post_workout: 'intense workouts',
    intense_activity: 'high activity days',
    sedentary: 'long sitting periods',
    late_workout: 'exercising late in the day',
    recovery_day: 'recovery after exercise',
    steps_low: 'lower step counts',
  };
  return descriptions[subtype] || 'this pattern';
}

/**
 * Get the domain emoji for display
 */
function getDomainEmoji(domain) {
  const emojis = {
    food: '🍎',
    hydration: '💧',
    mood: '😊',
    activity: '🏃',
  };
  return emojis[domain] || '📊';
}

/**
 * Get prediction domain
 */
function getPredictionDomain(predictionType) {
  return PREDICTION_DOMAIN_MAP[predictionType] || WELLNESS_DOMAINS.FOOD;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  storePrediction,
  trackPredictionFromEngine,
  processPendingCheckIns,
  recordPredictionOutcome,
  getUserThresholds,
  getPendingStories,
  acknowledgeStory,
  PREDICTION_TYPES,
  DEFAULT_THRESHOLDS,
  WELLNESS_DOMAINS,
  PREDICTION_DOMAIN_MAP,
};
