/**
 * Dietary Compliance Calculations
 * Calculates how well today's meals match user preferences
 */

export function calculateDietaryComplianceScore(todaysMeals, userPreferences) {
  if (!todaysMeals || todaysMeals.length === 0) {
    return 100; // No meals logged = perfect compliance
  }

  const { dietaryPreferences = [], allergies = [] } = userPreferences || {};

  let totalScore = 0;
  let maxScore = 0;

  todaysMeals.forEach(meal => {
    // Check allergen violations (CRITICAL - 0 points if present)
    const mealAllergens = meal.allergens || [];
    const hasAllergen = mealAllergens.some(a => allergies.includes(a));

    if (hasAllergen) {
      maxScore += 100;
      totalScore += 0; // Critical violation
      return;
    }

    // Check dietary preference compliance
    const mealDietLabels = meal.dietLabels || [];
    const matchingPrefs = dietaryPreferences.filter(pref => {
      const prefId = typeof pref === 'string' ? pref : pref.id;
      return mealDietLabels.includes(prefId);
    });

    // Weight by preference strength if available
    let strength = 3; // default
    if (dietaryPreferences.length > 0 && typeof dietaryPreferences[0] === 'object') {
      strength = dietaryPreferences[0].strength || 3;
    }

    const compliancePoints =
      dietaryPreferences.length > 0
        ? (matchingPrefs.length / dietaryPreferences.length) * 100
        : 100;

    const weightedPoints = (compliancePoints * strength) / 5;

    totalScore += weightedPoints;
    maxScore += 100;
  });

  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;
}

export function getComplianceLevel(score) {
  if (score >= 90) {
    return {
      level: 'Excellent',
      color: '#10B981',
      emoji: '🌟',
      message: 'Perfect alignment with your preferences!'
    };
  }
  if (score >= 75) {
    return {
      level: 'Good',
      color: '#3B82F6',
      emoji: '👍',
      message: 'Great job following your preferences'
    };
  }
  if (score >= 60) {
    return {
      level: 'Fair',
      color: '#F59E0B',
      emoji: '⚠️',
      message: 'Consider adjusting your meals'
    };
  }
  return {
    level: 'Needs Attention',
    color: '#EF4444',
    emoji: '❗',
    message: 'Time to realign with your preferences'
  };
}
