/**
 * When a complex/composite dish's whole-total calories and its own
 * ingredient/component breakdown come from the same LLM response but were
 * never constrained to agree, the two can silently disagree by 15%+ (a real
 * live example: "chicken gravy curry" — components summed to 225 kcal
 * against a 180 kcal total). Rescales each component proportionally so the
 * breakdown always sums to the trusted total, preserving each component's
 * relative share of the dish rather than overwriting the total itself.
 */
export function reconcileComponentTotals(components, totalCalories, tolerance = 0.15) {
  if (!Array.isArray(components) || components.length === 0) return components;
  if (typeof totalCalories !== 'number' || totalCalories <= 0) return components;

  const componentCalories = components.reduce((sum, c) => sum + (c.calories || 0), 0);
  if (componentCalories <= 0) return components;

  const discrepancy = Math.abs(componentCalories - totalCalories) / totalCalories;
  if (discrepancy <= tolerance) return components;

  const scale = totalCalories / componentCalories;
  return components.map((c) => ({
    ...c,
    calories: Math.round((c.calories || 0) * scale),
    protein: typeof c.protein === 'number' ? Math.round(c.protein * scale * 10) / 10 : c.protein,
    carbs: typeof c.carbs === 'number' ? Math.round(c.carbs * scale * 10) / 10 : c.carbs,
    fat: typeof c.fat === 'number' ? Math.round(c.fat * scale * 10) / 10 : c.fat,
  }));
}
