import { aggregateNutrition, buildMealFeelingPayload, scaleNutritionByQuantity } from '../components/log/MealSummary/aggregateNutrition';

describe('aggregateNutrition — multi-item meal scoring input', () => {
  it('feeds MealScoreDial the whole-meal aggregate, not just the first item', () => {
    // Regression case: rice (first item, 0g fat) + tomato pappu/dal (second
    // item, real fat/protein/fiber). Previously `item` was
    // analysisResult.items[0] — the meal score was computed from the rice
    // alone, not the combined meal.
    const analysisResult = {
      items: [
        { name: 'Cooked rice', macros: { calories_kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 2 }, micros: {}, confidence: 0.8 },
        { name: 'Tomato pappu', macros: { calories_kcal: 180, protein_g: 10, carbs_g: 30, fat_g: 3, fiber_g: 8, sugar_g: 4, sodium_mg: 748 }, micros: { vitaminA: 300 }, confidence: 0.7 },
      ],
      totals: {
        macros: { calories_kcal: 385, protein_g: 14, carbs_g: 75, fat_g: 3, fiber_g: 8.6, sugar_g: 4.1, sodium_mg: 750 },
        micros: { vitaminA: { value: 300, unit: 'µg' } },
      },
    };

    const nutrition = aggregateNutrition(analysisResult);

    // The synthetic "item" handed to MealScoreDial must reflect the full
    // meal's macros, not items[0]'s.
    expect(nutrition.item.macros.calories_kcal).toBe(385);
    expect(nutrition.item.macros.protein_g).toBe(14);
    expect(nutrition.item.macros.fat_g).toBe(3);
    expect(nutrition.item.macros.fiber_g).toBeCloseTo(8.6);

    // Not the first item's numbers.
    expect(nutrition.item.macros.calories_kcal).not.toBe(205);
    expect(nutrition.item.macros.fat_g).not.toBe(0);
  });

  it('averages confidence across all items, not just the first', () => {
    const analysisResult = {
      items: [
        { macros: {}, micros: {}, confidence: 0.9 },
        { macros: {}, micros: {}, confidence: 0.5 },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.confidence).toBeCloseTo(0.7);
    expect(nutrition.item.confidence).toBeCloseTo(0.7);
  });

  it('prefers the backend canonical totals.micros over re-deriving from items', () => {
    const analysisResult = {
      items: [
        { macros: {}, micros: { vitaminA: 999 } }, // if re-derived, would wrongly dominate
        { macros: {}, micros: {} },
      ],
      totals: {
        macros: {},
        micros: { vitaminA: { value: 500, unit: 'µg' } },
      },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.micros.vitaminA).toEqual({ value: 500, unit: 'µg' });
  });

  it('falls back to re-deriving micros from items when totals.micros is empty (backward compatibility)', () => {
    const analysisResult = {
      items: [
        { macros: {}, micros: { calcium: { value: 100, unit: 'mg' } } },
        { macros: {}, micros: { calcium: { value: 50, unit: 'mg' } } },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.micros.calcium.value).toBe(150);
  });

  it('single-item meals return the item directly without touching totals', () => {
    const analysisResult = {
      items: [
        { name: 'Banana', macros: { calories_kcal: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3.1, sugar_g: 14, sodium_mg: 1 }, micros: {}, confidence: 0.85 },
      ],
      totals: { macros: { calories_kcal: 999 }, micros: {} }, // deliberately wrong, must be ignored
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.macros.calories_kcal).toBe(105);
  });

  it('returns null for an empty or missing items array', () => {
    expect(aggregateNutrition({ items: [] })).toBeNull();
    expect(aggregateNutrition(null)).toBeNull();
  });
});

describe('buildMealFeelingPayload — energy-prediction input mapping', () => {
  it('sources fiber and sugar from macros, not micros', () => {
    const payload = buildMealFeelingPayload({
      displayCalories: 385,
      displayMacros: { protein_g: 14, carbs_g: 75, fiber_g: 8.6, sugar_g: 4.1 },
      item: {},
    });
    expect(payload.fiber).toBeCloseTo(8.6);
    expect(payload.sugar).toBeCloseTo(4.1);
  });

  it('does not silently produce 0 for a high-fiber meal (the structural hasGoodFiber-always-false bug)', () => {
    // Previously read from a `micros` object that never had fiber/sugar keys,
    // so this always came out undefined -> defaulted to 0 server-side,
    // regardless of the meal's actual fiber content.
    const payload = buildMealFeelingPayload({
      displayCalories: 400,
      displayMacros: { fiber_g: 12, sugar_g: 2 },
      item: {},
    });
    expect(payload.fiber).toBe(12);
    expect(payload.fiber).not.toBe(0);
  });

  it('passes calories and protein/carbs through unchanged', () => {
    const payload = buildMealFeelingPayload({
      displayCalories: 500,
      displayMacros: { protein_g: 20, carbs_g: 60, fiber_g: 5, sugar_g: 10 },
      item: { novaScore: 3, mealType: 'lunch' },
    });
    expect(payload).toEqual({
      calories: 500,
      protein: 20,
      carbs: 60,
      sugar: 10,
      fiber: 5,
      novaScore: 3,
      mealType: 'lunch',
    });
  });
});

describe('scaleNutritionByQuantity — quantity-adjuster scaling', () => {
  it('scales every macro field, not just calories/protein/carbs/fat (the sugar/sodium bug)', () => {
    const macros = { calories_kcal: 120, protein_g: 3, carbs_g: 24, fat_g: 1, fiber_g: 2, sugar_g: 1.5, sodium_mg: 210 };
    // 1 roti -> 3 rotis
    const { macros: scaled } = scaleNutritionByQuantity(macros, {}, 3);
    expect(scaled.calories_kcal).toBe(360);
    // Whole numbers, not 2-decimal — foodLogTable's macro columns are all
    // `integer`, so a value shown during editing must match what will
    // actually be saved a moment later, not a precision that gets silently
    // dropped at persistence.
    expect(scaled.sugar_g).toBe(5); // 1.5 * 3 = 4.5, rounds to 5
    expect(scaled.sodium_mg).toBe(630);
  });

  it('scales micronutrients proportionally too', () => {
    const micros = { calcium: { value: 40, unit: 'mg' }, vitaminA: { value: 100, unit: 'µg' } };
    const { micros: scaled } = scaleNutritionByQuantity({}, micros, 2);
    expect(scaled.calcium).toEqual({ value: 80, unit: 'mg' });
    expect(scaled.vitaminA).toEqual({ value: 200, unit: 'µg' });
  });

  it('scaling down (e.g. 2 -> 1) halves values correctly', () => {
    const macros = { calories_kcal: 240, sugar_g: 4 };
    const { macros: scaled } = scaleNutritionByQuantity(macros, {}, 0.5);
    expect(scaled.calories_kcal).toBe(120);
    expect(scaled.sugar_g).toBe(2);
  });

  it('leaves non-numeric fields untouched', () => {
    const micros = { vitaminA: null };
    const { micros: scaled } = scaleNutritionByQuantity({}, micros, 2);
    expect(scaled.vitaminA).toBeNull();
  });
});
