/**
 * Allergen Detection
 * Scans meals for user's allergens and generates warnings
 */

export function scanMealsForAllergens(meals, userAllergies) {
  if (!meals || meals.length === 0 || !userAllergies || userAllergies.length === 0) {
    return [];
  }

  const warnings = [];

  meals.forEach(meal => {
    const mealAllergens = meal.allergens || [];
    const detectedAllergens = mealAllergens.filter(a =>
      userAllergies.includes(a)
    );

    if (detectedAllergens.length > 0) {
      warnings.push({
        id: meal.id || `meal-${Math.random()}`,
        meal: meal.foodName || 'Unknown meal',
        allergens: detectedAllergens,
        loggedAt: meal.loggedDate,
        severity: 'critical',
        mealId: meal.id
      });
    }
  });

  return warnings;
}

export function generateAllergenInsight(warnings) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const allergenCount = [...new Set(warnings.flatMap(w => w.allergens))].length;

  return {
    type: 'urgent',
    icon: 'alert-circle',
    title: '⚠️ Allergen Detected!',
    message: `${warnings.length} meal(s) contain your allergen${warnings.length > 1 ? 's' : ''}`,
    details: `${allergenCount} allergen type${allergenCount > 1 ? 's' : ''} found`,
    warnings,
    severity: 'critical'
  };
}

export function getAllergenSeverity(allergens, userAllergies) {
  if (!allergens || !userAllergies) return null;

  const detectedAllergens = allergens.filter(a =>
    userAllergies.includes(a)
  );

  if (detectedAllergens.length === 0) return null;

  return {
    hasAllergen: true,
    allergens: detectedAllergens,
    message: `Contains: ${detectedAllergens.join(', ')}`
  };
}
