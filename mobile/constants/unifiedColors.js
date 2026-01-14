/**
 * Unified Color System - World Class Design
 *
 * Single source of truth for ALL colors in the app.
 * Inspired by Apple Health, Oura Ring, and modern wellness apps.
 *
 * Design Principles:
 * 1. Semantic naming - colors describe PURPOSE not appearance
 * 2. WCAG AA compliant - all text meets accessibility standards
 * 3. Consistent gradients - same gradient style everywhere
 * 4. Dark mode ready - structure supports future themes
 */

// ============================================================================
// CORE PALETTE - The DNA of our visual language
// ============================================================================

const PALETTE = {
  // Greens - Health, Success, Growth
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',  // Primary
    600: '#059669',
    700: '#047857',
  },

  // Blues - Trust, Information, Calm
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Primary
    600: '#2563EB',
    700: '#1D4ED8',
  },

  // Purples - Premium, Mood, Creativity
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // Primary
    600: '#7C3AED',
    700: '#6D28D9',
  },

  // Oranges - Energy, Warmth, Activity
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // Primary
    600: '#EA580C',
    700: '#C2410C',
  },

  // Ambers - Warning, Attention, Caution
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // Primary
    600: '#D97706',
    700: '#B45309',
  },

  // Reds - Error, Danger, Stop
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',  // Primary
    600: '#DC2626',
    700: '#B91C1C',
  },

  // Cyans - Hydration, Fresh, Cool
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',  // Primary
    600: '#0891B2',
    700: '#0E7490',
  },

  // Neutrals - Text, Backgrounds, Borders
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },

  // Warm neutrals - For a friendlier feel
  warmNeutral: {
    50: '#FBF9F7',
    100: '#F5F2EF',
    200: '#E5E1DB',
    300: '#D4CFC8',
    400: '#A89E97',
    500: '#8A7F78',
    600: '#5D534D',
    700: '#3D3633',
    800: '#2D2522',
    900: '#1A1815',
  },
};

// ============================================================================
// SEMANTIC COLORS - Use these in components
// ============================================================================

export const COLORS = {
  // Background colors
  background: {
    primary: PALETTE.warmNeutral[50],    // Main app background
    secondary: PALETTE.neutral[0],        // Card backgrounds
    tertiary: PALETTE.warmNeutral[100],   // Subtle sections
    inverse: PALETTE.neutral[900],        // Dark backgrounds
  },

  // Text colors - WCAG AA compliant
  text: {
    primary: PALETTE.warmNeutral[800],    // Main text - high contrast
    secondary: PALETTE.warmNeutral[600],  // Secondary text
    tertiary: PALETTE.warmNeutral[500],   // Muted text
    inverse: PALETTE.neutral[0],          // Text on dark backgrounds
    link: PALETTE.blue[600],              // Interactive text
  },

  // Border and divider colors
  border: {
    light: PALETTE.warmNeutral[200],
    medium: PALETTE.warmNeutral[300],
    focus: PALETTE.violet[500],
  },

  // Status colors - for feedback
  status: {
    success: PALETTE.emerald[500],
    successBg: PALETTE.emerald[50],
    warning: PALETTE.amber[500],
    warningBg: PALETTE.amber[50],
    error: PALETTE.red[500],
    errorBg: PALETTE.red[50],
    info: PALETTE.blue[500],
    infoBg: PALETTE.blue[50],
  },

  // Insight colors - for AI recommendations
  insight: {
    new: PALETTE.blue[500],           // New pattern discovered
    newBg: PALETTE.blue[50],
    positive: PALETTE.emerald[500],   // Keep doing this
    positiveBg: PALETTE.emerald[50],
    caution: PALETTE.amber[500],      // Watch out
    cautionBg: PALETTE.amber[50],
    neutral: PALETTE.neutral[500],    // General info
    neutralBg: PALETTE.neutral[100],
  },

  // Domain colors - for health categories
  domain: {
    energy: PALETTE.orange[500],
    energyBg: PALETTE.orange[50],
    mood: PALETTE.violet[500],
    moodBg: PALETTE.violet[50],
    nutrition: PALETTE.emerald[500],
    nutritionBg: PALETTE.emerald[50],
    hydration: PALETTE.cyan[500],
    hydrationBg: PALETTE.cyan[50],
    sleep: PALETTE.blue[500],
    sleepBg: PALETTE.blue[50],
    activity: PALETTE.orange[500],
    activityBg: PALETTE.orange[50],
  },

  // Brand colors
  brand: {
    primary: PALETTE.violet[500],
    primaryLight: PALETTE.violet[400],
    primaryDark: PALETTE.violet[600],
  },
};

