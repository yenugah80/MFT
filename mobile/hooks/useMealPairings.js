/**
 * Meal pairings
 *
 * Prefers the backend recommendation engine, which knows things the client
 * cannot: the user's food history, what they've previously rejected, learned
 * correlations, collaborative signals, and a food knowledge graph that
 * understands cross-reactive allergens and hidden ones (pad thai contains
 * peanuts). It also applies the same hard allergen elimination the rest of the
 * recommendation system uses.
 *
 * Falls back to the local selector when the request fails — offline, slow, or
 * a cold backend. The local path is deliberately kept rather than deleted: this
 * screen appears immediately after logging a meal, and an empty section there
 * is a worse experience than a slightly less personalised suggestion.
 *
 * Both paths apply allergy and diet filtering. Neither can return an unscreened
 * food.
 */

import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { selectPairings } from '../utils/pairingSelector';

const GOAL_META = {
  protein: { icon: 'fitness', title: 'Boost Protein' },
  fiber: { icon: 'leaf', title: 'Add Fiber' },
  hydration: { icon: 'water', title: 'Stay Hydrated' },
};

/** Groups the flat server response into the shape the UI renders. */
function groupServerPairings(pairings = []) {
  const byGoal = new Map();
  for (const p of pairings) {
    const list = byGoal.get(p.goal) ?? [];
    if (list.length < 3) list.push({ name: p.name, benefit: p.benefit, calories: p.calories });
    byGoal.set(p.goal, list);
  }
  return [...byGoal.entries()].slice(0, 2).map(([goal, suggestions]) => ({
    ...(GOAL_META[goal] ?? GOAL_META.protein),
    category: goal,
    suggestions,
  }));
}

export function useMealPairings({ meal, userGoals, dailyTotals, dietary, enabled = true }) {
  const [pairings, setPairings] = useState(null);
  const [source, setSource] = useState(null);

  const macros = meal?.macros;
  const mealName = meal?.name;

  useEffect(() => {
    // No dietary profile means nothing has been screened — show nothing rather
    // than something unscreened. Same rule the local selector applies.
    if (!enabled || !macros || !dietary) {
      setPairings(null);
      return;
    }

    let cancelled = false;

    const localFallback = () => {
      const remainingProtein = (userGoals?.dailyProtein || 0) - (dailyTotals?.totalProtein || 0);
      const remainingCalories = (userGoals?.dailyCalories || 0) - (dailyTotals?.totalCalories || 0);
      const remainingFiber = 28 - (dailyTotals?.totalFiber || 0);
      const protein = macros.protein_g || 0;
      const fiber = macros.fiber_g || 0;
      const calories = macros.calories_kcal || 0;
      const sodium = macros.sodium_mg || 0;

      return selectPairings({
        gaps: {
          protein: protein < 15 && remainingProtein > 15 ? remainingProtein : 0,
          fiber: fiber < 3 && calories > 200 ? Math.max(remainingFiber, 0) : 0,
          hydration: sodium > 600 || calories > 500 ? 1 : 0,
          calories: Math.max(remainingCalories, 0),
        },
        allergies: dietary.allergies ?? [],
        dietaryPreferences: dietary.preferences ?? [],
        cuisines: dietary.cuisinePreference ?? [],
        seed: mealName || '',
        limit: 2,
      }).map((g) => ({ ...(GOAL_META[g.goal] ?? GOAL_META.protein), category: g.goal, suggestions: g.suggestions }));
    };

    (async () => {
      try {
        const res = await apiClient.post('/recommendations/pairings', {
          macros: {
            protein_g: macros.protein_g,
            fiber_g: macros.fiber_g,
            calories_kcal: macros.calories_kcal,
            sodium_mg: macros.sodium_mg,
            consumedProtein_g: dailyTotals?.totalProtein,
            consumedFiber_g: dailyTotals?.totalFiber,
            consumedCalories_kcal: dailyTotals?.totalCalories,
          },
          mealType: meal?.mealType || 'lunch',
        });

        if (cancelled) return;

        const grouped = groupServerPairings(res?.pairings);
        if (grouped.length > 0) {
          setPairings(grouped);
          setSource('server');
          return;
        }
        // Server reachable but had nothing useful — use the local pool rather
        // than showing an empty section.
        setPairings(localFallback());
        setSource('local');
      } catch (err) {
        if (cancelled) return;
        console.log('[useMealPairings] Server pairings unavailable, using local:', err?.message);
        setPairings(localFallback());
        setSource('local');
      }
    })();

    return () => { cancelled = true; };
  }, [macros, mealName, userGoals, dailyTotals, dietary, enabled, meal?.mealType]);

  return { pairings, source };
}

export default useMealPairings;
