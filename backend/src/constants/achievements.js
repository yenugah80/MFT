// Achievement Definitions for Gamification System
// 5 Categories: Streaks, Meals, Levels, Nutrition Mastery, Recovery/Consistency
// Each achievement includes:
// - icon: Emoji fallback for simple displays
// - lottieSource: Lottie animation identifier for celebrations
//
// Available Lottie animations (from mobile/assets/animations/):
// - 'streak' → Fire animation (streak.json)
// - 'celebration' → Confetti animation (celebration.json)
// - 'success' → Checkmark success (success.json)
// - 'sync' → Cloud sync animation (sync.json)

export const STREAK_ACHIEVEMENTS = [
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Log food for 3 days in a row',
    streak: 3,
    icon: '🔥',
    lottieSource: 'streak',
    xp: 50,
    category: 'streak',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day logging streak',
    streak: 7,
    icon: '⚡',
    lottieSource: 'streak',
    xp: 100,
    category: 'streak',
  },
  {
    id: 'streak_14',
    name: 'Two Week Titan',
    description: 'Keep your streak alive for 14 days',
    streak: 14,
    icon: '💪',
    lottieSource: 'streak',
    xp: 200,
    category: 'streak',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Achieve a 30-day logging streak',
    streak: 30,
    icon: '🏆',
    lottieSource: 'celebration', // Milestone! Confetti time
    xp: 500,
    category: 'streak',
  },
  {
    id: 'streak_60',
    name: 'Consistency King',
    description: 'Dominate with a 60-day streak',
    streak: 60,
    icon: '👑',
    lottieSource: 'celebration',
    xp: 1000,
    category: 'streak',
  },
  {
    id: 'streak_90',
    name: 'Legendary Discipline',
    description: 'Master the art of consistency with 90 days',
    streak: 90,
    icon: '🌟',
    lottieSource: 'celebration',
    xp: 2000,
    category: 'streak',
  },
];

export const MEAL_COUNT_ACHIEVEMENTS = [
  {
    id: 'meals_10',
    name: 'First Steps',
    description: 'Log your first 10 meals',
    count: 10,
    icon: '🍽️',
    lottieSource: 'success',
    xp: 50,
    category: 'meal_count',
  },
  {
    id: 'meals_50',
    name: 'Tracking Pro',
    description: 'Reach 50 logged meals',
    count: 50,
    icon: '📊',
    lottieSource: 'success',
    xp: 200,
    category: 'meal_count',
  },
  {
    id: 'meals_100',
    name: 'Century Club',
    description: 'Join the elite with 100 meals logged',
    count: 100,
    icon: '💯',
    lottieSource: 'celebration', // Big milestone!
    xp: 500,
    category: 'meal_count',
  },
  {
    id: 'meals_500',
    name: 'Tracking Legend',
    description: 'Legendary dedication with 500 meals',
    count: 500,
    icon: '🎖️',
    lottieSource: 'celebration',
    xp: 2000,
    category: 'meal_count',
  },
  {
    id: 'meals_1000',
    name: 'Hall of Fame',
    description: 'Enter the Hall of Fame with 1000 meals',
    count: 1000,
    icon: '🏛️',
    lottieSource: 'celebration',
    xp: 5000,
    category: 'meal_count',
  },
];

export const LEVEL_ACHIEVEMENTS = [
  {
    id: 'level_5',
    name: 'Apprentice Unlocked',
    description: 'Reach level 5',
    level: 5,
    icon: '🎓',
    lottieSource: 'success',
    xp: 100,
    category: 'level',
  },
  {
    id: 'level_10',
    name: 'Expert Unlocked',
    description: 'Achieve Expert status at level 10',
    level: 10,
    icon: '🔬',
    lottieSource: 'celebration',
    xp: 500,
    category: 'level',
  },
  {
    id: 'level_20',
    name: 'Master Unlocked',
    description: 'Become a Master at level 20',
    level: 20,
    icon: '🥋',
    lottieSource: 'celebration',
    xp: 1500,
    category: 'level',
  },
  {
    id: 'level_30',
    name: 'Grandmaster Unlocked',
    description: 'Ascend to Grandmaster at level 30',
    level: 30,
    icon: '🧙',
    lottieSource: 'celebration',
    xp: 3000,
    category: 'level',
  },
  {
    id: 'level_50',
    name: 'Legend Status',
    description: 'Achieve legendary status at level 50',
    level: 50,
    icon: '⚔️',
    lottieSource: 'celebration',
    xp: 10000,
    category: 'level',
  },
];

