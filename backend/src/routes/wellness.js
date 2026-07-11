/**
 * Wellness Intelligence API Routes
 *
 * Exposes the Unified Intelligence Service to the mobile app
 * Provides holistic wellness insights, scores, and personalized narratives
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUnifiedIntelligence, formatIntelligenceForPrompt } from '../services/unifiedIntelligenceService.js';

const router = express.Router();

/**
 * GET /api/wellness/intelligence
 *
 * Returns comprehensive wellness intelligence for the authenticated user
 * Includes: wellness score, recovery score, current state flags, insights,
 * cross-domain correlations, and contextual guidance
 */
router.get('/intelligence', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { lookbackDays = 7 } = req.query;

    const intelligence = await getUnifiedIntelligence(userId, {
      lookbackDays: parseInt(lookbackDays)
    });

    // Generate personalized narrative based on intelligence
    const narrative = generateWellnessNarrative(intelligence);

    res.json({
      success: true,
      ...intelligence,
      narrative,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wellness] Intelligence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wellness intelligence'
    });
  }
});

/**
 * GET /api/wellness/summary
 *
 * Returns a lightweight wellness summary for dashboard display
 * Optimized for quick loading and minimal data transfer
 */
router.get('/summary', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;

    const intelligence = await getUnifiedIntelligence(userId, { lookbackDays: 7 });

    // Extract only essential summary data
    const summary = {
      scores: {
        wellness: intelligence.wellnessScore,
        recovery: intelligence.recoveryScore
      },
      primaryConcern: intelligence.currentState.primaryConcern,
      needsAttention: intelligence.currentState.needsSpecialAttention,
      topFlag: intelligence.currentState.flags[0] || null,
      quickInsight: generateQuickInsight(intelligence),
      dataCompleteness: calculateDataCompleteness(intelligence.meta.dataPoints)
    };

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wellness] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wellness summary'
    });
  }
});

/**
 * GET /api/wellness/narrative
 *
 * Returns personalized wellness narratives and stories
 * For use in insight screens and weekly reviews
 */
router.get('/narrative', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { type = 'daily' } = req.query; // daily, weekly, insight

    const intelligence = await getUnifiedIntelligence(userId, {
      lookbackDays: type === 'weekly' ? 14 : 7
    });

    const narrative = generateDetailedNarrative(intelligence, type);

    res.json({
      success: true,
      narrative,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wellness] Narrative error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate wellness narrative'
    });
  }
});

// ==================== Narrative Generation Functions ====================

/**
 * Generate a concise wellness narrative for the intelligence response
 */
function generateWellnessNarrative(intelligence) {
  const { wellnessScore, recoveryScore, currentState, insights, correlations } = intelligence;

  const parts = [];

  // Opening based on overall state
  if (wellnessScore >= 70) {
    parts.push(`You're having a great wellness day! Your score is ${wellnessScore}/100.`);
  } else if (wellnessScore >= 50) {
    parts.push(`Your wellness is balanced today at ${wellnessScore}/100.`);
  } else {
    parts.push(`Your body could use some attention today. Wellness score: ${wellnessScore}/100.`);
  }

  // Recovery context
  if (recoveryScore < 50) {
    parts.push(`Your recovery is low (${recoveryScore}/100) - take it easy and prioritize rest.`);
  } else if (recoveryScore >= 70) {
    parts.push(`Recovery is strong at ${recoveryScore}/100 - you're ready for activity!`);
  }

  // Primary concern narrative
  if (currentState.primaryConcern !== 'NONE' && currentState.primaryConcern !== 'NEW_USER') {
    const concernNarratives = {
      LOW_RECOVERY: "Your body is asking for gentler nutrition today.",
      DEHYDRATED: "Hydration is your priority - water-rich foods will help.",
      HIGH_STRESS: "Stress is elevated - magnesium-rich foods can help you feel calmer.",
      POST_WORKOUT: "You're in the recovery window - protein and carbs will maximize your workout.",
      LOW_MOOD: "Your mood could use a boost - omega-3s and fermented foods may help.",
      LOW_ENERGY: "Energy is low - complex carbs and iron-rich foods for sustained power.",
      POOR_SLEEP: "Sleep quality was low - avoid caffeine and try tryptophan-rich foods tonight."
    };
    parts.push(concernNarratives[currentState.primaryConcern] || '');
  }

  // Correlation insight
  if (correlations.significant.length > 0) {
    const topCorrelation = correlations.significant[0];
    parts.push(`Pattern detected: ${topCorrelation.insight}`);
  }

  // Conflict resolution
  if (currentState.conflictResolution) {
    parts.push(`Note: ${currentState.conflictResolution.adjustedGuidance}`);
  }

  return {
    summary: parts.join(' '),
    headline: getHeadline(wellnessScore, currentState.primaryConcern),
    emoji: getWellnessEmoji(wellnessScore),
    actionableInsight: getActionableInsight(currentState, insights)
  };
}

