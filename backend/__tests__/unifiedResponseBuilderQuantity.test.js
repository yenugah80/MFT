import { buildFoodItem } from '../src/utils/unifiedResponseBuilder.js';

describe('buildFoodItem — nutritionIsPerUnit (quantity double-scaling)', () => {
  it('defaults to treating nutrition as per-unit and multiplies by quantity (existing behavior)', () => {
    const item = buildFoodItem({
      name: 'Egg',
      quantity: 3,
      nutrition: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0, sugar: 0, sodium: 60 },
    });
    expect(item.macros.calories_kcal).toBe(210);
    expect(item.perUnitNutrition.calories).toBe(70);
  });

  it('nutritionIsPerUnit: false uses the value as-is — the fix for AI sources that already scale to the stated portion', () => {
    // Real case: a vision-analyzed "3 oz grilled chicken" where the AI
    // already returns 165 kcal for the WHOLE 3oz portion (confirmed live —
    // 165 kcal / 85g ≈ 194 kcal/100g, correct for chicken breast). Without
    // this flag, buildFoodItem re-multiplied it to 495 kcal.
    const item = buildFoodItem({
      name: 'Grilled Chicken',
      quantity: 3,
      nutritionIsPerUnit: false,
      nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 60 },
    });
    expect(item.macros.calories_kcal).toBe(165);
    expect(item.macros.protein_g).toBe(31);
  });

  it('nutritionIsPerUnit: false still derives a correct per-unit value for quantity adjustment', () => {
    const item = buildFoodItem({
      name: 'Grilled Chicken',
      quantity: 3,
      nutritionIsPerUnit: false,
      nutrition: { calories: 165, protein: 30, carbs: 0, fat: 3, fiber: 0, sugar: 0, sodium: 60 },
    });
    // 165 total / 3 units = 55 per unit — what mobile's quantity adjuster needs.
    expect(item.perUnitNutrition.calories).toBe(55);
    expect(item.perUnitNutrition.protein).toBe(10);
  });

  it('a fractional quantity (e.g. "0.5 cup") is NOT halved again when nutritionIsPerUnit is false', () => {
    // Real case: quinoa reported as "111 kcal for a 0.5 cup serving" was
    // being halved to 56 by the default multiplication.
    const item = buildFoodItem({
      name: 'Quinoa',
      quantity: 0.5,
      nutritionIsPerUnit: false,
      nutrition: { calories: 111, protein: 4, carbs: 20, fat: 2, fiber: 3, sugar: 0, sodium: 5 },
    });
    expect(item.macros.calories_kcal).toBe(111);
  });
});

describe('buildFoodItem — per-item healthScore/nutriScore (meal-level stamping)', () => {
  it('computes a genuine per-item healthScore when none is provided, instead of reusing a passed-in meal-level one', () => {
    const chicken = buildFoodItem({
      name: 'Grilled Chicken',
      quantity: 3,
      nutritionIsPerUnit: false,
      nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 60 },
    });
    const onion = buildFoodItem({
      name: 'Red Onion',
      quantity: 0.3,
      nutritionIsPerUnit: false,
      nutrition: { calories: 4, protein: 0.1, carbs: 1.1, fat: 0, fiber: 0.2, sugar: 0, sodium: 1 },
    });
    // Two nutritionally very different items must not land on the same
    // healthScore purely because neither was given one explicitly — this
    // is the regression for the bug where every item in a multi-item photo
    // showed the identical meal-level score (e.g. 85 for every item).
    expect(chicken.healthScore).not.toBe(onion.healthScore);
  });

  it('an explicitly provided per-item healthScore is preserved, not overridden', () => {
    const item = buildFoodItem({
      name: 'Kale',
      quantity: 1,
      healthScore: 92,
      nutriScore: 'A',
      nutrition: { calories: 17, protein: 1.4, carbs: 3.4, fat: 0.2, fiber: 1.3, sugar: 0, sodium: 6 },
    });
    expect(item.healthScore).toBe(92);
    expect(item.nutriScore).toBe('A');
  });
});
