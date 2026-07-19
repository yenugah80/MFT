/**
 * Daily & weekly challenge definitions.
 *
 * Progress for these is computed live from real user data each time
 * GET /api/gamification/challenges is called (see gamificationRoutes.js) —
 * there is no separate "log progress" write path, since nothing in the
 * client ever calls one.
 */

export const DAILY_CHALLENGES = [
  {
    id: 'log_all_meals',
    name: 'Complete Logger',
    description: 'Log breakfast, lunch, and dinner today',
    xp: 50,
    type: 'meals',
    target: 3,
  },
  {
    id: 'hydration_goal',
    name: 'Hydration Station',
    description: 'Drink at least 2L of water today',
    xp: 30,
    type: 'water',
    target: 2, // liters — matches the rest of the app's water unit convention
    unit: 'L',
  },
  {
    id: 'protein_boost',
    name: 'Protein Boost',
    description: 'Eat at least 80g of protein today',
    xp: 40,
    type: 'nutrient',
    nutrient: 'protein',
    target: 80,
    unit: 'g',
  },
  {
    id: 'mood_check',
    name: 'Mood Check',
    description: 'Log your mood at least twice today',
    xp: 25,
    type: 'mood',
    target: 2,
  },
  {
    id: 'fiber_focus',
    name: 'Fiber Focus',
    description: 'Consume at least 25g of fiber',
    xp: 35,
    type: 'nutrient',
    nutrient: 'fiber',
    target: 25,
    unit: 'g',
  },
  {
    id: 'calorie_target',
    name: 'Calorie Conscious',
    description: 'Stay within your calorie goal (±10%)',
    xp: 45,
    type: 'calorie_range',
    tolerance: 0.1,
  },
];

export const WEEKLY_CHALLENGES = [
  {
    id: 'seven_day_streak',
    name: 'Seven Seas Voyage',
    description: 'Log meals for 7 consecutive days',
    xp: 200,
    type: 'streak',
    target: 7,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all daily challenges for 5 days',
    xp: 300,
    type: 'daily_challenges',
    target: 5,
  },
  {
    id: 'veggie_week',
    name: 'Veggie Victory',
    description: 'Include vegetables in 14+ meals this week',
    xp: 150,
    type: 'food_category',
    target: 14,
  },
  {
    id: 'hydration_week',
    name: 'Ocean Mastery',
    description: 'Meet your hydration goal 6 out of 7 days',
    xp: 175,
    type: 'hydration_days',
    target: 6,
  },
];
