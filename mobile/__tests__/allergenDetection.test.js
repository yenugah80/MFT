import { detectAllergensInFoodName, getMealAllergenWarnings } from '../utils/allergenDetection';

describe('detectAllergensInFoodName — generic detector used by the meal-summary screen', () => {
  it('detects a real allergen regardless of any user allergy list', () => {
    expect(detectAllergensInFoodName('Almond butter')).toEqual(
      expect.arrayContaining(['nuts', 'tree_nuts'])
    );
  });

  it('returns empty for a meal with no allergens (the reported case)', () => {
    expect(detectAllergensInFoodName('Grilled chicken breast')).toEqual([]);
    expect(detectAllergensInFoodName('Sauteed spinach')).toEqual([]);
  });

  it('respects the same exception list as the rest of the module (coconut is not a tree nut)', () => {
    expect(detectAllergensInFoodName('Coconut milk')).not.toEqual(
      expect.arrayContaining(['nuts', 'tree_nuts'])
    );
  });

  it('handles missing/empty input without throwing', () => {
    expect(detectAllergensInFoodName(null)).toEqual([]);
    expect(detectAllergensInFoodName(undefined)).toEqual([]);
    expect(detectAllergensInFoodName('')).toEqual([]);
  });
});

describe('detectAllergensInFoodName — plural nut names must be detected (Stage 8d fix)', () => {
  it.each(['Almonds', 'Walnuts', 'Cashews', 'Pecans', 'Pistachios', 'Hazelnuts'])(
    '"%s" (plural, no other words) is detected as a tree nut',
    (name) => {
      const result = detectAllergensInFoodName(name);
      expect(result).toEqual(expect.arrayContaining(['nuts', 'tree_nuts']));
    }
  );

  it('coconut is still excepted even in plural nut-adjacent contexts', () => {
    expect(detectAllergensInFoodName('Coconuts')).not.toEqual(
      expect.arrayContaining(['nuts', 'tree_nuts'])
    );
  });
});

describe('detectAllergensInFoodName — nut/seed/fruit butters must not false-positive as dairy', () => {
  it.each([
    'Almond butter', 'Peanut butter', 'Cashew butter', 'Cocoa butter',
    'Apple butter', 'Sunflower seed butter', 'Shea butter lotion', 'Coconut butter',
  ])('"%s" does not report dairy or milk', (name) => {
    const result = detectAllergensInFoodName(name);
    expect(result).not.toContain('dairy');
    expect(result).not.toContain('milk');
  });

  it.each([
    'Buttered toast', 'Butter chicken', 'Garlic butter sauce', 'Cheese pizza',
    'Whole milk', 'Greek yogurt', 'Butter cookie', 'Salted butter',
  ])('"%s" still correctly reports dairy (real cases must not regress)', (name) => {
    const result = detectAllergensInFoodName(name);
    expect(result.includes('dairy') || result.includes('milk')).toBe(true);
  });
});

describe('getMealAllergenWarnings — filtered to the user\'s own saved allergies', () => {
  it('returns nothing when the user has no saved allergies, even for a meal full of allergens', () => {
    const items = [{ name: 'Peanut butter sandwich with cheese', allergens: ['peanuts', 'dairy'] }];
    expect(getMealAllergenWarnings(items, [])).toEqual([]);
    expect(getMealAllergenWarnings(items, null)).toEqual([]);
  });

  it('returns nothing when no ingredient matches any of the user\'s allergies', () => {
    const items = [{ name: 'Grilled chicken breast', ingredients: [{ name: 'Chicken breast' }, { name: 'Olive oil' }] }];
    expect(getMealAllergenWarnings(items, ['peanuts', 'shellfish'])).toEqual([]);
  });

  it('marks a match "confirmed" when the AI explicitly tagged that allergen', () => {
    const items = [{ name: 'Mystery dish', allergens: ['peanuts'] }];
    const result = getMealAllergenWarnings(items, ['peanuts']);
    expect(result).toEqual([{ allergen: 'peanuts', status: 'confirmed' }]);
  });

  it('marks a match "possible" when only a name pattern matched, no AI tag', () => {
    const items = [{ name: 'Peanut butter sandwich' }];
    const result = getMealAllergenWarnings(items, ['peanuts']);
    expect(result).toEqual([{ allergen: 'peanuts', status: 'possible' }]);
  });

  it('checks ingredient names too, not just the item name', () => {
    const items = [{ name: 'Mixed salad', ingredients: [{ name: 'Walnuts' }, { name: 'Lettuce' }] }];
    const result = getMealAllergenWarnings(items, ['tree_nuts']);
    expect(result).toEqual([{ allergen: 'tree_nuts', status: 'possible' }]);
  });

  it('never flags an allergen the user does not have, even if it is clearly present', () => {
    const items = [{ name: 'Shrimp and peanut stir fry', allergens: ['shellfish', 'peanuts'] }];
    // User only has a dairy allergy — shellfish/peanuts must not appear.
    const result = getMealAllergenWarnings(items, ['dairy']);
    expect(result).toEqual([]);
  });

  it('confirmed beats possible for the same allergen across items', () => {
    const items = [
      { name: 'Peanut butter toast' }, // possible only
      { name: 'Trail mix', allergens: ['peanuts'] }, // confirmed
    ];
    const result = getMealAllergenWarnings(items, ['peanuts']);
    expect(result).toEqual([{ allergen: 'peanuts', status: 'confirmed' }]);
  });

  it('handles multiple user allergies across multiple items independently', () => {
    const items = [
      { name: 'Peanut sauce noodles', allergens: ['peanuts'] },
      { name: 'Side of shrimp' },
    ];
    const result = getMealAllergenWarnings(items, ['peanuts', 'shellfish']);
    expect(result).toEqual(expect.arrayContaining([
      { allergen: 'peanuts', status: 'confirmed' },
      { allergen: 'shellfish', status: 'possible' },
    ]));
    expect(result).toHaveLength(2);
  });

  it('handles missing/empty items gracefully', () => {
    expect(getMealAllergenWarnings([], ['peanuts'])).toEqual([]);
    expect(getMealAllergenWarnings(null, ['peanuts'])).toEqual([]);
  });
});
