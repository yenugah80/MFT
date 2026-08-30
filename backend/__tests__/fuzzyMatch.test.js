import {
  analyzeSpelling,
  getSpellingSuggestions,
} from '../src/utils/fuzzyMatch.js';

describe('ingredient spelling review', () => {
  test('recognizes a correctly spelled oil', () => {
    expect(getSpellingSuggestions('sesame oil')).toMatchObject({
      isRecognized: true,
      needsCorrection: false,
    });
  });

  test('asks for confirmation when sesame oil is misspelled', () => {
    expect(getSpellingSuggestions('sesa oil')).toMatchObject({
      isRecognized: false,
      needsCorrection: true,
      didYouMean: 'sesame oil',
    });
  });

  test('does not invent a correction for an unrelated unknown ingredient', () => {
    const result = analyzeSpelling('xylophonic relish');
    expect(result.isLikelyMisspelling).toBeFalsy();
    expect(result.didYouMean).toBeNull();
  });

  test('does not treat a preparation modifier as a spelling error', () => {
    const result = getSpellingSuggestions('cooked brown rice');
    expect(result.needsCorrection).toBe(false);
    expect(result.didYouMean).toBeUndefined();
  });
});
