/**
 * Small, dependency-free pure functions used to build the deterministic
 * (non-AI) recommendation path's scoring signals and display text.
 *
 * Deliberately kept out of routes/recommendations.js: that file imports the
 * live DB client, the OpenAI client, and several other services at module
 * load time, which makes it impossible to unit-test a pure function from it
 * without a real database connection. Nothing here touches the network or
 * the database.
 */

/**
 * Build the nutritionalGaps signal scoreCandidate() (candidateGenerationService.js)
 * reads to reward foods that close a real gap. status: 'low' means "the user
 * hasn't gotten much of this nutrient today, still needs it". remainingBudget.*
 * is goal MINUS consumed, so a LARGE remaining value is what means "low
 * intake so far" — an earlier version of this compared the wrong direction
 * (remaining < threshold ? 'low' : 'ok'), which meant a user who'd already
 * eaten plenty of protein (small remaining) got scored as protein-deficient
 * and kept getting more high-protein foods pushed at them, while someone
 * who'd eaten almost none never got the boost. fiber stays 'unknown':
 * daily_nutrition_summary has no fiber column to compare against —
 * reporting a status here would mean fabricating a number, not fixing a bug.
 *
 * @param {{calories: number, protein: number, carbs: number, fats: number}} remainingBudget
 */
export function buildNutritionalGaps(remainingBudget) {
  return {
    calories: { remaining: remainingBudget.calories },
    protein:  { status: remainingBudget.protein  > 30  ? 'low' : 'ok', remaining: remainingBudget.protein },
    carbs:    { status: remainingBudget.carbs    > 50  ? 'low' : 'ok', remaining: remainingBudget.carbs },
    fats:     { status: remainingBudget.fats     > 15  ? 'low' : 'ok', remaining: remainingBudget.fats },
    fiber:    { status: 'unknown' },
  };
}

/**
 * A real reason this specific candidate was picked, not a template that
 * restates its own name and meal type back at the user. Picks the single
 * most concrete thing true about the food — a real macro number against the
 * user's actual remaining budget where possible — falling back to a fit
 * statement only when nothing more specific applies.
 */
export function getDeterministicReason(candidate, mealType, remainingBudget) {
  const n = candidate.nutrition || {};
  const protein = n.protein ?? 0;
  const fiber = n.fiber ?? 0;
  const calories = n.calories ?? 0;

  if (protein >= 15 && remainingBudget?.protein > 0) {
    return `${candidate.name} adds ${Math.round(protein)}g protein toward the ${Math.round(remainingBudget.protein)}g you still need today.`;
  }
  if (fiber >= 4) {
    return `${candidate.name} is a solid fiber source (${Math.round(fiber)}g) to round out today's meals.`;
  }
  if (candidate.hydrating) {
    return `${candidate.name} adds hydration alongside your ${mealType}.`;
  }
  if (candidate.moodBoost) {
    return `${candidate.name} is one of the foods linked to steadier mood and energy.`;
  }
  if (remainingBudget?.calories > 0 && calories > 0) {
    return `${candidate.name} fits your remaining ${Math.round(remainingBudget.calories)} kcal for ${mealType}.`;
  }
  return `${candidate.name} was the best match available for ${mealType} right now.`;
}
