/**
 * Context-Aware Engine - Staff-Level Production System
 *
 * Features:
 * - Location-based food suggestions
 * - Weather integration for recommendations
 * - Activity level detection
 * - Calendar/schedule awareness
 * - Seasonal adjustments
 * - Time-of-day personalization
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// Context caches
const weatherCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 }); // 30 min cache
const locationCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // 24 hour cache
const calendarCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 min cache

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export const ContextSignals = {
  // Time-based
  TIME_OF_DAY: 'time_of_day',
  DAY_OF_WEEK: 'day_of_week',
  SEASON: 'season',

  // Environmental
  WEATHER: 'weather',
  TEMPERATURE: 'temperature',

  // Location
  LOCATION_TYPE: 'location_type', // home, work, gym, restaurant
  CUISINE_REGION: 'cuisine_region',

  // Activity
  ACTIVITY_LEVEL: 'activity_level',
  RECENT_EXERCISE: 'recent_exercise',
  STEPS_TODAY: 'steps_today',

  // Schedule
  UPCOMING_EVENT: 'upcoming_event',
  BUSY_PERIOD: 'busy_period',
  MEAL_WINDOW: 'meal_window',

  // User State
  ENERGY_LEVEL: 'energy_level',
  MOOD: 'mood',
  HYDRATION_STATUS: 'hydration_status',
};

export const WeatherConditions = {
  HOT: 'hot', // > 30C
  WARM: 'warm', // 20-30C
  MILD: 'mild', // 10-20C
  COLD: 'cold', // 0-10C
  FREEZING: 'freezing', // < 0C
  RAINY: 'rainy',
  HUMID: 'humid',
  DRY: 'dry',
};

export const TimeOfDay = {
  EARLY_MORNING: 'early_morning', // 5-7 AM
  MORNING: 'morning', // 7-11 AM
  MIDDAY: 'midday', // 11 AM - 2 PM
  AFTERNOON: 'afternoon', // 2-5 PM
  EVENING: 'evening', // 5-8 PM
  NIGHT: 'night', // 8-11 PM
  LATE_NIGHT: 'late_night', // 11 PM - 5 AM
};

export const Seasons = {
  SPRING: 'spring',
  SUMMER: 'summer',
  FALL: 'fall',
  WINTER: 'winter',
};

// ============================================================================
// CONTEXT GATHERING
// ============================================================================

/**
 * Gather full context for a user
 */
export async function gatherUserContext(userId, options = {}) {
  const { includeWeather = true, includeCalendar = true, location = null } = options;

  const context = {
    userId,
    gatheredAt: new Date().toISOString(),
    signals: {},
    recommendations: [],
    adjustments: {},
  };

  // Time-based context (always available)
  const timeContext = getTimeContext();
  context.signals[ContextSignals.TIME_OF_DAY] = timeContext.timeOfDay;
  context.signals[ContextSignals.DAY_OF_WEEK] = timeContext.dayOfWeek;
  context.signals[ContextSignals.SEASON] = timeContext.season;

  // Weather context
  if (includeWeather && location) {
    const weather = await getWeatherContext(location.lat, location.lng);
    if (weather) {
      context.signals[ContextSignals.WEATHER] = weather.condition;
      context.signals[ContextSignals.TEMPERATURE] = weather.temperature;
      context.adjustments.hydration = weather.hydrationMultiplier;
      context.adjustments.calories = weather.calorieMultiplier;
    }
  }

  // User state context
  const userState = await getUserStateContext(userId);
  Object.assign(context.signals, userState.signals);
  Object.assign(context.adjustments, userState.adjustments);

  // Activity context
  const activityContext = await getActivityContext(userId);
  Object.assign(context.signals, activityContext.signals);

  // Calendar context
  if (includeCalendar) {
    const calendarContext = await getCalendarContext(userId);
    Object.assign(context.signals, calendarContext.signals);
    context.recommendations.push(...calendarContext.recommendations);
  }

  // Generate contextual recommendations
  context.recommendations.push(...generateContextualRecommendations(context));

  return context;
}

/**
 * Get time-based context
 */
