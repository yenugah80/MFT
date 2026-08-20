import {
  detectAllergenRisk,
  inferFoodAttributes,
  detectDietViolation,
} from '../src/services/foodKnowledgeGraphService.js';

describe('foodKnowledgeGraphService allergen risk detection', () => {
  test('detects hidden allergens in common dish names', () => {
    const risk = detectAllergenRisk('Pad Thai', ['peanut']);

    expect(risk.hasRisk).toBe(true);
    expect(risk.matchedAllergens).toContain('peanut');
    expect(risk.hiddenMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dish: 'pad thai', allergen: 'peanut' }),
      ])
    );
  });

  test('detects ingredient-level allergens when name is not explicit', () => {
    const risk = detectAllergenRisk(
      { name: 'Power Breakfast Bowl', ingredients: ['rolled oats', 'greek yogurt', 'berries'] },
      ['milk']
    );

    expect(risk.hasRisk).toBe(true);
    expect(risk.matchedAllergens).toContain('dairy');
    expect(risk.ingredientMatches).toContain('yogurt');
  });

  test('respects common allergen false-positive exceptions', () => {
    const risk = detectAllergenRisk('Buckwheat Pancakes', ['wheat']);

    expect(risk.hasRisk).toBe(false);
  });

  test('expands singular tree nut allergy to specific nuts', () => {
    const risk = detectAllergenRisk('Apple with Almond Butter', ['tree nut']);

    expect(risk.hasRisk).toBe(true);
    expect(risk.matchedAllergens).toContain('tree nut');
    expect(risk.ingredientMatches).toContain('almond');
  });

  // Regression: a plural food name used to slip past the whole safety net.
  // expandAllergens() normalises every cross-reactivity term back to its
  // singular alias, so the term list only ever holds 'almond'/'egg' — while
  // real foods are named "Handful of Almonds" and "Scrambled Eggs". The old
  // strict word boundary saw the trailing 's' and refused to match, so these
  // were recommended to users who had declared exactly those allergies.
  describe.each([
    ['Handful of Almonds (23 nuts)', ['Tree Nuts']],
    ['Walnuts', ['Tree Nuts']],
    ['Cashews', ['tree_nuts']],
    ['Scrambled Eggs (2 large)', ['Eggs']],
  ])('plural food name vs declared allergy', (foodName, allergies) => {
    test(`blocks "${foodName}" for ${allergies[0]}`, () => {
      expect(detectAllergenRisk({ name: foodName }, allergies).hasRisk).toBe(true);
    });
  });

  // The plural tolerance must not start blocking unrelated foods.
  describe.each([
    ['Grilled Chicken Breast', ['Peanuts']],
    ['Steamed Broccoli', ['Tree Nuts']],
    ['Banana', ['Eggs']],
    ['Buckwheat Pancakes', ['Wheat']], // ALLERGEN_EXCEPTIONS must still apply
  ])('unrelated food vs declared allergy', (foodName, allergies) => {
    test(`allows "${foodName}" for ${allergies[0]}`, () => {
      expect(detectAllergenRisk({ name: foodName }, allergies).hasRisk).toBe(false);
    });
  });
});

describe('foodKnowledgeGraphService food attribute inference', () => {
  test('adds useful signal tags to user-history style foods', () => {
    const attrs = inferFoodAttributes({ name: 'Red Lentil Dal with Spinach' });

    expect(attrs.tags).toEqual(expect.arrayContaining(['high-protein', 'fiber-rich', 'complex-carbs']));
    expect(attrs.moodBoost).toBe(true);
    expect(attrs.cuisineTags).toContain('indian');
  });
});

describe('foodKnowledgeGraphService diet preference compliance', () => {
  test('vegetarian blocks meat and fish, allows eggs and dairy', () => {
    expect(detectDietViolation({ name: 'Grilled Chicken Breast' }, ['vegetarian']).violates).toBe(true);
    expect(detectDietViolation({ name: 'Baked Salmon Fillet' }, ['vegetarian']).violates).toBe(true);
    expect(detectDietViolation({ name: 'Scrambled Eggs (2 large)' }, ['vegetarian']).violates).toBe(false);
    expect(detectDietViolation({ name: 'Cottage Cheese' }, ['vegetarian']).violates).toBe(false);
  });

  test('vegan additionally blocks eggs and dairy that vegetarian allows', () => {
    const eggs = detectDietViolation({ name: 'Scrambled Eggs (2 large)' }, ['vegan']);
    const yogurt = detectDietViolation({ name: 'Greek Yogurt with Berries' }, ['vegan']);
    const plant = detectDietViolation({ name: 'Quinoa Bowl with Vegetables' }, ['vegan']);

    expect(eggs.violates).toBe(true);
    expect(yogurt.violates).toBe(true);
    expect(plant.violates).toBe(false);
  });

  test('keto is judged on carb grams, not ingredient names', () => {
    const highCarb = detectDietViolation({ name: 'Oatmeal with Banana', nutrition: { carbs: 45 } }, ['keto']);
    const lowCarb = detectDietViolation({ name: 'Grilled Chicken Breast', nutrition: { carbs: 0 } }, ['keto']);
    const unknown = detectDietViolation({ name: 'Mystery Dish' }, ['keto']);

    expect(highCarb.violates).toBe(true);
    expect(lowCarb.violates).toBe(false);
    // No carb data to judge — must not reject on a guess.
    expect(unknown.violates).toBe(false);
  });

  test('no declared diets never violates', () => {
    expect(detectDietViolation({ name: 'Grilled Chicken Breast' }, []).violates).toBe(false);
  });

  test('reports every diet a food violates, not just the first', () => {
    const result = detectDietViolation({ name: 'Grilled Chicken Breast' }, ['vegan', 'vegetarian']);
    expect(result.violatedDiets.sort()).toEqual(['vegan', 'vegetarian']);
  });
});
