import {
  SMART_FOODS,
  getCurrentMealType,
  getLocalHourFromOffset,
  resolveSmartNutritionGoals,
} from '../src/services/smartRecommendationEngine.js';
import { detectDietViolation, detectAllergenRisk } from '../src/services/foodKnowledgeGraphService.js';

// Regression coverage for the Smart Food Picks catalogue. This is the "no
// consistency check" gap flagged in review: SMART_FOODS.excludedDiets is a
// hand-authored array with nothing enforcing it stays in sync with the
// deterministic diet checker. getSmartRecommendations() now runs both (see
// smartRecommendationEngine.js), so a divergence here is not a live safety
// gap, but it's still worth surfacing — an excludedDiets entry that
// contradicts the checker is either stale or hiding a term-list gap.
describe('SMART_FOODS catalogue diet-safety coverage', () => {
  const CHECKED_DIETS = ['vegan', 'vegetarian', 'keto'];

  test.each(SMART_FOODS)('$id: excludedDiets never UNDER-restricts vs the checker', (food) => {
    for (const diet of CHECKED_DIETS) {
      const checkerViolates = detectDietViolation(food, [diet]).violates;
      const listExcludes = (food.excludedDiets || []).includes(diet);
      // The hand list is allowed to be MORE conservative than the checker
      // (curator judgment on borderline items), but never less — if the
      // checker says a food violates a diet, the catalogue entry must agree.
      if (checkerViolates) {
        expect(listExcludes).toBe(true);
      }
    }
  });

  // The catalogue has zero foods declaring allergen-relevant ingredients
  // beyond what a handful of entries had reason to add — this just makes
  // sure detectAllergenRisk can actually see them, so a `name`-only regression
  // (someone strips the `ingredients` field back out) fails loudly instead
  // of silently reopening the "Avocado Toast passes a wheat-allergy check"
  // bug this catalogue was fixed for.
  test('avocado toast, mediterranean bowl, and tofu stir fry expose their hidden allergens', () => {
    const avocadoToast = SMART_FOODS.find((f) => f.id === 'avocado_toast');
    const medBowl = SMART_FOODS.find((f) => f.id === 'mediterranean_bowl');
    const tofuStirFry = SMART_FOODS.find((f) => f.id === 'stir_fry_tofu');

    expect(detectAllergenRisk(avocadoToast, ['wheat']).hasRisk).toBe(true);
    expect(detectAllergenRisk(medBowl, ['dairy']).hasRisk).toBe(true);
    expect(detectAllergenRisk(medBowl, ['wheat']).hasRisk).toBe(true);
    expect(detectAllergenRisk(medBowl, ['sesame']).hasRisk).toBe(true);
    expect(detectAllergenRisk(tofuStirFry, ['soy']).hasRisk).toBe(true);
    expect(detectAllergenRisk(tofuStirFry, ['sesame']).hasRisk).toBe(true);

    // And an unrelated allergy must NOT be blocked by these additions.
    expect(detectAllergenRisk(avocadoToast, ['peanut']).hasRisk).toBe(false);
    expect(detectAllergenRisk(tofuStirFry, ['tree nut']).hasRisk).toBe(false);
  });

  // Regression: 'butter' (a dairy cross-reactivity term) used to false-match
  // nut butters, which would have wrongly excluded these from a vegan diet
  // and wrongly blocked them for a dairy allergy.
  test('nut-butter entries are not treated as dairy', () => {
    const applePeanutButter = SMART_FOODS.find((f) => f.id === 'apple_peanut_butter');
    expect(detectDietViolation(applePeanutButter, ['vegan']).violates).toBe(false);
    expect(detectAllergenRisk(applePeanutButter, ['dairy']).hasRisk).toBe(false);
  });
});

describe('Smart Food Picks live context', () => {
  test('uses the canonical nutrition_goals field names', () => {
    expect(resolveSmartNutritionGoals({
      dailyCalories: 1800,
      proteinG: 110,
      carbsG: 180,
      fatsG: 60,
    })).toEqual({ dailyCalories: 1800, proteinG: 110, carbsG: 180, fatG: 60 });
  });

  test('keeps valid zero macro goals instead of replacing them with defaults', () => {
    expect(resolveSmartNutritionGoals({ proteinG: 0, carbsG: 0, fatsG: 0 })).toMatchObject({
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  test('derives meal timing from the device timezone, not the server timezone', () => {
    const noonUtc = new Date('2026-08-26T12:00:00.000Z');
    expect(getLocalHourFromOffset(240, noonUtc)).toBe(8);
    expect(getCurrentMealType(getLocalHourFromOffset(240, noonUtc))).toBe('breakfast');
    expect(getLocalHourFromOffset(-330, noonUtc)).toBe(17);
    expect(getCurrentMealType(getLocalHourFromOffset(-330, noonUtc))).toBe('dinner');
  });
});
