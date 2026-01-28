/**
 * Food Analytics Calculations Tests
 *
 * Tests for:
 * - normalizeFood function
 * - calculateWeeklyTrends function
 * - calculateTopFoods function
 * - calculateMealTimingInsights function
 * - calculateGoalAdherence function
 * - identifyNutritionalGaps function
 */

import {
  normalizeFood,
  calculateWeeklyTrends,
  calculateTopFoods,
  calculateMealTimingInsights,
  calculateGoalAdherence,
  identifyNutritionalGaps,
} from '../utils/foodAnalyticsCalculations';

describe('normalizeFood', () => {
  it('returns empty string for null input', () => {
    expect(normalizeFood(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(normalizeFood(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(normalizeFood('')).toBe('');
  });

  it('converts to lowercase', () => {
    expect(normalizeFood('CHICKEN')).toBe('chicken');
    expect(normalizeFood('Grilled Chicken')).toBe('chicken');
  });

  it('trims whitespace', () => {
    expect(normalizeFood('  chicken  ')).toBe('chicken');
  });

  it('removes cooking method prefixes', () => {
    expect(normalizeFood('grilled chicken')).toBe('chicken');
    expect(normalizeFood('baked salmon')).toBe('salmon');
    expect(normalizeFood('fried rice')).toBe('rice');
    expect(normalizeFood('steamed broccoli')).toBe('broccoli');
    expect(normalizeFood('roasted vegetables')).toBe('vegetables');
    expect(normalizeFood('fresh salad')).toBe('salad');
    expect(normalizeFood('organic eggs')).toBe('eggs');
  });

  it('removes portion descriptors', () => {
    expect(normalizeFood('chicken small')).toBe('chicken');
    expect(normalizeFood('salad large')).toBe('salad');
    expect(normalizeFood('pizza slice')).toBe('pizza');
    expect(normalizeFood('cake piece')).toBe('cake');
    expect(normalizeFood('soup cup')).toBe('soup');
    expect(normalizeFood('rice bowl')).toBe('rice');
  });

  it('normalizes multiple spaces', () => {
    expect(normalizeFood('chicken   breast')).toBe('chicken breast');
  });

  it('handles combined transformations', () => {
    expect(normalizeFood('  Grilled Chicken Breast Large  ')).toBe('chicken breast');
    // Only one prefix is removed at a time (first match)
    expect(normalizeFood('ORGANIC FRESH SALAD BOWL')).toBe('fresh salad');
    expect(normalizeFood('Fresh Salad Bowl')).toBe('salad');
  });
});

describe('calculateWeeklyTrends', () => {
  it('returns empty data for empty logs', () => {
    const result = calculateWeeklyTrends([]);

    expect(result.days).toHaveLength(7);
    expect(result.maxCalories).toBe(1); // Minimum is 1 to avoid division by zero
    expect(result.avgCalories).toBe(0);
    expect(result.avgProtein).toBe(0);
  });

  it('returns 7 days of data', () => {
    const result = calculateWeeklyTrends([]);
    expect(result.days).toHaveLength(7);
  });

  it('calculates correct totals for a single day', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const logs = [
      { timestamp: today.getTime(), calories: 500, protein: 30 },
      { timestamp: today.getTime(), calories: 300, protein: 20 },
    ];

    const result = calculateWeeklyTrends(logs);
    const todayData = result.days[6]; // Last day is today

    expect(todayData.calories).toBe(800);
    expect(todayData.protein).toBe(50);
    expect(todayData.mealsCount).toBe(2);
  });

  it('calculates correct averages', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = [
      { timestamp: today.getTime(), calories: 2000, protein: 100 },
      { timestamp: yesterday.getTime(), calories: 1500, protein: 80 },
    ];

    const result = calculateWeeklyTrends(logs);

    // Average over 7 days: (2000 + 1500) / 7 = 500
    expect(result.avgCalories).toBe(Math.round(3500 / 7));
    expect(result.avgProtein).toBe(Math.round(180 / 7));
  });

  it('calculates maxCalories correctly', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = [
      { timestamp: today.getTime(), calories: 2500, protein: 100 },
      { timestamp: yesterday.getTime(), calories: 1800, protein: 80 },
    ];

    const result = calculateWeeklyTrends(logs);

    expect(result.maxCalories).toBe(2500);
  });

  it('includes day names', () => {
    const result = calculateWeeklyTrends([]);

    result.days.forEach((day) => {
      expect(day.dayName).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    });
  });
});

describe('calculateTopFoods', () => {
  it('returns empty array for empty logs', () => {
    const result = calculateTopFoods([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for logs without food names', () => {
    const logs = [{ calories: 500, protein: 30 }];
    const result = calculateTopFoods(logs);
    expect(result).toEqual([]);
  });

  it('counts food occurrences correctly', () => {
    const logs = [
      { foodName: 'Chicken', calories: 300, protein: 30, timestamp: Date.now() },
      { foodName: 'Chicken', calories: 350, protein: 35, timestamp: Date.now() },
      { foodName: 'Rice', calories: 200, protein: 5, timestamp: Date.now() },
    ];

    const result = calculateTopFoods(logs);

    expect(result[0].name).toBe('Chicken');
    expect(result[0].count).toBe(2);
    expect(result[1].name).toBe('Rice');
    expect(result[1].count).toBe(1);
  });

  it('normalizes food names for matching', () => {
    const logs = [
      { foodName: 'Grilled Chicken', calories: 300, protein: 30, timestamp: 1000 },
      { foodName: 'chicken', calories: 350, protein: 35, timestamp: 2000 },
      { foodName: 'CHICKEN', calories: 280, protein: 28, timestamp: 3000 },
    ];

    const result = calculateTopFoods(logs);

    // All should be combined as one food
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    // Should use the most recent name variant
    expect(result[0].name).toBe('CHICKEN');
  });

  it('calculates average calories and protein', () => {
    const logs = [
      { foodName: 'Chicken', calories: 300, protein: 30, timestamp: Date.now() },
      { foodName: 'Chicken', calories: 400, protein: 40, timestamp: Date.now() },
    ];

    const result = calculateTopFoods(logs);

    expect(result[0].avgCalories).toBe(350);
    expect(result[0].avgProtein).toBe(35);
  });

  it('respects the limit parameter', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      foodName: `Food ${i}`,
      calories: 200,
      protein: 20,
      timestamp: Date.now(),
    }));

    const result = calculateTopFoods(logs, 3);
    expect(result).toHaveLength(3);
  });

  it('sorts by count descending', () => {
    const logs = [
      { foodName: 'A', calories: 100, protein: 10, timestamp: Date.now() },
      { foodName: 'B', calories: 100, protein: 10, timestamp: Date.now() },
      { foodName: 'B', calories: 100, protein: 10, timestamp: Date.now() },
      { foodName: 'B', calories: 100, protein: 10, timestamp: Date.now() },
      { foodName: 'C', calories: 100, protein: 10, timestamp: Date.now() },
      { foodName: 'C', calories: 100, protein: 10, timestamp: Date.now() },
    ];

    const result = calculateTopFoods(logs);

    expect(result[0].name).toBe('B');
    expect(result[0].count).toBe(3);
    expect(result[1].name).toBe('C');
    expect(result[1].count).toBe(2);
    expect(result[2].name).toBe('A');
    expect(result[2].count).toBe(1);
  });
});

