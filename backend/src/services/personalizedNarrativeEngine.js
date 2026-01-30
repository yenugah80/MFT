/**
 * PersonalizedNarrativeEngine - Generate Compelling Stories from User Data
 *
 * Transforms raw patterns and data into human-readable, engaging narratives:
 * - References specific dates, foods, and outcomes
 * - Uses conversational language
 * - Provides actionable insights
 * - Includes confidence levels honestly
 *
 * Key Principles:
 * - Personal pronouns ("you", "your")
 * - Specific references (not "you tend to" but "Last Tuesday when you...")
 * - Honest about uncertainty
 * - Actionable recommendations
 */

import { mineUserPatterns } from './patternMiningService.js';

/**
 * Generate a complete personalized narrative for a user
 */
export async function generatePersonalizedNarrative(userId, options = {}) {
  const { lookbackDays = 30, maxInsights = 5 } = options;

  // Mine patterns first
  const patternResults = await mineUserPatterns(userId, { lookbackDays });

  if (!patternResults.success || !patternResults.dataSufficiency.sufficient) {
    return generateInsufficientDataNarrative(patternResults.dataSufficiency);
  }

  // Generate narrative sections
  const sections = [];

  // 1. Opening summary
  sections.push(generateOpeningSummary(patternResults));

  // 2. Top discoveries (most confident patterns across ALL domains)
  const topPatterns = patternResults.patterns.slice(0, maxInsights);
  if (topPatterns.length > 0) {
    sections.push(generateDiscoveriesSection(topPatterns));
  }

  // 3. Food-specific insights (mood, sleep, stress)
  const allFoodCorrelations = [
    ...(patternResults.foodMoodCorrelations || []),
    ...(patternResults.foodSleepCorrelations || []),
    ...(patternResults.foodStressCorrelations || [])
  ];
  if (allFoodCorrelations.length > 0) {
    sections.push(generateFoodInsightsSection(allFoodCorrelations));
  }

  // 4. Timing insights
  if (patternResults.temporalPatterns?.length > 0) {
    sections.push(generateTimingSection(patternResults.temporalPatterns));
  }

  // 5. Activity insights (NEW)
  if (patternResults.activityCorrelations?.length > 0) {
    sections.push(generateActivitySection(patternResults.activityCorrelations));
  }

  // 6. Sleep insights (NEW)
  if (patternResults.sleepCorrelations?.length > 0) {
    sections.push(generateSleepSection(patternResults.sleepCorrelations));
  }

  // 7. Hydration insights (NEW)
  if (patternResults.hydrationCorrelations?.length > 0) {
    sections.push(generateHydrationSection(patternResults.hydrationCorrelations));
  }

  // 8. Stress insights (NEW)
  if (patternResults.stressCorrelations?.length > 0) {
    sections.push(generateStressSection(patternResults.stressCorrelations));
  }

  // 9. Things to watch (negative patterns)
  if (patternResults.negativePatterns?.length > 0) {
    sections.push(generateCautionSection(patternResults.negativePatterns));
  }

  // 10. Personalized recommendations
  sections.push(generateRecommendationsSection(patternResults));

  return {
    success: true,
    narrative: {
      sections,
      summary: generateOneLinerSummary(patternResults),
      topInsight: topPatterns[0] || null,
      dataQuality: patternResults.dataSufficiency,
      generatedAt: new Date().toISOString()
    },
    patterns: patternResults.patterns,
    meta: patternResults.meta
  };
}

/**
 * Generate a quick one-liner summary for dashboard display
 */
export async function generateQuickInsight(userId) {
  const patternResults = await mineUserPatterns(userId, { lookbackDays: 14 });

  if (!patternResults.success || patternResults.patterns.length === 0) {
    return {
      success: true,
      insight: null,
      message: 'Keep logging to unlock personalized insights',
      type: 'encourage'
    };
  }

  const topPattern = patternResults.patterns[0];

  return {
    success: true,
    insight: {
      text: topPattern.insight,
      type: topPattern.type,
      confidence: topPattern.confidence,
      actionable: topPattern.recommendation || null
    },
    type: 'discovery'
  };
}

