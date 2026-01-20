/**
 * Design System Tokens
 * Premium dark-glass theme for instrument-style dashboard
 * Inspired by Apple Fitness, Whoop, Levels
 */

// COLORS
export const COLORS = {
  // Background gradients
  background: {
    primary: '#0f172a',     // Deep navy
    secondary: '#1e293b',   // Slate dark
    gradient: ['#0f172a', '#1e293b', '#334155'],
  },

  // Glass card surfaces
  glass: {
    surface: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.12)',
    highlight: 'rgba(255, 255, 255, 0.18)',
    overlay: 'rgba(15, 23, 42, 0.85)',
  },

  // Text hierarchy - warm tones for playful, encouraging feel
  text: {
    primary: '#faf8f7',     // Warm white
    secondary: '#e0d8d3',   // Warm light
    tertiary: '#a9a099',    // Warm stone
    muted: '#78716c',       // Warm muted
  },

  // Semantic colors for data states
  semantic: {
    // Good / in range
    good: '#10b981',        // Emerald
    goodDark: '#059669',
    goodLight: '#34d399',
    goodGlow: 'rgba(16, 185, 129, 0.3)',

    // Warning / approaching limit
    warn: '#f59e0b',        // Amber
    warnDark: '#d97706',
    warnLight: '#fbbf24',
    warnGlow: 'rgba(245, 158, 11, 0.3)',

    // Over / exceeded
    over: '#ef4444',        // Red
    overDark: '#dc2626',
    overLight: '#f87171',
    overGlow: 'rgba(239, 68, 68, 0.3)',

    // Neutral / no data - warm tones
    neutral: '#78716c',     // Warm stone (friendly)
    neutralLight: '#a9a099',
    neutralGlow: 'rgba(120, 113, 108, 0.2)',

    // Info / contextual
    info: '#3b82f6',        // Blue
    infoLight: '#60a5fa',
    infoGlow: 'rgba(59, 130, 246, 0.3)',
  },

  // Macro colors (for donut chart)
  macros: {
    protein: {
      base: '#8b5cf6',      // Purple
      light: '#a78bfa',
      dark: '#7c3aed',
      gradient: ['#8b5cf6', '#a78bfa'],
    },
    carbs: {
      base: '#3b82f6',      // Blue
      light: '#60a5fa',
      dark: '#2563eb',
      gradient: ['#3b82f6', '#60a5fa'],
    },
    fat: {
      base: '#f59e0b',      // Amber
      light: '#fbbf24',
      dark: '#d97706',
      gradient: ['#f59e0b', '#fbbf24'],
    },
  },

  // Special instrument gradients
  gradients: {
    primary: ['#3b82f6', '#8b5cf6'],
    success: ['#10b981', '#34d399'],
    warning: ['#f59e0b', '#fbbf24'],
    danger: ['#ef4444', '#f87171'],
    neutral: ['#78716c', '#a9a099'],  // Warm stone gradient
  },
};

// TYPOGRAPHY
export const TYPOGRAPHY = {
  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  },

  // Font families - DM Sans for premium feel
  family: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
};

// SPACING (4pt grid system)
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
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
};

// BORDER RADIUS
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// SHADOWS (subtle, instrument-like)
export const SHADOWS = {
  // Elevation shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Glow effects (colored shadows)
  glowGreen: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  glowBlue: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  glowAmber: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  glowRed: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
};

// ANIMATION TIMING
export const ANIMATION = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    slower: 600,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: { tension: 300, friction: 20 },
    bounce: { tension: 180, friction: 12 },
  },
};

// GLASS CARD RECIPE
export const GLASS_CARD = {
  backgroundColor: COLORS.glass.surface,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: COLORS.glass.border,
  padding: SPACING[4],
  ...SHADOWS.md,
  // Simulated backdrop blur (since RN doesn't support it natively)
  // Use overlay pattern or slightly darker background
};

