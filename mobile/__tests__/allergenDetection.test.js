import { detectAllergensInFoodName } from '../utils/allergenDetection';

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