// ==================== Narrative Generation Functions ====================

function generateInsufficientDataNarrative(dataSufficiency) {
  const { foodLogs, moodLogs } = dataSufficiency;

  let message = "We're getting to know your patterns! ";

  if (foodLogs.count < foodLogs.required) {
    message += `Log ${foodLogs.required - foodLogs.count} more meals to unlock food insights. `;
  }

  if (moodLogs.count < moodLogs.required) {
    message += `Add ${moodLogs.required - moodLogs.count} more mood check-ins to discover how food affects your energy. `;
  }

  return {
    success: true,
    narrative: {
      sections: [{
        type: 'onboarding',
        title: 'Building Your Profile',
        icon: 'sparkles',
        content: message,
        progress: {
          food: foodLogs.percentage,
          mood: moodLogs.percentage
        }
      }],
      summary: 'Keep logging to unlock personalized insights',
      topInsight: null,
      dataQuality: dataSufficiency,
      generatedAt: new Date().toISOString()
    },
    patterns: [],
    meta: { insufficient: true }
  };
}

function generateOpeningSummary(patternResults) {
  const { patterns, meta } = patternResults;

  let summary = '';

  if (patterns.length === 0) {
    summary = `Based on ${meta.foodLogsAnalyzed} meals and ${meta.moodLogsAnalyzed} mood logs over the past ${meta.analyzedDays} days, we haven't found strong patterns yet. This is normal - everyone's different!`;
  } else if (patterns.length <= 2) {
    summary = `We've analyzed ${meta.foodLogsAnalyzed} meals and found ${patterns.length} emerging pattern${patterns.length > 1 ? 's' : ''} in your data.`;
  } else {
    summary = `Great news! We've discovered ${patterns.length} personalized patterns from your ${meta.foodLogsAnalyzed} logged meals. Here's what makes YOUR nutrition unique:`;
  }

  return {
    type: 'summary',
    title: 'Your Nutrition Story',
    icon: 'book',
    content: summary,
    stats: {
      patternsFound: patterns.length,
      mealsAnalyzed: meta.foodLogsAnalyzed,
      daysAnalyzed: meta.analyzedDays
    }
  };
}

function generateDiscoveriesSection(topPatterns) {
  const discoveries = topPatterns.map(pattern => ({
    insight: pattern.insight,
    confidence: pattern.confidence,
    type: pattern.type,
    direction: pattern.direction,
    recommendation: pattern.recommendation,
    sampleSize: pattern.sampleSize || pattern.highDays || pattern.lateEatingDays || 0
  }));

  return {
    type: 'discoveries',
    title: 'Key Discoveries',
    icon: 'bulb',
    subtitle: 'Patterns unique to you',
    discoveries
  };
}

function generateFoodInsightsSection(foodCorrelations) {
  // Separate positive and negative food correlations
  const goodFoods = foodCorrelations.filter(f => f.direction === 'positive');
  const watchFoods = foodCorrelations.filter(f => f.direction === 'negative');

  const content = [];

  if (goodFoods.length > 0) {
    content.push({
      subtitle: 'Foods That Work For You',
      icon: 'heart',
      items: goodFoods.map(f => ({
        food: f.food,
        impact: `+${f.energyImpact}% energy`,
        narrative: generateFoodNarrative(f, 'positive'),
        confidence: f.confidence,
        occurrences: f.sampleSize
      }))
    });
  }

  if (watchFoods.length > 0) {
    content.push({
      subtitle: 'Foods to Be Mindful Of',
      icon: 'alert-circle',
      items: watchFoods.map(f => ({
        food: f.food,
        impact: `${f.energyImpact}% energy`,
        narrative: generateFoodNarrative(f, 'negative'),
        confidence: f.confidence,
        occurrences: f.sampleSize
      }))
    });
  }

  return {
    type: 'food_insights',
    title: 'Your Food Fingerprint',
    icon: 'restaurant',
    content
  };
}

