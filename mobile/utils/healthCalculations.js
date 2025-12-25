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
  } = dayData;

  const calorieRatio = calories / calorieGoal;
  const proteinRatio = protein / proteinGoal;

  // No data scenario
  if (meals === 0 && hydrationPercent === 0 && moodAvg == null) {
    return "No data logged for this day.";
  }

  // Perfect day
  if (goalReached && hydrationPercent >= 80 && moodAvg != null && moodAvg >= 4) {
    return "Perfect balance! Great nutrition and hydration led to a positive mood. Keep this momentum going!";
  }

  // Good nutrition, good mood
  if (goalReached && moodAvg != null && moodAvg >= 4) {
    return "Excellent day! You hit your calorie goal and felt great. Your nutrition choices supported your wellbeing.";
  }

  // Good nutrition, low mood
  if (goalReached && moodAvg != null && moodAvg < 3) {
    return `You hit your nutrition goals, but mood was lower. ${hydrationPercent < 60 ? 'Try increasing water intake' : 'Consider stress factors beyond nutrition'}.`;
  }

  // High protein, high mood
  if (proteinRatio >= 0.9 && moodAvg != null && moodAvg >= 4) {
    return "High protein intake correlated with positive mood. Your muscle recovery and energy levels benefited!";
  }

  // Undereating
  if (calorieRatio < 0.7) {
    return `Significantly under calorie goal (${Math.round(calorieRatio * 100)}%). This may impact energy levels and mood tomorrow.`;
  }

  // Overeating
  if (calorieRatio > 1.3) {
    return `Above calorie goal (${Math.round(calorieRatio * 100)}%). ${moodAvg != null && moodAvg < 3 ? 'This may have contributed to lower energy' : 'Balance out with lighter meals tomorrow'}.`;
  }

  // Low hydration impact
  if (hydrationPercent < 40 && moodAvg != null && moodAvg < 3) {
    return "Low hydration detected. Dehydration can significantly impact mood and cognitive function. Try drinking more water!";
  }

  // Decent day
  if (meals > 0) {
    const moodText = moodAvg != null ? (moodAvg >= 3.5 ? 'positive' : 'moderate') : '';
    return `You logged ${meals} meal${meals > 1 ? 's' : ''} today${moodText ? ` with ${moodText} mood` : ''}. ${goalReached ? 'Goal achieved!' : 'Keep tracking!'}`;
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