function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth();

  // Time of day
  let timeOfDay;
  if (hour >= 5 && hour < 7) timeOfDay = TimeOfDay.EARLY_MORNING;
  else if (hour >= 7 && hour < 11) timeOfDay = TimeOfDay.MORNING;
  else if (hour >= 11 && hour < 14) timeOfDay = TimeOfDay.MIDDAY;
  else if (hour >= 14 && hour < 17) timeOfDay = TimeOfDay.AFTERNOON;
  else if (hour >= 17 && hour < 20) timeOfDay = TimeOfDay.EVENING;
  else if (hour >= 20 && hour < 23) timeOfDay = TimeOfDay.NIGHT;
  else timeOfDay = TimeOfDay.LATE_NIGHT;

  // Season (Northern Hemisphere)
  let season;
  if (month >= 2 && month <= 4) season = Seasons.SPRING;
  else if (month >= 5 && month <= 7) season = Seasons.SUMMER;
  else if (month >= 8 && month <= 10) season = Seasons.FALL;
  else season = Seasons.WINTER;

  // Day type
  const isWeekend = day === 0 || day === 6;
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];

  return {
    hour,
    timeOfDay,
    season,
    dayOfWeek,
    isWeekend,
    date: now.toISOString().split('T')[0],
  };
}

/**
 * Get weather context from external API or cache
 */
async function getWeatherContext(lat, lng) {
  const cacheKey = `weather:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Using Open-Meteo free weather API (no API key needed)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    const temperature = current.temperature_2m;
    const humidity = current.relative_humidity_2m;
    const precipitation = current.precipitation;
    const weatherCode = current.weather_code;

    // Determine weather condition
    let condition;
    if (temperature > 30) condition = WeatherConditions.HOT;
    else if (temperature > 20) condition = WeatherConditions.WARM;
    else if (temperature > 10) condition = WeatherConditions.MILD;
    else if (temperature > 0) condition = WeatherConditions.COLD;
    else condition = WeatherConditions.FREEZING;

    // Check for rain (weather codes 51-99 indicate precipitation)
    if (weatherCode >= 51 && weatherCode <= 99) {
      condition = WeatherConditions.RAINY;
    }

    // Check humidity
    const isHumid = humidity > 70;

    // Calculate adjustments
    let hydrationMultiplier = 1.0;
    let calorieMultiplier = 1.0;

    // Hot weather = more hydration needed
    if (condition === WeatherConditions.HOT) {
      hydrationMultiplier = 1.3;
      calorieMultiplier = 0.95; // Appetite often decreases
    } else if (condition === WeatherConditions.WARM) {
      hydrationMultiplier = 1.15;
    } else if (condition === WeatherConditions.COLD || condition === WeatherConditions.FREEZING) {
      calorieMultiplier = 1.1; // Body burns more to stay warm
      hydrationMultiplier = 0.9; // Still important but less urgent
    }

    if (isHumid) {
      hydrationMultiplier *= 1.1;
    }

    const weather = {
      temperature,
      humidity,
      precipitation,
      condition,
      isHumid,
      hydrationMultiplier,
      calorieMultiplier,
      fetchedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, weather, 1800);
    return weather;
  } catch (error) {
    console.error('[Context] Weather fetch error:', error.message);
    return null;
  }
}

/**
 * Get user state context from recent logs
 */
async function getUserStateContext(userId) {
  const signals = {};
  const adjustments = {};

  try {
    // Get recent mood
    const moodResult = await db.execute(sql`
      SELECT mood, intensity, energy_level
      FROM mood_log
      WHERE user_id = ${userId}
        AND logged_date > NOW() - INTERVAL '24 hours'
      ORDER BY logged_date DESC
      LIMIT 1
    `);

    if (moodResult.rows.length > 0) {
      const mood = moodResult.rows[0];
      signals[ContextSignals.MOOD] = mood.mood;
      signals[ContextSignals.ENERGY_LEVEL] = mood.energy_level || 5;

      // Adjust recommendations based on mood
      if (mood.mood === 'stressed' || mood.mood === 'anxious') {
        adjustments.preferComfortFood = true;
        adjustments.avoidCaffeine = true;
      } else if (mood.mood === 'tired' || mood.mood === 'low') {
        adjustments.preferEnergyBoost = true;
      }
    }

    // Get hydration status
    const hydrationResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(amount_liters), 0) as total_liters,
        (SELECT water_liters FROM nutrition_goals WHERE user_id = ${userId}) as goal
      FROM water_log
      WHERE user_id = ${userId}
        AND logged_date::date = CURRENT_DATE
    `);

    if (hydrationResult.rows.length > 0) {
      const { total_liters, goal } = hydrationResult.rows[0];
      const percentage = goal > 0 ? (total_liters / goal) * 100 : 0;

      if (percentage < 30) {
        signals[ContextSignals.HYDRATION_STATUS] = 'low';
        adjustments.prioritizeHydration = true;
      } else if (percentage < 60) {
        signals[ContextSignals.HYDRATION_STATUS] = 'moderate';
      } else {
        signals[ContextSignals.HYDRATION_STATUS] = 'good';
      }
    }
  } catch (error) {
    console.error('[Context] User state error:', error.message);
  }

  return { signals, adjustments };
}

