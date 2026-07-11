/**
 * Predictions API Routes
 *
 * Proactive wellness predictions:
 * - Morning prediction: How will today go based on patterns
 * - Meal feeling: How will this food make me feel
 *
 * Key differentiator: PREDICT before it happens
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  generateMorningPrediction,
  generateTimeAwarePrediction,
  predictMealFeeling,
} from '../services/predictionEngineService.js';
import {
  recordPredictionOutcome,
  getUserThresholds,
  getPendingStories,
  acknowledgeStory,
  processPendingCheckIns,
  WELLNESS_DOMAINS,
} from '../services/predictionLearningService.js';

const router = express.Router();

/**
 * GET /api/predictions/morning
 * Get morning prediction for the day ahead
 *
 * Returns:
 * - energyScore: 0-100 predicted energy
 * - risks: identified risks for the day
 * - preventionTips: actionable tips
 * - context: data used for prediction
 */
router.get('/morning', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await generateMorningPrediction(userId);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate prediction',
      });
    }

    return res.json(result.prediction);
  } catch (error) {
    console.error('[Predictions] Morning prediction error:', error);
    return res.status(500).json({
      error: 'Failed to generate morning prediction',
      details: error.message,
    });
  }
});

/**
 * GET /api/predictions/now
 * Get time-aware prediction (adapts to current time of day)
 *
 * Time periods:
 * - Morning (5am-11am): Day forecast, breakfast impact
 * - Midday (11am-2pm): Lunch guidance, hydration check
 * - Afternoon (2pm-5pm): Energy crash prevention
 * - Evening (5pm-9pm): Dinner impact on sleep
 * - Night (9pm-5am): Tomorrow prep
 *
 * Returns same structure as /morning plus:
 * - timePeriod: current time period
 * - greeting: time-appropriate greeting
 * - forecastTitle: time-appropriate title
 * - focusArea: time-specific priority focus
 * - nextMilestone: next goal to achieve
 */
router.get('/now', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await generateTimeAwarePrediction(userId);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate prediction',
      });
    }

    return res.json(result.prediction);
  } catch (error) {
    console.error('[Predictions] Time-aware prediction error:', error);
    return res.status(500).json({
      error: 'Failed to generate prediction',
      details: error.message,
    });
  }
});

/**
 * POST /api/predictions/meal-feeling
 * Predict how a meal will make the user feel
 *
 * Body:
 * - calories: number
 * - protein: number
 * - carbs: number
 * - sugar: number (optional)
 * - fiber: number (optional)
 * - novaScore: 1-4 (optional)
 * - mealType: breakfast|lunch|dinner|snack (optional)
 *
 * Returns:
 * - impactScore: -100 to +100
 * - timeline: feeling predictions over time
 * - insights: key observations
 * - characteristics: meal profile
 */
router.post('/meal-feeling', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const mealData = req.body;

    // Basic validation
    if (!mealData || typeof mealData !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Please provide meal nutrition data',
      });
    }

    const result = await predictMealFeeling(userId, mealData);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to predict meal feeling',
      });
    }

    return res.json(result.feeling);
  } catch (error) {
    console.error('[Predictions] Meal feeling prediction error:', error);
    return res.status(500).json({
      error: 'Failed to predict meal feeling',
      details: error.message,
    });
  }
});

/**
 * GET /api/predictions/realtime
 * Get real-time intervention suggestions based on current state
 *
 * Query params:
 * - lastMealHours: hours since last meal (optional)
 * - hydrationPercent: current hydration percentage (optional)
 *
 * Returns intervention suggestions if needed
 */
router.get('/realtime', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { lastMealHours, hydrationPercent } = req.query;
    const interventions = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Check if user needs food
    const hoursSinceLastMeal = parseFloat(lastMealHours) || 0;
    if (hoursSinceLastMeal > 5 && currentHour >= 10 && currentHour <= 20) {
      interventions.push({
        type: 'food',
        priority: 'high',
        title: 'Time to eat',
        message: `You haven't eaten in ${Math.round(hoursSinceLastMeal)} hours. Energy crash likely soon.`,
        action: 'Log a meal',
        icon: 'restaurant-outline',
      });
    }

    // Check hydration
    const hydration = parseFloat(hydrationPercent) || 0;
    if (hydration < 40 && currentHour >= 12) {
      interventions.push({
        type: 'water',
        priority: hoursSinceLastMeal > 4 ? 'high' : 'medium',
        title: 'Stay hydrated',
        message: `You're at ${Math.round(hydration)}% of your water goal. Dehydration affects energy and focus.`,
        action: 'Drink water',
        icon: 'water-outline',
      });
    }

    // Afternoon energy tip (2-4pm)
    if (currentHour >= 14 && currentHour <= 16) {
      interventions.push({
        type: 'activity',
        priority: 'low',
        title: 'Afternoon boost',
        message: 'A short walk can boost your afternoon energy naturally.',
        action: 'Take a 5-min break',
        icon: 'walk-outline',
      });
    }

    return res.json({
      interventions,
      timestamp: now.toISOString(),
      hasUrgent: interventions.some(i => i.priority === 'high'),
    });
  } catch (error) {
    console.error('[Predictions] Realtime intervention error:', error);
    return res.status(500).json({
      error: 'Failed to get realtime interventions',
      details: error.message,
    });
  }
});

