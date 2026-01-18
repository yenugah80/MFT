/**
 * Fuzzy Matching Utility for Food Names
 *
 * Provides spell-checking and suggestion capabilities for food names.
 * Uses Levenshtein distance and phonetic matching for finding similar foods.
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Initialize matrix
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower[i - 1] === aLower[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity score (1 = exact match, 0 = completely different)
 */
function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a.toLowerCase() === b.toLowerCase()) return 1;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - (distance / maxLength);
}

/**
 * Common food names dictionary for fuzzy matching
 * Organized by category for faster lookups
 */
const COMMON_FOODS = {
  proteins: [
    'chicken', 'chicken breast', 'chicken thigh', 'chicken wings', 'grilled chicken',
    'beef', 'steak', 'ground beef', 'beef curry',
    'pork', 'bacon', 'ham', 'pork chops',
    'fish', 'salmon', 'tuna', 'tilapia', 'cod', 'shrimp', 'prawns',
    'egg', 'eggs', 'boiled egg', 'scrambled eggs', 'fried egg', 'omelette', 'omelet',
    'tofu', 'tempeh', 'paneer',
    'turkey', 'duck', 'lamb', 'mutton',
  ],
  grains: [
    'rice', 'white rice', 'brown rice', 'basmati rice', 'fried rice', 'biryani',
    'bread', 'whole wheat bread', 'white bread', 'toast', 'naan', 'roti', 'chapati', 'paratha',
    'pasta', 'spaghetti', 'penne', 'macaroni', 'noodles', 'rice noodles',
    'oats', 'oatmeal', 'cereal', 'granola',
    'quinoa', 'couscous', 'barley',
    'tortilla', 'wrap', 'pita',
  ],
  vegetables: [
    'broccoli', 'spinach', 'kale', 'lettuce', 'cabbage',
    'carrot', 'carrots', 'potato', 'potatoes', 'sweet potato',
    'tomato', 'tomatoes', 'onion', 'onions', 'garlic',
    'cucumber', 'zucchini', 'eggplant', 'brinjal',
    'bell pepper', 'capsicum', 'mushroom', 'mushrooms',
    'corn', 'peas', 'green beans', 'beans',
    'cauliflower', 'asparagus', 'celery',
  ],
  fruits: [
    'apple', 'banana', 'orange', 'mango', 'grapes',
    'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry',
    'watermelon', 'cantaloupe', 'honeydew', 'melon',
    'pineapple', 'papaya', 'kiwi', 'peach', 'pear',
    'cherry', 'cherries', 'plum', 'apricot',
    'coconut', 'avocado', 'pomegranate',
  ],
  dairy: [
    'milk', 'whole milk', 'skim milk', 'almond milk', 'oat milk',
    'cheese', 'cheddar', 'mozzarella', 'parmesan', 'cottage cheese',
    'yogurt', 'greek yogurt', 'curd', 'buttermilk',
    'butter', 'ghee', 'cream', 'ice cream',
  ],
  legumes: [
    'dal', 'daal', 'lentils', 'moong dal', 'toor dal', 'chana dal', 'masoor dal',
    'chickpeas', 'chana', 'chole', 'kidney beans', 'rajma', 'black beans',
    'sambar', 'sambhar', 'rasam',
  ],
  dishes: [
    'curry', 'chicken curry', 'vegetable curry', 'fish curry', 'lamb curry',
    'biryani', 'chicken biryani', 'vegetable biryani', 'mutton biryani',
    'pulao', 'pilaf', 'khichdi', 'khichri',
    'sandwich', 'burger', 'pizza', 'salad', 'soup',
    'stir fry', 'stir-fry', 'fried rice',
    'tacos', 'burrito', 'quesadilla', 'enchilada',
    'sushi', 'ramen', 'pho', 'pad thai',
    'idli', 'dosa', 'uttapam', 'upma', 'poha',
    'paratha', 'aloo paratha', 'gobi paratha',
    'korma', 'tikka masala', 'butter chicken', 'palak paneer', 'dal makhani',
  ],
  snacks: [
    'chips', 'fries', 'french fries', 'popcorn',
    'nuts', 'almonds', 'cashews', 'peanuts', 'walnuts',
    'cookie', 'cookies', 'biscuit', 'biscuits', 'cake', 'brownie',
    'samosa', 'pakora', 'bhaji', 'vada',
  ],
  beverages: [
    'water', 'coffee', 'tea', 'chai', 'green tea',
    'juice', 'orange juice', 'apple juice', 'smoothie',
    'soda', 'cola', 'lemonade', 'lassi', 'buttermilk',
  ],
};

// Flatten all foods into a single array for searching
const ALL_FOODS = Object.values(COMMON_FOODS).flat();

