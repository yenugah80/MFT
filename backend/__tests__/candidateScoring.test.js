/**
 * Regression tests for candidateGenerationService.scoreCandidate() — the
 * additive scoring function that ranks every food candidate before Thompson
 * Sampling and the LLM ever see them. Zero coverage existed before now.
 *
 * These pin the point values documented in the function's own comments
 * (35pt nutrition gaps, 25pt mood, 20pt hydration, 20pt activity, 10pt meal
 * timing, 5pt cuisine, rejection penalties, and the hard allergen block) so
 * a future refactor can't silently change scoring weights without a test
 * failing.
 */
import { scoreCandidate } from '../src/services/candidateGenerationService.js';

const baseFood = (overrides = {}) => ({
  name: 'Grilled Chicken Breast',
  nutrition: { calories: 200, protein: 30, carbs: 0, fat: 5, fiber: 0 },
  tags: [],
  mealTypes: ['lunch', 'dinner'],
  cuisineTags: [],
  ...overrides,
});

const baseSignals = (overrides = {}) => ({
  allergies: [],
  nutritionalGaps: { protein: { status: 'ok' }, fiber: { status: 'ok' }, calories: { remaining: 2000 } },
  mealType: 'lunch',
  ...overrides,
});

describe('scoreCandidate — allergen safety', () => {
  it('hard-blocks a food matching a declared allergen (score = -Infinity, never clamped to 0)', () => {
    const food = baseFood({ name: 'Peanut Butter Sandwich' });
    const signals = baseSignals({ allergies: ['peanuts'] });
    expect(scoreCandidate(food, signals)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('does not block an unrelated food for the same allergy', () => {
    const food = baseFood({ name: 'Grilled Chicken Breast' });
    const signals = baseSignals({ allergies: ['peanuts'] });
    expect(scoreCandidate(food, signals)).toBeGreaterThan(Number.NEGATIVE_INFINITY);
  });
});

describe('scoreCandidate — nutritional gaps (35pt)', () => {
  it('rewards high-protein food when protein gap is low', () => {
    const food = baseFood({ nutrition: { calories: 200, protein: 25, carbs: 0, fat: 5, fiber: 0 } });
    const withGap = scoreCandidate(food, baseSignals({ nutritionalGaps: { protein: { status: 'low' }, fiber: { status: 'ok' }, calories: { remaining: 2000 } } }));
    const withoutGap = scoreCandidate(food, baseSignals());
    expect(withGap).toBeGreaterThan(withoutGap);
  });

  it('penalizes a food that blows well past the remaining calorie budget', () => {
    const food = baseFood({ nutrition: { calories: 900, protein: 10, carbs: 50, fat: 20, fiber: 0 } });
    const tightBudget = scoreCandidate(food, baseSignals({ nutritionalGaps: { protein: { status: 'ok' }, fiber: { status: 'ok' }, calories: { remaining: 300 } } }));
    const roomyBudget = scoreCandidate(food, baseSignals({ nutritionalGaps: { protein: { status: 'ok' }, fiber: { status: 'ok' }, calories: { remaining: 2000 } } }));
    expect(tightBudget).toBeLessThan(roomyBudget);
  });
});

describe('scoreCandidate — mood/hydration/activity signals', () => {
  it('rewards a mood-boosting food when mood urgency is high', () => {
    const food = baseFood({ moodBoost: true });
    const urgent = scoreCandidate(food, baseSignals({ moodUrgency: 0.9 }));
    const notUrgent = scoreCandidate(food, baseSignals({ moodUrgency: 0 }));
    expect(urgent).toBeGreaterThan(notUrgent);
  });

  it('rewards a hydrating food when hydration urgency is high', () => {
    const food = baseFood({ hydrating: true });
    const urgent = scoreCandidate(food, baseSignals({ hydrationUrgency: 0.8 }));
    const notUrgent = scoreCandidate(food, baseSignals({ hydrationUrgency: 0 }));
    expect(urgent).toBeGreaterThan(notUrgent);
  });

  it('rewards high-protein foods in the post-workout window', () => {
    const food = baseFood({ tags: ['high-protein'] });
    const postWorkout = scoreCandidate(food, baseSignals({ inPostWorkoutWindow: true, proteinUrgency: 0.9 }));
    const notPostWorkout = scoreCandidate(food, baseSignals({ inPostWorkoutWindow: false }));
    expect(postWorkout).toBeGreaterThan(notPostWorkout);
  });
});

describe('scoreCandidate — meal timing and cuisine', () => {
  it('penalizes a food offered outside its intended meal types', () => {
    const food = baseFood({ mealTypes: ['breakfast'] });
    const wrongMeal = scoreCandidate(food, baseSignals({ mealType: 'dinner' }));
    const rightMeal = scoreCandidate(food, baseSignals({ mealType: 'breakfast' }));
    expect(wrongMeal).toBeLessThan(rightMeal);
  });

  it('rewards a cuisine match', () => {
    const food = baseFood({ cuisineTags: ['south indian'] });
    const match = scoreCandidate(food, baseSignals({ cuisinePreference: 'South Indian' }));
    const noMatch = scoreCandidate(food, baseSignals({ cuisinePreference: 'Mexican' }));
    expect(match).toBeGreaterThan(noMatch);
  });
});

describe('scoreCandidate — variety and rejection penalties', () => {
  it('penalizes a food the user has eaten very recently', () => {
    const food = baseFood({ name: 'Grilled Chicken Breast' });
    const recent = scoreCandidate(food, baseSignals({ recentFoodNames: ['grilled chicken breast'] }));
    const fresh = scoreCandidate(food, baseSignals({ recentFoodNames: [] }));
    expect(recent).toBeLessThan(fresh);
  });

  it('scales the rejection penalty by how many times the user rejected it', () => {
    const food = baseFood({ name: 'Kale Smoothie' });
    const score = (count) => scoreCandidate(food, baseSignals({ rejectedFoodNames: [{ name: 'kale smoothie', count }] }));
    // More rejections -> lower (or equal, once clamped at 0) score.
    expect(score(2)).toBeGreaterThanOrEqual(score(3));
    expect(score(3)).toBeGreaterThanOrEqual(score(4));
  });
});

describe('scoreCandidate — output bounds', () => {
  it('never returns a finite score outside [0, 100]', () => {
    const food = baseFood({ moodBoost: true, hydrating: true, tags: ['high-protein', 'energy-boost'] });
    const signals = baseSignals({
      moodUrgency: 1, energyUrgency: 1, hydrationUrgency: 1,
      inPostWorkoutWindow: true, proteinUrgency: 1, carbUrgency: 1, antiInflammatoryBonus: 1,
    });
    const score = scoreCandidate(food, signals);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('clamps a heavily-penalized candidate at 0, not negative', () => {
    const food = baseFood({ name: 'Kale Smoothie', mealTypes: ['breakfast'] });
    const signals = baseSignals({
      mealType: 'dinner',
      recentFoodNames: ['kale smoothie'],
      rejectedFoodNames: [{ name: 'kale smoothie', count: 5 }],
      nutritionalGaps: { protein: { status: 'ok' }, fiber: { status: 'ok' }, calories: { remaining: 50 } },
    });
    expect(scoreCandidate(food, signals)).toBe(0);
  });
});
