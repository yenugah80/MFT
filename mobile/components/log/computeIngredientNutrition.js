/**
 * Pure ingredient-edit nutrition calculation, kept separate from
 * EditableIngredientsSection.jsx (React Native component) so it's
 * unit-testable without an RN rendering environment.
 */

function addContribution(totals, micros, source) {
  totals.calories += source.calories || 0;
  totals.protein += source.macros?.protein ?? source.protein ?? 0;
  totals.carbs += source.macros?.carbs ?? source.carbs ?? 0;
  totals.fat += source.macros?.fat ?? source.fat ?? 0;
  totals.fiber += source.macros?.fiber ?? source.fiber ?? 0;
  totals.sugar += source.macros?.sugar ?? source.sugar ?? 0;
  totals.sodium += source.macros?.sodium ?? source.sodium ?? 0;
  const sourceMicros = source.micros;
  if (sourceMicros) {
    for (const [key, val] of Object.entries(sourceMicros)) {
      const numVal = typeof val === 'object' ? val?.value : val;
      if (typeof numVal !== 'number') continue;
      if (!micros[key]) micros[key] = { value: 0, unit: typeof val === 'object' ? val.unit : undefined };
      micros[key].value += numVal;
    }
  }
}

/**
 * Sums the active (non-removed) ingredients plus selected add-ons into a
 * complete nutrition object — every macro field, not just
 * calories/protein/carbs/fat/fiber, plus micros.
 */
export function computeIngredientNutrition({ ingredients, optionalAddOns, removedIngredients, addedAddOns }) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  const micros = {};

  for (const ing of ingredients || []) {
    if (!removedIngredients.has(ing.name)) addContribution(totals, micros, ing);
  }
  for (const addOnName of addedAddOns || []) {
    const addOn = (optionalAddOns || []).find((a) => a.name === addOnName);
    if (addOn) addContribution(totals, micros, addOn);
  }

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    sugar: Math.round(totals.sugar * 10) / 10,
    sodium: Math.round(totals.sodium),
    micros,
  };
}

/** Builds the onNutritionChange payload in the app-wide canonical shape. */
export function buildIngredientEditPayload(currentNutrition, { removedIngredients, addedAddOns }) {
  return {
    calories: currentNutrition.calories,
    macros: {
      calories_kcal: currentNutrition.calories,
      protein_g: currentNutrition.protein,
      carbs_g: currentNutrition.carbs,
      fat_g: currentNutrition.fat,
      fiber_g: currentNutrition.fiber,
      sugar_g: currentNutrition.sugar,
      sodium_mg: currentNutrition.sodium,
    },
    micros: currentNutrition.micros,
    isModified: true,
    ingredientsChanged: true,
    removedIngredients: Array.from(removedIngredients),
    addedAddOns: Array.from(addedAddOns),
  };
}