/**
 * Find similar food names using fuzzy matching
 * @param {string} query - User's input (possibly misspelled)
 * @param {object} options - Options for matching
 * @param {number} options.threshold - Minimum similarity score (0-1), default 0.6
 * @param {number} options.maxResults - Maximum number of suggestions, default 3
 * @returns {Array<{name: string, score: number}>} - Sorted array of suggestions
 */
export function findSimilarFoods(query, options = {}) {
  const { threshold = 0.6, maxResults = 3 } = options;

  if (!query || query.length < 2) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();

  // First, check for exact match
  const exactMatch = ALL_FOODS.find(food => food.toLowerCase() === queryLower);
  if (exactMatch) {
    return [{ name: exactMatch, score: 1.0, isExact: true }];
  }

  // Calculate similarity scores for all foods
  const scores = ALL_FOODS.map(food => ({
    name: food,
    score: similarityScore(queryLower, food),
  }));

  // Also check if query is contained in or contains any food name
  scores.forEach(item => {
    const foodLower = item.name.toLowerCase();

    // Boost score if query is a substring
    if (foodLower.includes(queryLower) || queryLower.includes(foodLower)) {
      item.score = Math.max(item.score, 0.8);
      item.partialMatch = true;
    }

    // Check word-level matching for multi-word queries
    const queryWords = queryLower.split(/\s+/);
    const foodWords = foodLower.split(/\s+/);

    const matchingWords = queryWords.filter(qw =>
      foodWords.some(fw => similarityScore(qw, fw) > 0.8)
    );

    if (matchingWords.length > 0) {
      const wordMatchScore = matchingWords.length / Math.max(queryWords.length, foodWords.length);
      item.score = Math.max(item.score, wordMatchScore * 0.9);
    }
  });

  // Filter by threshold and sort by score
  const suggestions = scores
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return suggestions;
}

/**
 * Check if a food name might be misspelled
 * @param {string} query - User's input
 * @returns {object} - Analysis result
 */
export function analyzeSpelling(query) {
  if (!query || query.length < 2) {
    return {
      isValid: false,
      reason: 'Query too short',
      suggestions: [],
    };
  }

  const queryLower = query.toLowerCase().trim();

  // Check for exact match
  const exactMatch = ALL_FOODS.find(food => food.toLowerCase() === queryLower);
  if (exactMatch) {
    return {
      isValid: true,
      isExactMatch: true,
      matchedFood: exactMatch,
      suggestions: [],
    };
  }

  // Find similar foods
  const suggestions = findSimilarFoods(query, { threshold: 0.5, maxResults: 5 });

  // Determine if it's likely a spelling mistake
  const topMatch = suggestions[0];
  const isLikelyMisspelling = topMatch && topMatch.score >= 0.7 && topMatch.score < 1;

  return {
    isValid: true,
    isExactMatch: false,
    isLikelyMisspelling,
    confidence: topMatch ? topMatch.score : 0,
    suggestions: suggestions.map(s => ({
      name: s.name,
      score: Math.round(s.score * 100),
    })),
    didYouMean: isLikelyMisspelling ? topMatch.name : null,
  };
}

/**
 * Get spelling suggestions for a food query
 * Returns didYouMean if there's a likely correction
 * @param {string} query - User's input
 * @returns {object} - Suggestion result
 */
export function getSpellingSuggestions(query) {
  const analysis = analyzeSpelling(query);

  if (analysis.isExactMatch) {
    return {
      originalQuery: query,
      isRecognized: true,
      needsCorrection: false,
      suggestions: [],
    };
  }

  if (analysis.isLikelyMisspelling) {
    return {
      originalQuery: query,
      isRecognized: false,
      needsCorrection: true,
      didYouMean: analysis.didYouMean,
      confidence: analysis.confidence,
      suggestions: analysis.suggestions.slice(0, 3),
    };
  }

  // Low confidence - could be a regional/unknown food or severe misspelling
  return {
    originalQuery: query,
    isRecognized: false,
    needsCorrection: analysis.suggestions.length > 0,
    suggestions: analysis.suggestions.slice(0, 3),
    note: 'Could be a regional food or new item not in our database',
  };
}

/**
 * Add custom foods to the dictionary (for user's frequently used items)
 * @param {Array<string>} foods - Array of food names to add
 */
export function addCustomFoods(foods) {
  if (Array.isArray(foods)) {
    foods.forEach(food => {
      if (food && typeof food === 'string' && !ALL_FOODS.includes(food.toLowerCase())) {
        ALL_FOODS.push(food.toLowerCase());
      }
    });
  }
}

export default {
  findSimilarFoods,
  analyzeSpelling,
  getSpellingSuggestions,
  addCustomFoods,
  levenshteinDistance,
  similarityScore,
};
