/**
 * Health Calculations Utility
 * Centralized logic for food-mood scoring, insights, and recommendations
 */

/**
 * Calculate Food-Mood Correlation Score (0-100)
 *
 * Factors:
 * - Calorie goal adherence (30%)
 * - Protein intake (20%)
 * - Hydration (25%)
 * - Micronutrient diversity (15%)
 * - Mood intensity (10%)
 *
 * @param {Object} params - Calculation parameters
 * @returns {number} Score from 0-100
 */
export const calculateFoodMoodScore = ({
  calories = 0,
  calorieGoal = 2000,
  protein = 0,
  proteinGoal = 150,
  hydrationPercent = 0,
  micronutrientCount = 0,
  moodIntensity = null,
}) => {
  let score = 0;

  // 1. Calorie Adherence (30 points max)
  if (calorieGoal > 0) {
    const calorieRatio = calories / calorieGoal;
    if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
      score += 30; // Perfect range
    } else if (calorieRatio >= 0.8 && calorieRatio <= 1.2) {
      score += 20; // Good range
    } else if (calorieRatio >= 0.6 && calorieRatio <= 1.4) {
      score += 10; // Acceptable
    }
  }

  // 2. Protein Intake (20 points max)
  if (proteinGoal > 0) {
    const proteinRatio = protein / proteinGoal;
    if (proteinRatio >= 0.9) {
      score += 20;
    } else if (proteinRatio >= 0.7) {
      score += 15;
    } else if (proteinRatio >= 0.5) {
      score += 10;
    } else if (proteinRatio > 0) {
      score += 5;
    }
  }

  // 3. Hydration (25 points max)
  if (hydrationPercent >= 100) {
    score += 25;
  } else if (hydrationPercent >= 80) {
    score += 20;
  } else if (hydrationPercent >= 60) {
    score += 15;
  } else if (hydrationPercent >= 40) {
    score += 10;
  } else if (hydrationPercent > 0) {
    score += 5;
  }

  // 4. Micronutrient Diversity (15 points max)
  if (micronutrientCount >= 10) {
    score += 15;
  } else if (micronutrientCount >= 6) {
    score += 10;
  } else if (micronutrientCount >= 3) {
    score += 5;
  }

  // 5. Mood Bonus (10 points max)
  if (moodIntensity !== null) {
    if (moodIntensity >= 4) {
      score += 10;
    } else if (moodIntensity >= 3) {
      score += 5;
    }
  }

  return Math.round(Math.min(score, 100));
};

/**
 * Generate personalized story line based on daily data
 * Shows actual numbers and specific data points for real, personalized insights
 *
 * @param {Object} dayData - Day's nutrition and wellness data
 * @returns {string} Story line text
 */