describe('calculateMealTimingInsights', () => {
  it('returns null for less than 3 logs', () => {
    expect(calculateMealTimingInsights([])).toBeNull();
    expect(calculateMealTimingInsights([{ timestamp: Date.now() }])).toBeNull();
    expect(
      calculateMealTimingInsights([{ timestamp: Date.now() }, { timestamp: Date.now() }])
    ).toBeNull();
  });

  it('identifies peak eating hours', () => {
    const base = new Date();
    base.setHours(12, 0, 0, 0); // Noon

    const logs = [
      { timestamp: base.getTime() },
      { timestamp: base.getTime() },
      { timestamp: base.getTime() },
      { timestamp: new Date(base).setHours(8) }, // 8 AM
    ];

    const result = calculateMealTimingInsights(logs);

    expect(result.peakHours[0].hour).toBe(12);
    expect(result.peakHours[0].count).toBe(3);
  });

  it('categorizes meal types correctly', () => {
    const createLogAtHour = (hour) => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return { timestamp: date.getTime() };
    };

    // Test breakfast (5-11)
    const breakfastLogs = [createLogAtHour(7), createLogAtHour(7), createLogAtHour(7)];
    const breakfastResult = calculateMealTimingInsights(breakfastLogs);
    expect(breakfastResult.peakHours[0].mealType).toBe('Breakfast');

    // Test lunch (11-15)
    const lunchLogs = [createLogAtHour(12), createLogAtHour(12), createLogAtHour(12)];
    const lunchResult = calculateMealTimingInsights(lunchLogs);
    expect(lunchResult.peakHours[0].mealType).toBe('Lunch');

    // Test snack (15-18)
    const snackLogs = [createLogAtHour(16), createLogAtHour(16), createLogAtHour(16)];
    const snackResult = calculateMealTimingInsights(snackLogs);
    expect(snackResult.peakHours[0].mealType).toBe('Snack');

    // Test dinner (18-22)
    const dinnerLogs = [createLogAtHour(19), createLogAtHour(19), createLogAtHour(19)];
    const dinnerResult = calculateMealTimingInsights(dinnerLogs);
    expect(dinnerResult.peakHours[0].mealType).toBe('Dinner');

    // Test late night (22-5)
    const lateNightLogs = [createLogAtHour(23), createLogAtHour(23), createLogAtHour(23)];
    const lateNightResult = calculateMealTimingInsights(lateNightLogs);
    expect(lateNightResult.peakHours[0].mealType).toBe('Late Night');
  });

  it('formats hour labels correctly', () => {
    const createLogAtHour = (hour) => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return { timestamp: date.getTime() };
    };

    // Test AM
    const morningLogs = [createLogAtHour(9), createLogAtHour(9), createLogAtHour(9)];
    const morningResult = calculateMealTimingInsights(morningLogs);
    expect(morningResult.peakHours[0].label).toBe('9AM');

    // Test PM
    const eveningLogs = [createLogAtHour(19), createLogAtHour(19), createLogAtHour(19)];
    const eveningResult = calculateMealTimingInsights(eveningLogs);
    expect(eveningResult.peakHours[0].label).toBe('7PM');

    // Test 12 PM (noon)
    const noonLogs = [createLogAtHour(12), createLogAtHour(12), createLogAtHour(12)];
    const noonResult = calculateMealTimingInsights(noonLogs);
    expect(noonResult.peakHours[0].label).toBe('12PM');
  });

  it('returns total meals count', () => {
    const logs = Array.from({ length: 10 }, () => ({ timestamp: Date.now() }));
    const result = calculateMealTimingInsights(logs);
    expect(result.totalMeals).toBe(10);
  });
});

