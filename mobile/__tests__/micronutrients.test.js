/**
 * aggregateMicros / normalizeMicroKey / getDailyValueFor — extracted from
 * app/(tabs)/log.js's multi-item save and MealLoggedCard.jsx's %DV badges.
 *
 * Regression coverage for two real bugs fixed alongside this extraction:
 * 1. Multi-item meals dropped fiber/sugar/sodium/micros in the post-log
 *    MealLoggedCard object even though every item's data had them.
 * 2. MealLoggedCard's %DV badge read a .dv field nothing ever populated,
 *    so it silently never rendered for any meal, single- or multi-item.
 */
import { aggregateMicros, normalizeMicroKey, getDailyValueFor } from '../utils/micronutrients';

describe('aggregateMicros', () => {
  it('sums a micronutrient across multiple items (object-shaped values)', () => {
    const items = [
      { micros: { calcium: { value: 100, unit: 'mg' } } },
      { micros: { calcium: { value: 50, unit: 'mg' } } },
    ];
    expect(aggregateMicros(items)).toEqual({ calcium: { value: 150, unit: 'mg' } });
  });

  it('sums a micronutrient across multiple items (flat-number values)', () => {
    const items = [
      { micros: { iron: 5 } },
      { micros: { iron: 3 } },
    ];
    expect(aggregateMicros(items)).toEqual({ iron: { value: 8, unit: 'mg' } });
  });

  it('handles a mix of shapes across different items for the same key', () => {
    const items = [
      { micros: { potassium: 200 } },
      { micros: { potassium: { value: 300, unit: 'mg' } } },
    ];
    expect(aggregateMicros(items)).toEqual({ potassium: { value: 500, unit: 'mg' } });
  });

  it('keeps distinct micronutrients separate', () => {
    const items = [
      { micros: { calcium: 100, iron: 5 } },
      { micros: { calcium: 50 } },
    ];
    expect(aggregateMicros(items)).toEqual({
      calcium: { value: 150, unit: 'mg' },
      iron: { value: 5, unit: 'mg' },
    });
  });

  it('tolerates items with no micros', () => {
    const items = [{ micros: { calcium: 100 } }, {}, { micros: null }];
    expect(aggregateMicros(items)).toEqual({ calcium: { value: 100, unit: 'mg' } });
  });

  it('returns {} for empty/null/undefined input', () => {
    expect(aggregateMicros([])).toEqual({});
    expect(aggregateMicros(null)).toEqual({});
    expect(aggregateMicros(undefined)).toEqual({});
  });
});

describe('normalizeMicroKey', () => {
  it('collapses different casings/underscore styles to the same key', () => {
    expect(normalizeMicroKey('vitaminC')).toBe(normalizeMicroKey('vitamin_c'));
    expect(normalizeMicroKey('vitaminC')).toBe(normalizeMicroKey('Vitamin C'));
  });

  it('strips known unit suffixes', () => {
    expect(normalizeMicroKey('calcium_mg')).toBe(normalizeMicroKey('calcium'));
  });
});

describe('getDailyValueFor', () => {
  it('finds a daily value regardless of the input key casing', () => {
    const camel = getDailyValueFor('vitaminC');
    const snake = getDailyValueFor('vitamin_c');
    expect(camel).not.toBeNull();
    expect(camel).toEqual(snake);
    expect(camel.value).toBe(90);
    expect(camel.unit).toBe('mg');
  });

  it('returns null for an unknown micronutrient name', () => {
    expect(getDailyValueFor('unobtainium')).toBeNull();
  });
});
