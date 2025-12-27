/**
 * Exercise Database
 * Comprehensive list of exercises with calorie burn estimates
 * Calories are approximate for 30 minutes of activity for a 70kg (154lb) person
 */

export const EXERCISE_CATEGORIES = {
  CARDIO: 'Cardio',
  STRENGTH: 'Strength',
  YOGA: 'Yoga',
  SPORTS: 'Sports',
  WALKING: 'Walking',
  CYCLING: 'Cycling',
  SWIMMING: 'Swimming',
  FLEXIBILITY: 'Flexibility',
};

export const INTENSITY_LEVELS = {
  LOW: { label: 'Low', multiplier: 0.7, color: '#10B981' },
  MODERATE: { label: 'Moderate', multiplier: 1.0, color: '#F59E0B' },
  HIGH: { label: 'High', multiplier: 1.3, color: '#EF4444' },
  VERY_HIGH: { label: 'Very High', multiplier: 1.5, color: '#DC2626' },
};

export const EXERCISES = [
  // CARDIO
  {
    id: 'running',
    name: 'Running',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'bicycle',
    caloriesPer30Min: 300,
    description: 'Outdoor or treadmill running',
    met: 10.0, // Metabolic Equivalent of Task
  },
  {
    id: 'jogging',
    name: 'Jogging',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'walk',
    caloriesPer30Min: 240,
    description: 'Light to moderate pace jogging',
    met: 7.0,
  },
  {
    id: 'hiit',
    name: 'HIIT Training',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'flash',
    caloriesPer30Min: 350,
    description: 'High-intensity interval training',
    met: 12.0,
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'fitness',
    caloriesPer30Min: 320,
    description: 'Skipping rope cardio',
    met: 11.0,
  },
  {
    id: 'elliptical',
    name: 'Elliptical',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'analytics',
    caloriesPer30Min: 270,
    description: 'Elliptical machine workout',
    met: 8.0,
  },
  {
    id: 'stair-climbing',
    name: 'Stair Climbing',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'trending-up',
    caloriesPer30Min: 290,
    description: 'Climbing stairs or StairMaster',
    met: 9.0,
  },
  {
    id: 'rowing',
    name: 'Rowing',
    category: EXERCISE_CATEGORIES.CARDIO,
    icon: 'boat',
    caloriesPer30Min: 280,
    description: 'Rowing machine or water rowing',
    met: 8.5,
  },

  // STRENGTH TRAINING
  {
    id: 'weight-lifting',
    name: 'Weight Lifting',
    category: EXERCISE_CATEGORIES.STRENGTH,
    icon: 'barbell',
    caloriesPer30Min: 180,
    description: 'General weight training',
    met: 5.0,
  },
  {
    id: 'bodyweight',
    name: 'Bodyweight Training',
    category: EXERCISE_CATEGORIES.STRENGTH,
    icon: 'body',
    caloriesPer30Min: 200,
    description: 'Push-ups, pull-ups, squats',
    met: 6.0,
  },
  {
    id: 'crossfit',
    name: 'CrossFit',
    category: EXERCISE_CATEGORIES.STRENGTH,
    icon: 'fitness',
    caloriesPer30Min: 320,
    description: 'High-intensity functional training',
    met: 11.0,
  },
  {
    id: 'circuit-training',
    name: 'Circuit Training',
    category: EXERCISE_CATEGORIES.STRENGTH,
    icon: 'repeat',
    caloriesPer30Min: 250,
    description: 'Multiple exercises in rotation',
    met: 7.5,
  },

  // YOGA & FLEXIBILITY
  {
    id: 'vinyasa-yoga',
    name: 'Vinyasa Yoga',
    category: EXERCISE_CATEGORIES.YOGA,
    icon: 'flower',
    caloriesPer30Min: 180,
    description: 'Flow-based dynamic yoga',
    met: 5.0,
  },
  {
    id: 'power-yoga',
    name: 'Power Yoga',
    category: EXERCISE_CATEGORIES.YOGA,
    icon: 'flame',
    caloriesPer30Min: 210,
    description: 'Intense, fitness-focused yoga',
    met: 6.0,
  },
  {
    id: 'hatha-yoga',
    name: 'Hatha Yoga',
    category: EXERCISE_CATEGORIES.YOGA,
    icon: 'leaf',
    caloriesPer30Min: 120,
    description: 'Gentle, alignment-focused yoga',
    met: 3.0,
  },
  {
    id: 'yin-yoga',
    name: 'Yin Yoga',
    category: EXERCISE_CATEGORIES.YOGA,
    icon: 'moon',
    caloriesPer30Min: 90,
    description: 'Slow-paced, meditative yoga',
    met: 2.0,
  },
  {
    id: 'hot-yoga',
    name: 'Hot Yoga',
    category: EXERCISE_CATEGORIES.YOGA,
    icon: 'sunny',
    caloriesPer30Min: 240,
    description: 'Yoga in heated room',
    met: 7.0,
  },
  {
    id: 'pilates',
    name: 'Pilates',
    category: EXERCISE_CATEGORIES.FLEXIBILITY,
    icon: 'heart',
    caloriesPer30Min: 150,
    description: 'Core-focused mat or reformer',
    met: 4.0,
  },
  {
    id: 'stretching',
    name: 'Stretching',
    category: EXERCISE_CATEGORIES.FLEXIBILITY,
    icon: 'expand',
    caloriesPer30Min: 80,
    description: 'General flexibility work',
    met: 2.0,
  },

  // WALKING
  {
    id: 'walking-slow',
    name: 'Walking (Slow)',
    category: EXERCISE_CATEGORIES.WALKING,
    icon: 'walk',
    caloriesPer30Min: 120,
    description: '2-3 mph casual walk',
    met: 3.0,
  },
  {
    id: 'walking-moderate',
    name: 'Walking (Moderate)',
    category: EXERCISE_CATEGORIES.WALKING,
    icon: 'walk',
    caloriesPer30Min: 150,
    description: '3-4 mph brisk walk',
    met: 4.0,
  },
  {
    id: 'walking-fast',
    name: 'Walking (Fast)',
    category: EXERCISE_CATEGORIES.WALKING,
    icon: 'walk',
    caloriesPer30Min: 180,
    description: '4.5+ mph power walk',
    met: 5.0,
  },
  {
    id: 'hiking',
    name: 'Hiking',
    category: EXERCISE_CATEGORIES.WALKING,
    icon: 'mountain',
    caloriesPer30Min: 210,
    description: 'Trail hiking with elevation',
    met: 6.0,
  },

  // CYCLING
  {
    id: 'cycling-leisure',
    name: 'Cycling (Leisure)',
    category: EXERCISE_CATEGORIES.CYCLING,
    icon: 'bicycle',
    caloriesPer30Min: 180,
    description: 'Casual bike riding',
    met: 5.0,
  },
  {
    id: 'cycling-moderate',
    name: 'Cycling (Moderate)',
    category: EXERCISE_CATEGORIES.CYCLING,
    icon: 'bicycle',
    caloriesPer30Min: 240,
    description: '12-14 mph moderate pace',
    met: 7.0,
  },
  {
    id: 'cycling-vigorous',
    name: 'Cycling (Vigorous)',
    category: EXERCISE_CATEGORIES.CYCLING,
    icon: 'bicycle',
    caloriesPer30Min: 360,
    description: '16+ mph racing pace',
    met: 12.0,
  },
  {
    id: 'spin-class',
    name: 'Spin Class',
    category: EXERCISE_CATEGORIES.CYCLING,
    icon: 'bicycle',
    caloriesPer30Min: 320,
    description: 'Indoor cycling class',
    met: 11.0,
  },
  {
    id: 'mountain-biking',
    name: 'Mountain Biking',
    category: EXERCISE_CATEGORIES.CYCLING,
    icon: 'bicycle',
    caloriesPer30Min: 280,
    description: 'Off-road trail biking',
    met: 8.5,
  },

  // SWIMMING
  {
    id: 'swimming-leisure',
    name: 'Swimming (Leisure)',
    category: EXERCISE_CATEGORIES.SWIMMING,
    icon: 'water',
    caloriesPer30Min: 210,
    description: 'Casual swimming',
    met: 6.0,
  },
  {
    id: 'swimming-laps',
    name: 'Swimming Laps',
    category: EXERCISE_CATEGORIES.SWIMMING,
    icon: 'water',
    caloriesPer30Min: 300,
    description: 'Freestyle lap swimming',
    met: 10.0,
  },
  {
    id: 'water-aerobics',
    name: 'Water Aerobics',
    category: EXERCISE_CATEGORIES.SWIMMING,
    icon: 'water',
    caloriesPer30Min: 180,
    description: 'Pool-based cardio class',
    met: 5.0,
  },

  // SPORTS
  {
    id: 'basketball',
    name: 'Basketball',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'basketball',
    caloriesPer30Min: 280,
    description: 'Pickup game or practice',
    met: 8.5,
  },
  {
    id: 'soccer',
    name: 'Soccer',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'football',
    caloriesPer30Min: 300,
    description: 'Soccer game or practice',
    met: 10.0,
  },
  {
    id: 'tennis',
    name: 'Tennis',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'tennisball',
    caloriesPer30Min: 240,
    description: 'Singles or doubles tennis',
    met: 7.0,
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'american-football',
    caloriesPer30Min: 180,
    description: 'Beach or indoor volleyball',
    met: 5.0,
  },
  {
    id: 'golf',
    name: 'Golf',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'golf',
    caloriesPer30Min: 150,
    description: 'Walking course, carrying clubs',
    met: 4.0,
  },
  {
    id: 'martial-arts',
    name: 'Martial Arts',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'hand-right',
    caloriesPer30Min: 320,
    description: 'Karate, taekwondo, judo, etc.',
    met: 11.0,
  },
  {
    id: 'boxing',
    name: 'Boxing',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'hand-right',
    caloriesPer30Min: 350,
    description: 'Boxing training or sparring',
    met: 12.0,
  },
  {
    id: 'dancing',
    name: 'Dancing',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'musical-notes',
    caloriesPer30Min: 200,
    description: 'Social or aerobic dancing',
    met: 6.0,
  },
  {
    id: 'zumba',
    name: 'Zumba',
    category: EXERCISE_CATEGORIES.SPORTS,
    icon: 'musical-notes',
    caloriesPer30Min: 250,
    description: 'Latin-inspired dance fitness',
    met: 7.5,
  },
];

/**
 * Calculate calories burned based on duration, weight, and MET value
 * Formula: Calories = MET × weight(kg) × time(hours)
 */
export const calculateCalories = (exercise, durationMinutes, weightKg = 70, intensityLevel = 'MODERATE') => {
  const intensity = INTENSITY_LEVELS[intensityLevel];
  const met = exercise.met * intensity.multiplier;
  const hours = durationMinutes / 60;
  return Math.round(met * weightKg * hours);
};

/**
 * Get exercises by category
 */
export const getExercisesByCategory = (category) => {
  return EXERCISES.filter(ex => ex.category === category);
};

/**
 * Search exercises by name
 */
export const searchExercises = (query) => {
  const lowerQuery = query.toLowerCase();
  return EXERCISES.filter(ex =>
    ex.name.toLowerCase().includes(lowerQuery) ||
    ex.description.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get exercise by ID
 */
export const getExerciseById = (id) => {
  return EXERCISES.find(ex => ex.id === id);
};