/**
 * Get activity context
 */
async function getActivityContext(userId) {
  const signals = {};

  try {
    // Get today's activity
    const activityResult = await db.execute(sql`
      SELECT
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_burned,
        MAX(logged_at) as last_activity
      FROM activity_log
      WHERE user_id = ${userId}
        AND day_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    `);

    if (activityResult.rows.length > 0) {
      const activity = activityResult.rows[0];
      const minutes = activity.total_minutes || 0;

      if (minutes > 60) {
        signals[ContextSignals.ACTIVITY_LEVEL] = 'high';
        signals[ContextSignals.RECENT_EXERCISE] = true;
      } else if (minutes > 30) {
        signals[ContextSignals.ACTIVITY_LEVEL] = 'moderate';
        signals[ContextSignals.RECENT_EXERCISE] = true;
      } else if (minutes > 0) {
        signals[ContextSignals.ACTIVITY_LEVEL] = 'light';
      } else {
        signals[ContextSignals.ACTIVITY_LEVEL] = 'sedentary';
      }

      // Check if exercise was recent (within 2 hours)
      if (activity.last_activity) {
        const hoursSince = (Date.now() - new Date(activity.last_activity).getTime()) / 3600000;
        if (hoursSince < 2) {
          signals.recentExerciseHours = Math.round(hoursSince * 10) / 10;
        }
      }
    }
  } catch (error) {
    console.error('[Context] Activity context error:', error.message);
  }

  return { signals };
}

/**
 * Get calendar context
 */
async function getCalendarContext(userId) {
  const signals = {};
  const recommendations = [];

  const cacheKey = `calendar:${userId}`;
  const cached = calendarCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Check user's calendar preferences
    const profileResult = await db.execute(sql`
      SELECT calendar_connected, calendar_provider
      FROM user_hydration_profile
      WHERE user_id = ${userId}
    `);

    if (profileResult.rows.length === 0 || !profileResult.rows[0].calendar_connected) {
      // No calendar connected - use heuristics
      const hour = new Date().getHours();
      const isWorkHours = hour >= 9 && hour <= 17;
      const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;

      if (isWorkHours && isWeekday) {
        signals[ContextSignals.BUSY_PERIOD] = 'work_hours';
        recommendations.push({
          type: 'quick_meal',
          reason: 'During work hours - suggesting quick, easy options',
        });
      }

      return { signals, recommendations };
    }

    // For connected calendars, check for upcoming events
    // This would integrate with Google Calendar or Apple Calendar APIs
    // For now, return work hour heuristics
    const hour = new Date().getHours();
    const isLunchWindow = hour >= 11 && hour <= 14;

    if (isLunchWindow) {
      signals[ContextSignals.MEAL_WINDOW] = 'lunch';
    }

    calendarCache.set(cacheKey, { signals, recommendations }, 300);
    return { signals, recommendations };
  } catch (error) {
    console.error('[Context] Calendar context error:', error.message);
    return { signals, recommendations };
  }
}

// ============================================================================
// CONTEXTUAL RECOMMENDATIONS
// ============================================================================

/**
 * Generate recommendations based on context
 */
