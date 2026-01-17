/**
 * ============================================================================
 * BEVERAGE CONSTANTS - Single Source of Truth
 * ============================================================================
 *
 * All hydration-related constants in one place.
 * Used by: HydrationTracker, PremiumHydrationCard, useWaterLog
 *
 * HYDRATION FACTORS (Research-based - Beverage Hydration Index study):
 * Source: https://ajcn.nutrition.org/article/S0002-9165(22)06556-X/fulltext
 *
 * Key findings that differ from common beliefs:
 * - Coffee: ~1.0 (NO significant difference from water - myth debunked!)
 * - Tea: ~1.0 (same as water)
 * - Milk: 1.50-1.58 (BETTER than water due to fat/protein slowing emptying)
 * - Orange juice: 1.39 (sugar + potassium aid retention)
 *
 * CAFFEINE CONTENT (mg per 250ml serving):
 * - Coffee: ~95mg (varies by brew)
 * - Tea: ~47mg (black), ~28mg (green)
 * - Soda: ~25-45mg
 * - Energy drinks: ~80mg
 * Daily limit recommendation: 400mg (FDA)
 */

// ============================================================================
// HYDRATION FACTORS (Research-backed)
// ============================================================================
export const BEVERAGE_FACTORS = {
  water: 1.0,
  coffee: 1.0,        // Updated: Research shows no significant diuretic effect
  tea: 1.0,           // Updated: Same as water
  juice: 1.39,        // Updated: OJ hydrates better than water (BHI study)
  milk: 1.50,         // Updated: Excellent retention (was 0.87)
  milkSkim: 1.58,     // New: Skim milk is best hydrator
  electrolyte: 1.1,
  smoothie: 1.1,      // Updated: Similar to milk-based drinks
  soda: 1.0,          // Updated: Research shows same as water (but avoid for sugar)
  sparkling: 1.0,
  coconut: 1.05,
  herbal: 1.0,
  sports: 1.05,
  alcohol_beer: 0.85,   // New: Alcohol has diuretic effect
  alcohol_wine: 0.80,   // New: Higher alcohol = more diuretic
  alcohol_spirits: 0.70, // New: Spirits are most diuretic
  energy: 1.0,          // New: Energy drinks (caffeine doesn't dehydrate)
};

// ============================================================================
// CAFFEINE CONTENT (mg per 250ml serving)
// ============================================================================
export const CAFFEINE_CONTENT = {
  water: 0,
  sparkling: 0,
  herbal: 0,
  milk: 0,
  milkSkim: 0,
  juice: 0,
  coconut: 0,
  smoothie: 0,        // Unless contains coffee/matcha
  coffee: 95,         // Average brewed coffee
  espresso: 63,       // Per 30ml shot (often add 2 shots)
  tea: 47,            // Black tea
  teaGreen: 28,       // Green tea
  teaMatcha: 70,      // Matcha (concentrated)
  soda: 35,           // Cola average
  sodaCaffeineFree: 0,
  energy: 80,         // Energy drinks average
  sports: 0,          // Most sports drinks are caffeine-free
  electrolyte: 0,
  alcohol_beer: 0,
  alcohol_wine: 0,
  alcohol_spirits: 0,
};

// Daily caffeine limit (FDA recommendation)
export const DAILY_CAFFEINE_LIMIT = 400; // mg

// Caffeine warning thresholds
export const CAFFEINE_THRESHOLDS = {
  moderate: 200,  // Consider slowing down
  high: 300,      // Approaching limit
  limit: 400,     // Daily limit reached
  excessive: 500, // Over recommended limit
};

