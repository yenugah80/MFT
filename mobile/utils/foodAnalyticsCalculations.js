/**
 * Food Analytics Calculation Utilities
 *
 * Pure functions for calculating food analytics metrics.
 * Extracted for testability and reuse.
 */

/**
 * Normalize food name for better matching
 * Handles variations like "Grilled Chicken" vs "chicken"
 *
 * @param {string} name - Food name to normalize
 * @returns {string} Normalized food name
 */
export const normalizeFood = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/^(grilled|baked|fried|steamed|roasted|fresh|organic)\s+/i, '')
    // Remove portion descriptors
    .replace(/\s+(small|medium|large|slice|piece|cup|bowl)$/i, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
};

/**
 * Calculate weekly trends from food logs
 *
 * @param {Array} logs - Array of food log entries with timestamp, calories, protein
 * @returns {Object} Weekly trends data with days array and averages
 */
export const calculateWeeklyTrends = (logs = []) => {
  const now = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayLogs = logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= date && logDate < nextDay;
    });

    const totalCalories = dayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
    const totalProtein = dayLogs.reduce((sum, log) => sum + (log.protein || 0), 0);

    days.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      mealsCount: dayLogs.length,
    });
  }

  const maxCalories = Math.max(...days.map((d) => d.calories), 1);
  const avgCalories = Math.round(days.reduce((sum, d) => sum + d.calories, 0) / 7);
  const avgProtein = Math.round(days.reduce((sum, d) => sum + d.protein, 0) / 7);

  return { days, maxCalories, avgCalories, avgProtein };
};

/**
 * Calculate top foods from food logs
 *
 * @param {Array} logs - Array of food log entries
 * @param {number} limit - Maximum number of top foods to return
 * @returns {Array} Top foods sorted by frequency
 */
export const calculateTopFoods = (logs = [], limit = 5) => {
  const foodCounts = {};

  logs.forEach((log) => {
    const rawName = (log.foodName || '').trim();
    if (!rawName) return;

    const normalizedKey = normalizeFood(rawName);
    if (!normalizedKey) return;

    if (!foodCounts[normalizedKey]) {
      foodCounts[normalizedKey] = {
        name: rawName,
        normalizedKey,
        count: 0,
        totalCalories: 0,
        totalProtein: 0,
        lastLogged: log.timestamp,
      };
    }

    foodCounts[normalizedKey].count++;
    foodCounts[normalizedKey].totalCalories += log.calories || 0;
    foodCounts[normalizedKey].totalProtein += log.protein || 0;

    // Keep the most recent name variation for display
    if (log.timestamp > foodCounts[normalizedKey].lastLogged) {
      foodCounts[normalizedKey].lastLogged = log.timestamp;
      foodCounts[normalizedKey].name = rawName;
    }
  });

  return Object.values(foodCounts)
    .map((f) => ({
      ...f,
      avgCalories: Math.round(f.totalCalories / f.count),
      avgProtein: Math.round(f.totalProtein / f.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Calculate meal timing insights from food logs
 *
 * @param {Array} logs - Array of food log entries with timestamps
 * @returns {Object|null} Meal timing insights or null if insufficient data
 */
export const calculateMealTimingInsights = (logs = []) => {
  if (logs.length < 3) return null;

  const hourBuckets = Array(24).fill(0);

  logs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    hourBuckets[hour]++;
  });

  // Find peak eating hours (top 3)
  const peakHours = hourBuckets
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  };

  const getMealType = (hour) => {
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 15) return 'Lunch';
    if (hour >= 15 && hour < 18) return 'Snack';
    if (hour >= 18 && hour < 22) return 'Dinner';
    return 'Late Night';
  };

  return {
    peakHours: peakHours.map((h) => ({
      hour: h.hour,
      label: formatHour(h.hour),
      mealType: getMealType(h.hour),
      count: h.count,
    })),
    totalMeals: logs.length,
  };
};

/**
 * Calculate goal adherence score
 *
 * @param {Array} logs - Array of food log entries
 * @param {Object} goals - User's nutrition goals
 * @param {number} goals.calorieGoal - Daily calorie goal
 * @param {number} goals.proteinGoal - Daily protein goal (g)
 * @param {number} goals.carbsGoal - Daily carbs goal (g)
 * @param {number} goals.fatGoal - Daily fat goal (g)
 * @returns {Object|null} Goal adherence data or null if insufficient data
 */
export const calculateGoalAdherence = (logs = [], goals = {}) => {
  const { calorieGoal = 2000, proteinGoal = 120, carbsGoal = 250, fatGoal = 65 } = goals;

  // Group logs by day
  const dayMap = {};
  logs.forEach((log) => {
    const date = new Date(log.timestamp);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString();

    if (!dayMap[dateKey]) {
      dayMap[dateKey] = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealsCount: 0,
      };
    }

    dayMap[dateKey].calories += log.calories || 0;
    dayMap[dateKey].protein += log.protein || 0;
    dayMap[dateKey].carbs += log.carbs || 0;
    dayMap[dateKey].fat += log.fat || log.fats || 0;
    dayMap[dateKey].mealsCount++;
  });

  const daysWithLogs = Object.values(dayMap).filter((d) => d.mealsCount > 0);
  if (daysWithLogs.length < 3) return null;

  // Calorie target: 80-110% of goal
  const calorieDaysHit = daysWithLogs.filter(
    (d) => d.calories >= calorieGoal * 0.8 && d.calories <= calorieGoal * 1.1
  ).length;

  // Macro targets: at least 80% for protein, 70% for carbs/fat
  const proteinDaysHit = daysWithLogs.filter((d) => d.protein >= proteinGoal * 0.8).length;
  const carbsDaysHit = daysWithLogs.filter((d) => d.carbs >= carbsGoal * 0.7).length;
  const fatDaysHit = daysWithLogs.filter((d) => d.fat >= fatGoal * 0.7).length;

  const calorieAdherence = Math.round((calorieDaysHit / daysWithLogs.length) * 100);
  const proteinAdherence = Math.round((proteinDaysHit / daysWithLogs.length) * 100);
  const carbsAdherence = Math.round((carbsDaysHit / daysWithLogs.length) * 100);
  const fatAdherence = Math.round((fatDaysHit / daysWithLogs.length) * 100);

  // Overall: weighted average (calories and protein more important)
  const overallAdherence = Math.round(
    calorieAdherence * 0.35 + proteinAdherence * 0.35 + carbsAdherence * 0.15 + fatAdherence * 0.15
  );

  return {
    overall: overallAdherence,
    calories: calorieAdherence,
    protein: proteinAdherence,
    carbs: carbsAdherence,
    fat: fatAdherence,
    daysTracked: daysWithLogs.length,
    calorieGoal,
    proteinGoal,
    carbsGoal,
    fatGoal,
  };
};

/**
 * Identify nutritional gaps from micronutrient data
 *
 * @param {Array} microItems - Array of micronutrient items with percentage
 * @param {number} threshold - Percentage threshold for gaps (default 50)
 * @param {number} limit - Maximum gaps to return
 * @returns {Array} Nutritional gaps below threshold
 */
export const identifyNutritionalGaps = (microItems = [], threshold = 50, limit = 3) => {
  return microItems
    .filter((micro) => micro.percentage < threshold)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, limit);
};