describe('calculateGoalAdherence', () => {
  it('returns null for less than 3 days of logs', () => {
    const today = new Date();
    const logs = [{ timestamp: today.getTime(), calories: 2000, protein: 100, carbs: 200, fat: 60 }];

    expect(calculateGoalAdherence(logs)).toBeNull();
  });

  it('calculates adherence correctly for days meeting goals', () => {
    const logs = [];
    const today = new Date();

    // Create 5 days of logs that meet calorie goal (80-110%)
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      logs.push({
        timestamp: date.getTime(),
        calories: 2000, // Exactly at goal
        protein: 120, // At goal
        carbs: 250, // At goal
        fat: 65, // At goal
      });
    }

    const result = calculateGoalAdherence(logs, {
      calorieGoal: 2000,
      proteinGoal: 120,
      carbsGoal: 250,
      fatGoal: 65,
    });

    expect(result.calories).toBe(100); // 100% adherence
    expect(result.protein).toBe(100);
    expect(result.carbs).toBe(100);
    expect(result.fat).toBe(100);
    expect(result.overall).toBe(100);
    expect(result.daysTracked).toBe(5);
  });

  it('calculates 0% adherence for days not meeting goals', () => {
    const logs = [];
    const today = new Date();

    // Create 3 days of logs that don't meet any goals
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      logs.push({
        timestamp: date.getTime(),
        calories: 500, // Way below goal
        protein: 10, // Way below goal
        carbs: 50, // Way below goal
        fat: 10, // Way below goal
      });
    }

    const result = calculateGoalAdherence(logs, {
      calorieGoal: 2000,
      proteinGoal: 120,
      carbsGoal: 250,
      fatGoal: 65,
    });

    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.overall).toBe(0);
  });

  it('uses default goals when not provided', () => {
    const logs = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      logs.push({
        timestamp: date.getTime(),
        calories: 2000, // Default goal
        protein: 120, // Default goal
        carbs: 250, // Default goal
        fat: 65, // Default goal
      });
    }

    const result = calculateGoalAdherence(logs);

    expect(result.calorieGoal).toBe(2000);
    expect(result.proteinGoal).toBe(120);
    expect(result.carbsGoal).toBe(250);
    expect(result.fatGoal).toBe(65);
  });

  it('aggregates multiple meals per day', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const logs = [
      // Today: 3 meals totaling 2000 cal
      { timestamp: today.getTime(), calories: 500, protein: 30, carbs: 60, fat: 20 },
      { timestamp: today.getTime(), calories: 800, protein: 50, carbs: 100, fat: 25 },
      { timestamp: today.getTime(), calories: 700, protein: 40, carbs: 90, fat: 20 },
      // Yesterday: 2 meals totaling 1800 cal
      { timestamp: yesterday.getTime(), calories: 900, protein: 60, carbs: 120, fat: 30 },
      { timestamp: yesterday.getTime(), calories: 900, protein: 60, carbs: 120, fat: 30 },
      // Two days ago: 1 meal of 1600 cal
      { timestamp: twoDaysAgo.getTime(), calories: 1600, protein: 96, carbs: 175, fat: 45 },
    ];

    const result = calculateGoalAdherence(logs, {
      calorieGoal: 2000,
      proteinGoal: 120,
      carbsGoal: 250,
      fatGoal: 65,
    });

    expect(result.daysTracked).toBe(3);
  });
});

