/**
 * ============================================================================
 * BEVERAGE CONSTANTS - Single Source of Truth
 * ============================================================================
 *
 * All hydration-related constants in one place.
 * Used by: HydrationTracker, PremiumHydrationCard, useWaterLog
 *
 * HYDRATION FACTORS (Science-based):
 * - Water: 1.0 (100% - baseline reference)
 * - Tea: 0.9 (90% - minimal caffeine in most teas)
 * - Milk: 0.87 (87% - studies show excellent hydration + nutrients)
 * - Juice: 0.8 (80% - sugar increases osmotic load slightly)
 * - Smoothie: 0.85 (85% - fiber slows absorption but still hydrating)
 * - Coffee: 0.5 (50% - caffeine is mild diuretic at high doses)
 * - Electrolyte: 1.1 (110% - sodium helps retain water)
 * - Soda: 0.6 (high sugar, some caffeine reduces effectiveness)
 */

// ============================================================================
// HYDRATION FACTORS
// ============================================================================
export const BEVERAGE_FACTORS = {
  water: 1.0,
  coffee: 0.5,
  tea: 0.9,
  juice: 0.8,
  milk: 0.87,
  electrolyte: 1.1,
  smoothie: 0.85,
  soda: 0.6,       // High sugar, some caffeine
  sparkling: 1.0,  // Sparkling water = water
  coconut: 1.05,   // Coconut water - natural electrolytes
  herbal: 1.0,     // Herbal tea (no caffeine) = water
  sports: 1.05,    // Sports drinks - similar to electrolyte
};

// ============================================================================
// BEVERAGE TYPES - Full metadata for UI
// ============================================================================
export const BEVERAGE_TYPES = {
  water: {
    id: 'water',
    hydrationFactor: BEVERAGE_FACTORS.water,
    icon: 'water',
    color: '#3B82F6',
    label: 'Water',
    emoji: '💧',
    description: 'Perfect hydration',
    tip: 'The gold standard - your body absorbs it directly',
    pairWith: null,
    warning: null,
  },
  sparkling: {
    id: 'sparkling',
    hydrationFactor: BEVERAGE_FACTORS.sparkling,
    icon: 'sparkles',
    color: '#06B6D4',
    label: 'Sparkling',
    emoji: '🫧',
    description: 'Same as still water',
    tip: 'Carbonation doesn\'t affect hydration - enjoy!',
    pairWith: null,
    warning: null,
  },
  coffee: {
    id: 'coffee',
    hydrationFactor: BEVERAGE_FACTORS.coffee,
    icon: 'cafe',
    color: '#78350F',
    label: 'Coffee',
    emoji: '☕',
    description: '50% hydration credit',
    tip: 'Caffeine is a mild diuretic - pair with water',
    pairWith: 'water',
    warning: 'Consider a glass of water alongside your coffee',
  },
  tea: {
    id: 'tea',
    hydrationFactor: BEVERAGE_FACTORS.tea,
    icon: 'leaf',
    color: '#059669',
    label: 'Tea',
    emoji: '🍵',
    description: '90% hydration credit',
    tip: 'Green and black tea have less caffeine than coffee',
    pairWith: null,
    warning: null,
  },
  herbal: {
    id: 'herbal',
    hydrationFactor: BEVERAGE_FACTORS.herbal,
    icon: 'flower',
    color: '#A855F7',
    label: 'Herbal Tea',
    emoji: '🌸',
    description: '100% hydration credit',
    tip: 'Caffeine-free - counts the same as water!',
    pairWith: null,
    warning: null,
  },
  juice: {
    id: 'juice',
    hydrationFactor: BEVERAGE_FACTORS.juice,
    icon: 'wine',
    color: '#F59E0B',
    label: 'Juice',
    emoji: '🧃',
    description: '80% hydration credit',
    tip: 'Natural sugars slightly reduce absorption rate',
    pairWith: 'water',
    warning: 'High in natural sugars - moderate intake',
  },
  milk: {
    id: 'milk',
    hydrationFactor: BEVERAGE_FACTORS.milk,
    icon: 'nutrition',
    color: '#FEFCE8',
    label: 'Milk',
    emoji: '🥛',
    description: '87% hydration credit',
    tip: 'Protein and fat slow stomach emptying, aiding retention',
    pairWith: null,
    warning: null,
  },
  electrolyte: {
    id: 'electrolyte',
    hydrationFactor: BEVERAGE_FACTORS.electrolyte,
    icon: 'flash',
    color: '#0EA5E9',
    label: 'Electrolyte',
    emoji: '⚡',
    description: '110% hydration credit',
    tip: 'Sodium helps your body retain water longer',
    pairWith: null,
    warning: 'Best after exercise or in hot weather',
  },
  coconut: {
    id: 'coconut',
    hydrationFactor: BEVERAGE_FACTORS.coconut,
    icon: 'leaf',
    color: '#84CC16',
    label: 'Coconut Water',
    emoji: '🥥',
    description: '105% hydration credit',
    tip: 'Natural electrolytes - great for rehydration',
    pairWith: null,
    warning: null,
  },
  smoothie: {
    id: 'smoothie',
    hydrationFactor: BEVERAGE_FACTORS.smoothie,
    icon: 'ice-cream',
    color: '#EC4899',
    label: 'Smoothie',
    emoji: '🥤',
    description: '85% hydration credit',
    tip: 'Blended fiber doesn\'t reduce water absorption much',
    pairWith: null,
    warning: 'Check added sugar content',
  },
  soda: {
    id: 'soda',
    hydrationFactor: BEVERAGE_FACTORS.soda,
    icon: 'beer',
    color: '#EF4444',
    label: 'Soda',
    emoji: '🥤',
    description: '60% hydration credit',
    tip: 'High sugar and sometimes caffeine reduce effectiveness',
    pairWith: 'water',
    warning: 'High sugar - not ideal for hydration',
  },
  sports: {
    id: 'sports',
    hydrationFactor: BEVERAGE_FACTORS.sports,
    icon: 'fitness',
    color: '#22C55E',
    label: 'Sports Drink',
    emoji: '🏃',
    description: '105% hydration credit',
    tip: 'Designed for rapid rehydration during exercise',
    pairWith: null,
    warning: 'Contains added sugars - best during activity',
  },
};

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
// BEVERAGE PAIRING RULES
// ============================================================================
export const PAIRING_RULES = {
  coffee: { pairWith: 'water', ratio: '1:1', reason: 'Offset caffeine\'s diuretic effect' },
  juice: { pairWith: 'water', ratio: '1:0.5', reason: 'Balance sugar intake' },
  soda: { pairWith: 'water', ratio: '1:1', reason: 'High sugar reduces hydration' },
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

export default {
  BEVERAGE_FACTORS,
  BEVERAGE_TYPES,
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
};