function generateFoodNarrative(foodCorrelation, direction) {
  const { food, energyImpact, moodImpact, sampleSize, lastOccurrence } = foodCorrelation;

  let narrative = '';

  if (direction === 'positive') {
    if (Math.abs(energyImpact) > Math.abs(moodImpact)) {
      narrative = `When you have ${food}, your energy tends to be ${Math.abs(energyImpact)}% higher in the following hours. `;
    } else {
      narrative = `${food} seems to lift your mood by about ${Math.abs(moodImpact)}%. `;
    }
    narrative += `We've seen this ${sampleSize} times in your logs.`;
  } else {
    narrative = `${food} appears to slightly lower your ${Math.abs(energyImpact) > Math.abs(moodImpact) ? 'energy' : 'mood'}. `;
    narrative += `This doesn't mean you need to avoid it - just be mindful of timing or pairing it with energizing foods.`;
  }

  if (lastOccurrence) {
    const daysSince = Math.floor((new Date() - new Date(lastOccurrence)) / (1000 * 60 * 60 * 24));
    if (daysSince <= 3) {
      narrative += ` (You had this ${daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`})`;
    }
  }

  return narrative;
}

function generateTimingSection(temporalPatterns) {
  const timingInsights = temporalPatterns.map(pattern => {
    let narrative = '';
    let actionable = '';

    switch (pattern.subtype) {
      case 'BREAKFAST_TIMING':
        if (pattern.direction === 'positive') {
          narrative = `Early breakfast is your superpower. Your energy is ${Math.abs(pattern.impact)}% higher on days you eat before 9am.`;
          actionable = 'Keep prioritizing that morning meal!';
        } else {
          narrative = `Interestingly, later breakfasts might work better for you.`;
          actionable = 'Consider experimenting with breakfast timing.';
        }
        break;

      case 'LATE_EATING':
        if (pattern.impact > 0) {
          narrative = `Late-night eating affects your mornings. When you finish eating by 9pm, your morning energy is ${pattern.impact}% higher.`;
          actionable = 'Try to wrap up eating by 9pm when possible.';
        }
        break;

      case 'DAY_OF_WEEK':
        if (pattern.direction === 'positive') {
          narrative = `${pattern.day}s are your best days for energy - ${pattern.impact}% above your average.`;
          actionable = 'What do you do differently on this day? Try to replicate it.';
        } else {
          narrative = `${pattern.day}s tend to be lower-energy days for you (${Math.abs(pattern.impact)}% below average).`;
          actionable = 'Consider meal prepping or scheduling energizing foods for this day.';
        }
        break;

      case 'MEAL_REGULARITY':
        if (pattern.direction === 'positive') {
          narrative = `You thrive on regular meal spacing. When meals are spread throughout the day, your energy is ${pattern.impact}% better.`;
          actionable = 'Keep those consistent meal times!';
        }
        break;

      default:
        narrative = pattern.insight;
        actionable = pattern.recommendation;
    }

    return {
      type: pattern.subtype,
      narrative,
      actionable,
      confidence: pattern.confidence,
      impact: pattern.impact
    };
  });

  return {
    type: 'timing',
    title: 'Your Timing Patterns',
    icon: 'time',
    subtitle: 'When you eat matters as much as what you eat',
    insights: timingInsights
  };
}

// ==================== NEW: Cross-Domain Section Generators ====================

function generateActivitySection(activityCorrelations) {
  const insights = activityCorrelations.map(correlation => {
    let narrative = correlation.insight || '';
    let actionable = correlation.recommendation || '';

    // Enhance based on correlation type
    if (correlation.type === 'ACTIVITY_MOOD') {
      if (correlation.direction === 'positive') {
        narrative = correlation.activityType === 'any_activity'
          ? `Any physical activity improves your mood by ${Math.abs(correlation.moodImpact)}%`
          : `${correlation.activityType} boosts your mood by ${Math.abs(correlation.moodImpact)}%`;
        actionable = 'Keep moving - your body and mind thank you!';
      }
    } else if (correlation.type === 'ACTIVITY_SLEEP') {
      narrative = correlation.subtype === 'TIMING'
        ? correlation.insight
        : `Physical activity improves your sleep quality by ${Math.abs(correlation.sleepImpact)}%`;
    } else if (correlation.type === 'ACTIVITY_ENERGY') {
      narrative = `Active days lead to ${Math.abs(correlation.energyImpact)}% better next-day energy`;
    }

    return {
      type: correlation.type,
      subtype: correlation.subtype,
      narrative,
      actionable,
      confidence: correlation.confidence,
      impact: correlation.moodImpact || correlation.sleepImpact || correlation.energyImpact
    };
  });

  return {
    type: 'activity',
    title: 'Your Activity Patterns',
    icon: 'fitness',
    subtitle: 'How movement affects your wellness',
    insights
  };
}

function generateSleepSection(sleepCorrelations) {
  const insights = sleepCorrelations.map(correlation => {
    let narrative = correlation.insight || '';
    let actionable = correlation.recommendation || '';

    if (correlation.type === 'SLEEP_MOOD') {
      narrative = `Good sleep improves your mood by ${Math.abs(correlation.moodImpact)}%`;
      actionable = 'Prioritize sleep quality for better emotional wellbeing';
    } else if (correlation.type === 'SLEEP_ENERGY') {
      if (correlation.subtype === 'DURATION') {
        narrative = correlation.insight;
      } else {
        narrative = `Quality sleep gives you ${Math.abs(correlation.energyImpact)}% more energy`;
      }
      actionable = 'Sleep is your energy superpower';
    }

    return {
      type: correlation.type,
      subtype: correlation.subtype,
      narrative,
      actionable,
      confidence: correlation.confidence,
      impact: correlation.moodImpact || correlation.energyImpact
    };
  });

  return {
    type: 'sleep',
    title: 'Your Sleep Patterns',
    icon: 'moon',
    subtitle: 'How sleep affects your days',
    insights
  };
}

function generateHydrationSection(hydrationCorrelations) {
  const insights = hydrationCorrelations.map(correlation => {
    let narrative = correlation.insight || '';
    let actionable = correlation.recommendation || '';

    if (correlation.type === 'HYDRATION_ENERGY') {
      narrative = `Good hydration gives you ${Math.abs(correlation.energyImpact)}% more energy`;
      actionable = 'Stay hydrated for sustained energy throughout the day';
    } else if (correlation.type === 'HYDRATION_MOOD') {
      narrative = `Hydration improves your mood by ${Math.abs(correlation.moodImpact)}%`;
      actionable = 'Water is a mood booster for you!';
    }

    return {
      type: correlation.type,
      narrative,
      actionable,
      confidence: correlation.confidence,
      impact: correlation.energyImpact || correlation.moodImpact
    };
  });

  return {
    type: 'hydration',
    title: 'Your Hydration Patterns',
    icon: 'water',
    subtitle: 'How water intake affects your wellness',
    insights
  };
}

function generateStressSection(stressCorrelations) {
  const insights = stressCorrelations.map(correlation => {
    let narrative = correlation.insight || '';
    let actionable = correlation.recommendation || '';

    if (correlation.type === 'STRESS_SLEEP') {
      narrative = `High stress reduces your sleep quality by ${Math.abs(correlation.sleepImpact)}%`;
      actionable = 'Stress management is key for better sleep';
    } else if (correlation.type === 'STRESS_MOOD') {
      narrative = `High stress days have ${Math.abs(correlation.moodImpact)}% worse mood`;
      actionable = 'Managing stress will significantly improve your overall mood';
    }

    return {
      type: correlation.type,
      narrative,
      actionable,
      confidence: correlation.confidence,
      impact: correlation.sleepImpact || correlation.moodImpact
    };
  });

  return {
    type: 'stress',
    title: 'Your Stress Patterns',
    icon: 'pulse',
    subtitle: 'How stress affects your wellness',
    insights
  };
}

function generateCautionSection(negativePatterns) {
  const cautions = negativePatterns.map(pattern => {
    let narrative = '';
    let suggestion = '';

    switch (pattern.subtype) {
      case 'LATE_CAFFEINE':
        narrative = `Caffeine after 3pm seems to affect your sleep. On nights after late caffeine, your sleep quality is ${pattern.impact}% lower.`;
        suggestion = 'Switch to decaf or herbal tea in the afternoon.';
        break;

      case 'SUGAR_IMPACT':
        narrative = `High-sugar meals correlate with ${pattern.impact}% lower energy for you. This might be the classic sugar crash.`;
        suggestion = 'Try pairing sugary foods with protein or fiber to stabilize your energy.';
        break;

      default:
        narrative = pattern.insight;
        suggestion = pattern.recommendation;
    }

    return {
      type: pattern.subtype,
      narrative,
      suggestion,
      confidence: pattern.confidence
    };
  });

  return {
    type: 'cautions',
    title: 'Things to Watch',
    icon: 'warning',
    subtitle: "Not deal-breakers, just good to know",
    cautions
  };
}

function generateRecommendationsSection(patternResults) {
  const recommendations = [];

  // Extract actionable recommendations from patterns
  patternResults.patterns.forEach(pattern => {
    if (pattern.recommendation && pattern.confidence >= 50) {
      recommendations.push({
        text: pattern.recommendation,
        basedOn: pattern.type,
        confidence: pattern.confidence,
        priority: pattern.confidence >= 70 ? 'high' : 'medium'
      });
    }
  });

  // Add general recommendations based on pattern gaps
  if (patternResults.temporalPatterns.length === 0) {
    recommendations.push({
      text: 'Try logging at consistent times to help us discover your timing patterns',
      basedOn: 'data_gap',
      confidence: 100,
      priority: 'low'
    });
  }

  // Limit to top 3 recommendations
  const topRecs = recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    type: 'recommendations',
    title: 'Your Action Items',
    icon: 'rocket',
    subtitle: 'Personalized next steps',
    recommendations: topRecs
  };
}

function generateOneLinerSummary(patternResults) {
  const { patterns } = patternResults;

  if (patterns.length === 0) {
    return 'Keep logging to discover your patterns';
  }

  const topPattern = patterns[0];

  // Create a compelling one-liner from the top pattern based on type
  switch (topPattern.type) {
    case 'FOOD_MOOD':
      return topPattern.direction === 'positive'
        ? `${topPattern.food} is your energy booster (+${topPattern.energyImpact}%)`
        : `${topPattern.food} may be affecting your energy`;

    case 'FOOD_SLEEP':
      return topPattern.direction === 'positive'
        ? `${topPattern.food} helps you sleep better (+${topPattern.sleepImpact}%)`
        : `${topPattern.food} may be affecting your sleep`;

    case 'FOOD_STRESS':
      return topPattern.direction === 'positive'
        ? `${topPattern.food} helps reduce your stress`
        : `${topPattern.food} may increase your stress`;

    case 'ACTIVITY_MOOD':
      return topPattern.direction === 'positive'
        ? `Exercise boosts your mood by ${topPattern.moodImpact}%`
        : 'Activity patterns affect your mood';

    case 'ACTIVITY_SLEEP':
      return topPattern.direction === 'positive'
        ? `Physical activity improves your sleep by ${topPattern.sleepImpact}%`
        : 'Activity timing affects your sleep';

    case 'ACTIVITY_ENERGY':
      return `Active days = ${topPattern.energyImpact}% more energy next morning`;

    case 'HYDRATION_ENERGY':
      return `Good hydration = ${topPattern.energyImpact}% more energy`;

    case 'HYDRATION_MOOD':
      return `Staying hydrated boosts your mood by ${topPattern.moodImpact}%`;

    case 'SLEEP_MOOD':
      return `Quality sleep improves your mood by ${topPattern.moodImpact}%`;

    case 'SLEEP_ENERGY':
      return `Better sleep = ${topPattern.energyImpact}% more energy`;

    case 'STRESS_SLEEP':
      return `High stress reduces your sleep quality by ${topPattern.sleepImpact}%`;

    case 'STRESS_MOOD':
      return `Stress management could improve your mood by ${topPattern.moodImpact}%`;

    case 'TEMPORAL':
      if (topPattern.subtype === 'BREAKFAST_TIMING') {
        return `Early breakfast = ${topPattern.impact}% more energy for you`;
      }
      if (topPattern.subtype === 'DAY_OF_WEEK') {
        return `${topPattern.day}s are ${topPattern.direction === 'positive' ? 'your best' : 'challenging'} days`;
      }
      if (topPattern.subtype === 'LATE_EATING') {
        return `Finishing dinner by 9pm = ${topPattern.impact}% better morning energy`;
      }
      return topPattern.insight;

    case 'NEGATIVE':
      return topPattern.insight;

    default:
      return topPattern.insight || 'New wellness patterns discovered in your data';
  }
}

// ==================== Recommendation Context Generator ====================

/**
 * Generate context for AI recommendations based on user patterns
 * This is injected into the recommendation prompt for personalization
 * NOW INCLUDES: All cross-domain wellness correlations
 */
export async function generateRecommendationContext(userId) {
  const patternResults = await mineUserPatterns(userId, { lookbackDays: 14 });

  if (!patternResults.success || patternResults.patterns.length === 0) {
    return {
      hasPatterns: false,
      context: '',
      goodFoods: [],
      avoidFoods: [],
      timingTips: [],
      wellnessInsights: []
    };
  }

  // Extract food correlations (mood, sleep, stress)
  const goodFoods = [
    ...(patternResults.foodMoodCorrelations || []).filter(f => f.direction === 'positive').map(f => f.food),
    ...(patternResults.foodSleepCorrelations || []).filter(f => f.direction === 'positive').map(f => `${f.food} (helps sleep)`),
    ...(patternResults.foodStressCorrelations || []).filter(f => f.direction === 'positive').map(f => `${f.food} (reduces stress)`)
  ];

  const avoidFoods = [
    ...(patternResults.foodMoodCorrelations || []).filter(f => f.direction === 'negative').map(f => f.food),
    ...(patternResults.foodSleepCorrelations || []).filter(f => f.direction === 'negative').map(f => `${f.food} (affects sleep)`),
    ...(patternResults.foodStressCorrelations || []).filter(f => f.direction === 'negative').map(f => `${f.food} (increases stress)`)
  ];

  const timingTips = (patternResults.temporalPatterns || [])
    .filter(t => t.recommendation)
    .map(t => t.recommendation);

  // Extract cross-domain wellness insights
  const wellnessInsights = [];

  // Activity insights
  (patternResults.activityCorrelations || []).forEach(c => {
    if (c.insight) wellnessInsights.push({ type: 'activity', insight: c.insight, recommendation: c.recommendation });
  });

  // Sleep insights
  (patternResults.sleepCorrelations || []).forEach(c => {
    if (c.insight) wellnessInsights.push({ type: 'sleep', insight: c.insight, recommendation: c.recommendation });
  });

  // Hydration insights
  (patternResults.hydrationCorrelations || []).forEach(c => {
    if (c.insight) wellnessInsights.push({ type: 'hydration', insight: c.insight, recommendation: c.recommendation });
  });

  // Stress insights
  (patternResults.stressCorrelations || []).forEach(c => {
    if (c.insight) wellnessInsights.push({ type: 'stress', insight: c.insight, recommendation: c.recommendation });
  });

  // Build comprehensive context string for AI prompt
  let context = '\n═══════════════════════════════════════════════════════════════════════════════\n';
  context += '🎯 PERSONALIZED PATTERNS (discovered from this user\'s actual data)\n';
  context += '═══════════════════════════════════════════════════════════════════════════════\n\n';

  // Food correlations
  if (goodFoods.length > 0) {
    context += `🍽️ FOODS THAT WORK FOR THIS USER:\n`;
    goodFoods.forEach(f => context += `   • ${f}\n`);
    context += '→ Prioritize recommendations similar to these foods\n\n';
  }

  if (avoidFoods.length > 0) {
    context += `⚠️ FOODS TO USE SPARINGLY:\n`;
    avoidFoods.forEach(f => context += `   • ${f}\n`);
    context += '→ Avoid recommending these or suggest timing/pairing strategies\n\n';
  }

  // Timing insights
  if (timingTips.length > 0) {
    context += '⏰ TIMING INSIGHTS:\n';
    timingTips.forEach(tip => context += `   • ${tip}\n`);
    context += '\n';
  }

  // Cross-domain wellness insights
  const activityInsights = wellnessInsights.filter(w => w.type === 'activity');
  const sleepInsights = wellnessInsights.filter(w => w.type === 'sleep');
  const hydrationInsights = wellnessInsights.filter(w => w.type === 'hydration');
  const stressInsights = wellnessInsights.filter(w => w.type === 'stress');

  if (activityInsights.length > 0) {
    context += '🏃 ACTIVITY PATTERNS:\n';
    activityInsights.forEach(i => context += `   • ${i.insight}\n`);
    context += '\n';
  }

  if (sleepInsights.length > 0) {
    context += '😴 SLEEP PATTERNS:\n';
    sleepInsights.forEach(i => context += `   • ${i.insight}\n`);
    context += '\n';
  }

  if (hydrationInsights.length > 0) {
    context += '💧 HYDRATION PATTERNS:\n';
    hydrationInsights.forEach(i => context += `   • ${i.insight}\n`);
    context += '\n';
  }

  if (stressInsights.length > 0) {
    context += '🧘 STRESS PATTERNS:\n';
    stressInsights.forEach(i => context += `   • ${i.insight}\n`);
    context += '\n';
  }

  // Add top 3 patterns as specific insights
  const topPatterns = patternResults.patterns.slice(0, 3);
  if (topPatterns.length > 0) {
    context += '🌟 TOP PERSONALIZED INSIGHTS:\n';
    topPatterns.forEach((p, i) => {
      context += `${i + 1}. ${p.insight}\n`;
      if (p.recommendation) context += `   → ${p.recommendation}\n`;
    });
  }

  return {
    hasPatterns: true,
    context,
    goodFoods: goodFoods.map(f => f.split(' (')[0]), // Clean food names
    avoidFoods: avoidFoods.map(f => f.split(' (')[0]),
    timingTips,
    wellnessInsights,
    // Detailed correlations for frontend display
    correlations: {
      food: {
        positive: (patternResults.foodMoodCorrelations || []).filter(f => f.direction === 'positive'),
        negative: (patternResults.foodMoodCorrelations || []).filter(f => f.direction === 'negative')
      },
      activity: patternResults.activityCorrelations || [],
      sleep: patternResults.sleepCorrelations || [],
      hydration: patternResults.hydrationCorrelations || [],
      stress: patternResults.stressCorrelations || []
    },
    topPattern: topPatterns[0] ? {
      insight: topPatterns[0].insight,
      recommendation: topPatterns[0].recommendation,
      confidence: topPatterns[0].confidence,
      type: topPatterns[0].type
    } : null,
    dataSufficiency: patternResults.dataSufficiency
  };
}

export default {
  generatePersonalizedNarrative,
  generateQuickInsight,
  generateRecommendationContext
};