// ============================================================================
// GRADIENTS - For premium visual effects
// ============================================================================

export const GRADIENTS = {
  // Screen backgrounds - subtle, warm
  screenPrimary: [PALETTE.warmNeutral[50], '#FFFFFF'],
  screenWarm: ['#FDF8F5', '#FAF5F0', '#F8F3EE'],
  screenCool: ['#F8FAFC', '#F1F5F9'],

  // Card accents - for visual interest
  insight: [PALETTE.blue[500], PALETTE.blue[400]],
  success: [PALETTE.emerald[500], PALETTE.emerald[400]],
  warning: [PALETTE.amber[500], PALETTE.amber[400]],
  premium: [PALETTE.violet[500], PALETTE.violet[400]],

  // Metric rings - Apple Health style
  calories: [PALETTE.orange[500], PALETTE.orange[400]],
  protein: [PALETTE.violet[500], PALETTE.violet[400]],
  carbs: [PALETTE.emerald[500], PALETTE.emerald[400]],
  fat: [PALETTE.amber[500], PALETTE.amber[400]],
  water: [PALETTE.cyan[500], PALETTE.cyan[400]],

  // Score gradients - based on value
  scoreExcellent: [PALETTE.emerald[500], PALETTE.emerald[400]],
  scoreGood: [PALETTE.blue[500], PALETTE.blue[400]],
  scoreFair: [PALETTE.amber[500], PALETTE.amber[400]],
  scorePoor: [PALETTE.red[500], PALETTE.red[400]],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color for a score value (0-100)
 */
export function getScoreColor(score) {
  if (score >= 80) return COLORS.status.success;
  if (score >= 60) return COLORS.brand.primary;
  if (score >= 40) return COLORS.status.warning;
  return COLORS.status.error;
}

/**
 * Get gradient for a score value (0-100)
 */
export function getScoreGradient(score) {
  if (score >= 80) return GRADIENTS.scoreExcellent;
  if (score >= 60) return GRADIENTS.scoreGood;
  if (score >= 40) return GRADIENTS.scoreFair;
  return GRADIENTS.scorePoor;
}

/**
 * Get color for insight type
 */
export function getInsightColor(type) {
  const map = {
    SPEAK: { color: COLORS.insight.new, bg: COLORS.insight.newBg },
    REINFORCE: { color: COLORS.insight.positive, bg: COLORS.insight.positiveBg },
    PREDICT: { color: COLORS.insight.caution, bg: COLORS.insight.cautionBg },
    SILENT: { color: COLORS.insight.neutral, bg: COLORS.insight.neutralBg },
  };
  return map[type] || map.SILENT;
}

/**
 * Get color for a domain
 */
export function getDomainColor(domain) {
  const key = domain?.toLowerCase?.() || '';
  const colors = {
    energy: { color: COLORS.domain.energy, bg: COLORS.domain.energyBg },
    mood: { color: COLORS.domain.mood, bg: COLORS.domain.moodBg },
    nutrition: { color: COLORS.domain.nutrition, bg: COLORS.domain.nutritionBg },
    hydration: { color: COLORS.domain.hydration, bg: COLORS.domain.hydrationBg },
    sleep: { color: COLORS.domain.sleep, bg: COLORS.domain.sleepBg },
    activity: { color: COLORS.domain.activity, bg: COLORS.domain.activityBg },
    focus: { color: COLORS.domain.mood, bg: COLORS.domain.moodBg },
    clarity: { color: COLORS.domain.sleep, bg: COLORS.domain.sleepBg },
  };
  return colors[key] || { color: COLORS.text.tertiary, bg: COLORS.background.tertiary };
}

// Export palette for advanced use cases
export { PALETTE };
