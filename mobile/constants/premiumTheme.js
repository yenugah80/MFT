/**
 * Premium Unified Design System
 * Glossy, trendy, user-centric theme
 * Consistent across Log, Dashboard, and Profile
 */

// PRIMARY BRAND COLORS
export const BRAND = {
  primary: '#E46A4B',
  primaryLight: '#F6D6CC',
  primaryDark: '#C6553A',
  secondary: '#4B7B9C',
  secondaryLight: '#DCE6E0',
  accent: '#4B7B9C',
};

// BACKGROUND & SURFACES
export const SURFACES = {
  background: {
    primary: '#F5F3EE',
    secondary: '#FFFFFF',
    tertiary: '#F0EDE8',
  },
  card: {
    primary: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.9)',
    glassDark: 'rgba(228, 106, 75, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    border: 'rgba(230, 225, 217, 0.9)',
  },
  gradient: {
    primary: ['#E46A4B', '#F1A98E'],
    secondary: ['#4B7B9C', '#A7C0D4'],
    accent: ['#4B7B9C', '#C9D8E4'],
    success: ['#4B7B9C', '#A7C0D4'],
    warning: ['#C9A26A', '#E8D1AF'],
    danger: ['#C9705A', '#EBC1B5'],
    purple: ['#6A6F7C', '#B6BCC7'],
    blue: ['#4B7B9C', '#A7C0D4'],
    pink: ['#E46A4B', '#F6D6CC'],
    // Modern Pastel Gradients
    pastelPeach: ['#F6D6CC', '#FBEDE8'],
    pastelLavender: ['#B6BCC7', '#E2E6EE'],
    pastelMint: ['#DCE6E0', '#F0F5F3'],
    pastelSky: ['#F0EDE8', '#F7F5F1'],
    pastelRose: ['#F6D6CC', '#FBEDE8'],
    softPurple: ['#F0EDE8', '#F7F5F1'],
    softBlue: ['#F0EDE8', '#F7F5F1'],
    softGreen: ['#F0F5F3', '#FFFFFF'],
  },
};

// TEXT HIERARCHY - WCAG AA Compliant Contrast
export const TEXT = {
  primary: '#1C1F26',
  secondary: '#4D5565',
  tertiary: '#6F7686',
  muted: '#98A0AF',
  white: '#FFFFFF',
  onPurple: '#FFFFFF',      // Text ON purple backgrounds
  onPurpleSecondary: '#F0EDE8',
  brand: BRAND.primary,
};

// SEMANTIC COLORS - For colored overlays and indicators
export const SEMANTIC = {
  success: {
    base: '#4B7B9C',
    light: '#A7C0D4',
    dark: '#355C78',
    bg: '#E9F0F6',
    text: '#FFFFFF',         // White text on success backgrounds
  },
  warning: {
    base: '#C9A26A',
    light: '#E8D1AF',
    dark: '#A5824F',
    bg: '#F6EFE3',
    text: '#FFFFFF',         // White text on warning backgrounds
  },
  danger: {
    base: '#C9705A',
    light: '#EBC1B5',
    dark: '#A35341',
    bg: '#F7ECE9',
    text: '#FFFFFF',         // White text on danger backgrounds
  },
  info: {
    base: '#4B7B9C',
    light: '#A7C0D4',
    dark: '#355C78',
    bg: '#E9F0F6',
    text: '#FFFFFF',         // White text on info backgrounds
  },
};

// SEMANTIC ACTION COLORS - For CTAs and interactive elements
export const SEMANTIC_ACTIONS = {
  primary: '#E46A4B',     // Main actions (submit, confirm)
  success: '#4B7B9C',     // Goal achieved, positive actions
  warning: '#C9A26A',     // Approaching limit, caution
  danger: '#C9705A',      // Over limit, delete actions
  info: '#4B7B9C',        // Insights, informational
  muted: '#98A0AF',       // Disabled, inactive
};

// CELEBRATION COLORS - For achievements and celebrations
export const CELEBRATION = {
  confetti: ['#6B4EFF', '#FF6B9D', '#00D9FF', '#10B981', '#F59E0B'],
  glow: 'rgba(107, 78, 255, 0.3)',
  sparkle: '#FFD700',
  streak: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  },
};

