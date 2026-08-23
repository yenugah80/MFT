/**
 * Regression tests for two small pure helpers extracted from the /recommendations
 * route: buildNutritionalGaps() and getDeterministicReason(). Both were the
 * source of real, live bugs found during a deep-dive audit —
 * buildNutritionalGaps had its 'low'/'ok' direction inverted (a user who'd
 * already eaten plenty of protein was scored as protein-deficient, and vice
 * versa), and getDeterministicReason produced a boilerplate sentence that,
 * combined with the mobile 5W2H card, rendered as the food's own name
 * repeated twice back to back.
 */
import { buildNutritionalGaps, getDeterministicReason } from '../src/services/recommendationReasoning.js';

describe('buildNutritionalGaps', () => {
  test('a user who has eaten almost no protein today (large remaining) is status low', () => {
    const gaps = buildNutritionalGaps({ calories: 1500, protein: 140, carbs: 200, fats: 50 });
    expect(gaps.protein.status).toBe('low');
  });

  test('a user who has already eaten plenty of protein today (small remaining) is status ok, not low', () => {
    const gaps = buildNutritionalGaps({ calories: 1500, protein: 5, carbs: 200, fats: 50 });
    expect(gaps.protein.status).toBe('ok');
  });

  test('same direction holds for carbs and fats', () => {
    const highRemaining = buildNutritionalGaps({ calories: 1500, protein: 5, carbs: 200, fats: 50 });
    expect(highRemaining.carbs.status).toBe('low');
    expect(highRemaining.fats.status).toBe('low');

    const lowRemaining = buildNutritionalGaps({ calories: 1500, protein: 5, carbs: 10, fats: 2 });
    expect(lowRemaining.carbs.status).toBe('ok');
    expect(lowRemaining.fats.status).toBe('ok');
  });

  test('fiber is honestly unknown, not fabricated', () => {
    const gaps = buildNutritionalGaps({ calories: 1500, protein: 140, carbs: 200, fats: 50 });
    expect(gaps.fiber.status).toBe('unknown');
  });

  test('calories.remaining passes through unchanged for scoreCandidate to compare against', () => {
    const gaps = buildNutritionalGaps({ calories: 842, protein: 5, carbs: 10, fats: 2 });
    expect(gaps.calories.remaining).toBe(842);
  });
});

describe('getDeterministicReason', () => {
  test('leads with a real protein number against the actual remaining budget when it applies', () => {
    const candidate = { name: 'Grilled Chicken Breast', nutrition: { calories: 200, protein: 30, fiber: 0 } };
    const reason = getDeterministicReason(candidate, 'lunch', { protein: 45, calories: 800 });
    expect(reason).toContain('30g protein');
    expect(reason).toContain('45g');
  });

  test('falls back to fiber when protein does not apply', () => {
    const candidate = { name: 'Steamed Broccoli', nutrition: { calories: 55, protein: 4, fiber: 5 } };
    const reason = getDeterministicReason(candidate, 'dinner', { protein: 10, calories: 800 });
    expect(reason).toContain('fiber');
  });

  test('never produces a boilerplate sentence that just restates the name and meal type', () => {
    const candidate = { name: 'Greek Yogurt Protein Bowl with Chia & Berries', nutrition: { calories: 250, protein: 18, fiber: 3 } };
    const reason = getDeterministicReason(candidate, 'snack', { protein: 40, calories: 500 });
    expect(reason).not.toMatch(/ranked highly for your current .* context and remaining nutrition budget/);
  });

  test('a reason that leads with the food name is still a complete, non-repeating sentence', () => {
    // Regression: the mobile 5W2H card builds "${action} to address ${reason}"
    // where action is also the food name — if reason also opens with the
    // food name unconditionally, the UI doubled it. This just proves the
    // reason text itself is coherent; the mobile-side dedup is covered
    // separately in Recommendation5W2HCard's own test coverage.
    const candidate = { name: 'Avocado Toast', nutrition: { calories: 280, protein: 7, fiber: 8 } };
    const reason = getDeterministicReason(candidate, 'breakfast', { protein: 5, calories: 400 });
    expect(reason.startsWith('Avocado Toast')).toBe(true);
    expect(reason.match(/Avocado Toast/g).length).toBe(1);
  });
});
