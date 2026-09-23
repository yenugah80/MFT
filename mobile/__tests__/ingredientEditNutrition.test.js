import { computeIngredientNutrition, buildIngredientEditPayload } from '../components/log/computeIngredientNutrition';

const ingredients = [
  { name: 'Rice', calories: 200, macros: { protein: 4, carbs: 45, fat: 0, fiber: 1, sugar: 0, sodium: 2 }, isRemovable: true },
  { name: 'Butter', calories: 100, macros: { protein: 0.1, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 90 }, isRemovable: true, micros: { vitaminA: { value: 100, unit: 'µg' } } },
];
const optionalAddOns = [
  { name: 'Cheese', calories: 80, macros: { protein: 5, carbs: 1, fat: 6, fiber: 0, sugar: 0, sodium: 150 } },
];

describe('computeIngredientNutrition — remove/add/substitute', () => {
  it('sums all active ingredients including sugar and sodium (previously dropped entirely)', () => {
    const result = computeIngredientNutrition({
      ingredients, optionalAddOns, removedIngredients: new Set(), addedAddOns: new Set(),
    });
    expect(result.calories).toBe(300);
    expect(result.sodium).toBe(92); // 2 + 90 — previously always 0 regardless of real data
  });

  it('removing an ingredient excludes it from every field, not just calories', () => {
    const result = computeIngredientNutrition({
      ingredients, optionalAddOns, removedIngredients: new Set(['Butter']), addedAddOns: new Set(),
    });
    expect(result.calories).toBe(200);
    expect(result.fat).toBe(0); // butter's fat gone too
    expect(result.sodium).toBe(2); // butter's sodium gone too
    expect(result.micros.vitaminA).toBeUndefined(); // butter's micros gone too
  });

  it('adding an optional add-on includes its full nutrition, including sodium', () => {
    const result = computeIngredientNutrition({
      ingredients, optionalAddOns, removedIngredients: new Set(), addedAddOns: new Set(['Cheese']),
    });
    expect(result.calories).toBe(380);
    expect(result.sodium).toBe(242); // 2 + 90 + 150
  });

  it('substituting (remove one, add another) reflects both changes together', () => {
    const result = computeIngredientNutrition({
      ingredients, optionalAddOns,
      removedIngredients: new Set(['Butter']),
      addedAddOns: new Set(['Cheese']),
    });
    expect(result.calories).toBe(280); // 200 (rice) - 0 (butter removed) + 80 (cheese)
    expect(result.sodium).toBe(152); // 2 (rice) + 150 (cheese), butter's 90 excluded
  });

  it('aggregates micronutrients across remaining active ingredients', () => {
    const result = computeIngredientNutrition({
      ingredients, optionalAddOns, removedIngredients: new Set(), addedAddOns: new Set(),
    });
    expect(result.micros.vitaminA).toEqual({ value: 100, unit: 'µg' });
  });
});

describe('buildIngredientEditPayload — canonical shape for downstream consumers', () => {
  it('emits macros with the app-wide suffixed field names, not flat unsuffixed ones', () => {
    const nutrition = { calories: 280, protein: 9.1, carbs: 46, fat: 11, fiber: 1, sugar: 0, sodium: 152, micros: {} };
    const payload = buildIngredientEditPayload(nutrition, { removedIngredients: new Set(['Butter']), addedAddOns: new Set(['Cheese']) });

    expect(payload.macros).toEqual({
      calories_kcal: 280, protein_g: 9.1, carbs_g: 46, fat_g: 11, fiber_g: 1, sugar_g: 0, sodium_mg: 152,
    });
    // Previously this payload had NO .macros key at all — just flat
    // calories/protein/carbs/fat/fiber — which MealSummaryScreen's
    // handleNutritionChange (`{...prev, ...nutritionData}`) could never
    // route into modifiedNutrition.macros, so displayMacros (feeding
    // MacroProgressSection, MealScoreDial, and the prediction payload) kept
    // showing pre-edit values after every ingredient change.
    expect(payload.ingredientsChanged).toBe(true);
  });

  it('includes micros in the payload', () => {
    const nutrition = { calories: 100, protein: 1, carbs: 1, fat: 1, fiber: 1, sugar: 1, sodium: 1, micros: { calcium: { value: 50, unit: 'mg' } } };
    const payload = buildIngredientEditPayload(nutrition, { removedIngredients: new Set(), addedAddOns: new Set() });
    expect(payload.micros.calcium).toEqual({ value: 50, unit: 'mg' });
  });
});
