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

  // Regression: "coconut milk" (a real, common ingredient) was being
  // flagged as a likely misspelling of the unrelated "coconut oil" —
  // both start with "coconut" and have short second words, so the
  // full-phrase edit-distance score alone cleared the 0.7 threshold even
  // though "coconut milk" was never actually a typo. Root cause was two-
  // fold: the exact phrase wasn't in the known-foods list, AND the
  // matcher never checked whether each individual word was independently
  // valid before falling back to whole-string fuzzy comparison.
  test('does not flag a real compound ingredient as a misspelling of an unrelated compound term', () => {
    expect(getSpellingSuggestions('coconut milk')).toMatchObject({
      isRecognized: true,
      needsCorrection: false,
    });
  });

  test('recognizes any "known + known" compound even when the exact phrase is not itself listed', () => {
    // Neither "almond flour" nor "cashew milk" need to be hand-listed —
    // as long as each word is independently a recognized food term, the
    // compound is trusted rather than fuzzy-matched against the whole list.
    expect(getSpellingSuggestions('almond milk').needsCorrection).toBe(false);
    expect(getSpellingSuggestions('soy milk').needsCorrection).toBe(false);
  });

  test('still catches a genuine single-word misspelling after the compound-word check', () => {
    expect(getSpellingSuggestions('chiken')).toMatchObject({
      needsCorrection: true,
      didYouMean: 'chicken',
    });
  });
});
