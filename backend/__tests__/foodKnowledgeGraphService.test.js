import {
  detectAllergenRisk,
  inferFoodAttributes,
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
});

describe('foodKnowledgeGraphService food attribute inference', () => {
  test('adds useful signal tags to user-history style foods', () => {
    const attrs = inferFoodAttributes({ name: 'Red Lentil Dal with Spinach' });

    expect(attrs.tags).toEqual(expect.arrayContaining(['high-protein', 'fiber-rich', 'complex-carbs']));
    expect(attrs.moodBoost).toBe(true);
    expect(attrs.cuisineTags).toContain('indian');
  });
});
