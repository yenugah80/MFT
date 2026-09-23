import { getMealTypeFromTime } from '../utils/mealTypeFromTime';

// Regression coverage for the "Dinner" (Details/NutritionDetails screens)
// vs "Late Night Snack" (Smart Insights) mismatch investigation: three
// independent copies of this boundary logic existed, and the one used at
// save time (in useFoodAnalysis.js) disagreed with the two used at display
// time for the 22:00-23:59 and 00:00-00:59 windows — a meal logged at
// 10:53pm was stored as 'snack' but displayed as 'dinner' everywhere it
// was shown afterward. All three now delegate to this single function.
describe('getMealTypeFromTime', () => {
  const at = (hour) => new Date(2026, 0, 1, hour, 0, 0);

  it('classifies the morning window as breakfast', () => {
    expect(getMealTypeFromTime(at(5))).toBe('breakfast');
    expect(getMealTypeFromTime(at(10))).toBe('breakfast');
  });

  it('classifies the midday window as lunch', () => {
    expect(getMealTypeFromTime(at(11))).toBe('lunch');
    expect(getMealTypeFromTime(at(15))).toBe('lunch');
  });

  it('classifies the evening-through-midnight window as dinner, including the previously-mismatched 10pm hour', () => {
    expect(getMealTypeFromTime(at(18))).toBe('dinner');
    expect(getMealTypeFromTime(at(22))).toBe('dinner');
    expect(getMealTypeFromTime(at(23))).toBe('dinner');
    expect(getMealTypeFromTime(at(0))).toBe('dinner');
  });

  it('classifies the remaining gaps as snack', () => {
    expect(getMealTypeFromTime(at(2))).toBe('snack');
    expect(getMealTypeFromTime(at(16))).toBe('snack');
    expect(getMealTypeFromTime(at(17))).toBe('snack');
  });

  it('defaults to the current time when no date is passed', () => {
    expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(getMealTypeFromTime());
  });
});
