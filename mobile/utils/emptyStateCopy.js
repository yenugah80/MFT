/**
 * emptyStateCopy - goal-aware subtitles for AnalyticsEmptyState.
 *
 * Only nutrition and activity get a primaryGoal-specific variant here —
 * hydration and mood have no field reliably tied to primaryGoal (hydration's
 * water goal defaults to the same 2.0L for every user unless manually
 * edited, so referencing it wouldn't read as real personalization). Callers
 * fall back to their existing static copy when this returns null.
 */

export function getNutritionEmptySubtitle(primaryGoal) {
  if (primaryGoal === 'lose') {
    return "Since you're tracking to lose weight, log a meal to see how it fits your calorie budget";
  }
  if (primaryGoal === 'gain') {
    return "Since you're building toward a calorie surplus, log a meal to track your progress";
  }
  return null;
}

export function getActivityEmptySubtitle(primaryGoal) {
  if (primaryGoal === 'lose') {
    return 'Even a short walk helps toward your weight-loss goal — log your first workout';
  }
  if (primaryGoal === 'gain') {
    return 'Log a workout to see how activity supports your goal';
  }
  return null;
}
