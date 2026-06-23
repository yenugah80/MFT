/**
 * Premium Design System - MFT 2025
 *
 * Design Philosophy: "Informed Simplicity"
 * - Every element serves a purpose
 * - Data-dense yet visually calm
 * - Confidence through transparency
 * - Delight through micro-interactions, not decoration
 *
 * Inspired by: Linear, Stripe, Apple Health, Oura, Whoop
 *
 * Core Principles:
 * 1. HIERARCHY - Hero metric dominates, supporting data recedes
 * 2. TRUST - Show uncertainty ranges, cite data sources
 * 3. MOTION - Purposeful animations that communicate state
 * 4. DENSITY - Information-rich without feeling crowded
 * 5. POLISH - Refined details that reward closer inspection
 */

// ============================================================================
// COLOR PHILOSOPHY: Semantic + Functional + Beautiful
// Each color has a PURPOSE, not just aesthetic value
// ============================================================================

export const PREMIUM_COLORS = {
  // -------------------------------------------------------------------------
  // BRAND CORE - The soul of the app
  // Deep indigo base with warm secondary creates trust + approachability
  // -------------------------------------------------------------------------
  brand: {
    // Primary: Sophisticated indigo - conveys intelligence & trust
    primary: '#4F46E5',         // Indigo-600 - Primary actions
    primaryLight: '#6366F1',    // Indigo-500 - Hover states
    primaryLighter: '#818CF8',  // Indigo-400 - Backgrounds
    primaryDark: '#3730A3',     // Indigo-800 - Text on light

    // Secondary: Warm coral - conveys energy & health
    secondary: '#F97316',       // Orange-500 - Secondary actions
    secondaryLight: '#FB923C',  // Orange-400 - Accents
    secondaryDark: '#EA580C',   // Orange-600 - Text emphasis

    // Accent: Teal - conveys balance & wellness
    accent: '#14B8A6',          // Teal-500 - Highlights
    accentLight: '#2DD4BF',     // Teal-400 - Success states
  },

  // -------------------------------------------------------------------------
  // FUNCTIONAL COLORS - Each tells a story about the data
  // -------------------------------------------------------------------------
  functional: {
    // Nutrition tracking - Warm orange conveys energy/fuel
    nutrition: {
      primary: '#F97316',
      secondary: '#FB923C',
      tertiary: '#FDBA74',
      gradient: ['#F97316', '#FB923C', '#FDBA74'],
      glow: 'rgba(249, 115, 22, 0.25)',
      surface: '#FFF7ED',
      onSurface: '#9A3412',
    },

    // Hydration tracking - Cool blue conveys water/refreshment
    hydration: {
      primary: '#0EA5E9',
      secondary: '#38BDF8',
      tertiary: '#7DD3FC',
      gradient: ['#0284C7', '#0EA5E9', '#38BDF8'],
      glow: 'rgba(14, 165, 233, 0.25)',
      surface: '#F0F9FF',
      onSurface: '#0369A1',
    },

    // Mood tracking - Purple conveys emotion/mind
    mood: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      tertiary: '#C4B5FD',
      gradient: ['#7C3AED', '#8B5CF6', '#A78BFA'],
      glow: 'rgba(139, 92, 246, 0.25)',
      surface: '#F5F3FF',
      onSurface: '#5B21B6',
    },

    // Activity/Movement - Green conveys vitality/growth
    activity: {
      primary: '#10B981',
      secondary: '#34D399',
      tertiary: '#6EE7B7',
      gradient: ['#059669', '#10B981', '#34D399'],
      glow: 'rgba(16, 185, 129, 0.25)',
      surface: '#ECFDF5',
      onSurface: '#065F46',
    },

    // Insights/Intelligence - Indigo conveys wisdom
    insights: {
      primary: '#6366F1',
      secondary: '#818CF8',
      tertiary: '#A5B4FC',
      gradient: ['#4F46E5', '#6366F1', '#818CF8'],
      glow: 'rgba(99, 102, 241, 0.25)',
      surface: '#EEF2FF',
      onSurface: '#3730A3',
    },

    // Progress/Goals - Gold conveys achievement
    progress: {
      primary: '#F59E0B',
      secondary: '#FBBF24',
      tertiary: '#FCD34D',
      gradient: ['#D97706', '#F59E0B', '#FBBF24'],
      glow: 'rgba(245, 158, 11, 0.25)',
      surface: '#FFFBEB',
      onSurface: '#92400E',
    },
  },

  // -------------------------------------------------------------------------
  // SEMANTIC COLORS - System feedback
  // -------------------------------------------------------------------------
  semantic: {
    success: {
      primary: '#10B981',
      light: '#D1FAE5',
      dark: '#065F46',
      gradient: ['#059669', '#10B981'],
    },
    warning: {
      primary: '#F59E0B',
      light: '#FEF3C7',
      dark: '#92400E',
      gradient: ['#D97706', '#F59E0B'],
    },
    error: {
      primary: '#EF4444',
      light: '#FEE2E2',
      dark: '#991B1B',
      gradient: ['#DC2626', '#EF4444'],
    },
    info: {
      primary: '#3B82F6',
      light: '#DBEAFE',
      dark: '#1E40AF',
      gradient: ['#2563EB', '#3B82F6'],
    },
  },

  // -------------------------------------------------------------------------
  // NUTRI-SCORE - Official European grading (A-E)
  // -------------------------------------------------------------------------
  nutriScore: {
    A: { color: '#038141', bg: '#E8F5E9', label: 'Excellent' },
    B: { color: '#85BB2F', bg: '#F1F8E9', label: 'Good' },
    C: { color: '#FECB02', bg: '#FFFDE7', label: 'Moderate' },
    D: { color: '#EE8100', bg: '#FFF3E0', label: 'Limited' },
    E: { color: '#E63E11', bg: '#FFEBEE', label: 'Occasional' },
  },

  // -------------------------------------------------------------------------
  // CONFIDENCE INDICATORS - For uncertainty communication
  // -------------------------------------------------------------------------
  confidence: {
    high:     { color: '#10B981', bg: '#ECFDF5', factor: 0.05 },
    good:     { color: '#34D399', bg: '#D1FAE5', factor: 0.10 },
    moderate: { color: '#F59E0B', bg: '#FEF3C7', factor: 0.20 },
    low:      { color: '#94A3B8', bg: '#F1F5F9', factor: 0.30 },
    veryLow:  { color: '#EF4444', bg: '#FEE2E2', factor: 0.40 },
  },

  // -------------------------------------------------------------------------
  // SURFACES & BACKGROUNDS
  // -------------------------------------------------------------------------
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    elevated: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassDark: 'rgba(248, 250, 252, 0.95)',
  },

  // -------------------------------------------------------------------------
  // TEXT HIERARCHY
  // -------------------------------------------------------------------------
  text: {
    primary: '#0F172A',      // Slate-900 - Headlines, key metrics
    secondary: '#334155',    // Slate-700 - Body, descriptions
    tertiary: '#64748B',     // Slate-500 - Supporting text
    muted: '#94A3B8',        // Slate-400 - Disabled, placeholders
    inverse: '#FFFFFF',      // For dark backgrounds
    brand: '#4F46E5',        // Brand-colored text
  },

  // -------------------------------------------------------------------------
  // BORDERS & DIVIDERS
  // -------------------------------------------------------------------------
  border: {
    light: 'rgba(226, 232, 240, 0.8)',   // Subtle dividers
    medium: 'rgba(203, 213, 225, 0.8)',  // Card borders
    strong: 'rgba(148, 163, 184, 0.8)',  // Emphasized borders
    brand: 'rgba(99, 102, 241, 0.2)',    // Brand-tinted borders
  },
};

