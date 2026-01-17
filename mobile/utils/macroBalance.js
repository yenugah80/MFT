/**
 * Macro Balance Utility
 * Calculates balanced meal/daily macro ratios based on standard guidelines
 *
 * Standard macro ranges (% of calories):
 * - Protein: 20-35% (active adults), 15-25% (general)
 * - Carbs: 45-65% (general guidelines)
 * - Fat: 20-35% (heart health guidelines)
 */

/**
 * Calculate macro balance score and breakdown
 * @param {number} protein - Protein in grams
 * @param {number} carbs - Carbohydrates in grams
 * @param {number} fat - Fat in grams
 * @param {object} options - Optional target ranges
 * @returns {object} Balance score and breakdown
 */
export function calculateMacroBalance(protein, carbs, fat, options = {}) {
  // Default target ranges (can be customized per user profile)
  const targets = {
    protein: { min: 15, max: 35, ideal: 25 },
    carbs: { min: 40, max: 60, ideal: 50 },
    fat: { min: 20, max: 35, ideal: 27 },
    ...options,
  };

  // Calculate total calories using Atwater factors
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  // Handle no-data case
  if (totalCals === 0 || !Number.isFinite(totalCals)) {
    return {
      score: 0,
      isBalanced: false,
      breakdown: { proteinPct: 0, carbsPct: 0, fatPct: 0 },
      issues: ['no-data'],
      label: 'No data',
    };
  }

  // Calculate percentages
  const proteinPct = (proteinCals / totalCals) * 100;
  const carbsPct = (carbsCals / totalCals) * 100;
  const fatPct = (fatCals / totalCals) * 100;

  // Calculate deviation penalties
  let score = 100;
  const issues = [];

  // Protein balance
  if (proteinPct < targets.protein.min) {
    const deficit = targets.protein.min - proteinPct;
    score -= Math.min(20, deficit * 1.5);
    issues.push('low-protein');
  } else if (proteinPct > targets.protein.max) {
    const excess = proteinPct - targets.protein.max;
    score -= Math.min(10, excess * 0.5); // Less penalty for high protein
    issues.push('high-protein');
  }

  // Carbs balance
  if (carbsPct < targets.carbs.min) {
    const deficit = targets.carbs.min - carbsPct;
    score -= Math.min(15, deficit * 0.8);
    issues.push('low-carb');
  } else if (carbsPct > targets.carbs.max) {
    const excess = carbsPct - targets.carbs.max;
    score -= Math.min(20, excess * 1.2);
    issues.push('carb-heavy');
  }

  // Fat balance
  if (fatPct < targets.fat.min) {
    const deficit = targets.fat.min - fatPct;
    score -= Math.min(15, deficit * 0.8);
    issues.push('low-fat');
  } else if (fatPct > targets.fat.max) {
    const excess = fatPct - targets.fat.max;
    score -= Math.min(20, excess * 1.5);
    issues.push('high-fat');
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine balance status
  const isBalanced = score >= 70;

  // Generate label
  let label;
  if (score >= 85) label = 'Excellent balance';
  else if (score >= 70) label = 'Good balance';
  else if (score >= 50) label = 'Moderate';
  else if (score >= 30) label = 'Unbalanced';
  else label = 'Poor balance';

  return {
    score,
    isBalanced,
    breakdown: {
      proteinPct: Math.round(proteinPct * 10) / 10,
      carbsPct: Math.round(carbsPct * 10) / 10,
      fatPct: Math.round(fatPct * 10) / 10,
    },
    issues,
    label,
    totalCalories: Math.round(totalCals),
  };
}

/**
 * Get issue descriptions for UI display
 * @param {string[]} issues - Array of issue codes
 * @returns {string[]} Human-readable issue descriptions
 */
export function getIssueDescriptions(issues) {
  const descriptions = {
    'no-data': 'No nutrition data available',
    'low-protein': 'Could use more protein',
    'high-protein': 'Very high in protein',
    'low-carb': 'Low in carbohydrates',
    'carb-heavy': 'High in carbohydrates',
    'low-fat': 'Very low in fat',
    'high-fat': 'High in fat',
  };

  return issues.map(issue => descriptions[issue] || issue);
}

/**
 * Calculate micronutrient bonus points for scoring
 * Rewards meals rich in key micronutrients
 * @param {object} micros - Micronutrient data
 * @returns {number} Bonus points (0-10)
 */
export function calculateMicroBonus(micros) {
  if (!micros || typeof micros !== 'object' || Object.keys(micros).length === 0) {
    return 0;
  }

  // Key nutrients to check (deficiency-prone ones)
  const keyNutrients = ['calcium', 'iron', 'vitaminC', 'vitaminD', 'zinc', 'vitaminA', 'folate'];

  // Count detected key nutrients with meaningful amounts
  const detected = keyNutrients.filter(key => {
    // Handle both formats: {calcium: 15} and {calcium: {value: 15}}
    const val = micros[key] || micros[key.toLowerCase()] || micros[`vitamin_${key.replace('vitamin', '').toLowerCase()}`];
    if (!val) return false;

    const numValue = typeof val === 'object' ? val.value : val;
    return typeof numValue === 'number' && numValue > 0;
  });

  // Up to 10 bonus points for micronutrient-rich meals
  // 2 points per detected key nutrient, capped at 10
  return Math.min(10, detected.length * 2);
}

/**
 * Get ideal macro targets for different dietary goals
 * @param {string} goal - 'maintain', 'lose', 'gain', 'athletic'
 * @returns {object} Target ranges
 */
export function getMacroTargets(goal = 'maintain') {
  const targets = {
    maintain: {
      protein: { min: 15, max: 30, ideal: 22 },
      carbs: { min: 45, max: 60, ideal: 50 },
      fat: { min: 20, max: 35, ideal: 28 },
    },
    lose: {
      protein: { min: 25, max: 40, ideal: 30 },
      carbs: { min: 35, max: 50, ideal: 42 },
      fat: { min: 20, max: 35, ideal: 28 },
    },
    gain: {
      protein: { min: 20, max: 35, ideal: 25 },
      carbs: { min: 50, max: 65, ideal: 55 },
      fat: { min: 15, max: 30, ideal: 20 },
    },
    athletic: {
      protein: { min: 25, max: 40, ideal: 30 },
      carbs: { min: 45, max: 60, ideal: 50 },
      fat: { min: 15, max: 25, ideal: 20 },
    },
  };

  return targets[goal] || targets.maintain;
}
