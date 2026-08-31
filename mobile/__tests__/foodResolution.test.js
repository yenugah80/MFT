import {
  itemNeedsResolution,
  replaceIngredientTerm,
  unresolvedItems,
} from '../utils/foodResolution';

describe('food resolution safeguards', () => {
  it('replaces only the selected ingredient term', () => {
    expect(replaceIngredientTerm(
      '1 cup rice, 1 tbsp sesa oil',
      'sesa oil',
      'sesame oil'
    )).toBe('1 cup rice, 1 tbsp sesame oil');
  });

  it('returns null when the original term is absent', () => {
    expect(replaceIngredientTerm('1 cup rice', 'sesa oil', 'sesame oil')).toBeNull();
  });

  it('blocks confirmation and failed-resolution items', () => {
    expect(itemNeedsResolution({ requiresUserConfirmation: true })).toBe(true);
    expect(itemNeedsResolution({ flags: ['resolution_failed'] })).toBe(true);
    expect(itemNeedsResolution({ flags: ['estimated_nutrients'] })).toBe(false);
  });

  it('returns only unresolved meal items', () => {
    const items = [
      { name: 'rice' },
      { name: 'sesa oil', flags: ['spelling_confirmation_required'] },
    ];
    expect(unresolvedItems(items).map(item => item.name)).toEqual(['sesa oil']);
  });

  // Regression: useFoodAnalysis.js's confirmItemSpelling() clears exactly
  // these two fields (requiresUserConfirmation + the spelling flag) to let
  // a user keep their original ingredient name instead of accepting a
  // "Did you mean?" suggestion. Before this existed, there was no way to
  // dismiss a wrongly-flagged item (e.g. a real ingredient the backend's
  // fixed word list didn't recognize) short of accepting a wrong rename —
  // "Log Meal" stayed permanently blocked. This proves the exact clearing
  // shape confirmItemSpelling produces actually unblocks unresolvedItems.
  it('unblocks an item once requiresUserConfirmation and the spelling flag are cleared, matching confirmItemSpelling', () => {
    const flaggedItem = {
      itemId: 'item-1',
      name: 'coconut milk',
      requiresUserConfirmation: true,
      suggestions: [{ original: 'coconut milk', canonical: 'coconut oil' }],
      flags: ['spelling_confirmation_required'],
    };
    expect(unresolvedItems([flaggedItem])).toHaveLength(1);

    const dismissed = {
      ...flaggedItem,
      requiresUserConfirmation: false,
      suggestions: [],
      flags: flaggedItem.flags.filter(flag => flag !== 'spelling_confirmation_required'),
    };
    expect(unresolvedItems([dismissed])).toHaveLength(0);
  });

  it('leaves a genuine resolution-failure flag blocking, unaffected by dismissing a spelling suggestion', () => {
    const item = {
      itemId: 'item-2',
      name: 'mystery paste',
      requiresUserConfirmation: false,
      flags: ['resolution_failed'],
    };
    // confirmItemSpelling only ever strips 'spelling_confirmation_required'
    // — a real resolution failure (no usable nutrition data at all) must
    // stay blocking even after that specific dismissal.
    expect(unresolvedItems([item])).toHaveLength(1);
  });
});

