import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// OpenAIClient's constructor connects to REDIS_URL (real backend/.env value,
// loaded via src/config/env.js) if set at all, regardless of test context —
// none of this suite's existing tests import OpenAIClient.js, so nothing
// else has hit this. Mocked here so importing it below never attempts a
// real network connection or hangs the test run.
jest.mock('redis', () => ({
  createClient: () => ({
    on: jest.fn(),
    connect: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
  }),
}));

const { openaiClient } = await import('../src/services/apiClients/OpenAIClient.js');

// Regression coverage for the voice-logging bug found 2026-09: a
// malformed/wrong-shaped AI response (valid JSON, but missing or
// non-array `foods`) was silently coerced into an empty array —
// indistinguishable from the model genuinely finding no food in the
// transcript. voiceLog.js then told the user "Couldn't identify any food
// in that," which is wrong when the actual problem was a response-shape
// mismatch a retry would likely fix. This pins the corrected behavior:
// a shape mismatch now throws a distinguishable, coded error instead of
// silently returning [].

describe('OpenAIClient.estimateNutritionForText — malformed response handling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Bypass the in-memory nutrition cache so each test's mocked
    // chatCompletionJSON response is actually exercised.
    openaiClient.nutritionCache?.flushAll?.();
  });

  test('missing "foods" field throws a coded, distinguishable error (not silent [])', async () => {
    jest.spyOn(openaiClient, 'chatCompletionJSON').mockResolvedValue({ someOtherField: 'unexpected' });

    await expect(
      openaiClient.estimateNutritionForText('a unique missing-foods query xyz1', {})
    ).rejects.toMatchObject({ code: 'MALFORMED_AI_RESPONSE' });
  });

  test('"foods" present but not an array throws the same coded error', async () => {
    jest.spyOn(openaiClient, 'chatCompletionJSON').mockResolvedValue({ foods: 'not an array' });

    await expect(
      openaiClient.estimateNutritionForText('a unique non-array-foods query xyz2', {})
    ).rejects.toMatchObject({ code: 'MALFORMED_AI_RESPONSE' });
  });

  test('a genuinely empty foods array is NOT an error — this is the one legitimate "found nothing" case', async () => {
    jest.spyOn(openaiClient, 'chatCompletionJSON').mockResolvedValue({ foods: [] });

    const result = await openaiClient.estimateNutritionForText('a unique empty-foods query xyz3', {});
    expect(result).toEqual([]);
  });

  test('a well-formed response with real items still returns them normally (no regression)', async () => {
    jest.spyOn(openaiClient, 'chatCompletionJSON').mockResolvedValue({
      foods: [
        {
          name: 'rice',
          quantity: 1,
          unit: 'cup',
          nutrition: { calories: 200, protein: 4, carbs: 45, fat: 0, fiber: 1, sugar: 0, sodium: 5 },
        },
      ],
    });

    const result = await openaiClient.estimateNutritionForText('a unique well-formed query xyz4', {});
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('rice');
  });
});