// ============================================================================
// TYPOGRAPHY - Clear hierarchy, readable at all sizes
// ============================================================================

export const TYPOGRAPHY = {
  // Font families - Inter for professional, highly legible typography
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Type scale (px) - 1.25 ratio (Major Third)
  size: {
    caption: 11,      // Tiny labels, timestamps
    footnote: 12,     // Supporting info, legal
    subhead: 13,      // Secondary labels
    body: 15,         // Main body text
    callout: 16,      // Emphasized body
    headline: 17,     // Card titles
    title3: 20,       // Section headers
    title2: 24,       // Page subtitles
    title1: 28,       // Page titles
    largeTitle: 34,   // Hero numbers
    display: 48,      // Primary metrics
    hero: 64,         // Single hero stat
  },

  // Line heights
  lineHeight: {
    tight: 1.1,       // Headlines
    snug: 1.25,       // Subheads
    normal: 1.5,      // Body
    relaxed: 1.75,    // Readable blocks
  },

  // Letter spacing
  tracking: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
};

// ============================================================================
// SPACING - 4px grid, golden ratio relationships
// ============================================================================

export const SPACING = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
};

// ============================================================================
// RADII - Consistent corner rounding
// ============================================================================

export const RADIUS = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
};

// ============================================================================
// SHADOWS - Layered depth system
// ============================================================================