// NUTRISCORE COLORS - Official European NutriScore pastel gradients
export const NUTRISCORE = {
  A: {
    base: '#038141',
    light: '#85BB2F',
    gradient: ['#7BC96F', '#4CAF50'],
    pastel: ['#E8F5E9', '#C8E6C9'],
    bg: '#E8F5E9',
    text: '#1B5E20',
  },
  B: {
    base: '#85BB2F',
    light: '#A8D28C',
    gradient: ['#C5E1A5', '#AED581'],
    pastel: ['#F1F8E9', '#DCEDC8'],
    bg: '#F1F8E9',
    text: '#33691E',
  },
  C: {
    base: '#FECB02',
    light: '#FFE082',
    gradient: ['#FFE082', '#FFCA28'],
    pastel: ['#FFFDE7', '#FFF9C4'],
    bg: '#FFFDE7',
    text: '#F57F17',
  },
  D: {
    base: '#EE8100',
    light: '#FFB74D',
    gradient: ['#FFCC80', '#FFA726'],
    pastel: ['#FFF3E0', '#FFE0B2'],
    bg: '#FFF3E0',
    text: '#E65100',
  },
  E: {
    base: '#E63E11',
    light: '#EF5350',
    gradient: ['#EF9A9A', '#E57373'],
    pastel: ['#FFEBEE', '#FFCDD2'],
    bg: '#FFEBEE',
    text: '#B71C1C',
  },
};

// HEALTH SCORE COLORS - For 0-100 health ratings
export const HEALTH_SCORE = {
  excellent: { // 80-100
    gradient: ['#4CAF50', '#66BB6A'],
    pastel: ['#E8F5E9', '#C8E6C9'],
    text: '#1B5E20',
  },
  good: { // 60-79
    gradient: ['#8BC34A', '#9CCC65'],
    pastel: ['#F1F8E9', '#DCEDC8'],
    text: '#33691E',
  },
  average: { // 40-59
    gradient: ['#FFEB3B', '#FFF176'],
    pastel: ['#FFFDE7', '#FFF9C4'],
    text: '#F57F17',
  },
  poor: { // 20-39
    gradient: ['#FF9800', '#FFB74D'],
    pastel: ['#FFF3E0', '#FFE0B2'],
    text: '#E65100',
  },
  bad: { // 0-19
    gradient: ['#F44336', '#EF5350'],
    pastel: ['#FFEBEE', '#FFCDD2'],
    text: '#B71C1C',
  },
};

// TYPOGRAPHY
export const TYPOGRAPHY = {
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// SPACING (4pt grid)
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

// BORDER RADIUS
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

// PREMIUM SHADOWS (with backgroundColor for efficient rendering)
export const SHADOWS = {
  sm: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E46A4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E46A4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E46A4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E46A4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  // Colored glows (for non-white backgrounds, override backgroundColor if needed)
  success: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#4B7B9C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  warning: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#C9A26A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  danger: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#C9705A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  info: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#4B7B9C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
};

// ICON SIZES
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
};

// PREMIUM CARD RECIPE
export const PREMIUM_CARD = {
  backgroundColor: SURFACES.card.primary,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(43, 93, 255, 0.12)',
  padding: SPACING[4],
  ...SHADOWS.md,
};

// GLASS CARD RECIPE
export const GLASS_CARD = {
  backgroundColor: SURFACES.card.glass,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(43, 93, 255, 0.15)',
  padding: SPACING[4],
  ...SHADOWS.sm,
};

// GRADIENT BUTTON RECIPE
export const GRADIENT_BUTTON = {
  borderRadius: RADIUS.lg,
  paddingVertical: SPACING[3],
  paddingHorizontal: SPACING[5],
  alignItems: 'center',
  justifyContent: 'center',
  ...SHADOWS.md,
};