export const generateStoryLine = (dayData) => {
  const {
    calories = 0,
    calorieGoal = 2000,
    meals = 0,
    goalReached = false,
    moodAvg = null,
    hydrationPercent = 0,
    protein = 0,
    proteinGoal = 150,
    carbs = 0,
    fat = 0,
    water = 0,
    waterGoal = 2.5,
  } = dayData;

  const calorieRatio = calorieGoal > 0 ? calories / calorieGoal : 0;
  const proteinRatio = proteinGoal > 0 ? protein / proteinGoal : 0;
  const caloriesRemaining = Math.max(0, calorieGoal - calories);
  const proteinRemaining = Math.max(0, proteinGoal - protein);

  // Helper to format mood description
  const getMoodDesc = (avg) => {
    if (avg >= 4.5) return 'great';
    if (avg >= 4) return 'good';
    if (avg >= 3) return 'okay';
    if (avg >= 2) return 'low';
    return 'very low';
  };

  // No data scenario - check ALL data sources including calories
  if (calories === 0 && meals === 0 && hydrationPercent === 0 && moodAvg == null) {
    return "No data logged for this day.";
  }

  // Perfect day - show actual achievements
  if (goalReached && hydrationPercent >= 80 && moodAvg != null && moodAvg >= 4) {
    return `${Math.round(calories)} cal consumed, ${Math.round(protein)}g protein, ${Math.round(hydrationPercent)}% hydrated. Mood was ${getMoodDesc(moodAvg)}. A well-balanced day!`;
  }

  // Good nutrition, good mood - show the numbers
  if (goalReached && moodAvg != null && moodAvg >= 4) {
    return `You hit ${Math.round(calories)} cal (${Math.round(calorieRatio * 100)}% of goal) with ${Math.round(protein)}g protein. Mood: ${getMoodDesc(moodAvg)}.`;
  }

  // Good nutrition, low mood - specific data
  if (goalReached && moodAvg != null && moodAvg < 3) {
    const hydrationNote = hydrationPercent < 60
      ? `Only ${Math.round(hydrationPercent)}% hydrated - this may have affected mood.`
      : 'Consider non-nutritional factors.';
    return `Nutrition on track (${Math.round(calories)} cal, ${Math.round(protein)}g protein) but mood was ${getMoodDesc(moodAvg)}. ${hydrationNote}`;
  }

  // High protein, high mood - show protein achievement
  if (proteinRatio >= 0.9 && moodAvg != null && moodAvg >= 4) {
    return `Strong protein day: ${Math.round(protein)}g of ${proteinGoal}g goal (${Math.round(proteinRatio * 100)}%). Mood was ${getMoodDesc(moodAvg)}.`;
  }

  // Undereating - show actual numbers
  if (calorieRatio < 0.7 && calorieRatio > 0) {
    const mealInfo = meals > 0 ? ` from ${meals} meal${meals > 1 ? 's' : ''}` : '';
    const moodNote = moodAvg != null ? ` Mood: ${getMoodDesc(moodAvg)}.` : '';
    return `${Math.round(calories)} of ${calorieGoal} cal${mealInfo} (${caloriesRemaining} cal short).${moodNote}`;
  }

  // Overeating - show specific numbers
  if (calorieRatio > 1.3) {
    const overBy = Math.round(calories - calorieGoal);
    const moodNote = moodAvg != null && moodAvg < 3 ? ` Mood was ${getMoodDesc(moodAvg)}.` : '';
    return `${Math.round(calories)} cal consumed (+${overBy} over ${calorieGoal} goal).${moodNote}`;
  }

  // Low hydration impact - show water data
  if (hydrationPercent < 40 && hydrationPercent > 0 && moodAvg != null && moodAvg < 3) {
    const waterAmount = water > 0 ? `${water.toFixed(1)}L` : `${Math.round(hydrationPercent)}%`;
    return `Only ${waterAmount} water logged. Low hydration may have impacted your ${getMoodDesc(moodAvg)} mood.`;
  }

  // Decent day with meals - show full breakdown
  if (meals > 0 || calories > 0) {
    const parts = [];

    if (calories > 0) {
      parts.push(`${Math.round(calories)} cal (${Math.round(calorieRatio * 100)}%)`);
    }
    if (protein > 0) {
      parts.push(`${Math.round(protein)}g protein`);
    }
    if (hydrationPercent > 0) {
      parts.push(`${Math.round(hydrationPercent)}% hydrated`);
    }
    if (moodAvg != null) {
      parts.push(`mood: ${getMoodDesc(moodAvg)}`);
    }

    if (parts.length > 0) {
      const summary = parts.join(', ');
      const goalStatus = goalReached ? ' Goal reached!' : '';
      return `${summary}.${goalStatus}`;
    }
  }

  // Partial data - be specific about what was logged
  const logged = [];
  if (calories > 0) logged.push(`${Math.round(calories)} cal`);
  if (hydrationPercent > 0) logged.push(`${Math.round(hydrationPercent)}% water`);
  if (moodAvg != null) logged.push(`mood logged`);

  if (logged.length > 0) {
    return `Partial log: ${logged.join(', ')}.`;
  }

  return "Partial data logged for this day.";
};

