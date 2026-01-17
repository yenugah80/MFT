/**
 * Empty State Configuration
 *
 * Centralized configuration for empty states across all tracking types.
 * Provides context-aware messaging based on:
 * - User journey stage (first_time, returning, between_meals)
 * - User's health goal (lose, maintain, gain)
 * - Time of day
 * - Feature type (food, water, mood, activity, sleep, stress)
 */

import { VIBRANT_WELLNESS, SEMANTIC, BRAND, TEXT } from './premiumTheme';

// Empty state types based on user journey
export const EMPTY_STATE_TYPES = {
  FIRST_TIME: 'first_time',
  RETURNING: 'returning',
  BETWEEN_MEALS: 'between_meals',
  OFFLINE: 'offline',
  LOADING: 'loading',
};

// Time-based greetings
export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Meal suggestion based on time
export const getSuggestedMeal = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 12) return 'morning snack';
  if (hour >= 12 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'evening snack';
};

// Food tracking empty states
export const FOOD_EMPTY_STATES = {
  icon: 'restaurant-outline',
  color: VIBRANT_WELLNESS.nutrition.solid,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Log Your First Meal',
      description: 'Start tracking to see how your food choices affect your energy and mood',
      primaryCTA: { label: 'Log Food', action: 'navigate_log', icon: 'add-circle' },
      secondaryCTA: { label: 'Take a Photo', action: 'open_camera', icon: 'camera' },
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: () => `Log Your ${getSuggestedMeal().charAt(0).toUpperCase() + getSuggestedMeal().slice(1)}`,
      description: 'Keep the momentum going! Your nutrition patterns are becoming clearer.',
      primaryCTA: { label: 'Quick Log', action: 'navigate_log', icon: 'flash' },
      secondaryCTA: { label: 'Scan Barcode', action: 'open_barcode', icon: 'barcode' },
    },
    [EMPTY_STATE_TYPES.BETWEEN_MEALS]: {
      title: 'All Caught Up',
      description: "Great job logging your meals! We'll remind you when it's time for your next one.",
      showNextMealTime: true,
    },
    [EMPTY_STATE_TYPES.OFFLINE]: {
      title: 'You\'re Offline',
      description: 'Your logs are saved locally and will sync when you reconnect.',
      icon: 'cloud-offline-outline',
    },
  },

  goalMessages: {
    lose: 'Track meals to stay on target with your calorie goal',
    maintain: 'Log food to keep your nutrition balanced',
    gain: 'Track calories to make sure you\'re eating enough',
  },

  tips: [
    'Photos make logging faster and more accurate',
    'Logging right after eating helps you remember portions',
    'Use the barcode scanner for packaged foods',
    'You can log multiple items at once',
  ],
};

// Water tracking empty states
export const WATER_EMPTY_STATES = {
  icon: 'water-outline',
  color: VIBRANT_WELLNESS.hydration.solid,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Start Tracking Water',
      description: 'Staying hydrated helps you feel more energetic and focused',
      primaryCTA: { label: 'Log Water', action: 'quick_add', icon: 'water' },
      quickAddOptions: [
        { amount: 250, label: 'Glass' },
        { amount: 500, label: 'Bottle' },
        { amount: 750, label: 'Large' },
      ],
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: 'Stay Hydrated',
      description: () => {
        const greeting = getTimeBasedGreeting();
        return greeting === 'morning'
          ? 'Good morning! Start your day with a glass of water'
          : greeting === 'afternoon'
          ? 'Afternoon reminder to keep sipping!'
          : 'Evening hydration keeps you feeling good';
      },
      primaryCTA: { label: 'Quick Add', action: 'quick_add', icon: 'add' },
    },
    [EMPTY_STATE_TYPES.BETWEEN_MEALS]: {
      title: 'Great Progress!',
      description: 'You\'re on track with your hydration today',
    },
  },

  goalMessages: {
    lose: 'Water helps you feel full and supports your metabolism',
    maintain: 'Consistent hydration keeps your energy steady',
    gain: 'Stay hydrated during workouts for better performance',
  },

  tips: [
    'Keep a water bottle nearby as a visual reminder',
    'Drink a glass before each meal',
    'Set reminders if you forget to drink',
  ],
};

// Mood tracking empty states
export const MOOD_EMPTY_STATES = {
  icon: 'happy-outline',
  color: VIBRANT_WELLNESS.mood.solid,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Check In With Yourself',
      description: 'Tracking your mood helps you understand what makes you feel your best',
      primaryCTA: { label: 'Log Mood', action: 'open_logger', icon: 'happy' },
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: 'How Are You Feeling?',
      description: 'A quick check-in takes just a few seconds',
      primaryCTA: { label: 'Quick Check-In', action: 'open_logger', icon: 'heart' },
    },
    [EMPTY_STATE_TYPES.BETWEEN_MEALS]: {
      title: 'Mood Logged',
      description: 'Thanks for checking in! We\'re tracking patterns between your mood and food.',
    },
  },

  tips: [
    'Check in at the same times each day to spot patterns',
    'Note what you were doing when your mood changed',
    'Your mood affects food choices - and vice versa',
  ],
};