// =============================================================================
// STANDARDIZED CARD SYSTEM - Use consistently across ALL dashboard cards
// =============================================================================
// Design Philosophy: "Calm Luxury" - Oura Ring, Apple Health, Linear inspired
// - Brand-tinted shadows (not black)
// - Consistent radius and spacing
// - Three tiers: hero (50% viewport), standard (most cards), compact (tiles)
// =============================================================================

export const CARD_SYSTEM = {
  // HERO CARD - Primary metric, demands attention (e.g., Wellness Score)
  hero: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],        // 24px - generous rounding
    padding: SPACING[5],                // 20px - breathing room
    marginBottom: SPACING[4],           // 16px - consistent spacing
    borderWidth: 1.5,
    borderColor: 'rgba(43, 93, 255, 0.18)',
    shadowColor: '#2B5DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  // STANDARD CARD - Most dashboard cards (calendar, meals, achievements)
  standard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,            // 20px
    padding: SPACING[4],                // 16px
    marginBottom: SPACING[4],           // 16px
    borderWidth: 1,
    borderColor: 'rgba(43, 93, 255, 0.12)',
    shadowColor: '#2B5DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },

  // COMPACT CARD - Small tiles, quick stats, glassmorphism
  compact: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: RADIUS.xl,            // 20px
    padding: SPACING[3],                // 12px
    marginBottom: SPACING[3],           // 12px
    borderWidth: 1,
    borderColor: 'rgba(43, 93, 255, 0.10)',
    shadowColor: '#2B5DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // INTERACTIVE STATES - Apply when card is pressed/focused
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },

  // ELEVATED - For modals, bottom sheets, overlays
  elevated: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 0,
    shadowColor: '#2B5DFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 16,
  },
};

// ANIMATION TIMINGS
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    tension: 300,
    friction: 20,
  },
};

// MACRO COLORS (consistent with dashboard)
export const MACRO_COLORS = {
  protein: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  carbs: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  fat: {
    base: '#E7B7B1',
    light: '#F6D7CC',
    gradient: ['#E7B7B1', '#F6D7CC'],
  },
  fiber: {
    base: '#B9B4E7',
    light: '#D9D5F2',
    gradient: ['#B9B4E7', '#D9D5F2'],
  },
};

// MOOD COLORS (8 core moods for premium MoodTracker)
export const MOOD_PALETTE = {
  happy: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    dark: '#7AAE9A',
    bg: '#EEF7F3',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  calm: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    dark: '#6F82C8',
    bg: '#EEF2FF',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  focused: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    dark: '#7AAE9A',
    bg: '#EEF7F3',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  energized: {
    base: '#F1C6A8',
    light: '#F6D7CC',
    dark: '#C98E7F',
    bg: '#FBF1ED',
    gradient: ['#F1C6A8', '#F6D7CC'],
  },
  neutral: {
    base: '#7C839A',
    light: '#9AA1B2',
    dark: '#5E657A',
    bg: '#F1F3F7',
    gradient: ['#7C839A', '#9AA1B2'],
  },
  tired: {
    base: '#B9B4E7',
    light: '#D9D5F2',
    dark: '#8F88C8',
    bg: '#F3F2FA',
    gradient: ['#B9B4E7', '#D9D5F2'],
  },
  stressed: {
    base: '#E7B7B1',
    light: '#F6D7CC',
    dark: '#C98E7F',
    bg: '#FBF1ED',
    gradient: ['#E7B7B1', '#F6D7CC'],
  },
  sad: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    dark: '#6F82C8',
    bg: '#EEF2FF',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  // Future expansion (Phase 4+): angry, anxious, excited, relaxed
};

// ENERGY LEVEL COLORS
export const ENERGY_PALETTE = {
  veryHigh: {
    color: '#F1C6A8',
    label: 'Very High',
    range: [9, 10],
  },
  high: {
    color: '#A8C9B6',
    label: 'High',
    range: [7, 8],
  },
  medium: {
    color: '#8FA0E6',
    label: 'Medium',
    range: [5, 6],
  },
  low: {
    color: '#E7B7B1',
    label: 'Low',
    range: [3, 4],
  },
  veryLow: {
    color: '#B9B4E7',
    label: 'Very Low',
    range: [1, 2],
  },
};