export const SHADOWS = {
  // Elevation levels
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 16,
  },

  // Colored glows for feature cards
  glow: {
    nutrition: {
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    hydration: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    mood: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    activity: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    progress: {
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    brand: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

// ============================================================================
// ANIMATION SYSTEM - Purposeful, physics-based motion
// ============================================================================

export const ANIMATION = {
  // Durations (ms) - Based on distance/importance
  duration: {
    instant: 100,      // Micro-interactions (button press)
    fast: 150,         // Small state changes
    normal: 250,       // Standard transitions
    slow: 400,         // Emphasis animations
    slower: 600,       // Page transitions
  },

  // Spring configs for react-native-reanimated
  spring: {
    // Snappy - For buttons, toggles, quick feedback
    snappy: {
      damping: 20,
      stiffness: 400,
      mass: 0.8,
    },
    // Smooth - For cards, modals
    smooth: {
      damping: 25,
      stiffness: 200,
      mass: 1,
    },
    // Gentle - For page transitions
    gentle: {
      damping: 30,
      stiffness: 120,
      mass: 1.2,
    },
    // Bouncy - For celebrations, achievements
    bouncy: {
      damping: 12,
      stiffness: 300,
      mass: 0.6,
    },
  },

  // Timing configs for Animated API
  timing: {
    // Easing curves
    easeOut: {
      duration: 250,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    },
    easeIn: {
      duration: 200,
      easing: 'cubic-bezier(0.32, 0, 0.67, 0)',
    },
    easeInOut: {
      duration: 300,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
  },

  // Common animation presets
  presets: {
    // Fade in from bottom (cards appearing)
    fadeInUp: {
      from: { opacity: 0, transform: [{ translateY: 20 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    },
    // Scale pulse (attention)
    pulse: {
      from: { transform: [{ scale: 1 }] },
      to: { transform: [{ scale: 1.02 }] },
    },
    // Press feedback
    press: {
      from: { transform: [{ scale: 1 }] },
      to: { transform: [{ scale: 0.97 }] },
    },
  },
};

// ============================================================================
// CARD SYSTEM - Consistent container styles
// ============================================================================

export const CARDS = {
  // Hero card - Primary dashboard metric
  hero: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['3xl'],
    padding: SPACING[6],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.brand,
    ...SHADOWS.lg,
  },

  // Standard card - Most dashboard cards
  standard: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.md,
  },

  // Compact card - Small tiles, stats
  compact: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.sm,
  },

  // Glass card - Overlays, modals
  glass: {
    backgroundColor: PREMIUM_COLORS.surface.glass,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.lg,
  },

  // Interactive card - Pressable items
  interactive: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.sm,
    // Active/pressed state
    pressed: {
      backgroundColor: PREMIUM_COLORS.surface.secondary,
      transform: [{ scale: 0.98 }],
    },
  },
};

// ============================================================================
// OUTCOME TRACKING COLORS - For recommendation effectiveness visualization
// ============================================================================

export const OUTCOME_COLORS = {
  // Outcome states
  effective: {
    color: '#10B981',
    bg: '#ECFDF5',
    gradient: ['#059669', '#10B981', '#34D399'],
    label: 'Worked',
    icon: 'checkmark-circle',
  },
  partiallyEffective: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    gradient: ['#D97706', '#F59E0B', '#FBBF24'],
    label: 'Partial',
    icon: 'ellipse',
  },
  notEffective: {
    color: '#EF4444',
    bg: '#FEF2F2',
    gradient: ['#DC2626', '#EF4444', '#F87171'],
    label: 'Didn\'t Work',
    icon: 'close-circle',
  },
  pending: {
    color: '#64748B',
    bg: '#F1F5F9',
    gradient: ['#475569', '#64748B', '#94A3B8'],
    label: 'Pending',
    icon: 'time',
  },
  skipped: {
    color: '#94A3B8',
    bg: '#F8FAFC',
    gradient: ['#94A3B8', '#CBD5E1'],
    label: 'Skipped',
    icon: 'remove-circle',
  },
};

// ============================================================================
// CHART COLORS - For data visualization
// ============================================================================

export const CHART_COLORS = {
  // Sequential palette (single hue progression)
  sequential: {
    indigo: ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5'],
    emerald: ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669'],
    amber: ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706'],
    rose: ['#FFE4E6', '#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48'],
  },

  // Categorical palette (distinct colors)
  categorical: [
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Violet
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#06B6D4', // Cyan
  ],

  // Diverging palette (positive/negative)
  diverging: {
    positive: ['#D1FAE5', '#6EE7B7', '#10B981'],
    neutral: '#F1F5F9',
    negative: ['#FEE2E2', '#FCA5A5', '#EF4444'],
  },
};

// ============================================================================
// ICON SYSTEM - Consistent sizing
// ============================================================================

export const ICONS = {
  sizes: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
    '2xl': 40,
    '3xl': 56,
  },
  // Stroke width for outline icons
  strokeWidth: {
    light: 1.5,
    regular: 2,
    bold: 2.5,
  },
};

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const Z_INDEX = {
  base: 0,
  card: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get functional color set by type
 */
export function getFunctionalColors(type) {
  return PREMIUM_COLORS.functional[type] || PREMIUM_COLORS.functional.insights;
}

/**
 * Get confidence level based on factor
 */
export function getConfidenceLevel(factor) {
  if (factor <= 0.05) return 'high';
  if (factor <= 0.10) return 'good';
  if (factor <= 0.20) return 'moderate';
  if (factor <= 0.30) return 'low';
  return 'veryLow';
}

/**
 * Get Nutri-Score based on score value
 */
export function getNutriScore(score) {
  if (score <= 0) return 'A';
  if (score <= 2) return 'B';
  if (score <= 10) return 'C';
  if (score <= 18) return 'D';
  return 'E';
}

/**
 * Create text style with proper hierarchy
 */
export function textStyle(variant = 'body', weight = 'regular', color = 'primary') {
  return {
    fontSize: TYPOGRAPHY.size[variant] || TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight[weight] || TYPOGRAPHY.weight.regular,
    fontFamily: TYPOGRAPHY.family[weight] || TYPOGRAPHY.family.regular,
    color: PREMIUM_COLORS.text[color] || PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * (TYPOGRAPHY.size[variant] || TYPOGRAPHY.size.body),
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const PREMIUM_DESIGN_SYSTEM = {
  colors: PREMIUM_COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  animation: ANIMATION,
  cards: CARDS,
  outcome: OUTCOME_COLORS,
  chart: CHART_COLORS,
  icons: ICONS,
  zIndex: Z_INDEX,
  // Helpers
  getFunctionalColors,
  getConfidenceLevel,
  getNutriScore,
  textStyle,
};

export default PREMIUM_DESIGN_SYSTEM;