// ============================================================================
// BEVERAGE TYPES - Full metadata for UI (Updated with research-backed values)
// ============================================================================
export const BEVERAGE_TYPES = {
  water: {
    id: 'water',
    hydrationFactor: BEVERAGE_FACTORS.water,
    caffeine: CAFFEINE_CONTENT.water,
    icon: 'water',
    color: '#3B82F6',
    label: 'Water',
    emoji: '💧',
    description: '100% hydration',
    healthNote: null,
    pairWith: null,
    sleepImpact: null,
  },
  sparkling: {
    id: 'sparkling',
    hydrationFactor: BEVERAGE_FACTORS.sparkling,
    caffeine: CAFFEINE_CONTENT.sparkling,
    icon: 'sparkles',
    color: '#06B6D4',
    label: 'Sparkling',
    emoji: '🫧',
    description: '100% hydration',
    healthNote: null,
    pairWith: null,
    sleepImpact: null,
  },
  coffee: {
    id: 'coffee',
    hydrationFactor: BEVERAGE_FACTORS.coffee,
    caffeine: CAFFEINE_CONTENT.coffee,
    icon: 'cafe',
    color: '#78350F',
    label: 'Coffee',
    emoji: '☕',
    description: '100% hydration + 95mg caffeine',
    healthNote: 'Counts toward caffeine limit (400mg/day)',
    pairWith: null,
    sleepImpact: 'Avoid 6+ hours before bed',
  },
  tea: {
    id: 'tea',
    hydrationFactor: BEVERAGE_FACTORS.tea,
    caffeine: CAFFEINE_CONTENT.tea,
    icon: 'leaf',
    color: '#059669',
    label: 'Tea',
    emoji: '🍵',
    description: '100% hydration + 47mg caffeine',
    healthNote: 'Contains antioxidants',
    pairWith: null,
    sleepImpact: 'Moderate caffeine - watch evening intake',
  },
  herbal: {
    id: 'herbal',
    hydrationFactor: BEVERAGE_FACTORS.herbal,
    caffeine: CAFFEINE_CONTENT.herbal,
    icon: 'flower',
    color: '#A855F7',
    label: 'Herbal Tea',
    emoji: '🌸',
    description: '100% hydration, caffeine-free',
    healthNote: 'Great evening choice',
    pairWith: null,
    sleepImpact: null,
  },
  juice: {
    id: 'juice',
    hydrationFactor: BEVERAGE_FACTORS.juice,
    caffeine: CAFFEINE_CONTENT.juice,
    icon: 'wine',
    color: '#F59E0B',
    label: 'Juice',
    emoji: '🧃',
    description: '139% hydration (better than water!)',
    healthNote: 'High in natural sugars',
    pairWith: null,
    sleepImpact: null,
  },
  milk: {
    id: 'milk',
    hydrationFactor: BEVERAGE_FACTORS.milk,
    caffeine: CAFFEINE_CONTENT.milk,
    icon: 'nutrition',
    color: '#F5F5DC',
    label: 'Milk',
    emoji: '🥛',
    description: '150% hydration (best hydrator!)',
    healthNote: 'Protein + fat = better water retention',
    pairWith: null,
    sleepImpact: null,
  },
  electrolyte: {
    id: 'electrolyte',
    hydrationFactor: BEVERAGE_FACTORS.electrolyte,
    caffeine: CAFFEINE_CONTENT.electrolyte,
    icon: 'flash',
    color: '#0EA5E9',
    label: 'Electrolyte',
    emoji: '⚡',
    description: '110% hydration',
    healthNote: 'Best after exercise or sweating',
    pairWith: null,
    sleepImpact: null,
  },
  coconut: {
    id: 'coconut',
    hydrationFactor: BEVERAGE_FACTORS.coconut,
    caffeine: CAFFEINE_CONTENT.coconut,
    icon: 'leaf',
    color: '#84CC16',
    label: 'Coconut Water',
    emoji: '🥥',
    description: '105% hydration',
    healthNote: 'Natural electrolytes',
    pairWith: null,
    sleepImpact: null,
  },
  smoothie: {
    id: 'smoothie',
    hydrationFactor: BEVERAGE_FACTORS.smoothie,
    caffeine: CAFFEINE_CONTENT.smoothie,
    icon: 'ice-cream',
    color: '#EC4899',
    label: 'Smoothie',
    emoji: '🥤',
    description: '110% hydration',
    healthNote: 'Check added sugar content',
    pairWith: null,
    sleepImpact: null,
  },
  soda: {
    id: 'soda',
    hydrationFactor: BEVERAGE_FACTORS.soda,
    caffeine: CAFFEINE_CONTENT.soda,
    icon: 'beer',
    color: '#EF4444',
    label: 'Soda',
    emoji: '🥤',
    description: '100% hydration + 35mg caffeine',
    healthNote: 'High sugar content',
    pairWith: null,
    sleepImpact: null,
  },
  sports: {
    id: 'sports',
    hydrationFactor: BEVERAGE_FACTORS.sports,
    caffeine: CAFFEINE_CONTENT.sports,
    icon: 'fitness',
    color: '#22C55E',
    label: 'Sports Drink',
    emoji: '🏃',
    description: '105% hydration',
    healthNote: 'Best during/after exercise',
    pairWith: null,
    sleepImpact: null,
  },
  energy: {
    id: 'energy',
    hydrationFactor: BEVERAGE_FACTORS.energy,
    caffeine: CAFFEINE_CONTENT.energy,
    icon: 'flash',
    color: '#FBBF24',
    label: 'Energy Drink',
    emoji: '⚡',
    description: '100% hydration + 80mg caffeine',
    healthNote: 'High caffeine - limit intake',
    pairWith: null,
    sleepImpact: 'Avoid 8+ hours before bed',
  },
  alcohol_beer: {
    id: 'alcohol_beer',
    hydrationFactor: BEVERAGE_FACTORS.alcohol_beer,
    caffeine: CAFFEINE_CONTENT.alcohol_beer,
    icon: 'beer',
    color: '#D97706',
    label: 'Beer',
    emoji: '🍺',
    description: '85% hydration (alcohol is diuretic)',
    healthNote: 'Disrupts REM sleep',
    pairWith: 'water',
    sleepImpact: 'Affects sleep quality even in small amounts',
  },
  alcohol_wine: {
    id: 'alcohol_wine',
    hydrationFactor: BEVERAGE_FACTORS.alcohol_wine,
    caffeine: CAFFEINE_CONTENT.alcohol_wine,
    icon: 'wine',
    color: '#7C3AED',
    label: 'Wine',
    emoji: '🍷',
    description: '80% hydration',
    healthNote: 'Disrupts REM sleep',
    pairWith: 'water',
    sleepImpact: 'Avoid 3-4 hours before bed',
  },
  alcohol_spirits: {
    id: 'alcohol_spirits',
    hydrationFactor: BEVERAGE_FACTORS.alcohol_spirits,
    caffeine: CAFFEINE_CONTENT.alcohol_spirits,
    icon: 'flask',
    color: '#6B7280',
    label: 'Spirits',
    emoji: '🥃',
    description: '70% hydration',
    healthNote: 'Most dehydrating alcoholic drink',
    pairWith: 'water',
    sleepImpact: 'Significantly disrupts sleep',
  },
};

