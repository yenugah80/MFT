/**
 * Profile Configuration Constants
 * Centralized configuration for profile screen
 */

export const DIETARY_PRESETS = [
  "Balanced",
  "Vegan",
  "Keto",
  "Vegetarian",
  "Pescatarian",
  "Paleo",
  "Low-carb",
  "Gluten-free",
];

export const BADGE_PRESETS = [
  "Consistency Champ",
  "Macro Master",
  "Hydration Hero",
  "Streak Starter",
  "XP Collector",
];

export const GENDER_OPTIONS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "other", label: "Other" },
];

export const PRIMARY_GOAL_OPTIONS = [
  { key: "lose", label: "Lose weight" },
  { key: "maintain", label: "Maintain weight" },
  { key: "gain", label: "Gain weight" },
];

export const SECTION_LABELS = {
  basics: "Personal information",
  dietary: "Dietary preferences",
  goals: "Nutrition goals",
  gamification: "Progress & streaks",
};

export const XP_PER_LEVEL = 1000;

export const DEFAULT_PROFILE = {
  basics: {
    fullName: "",
    email: "",
    gender: "",
    age: "",
    weightKg: "",
    heightCm: "",
    activityLevel: "moderate",
  },
  dietary: {
    preferences: [],
    allergies: [],
    dislikes: [],
  },
  goals: {
    primaryGoal: "maintain",
    dailyCalories: "",
    proteinG: "",
    carbsG: "",
    fatsG: "",
    waterLiters: "",
  },
  gamification: {
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],
  },
};
