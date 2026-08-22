/**
 * useMealPairings — regression coverage for two real bugs found on the
 * meal-logged screen:
 *
 * 1. The effect depended on the `macros`/`userGoals`/`dailyTotals` OBJECTS,
 *    which MealLoggedCard.jsx and log.js both rebuild as fresh literals on
 *    every render — so the effect (and its POST /recommendations/pairings
 *    call) re-fired on every re-render of the screen, not just when a value
 *    actually changed. Fixed by depending on primitives extracted from
 *    those objects instead.
 * 2. The offline fallback read `userGoals?.dailyProtein`, a field that does
 *    not exist on the object log.js actually passes (the real field is
 *    `proteinG`) — so the protein-gap calculation always evaluated to <= 0
 *    and could never surface a protein-boost suggestion.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMealPairings } from '../hooks/useMealPairings';
import apiClient from '../services/apiClient';

jest.mock('../services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const dietary = { allergies: [], preferences: [], cuisinePreference: [] };

function makeMeal(overrides = {}) {
  return {
    name: 'Chicken Bowl',
    mealType: 'dinner',
    macros: { protein_g: 30, fiber_g: 5, calories_kcal: 400, sodium_mg: 300 },
    ...overrides,
  };
}

const userGoals = { dailyCalories: 2000, proteinG: 150, carbsG: 250, fatG: 65, fiberG: 30 };
const dailyTotals = { totalProtein: 40, totalCalories: 800, totalFiber: 10 };

beforeEach(() => {
  apiClient.post.mockReset();
  apiClient.post.mockResolvedValue({ pairings: [{ goal: 'protein', name: 'Greek Yogurt', benefit: 'protein', calories: 100 }] });
});

describe('useMealPairings — request dedup', () => {
  it('does not re-fire the request when called again with equal-value-but-different-reference props', async () => {
    const { rerender } = renderHook(
      (props) => useMealPairings(props),
      { initialProps: { meal: makeMeal(), userGoals: { ...userGoals }, dailyTotals: { ...dailyTotals }, dietary, enabled: true } }
    );

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));

    // Same values, brand-new object references for meal/userGoals/dailyTotals
    // — simulates a parent re-render that rebuilds these as fresh literals.
    rerender({ meal: makeMeal(), userGoals: { ...userGoals }, dailyTotals: { ...dailyTotals }, dietary, enabled: true });

    // Give any (incorrect) re-fire a chance to happen before asserting it didn't.
    await new Promise((r) => setTimeout(r, 50));
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('does re-fire when a real value changes (different meal macros)', async () => {
    const { rerender } = renderHook(
      (props) => useMealPairings(props),
      { initialProps: { meal: makeMeal(), userGoals, dailyTotals, dietary, enabled: true } }
    );

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));

    rerender({ meal: makeMeal({ macros: { protein_g: 99, fiber_g: 5, calories_kcal: 400, sodium_mg: 300 } }), userGoals, dailyTotals, dietary, enabled: true });

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
  });
});

describe('useMealPairings — sends the real mealType', () => {
  it('sends the meal\'s actual mealType, not a hardcoded default', async () => {
    renderHook(() => useMealPairings({ meal: makeMeal({ mealType: 'breakfast' }), userGoals, dailyTotals, dietary, enabled: true }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith('/recommendations/pairings', expect.objectContaining({ mealType: 'breakfast' }));
  });
});

describe('useMealPairings — offline fallback protein gap', () => {
  it('uses userGoals.proteinG (the real field), not the nonexistent dailyProtein', async () => {
    apiClient.post.mockRejectedValue(new Error('offline'));

    const lowProteinMeal = makeMeal({ macros: { protein_g: 5, fiber_g: 1, calories_kcal: 200, sodium_mg: 100 } });
    // Goal 150g protein, only 20g consumed today -> remainingProtein = 130g,
    // well above the 15g threshold that should surface a protein suggestion.
    const { result } = renderHook(() =>
      useMealPairings({
        meal: lowProteinMeal,
        userGoals: { dailyCalories: 2000, proteinG: 150 },
        dailyTotals: { totalProtein: 20, totalCalories: 400, totalFiber: 5 },
        dietary,
        enabled: true,
      })
    );

    await waitFor(() => expect(result.current.source).toBe('local'));
    const categories = result.current.pairings.map((p) => p.category);
    expect(categories).toContain('protein');
  });
});