/**
 * Generate a quick insight for dashboard summary
 */
function generateQuickInsight(intelligence) {
  const { currentState, insights, correlations } = intelligence;

  // Priority: Actionable state > Correlation > Generic encouragement
  if (currentState.needsSpecialAttention && currentState.flags[0]) {
    return {
      type: 'action',
      message: currentState.flags[0].foodImplication,
      priority: currentState.flags[0].severity
    };
  }

  if (correlations.significant.length > 0) {
    return {
      type: 'insight',
      message: correlations.significant[0].recommendation,
      priority: 'low'
    };
  }

  // Generic but personalized
  if (insights.mood.hasData && insights.mood.trend === 'improving') {
    return {
      type: 'celebration',
      message: 'Your mood is trending up! Keep doing what you\'re doing.',
      priority: 'low'
    };
  }

  return {
    type: 'encourage',
    message: 'Log your meals, mood, and water to unlock personalized insights.',
    priority: 'low'
  };
}

/**
 * Generate detailed narrative for insight screens
 */
function generateDetailedNarrative(intelligence, type) {
  const { wellnessScore, recoveryScore, currentState, insights, correlations } = intelligence;

  const narrative = {
    type,
    sections: []
  };

  // Section 1: State Overview
  narrative.sections.push({
    title: 'Your Wellness Today',
    icon: getWellnessEmoji(wellnessScore),
    content: generateStateOverview(wellnessScore, recoveryScore, currentState),
    priority: 'high'
  });

  // Section 2: Domain Breakdown
  if (type === 'daily' || type === 'weekly') {
    narrative.sections.push({
      title: 'What\'s Affecting You',
      icon: 'ðŸ“Š',
      content: generateDomainBreakdown(insights),
      priority: 'medium'
    });
  }

  // Section 3: Patterns & Correlations
  if (correlations.significant.length > 0) {
    narrative.sections.push({
      title: 'Patterns We\'ve Noticed',
      icon: 'ðŸ”',
      content: correlations.significant.map(c => ({
        insight: c.insight,
        recommendation: c.recommendation,
        type: c.type
      })),
      priority: 'medium'
    });
  }

  // Section 4: Actionable Guidance
  narrative.sections.push({
    title: 'What to Focus On',
    icon: 'ðŸŽ¯',
    content: generateActionableGuidance(currentState, insights),
    priority: 'high'
  });

  // Section 5: Celebration / Encouragement
  narrative.sections.push({
    title: getCelebrationTitle(intelligence),
    icon: 'âœ¨',
    content: generateCelebration(intelligence),
    priority: 'low'
  });

  return narrative;
}

// ==================== Helper Functions ====================

function getHeadline(wellnessScore, primaryConcern) {
  if (primaryConcern === 'NEW_USER') {
    return 'Start Your Wellness Journey';
  }

  const headlines = {
    LOW_RECOVERY: 'Recovery Day',
    DEHYDRATED: 'Hydration Focus',
    HIGH_STRESS: 'Stress Relief Mode',
    POST_WORKOUT: 'Recovery Window Open',
    LOW_MOOD: 'Mood Boost Day',
    LOW_ENERGY: 'Energy Recharge',
    POOR_SLEEP: 'Rest & Restore',
    OPTIMAL_STATE: 'Peak Performance Day',
    NONE: wellnessScore >= 70 ? 'Thriving' : wellnessScore >= 50 ? 'Balanced' : 'Needs Attention'
  };

  return headlines[primaryConcern] || headlines.NONE;
}

function getWellnessEmoji(score) {
  if (score >= 80) return 'ðŸŒŸ';
  if (score >= 70) return 'ðŸ’š';
  if (score >= 60) return 'ðŸ’›';
  if (score >= 50) return 'ðŸ§¡';
  if (score >= 40) return 'â¤ï¸';
  return 'â¤ï¸â€ðŸ©¹';
}

function getActionableInsight(currentState, insights) {
  if (currentState.flags.length === 0) {
    return 'Keep up your healthy habits!';
  }

  const flag = currentState.flags[0];
  return flag.foodImplication;
}