// DATA STATE HELPERS
export const getStateColor = (state) => {
  switch (state) {
    case 'good':
      return COLORS.semantic.good;
    case 'warn':
      return COLORS.semantic.warn;
    case 'over':
      return COLORS.semantic.over;
    case 'missing':
    case 'neutral':
      return COLORS.semantic.neutral;
    default:
      return COLORS.semantic.neutral;
  }
};

export const getStateGradient = (state) => {
  switch (state) {
    case 'good':
      return COLORS.gradients.success;
    case 'warn':
      return COLORS.gradients.warning;
    case 'over':
      return COLORS.gradients.danger;
    default:
      return COLORS.gradients.neutral;
  }
};

export const getStateGlow = (state) => {
  switch (state) {
    case 'good':
      return SHADOWS.glowGreen;
    case 'warn':
      return SHADOWS.glowAmber;
    case 'over':
      return SHADOWS.glowRed;
    default:
      return SHADOWS.md;
  }
};

// FORMATTING UTILITIES
export const formatters = {
  // Format percentage without spam
  percent: (ratio) => {
    if (ratio === null || ratio === undefined) return '—';
    if (ratio === 0) return '0%';
    const percent = Math.round(ratio * 100);
    // Cap display at 150%, show overflow differently
    if (percent > 150) return '150%+';
    return `${percent}%`;
  },

  // Format delta (difference from goal)
  delta: (value, goal) => {
    if (!goal) return '—';
    const diff = value - goal;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${Math.round(diff)}`;
  },

  // Format large numbers
  number: (value) => {
    if (value === null || value === undefined) return '—';
    if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toString();
  },

  // Format ratio as multiplier (for extreme overages)
  multiplier: (ratio) => {
    if (ratio <= 1.5) return null; // Use normal % display
    return `${ratio.toFixed(1)}×`;
  },
};

// DATA STATE DETECTOR
export const detectDataState = (value, goal, options = {}) => {
  const { warnThreshold = 0.8, overThreshold = 1.0, allowNull = false } = options;

  // Missing data
  if (value === null || value === undefined || (value === 0 && !allowNull)) {
    return {
      state: 'missing',
      label: 'No data',
      color: COLORS.semantic.neutral,
    };
  }

  if (!goal || goal === 0) {
    return {
      state: 'neutral',
      label: 'No goal set',
      color: COLORS.semantic.neutral,
    };
  }

  const ratio = value / goal;

  // Good range
  if (ratio < warnThreshold) {
    return {
      state: 'good',
      label: 'On track',
      color: COLORS.semantic.good,
      ratio,
    };
  }

  // Warning range
  if (ratio >= warnThreshold && ratio < overThreshold) {
    return {
      state: 'warn',
      label: 'Almost there',
      color: COLORS.semantic.warn,
      ratio,
    };
  }

  // Over limit (but reasonable)
  if (ratio >= overThreshold && ratio < 1.5) {
    return {
      state: 'over',
      label: 'Over goal',
      color: COLORS.semantic.over,
      ratio,
    };
  }

  // Extreme overflow - data anomaly
  return {
    state: 'anomaly',
    label: 'Check data',
    color: COLORS.semantic.over,
    ratio,
    isAnomaly: true,
  };
};

// ATWATER FACTORS (for macro calculations)
export const ATWATER = {
  protein: 4,   // kcal per gram
  carbs: 4,     // kcal per gram
  fat: 9,       // kcal per gram
};

// Calculate calories from macros
export const calculateCaloriesFromMacros = (protein, carbs, fat) => {
  return (protein * ATWATER.protein) + (carbs * ATWATER.carbs) + (fat * ATWATER.fat);
};

// Calculate macro percentages (by calorie contribution, not grams)
export const calculateMacroPercentages = (protein, carbs, fat) => {
  const proteinCals = protein * ATWATER.protein;
  const carbsCals = carbs * ATWATER.carbs;
  const fatCals = fat * ATWATER.fat;
  const totalCals = proteinCals + carbsCals + fatCals;

  if (totalCals === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: (proteinCals / totalCals) * 100,
    carbs: (carbsCals / totalCals) * 100,
    fat: (fatCals / totalCals) * 100,
  };
};
