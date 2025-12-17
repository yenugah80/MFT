// Utility to sanitize nutrition goals before sending to API
export function sanitizeGoalsForApi(goals) {
  return {
    primaryGoal: goals.primaryGoal || null,
    dailyCalories: goals.dailyCalories === '' ? null : Number(goals.dailyCalories),
    proteinG: goals.proteinG === '' ? null : Number(goals.proteinG),
    carbsG: goals.carbsG === '' ? null : Number(goals.carbsG),
    fatsG: goals.fatsG === '' ? null : Number(goals.fatsG),
    waterLiters: goals.waterLiters === '' ? null : Number(goals.waterLiters),
  };
}