// ============================================================================
// PREDICTION LEARNING ENDPOINTS
// Closed-loop system: Predictions â†’ Check-ins â†’ Feedback â†’ Learning
// ============================================================================

/**
 * GET /api/predictions/pending-check-ins
 * Get pending check-ins for the current user (not yet responded)
 *
 * Used by the mobile app to show in-app banners for check-ins
 * that weren't responded to via push notification.
 *
 * Returns array of pending check-ins with their prediction details.
 */
router.get('/pending-check-ins', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Import required table
    const { db } = await import('../db/index.js');
    const { pendingCheckInsTable, predictionLogTable } = await import('../db/schema.js');
    const { eq, and, gte } = await import('drizzle-orm');

    const now = new Date();

    // Get pending check-ins that are still within their window
    const pending = await db
      .select({
        id: pendingCheckInsTable.id,
        predictionId: pendingCheckInsTable.predictionId,
        title: pendingCheckInsTable.title,
        body: pendingCheckInsTable.body,
        emoji: pendingCheckInsTable.emoji,
        buttons: pendingCheckInsTable.actionButtons,
        scheduledFor: pendingCheckInsTable.scheduledFor,
        predictionType: predictionLogTable.predictionType,
      })
      .from(pendingCheckInsTable)
      .leftJoin(
        predictionLogTable,
        eq(pendingCheckInsTable.predictionId, predictionLogTable.id)
      )
      .where(
        and(
          eq(pendingCheckInsTable.userId, userId),
          eq(pendingCheckInsTable.status, 'sent'),
          gte(pendingCheckInsTable.windowEnd, now)
        )
      )
      .orderBy(pendingCheckInsTable.scheduledFor)
      .limit(5);

    // Map prediction type to domain
    const checkIns = pending.map((p) => ({
      ...p,
      domain: mapPredictionTypeToDomain(p.predictionType),
    }));

    return res.json({
      checkIns,
      count: checkIns.length,
      hasPending: checkIns.length > 0,
    });
  } catch (error) {
    console.error('[Predictions] Pending check-ins fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch pending check-ins',
      details: error.message,
    });
  }
});

// Helper to map prediction type to domain
function mapPredictionTypeToDomain(predictionType) {
  const mapping = {
    energy_crash: 'food',
    hunger: 'food',
    sleep_impact: 'food',
    digestion_issue: 'food',
    dehydration: 'hydration',
    dehydration_headache: 'hydration',
    hydration_energy: 'hydration',
    mood_dip: 'mood',
    mood_boost: 'mood',
    stress_fatigue: 'mood',
    activity_fatigue: 'activity',
    recovery_needed: 'activity',
    movement_reminder: 'activity',
    sleep_quality_impact: 'activity',
  };
  return mapping[predictionType] || 'food';
}

/**
 * POST /api/predictions/outcome
 * Record user's feedback on a prediction check-in
 *
 * Body:
 * - predictionId: number (required)
 * - value: string (required) - 'tired', 'fine', 'somewhat', 'unsure', or emoji
 * - method: string (optional) - 'quick_emoji', 'detailed_form', 'notification'
 * - notes: string (optional) - User's additional context
 * - contextFactors: object (optional) - { hadSnack, exercised, stressed, etc. }
 *
 * Returns:
 * - success: boolean
 * - wasAccurate: boolean - Did we predict correctly?
 * - message: string - Friendly feedback message
 * - thresholdAdjusted: boolean - Did we learn from this?
 */