// Activity tracking empty states
export const ACTIVITY_EMPTY_STATES = {
  icon: 'fitness-outline',
  color: VIBRANT_WELLNESS.activity.solid,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Log Your Activity',
      description: 'Track exercise to see how movement affects your energy and mood',
      primaryCTA: { label: 'Log Activity', action: 'open_logger', icon: 'walk' },
      secondaryCTA: { label: 'Quick Walk', action: 'quick_log', params: { type: 'walking' }, icon: 'footsteps' },
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: 'Get Moving',
      description: 'Even a short walk can boost your mood and energy',
      primaryCTA: { label: 'Log Activity', action: 'open_logger', icon: 'fitness' },
      quickAddOptions: [
        { type: 'walking', label: 'Walk', icon: 'walk' },
        { type: 'running', label: 'Run', icon: 'speedometer' },
        { type: 'gym', label: 'Gym', icon: 'barbell' },
      ],
    },
  },

  goalMessages: {
    lose: 'Activity helps you burn calories and boost your metabolism',
    maintain: 'Stay active to maintain your energy and fitness',
    gain: 'Exercise builds muscle and increases healthy appetite',
  },

  tips: [
    'Any movement counts - even a 10-minute walk',
    'Log your activity right after to remember details',
    'Track how you feel after different exercises',
  ],
};

// Sleep tracking empty states
export const SLEEP_EMPTY_STATES = {
  icon: 'moon-outline',
  color: VIBRANT_WELLNESS.sleep.solid,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Track Your Sleep',
      description: 'Good sleep affects your mood, energy, and food choices throughout the day',
      primaryCTA: { label: 'Log Last Night', action: 'open_logger', icon: 'moon' },
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: 'How Did You Sleep?',
      description: 'Log last night\'s sleep to track your patterns',
      primaryCTA: { label: 'Log Sleep', action: 'open_logger', icon: 'bed' },
    },
    [EMPTY_STATE_TYPES.BETWEEN_MEALS]: {
      title: 'Sleep Logged',
      description: 'We\'re tracking how your sleep affects your day',
    },
  },

  tips: [
    'Log your sleep first thing in the morning',
    'Note what affected your sleep quality',
    'Consistent bedtimes improve sleep quality',
  ],
};

// Stress tracking empty states
export const STRESS_EMPTY_STATES = {
  icon: 'pulse-outline',
  color: SEMANTIC.warning.base,

  states: {
    [EMPTY_STATE_TYPES.FIRST_TIME]: {
      title: 'Track Your Stress',
      description: 'Understanding your stress patterns helps you manage them better',
      primaryCTA: { label: 'Check In', action: 'open_logger', icon: 'pulse' },
    },
    [EMPTY_STATE_TYPES.RETURNING]: {
      title: 'How\'s Your Stress?',
      description: 'A quick check-in can help you stay aware of how you\'re feeling',
      primaryCTA: { label: 'Log Stress', action: 'open_logger', icon: 'heart' },
    },
    [EMPTY_STATE_TYPES.BETWEEN_MEALS]: {
      title: 'Check-In Complete',
      description: 'We\'re tracking what triggers stress and what helps you cope',
    },
  },

  tips: [
    'Log stress when you notice it - don\'t wait',
    'Note what coping strategies helped',
    'Patterns emerge over time - keep tracking',
  ],
};

// Combined config object for easy access
export const TRACKING_EMPTY_STATES = {
  food: FOOD_EMPTY_STATES,
  water: WATER_EMPTY_STATES,
  mood: MOOD_EMPTY_STATES,
  activity: ACTIVITY_EMPTY_STATES,
  sleep: SLEEP_EMPTY_STATES,
  stress: STRESS_EMPTY_STATES,
};

// Helper to get the appropriate empty state
export function getEmptyStateConfig(trackingType, stateType = EMPTY_STATE_TYPES.FIRST_TIME, userGoal = null) {
  const config = TRACKING_EMPTY_STATES[trackingType];
  if (!config) return null;

  const state = config.states[stateType] || config.states[EMPTY_STATE_TYPES.FIRST_TIME];

  return {
    icon: state.icon || config.icon,
    color: config.color,
    title: typeof state.title === 'function' ? state.title() : state.title,
    description: typeof state.description === 'function' ? state.description() : state.description,
    primaryCTA: state.primaryCTA,
    secondaryCTA: state.secondaryCTA,
    quickAddOptions: state.quickAddOptions,
    goalMessage: userGoal && config.goalMessages ? config.goalMessages[userGoal] : null,
    tip: config.tips ? config.tips[Math.floor(Math.random() * config.tips.length)] : null,
  };
}

// Animation types for empty states
export const EMPTY_STATE_ANIMATIONS = {
  food: 'pulse', // Gentle pulse
  water: 'wave', // Water wave effect
  mood: 'breathe', // Breathing circle
  activity: 'bounce', // Bouncing ball
  sleep: 'fade', // Soft fade
  stress: 'breathe', // Calming breathe
};

export default {
  EMPTY_STATE_TYPES,
  TRACKING_EMPTY_STATES,
  getEmptyStateConfig,
  EMPTY_STATE_ANIMATIONS,
  getTimeBasedGreeting,
  getSuggestedMeal,
};