// CORRELATION STRENGTH COLORS (for meal-mood correlations)
export const CORRELATION_COLORS = {
  strong: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    label: 'Strong',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  moderate: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    label: 'Moderate',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  weak: {
    base: '#E7B7B1',
    light: '#F6D7CC',
    label: 'Weak',
    gradient: ['#E7B7B1', '#F6D7CC'],
  },
  none: {
    base: '#9AA1B2',
    light: '#C2C7D4',
    label: 'None',
    gradient: ['#9AA1B2', '#C2C7D4'],
  },
};

// ICON NAMES MAPPING (Ionicons)
export const ICONS = {
  // Navigation
  dashboard: 'stats-chart',
  log: 'restaurant',
  profile: 'person',

  // Food & Nutrition
  food: 'fast-food',
  meal: 'restaurant-outline',
  breakfast: 'sunny',
  lunch: 'partly-sunny',
  dinner: 'moon',
  snack: 'ice-cream',
  water: 'water',

  // Macros
  protein: 'barbell',
  carbs: 'nutrition',
  fat: 'flame',
  fiber: 'leaf',
  calories: 'flame-outline',

  // Input modes
  text: 'create',
  photo: 'camera',
  voice: 'mic',
  barcode: 'barcode',

  // Actions
  add: 'add-circle',
  remove: 'close-circle',
  edit: 'create-outline',
  save: 'checkmark-circle',
  cancel: 'close',
  delete: 'trash',
  search: 'search',
  filter: 'funnel',
  refresh: 'refresh',

  // Mood & Health
  mood: 'happy',
  moodGreat: 'happy-outline',
  moodGood: 'happy-outline',
  moodOkay: 'sad-outline',
  moodBad: 'sad-outline',
  weight: 'scale',
  activity: 'walk',

  // UI Elements
  info: 'information-circle',
  warning: 'warning',
  success: 'checkmark-circle',
  error: 'close-circle',
  star: 'star',
  heart: 'heart',
  fire: 'flame',
  trophy: 'trophy',
  time: 'time',
  calendar: 'calendar',
  chart: 'bar-chart',
  settings: 'settings',
  logout: 'log-out',

  // Arrows & Navigation
  back: 'arrow-back',
  forward: 'arrow-forward',
  up: 'chevron-up',
  down: 'chevron-down',
  left: 'chevron-back',
  right: 'chevron-forward',
};

// HELPER: Get semantic color based on state
export const getSemanticColor = (state) => {
  switch (state) {
    case 'success':
    case 'good':
      return SEMANTIC.success.base;
    case 'warning':
    case 'warn':
      return SEMANTIC.warning.base;
    case 'danger':
    case 'error':
    case 'over':
      return SEMANTIC.danger.base;
    case 'info':
    case 'neutral':
    default:
      return SEMANTIC.info.base;
  }
};

// HELPER: Get gradient for state
export const getSemanticGradient = (state) => {
  switch (state) {
    case 'success':
    case 'good':
      return SURFACES.gradient.success;
    case 'warning':
    case 'warn':
      return SURFACES.gradient.warning;
    case 'danger':
    case 'error':
      return SURFACES.gradient.danger;
    case 'info':
    case 'neutral':
    default:
      return SURFACES.gradient.primary;
  }
};

// HELPER: Format percentage
export const formatPercent = (ratio) => {
  if (ratio === null || ratio === undefined) return '0%';
  const percent = Math.round(ratio * 100);
  return percent > 150 ? '150%+' : `${percent}%`;
};

// HELPER: Format number
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
};

// Export all
export const PREMIUM_THEME = {
  BRAND,
  SURFACES,
  TEXT,
  SEMANTIC,
  SEMANTIC_ACTIONS,
  CELEBRATION,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  PREMIUM_CARD,
  GLASS_CARD,
  GRADIENT_BUTTON,
  CARD_SYSTEM,
  ANIMATION,
  MACRO_COLORS,
  MOOD_PALETTE,
  ENERGY_PALETTE,
  CORRELATION_COLORS,
  ICONS,
};

export default PREMIUM_THEME;