router.post('/outcome', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { predictionId, value, method, notes, contextFactors } = req.body;

    if (!predictionId || !value) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'predictionId and value are required',
      });
    }

    const result = await recordPredictionOutcome(userId, predictionId, {
      value,
      method: method || 'quick_emoji',
      notes,
      contextFactors,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to record outcome',
      });
    }

    return res.json({
      success: true,
      wasAccurate: result.wasAccurate,
      message: result.message,
      outcomeId: result.outcomeId,
    });
  } catch (error) {
    console.error('[Predictions] Outcome recording error:', error);
    return res.status(500).json({
      error: 'Failed to record prediction outcome',
      details: error.message,
    });
  }
});

/**
 * GET /api/predictions/thresholds
 * Get user's personalized thresholds
 *
 * Returns thresholds by domain:
 * - food: sugar_crash, protein_fatigue, late_meal, etc.
 * - hydration: hydration_warning, water_gap, etc.
 * - mood: mood_food_delay, stress_fatigue, etc.
 * - activity: activity_recovery, activity_sedentary, etc.
 *
 * Each threshold includes:
 * - value: the threshold value
 * - unit: grams, hours, percent, etc.
 * - source: 'default', 'population_average', 'personal_learning'
 * - confidence: 'low', 'medium', 'high', 'validated'
 * - accuracy: prediction accuracy for this threshold
 */
router.get('/thresholds', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await getUserThresholds(userId);

    // Group thresholds by domain for frontend convenience
    const groupedThresholds = {
      food: {},
      hydration: {},
      mood: {},
      activity: {},
    };

    for (const [key, threshold] of Object.entries(result.thresholds)) {
      const domain = threshold.domain || 'food';
      if (groupedThresholds[domain]) {
        groupedThresholds[domain][key] = threshold;
      }
    }

    return res.json({
      isPersonalized: result.isPersonalized,
      thresholds: result.thresholds,
      byDomain: groupedThresholds,
      domains: Object.keys(WELLNESS_DOMAINS).map(k => WELLNESS_DOMAINS[k]),
    });
  } catch (error) {
    console.error('[Predictions] Thresholds fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch thresholds',
      details: error.message,
    });
  }
});

/**
 * GET /api/predictions/stories
 * Get pending "Remember when" stories for the user
 *
 * Stories help users understand their patterns through narratives:
 * - pattern_discovered: "We've noticed a pattern..."
 * - learning: "We learned something about you..."
 * - milestone: "You've logged for 7 days!"
 * - cross_domain_insight: "Your food affects your mood..."
 *
 * Returns array of stories with:
 * - id, type, emoji, title, body
 * - relatedDates: when the pattern occurred
 * - domains: which wellness areas are involved
 */
router.get('/stories', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stories = await getPendingStories(userId);

    return res.json({
      stories,
      hasStories: stories.length > 0,
      count: stories.length,
    });
  } catch (error) {
    console.error('[Predictions] Stories fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch stories',
      details: error.message,
    });
  }
});

/**
 * POST /api/predictions/stories/:storyId/acknowledge
 * Mark a story as acknowledged by the user
 *
 * Body:
 * - reaction: string - 'helpful', 'already_knew', 'surprising', 'dismissed'
 *
 * This helps us learn which stories resonate
 */
router.post('/stories/:storyId/acknowledge', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { storyId } = req.params;
    const { reaction } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!storyId) {
      return res.status(400).json({
        error: 'Missing storyId parameter',
      });
    }

    const result = await acknowledgeStory(userId, parseInt(storyId), reaction || 'acknowledged');

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to acknowledge story',
      });
    }

    return res.json({
      success: true,
      message: 'Story acknowledged',
    });
  } catch (error) {
    console.error('[Predictions] Story acknowledge error:', error);
    return res.status(500).json({
      error: 'Failed to acknowledge story',
      details: error.message,
    });
  }
});

/**
 * POST /api/predictions/process-check-ins
 * Process pending check-in notifications (cron job endpoint)
 *
 * This should be called by a cron job every 5 minutes.
 * Sends push notifications for predictions that are due for check-in.
 *
 * Security: This endpoint should be protected by an admin key or cron secret
 */
router.post('/process-check-ins', async (req, res) => {
  try {
    // Simple API key check for cron jobs
    const cronSecret = req.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized cron access' });
    }

    const result = await processPendingCheckIns();

    return res.json({
      success: true,
      processed: result.processed || 0,
      message: `Processed ${result.processed || 0} check-ins`,
    });
  } catch (error) {
    console.error('[Predictions] Check-in processing error:', error);
    return res.status(500).json({
      error: 'Failed to process check-ins',
      details: error.message,
    });
  }
});

export default router;