describe('identifyNutritionalGaps', () => {
  it('returns empty array for empty input', () => {
    expect(identifyNutritionalGaps([])).toEqual([]);
  });

  it('identifies nutrients below threshold', () => {
    const micros = [
      { key: 'iron', label: 'Iron', percentage: 25 },
      { key: 'calcium', label: 'Calcium', percentage: 75 },
      { key: 'vitamin_d', label: 'Vitamin D', percentage: 30 },
    ];

    const result = identifyNutritionalGaps(micros, 50);

    expect(result).toHaveLength(2);
    expect(result.map((g) => g.key)).toContain('iron');
    expect(result.map((g) => g.key)).toContain('vitamin_d');
    expect(result.map((g) => g.key)).not.toContain('calcium');
  });

  it('sorts by percentage ascending (worst first)', () => {
    const micros = [
      { key: 'iron', label: 'Iron', percentage: 40 },
      { key: 'vitamin_d', label: 'Vitamin D', percentage: 20 },
      { key: 'calcium', label: 'Calcium', percentage: 30 },
    ];

    const result = identifyNutritionalGaps(micros, 50);

    expect(result[0].key).toBe('vitamin_d'); // 20%
    expect(result[1].key).toBe('calcium'); // 30%
    expect(result[2].key).toBe('iron'); // 40%
  });

  it('respects the limit parameter', () => {
    const micros = [
      { key: 'a', percentage: 10 },
      { key: 'b', percentage: 20 },
      { key: 'c', percentage: 30 },
      { key: 'd', percentage: 40 },
      { key: 'e', percentage: 45 },
    ];

    const result = identifyNutritionalGaps(micros, 50, 2);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('a');
    expect(result[1].key).toBe('b');
  });

  it('uses default threshold of 50', () => {
    const micros = [
      { key: 'a', percentage: 49 },
      { key: 'b', percentage: 50 },
      { key: 'c', percentage: 51 },
    ];

    const result = identifyNutritionalGaps(micros);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('a');
  });

  it('returns empty array when all nutrients above threshold', () => {
    const micros = [
      { key: 'iron', percentage: 80 },
      { key: 'calcium', percentage: 90 },
      { key: 'vitamin_d', percentage: 75 },
    ];

    const result = identifyNutritionalGaps(micros, 50);

    expect(result).toEqual([]);
  });
});
