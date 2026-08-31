import { selectBestUSDAMatch, MIN_ACCEPTABLE_MATCH_SCORE } from '../src/utils/usdaMatching.js';

describe('selectBestUSDAMatch — match-quality gate', () => {
  it('accepts a strong exact-phrase match', () => {
    const results = [
      { description: 'Chicken, broilers, breast, meat only, raw', dataType: 'SR Legacy', fdcId: 1 },
      { description: 'Beef, ground, raw', dataType: 'SR Legacy', fdcId: 2 },
    ];
    const best = selectBestUSDAMatch(results, 'chicken breast');
    expect(best).not.toBeNull();
    expect(best.fdcId).toBe(1);
    expect(best.matchScore).toBeGreaterThanOrEqual(MIN_ACCEPTABLE_MATCH_SCORE);
  });

  it('rejects an ingredient-conflicting match even if it is the only candidate', () => {
    const results = [
      { description: 'Beef, ground, raw', dataType: 'SR Legacy', fdcId: 2 },
    ];
    const best = selectBestUSDAMatch(results, 'chicken breast');
    expect(best).toBeNull();
  });

  it('returns null when nothing clears the threshold, instead of confidently returning a weak match', () => {
    const results = [
      { description: 'Snack food, generic mix', dataType: 'Branded', fdcId: 3 },
    ];
    const best = selectBestUSDAMatch(results, 'chicken tikka masala');
    expect(best).toBeNull();
  });

  it('returns null for empty/missing results instead of throwing', () => {
    expect(selectBestUSDAMatch([], 'rice')).toBeNull();
    expect(selectBestUSDAMatch(null, 'rice')).toBeNull();
    expect(selectBestUSDAMatch(undefined, 'rice')).toBeNull();
  });

  it('prefers the better of two plausible candidates', () => {
    const results = [
      { description: 'Rice, white, long-grain, cooked', dataType: 'SR Legacy', fdcId: 4 },
      { description: 'Rice pudding, ready-to-eat', dataType: 'Branded', fdcId: 5 },
    ];
    const best = selectBestUSDAMatch(results, 'cooked white rice');
    expect(best.fdcId).toBe(4);
  });
});
