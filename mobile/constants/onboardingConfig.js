/**
 * Onboarding Configuration
 * Constants and defaults for the onboarding flow
 */

export const GOALS = [
  {
    id: 'lose',
    label: 'Lose Weight',
    iconName: 'flame',
    description: 'Burn calories and reach your ideal body weight',
    color: '#FF4D6D',
    gradientStart: '#FF4D6D',
    gradientEnd: '#C9184A',
  },
  {
    id: 'maintain',
    label: 'Maintain Weight',
    iconName: 'shield-checkmark',
    description: 'Stay at your weight and build lasting healthy habits',
    color: '#6B4EFF',
    gradientStart: '#6B4EFF',
    gradientEnd: '#4929D6',
  },
  {
    id: 'gain',
    label: 'Gain Weight',
    iconName: 'barbell',
    description: 'Build muscle and increase your overall strength',
    color: '#0096C7',
    gradientStart: '#0096C7',
    gradientEnd: '#005F8A',
  },
];

export const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    label: 'Sedentary',
    shortLabel: 'Desk Job',
    description: 'Little or no exercise',
    factor: 1.2,
  },
  {
    id: 'lightly_active',
    label: 'Lightly Active',
    shortLabel: '1-2 Days',
    description: 'Exercise 1-2 days per week',
    factor: 1.375,
  },
  {
    id: 'moderate',
    label: 'Moderate',
    shortLabel: '3-5 Days',
    description: 'Exercise 3-5 days per week',
    factor: 1.55,
  },
  {
    id: 'very_active',
    label: 'Very Active',
    shortLabel: 'Daily',
    description: 'Daily exercise',
    factor: 1.725,
  },
  {
    id: 'extremely_active',
    label: 'Extremely Active',
    shortLabel: 'Intense',
    description: 'Intense daily training',
    factor: 1.9,
  },
];