function generateContextualRecommendations(context) {
  const recommendations = [];
  const { signals, adjustments } = context;

  // Weather-based recommendations
  if (signals[ContextSignals.WEATHER] === WeatherConditions.HOT) {
    recommendations.push({
      type: 'hydration_boost',
      priority: 'high',
      message: 'Hot weather today - increase water intake by 30%',
      foods: ['watermelon', 'cucumber', 'coconut water', 'citrus fruits'],
    });
    recommendations.push({
      type: 'food_suggestion',
      priority: 'medium',
      message: 'Light, refreshing meals work best in this heat',
      categories: ['salads', 'cold soups', 'smoothies', 'seafood'],
    });
  } else if (signals[ContextSignals.WEATHER] === WeatherConditions.COLD) {
    recommendations.push({
      type: 'food_suggestion',
      priority: 'medium',
      message: 'Warming foods to keep you cozy',
      categories: ['soups', 'stews', 'hot beverages', 'roasted vegetables'],
    });
  }

  // Time-based recommendations
  if (signals[ContextSignals.TIME_OF_DAY] === TimeOfDay.EARLY_MORNING) {
    recommendations.push({
      type: 'hydration_reminder',
      priority: 'high',
      message: 'Start your day with water - your body is dehydrated from sleep',
    });
  } else if (signals[ContextSignals.TIME_OF_DAY] === TimeOfDay.AFTERNOON) {
    if (signals[ContextSignals.ENERGY_LEVEL] < 5) {
      recommendations.push({
        type: 'energy_boost',
        priority: 'medium',
        message: 'Afternoon slump? A healthy snack can help',
        foods: ['nuts', 'fruit', 'yogurt', 'dark chocolate'],
      });
    }
  }

  // Activity-based recommendations
  if (signals[ContextSignals.RECENT_EXERCISE]) {
    recommendations.push({
      type: 'post_workout',
      priority: 'high',
      message: 'Post-workout recovery: protein + hydration',
      foods: ['protein shake', 'eggs', 'greek yogurt', 'chicken'],
    });
  }

  // Mood-based recommendations
  if (signals[ContextSignals.MOOD] === 'stressed') {
    recommendations.push({
      type: 'stress_relief',
      priority: 'medium',
      message: 'Stress-busting foods rich in magnesium',
      foods: ['dark chocolate', 'avocado', 'nuts', 'leafy greens'],
    });
  }

  // Seasonal recommendations
  if (signals[ContextSignals.SEASON] === Seasons.WINTER) {
    recommendations.push({
      type: 'seasonal',
      priority: 'low',
      message: 'Winter produce at peak freshness',
      foods: ['citrus', 'squash', 'root vegetables', 'pomegranate'],
    });
  } else if (signals[ContextSignals.SEASON] === Seasons.SUMMER) {
    recommendations.push({
      type: 'seasonal',
      priority: 'low',
      message: 'Summer produce at peak freshness',
      foods: ['berries', 'tomatoes', 'stone fruits', 'corn'],
    });
  }

  // Hydration status recommendations
  if (signals[ContextSignals.HYDRATION_STATUS] === 'low') {
    recommendations.push({
      type: 'hydration_urgent',
      priority: 'critical',
      message: 'Hydration is low - drink water now!',
    });
  }

  return recommendations;
}

// ============================================================================
// LOCATION INTELLIGENCE
// ============================================================================

/**
 * Get location-based food suggestions
 */
export async function getLocationBasedSuggestions(userId, location) {
  const { lat, lng, locationType } = location;

  const suggestions = {
    cuisineRegion: null,
    nearbyCategories: [],
    contextualTips: [],
  };

  // Determine cuisine region based on coordinates (simplified)
  suggestions.cuisineRegion = determineCuisineRegion(lat, lng);

  // Location type specific suggestions
  if (locationType === 'gym') {
    suggestions.nearbyCategories = ['protein-rich', 'post-workout', 'smoothies'];
    suggestions.contextualTips.push('Post-workout protein window: aim for 20-30g within 2 hours');
  } else if (locationType === 'work') {
    suggestions.nearbyCategories = ['quick-lunch', 'meal-prep', 'healthy-delivery'];
    suggestions.contextualTips.push('Desk lunch? Don\'t forget to take a walk after');
  } else if (locationType === 'home') {
    suggestions.nearbyCategories = ['home-cooking', 'batch-prep', 'family-meals'];
  } else if (locationType === 'restaurant') {
    suggestions.nearbyCategories = ['mindful-eating', 'portion-control'];
    suggestions.contextualTips.push('Eating out? Ask for dressing on the side');
  }

  return suggestions;
}

/**
 * Determine cuisine region from coordinates
 */
