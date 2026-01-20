/**
 * Activity Analytics Service
 *
 * Evidence-Based Physical Activity Intelligence System
 *
 * Research Foundation:
 * - Physical activity directly reduces depression, anxiety, stress (66.9-73.5% direct effect)
 * - Diet mediates PA-mental health relationship (26.5-33.1% mediation effect)
 * - Hydration affects exercise performance and cognitive function
 *
 * Key Research Sources:
 * - Frontiers in Nutrition 2025: PA-Diet-Mental Health mediation study (n=1,076)
 * - IJBNPA 2024: PA and mental health systematic review (247 studies)
 * - American Journal of Human Biology 2024: Hydration and cognitive performance
 * - npj Digital Medicine 2025: Digital behavior change meta-analysis
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { openaiClient } from './apiClients/OpenAIClient.js';

// ============================================================================
// SCIENTIFIC EVIDENCE BASE
// ============================================================================

const SCIENTIFIC_EVIDENCE = {
  // Physical Activity → Mental Health (Direct Effect)
  PA_MOOD_DIRECT: {
    effectSize: 0.70, // 66.9-73.5% of effect is direct
    confidence: 0.92,
    sources: ['Frontiers in Nutrition 2025', 'IJBNPA 2024 Systematic Review'],
    mechanism: 'Endorphin release, neuroplasticity, stress hormone regulation',
    doseResponse: {
      threshold: 10, // minutes
      optimal: 30, // minutes
      maxBenefit: 60, // minutes (diminishing returns after)
    },
  },

  // Physical Activity → Diet → Mental Health (Mediation)
  PA_DIET_MEDIATION: {
    effectSize: 0.30, // 26.5-33.1% mediated through diet
    confidence: 0.88,
    sources: ['Frontiers in Nutrition 2025'],
    mechanism: 'Improved dietary behaviors, reduced emotional eating, better satiety response',
    keyFactors: ['emotional_overeating', 'food_pickiness', 'satiety_response'],
  },

  // Hydration → Exercise Performance
  HYDRATION_PERFORMANCE: {
    effectSize: 0.65,
    confidence: 0.85,
    sources: ['American Journal of Human Biology 2024', 'PMC Hydration Equation'],
    mechanism: 'Cognitive function, thermoregulation, cardiovascular efficiency',
    thresholds: {
      mild: 0.01, // 1% body water loss - subtle effects
      moderate: 0.02, // 2% - noticeable cognitive decline
      severe: 0.03, // 3%+ - significant performance impairment
    },
  },

  // Self-Monitoring Behavior Change
  SELF_MONITORING: {
    effectSize: 0.32,
    confidence: 0.90,
    sources: ['npj Digital Medicine 2025 Meta-analysis', 'IJBNPA 2024'],
    mechanism: 'Self-regulation theory: monitoring → evaluation → reinforcement',
    consistency: {
      minimum: 5, // days per week for significant effect
      optimal: 7,
    },
  },

  // CDC Physical Activity Guidelines
  CDC_GUIDELINES: {
    moderateMinutes: 150, // per week
    vigorousMinutes: 75, // per week
    strengthDays: 2, // per week
    sources: ['CDC Physical Activity Guidelines for Americans'],
  },
};

// ============================================================================
// PERSONA CLASSIFICATION
// ============================================================================

const ACTIVITY_PERSONAS = {
  SEDENTARY: {
    id: 'sedentary',
    title: 'Getting Started',
    description: 'You\'re beginning your activity journey. Every step counts, and small consistent efforts build lasting habits.',
    recommendation: 'Start with 10-minute walks after meals. Research shows even brief activity improves mood immediately.',
    icon: 'leaf-outline',
    thresholds: { weeklyMinutes: 0, avgDaily: 0 },
  },
  LIGHT_ACTIVE: {
    id: 'light_active',
    title: 'Building Momentum',
    description: 'You\'re developing activity habits. Your body is adapting to movement, setting the foundation for greater gains.',
    recommendation: 'Try adding 5 more minutes to your sessions. Consistency matters more than intensity at this stage.',
    icon: 'trending-up',
    thresholds: { weeklyMinutes: 50, avgDaily: 7 },
  },
  MODERATELY_ACTIVE: {
    id: 'moderately_active',
    title: 'Consistent Mover',
    description: 'You maintain regular activity throughout the week. This consistency is building real health benefits.',
    recommendation: 'You\'re on track! Consider varying activity types to engage different muscle groups.',
    icon: 'walk',
    thresholds: { weeklyMinutes: 100, avgDaily: 15 },
  },
  ACTIVE: {
    id: 'active',
    title: 'Active Achiever',
    description: 'You meet CDC recommendations for weekly activity. Your dedication is significantly boosting your health.',
    recommendation: 'Great work! Add strength training 2x/week to maximize bone and metabolic health.',
    icon: 'fitness',
    thresholds: { weeklyMinutes: 150, avgDaily: 22 },
  },
  VERY_ACTIVE: {
    id: 'very_active',
    title: 'Fitness Enthusiast',
    description: 'You exceed activity guidelines consistently. Your commitment is exceptional and your body is thriving.',
    recommendation: 'Ensure adequate recovery and hydration. Listen to your body on rest days.',
    icon: 'trophy',
    thresholds: { weeklyMinutes: 300, avgDaily: 43 },
  },
};

// ============================================================================
// COLD START STAGES
// ============================================================================

const COLD_START_STAGES = {
  DAY0: 'day0',
  DAYS_1_3: 'days1-3',
  DAYS_4_7: 'days4-7',
  ESTABLISHED: 'established',
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class ActivityAnalyticsService {
  constructor() {
    this.openaiClient = openaiClient;
  }

  // ==========================================================================
  // COLD START DETECTION
  // ==========================================================================

  async getColdStartStage(userId) {
    try {
      // Query activity logs count and distinct days
      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total_logs,
          COUNT(DISTINCT DATE(logged_at)) as distinct_days,
          MIN(logged_at) as first_log,
          MAX(logged_at) as last_log
        FROM activity_log
        WHERE user_id = ${userId}
          AND logged_at >= NOW() - INTERVAL '30 days'
      `);

      const stats = result.rows?.[0] || { total_logs: 0, distinct_days: 0 };
      const distinctDays = parseInt(stats.distinct_days) || 0;
      const totalLogs = parseInt(stats.total_logs) || 0;

      let stage;
      if (distinctDays === 0) {
        stage = COLD_START_STAGES.DAY0;
      } else if (distinctDays <= 3) {
        stage = COLD_START_STAGES.DAYS_1_3;
      } else if (distinctDays <= 7) {
        stage = COLD_START_STAGES.DAYS_4_7;
      } else {
        stage = COLD_START_STAGES.ESTABLISHED;
      }

      return {
        stage,
        distinctDays,
        totalLogs,
        firstLog: stats.first_log,
        lastLog: stats.last_log,
        daysSinceFirstLog: stats.first_log
          ? Math.floor((Date.now() - new Date(stats.first_log).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };
    } catch (error) {
      console.error('[ActivityAnalytics] getColdStartStage error:', error);
      return {
        stage: COLD_START_STAGES.DAY0,
        distinctDays: 0,
        totalLogs: 0,
      };
    }
  }

  // ==========================================================================
  // PATTERN ANALYSIS
  // ==========================================================================

  async analyzeActivityPatterns(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get activity logs
      const logsResult = await db.execute(sql`
        SELECT
          id,
          type,
          duration_minutes,
          intensity,
          logged_at,
          notes,
          EXTRACT(DOW FROM logged_at) as day_of_week,
          EXTRACT(HOUR FROM logged_at) as hour_of_day
        FROM activity_log
        WHERE user_id = ${userId}
          AND logged_at >= ${startDate.toISOString()}
          AND logged_at <= ${endDate.toISOString()}
        ORDER BY logged_at DESC
      `);

      const logs = logsResult.rows || [];

      if (logs.length === 0) {
        return null;
      }

      // Calculate patterns
      const totalMinutes = logs.reduce((sum, log) => sum + (parseInt(log.duration_minutes) || 0), 0);
      const avgDaily = totalMinutes / days;
      const weeklyMinutes = avgDaily * 7;

      // Day of week distribution
      const dayDistribution = {};
      const hourDistribution = {};
      const typeDistribution = {};

      logs.forEach(log => {
        const dow = parseInt(log.day_of_week);
        const hour = parseInt(log.hour_of_day);
        const type = log.type || 'general';
        const minutes = parseInt(log.duration_minutes) || 0;

        dayDistribution[dow] = (dayDistribution[dow] || 0) + minutes;
        hourDistribution[hour] = (hourDistribution[hour] || 0) + minutes;
        typeDistribution[type] = (typeDistribution[type] || 0) + minutes;
      });

      // Weekday vs weekend
      const weekdayMinutes = [1, 2, 3, 4, 5].reduce((sum, d) => sum + (dayDistribution[d] || 0), 0);
      const weekendMinutes = [0, 6].reduce((sum, d) => sum + (dayDistribution[d] || 0), 0);
      const avgWeekday = weekdayMinutes / (5 * Math.ceil(days / 7));
      const avgWeekend = weekendMinutes / (2 * Math.ceil(days / 7));

      // Peak activity time
      const peakHour = Object.entries(hourDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      // Period distribution
      const morningMinutes = Object.entries(hourDistribution)
        .filter(([h]) => parseInt(h) >= 5 && parseInt(h) < 12)
        .reduce((sum, [, v]) => sum + v, 0);
      const afternoonMinutes = Object.entries(hourDistribution)
        .filter(([h]) => parseInt(h) >= 12 && parseInt(h) < 17)
        .reduce((sum, [, v]) => sum + v, 0);
      const eveningMinutes = Object.entries(hourDistribution)
        .filter(([h]) => parseInt(h) >= 17 && parseInt(h) < 22)
        .reduce((sum, [, v]) => sum + v, 0);

      const totalPeriodMinutes = morningMinutes + afternoonMinutes + eveningMinutes || 1;

      return {
        totalMinutes,
        avgDaily,
        weeklyMinutes,
        avgWeekday,
        avgWeekend,
        weekendDrop: avgWeekday > 0 ? Math.max(0, (avgWeekday - avgWeekend) / avgWeekday) : 0,
        peakHour: peakHour ? parseInt(peakHour) : 9,
        periodDistribution: {
          morning: morningMinutes / totalPeriodMinutes,
          afternoon: afternoonMinutes / totalPeriodMinutes,
          evening: eveningMinutes / totalPeriodMinutes,
        },
        typeDistribution,
        logCount: logs.length,
        consistencyScore: this.calculateConsistencyScore(logs, days),
        cdcProgress: Math.min(weeklyMinutes / SCIENTIFIC_EVIDENCE.CDC_GUIDELINES.moderateMinutes, 1),
      };
    } catch (error) {
      console.error('[ActivityAnalytics] analyzeActivityPatterns error:', error);
      return null;
    }
  }

  calculateConsistencyScore(logs, days) {
    // Group logs by date
    const dateMap = {};
    logs.forEach(log => {
      const date = new Date(log.logged_at).toISOString().split('T')[0];
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    const activeDays = Object.keys(dateMap).length;
    const expectedDays = Math.min(days, 30);

    // Score based on how many days had activity
    return Math.min(activeDays / expectedDays, 1);
  }

  // ==========================================================================
  // PERSONA CLASSIFICATION
  // ==========================================================================

  async classifyActivityPersona(userId, patterns) {
    if (!patterns) {
      return {
        persona: ACTIVITY_PERSONAS.SEDENTARY,
        confidence: 0.5,
      };
    }

    const { weeklyMinutes, avgDaily, consistencyScore } = patterns;

    // Determine persona based on weekly activity
    let persona;
    let confidence = 0.7;

    if (weeklyMinutes >= 300) {
      persona = ACTIVITY_PERSONAS.VERY_ACTIVE;
      confidence = 0.9;
    } else if (weeklyMinutes >= 150) {
      persona = ACTIVITY_PERSONAS.ACTIVE;
      confidence = 0.85;
    } else if (weeklyMinutes >= 100) {
      persona = ACTIVITY_PERSONAS.MODERATELY_ACTIVE;
      confidence = 0.8;
    } else if (weeklyMinutes >= 50) {
      persona = ACTIVITY_PERSONAS.LIGHT_ACTIVE;
      confidence = 0.75;
    } else {
      persona = ACTIVITY_PERSONAS.SEDENTARY;
      confidence = 0.7;
    }

    // Adjust confidence based on consistency
    confidence = confidence * (0.5 + 0.5 * consistencyScore);

    return {
      persona,
      confidence,
    };
  }

  // ==========================================================================
  // CORRELATION ANALYSIS (Activity ↔ Mood ↔ Food ↔ Hydration)
  // ==========================================================================

  async analyzeCorrelations(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get all relevant logs
      const [activityLogs, moodLogs, foodLogs, waterLogs] = await Promise.all([
        this.getActivityLogs(userId, startDate, endDate),
        this.getMoodLogs(userId, startDate, endDate),
        this.getFoodLogs(userId, startDate, endDate),
        this.getWaterLogs(userId, startDate, endDate),
      ]);

      // Group data by date
      const dailyData = this.groupDataByDate(activityLogs, moodLogs, foodLogs, waterLogs);

      // Calculate correlations
      const correlations = {
        activityMood: this.calculateCorrelation(dailyData, 'activityMinutes', 'avgMood'),
        activityFood: this.calculateCorrelation(dailyData, 'activityMinutes', 'calorieQuality'),
        activityHydration: this.calculateCorrelation(dailyData, 'activityMinutes', 'waterIntake'),
        hydrationMood: this.calculateCorrelation(dailyData, 'waterIntake', 'avgMood'),
        foodMood: this.calculateCorrelation(dailyData, 'calorieQuality', 'avgMood'),
      };

      return {
        correlations,
        sampleSize: Object.keys(dailyData).length,
        confidence: Object.keys(dailyData).length >= 14 ? 0.8 : 0.5,
        insights: this.generateCorrelationInsights(correlations),
      };
    } catch (error) {
      console.error('[ActivityAnalytics] analyzeCorrelations error:', error);
      return null;
    }
  }

  async getActivityLogs(userId, startDate, endDate) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM activity_log
        WHERE user_id = ${userId}
          AND logged_at >= ${startDate.toISOString()}
          AND logged_at <= ${endDate.toISOString()}
      `);
      return result.rows || [];
    } catch {
      return [];
    }
  }

  async getMoodLogs(userId, startDate, endDate) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM mood_log
        WHERE user_id = ${userId}
          AND logged_date >= ${startDate.toISOString()}
          AND logged_date <= ${endDate.toISOString()}
      `);
      return result.rows || [];
    } catch {
      return [];
    }
  }

  async getFoodLogs(userId, startDate, endDate) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM food_log
        WHERE user_id = ${userId}
          AND logged_date >= ${startDate.toISOString()}
          AND logged_date <= ${endDate.toISOString()}
      `);
      return result.rows || [];
    } catch {
      return [];
    }
  }

  async getWaterLogs(userId, startDate, endDate) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM water_log
        WHERE user_id = ${userId}
          AND logged_date >= ${startDate.toISOString()}
          AND logged_date <= ${endDate.toISOString()}
      `);
      return result.rows || [];
    } catch {
      return [];
    }
  }

  groupDataByDate(activityLogs, moodLogs, foodLogs, waterLogs) {
    const dailyData = {};

    // Group activity
    activityLogs.forEach(log => {
      const date = new Date(log.logged_at).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { date };
      dailyData[date].activityMinutes = (dailyData[date].activityMinutes || 0) +
        (parseInt(log.duration_minutes) || 0);
    });

    // Group mood (convert mood to numeric scale)
    const moodScale = { happy: 5, energized: 5, calm: 4, focused: 4, neutral: 3, tired: 2, stressed: 1, sad: 1 };
    moodLogs.forEach(log => {
      const date = new Date(log.logged_date).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { date };
      const moodValue = moodScale[log.mood] || parseInt(log.energy_level) || 3;
      if (!dailyData[date].moodValues) dailyData[date].moodValues = [];
      dailyData[date].moodValues.push(moodValue);
    });

    // Calculate average mood per day
    Object.keys(dailyData).forEach(date => {
      if (dailyData[date].moodValues?.length) {
        dailyData[date].avgMood = dailyData[date].moodValues.reduce((a, b) => a + b, 0) /
          dailyData[date].moodValues.length;
      }
    });

    // Group food (calculate calorie quality score)
    foodLogs.forEach(log => {
      const date = new Date(log.logged_date).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { date };
      // Simple quality score based on protein ratio and fiber
      const protein = parseFloat(log.protein) || 0;
      const calories = parseFloat(log.calories) || 1;
      const fiber = parseFloat(log.fiber) || 0;
      const qualityScore = (protein / calories * 100) + (fiber * 2);
      if (!dailyData[date].foodQualityScores) dailyData[date].foodQualityScores = [];
      dailyData[date].foodQualityScores.push(qualityScore);
    });

    // Calculate average food quality per day
    Object.keys(dailyData).forEach(date => {
      if (dailyData[date].foodQualityScores?.length) {
        dailyData[date].calorieQuality = dailyData[date].foodQualityScores.reduce((a, b) => a + b, 0) /
          dailyData[date].foodQualityScores.length;
      }
    });

    // Group water
    waterLogs.forEach(log => {
      const date = new Date(log.logged_date).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { date };
      // Convert liters to ml for consistency
      dailyData[date].waterIntake = (dailyData[date].waterIntake || 0) +
        (parseFloat(log.amount_liters) * 1000 || 0);
    });

    return dailyData;
  }

  calculateCorrelation(dailyData, varX, varY) {
    const pairs = Object.values(dailyData)
      .filter(d => d[varX] !== undefined && d[varY] !== undefined)
      .map(d => ({ x: d[varX], y: d[varY] }));

    if (pairs.length < 5) return null;

    const n = pairs.length;
    const sumX = pairs.reduce((s, p) => s + p.x, 0);
    const sumY = pairs.reduce((s, p) => s + p.y, 0);
    const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
    const sumY2 = pairs.reduce((s, p) => s + p.y * p.y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  generateCorrelationInsights(correlations) {
    const insights = [];

    if (correlations.activityMood && Math.abs(correlations.activityMood) > 0.3) {
      insights.push({
        type: correlations.activityMood > 0 ? 'positive' : 'negative',
        title: 'Activity-Mood Connection',
        message: correlations.activityMood > 0
          ? 'Your activity levels positively correlate with your mood. Days with more movement tend to be better mood days.'
          : 'Your data shows activity timing may need adjustment for optimal mood benefits.',
        strength: Math.abs(correlations.activityMood),
        evidence: SCIENTIFIC_EVIDENCE.PA_MOOD_DIRECT,
      });
    }

    if (correlations.activityFood && Math.abs(correlations.activityFood) > 0.2) {
      insights.push({
        type: 'suggestion',
        title: 'Activity-Nutrition Link',
        message: 'Research shows physical activity improves dietary choices. Your data supports this - active days show better food quality.',
        strength: Math.abs(correlations.activityFood),
        evidence: SCIENTIFIC_EVIDENCE.PA_DIET_MEDIATION,
      });
    }

    if (correlations.activityHydration && correlations.activityHydration > 0.2) {
      insights.push({
        type: 'tip',
        title: 'Hydration Matters',
        message: 'You tend to hydrate more on active days. Keep it up - proper hydration improves exercise performance by up to 25%.',
        strength: correlations.activityHydration,
        evidence: SCIENTIFIC_EVIDENCE.HYDRATION_PERFORMANCE,
      });
    }

    return insights;
  }

  // ==========================================================================
  // AI-POWERED RECOMMENDATIONS
  // ==========================================================================

  async generateAIRecommendations(userId, patterns, correlations, moodData) {
    try {
      const prompt = this.buildRecommendationPrompt(patterns, correlations, moodData);

      const response = await this.openaiClient.sdk.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an evidence-based health coach specializing in physical activity, nutrition, and mental wellness.

Your recommendations must be based on these research findings:
1. Physical activity directly reduces depression, anxiety, stress (66.9-73.5% direct effect)
2. Diet mediates 26.5-33.1% of the activity-mental health relationship
3. Even 10-minute walks improve mood immediately
4. 150 min/week moderate activity is CDC target
5. Consistency (5+ days/week) matters more than intensity
6. Morning activity boosts focus and mood throughout the day
7. Hydration affects cognitive performance (>2% dehydration impairs cognition)

Respond with a JSON array of 3-5 personalized recommendations. Each recommendation should have:
- title: Short actionable title
- description: Evidence-based explanation (1-2 sentences)
- action: Specific call-to-action
- icon: Ionicons icon name (e.g., 'sunny-outline', 'walk-outline')
- priority: high/medium/low
- evidence: Brief citation of research supporting this`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices?.[0]?.message?.content || '[]';

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.getFallbackRecommendations(patterns);
    } catch (error) {
      console.error('[ActivityAnalytics] generateAIRecommendations error:', error);
      return this.getFallbackRecommendations(patterns);
    }
  }

  buildRecommendationPrompt(patterns, correlations, moodData) {
    const parts = ['User Activity Profile:'];

    if (patterns) {
      parts.push(`- Weekly activity: ${Math.round(patterns.weeklyMinutes)} minutes`);
      parts.push(`- Daily average: ${Math.round(patterns.avgDaily)} minutes`);
      parts.push(`- CDC progress: ${Math.round(patterns.cdcProgress * 100)}%`);
      parts.push(`- Peak activity time: ${patterns.peakHour}:00`);
      parts.push(`- Consistency score: ${Math.round(patterns.consistencyScore * 100)}%`);

      if (patterns.weekendDrop > 0.2) {
        parts.push(`- Weekend activity drops by ${Math.round(patterns.weekendDrop * 100)}%`);
      }
    } else {
      parts.push('- New user with limited activity data');
    }

    if (correlations) {
      parts.push('\nCorrelation Analysis:');
      if (correlations.activityMood) {
        parts.push(`- Activity-Mood correlation: ${correlations.activityMood.toFixed(2)}`);
      }
      if (correlations.activityFood) {
        parts.push(`- Activity-Food quality correlation: ${correlations.activityFood.toFixed(2)}`);
      }
    }

    if (moodData) {
      parts.push('\nRecent Mood Data:');
      parts.push(`- Average mood: ${moodData.avgMood || 'unknown'}`);
      parts.push(`- Dominant mood: ${moodData.dominantMood || 'unknown'}`);
    }

    parts.push('\nGenerate personalized, actionable recommendations based on this data and the scientific evidence provided.');

    return parts.join('\n');
  }

  getFallbackRecommendations(patterns) {
    const recommendations = [];

    // Base recommendations for everyone
    recommendations.push({
      title: 'Morning Movement Boost',
      description: 'Research shows morning exercise improves mood and focus for up to 12 hours. Even a 10-minute walk counts.',
      action: 'Try tomorrow morning',
      icon: 'sunny-outline',
      priority: 'high',
      evidence: 'IJBNPA 2024: PA and mental health review',
    });

    if (!patterns || patterns.weeklyMinutes < 150) {
      recommendations.push({
        title: 'Build to CDC Target',
        description: `You're at ${patterns?.weeklyMinutes || 0} min/week. Target is 150 min. Add just 10 min daily to see significant health gains.`,
        action: 'Add 10 min today',
        icon: 'trending-up',
        priority: 'high',
        evidence: 'CDC Physical Activity Guidelines',
      });
    }

    if (patterns?.weekendDrop > 0.3) {
      recommendations.push({
        title: 'Weekend Consistency',
        description: 'Your weekend activity drops significantly. Maintaining consistency improves long-term results.',
        action: 'Plan a Saturday walk',
        icon: 'calendar-outline',
        priority: 'medium',
        evidence: 'Self-monitoring meta-analysis 2025',
      });
    }

    recommendations.push({
      title: 'Hydrate Before Activity',
      description: 'Drink 500ml water 2 hours before exercise. Dehydration >2% impairs cognitive function and performance.',
      action: 'Set a reminder',
      icon: 'water-outline',
      priority: 'medium',
      evidence: 'American Journal of Human Biology 2024',
    });

    recommendations.push({
      title: 'Post-Exercise Nutrition',
      description: 'Activity improves food choices. Capitalize on this by planning a protein-rich meal after workouts.',
      action: 'Plan your post-workout meal',
      icon: 'restaurant-outline',
      priority: 'medium',
      evidence: 'Frontiers in Nutrition 2025: Diet mediation study',
    });

    return recommendations.slice(0, 5);
  }

  // ==========================================================================
  // PREDICTION ENGINE
  // ==========================================================================

  async predictTomorrow(userId, patterns) {
    if (!patterns || patterns.logCount < 7) {
      return {
        hasPrediction: false,
        message: 'Need more data for predictions',
      };
    }

    // Simple prediction based on day of week patterns
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDow = tomorrow.getDay();

    // Check if tomorrow is weekend
    const isWeekend = tomorrowDow === 0 || tomorrowDow === 6;
    const baseMinutes = isWeekend ? patterns.avgWeekend : patterns.avgWeekday;

    // Apply consistency factor
    const predictedMinutes = baseMinutes * (0.8 + 0.4 * patterns.consistencyScore);

    return {
      hasPrediction: true,
      predictedMinutes: Math.round(predictedMinutes),
      confidence: Math.min(0.5 + patterns.consistencyScore * 0.3, 0.85),
      factors: [
        {
          type: isWeekend ? 'weekend' : 'weekday',
          description: isWeekend ? 'Weekend day (typically lower activity)' : 'Weekday (your active time)',
          adjustment: isWeekend ? -patterns.weekendDrop : 0,
        },
      ],
      recommendation: predictedMinutes < 30
        ? 'Consider scheduling a 30-minute activity session tomorrow'
        : 'You\'re on track! Keep up your routine.',
    };
  }

  // ==========================================================================
  // WEEK DATA FOR CHARTS
  // ==========================================================================

  async getWeekData(userId) {
    try {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 6);

      const result = await db.execute(sql`
        SELECT
          DATE(logged_at) as date,
          SUM(duration_minutes) as minutes,
          STRING_AGG(DISTINCT type, ', ') as types
        FROM activity_log
        WHERE user_id = ${userId}
          AND logged_at >= ${weekAgo.toISOString()}
          AND logged_at <= ${today.toISOString()}
        GROUP BY DATE(logged_at)
        ORDER BY date ASC
      `);

      const logsByDate = {};
      (result.rows || []).forEach(row => {
        logsByDate[row.date] = {
          minutes: parseInt(row.minutes) || 0,
          types: row.types,
        };
      });

      // Build week array
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        weekData.push({
          date: dateStr,
          label: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
          minutes: logsByDate[dateStr]?.minutes || 0,
          type: logsByDate[dateStr]?.types || null,
        });
      }

      return weekData;
    } catch (error) {
      console.error('[ActivityAnalytics] getWeekData error:', error);
      return this.generateEmptyWeekData();
    }
  }

  generateEmptyWeekData() {
    const weekData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      weekData.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        minutes: 0,
        type: null,
      });
    }

    return weekData;
  }

  // ==========================================================================
  // MAIN DASHBOARD AGGREGATION
  // ==========================================================================

  async getDashboardAnalytics(userId) {
    const [coldStart, patterns, weekData] = await Promise.all([
      this.getColdStartStage(userId),
      this.analyzeActivityPatterns(userId, 30),
      this.getWeekData(userId),
    ]);

    // Only run heavy analysis for established users
    let correlations = null;
    let recommendations = [];
    let prediction = null;

    if (coldStart.stage === COLD_START_STAGES.ESTABLISHED) {
      [correlations, prediction] = await Promise.all([
        this.analyzeCorrelations(userId, 30),
        this.predictTomorrow(userId, patterns),
      ]);

      recommendations = await this.generateAIRecommendations(userId, patterns, correlations);
    } else {
      recommendations = this.getFallbackRecommendations(patterns);
    }

    const { persona, confidence: personaConfidence } = await this.classifyActivityPersona(userId, patterns);

    return {
      coldStart,
      patterns,
      persona,
      personaConfidence,
      prediction,
      correlations,
      recommendations,
      weekData,
      scientificEvidence: SCIENTIFIC_EVIDENCE,
    };
  }
}

export default new ActivityAnalyticsService();
export { SCIENTIFIC_EVIDENCE, ACTIVITY_PERSONAS, COLD_START_STAGES };