// ============================================================================
// BEVERAGE CATEGORIES - For organized UI display
// ============================================================================
export const BEVERAGE_CATEGORIES = [
  {
    id: 'water',
    label: 'Water',
    icon: 'water',
    color: '#3B82F6',
    beverages: ['water', 'sparkling'],
  },
  {
    id: 'hot',
    label: 'Hot Drinks',
    icon: 'cafe',
    color: '#78350F',
    beverages: ['coffee', 'tea', 'herbal'],
  },
  {
    id: 'cold',
    label: 'Cold Drinks',
    icon: 'ice-cream',
    color: '#06B6D4',
    beverages: ['juice', 'smoothie', 'soda', 'coconut'],
  },
  {
    id: 'dairy',
    label: 'Dairy',
    icon: 'nutrition',
    color: '#F5F5DC',
    beverages: ['milk'],
  },
  {
    id: 'sports',
    label: 'Sports & Energy',
    icon: 'fitness',
    color: '#22C55E',
    beverages: ['sports', 'electrolyte', 'energy'],
  },
  {
    id: 'alcohol',
    label: 'Alcohol',
    icon: 'wine',
    color: '#7C3AED',
    beverages: ['alcohol_beer', 'alcohol_wine', 'alcohol_spirits'],
  },
];

// ============================================================================
// QUICK ADD SIZES - Standardized across the app
// ============================================================================
export const QUICK_ADD_SIZES = [
  { ml: 150, liters: 0.15, label: 'Small', subtitle: '150ml', icon: 'water-outline' },
  { ml: 250, liters: 0.25, label: 'Cup', subtitle: '250ml', icon: 'water' },
  { ml: 500, liters: 0.5, label: 'Bottle', subtitle: '500ml', icon: 'water' },
  { ml: 750, liters: 0.75, label: 'Large', subtitle: '750ml', icon: 'water' },
  { ml: 1000, liters: 1.0, label: 'XL', subtitle: '1L', icon: 'water' },
];

// ============================================================================
// WATER PRESETS - For dashboard quick-add
// ============================================================================
export const WATER_PRESETS = [
  { label: '250ml', amount: 0.25, icon: '🥛', color: '#3b82f6' },
  { label: '500ml', amount: 0.5, icon: '💧', color: '#06b6d4' },
  { label: '750ml', amount: 0.75, icon: '🚰', color: '#0ea5e9' },
];

// ============================================================================
// HYDRATION MILESTONES - For gamification
// ============================================================================
export const HYDRATION_MILESTONES = [25, 50, 75, 100];