function determineCuisineRegion(lat, lng) {
  // Simplified region detection based on coordinates
  // In production, this would use a proper geocoding service

  // South Asia (India, etc.)
  if (lat >= 8 && lat <= 35 && lng >= 68 && lng <= 97) {
    return 'south_asian';
  }
  // East Asia
  if (lat >= 20 && lat <= 45 && lng >= 100 && lng <= 145) {
    return 'east_asian';
  }
  // Southeast Asia
  if (lat >= -10 && lat <= 20 && lng >= 95 && lng <= 140) {
    return 'southeast_asian';
  }
  // Middle East
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 63) {
    return 'middle_eastern';
  }
  // Europe
  if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) {
    return 'european';
  }
  // North America
  if (lat >= 25 && lat <= 72 && lng >= -170 && lng <= -50) {
    return 'american';
  }
  // Latin America
  if (lat >= -55 && lat <= 25 && lng >= -120 && lng <= -35) {
    return 'latin_american';
  }
  // Africa
  if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 55) {
    return 'african';
  }

  return 'international';
}

// ============================================================================
// CONTEXT-AWARE GOAL ADJUSTMENTS
// ============================================================================

/**
 * Get adjusted goals based on context
 */
export async function getAdjustedGoals(userId, baseGoals, context) {
  const adjustedGoals = { ...baseGoals };

  // Apply weather adjustments
  if (context.adjustments.hydration) {
    adjustedGoals.waterLiters = Math.round(baseGoals.waterLiters * context.adjustments.hydration * 10) / 10;
  }

  if (context.adjustments.calories) {
    adjustedGoals.dailyCalories = Math.round(baseGoals.dailyCalories * context.adjustments.calories);
  }

  // Apply activity adjustments
  if (context.signals[ContextSignals.ACTIVITY_LEVEL] === 'high') {
    adjustedGoals.dailyCalories = Math.round(adjustedGoals.dailyCalories * 1.15);
    adjustedGoals.proteinG = Math.round(baseGoals.proteinG * 1.2);
    adjustedGoals.waterLiters = Math.round(adjustedGoals.waterLiters * 1.2 * 10) / 10;
  }

  // Track adjustment reason
  adjustedGoals.adjustmentReasons = [];

  if (adjustedGoals.waterLiters !== baseGoals.waterLiters) {
    adjustedGoals.adjustmentReasons.push({
      goal: 'water',
      from: baseGoals.waterLiters,
      to: adjustedGoals.waterLiters,
      reason: context.signals[ContextSignals.WEATHER] || 'activity_level',
    });
  }

  if (adjustedGoals.dailyCalories !== baseGoals.dailyCalories) {
    adjustedGoals.adjustmentReasons.push({
      goal: 'calories',
      from: baseGoals.dailyCalories,
      to: adjustedGoals.dailyCalories,
      reason: context.signals[ContextSignals.ACTIVITY_LEVEL] || context.signals[ContextSignals.WEATHER],
    });
  }

  return adjustedGoals;
}

// ============================================================================
// CONTEXT API ENDPOINTS DATA
// ============================================================================

/**
 * Get context summary for API response
 */
export async function getContextSummary(userId, options = {}) {
  const context = await gatherUserContext(userId, options);

  return {
    userId,
    timestamp: context.gatheredAt,
    timeContext: {
      timeOfDay: context.signals[ContextSignals.TIME_OF_DAY],
      dayOfWeek: context.signals[ContextSignals.DAY_OF_WEEK],
      season: context.signals[ContextSignals.SEASON],
    },
    weatherContext: {
      condition: context.signals[ContextSignals.WEATHER],
      temperature: context.signals[ContextSignals.TEMPERATURE],
    },
    userState: {
      mood: context.signals[ContextSignals.MOOD],
      energyLevel: context.signals[ContextSignals.ENERGY_LEVEL],
      hydrationStatus: context.signals[ContextSignals.HYDRATION_STATUS],
      activityLevel: context.signals[ContextSignals.ACTIVITY_LEVEL],
    },
    adjustments: context.adjustments,
    recommendations: context.recommendations,
  };
}

export default {
  gatherUserContext,
  getContextSummary,
  getLocationBasedSuggestions,
  getAdjustedGoals,
  ContextSignals,
  WeatherConditions,
  TimeOfDay,
  Seasons,
};