export const NUTRITION_ACHIEVEMENTS = [
  {
    id: 'protein_5days',
    name: 'Protein Power',
    description: 'Hit your protein goal 5 days in a row',
    icon: '🥩',
    lottieSource: 'success',
    xp: 300,
    category: 'nutrition',
  },
  {
    id: 'balanced_7days',
    name: 'Macro Balance',
    description: 'Maintain balanced macros for 7 days',
    icon: '⚖️',
    lottieSource: 'success',
    xp: 500,
    category: 'nutrition',
  },
  {
    id: 'calorie_30days',
    name: 'Calorie Consistency',
    description: 'Stay within calorie goal for 30 days',
    icon: '🎯',
    lottieSource: 'celebration',
    xp: 1000,
    category: 'nutrition',
  },
  {
    id: 'hydration_hero',
    name: 'Hydration Hero',
    description: 'Hit water goal for 14 days straight',
    icon: '💧',
    lottieSource: 'success',
    xp: 400,
    category: 'nutrition',
  },
  {
    id: 'veggie_week',
    name: 'Plant Power',
    description: 'Get 5 servings of veggies for 7 days',
    icon: '🥗',
    lottieSource: 'success',
    xp: 350,
    category: 'nutrition',
  },
];

export const RECOVERY_ACHIEVEMENTS = [
  {
    id: 'back_on_track',
    name: 'Back on Track',
    description: 'Logged after missing 1+ days',
    icon: '↩️',
    lottieSource: 'success', // Positive reinforcement!
    xp: 100,
    category: 'recovery',
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Logged on both Saturday & Sunday',
    icon: '🎯',
    lottieSource: 'success',
    xp: 150,
    category: 'recovery',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Logged breakfast before 9 AM 5 times',
    icon: '🌅',
    lottieSource: 'success',
    xp: 200,
    category: 'recovery',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Logged dinner after 8 PM 5 times',
    icon: '🌙',
    lottieSource: 'success',
    xp: 200,
    category: 'recovery',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Rebuilt a 7-day streak after a break',
    icon: '💪',
    lottieSource: 'celebration', // Celebrate the comeback!
    xp: 300,
    category: 'recovery',
  },
  {
    id: 'fresh_start',
    name: 'Fresh Start Monday',
    description: 'Logged on Monday after missing the weekend',
    icon: '🌟',
    lottieSource: 'success',
    xp: 100,
    category: 'recovery',
  },
  {
    id: 'travel_logger',
    name: 'Travel Logger',
    description: 'Logged while timezone changed',
    icon: '✈️',
    lottieSource: 'celebration',
    xp: 250,
    category: 'recovery',
  },
];

// All achievements combined
export const ALL_ACHIEVEMENTS = [
  ...STREAK_ACHIEVEMENTS,
  ...MEAL_COUNT_ACHIEVEMENTS,
  ...LEVEL_ACHIEVEMENTS,
  ...NUTRITION_ACHIEVEMENTS,
  ...RECOVERY_ACHIEVEMENTS,
];

// Helper to get achievement by ID
export function getAchievementById(id) {
  return ALL_ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

// Helper to get achievements by category
export function getAchievementsByCategory(category) {
  return ALL_ACHIEVEMENTS.filter((achievement) => achievement.category === category);
}

// Lottie animation mapping for frontend
// Maps lottieSource string to actual file path in mobile app
export const LOTTIE_ANIMATION_MAP = {
  streak: 'assets/animations/streak.json',
  celebration: 'assets/animations/celebration.json',
  success: 'assets/animations/success.json',
  sync: 'assets/animations/sync.json',
};
