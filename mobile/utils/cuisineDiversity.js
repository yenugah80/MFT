/**
 * Cuisine Diversity Tracker
 * Calculates and analyzes cuisine diversity in user's meals
 */

export function calculateCuisineDiversity(mealsThisWeek) {
  if (!mealsThisWeek || mealsThisWeek.length === 0) {
    return {
      uniqueCuisines: 0,
      totalMeals: 0,
      diversityScore: 0,
      cuisineBreakdown: []
    };
  }

  const cuisines = new Set();
  const cuisineCount = {};

  mealsThisWeek.forEach(meal => {
    if (meal.cuisine) {
      cuisines.add(meal.cuisine);
      cuisineCount[meal.cuisine] = (cuisineCount[meal.cuisine] || 0) + 1;
    }
  });

  const totalMeals = mealsThisWeek.length;
  const uniqueCuisines = cuisines.size;

  // Diversity score: higher = more variety
  const diversityScore =
    totalMeals > 0 ? Math.round((uniqueCuisines / Math.sqrt(totalMeals)) * 100) : 0;

  // Create breakdown with percentages
  const cuisineBreakdown = Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cuisine, count]) => ({
      cuisine,
      count,
      percentage: Math.round((count / totalMeals) * 100)
    }));

  return {
    uniqueCuisines,
    totalMeals,
    diversityScore,
    cuisineBreakdown
  };
}

export function getCuisineDiversityInsight(diversity, userPreferences = []) {
  const { uniqueCuisines, cuisineBreakdown } = diversity;

  if (uniqueCuisines === 0) {
    return {
      type: 'info',
      icon: '🌍',
      title: 'Track Cuisine Variety',
      message: 'Start logging meals to see your cuisine diversity',
      actionRequired: false
    };
  }

  if (uniqueCuisines === 1) {
    return {
      type: 'reminder',
      icon: '🌍',
      title: 'Explore More Cuisines',
      message: `You've only tried 1 cuisine this week. Explore new flavors!`,
      actionRequired: true
    };
  }

  if (uniqueCuisines < 3) {
    const suggestions = userPreferences.filter(p =>
      !cuisineBreakdown.some(c => c.cuisine.toLowerCase() === p.toLowerCase())
    );

    return {
      type: 'reminder',
      icon: '🌍',
      title: 'Add More Variety',
      message: `You've tried ${uniqueCuisines} cuisine${uniqueCuisines > 1 ? 's' : ''} this week`,
      suggestions,
      actionRequired: true
    };
  }

  return {
    type: 'success',
    icon: '🌍',
    title: 'Great Variety!',
    message: `You've enjoyed ${uniqueCuisines} different cuisines this week 🎉`,
    actionRequired: false
  };
}

export function getCuisineColors() {
  return {
    Mediterranean: '#3B82F6',
    Asian: '#F59E0B',
    Mexican: '#EF4444',
    Indian: '#F97316',
    American: '#8B5CF6',
    Italian: '#10B981',
    'Middle Eastern': '#EC4899',
    African: '#14B8A6',
    'Default': '#6B7280'
  };
}

export function getCuisineColor(cuisine) {
  const colors = getCuisineColors();
  return colors[cuisine] || colors['Default'];
}
