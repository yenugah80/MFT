/**
 * Regression coverage for Stage 8+9's ingredient-removal micros-drop bug:
 * removeIngredient() in useFoodAnalysis.js correctly subtracted a removed
 * ingredient's macros but left `item.micros` completely untouched (the
 * pre-removal totals, silently overstated — not just missing). The
 * subtraction logic was extracted into the standalone, exported
 * subtractIngredientFromItem() so it's testable without mounting the full
 * hook (which requires Clerk's useAuth()).
 */
import { subtractIngredientFromItem } from '../hooks/useFoodAnalysis';

jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: jest.fn() }) }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));

describe('subtractIngredientFromItem', () => {
  const baseItem = {
    name: 'Cheeseburger',
    macros: {
      calories_kcal: 500,
      protein_g: 25,
      carbs_g: 40,
      fat_g: 28,
      fiber_g: 3,
      sugar_g: 8,
      sodium_mg: 900,
    },
    micros: {
      calcium: { value: 300, unit: 'mg' },
      iron: { value: 4, unit: 'mg' },
      potassium: 600, // bare-number shape
    },
    ingredients: [
      {
        name: 'Cheese slice',
        calories: 100, protein: 6, carbs: 1, fat: 8, fiber: 0, sugar: 0, sodium: 200,
        micros: {
          calcium: { value: 200, unit: 'mg' },
          iron: { value: 0.2, unit: 'mg' },
          potassium: 20,
        },
      },
      {
        name: 'Bun',
        calories: 150, protein: 5, carbs: 28, fat: 2, fiber: 1, sugar: 3, sodium: 250,
        micros: {
          calcium: { value: 10, unit: 'mg' },
          iron: { value: 1, unit: 'mg' },
          potassium: 40,
        },
      },
    ],
  };

  it('subtracts the removed ingredient macros (existing, must-not-regress behavior)', () => {
    const result = subtractIngredientFromItem(baseItem, 0);
    expect(result.macros).toEqual({
      calories_kcal: 400,
      protein_g: 19,
      carbs_g: 39,
      fat_g: 20,
      fiber_g: 3,
      sugar_g: 8,
      sodium_mg: 700,
    });
  });

  it('subtracts the removed ingredient micros, handling {value,unit} shape', () => {
    const result = subtractIngredientFromItem(baseItem, 0);
    expect(result.micros.calcium).toEqual({ value: 100, unit: 'mg' });
    expect(result.micros.iron).toEqual({ value: 3.8, unit: 'mg' });
  });

  it('subtracts the removed ingredient micros, handling bare-number shape', () => {
    const result = subtractIngredientFromItem(baseItem, 0);
    expect(result.micros.potassium).toBe(580);
  });

  it('clamps micros at 0 instead of going negative', () => {
    const item = {
      ...baseItem,
      micros: { calcium: { value: 50, unit: 'mg' } },
      ingredients: [{ name: 'Big cheese', calories: 100, micros: { calcium: { value: 200, unit: 'mg' } } }],
    };
    const result = subtractIngredientFromItem(item, 0);
    expect(result.micros.calcium.value).toBe(0);
  });

  it('removes the ingredient from the ingredients array', () => {
    const result = subtractIngredientFromItem(baseItem, 0);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].name).toBe('Bun');
  });

  it('returns the item unchanged for an out-of-range index', () => {
    const result = subtractIngredientFromItem(baseItem, 5);
    expect(result).toBe(baseItem);
  });

  it('works with `components` in place of `ingredients`', () => {
    const item = {
      ...baseItem,
      ingredients: undefined,
      components: baseItem.ingredients,
    };
    const result = subtractIngredientFromItem(item, 0);
    expect(result.components).toHaveLength(1);
    expect(result.ingredients).toBeUndefined();
    expect(result.macros.calories_kcal).toBe(400);
  });
});