// ============================================================================
// TIME-BASED RECOMMENDATIONS
// ============================================================================
export const TIME_BASED_TIPS = {
  // Early morning (5-8am)
  earlyMorning: {
    primary: 'water',
    suggestion: 'Start with water to rehydrate after sleep',
    alternatives: ['herbal', 'tea'],
    avoid: ['soda'],
  },
  // Morning (8-11am)
  morning: {
    primary: 'water',
    suggestion: 'Coffee is fine, but pair it with water',
    alternatives: ['coffee', 'tea'],
    avoid: [],
  },
  // Midday (11am-2pm)
  midday: {
    primary: 'water',
    suggestion: 'Stay hydrated during peak activity hours',
    alternatives: ['sparkling', 'juice'],
    avoid: [],
  },
  // Afternoon (2-5pm)
  afternoon: {
    primary: 'water',
    suggestion: 'Feeling tired? Water helps more than caffeine',
    alternatives: ['tea', 'coconut'],
    avoid: ['coffee'], // Late coffee disrupts sleep
  },
  // Evening (5-8pm)
  evening: {
    primary: 'water',
    suggestion: 'Wind down with herbal tea or water',
    alternatives: ['herbal', 'milk'],
    avoid: ['coffee', 'soda'],
  },
  // Night (8pm-5am)
  night: {
    primary: 'herbal',
    suggestion: 'Small sips only - too much disrupts sleep',
    alternatives: ['water'],
    avoid: ['coffee', 'tea', 'soda'],
  },
};

