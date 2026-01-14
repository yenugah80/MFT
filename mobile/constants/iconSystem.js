/**
 * Unified Icon System - World Class Design
 *
 * Single source of truth for all icons in the app.
 * NO EMOJIS. Consistent Ionicons everywhere.
 *
 * Design Principles:
 * 1. Semantic naming - icons match their purpose
 * 2. Consistent style - all outline or all filled per context
 * 3. Accessible - proper sizing and contrast
 */

// Decision type icons - what the AI is telling you
export const DECISION_ICONS = {
  insight: 'bulb-outline',        // New pattern discovered
  encouragement: 'thumbs-up-outline', // Keep doing what you're doing
  warning: 'alert-circle-outline',    // Heads up about something
  neutral: 'information-circle-outline', // General info
};

// User-friendly labels for decision types (NO JARGON)
export const DECISION_LABELS = {
  SPEAK: { label: 'New insight', icon: 'bulb-outline', color: 'insight' },
  REINFORCE: { label: 'Keep it up', icon: 'thumbs-up-outline', color: 'success' },
  PREDICT: { label: 'Heads up', icon: 'alert-circle-outline', color: 'warning' },
  SILENT: { label: 'All good', icon: 'checkmark-circle-outline', color: 'success' },
};

// Domain/category icons
export const DOMAIN_ICONS = {
  energy: 'flash-outline',
  mood: 'happy-outline',
  focus: 'eye-outline',
  clarity: 'bulb-outline',
  sleep: 'moon-outline',
  digestion: 'fitness-outline',
  hydration: 'water-outline',
  nutrition: 'nutrition-outline',
  weight: 'scale-outline',
  activity: 'walk-outline',
};

// Action icons - what user can do
export const ACTION_ICONS = {
  log: 'add-circle-outline',
  view: 'eye-outline',
  navigate: 'arrow-forward-outline',
  settings: 'settings-outline',
  share: 'share-outline',
  dismiss: 'close-circle-outline',
  refresh: 'refresh-outline',
  filter: 'filter-outline',
  search: 'search-outline',
  back: 'arrow-back-outline',
  expand: 'chevron-down-outline',
  collapse: 'chevron-up-outline',
  more: 'ellipsis-horizontal-outline',
};

// Status icons
export const STATUS_ICONS = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
  info: 'information-circle',
  loading: 'hourglass-outline',
  empty: 'folder-open-outline',
  offline: 'cloud-offline-outline',
};

// Trend icons
export const TREND_ICONS = {
  up: 'trending-up',
  down: 'trending-down',
  stable: 'remove-outline',
  improving: 'arrow-up-circle-outline',
  declining: 'arrow-down-circle-outline',
};

// Pattern/correlation icons
export const PATTERN_ICONS = {
  correlation: 'git-compare-outline',
  cause: 'arrow-forward-circle-outline',
  effect: 'pulse-outline',
  frequency: 'repeat-outline',
  strength: 'speedometer-outline',
};

// Nutrition icons
export const NUTRITION_ICONS = {
  calories: 'flame-outline',
  protein: 'barbell-outline',
  carbs: 'leaf-outline',
  fat: 'water-outline',
  fiber: 'nutrition-outline',
  water: 'water-outline',
  meal: 'restaurant-outline',
  snack: 'cafe-outline',
};

// Icon sizes - consistent across app
export const ICON_SIZES = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};

/**
 * Get icon for a decision type
 * @param {string} type - SPEAK, REINFORCE, PREDICT, SILENT
 * @returns {object} { icon, label, color }
 */
export function getDecisionDisplay(type) {
  return DECISION_LABELS[type] || DECISION_LABELS.SILENT;
}

/**
 * Get icon for a domain
 * @param {string} domain - energy, mood, focus, etc.
 * @returns {string} Ionicon name
 */
export function getDomainIcon(domain) {
  const key = domain?.toLowerCase?.() || '';
  return DOMAIN_ICONS[key] || 'analytics-outline';
}

/**
 * Get icon for a nutrition metric
 * @param {string} metric - calories, protein, etc.
 * @returns {string} Ionicon name
 */
export function getNutritionIcon(metric) {
  const key = metric?.toLowerCase?.() || '';
  return NUTRITION_ICONS[key] || 'nutrition-outline';
}
