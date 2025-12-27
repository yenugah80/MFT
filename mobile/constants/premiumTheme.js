/**
 * Premium Unified Design System
 * Glossy, trendy, user-centric theme
 * Consistent across Log, Dashboard, and Profile
 */

// PRIMARY BRAND COLORS
export const BRAND = {
  primary: '#6B4EFF',
  primaryLight: '#8B6EFF',
  primaryDark: '#5739CC',
  secondary: '#FF6B9D',
  secondaryLight: '#FF8FB8',
  accent: '#00D9FF',
};

// BACKGROUND & SURFACES
export const SURFACES = {
  background: {
    primary: '#F8F9FF',      // Soft purple-white
    secondary: '#FFFFFF',     // Pure white
    tertiary: '#EEF2FF',      // Light purple tint
  },
  card: {
    primary: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.9)',
    glassDark: 'rgba(107, 78, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  gradient: {
    primary: ['#6B4EFF', '#8B6EFF'],
    secondary: ['#FF6B9D', '#FF8FB8'],
    accent: ['#00D9FF', '#3AEAFF'],
    success: ['#10B981', '#34D399'],
    warning: ['#F59E0B', '#FBBF24'],
    danger: ['#EF4444', '#F87171'],
    purple: ['#64748B', '#94A3B8'],  // Soft slate gradient (was overwhelming lavender)
    blue: ['#3B82F6', '#60A5FA'],
    pink: ['#EC4899', '#F472B6'],
    // Modern Pastel Gradients
    pastelPeach: ['#FFEEE8', '#FFE0D5'],
    pastelLavender: ['#F3E8FF', '#E9D5FF'],
    pastelMint: ['#DCFCE7', '#D1FAE5'],
    pastelSky: ['#E0F2FE', '#DBEAFE'],
    pastelRose: ['#FFE4E6', '#FECDD3'],
    softPurple: ['#F5F3FF', '#EDE9FE'],
    softBlue: ['#EFF6FF', '#DBEAFE'],
    softGreen: ['#F0FDF4', '#DCFCE7'],
  },
};

// TEXT HIERARCHY
export const TEXT = {
  primary: '#1F2937',       // Dark gray
  secondary: '#4B5563',     // Medium gray
  tertiary: '#6B7280',      // Light gray
  muted: '#9CA3AF',         // Very light gray
  white: '#FFFFFF',
  brand: BRAND.primary,
};

// SEMANTIC COLORS
export const SEMANTIC = {
  success: {
    base: '#10B981',
    light: '#34D399',
    dark: '#059669',
    bg: '#ECFDF5',
  },
  warning: {
    base: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    bg: '#FFFBEB',
  },
  danger: {
    base: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    bg: '#FEF2F2',
  },
  info: {
    base: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    bg: '#EFF6FF',
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

// PREMIUM SHADOWS
export const SHADOWS = {
  sm: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  // Colored glows
  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  warning: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  danger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  info: {
    shadowColor: '#3B82F6',
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
  borderColor: 'rgba(107, 78, 255, 0.1)',
  padding: SPACING[4],
  ...SHADOWS.md,
};

// GLASS CARD RECIPE
export const GLASS_CARD = {
  backgroundColor: SURFACES.card.glass,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(107, 78, 255, 0.15)',
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
    base: '#8B5CF6',
    light: '#A78BFA',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  carbs: {
    base: '#3B82F6',
    light: '#60A5FA',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  fat: {
    base: '#F59E0B',
    light: '#FBBF24',
    gradient: ['#F59E0B', '#FBBF24'],
  },
  fiber: {
    base: '#10B981',
    light: '#34D399',
    gradient: ['#10B981', '#34D399'],
  },
};

// MOOD COLORS (8 core moods for premium MoodTracker)
export const MOOD_PALETTE = {
  happy: {
    base: '#10B981',
    light: '#34D399',
    dark: '#059669',
    bg: '#ECFDF5',
    gradient: ['#10B981', '#34D399'],
  },
  calm: {
    base: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    bg: '#EFF6FF',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  focused: {
    base: '#14B8A6',
    light: '#2DD4BF',
    dark: '#0D9488',
    bg: '#F0FDFA',
    gradient: ['#14B8A6', '#2DD4BF'],
  },
  energized: {
    base: '#FBBF24',
    light: '#FCD34D',
    dark: '#F59E0B',
    bg: '#FFFBEB',
    gradient: ['#FBBF24', '#FCD34D'],
  },
  neutral: {
    base: '#4B5563',
    light: '#0b57eeff',
    dark: '#374151',
    bg: '#E5E7EB',
    gradient: ['#4B5563', '#6B7280'],
  },
  tired: {
    base: '#64748B',      // Soft slate blue (was overwhelming purple #8B5CF6)
    light: '#94A3B8',     // Light slate
    dark: '#475569',      // Darker slate
    bg: '#F1F5F9',        // Soft blue-gray background (was lavender #F5F3FF)
    gradient: ['#64748B', '#94A3B8'],
  },
  stressed: {
    base: '#F97316',
    light: '#FB923C',
    dark: '#EA580C',
    bg: '#FFF7ED',
    gradient: ['#F97316', '#FB923C'],
  },
  sad: {
    base: '#0EA5E9',      // Calm sky blue (was bright indigo #6366F1)
    light: '#38BDF8',     // Lighter sky blue
    dark: '#0284C7',      // Deeper blue
    bg: '#F0F9FF',        // Soft blue background (was lavender #EEF2FF)
    gradient: ['#0EA5E9', '#38BDF8'],
  },
  // Future expansion (Phase 4+): angry, anxious, excited, relaxed
};

// ENERGY LEVEL COLORS
export const ENERGY_PALETTE = {
  veryHigh: {
    color: '#FBBF24',
    label: 'Very High',
    range: [9, 10],
  },
  high: {
    color: '#10B981',
    label: 'High',
    range: [7, 8],
  },
  medium: {
    color: '#3B82F6',
    label: 'Medium',
    range: [5, 6],
  },
  low: {
    color: '#F97316',
    label: 'Low',
    range: [3, 4],
  },
  veryLow: {
    color: '#64748B',     // Soft slate blue (was overwhelming purple #8B5CF6)
    label: 'Very Low',
    range: [1, 2],
  },
};

// CORRELATION STRENGTH COLORS (for meal-mood correlations)
export const CORRELATION_COLORS = {
  strong: {
    base: '#10B981',
    light: '#34D399',
    label: 'Strong',
    gradient: ['#10B981', '#34D399'],
  },
  moderate: {
    base: '#3B82F6',
    light: '#60A5FA',
    label: 'Moderate',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  weak: {
    base: '#F59E0B',
    light: '#FBBF24',
    label: 'Weak',
    gradient: ['#F59E0B', '#FBBF24'],
  },
  none: {
    base: '#6B7280',
    light: '#9CA3AF',
    label: 'None',
    gradient: ['#6B7280', '#9CA3AF'],
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
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  PREMIUM_CARD,
  GLASS_CARD,
  GRADIENT_BUTTON,
  ANIMATION,
  MACRO_COLORS,
  MOOD_PALETTE,
  ENERGY_PALETTE,
  CORRELATION_COLORS,
  ICONS,
};

export default PREMIUM_THEME;
