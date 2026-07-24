/**
 * goalFraming - phrase calorie numbers relative to the user's stated
 * primaryGoal ('lose' | 'maintain' | 'gain') instead of goal-neutral text.
 */

export function getCalorieFramingText(consumed, goal, primaryGoal) {
  const remaining = Math.max(0, goal - consumed);
  const over = Math.max(0, consumed - goal);
  const isOver = consumed > goal;

  if (primaryGoal === 'lose') {
    return isOver
      ? `${Math.round(over)} kcal over your lose-weight target`
      : `${Math.round(remaining)} kcal under budget — on pace for your goal`;
  }

  if (primaryGoal === 'gain') {
    return isOver
      ? `${Math.round(over)} kcal over budget, right on track for your gain goal`
      : `${Math.round(remaining)} kcal to go to hit your gain target`;
  }

  if (primaryGoal === 'maintain') {
    return isOver
      ? `${Math.round(over)} kcal over your ${Math.round(goal)} kcal goal`
      : `${Math.round(remaining)} kcal remaining of ${Math.round(goal)} kcal goal`;
  }

  // No goal set — today's exact original goal-neutral copy, never invent framing.
  return isOver
    ? `${Math.round(over)} kcal over your ${Math.round(goal)} kcal goal`
    : `${Math.round(remaining)} kcal remaining of ${Math.round(goal)} kcal goal`;
}

/**
 * Short trailing clause with no numbers — for appending to text that already
 * states the number (a MetricCard subtitle, a "this week" trend line) instead
 * of restating the full sentence getCalorieFramingText produces.
 */
export function getGoalPaceLabel(consumed, goal, primaryGoal) {
  const isOver = consumed > goal;

  if (primaryGoal === 'lose') {
    return isOver ? 'above your lose-weight target' : 'on pace for your goal';
  }
  if (primaryGoal === 'gain') {
    return isOver ? 'on track for your gain goal' : 'toward your gain target';
  }

  // 'maintain' or no goal set — no extra framing to add.
  return '';
}
