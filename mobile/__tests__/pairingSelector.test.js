/**
 * Pairing selection tests.
 *
 * The allergen cases are the point of this file. The app collects FDA Top 9
 * allergens with severity — including "anaphylaxis" — and the pairing UI
 * previously suggested almonds, eggs and Greek yogurt to everyone regardless.
 * These assert that can never happen again.
 */

import { selectPairings, filterSafeCandidates } from '../utils/pairingSelector';
import { PAIRING_CANDIDATES, PAIRING_GOALS } from '../constants/pairingCandidates';

const BIG_GAPS = { protein: 40, fiber: 10, calories: 800, hydration: 1 };

const namesFrom = (groups) => groups.flatMap((g) => g.suggestions.map((s) => s.name));

describe('allergen filtering (safety critical)', () => {
  it('never suggests nuts to a nut-allergic user', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, allergies: ['nuts'] }));
    expect(names).not.toContain('Handful of almonds');
  });

  it('never suggests dairy to a dairy-allergic user', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, allergies: ['dairy'] }));
    expect(names).not.toContain('Greek yogurt');
    expect(names).not.toContain('Grilled paneer');
    expect(names).not.toContain('Cucumber raita');
    expect(names).not.toContain('Chaas (buttermilk)');
  });

  it('never suggests eggs to an egg-allergic user', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, allergies: ['eggs'] }));
    expect(names).not.toContain('Hard-boiled egg');
  });

  it('never suggests soy to a soy-allergic user', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, allergies: ['soy'] }));
    expect(names).not.toContain('Pan-fried tofu');
    expect(names).not.toContain('Steamed edamame');
  });

  it('handles multiple allergies at once', () => {
    const names = namesFrom(
      selectPairings({ gaps: BIG_GAPS, allergies: ['dairy', 'eggs', 'nuts', 'soy'] })
    );
    for (const unsafe of [
      'Greek yogurt', 'Grilled paneer', 'Cucumber raita', 'Chaas (buttermilk)',
      'Hard-boiled egg', 'Handful of almonds', 'Pan-fried tofu', 'Steamed edamame',
    ]) {
      expect(names).not.toContain(unsafe);
    }
  });

  it('accepts allergies as objects, not just strings', () => {
    const safe = filterSafeCandidates(PAIRING_CANDIDATES, { allergies: [{ id: 'dairy' }] });
    expect(safe.map((c) => c.id)).not.toContain('greek_yogurt');
  });

  it('is case-insensitive', () => {
    const safe = filterSafeCandidates(PAIRING_CANDIDATES, { allergies: ['DAIRY', ' Nuts '] });
    const ids = safe.map((c) => c.id);
    expect(ids).not.toContain('greek_yogurt');
    expect(ids).not.toContain('almonds');
  });

  it('still returns something safe rather than failing closed to nothing', () => {
    const groups = selectPairings({ gaps: BIG_GAPS, allergies: ['dairy', 'eggs', 'nuts', 'soy'] });
    expect(groups.length).toBeGreaterThan(0);
    expect(namesFrom(groups).length).toBeGreaterThan(0);
  });
});

describe('dietary preference filtering', () => {
  it('never suggests animal products to a vegan', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, dietaryPreferences: ['vegan'] }));
    for (const nonVegan of [
      'Greek yogurt', 'Hard-boiled egg', 'Grilled paneer',
      '3oz grilled chicken', 'Cucumber raita', 'Chaas (buttermilk)',
    ]) {
      expect(names).not.toContain(nonVegan);
    }
  });

  it('never suggests meat to a vegetarian but allows dairy', () => {
    const names = namesFrom(selectPairings({ gaps: BIG_GAPS, dietaryPreferences: ['vegetarian'] }));
    expect(names).not.toContain('3oz grilled chicken');
  });

  it('excludes high-carb options on keto', () => {
    const safe = filterSafeCandidates(PAIRING_CANDIDATES, { dietaryPreferences: ['keto'] });
    const ids = safe.map((c) => c.id);
    expect(ids).not.toContain('dal');
    expect(ids).not.toContain('chickpeas');
    expect(ids).not.toContain('apple');
  });

  it('combines diet and allergy constraints', () => {
    const names = namesFrom(
      selectPairings({ gaps: BIG_GAPS, dietaryPreferences: ['vegan'], allergies: ['soy'] })
    );
    expect(names).not.toContain('Pan-fried tofu');
    expect(names).not.toContain('Greek yogurt');
  });
});

describe('ranking by actual gap', () => {
  it('prioritises protein when protein is the biggest shortfall', () => {
    const groups = selectPairings({ gaps: { protein: 40, fiber: 1, calories: 900, hydration: 0 } });
    expect(groups[0].goal).toBe(PAIRING_GOALS.PROTEIN);
  });

  it('prioritises fiber when fiber is the shortfall', () => {
    const groups = selectPairings({ gaps: { protein: 0, fiber: 12, calories: 900, hydration: 0 } });
    expect(groups[0].goal).toBe(PAIRING_GOALS.FIBER);
  });

  it('suggests nothing when there is no gap to close', () => {
    const groups = selectPairings({ gaps: { protein: 0, fiber: 0, calories: 0, hydration: 0 } });
    expect(groups).toHaveLength(0);
  });

  it('respects the limit', () => {
    const groups = selectPairings({ gaps: BIG_GAPS, limit: 1 });
    expect(groups.length).toBeLessThanOrEqual(1);
  });
});

describe('cuisine preference is a nudge, not a filter', () => {
  it('surfaces Indian options for an Indian-cuisine user', () => {
    const names = namesFrom(
      selectPairings({ gaps: BIG_GAPS, cuisines: ['indian'], limit: 3 })
    );
    expect(names.some((n) => ['Side of dal', 'Grilled paneer', 'Roasted chickpeas'].includes(n))).toBe(true);
  });

  it('never lets cuisine override an allergy', () => {
    const names = namesFrom(
      selectPairings({ gaps: BIG_GAPS, cuisines: ['indian'], allergies: ['dairy'], limit: 3 })
    );
    expect(names).not.toContain('Grilled paneer');
    expect(names).not.toContain('Cucumber raita');
  });
});

describe('robustness', () => {
  it('handles empty inputs without throwing', () => {
    expect(() => selectPairings({})).not.toThrow();
    expect(() => selectPairings({ gaps: {} })).not.toThrow();
  });

  it('treats an unknown allergen id literally rather than ignoring it', () => {
    const safe = filterSafeCandidates(
      [{ id: 'x', name: 'X', goal: 'protein', protein: 5, calories: 10, allergens: ['sesame'] }],
      { allergies: ['sesame'] }
    );
    expect(safe).toHaveLength(0);
  });
});
