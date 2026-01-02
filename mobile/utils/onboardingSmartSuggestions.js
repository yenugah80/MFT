/**
 * Smart Suggestions Engine
 * Provides intelligent cuisine recommendations based on dietary preferences
 * Creates preference combinations with contextual explanations
 */

// Preference relationships: dietary preference → suggested cuisines
const PREFERENCE_RELATIONSHIPS = {
  vegan: {
    cuisines: ['mediterranean', 'thai', 'indian', 'asian', 'mexican'],
    explanation: 'Plant-forward cuisines with diverse protein sources'
  },
  vegetarian: {
    cuisines: ['mediterranean', 'indian', 'thai', 'italian', 'mexican'],
    explanation: 'Cuisine styles with excellent vegetarian options'
  },
  keto: {
    cuisines: ['mediterranean', 'american', 'asian', 'thai'],
    explanation: 'Low-carb friendly cuisines with meat and fat options'
  },
  paleo: {
    cuisines: ['american', 'mediterranean', 'thai', 'asian'],
    explanation: 'Whole food based cuisines without processed ingredients'
  },
  glutenfree: {
    cuisines: ['asian', 'mexican', 'thai', 'mediterranean', 'american'],
    explanation: 'Naturally gluten-free or easily adaptable cuisines'
  },
  lowsodium: {
    cuisines: ['mediterranean', 'american', 'thai', 'asian'],
    explanation: 'Fresh ingredient focused with light seasoning options'
  },
  balanced: {
    cuisines: ['mediterranean', 'american', 'asian', 'mexican', 'italian'],
    explanation: 'Well-rounded cuisines with all macro nutrients'
  },
};

/**
 * Get smart cuisine suggestions based on selected dietary preferences
 * @param {Array<string>} selectedDietaryPrefs - Array of dietary preference IDs
 * @returns {Array<string>} - Suggested cuisine IDs
 */
export const getSmartCuisineSuggestions = (selectedDietaryPrefs) => {
  if (!selectedDietaryPrefs || selectedDietaryPrefs.length === 0) {
    // Default suggestions if no dietary preferences selected
    return ['mediterranean', 'american', 'asian'];
  }

  // Collect all suggested cuisines from selected preferences
  const suggestedCuisines = new Map(); // cuisine -> count

  selectedDietaryPrefs.forEach(pref => {
    const relationship = PREFERENCE_RELATIONSHIPS[pref];
    if (relationship) {
      relationship.cuisines.forEach(cuisine => {
        suggestedCuisines.set(cuisine, (suggestedCuisines.get(cuisine) || 0) + 1);
      });
    }
  });

  // Sort by frequency (most matching preferences) and return top 5
  return Array.from(suggestedCuisines.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cuisine]) => cuisine);
};

/**
 * Generate explanation for preference combination
 * @param {Array<string|Object>} dietaryPrefs - Selected dietary preferences (string or {id, strength})
 * @param {Array<string|Object>} cuisinePrefs - Selected cuisine preferences (string or {id, strength})
 * @returns {Object} - { title, description }
 */
export const getPreferenceCombinationExplanation = (dietaryPrefs, cuisinePrefs) => {
  // Helper to extract ID from string or object format
  const getPreferenceId = (pref) => {
    if (!pref) return '';
    return typeof pref === 'string' ? pref : (pref.id || '');
  };

  if (!dietaryPrefs || dietaryPrefs.length === 0) {
    return {
      title: 'Flexible eating',
      description: 'Ready to explore all cuisine options'
    };
  }

  if (dietaryPrefs.length === 1 && cuisinePrefs.length === 1) {
    const diet = getPreferenceId(dietaryPrefs[0]);
    const cuisine = getPreferenceId(cuisinePrefs[0]);
    const relationship = PREFERENCE_RELATIONSHIPS[diet];

    if (relationship && relationship.cuisines.includes(cuisine)) {
      return {
        title: `${diet.charAt(0).toUpperCase() + diet.slice(1)} + ${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}`,
        description: relationship.explanation
      };
    }

    return {
      title: `${diet.charAt(0).toUpperCase() + diet.slice(1)} + ${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}`,
      description: 'Tailored recommendations for your preferences'
    };
  }

  if (dietaryPrefs.length === 1) {
    const diet = getPreferenceId(dietaryPrefs[0]);
    const relationship = PREFERENCE_RELATIONSHIPS[diet];
    return {
      title: `${diet.charAt(0).toUpperCase() + diet.slice(1)} + Multiple Cuisines`,
      description: relationship?.explanation || 'Diverse recommendations within your dietary needs'
    };
  }

  return {
    title: 'Multi-Preference Combination',
    description: 'Recommendations tailored to all your dietary requirements'
  };
};

/**
 * Get contextual message for strength level
 * @param {number} strength - Strength value 1-5
 * @returns {string} - Human-readable message
 */
export const getStrengthMessage = (strength) => {
  const messages = {
    1: "I'm open to exploring it",
    2: "I prefer it sometimes",
    3: "I like it",
    4: "I really like it",
    5: "It's essential for me"
  };
  return messages[strength] || "Not specified";
};

/**
 * Sample dishes for visual examples (text-based, no emojis)
 */
export const SAMPLE_DISHES = {
  vegan: [
    { name: 'Hummus & Vegetables', protein: 'Chickpeas' },
    { name: 'Tofu Stir-fry', protein: 'Tofu' },
    { name: 'Lentil Curry', protein: 'Lentils' },
    { name: 'Quinoa Bowl', protein: 'Quinoa' }
  ],
  vegetarian: [
    { name: 'Caprese Salad', protein: 'Mozzarella' },
    { name: 'Egg Fried Rice', protein: 'Eggs' },
    { name: 'Paneer Tikka', protein: 'Paneer' },
    { name: 'Cheese Omelet', protein: 'Eggs' }
  ],
  keto: [
    { name: 'Steak with Butter', protein: 'Beef' },
    { name: 'Salmon with Cream', protein: 'Salmon' },
    { name: 'Cheese & Nuts', protein: 'Dairy & Nuts' },
    { name: 'Bacon Wrapped Fish', protein: 'Fish' }
  ],
  paleo: [
    { name: 'Grilled Chicken Breast', protein: 'Chicken' },
    { name: 'Grass-fed Beef Steak', protein: 'Beef' },
    { name: 'Wild Salmon', protein: 'Fish' },
    { name: 'Roasted Turkey', protein: 'Turkey' }
  ],
  glutenfree: [
    { name: 'Rice Noodle Bowl', protein: 'Tofu/Shrimp' },
    { name: 'Corn Tortilla Tacos', protein: 'Meat' },
    { name: 'Potato Based Meal', protein: 'Varied' },
    { name: 'Quinoa Salad', protein: 'Quinoa' }
  ],
  lowsodium: [
    { name: 'Grilled Vegetables', protein: 'Legumes' },
    { name: 'Fresh Fish', protein: 'Fish' },
    { name: 'Brown Rice Bowl', protein: 'Beans' },
    { name: 'Garden Salad', protein: 'Nuts/Seeds' }
  ],
  balanced: [
    { name: 'Chicken & Rice', protein: 'Chicken' },
    { name: 'Fish with Veggies', protein: 'Fish' },
    { name: 'Lean Beef & Greens', protein: 'Beef' },
    { name: 'Whole Grain Pasta', protein: 'Pasta/Meat' }
  ]
};

export default {
  getSmartCuisineSuggestions,
  getPreferenceCombinationExplanation,
  getStrengthMessage,
  SAMPLE_DISHES,
  PREFERENCE_RELATIONSHIPS
};
