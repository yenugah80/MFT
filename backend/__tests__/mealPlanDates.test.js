import { assignMealPlanDates } from '../src/utils/mealPlanDates.js';

describe('meal plan calendar dates', () => {
  test('overrides model-provided dates with consecutive application dates', () => {
    const result = assignMealPlanDates([
      { day: 8, date: 'wrong', date_label: 'Monday', meals: [] },
      { day: 9, date: 'wrong', date_label: 'Monday', meals: [] },
    ], '2026-08-28', 2);

    expect(result).toMatchObject([
      { day: 1, date: '2026-08-28', date_label: 'Friday' },
      { day: 2, date: '2026-08-29', date_label: 'Saturday' },
    ]);
  });

  test('caps output to the validated requested plan length', () => {
    const result = assignMealPlanDates([{ meals: [] }, { meals: [] }, { meals: [] }], '2026-08-28', 2);
    expect(result).toHaveLength(2);
  });
});
