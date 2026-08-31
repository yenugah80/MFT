/**
 * Extract sodium from micros object (handles multiple formats)
 * Returns sodium value in mg, or 0 if not found
 */
function extractSodiumFromMicros(micros) {
  if (!micros) return 0;

  // Try various key formats: sodium, sodium_mg, Sodium
  const sodiumKeys = ['sodium', 'sodium_mg', 'Sodium'];
  for (const key of sodiumKeys) {
    const val = micros[key];
    if (val !== undefined && val !== null) {
      // Handle both {sodium: 1700} and {sodium: {value: 1700}}
      if (typeof val === 'object' && val.value !== undefined) {
        return val.value;
      }
      if (typeof val === 'number') {
        return val;
      }
    }
  }
  return 0;
}

/**
 * Sums active items' macros/sodium/micros into one totals object, honoring
 * per-item exclusions (excludedItems, already reflected in activeItems not
 * being passed the excluded ones) and per-ingredient exclusions
 * (excludedIngredients, keyed "originalItemIndex-ingredientIndex").
 * Deliberately kept in its own file, not inline in UnifiedMealAnalysis.jsx's
 * calculatedTotals useMemo — pulling in the whole component (react-native-svg
 * et al.) just to unit-test this pure calculation isn't viable in this
 * project's test setup, and useFoodAnalysis.js's subtractIngredientFromItem
 * and computeIngredientNutrition.js already use this same standalone-file
 * pattern for the identical reason.
 */
export function calculateActiveItemTotals(items, activeItems, excludedItems, excludedIngredients) {
  const activeIndices = items.map((_, idx) => idx).filter(idx => !excludedItems.has(idx));

  return activeItems.reduce((acc, item, arrIdx) => {
    const macros = item.macros || {};
    const itemMicros = item.micros || {};
    const originalIndex = activeIndices[arrIdx]; // Map back to original index

    // Start with item's base macros
    let itemCalories = macros.calories_kcal || macros.calories || 0;
    let itemProtein = macros.protein_g || macros.protein || 0;
    let itemCarbs = macros.carbs_g || macros.carbs || 0;
    let itemFat = macros.fat_g || macros.fat || 0;
    let itemFiber = macros.fiber_g || macros.fiber || 0;
    let itemSugar = macros.sugar_g || macros.sugar || 0;

    // Get sodium from macros first, fallback to micros
    let itemSodium = macros.sodium_mg || macros.sodium || 0;
    if (itemSodium === 0) {
      itemSodium = extractSodiumFromMicros(itemMicros);
    }
    // Start from the item's own micros; excluded ingredients subtract
    // their share below, same as the macros they already subtract.
    const runningMicros = {};
    Object.entries(itemMicros).forEach(([key, val]) => {
      const numVal = typeof val === 'object' ? val.value : val;
      runningMicros[key] = { value: numVal || 0, unit: typeof val === 'object' ? val.unit : 'mg' };
    });

    // Subtract excluded ingredients' nutrients — calories/macros AND
    // sodium/micros. Sodium and micros were previously left out here:
    // excluding a high-sodium or high-micro ingredient (soy sauce,
    // cheese, cured meat) correctly dropped the visible macros but left
    // sodium and every micronutrient at the full pre-exclusion total,
    // the exact inconsistency already fixed in useFoodAnalysis.js's
    // subtractIngredientFromItem and computeIngredientNutrition.js — this
    // was the one recompute engine still missing it.
    const itemIngredients = item.ingredients || [];
    itemIngredients.forEach((ing, ingIdx) => {
      const ingKey = `${originalIndex}-${ingIdx}`;
      if (excludedIngredients.has(ingKey)) {
        itemCalories -= ing.calories || 0;
        itemProtein -= ing.protein || 0;
        itemCarbs -= ing.carbs || 0;
        itemFat -= ing.fat || 0;
        itemFiber -= ing.fiber || 0;
        itemSugar -= ing.sugar || 0;

        const ingSodium = ing.sodium || ing.sodium_mg || 0;
        itemSodium = Math.max(0, itemSodium - ingSodium);

        const ingMicros = ing.micros || {};
        Object.entries(ingMicros).forEach(([key, val]) => {
          const numVal = typeof val === 'object' ? val.value : val;
          if (runningMicros[key]) {
            runningMicros[key].value = Math.max(0, runningMicros[key].value - (numVal || 0));
          }
        });
      }
    });

    // Ensure we don't go negative
    acc.calories += Math.max(0, itemCalories);
    acc.protein += Math.max(0, itemProtein);
    acc.carbs += Math.max(0, itemCarbs);
    acc.fat += Math.max(0, itemFat);
    acc.fiber += Math.max(0, itemFiber);
    acc.sugar += Math.max(0, itemSugar);
    acc.sodium += itemSodium;

    // Aggregate this item's post-exclusion micros into the running total
    Object.entries(runningMicros).forEach(([key, { value, unit }]) => {
      if (!acc.micros[key]) {
        acc.micros[key] = { value: 0, unit };
      }
      acc.micros[key].value += value;
    });

    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, micros: {} });
}
