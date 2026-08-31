import { getPortionAdjustmentOptions } from '../src/utils/portionDefaults.js';

describe('getPortionAdjustmentOptions — generic (non-countable) foods', () => {
  it('every suggested option carries a numeric quantity field the mobile quantity editor actually reads', () => {
    // Real bug: this branch previously used `multiplier` instead of
    // `quantity` — QuantityAdjuster.jsx's onPress handler calls
    // handleQuantityChange(option.quantity) specifically, so every tap
    // resolved to undefined, silently corrupting the edit with NaN.
    const result = getPortionAdjustmentOptions('chicken curry', '1 serving');
    expect(result.isCountable).toBe(false);
    result.suggestedOptions.forEach((option) => {
      expect(typeof option.quantity).toBe('number');
      expect(Number.isNaN(option.quantity)).toBe(false);
    });
  });

  it('does not offer a mixed-unit option (e.g. "100g", "1 cup") the client cannot correctly apply', () => {
    // QuantityAdjuster only ever sends a bare number back, using whatever
    // unitLabel it started with ('serving') — it can't represent "the
    // user actually meant grams/cups now." A "100g" option that carries
    // quantity:1 would have been applied as "1 serving", not 100 grams.
    const result = getPortionAdjustmentOptions('chicken curry', '1 serving');
    const labels = result.suggestedOptions.map((o) => o.label.toLowerCase());
    expect(labels.every((l) => l.includes('serving'))).toBe(true);
  });

  it('all options share the same unitLabel as the top-level result', () => {
    const result = getPortionAdjustmentOptions('dal', '1 serving');
    expect(result.unitLabel).toBe('serving');
    result.suggestedOptions.forEach((option) => {
      expect(option.label).toContain('serving');
    });
  });
});

describe('getPortionAdjustmentOptions — countable foods (unchanged behavior)', () => {
  it('still provides quantity, calories, and grams per suggested option', () => {
    const result = getPortionAdjustmentOptions('roti', '1 medium roti');
    expect(result.isCountable).toBe(true);
    result.suggestedOptions.forEach((option) => {
      expect(typeof option.quantity).toBe('number');
      expect(typeof option.calories).toBe('number');
      expect(typeof option.grams).toBe('number');
    });
  });
});
