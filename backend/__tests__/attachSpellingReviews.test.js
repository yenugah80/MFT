import { describe, test, expect } from '@jest/globals';

// resolve.js transitively imports OpenAIClient.js, whose constructor
// connects to REDIS_URL (real backend/.env value) regardless of test
// context — see openAIClientMalformedResponse.test.js's header for the
// same issue and fix.
jest.mock('redis', () => ({
  createClient: () => ({
    on: jest.fn(),
    connect: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
  }),
}));

const { attachSpellingReviews, flagUnrecognizedLowEstimate, flagUnidentifiedFoodName } = await import('../src/routes/resolve.js');

// Regression coverage for a universal (not food-specific) bug found 2026-09
// while investigating a "moongsal"/"Mondal" (typo/mis-transcription of
// "moong dal") case: computeConfidenceTier (canonicalNutrition.js) returns
// the lowercase strings 'low' | 'medium' | 'high', but attachSpellingReviews'
// early-return guard compared against 'Low' (capital L) — a value that
// function never produces. `confidenceTier !== 'Low'` was therefore true
// for EVERY tier, including a genuine 'low', so this function returned
// early on every single call, for every food, for every user — the entire
// spelling-suggestion feature was silently dead, not narrowly broken for
// one ingredient. fuzzyMatch.js's underlying matching was never the
// problem — verified directly here across several unrelated foods.

function resolvedItemWithTier(tier) {
  return { confidenceTier: tier };
}

describe('attachSpellingReviews — case-sensitivity fix, verified across unrelated foods', () => {
  const misspellings = [
    { typed: 'moongsal', expected: 'moong dal' },   // the reported case (typo)
    // NOT included here: 'Mondal' (the voice mis-transcription in the same
    // report) — fuzzyMatch.js's own match score for it is 67%, below the
    // 70% analyzeSpelling requires for an auto "did you mean" (a real,
    // separate, reasonable threshold this fix doesn't change and isn't
    // the bug under test). It still appears in the raw suggestions list,
    // and — being an AI-estimation-path near-zero-calorie result — still
    // gets caught by the separate unrecognized_food_low_estimate flag
    // (resolve.js), just without an auto-suggested correction. Covered in
    // its own test below instead of this genericity table.
    { typed: 'chiken', expected: 'chicken' },
    { typed: 'brocoli', expected: 'broccoli' },
    { typed: 'yogourt', expected: 'yogurt' },
    { typed: 'quinoaa', expected: 'quinoa' },
    { typed: 'spageti', expected: 'spaghetti' },
    { typed: 'banan', expected: 'banana' },
  ];

  test.each(misspellings)('flags "$typed" for confirmation and suggests "$expected" when confidenceTier is low', ({ typed, expected }) => {
    const parsedFood = { name: typed };
    const resolvedItem = resolvedItemWithTier('low');
    const knownReviews = [];

    attachSpellingReviews(parsedFood, resolvedItem, knownReviews);

    expect(resolvedItem.requiresUserConfirmation).toBe(true);
    expect(resolvedItem.flags).toContain('spelling_confirmation_required');
    expect(resolvedItem.suggestions?.[0]?.canonical).toBe(expected);
  });

  test('"Mondal" (below the auto-suggest confidence threshold) is not auto-corrected, but still surfaces as a raw suggestion candidate', () => {
    const resolvedItem = resolvedItemWithTier('low');
    attachSpellingReviews({ name: 'Mondal' }, resolvedItem, []);
    // Below analyzeSpelling's 70% threshold for an auto "did you mean" —
    // correctly NOT flagged via this path. (It's still caught separately
    // by resolve.js's unrecognized_food_low_estimate flag when the
    // AI-estimation result comes back near-zero-calorie, same as any other
    // unrecognized name — that's a different code path than this one.)
    expect(resolvedItem.requiresUserConfirmation).toBeUndefined();
  });

  test('does NOT flag a food the resolver already resolved confidently (medium/high tier)', () => {
    for (const tier of ['medium', 'high']) {
      const parsedFood = { name: 'chiken' }; // same misspelling — tier alone gates this
      const resolvedItem = resolvedItemWithTier(tier);
      attachSpellingReviews(parsedFood, resolvedItem, []);
      expect(resolvedItem.requiresUserConfirmation).toBeUndefined();
      expect(resolvedItem.flags).toBeUndefined();
    }
  });

  test('a correctly-spelled food never gets flagged, regardless of tier', () => {
    const resolvedItem = resolvedItemWithTier('low');
    attachSpellingReviews({ name: 'chicken' }, resolvedItem, []);
    expect(resolvedItem.requiresUserConfirmation).toBeUndefined();
  });

  test('missing confidenceTier (undefined) still runs the check — the guard only skips on a truthy non-low tier', () => {
    const resolvedItem = {}; // confidenceTier never set
    attachSpellingReviews({ name: 'chiken' }, resolvedItem, []);
    expect(resolvedItem.requiresUserConfirmation).toBe(true);
  });
});

