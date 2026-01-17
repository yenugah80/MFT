/**
 * Processing Labels Utility
 *
 * Converts NOVA scores to user-friendly labels.
 * Research shows users intuitively understand "processed" vs "whole food"
 * better than numeric scores (1-4).
 *
 * NOVA Classification:
 * - NOVA 1: Unprocessed/minimally processed foods
 * - NOVA 2: Processed culinary ingredients
 * - NOVA 3: Processed foods
 * - NOVA 4: Ultra-processed foods
 *
 * Source: https://world.openfoodfacts.org/nova
 */

// ============================================================================
// PROCESSING LEVEL LABELS
// ============================================================================

export const PROCESSING_LEVELS = {
  1: {
    label: 'Whole Food',
    shortLabel: 'Whole',
    color: '#10B981', // Green
    backgroundColor: '#D1FAE5',
    icon: 'leaf',
    emoji: '🌱',
    description: 'Unprocessed or minimally processed',
    examples: 'Fresh fruits, vegetables, eggs, meat, fish',
    healthTip: 'Excellent choice - nutrient-dense and natural',
  },
  2: {
    label: 'Basic Ingredient',
    shortLabel: 'Basic',
    color: '#84CC16', // Lime
    backgroundColor: '#ECFCCB',
    icon: 'flask',
    emoji: '🧂',
    description: 'Processed culinary ingredients',
    examples: 'Oils, butter, sugar, salt, flour',
    healthTip: 'Used in cooking - fine in moderation',
  },
  3: {
    label: 'Processed',
    shortLabel: 'Processed',
    color: '#F59E0B', // Amber
    backgroundColor: '#FEF3C7',
    icon: 'construct',
    emoji: '⚙️',
    description: 'Processed foods',
    examples: 'Canned vegetables, cheese, bread, cured meats',
    healthTip: 'Check sodium and added ingredients',
  },
  4: {
    label: 'Ultra-Processed',
    shortLabel: 'Ultra',
    color: '#EF4444', // Red
    backgroundColor: '#FEE2E2',
    icon: 'warning',
    emoji: '🏭',
    description: 'Ultra-processed food products',
    examples: 'Chips, sodas, instant noodles, fast food',
    healthTip: 'Limit intake - linked to health issues',
  },
};

// Default for unknown/missing NOVA scores
export const UNKNOWN_PROCESSING = {
  label: 'Unknown',
  shortLabel: '?',
  color: '#9CA3AF', // Gray
  backgroundColor: '#F3F4F6',
  icon: 'help-circle',
  emoji: '❓',
  description: 'Processing level not determined',
  examples: '',
  healthTip: 'Unable to determine processing level',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get processing label info from NOVA score
 * @param {number} novaScore - NOVA score (1-4)
 * @returns {object} Processing level info with label, color, icon, etc.
 */
export function getProcessingLabel(novaScore) {
  const score = parseInt(novaScore);
  if (!score || score < 1 || score > 4) {
    return UNKNOWN_PROCESSING;
  }
  return PROCESSING_LEVELS[score];
}

/**
 * Get simple label string from NOVA score
 * @param {number} novaScore - NOVA score (1-4)
 * @returns {string} User-friendly label
 */
export function getProcessingLabelText(novaScore) {
  return getProcessingLabel(novaScore).label;
}

/**
 * Get color for NOVA score
 * @param {number} novaScore - NOVA score (1-4)
 * @returns {string} Hex color code
 */
export function getProcessingColor(novaScore) {
  return getProcessingLabel(novaScore).color;
}

/**
 * Check if food is ultra-processed (NOVA 4)
 * @param {number} novaScore - NOVA score
 * @returns {boolean}
 */
export function isUltraProcessed(novaScore) {
  return parseInt(novaScore) === 4;
}

/**
 * Check if food is whole/minimally processed (NOVA 1)
 * @param {number} novaScore - NOVA score
 * @returns {boolean}
 */
export function isWholeFood(novaScore) {
  return parseInt(novaScore) === 1;
}

/**
 * Get health impact message based on processing level
 * @param {number} novaScore - NOVA score
 * @returns {string} Health-related message
 */
export function getProcessingHealthMessage(novaScore) {
  const score = parseInt(novaScore);
  switch (score) {
    case 1:
      return 'Great choice! Whole foods support better mood and energy.';
    case 2:
      return 'Basic cooking ingredient - use in balanced meals.';
    case 3:
      return 'Moderately processed - check the label for additives.';
    case 4:
      return 'Ultra-processed foods may affect mood and energy levels.';
    default:
      return '';
  }
}

/**
 * Get badge style object for React Native
 * @param {number} novaScore - NOVA score
 * @returns {object} Style object with backgroundColor, color
 */
export function getProcessingBadgeStyle(novaScore) {
  const info = getProcessingLabel(novaScore);
  return {
    backgroundColor: info.backgroundColor,
    color: info.color,
    borderColor: info.color,
  };
}

// ============================================================================
// MOOD-FOOD CORRELATION MESSAGES
// ============================================================================

/**
 * Get correlation message for food-mood insights
 * Used when showing how processing level relates to mood
 */
export const PROCESSING_MOOD_CORRELATIONS = {
  positive: {
    title: 'Whole Foods & Better Mood',
    message: 'Research shows Mediterranean-style diets (rich in whole foods) are associated with 42% lower depression risk.',
    icon: 'happy',
  },
  negative: {
    title: 'Ultra-Processed Foods & Mood',
    message: 'High intake of ultra-processed foods is linked to increased fatigue and mood instability.',
    icon: 'sad',
  },
  neutral: {
    title: 'Food Processing & Wellbeing',
    message: 'Balancing whole foods with occasional processed items supports overall wellbeing.',
    icon: 'information-circle',
  },
};

/**
 * Get correlation insight based on user's processing patterns
 * @param {number} avgNovaScore - Average NOVA score from user's food logs
 * @returns {object} Correlation insight
 */
export function getProcessingMoodInsight(avgNovaScore) {
  const avg = parseFloat(avgNovaScore);
  if (avg <= 2) {
    return PROCESSING_MOOD_CORRELATIONS.positive;
  } else if (avg >= 3.5) {
    return PROCESSING_MOOD_CORRELATIONS.negative;
  }
  return PROCESSING_MOOD_CORRELATIONS.neutral;
}

export default {
  PROCESSING_LEVELS,
  UNKNOWN_PROCESSING,
  getProcessingLabel,
  getProcessingLabelText,
  getProcessingColor,
  isUltraProcessed,
  isWholeFood,
  getProcessingHealthMessage,
  getProcessingBadgeStyle,
  PROCESSING_MOOD_CORRELATIONS,
  getProcessingMoodInsight,
};
