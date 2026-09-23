import { aggregateNutrition, buildMealFeelingPayload, scaleNutritionByQuantity, syncSodiumIntoMicros } from '../components/log/MealSummary/aggregateNutrition';

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

  it('always sums micros fresh from items rather than trusting a totals.micros snapshot (Stage 8d)', () => {
    // Was previously the opposite (prefer totals.micros, fall back to items
    // only when empty) — the same staleness risk already fixed for macros
    // this session applies equally to micros: a totals snapshot from when
    // analysis first completed isn't guaranteed to reflect a later
    // client-side exclusion. Matches UnifiedMealAnalysis.jsx's
    // calculatedTotals, which has always summed micros fresh from items.
    const analysisResult = {
      items: [
        { macros: {}, micros: { vitaminA: 999 } },
        { macros: {}, micros: {} },
      ],
      totals: {
        macros: {},
        // Deliberately different from the items' real sum — must be ignored.
        micros: { vitaminA: { value: 500, unit: 'µg' } },
      },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.micros.vitaminA.value).toBe(999);
  });

  it('sums micros across all items', () => {
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

  it('sums macros from items rather than trusting a stale totals.macros snapshot', () => {
    // Regression case from a live report: a 2-item meal (coconut pulao +
    // chicken gravy curry) whose `items` correctly carried fiber/sugar/
    // sodium (matching what the analysis screen's own independent per-item
    // sum showed: 4g/4g/900mg) while `totals.macros` — a separately-carried
    // snapshot from when analysis first completed — had gone stale and
    // showed 0 for those same three fields, with protein/carbs/fat
    // unaffected. The Confirm Log screen must agree with the analysis
    // screen regardless of whether `totals` was ever refreshed.
    const analysisResult = {
      items: [
        { name: 'Coconut pulao', macros: { calories_kcal: 280, protein_g: 6, carbs_g: 50, fat_g: 8, fiber_g: 2, sugar_g: 1, sodium_mg: 300 }, micros: {} },
        { name: 'Chicken gravy curry', macros: { calories_kcal: 180, protein_g: 20, carbs_g: 10, fat_g: 8, fiber_g: 2, sugar_g: 3, sodium_mg: 600 }, micros: {} },
      ],
      totals: {
        // Deliberately stale/wrong for fiber/sugar/sodium, correct for the rest.
        macros: { calories_kcal: 460, protein_g: 26, carbs_g: 60, fat_g: 16, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
        micros: {},
      },
    };

    const nutrition = aggregateNutrition(analysisResult);

    expect(nutrition.macros.calories_kcal).toBe(460);
    expect(nutrition.macros.protein_g).toBe(26);
    expect(nutrition.macros.carbs_g).toBe(60);
    expect(nutrition.macros.fat_g).toBe(16);
    expect(nutrition.macros.fiber_g).toBe(4);
    expect(nutrition.macros.sugar_g).toBe(4);
    expect(nutrition.macros.sodium_mg).toBe(900);
  });

  it('syncs macros.sodium_mg into micros.sodium so MicrosGrid stops showing "Not detected" (Stage 8d)', () => {
    // Root cause: the LLM schema puts sodium under macros only, never
    // micros, so MicrosGrid.jsx — which only reads the micros prop — always
    // showed "Sodium: Not detected" despite a real value sitting in
    // macros.sodium_mg.
    const analysisResult = {
      items: [
        { name: 'Coconut pulao', macros: { calories_kcal: 280, sodium_mg: 300 }, micros: {} },
        { name: 'Chicken gravy curry', macros: { calories_kcal: 180, sodium_mg: 600 }, micros: {} },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.micros.sodium).toEqual({ value: 900, unit: 'mg' });
  });

  it('flattens each item\'s own sub-ingredients instead of substituting the top-level items array (Stage 8d)', () => {
    // Root cause of "meal items should show ingredients": this branch
    // previously returned `ingredients: analysisResult.items` — the food
    // items themselves, not any item's real ingredient breakdown — so
    // Detailed Analysis never showed real sub-ingredients for a multi-item
    // meal at all (only the single-item branch did).
    const analysisResult = {
      items: [
        {
          name: 'Chicken gravy curry',
          macros: { calories_kcal: 180 },
          ingredients: [
            { name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { name: 'Curry sauce', calories: 60, protein: 1, carbs: 5, fat: 4 },
          ],
        },
        {
          name: 'Coconut pulao',
          macros: { calories_kcal: 280 },
          ingredients: [{ name: 'Rice', calories: 200, protein: 4, carbs: 44, fat: 1 }],
        },
      ],
      totals: { macros: {}, micros: {} },
    };

    const nutrition = aggregateNutrition(analysisResult);

    expect(nutrition.ingredients).toHaveLength(3);
    expect(nutrition.ingredients.map((i) => i.name)).toEqual([
      'Chicken gravy curry: Chicken breast',
      'Chicken gravy curry: Curry sauce',
      'Coconut pulao: Rice',
    ]);
    // Not the top-level items themselves.
    expect(nutrition.ingredients).not.toEqual(analysisResult.items);
  });

  it('excludes a whole item (by index) from totals and the flattened ingredient list', () => {
    const analysisResult = {
      items: [
        { name: 'Chicken curry', macros: { calories_kcal: 180, protein_g: 20 }, ingredients: [{ name: 'Chicken', calories: 165, protein: 31 }] },
        { name: 'Rice', macros: { calories_kcal: 280, protein_g: 6 }, ingredients: [{ name: 'White rice', calories: 200, protein: 4 }] },
      ],
      totals: { macros: {}, micros: {} },
    };

    const nutrition = aggregateNutrition(analysisResult, { excludedItems: new Set([0]) });

    expect(nutrition.macros.calories_kcal).toBe(280);
    expect(nutrition.macros.protein_g).toBe(6);
    expect(nutrition.ingredients.map((i) => i.name)).toEqual(['Rice: White rice']);
  });

  it('subtracts an excluded ingredient\'s macros from its parent item and drops it from the ingredient list', () => {
    const analysisResult = {
      items: [
        {
          name: 'Chicken curry',
          macros: { calories_kcal: 225, protein_g: 32, carbs_g: 5, fat_g: 7.6, fiber_g: 0, sugar_g: 0 },
          ingredients: [
            { name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { name: 'Curry sauce', calories: 60, protein: 1, carbs: 5, fat: 4 },
          ],
        },
      ],
      totals: { macros: {}, micros: {} },
    };

    // Exclude ingredient index 1 ("Curry sauce") of item index 0. This is
    // a single-item meal, so ingredient names aren't tagged with the parent
    // item's name (only the multi-item branch above does that, to
    // disambiguate ingredients from different items in one flattened list).
    const nutrition = aggregateNutrition(analysisResult, { excludedIngredients: new Set(['0-1']) });

    expect(nutrition.macros.calories_kcal).toBe(165);
    expect(nutrition.macros.protein_g).toBe(31);
    expect(nutrition.ingredients.map((i) => i.name)).toEqual(['Chicken breast']);
  });

  it('clamps a macro at 0 rather than going negative when exclusions overshoot the item total', () => {
    const analysisResult = {
      items: [
        {
          name: 'Odd item',
          macros: { calories_kcal: 50, protein_g: 5, carbs_g: 5, fat_g: 5, fiber_g: 5, sugar_g: 5 },
          ingredients: [{ name: 'Big ingredient', calories: 200, protein: 20, carbs: 20, fat: 20, fiber: 20, sugar: 20 }],
        },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult, { excludedIngredients: new Set(['0-0']) });
    expect(nutrition.macros.calories_kcal).toBe(0);
    expect(nutrition.macros.protein_g).toBe(0);
  });
});

describe('syncSodiumIntoMicros', () => {
  it('adds micros.sodium from macros.sodium_mg when absent', () => {
    const result = syncSodiumIntoMicros({ sodium_mg: 900 }, {});
    expect(result.sodium).toEqual({ value: 900, unit: 'mg' });
  });

  it('never overwrites an existing micros.sodium', () => {
    const existing = { sodium: { value: 500, unit: 'mg' } };
    const result = syncSodiumIntoMicros({ sodium_mg: 900 }, existing);
    expect(result.sodium).toEqual({ value: 500, unit: 'mg' });
  });

  it('leaves micros untouched when macros.sodium_mg is missing or zero', () => {
    expect(syncSodiumIntoMicros({}, { calcium: 100 })).toEqual({ calcium: 100 });
    expect(syncSodiumIntoMicros({ sodium_mg: 0 }, { calcium: 100 })).toEqual({ calcium: 100 });
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

describe('aggregateNutrition — missing-vs-zero for optional macro fields (fiber/sugar/sodium)', () => {
  it('nulls out a total field when any active item never reported it, instead of undercounting silently', () => {
    const analysisResult = {
      items: [
        { name: 'Known item', macros: { calories_kcal: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 3, sugar_g: 2, sodium_mg: 400 } },
        // fiber_g/sugar_g/sodium_mg genuinely never reported for this item.
        { name: 'Unknown-fiber item', macros: { calories_kcal: 150, protein_g: 8, carbs_g: 15, fat_g: 4 } },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult);
    // Required fields still sum normally — they're always validated numeric.
    expect(nutrition.macros.calories_kcal).toBe(350);
    expect(nutrition.macros.protein_g).toBe(18);
    // Optional fields: one contributor is unknown, so the total is unknown,
    // not "3" (which would silently imply the second item confirmed 0 fiber).
    expect(nutrition.macros.fiber_g).toBeNull();
    expect(nutrition.macros.sugar_g).toBeNull();
    expect(nutrition.macros.sodium_mg).toBeNull();
  });

  it('sums normally when every active item explicitly reports the field, including a genuine 0', () => {
    const analysisResult = {
      items: [
        { name: 'A', macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 3, sugar_g: 0, sodium_mg: 200 } },
        // sugar_g: 0 here is a CONFIRMED zero, not missing — must count as 0, not trigger incompleteness.
        { name: 'B', macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 2, sugar_g: 0, sodium_mg: 100 } },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult);
    expect(nutrition.macros.fiber_g).toBe(5);
    expect(nutrition.macros.sugar_g).toBe(0);
    expect(nutrition.macros.sodium_mg).toBe(300);
  });

  it('an excluded item does not count toward incompleteness (only ACTIVE items matter)', () => {
    const analysisResult = {
      items: [
        { name: 'Known', macros: { calories_kcal: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 3, sugar_g: 2, sodium_mg: 400 } },
        { name: 'Excluded, unknown fiber', macros: { calories_kcal: 150, protein_g: 8, carbs_g: 15, fat_g: 4 } },
      ],
      totals: { macros: {}, micros: {} },
    };
    const nutrition = aggregateNutrition(analysisResult, { excludedItems: new Set([1]) });
    expect(nutrition.macros.fiber_g).toBe(3);
  });
});