function calculateDataCompleteness(dataPoints) {
  const total = Object.values(dataPoints).reduce((sum, val) => sum + val, 0);
  const domains = Object.keys(dataPoints).length;

  // Consider "complete" as having at least 3 data points per domain
  const expectedMinimum = domains * 3;
  const completeness = Math.min(100, Math.round((total / expectedMinimum) * 100));

  return {
    percentage: completeness,
    label: completeness >= 80 ? 'Rich data' : completeness >= 50 ? 'Good data' : 'Building data',
    suggestion: completeness < 50 ? 'Log more to unlock personalized insights' : null
  };
}

function generateStateOverview(wellnessScore, recoveryScore, currentState) {
  return {
    wellness: {
      score: wellnessScore,
      label: wellnessScore >= 70 ? 'Excellent' : wellnessScore >= 50 ? 'Good' : 'Needs attention'
    },
    recovery: {
      score: recoveryScore,
      label: recoveryScore >= 70 ? 'Ready for activity' : recoveryScore >= 50 ? 'Moderate' : 'Rest recommended'
    },
    flags: currentState.flags.slice(0, 3).map(f => ({
      name: f.flag,
      severity: f.severity,
      action: f.foodImplication
    }))
  };
}

function generateDomainBreakdown(insights) {
  const domains = [];

  if (insights.mood.hasData) {
    domains.push({
      name: 'Mood',
      status: insights.mood.trend,
      value: insights.mood.avgMood,
      detail: `${insights.mood.currentMood} mood, ${insights.mood.currentEnergy} energy`
    });
  }

  if (insights.activity.hasData) {
    domains.push({
      name: 'Activity',
      status: insights.activity.todayLevel,
      value: insights.activity.todayCaloriesBurned,
      detail: insights.activity.inPostWorkoutWindow ? 'In recovery window' : `${insights.activity.todayLevel} activity today`
    });
  }

  if (insights.hydration.hasData) {
    domains.push({
      name: 'Hydration',
      status: insights.hydration.isDehydrated ? 'low' : 'good',
      value: insights.hydration.percentOfGoal,
      detail: `${insights.hydration.todayMl}ml (${insights.hydration.percentOfGoal}% of goal)`
    });
  }

  if (insights.sleep.hasData) {
    domains.push({
      name: 'Sleep',
      status: insights.sleep.isPoorSleep ? 'poor' : 'good',
      value: insights.sleep.avgQuality,
      detail: `${insights.sleep.lastNightHours}h, ${insights.sleep.lastNightQuality} quality`
    });
  }

  if (insights.stress.hasData) {
    domains.push({
      name: 'Stress',
      status: insights.stress.isHighStress ? 'elevated' : 'manageable',
      value: insights.stress.currentLevel,
      detail: insights.stress.nutritionNeed
    });
  }

  return domains;
}

function generateActionableGuidance(currentState, insights) {
  const guidance = [];

  currentState.flags.forEach(flag => {
    guidance.push({
      priority: flag.severity,
      action: flag.foodImplication,
      reason: flag.description
    });
  });

  // Add generic guidance if no flags
  if (guidance.length === 0) {
    guidance.push({
      priority: 'low',
      action: 'Maintain your balanced approach to nutrition and wellness.',
      reason: 'All systems are functioning well'
    });
  }

  return guidance;
}

function getCelebrationTitle(intelligence) {
  const { insights } = intelligence;

  if (insights.mood.hasData && insights.mood.trend === 'improving') {
    return 'Mood Win!';
  }
  if (insights.hydration.hasData && insights.hydration.isWellHydrated) {
    return 'Hydration Champion!';
  }
  if (insights.activity.hasData && insights.activity.todayLevel === 'high') {
    return 'Active Day!';
  }
  return 'Keep Going!';
}

function generateCelebration(intelligence) {
  const { insights, wellnessScore } = intelligence;
  const celebrations = [];

  if (wellnessScore >= 70) {
    celebrations.push('Your wellness score is excellent - you\'re taking great care of yourself!');
  }

  if (insights.mood.hasData && insights.mood.trend === 'improving') {
    celebrations.push('Your mood has been trending up. Whatever you\'re doing, it\'s working!');
  }

  if (insights.hydration.hasData && insights.hydration.isWellHydrated) {
    celebrations.push('Great hydration today! This helps everything else work better.');
  }

  if (celebrations.length === 0) {
    celebrations.push('Every day is a chance to improve. Small steps lead to big changes!');
  }

  return celebrations;
}

export default router;
