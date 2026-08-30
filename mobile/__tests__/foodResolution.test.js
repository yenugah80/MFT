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
});

