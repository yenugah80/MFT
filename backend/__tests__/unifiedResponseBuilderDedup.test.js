import { buildUnifiedResponse } from '../src/utils/unifiedResponseBuilder.js';

/**
 * Regression coverage for a real device test: the same voice transcript
 * ("...cooked rice with Rasam and cooked rice and some kind of blue potato
 * thing") non-deterministically came back with "cooked rice" as ONE item
 * on one run and as TWO separate 200-kcal entries on another — silently
 * doubling the meal total (600 kcal instead of 410). The repeated-mention
 * prompt guidance (QUANTITY_FROM_REPETITION_GUIDANCE) only forbids setting
 * quantity>1 for a repeated word; it can't guarantee the model won't
 * instead emit two separate quantity:1 entries for the same food, which
 * has the identical effect. This is the deterministic code-level backstop.
 */
describe('buildUnifiedResponse — deduping repeated food mentions (voice/text)', () => {
  function rawItem(name, calories, quantity = 1) {
    return {
      name,
      quantity,
      nutrition: { calories, protein: 2, carbs: 10, fat: 1, fiber: 0, sugar: 0, sodium: 5 },
      source: 'ai_estimate',
    };
  }

  it('collapses two identically-named voice items into one, not summing their calories', () => {
    const rawItems = [
      rawItem('cooked rice', 200),
      rawItem('Rasam', 50),
      rawItem('cooked rice', 200),
    ];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'voice', mealType: 'snack', rawItems });

    expect(response.items).toHaveLength(2);
    expect(response.items.map((i) => i.name)).toEqual(['cooked rice', 'Rasam']);
    expect(response.totals.calories).toBe(250);
  });

  it('is case/whitespace-insensitive when detecting a duplicate name', () => {
    const rawItems = [rawItem('Cooked Rice', 200), rawItem('  cooked   rice  ', 200)];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'voice', mealType: 'snack', rawItems });
    expect(response.items).toHaveLength(1);
  });

  it('keeps the occurrence with the larger explicit quantity, not just the first', () => {
    const rawItems = [rawItem('rice', 200, 1), rawItem('rice', 200, 2)];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'voice', mealType: 'snack', rawItems });
    expect(response.items).toHaveLength(1);
    expect(response.items[0].quantity).toBe(2);
  });

  it('applies the same fix to text-mode input', () => {
    const rawItems = [rawItem('dal', 150), rawItem('roti', 80), rawItem('dal', 150)];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'text', mealType: 'snack', rawItems });
    expect(response.items).toHaveLength(2);
  });

  it('does NOT dedupe for photo/barcode input — two distinct plates can share a name', () => {
    const rawItems = [rawItem('cookie', 100), rawItem('cookie', 100)];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'photo', mealType: 'snack', rawItems });
    expect(response.items).toHaveLength(2);
  });

  it('leaves a normal, non-duplicated item list untouched', () => {
    const rawItems = [rawItem('rice', 200), rawItem('dal', 150), rawItem('roti', 80)];
    const response = buildUnifiedResponse({ inputText: 'x', inputMode: 'voice', mealType: 'snack', rawItems });
    expect(response.items).toHaveLength(3);
  });
});