/**
 * Generate smart insights based on patterns
 *
 * @param {Object} params - Analysis parameters
 * @returns {Array} Array of insight objects
 */
export const generateInsights = ({
  currentCalories,
  calorieGoal,
  currentProtein,
  proteinGoal,
  currentHydration,
  hydrationGoal,
  streak,
  timeOfDay,
}) => {
  const insights = [];
  const hour = timeOfDay || new Date().getHours();

  // Calorie insights
  const caloriePercent = (currentCalories / calorieGoal) * 100;
  if (hour >= 18 && caloriePercent < 60) {
    insights.push({
      type: 'warning',
      icon: 'alert-circle',
      title: 'Low calorie intake',
      message: `You're at ${Math.round(caloriePercent)}% of your daily goal. Consider a balanced dinner to meet your target.`,
      action: 'Log Dinner',
    });
  }

  // Protein insights
  const proteinPercent = (currentProtein / proteinGoal) * 100;
  if (hour >= 12 && proteinPercent < 30) {
    insights.push({
      type: 'info',
      icon: 'barbell',
      title: 'Boost your protein',
      message: `Only ${Math.round(currentProtein)}g of ${proteinGoal}g protein consumed. Add a protein-rich lunch or snack.`,
      action: 'View High-Protein Foods',
    });
  }

  // Hydration insights
  const hydrationPercent = (currentHydration / hydrationGoal) * 100;
  if (hour >= 16 && hydrationPercent < 40) {
    insights.push({
      type: 'reminder',
      icon: 'water',
      title: 'Stay hydrated',
      message: `You've logged ${currentHydration}L of ${hydrationGoal}L. Hydration impacts energy and focus.`,
      action: 'Log Water',
    });
  }

  // Streak insights
  if (streak >= 7 && hour >= 20 && currentCalories === 0) {
    insights.push({
      type: 'urgent',
      icon: 'flame',
      title: 'Streak at risk!',
      message: `You have a ${streak}-day streak. Don't forget to log today's meals before midnight!`,
      action: 'Quick Log',
    });
  }

  return insights;
};

/**
 * Calculate macro distribution quality
 *
 * @param {Object} macros - Current macro intake
 * @returns {Object} Quality assessment
 */
export const assessMacroBalance = ({ protein, carbs, fat }) => {
  const total = protein * 4 + carbs * 4 + fat * 9;

  if (total <= 0) {
    return {
      quality: 'none',
      message: 'No macronutrients logged yet',
      score: 0,
      distribution: {
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    };
  }

  const proteinPercent = ((protein * 4) / total) * 100;
  const carbsPercent = ((carbs * 4) / total) * 100;
  const fatPercent = ((fat * 9) / total) * 100;

  // Ideal ranges: Protein 25-35%, Carbs 40-60%, Fat 20-35%
  const proteinIdeal = proteinPercent >= 25 && proteinPercent <= 35;
  const carbsIdeal = carbsPercent >= 40 && carbsPercent <= 60;
  const fatIdeal = fatPercent >= 20 && fatPercent <= 35;

  let score = 0;
  if (proteinIdeal) score += 33;
  if (carbsIdeal) score += 34;
  if (fatIdeal) score += 33;

  let quality = 'poor';
  let message = 'Macro balance needs improvement';

  if (score >= 80) {
    quality = 'excellent';
    message = 'Perfect macro distribution!';
  } else if (score >= 60) {
    quality = 'good';
    message = 'Good macro balance overall';
  } else if (score >= 40) {
    quality = 'fair';
    message = 'Macro balance could be better';
  }

  return {
    quality,
    message,
    score,
    distribution: {
      protein: Math.round(proteinPercent),
      carbs: Math.round(carbsPercent),
      fat: Math.round(fatPercent),
    },
  };
};