export const DIETARY_PREFERENCES = [
  { id: 'balanced', label: 'Balanced Diet', emoji: '🥗', color: '#10B981' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱', color: '#10B981' },
  { id: 'keto', label: 'Keto', emoji: '🥑', color: '#F59E0B' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬', color: '#10B981' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟', color: '#3B82F6' },
  { id: 'paleo', label: 'Paleo', emoji: '🥩', color: '#EF4444' },
  { id: 'low_carb', label: 'Low-Carb', emoji: '🍗', color: '#F59E0B' },
  { id: 'gluten_free', label: 'Gluten-Free', emoji: '🌾', color: '#F59E0B' },
];

export const ALLERGIES = [
  { id: 'nuts', label: 'Nuts', emoji: '🥜', color: '#EF4444' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛', color: '#3B82F6' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚', color: '#F59E0B' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦀', color: '#F97316' }, // Changed from 🦐 (Unicode 11.0) to 🦀 (Unicode 8.0)
  { id: 'soy', label: 'Soy', emoji: '🫘', color: '#D97706' },
  { id: 'wheat', label: 'Wheat', emoji: '🌾', color: '#F59E0B' },
  { id: 'fish', label: 'Fish', emoji: '🐠', color: '#3B82F6' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜', color: '#EF4444' },
];

export const CUISINE_PREFERENCES = [
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒', color: '#3B82F6' }, // Unicode 14.0
  { id: 'asian', label: 'Asian', emoji: '🥢', color: '#EF4444' },
  { id: 'mexican', label: 'Mexican', emoji: '🌶️', color: '#F97316' },
  { id: 'indian', label: 'Indian', emoji: '🍛', color: '#F59E0B' }, // Changed from 🧡 (orange heart) to 🍛 (curry rice - more relevant)
  { id: 'american', label: 'American', emoji: '🍔', color: '#F97316' },
  { id: 'italian', label: 'Italian', emoji: '🍝', color: '#EF4444' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🥘', color: '#D97706' }, // Changed from 🫓 (heating/cooking - Unicode 14.0) to 🥘 (pot of food - Unicode 10.0)
  { id: 'african', label: 'African', emoji: '🥑', color: '#10B981' },
];

export const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other / Prefer not to say' },
];

// Validation ranges (must match backend database constraints)
export const VALIDATION_RANGES = {
  age: { min: 15, max: 100 },
  weight: { min: 30, max: 299 }, // kg (backend max is < 500, but mobile practical limit 299)
  weightLbs: { min: 66, max: 658 }, // lbs (approximately 299 kg)
  height: { min: 100, max: 250 }, // cm
  heightFeet: { min: 3, max: 8 },
  heightInches: { min: 0, max: 11 },
  calories: { min: 500, max: 10000 }, // Matches backend (profileController.js line 615)
  protein: { min: 0, max: 500 },
  carbs: { min: 0, max: 1000 },
  fats: { min: 0, max: 300 },
  water: { min: 0.5, max: 10 }, // liters (0.5 min for practical hydration)
};

// Default values
export const ONBOARDING_DEFAULTS = {
  weightUnit: 'kg',
  heightUnit: 'cm',
  waterLiters: 2.0,
  dietaryPreferences: ['balanced'],
  allergies: [],
  cuisinePreferences: ['mediterranean', 'american'],
};

// Copy/messaging
export const ONBOARDING_COPY = {
  step1: {
    title: "Let's Get Started",
    subtitle: 'In less than 60 seconds, we\'ll personalize your experience',
    goalPrompt: 'What\'s your primary goal?',
    continueBtn: 'Continue',
    progressMessage: 'Step 1 of 4: Choose your goal',
  },
  step2: {
    title: 'Your Basics',
    subtitle: 'Help us understand your fitness profile',
    ageLabel: 'Age',
    ageHint: 'Between 15 and 100',
    weightLabel: 'Weight',
    heightLabel: 'Height',
    genderLabel: 'Gender',
    activityLabel: 'Activity Level',
    activityHint: 'This helps us calculate your daily calorie needs',
    backBtn: 'Back',
    continueBtn: 'Continue',
    progressMessage: 'Step 2 of 4: Enter your measurements',
  },
  step3: {
    title: 'Your Preferences',
    subtitle: 'Help us recommend the right foods for you',
    dietaryLabel: 'Dietary Style',
    allergiesLabel: 'Allergies & Intolerances',
    cuisineLabel: 'Favorite Cuisines',
    skipBtn: 'Skip this step',
    backBtn: 'Back',
    continueBtn: 'Continue',
    progressMessage: 'Step 3 of 4: Select your preferences',
  },
  step4: {
    title: 'Your Daily Targets',
    subtitle: 'Based on your information, here\'s what we recommend',
    calorieLabel: 'Your daily calorie target',
    calorieContext: 'Based on your info and activity level',
    proteinLabel: 'Protein target',
    carbsLabel: 'Carbs target',
    fatsLabel: 'Fats target',
    waterLabel: 'Water intake goal',
    adjustNote: '(You can adjust this anytime)',
    calculationNote: 'Based on your stats',
    backBtn: 'Back',
    getStartedBtn: 'Get Started',
    progressMessage: 'Step 4 of 4: Review your nutrition targets',
  },
};

// Animation durations (ms)
export const ANIMATION_DURATIONS = {
  screenTransition: 300,
  progressBar: 500,
  buttonScale: 200,
  fadeIn: 300,
  slideUp: 400,
};

// Accessibility labels
export const A11Y_LABELS = {
  step1: 'Step 1 of 4: Welcome to MyFoodTracker. Select your primary fitness goal - lose weight, maintain, or gain weight',
  step2: 'Step 2 of 4: Enter your measurements. Provide your age, weight, height, and activity level so we can personalize your nutrition plan',
  step3: 'Step 3 of 4: Select your food preferences. Choose your dietary style, identify any allergies or intolerances, and pick your favorite cuisines',
  step4: 'Step 4 of 4: Review your calculated daily nutrition targets. Your personalized calorie, protein, carbs, fats, and water intake goals are ready',
};