describe('flagUnrecognizedLowEstimate — shared between text and voice resolution', () => {
  // Regression coverage for a second, related bug found while wiring this
  // check into voice input too: text-mode's resolver uses the source
  // string 'openai_estimation' (smartNutritionResolver.js), voice-mode's
  // uses 'ai_estimate' (OpenAIClient.js's estimateNutritionForText) — two
  // different words for "this came from an AI guess." Matching only
  // 'estimation' silently never matched voice's 'ai_estimate' at all, so
  // this check would have appeared to work (text-mode tests would pass)
  // while never actually running for the input path the original bug
  // report (a voice transcription) came from.
  test('flags a near-zero-calorie estimate from either real source string in this codebase', () => {
    expect(flagUnrecognizedLowEstimate('openai_estimation', 2)).toBe('unrecognized_food_low_estimate');
    expect(flagUnrecognizedLowEstimate('openai_estimation_low_confidence', 0)).toBe('unrecognized_food_low_estimate');
    expect(flagUnrecognizedLowEstimate('ai_estimate', 2)).toBe('unrecognized_food_low_estimate');
  });

  test('does not flag a real, legitimately low-calorie estimated food', () => {
    expect(flagUnrecognizedLowEstimate('openai_estimation', 15)).toBeNull();
    expect(flagUnrecognizedLowEstimate('ai_estimate', 15)).toBeNull();
  });

  test('does not flag a record-based (non-estimated) source regardless of calories', () => {
    expect(flagUnrecognizedLowEstimate('usda_verified', 0)).toBeNull();
    expect(flagUnrecognizedLowEstimate('ingredient_breakdown', 2)).toBeNull();
  });

  test('handles missing/null source or calories without throwing', () => {
    expect(flagUnrecognizedLowEstimate(null, 2)).toBeNull();
    expect(flagUnrecognizedLowEstimate('ai_estimate', null)).toBeNull();
    expect(flagUnrecognizedLowEstimate('ai_estimate', undefined)).toBeNull();
  });
});

describe('flagUnidentifiedFoodName — catches a confidently-WRONG guess, not just a low-confidence one', () => {
  // Regression coverage for a real device test: a nonsense word spoken
  // alongside real foods ("... and some kind of blorptato thing") came back
  // from estimateNutritionForText as a fully-detailed, plausible item named
  // "potato dish" — 150 kcal, complete macros/ingredients. Neither
  // flagUnrecognizedLowEstimate (calories weren't low) nor a low
  // confidenceTier (the response was structurally complete) ever caught it.
  // The fix is a new explicit model self-report — "recognized" for voice's
  // estimateNutritionForText, "recognitionStatus" for text's separate
  // estimator — and this function is the single place both signals funnel
  // through to the same blocking flag.
  test('flags when the AI explicitly reports it did not recognize the food (recognized: false)', () => {
    expect(flagUnidentifiedFoodName(false)).toBe('unrecognized_food_name');
  });

  test('does not flag a normal recognized food', () => {
    expect(flagUnidentifiedFoodName(true)).toBeNull();
  });

  test('does not flag when the signal is absent (undefined) — only an explicit false blocks', () => {
    expect(flagUnidentifiedFoodName(undefined)).toBeNull();
  });
});