// ============================================================================
// BEVERAGE PAIRING RULES (Updated based on research)
// ============================================================================
export const PAIRING_RULES = {
  // Note: Coffee/tea no longer need water pairing for hydration (myth debunked)
  // But alcohol DOES need water pairing
  alcohol_beer: { pairWith: 'water', ratio: '1:1', reason: 'Alcohol is diuretic - water helps' },
  alcohol_wine: { pairWith: 'water', ratio: '1:1', reason: 'Offset dehydration from alcohol' },
  alcohol_spirits: { pairWith: 'water', ratio: '1:2', reason: 'Spirits are most dehydrating' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get time period based on current hour
 */
export function getCurrentTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return 'earlyMorning';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

/**
 * Get recommendation for current time
 */
export function getTimeBasedRecommendation() {
  const period = getCurrentTimePeriod();
  return TIME_BASED_TIPS[period];
}

/**
 * Get beverage info with fallback to water
 */
export function getBeverageInfo(type) {
  const normalized = (type || 'water').toLowerCase();
  return BEVERAGE_TYPES[normalized] || BEVERAGE_TYPES.water;
}

/**
 * Get hydration factor with fallback to 1.0
 */
export function getHydrationFactor(type) {
  const normalized = (type || 'water').toLowerCase();
  return BEVERAGE_FACTORS[normalized] ?? 1.0;
}

/**
 * Calculate effective hydration from raw amount
 */
export function calculateHydration(amountLiters, beverageType) {
  const factor = getHydrationFactor(beverageType);
  return amountLiters * factor;
}

/**
 * Get warning message for beverage if any
 */
export function getBeverageWarning(type) {
  const info = getBeverageInfo(type);
  return info.warning || null;
}

/**
 * Get pairing recommendation for beverage
 */
export function getPairingRecommendation(type) {
  const normalized = (type || '').toLowerCase();
  return PAIRING_RULES[normalized] || null;
}

/**
 * Check if beverage should be avoided at current time
 */
export function shouldAvoidBeverage(type) {
  const period = getCurrentTimePeriod();
  const tips = TIME_BASED_TIPS[period];
  const normalized = (type || '').toLowerCase();
  return tips.avoid?.includes(normalized) || false;
}

// ============================================================================
// CAFFEINE TRACKING FUNCTIONS
// ============================================================================

/**
 * Get caffeine content for a beverage type (mg per 250ml)
 * @param {string} type - Beverage type
 * @returns {number} Caffeine in mg
 */
export function getCaffeineContent(type) {
  const normalized = (type || 'water').toLowerCase();
  return CAFFEINE_CONTENT[normalized] ?? 0;
}

/**
 * Calculate caffeine from a beverage log
 * @param {number} amountLiters - Amount in liters
 * @param {string} beverageType - Type of beverage
 * @returns {number} Caffeine in mg
 */
export function calculateCaffeine(amountLiters, beverageType) {
  const caffeinePerLiter = getCaffeineContent(beverageType) * 4; // Convert from per-250ml to per-liter
  return Math.round(amountLiters * caffeinePerLiter);
}

/**
 * Get caffeine status based on total daily intake
 * @param {number} totalCaffeine - Total caffeine in mg
 * @returns {object} Status with level, message, color
 */
export function getCaffeineStatus(totalCaffeine) {
  if (totalCaffeine <= CAFFEINE_THRESHOLDS.moderate) {
    return {
      level: 'low',
      message: 'Caffeine intake is low',
      color: '#10B981',
      icon: 'checkmark-circle',
    };
  }
  if (totalCaffeine <= CAFFEINE_THRESHOLDS.high) {
    return {
      level: 'moderate',
      message: 'Moderate caffeine intake',
      color: '#F59E0B',
      icon: 'alert-circle',
    };
  }
  if (totalCaffeine <= CAFFEINE_THRESHOLDS.limit) {
    return {
      level: 'high',
      message: 'Approaching daily limit (400mg)',
      color: '#F97316',
      icon: 'warning',
    };
  }
  return {
    level: 'excessive',
    message: 'Over recommended daily limit',
    color: '#EF4444',
    icon: 'close-circle',
  };
}

/**
 * Get contextual caffeine message based on time and intake
 * @param {number} totalCaffeine - Total daily caffeine
 * @returns {string|null} Contextual message or null
 */
export function getCaffeineTimeWarning(totalCaffeine) {
  const hour = new Date().getHours();

  // Evening/night caffeine warning
  if (hour >= 14 && totalCaffeine > 0) {
    const hoursUntilBed = Math.max(0, 22 - hour); // Assume 10pm bedtime
    if (hoursUntilBed < 6) {
      return 'Caffeine this late may affect your sleep';
    }
  }

  // Morning high intake warning
  if (hour < 12 && totalCaffeine > 200) {
    return 'High morning caffeine - consider spacing out intake';
  }

  return null;
}

/**
 * Check if beverage is alcoholic
 * @param {string} type - Beverage type
 * @returns {boolean}
 */
export function isAlcoholicBeverage(type) {
  const normalized = (type || '').toLowerCase();
  return normalized.startsWith('alcohol_');
}

/**
 * Get sleep impact warning for beverage
 * @param {string} type - Beverage type
 * @returns {string|null} Sleep impact message or null
 */
export function getSleepImpact(type) {
  const info = getBeverageInfo(type);
  return info.sleepImpact || null;
}

/**
 * Get dynamic health note based on context
 * @param {string} type - Beverage type
 * @param {object} context - { totalCaffeine, hour, activityLevel }
 * @returns {string|null} Contextual health note
 */
export function getDynamicHealthNote(type, context = {}) {
  const info = getBeverageInfo(type);
  const { totalCaffeine = 0, hour = new Date().getHours(), recentActivity = false } = context;

  // Contextual notes override static ones
  if (info.caffeine > 0 && hour >= 16) {
    return 'Evening caffeine may affect sleep quality';
  }

  if (isAlcoholicBeverage(type) && hour < 12) {
    return 'Early alcohol consumption not recommended';
  }

  if (type === 'electrolyte' || type === 'sports') {
    if (recentActivity) {
      return 'Great choice after exercise!';
    }
    return 'Best consumed during/after physical activity';
  }

  if (info.caffeine > 0 && totalCaffeine + info.caffeine > DAILY_CAFFEINE_LIMIT) {
    return `This would put you over the ${DAILY_CAFFEINE_LIMIT}mg daily limit`;
  }

  return info.healthNote;
}

export default {
  BEVERAGE_FACTORS,
  BEVERAGE_TYPES,
  BEVERAGE_CATEGORIES,
  CAFFEINE_CONTENT,
  CAFFEINE_THRESHOLDS,
  DAILY_CAFFEINE_LIMIT,
  QUICK_ADD_SIZES,
  WATER_PRESETS,
  HYDRATION_MILESTONES,
  TIME_BASED_TIPS,
  PAIRING_RULES,
  getCurrentTimePeriod,
  getTimeBasedRecommendation,
  getBeverageInfo,
  getHydrationFactor,
  calculateHydration,
  getBeverageWarning,
  getPairingRecommendation,
  shouldAvoidBeverage,
  getCaffeineContent,
  calculateCaffeine,
  getCaffeineStatus,
  getCaffeineTimeWarning,
  isAlcoholicBeverage,
  getSleepImpact,
  getDynamicHealthNote,
};
