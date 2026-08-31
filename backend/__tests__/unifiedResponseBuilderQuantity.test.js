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

describe('buildFoodItem — portion.isEstimated / gramsEquivalent forwarding (Stage 8e)', () => {
  // buildFoodItem previously rebuilt `portion` from scratch with only
  // amount/unit/servingText, silently dropping both fields even when the
  // raw item (every barcode/photo/multimodal/voice item routes through
  // this function via buildUnifiedResponse) had them. Two real
  // consequences: mobile's "estimated quantity" badge had nothing to read
  // for these input modes, and useFoodAnalysis.js's updateItemQuantity()
  // requires gramsEquivalent to do anything at all — it silently refused
  // to work for every item from these modes.
  it('forwards gramsEquivalent from raw.portion', () => {
    const item = buildFoodItem({
      name: 'Chicken curry',
      quantity: 1,
      portion: { amount: 1, unit: 'serving', gramsEquivalent: 250 },
      nutrition: { calories: 300, protein: 20, carbs: 10, fat: 15, fiber: 2, sugar: 1, sodium: 400 },
    });
    expect(item.portion.gramsEquivalent).toBe(250);
  });

  it('forwards isEstimated from raw.portion when explicitly false (a confirmed quantity)', () => {
    const item = buildFoodItem({
      name: 'Banana',
      quantity: 1,
      portion: { amount: 1, unit: 'banana', gramsEquivalent: 118, isEstimated: false },
      nutrition: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
    });
    expect(item.portion.isEstimated).toBe(false);
  });

  it('defaults isEstimated to true when neither raw.portion nor raw.canonical.portion say otherwise', () => {
    const item = buildFoodItem({
      name: 'Mystery item',
      quantity: 1,
      nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5, fiber: 1, sugar: 1, sodium: 50 },
    });
    expect(item.portion.isEstimated).toBe(true);
  });

  it('reads isEstimated from raw.canonical.portion as a fallback (the voiceLog.js/food.js shape)', () => {
    const item = buildFoodItem({
      name: 'Rice',
      quantity: 1,
      canonical: { portion: { isEstimated: false } },
      nutrition: { calories: 200, protein: 4, carbs: 44, fat: 0.5, fiber: 1, sugar: 0, sodium: 5 },
    });
    expect(item.portion.isEstimated).toBe(false);
  });
});
