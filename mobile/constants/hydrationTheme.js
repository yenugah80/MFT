/**
 * Hydration Premium Theme - Calm Luxury Design System
 *
 * Design Philosophy:
 * "Design this like a $500 wellness object, not a free app."
 * "The Oura Ring of hydration - calm, intelligent, identity-shaping."
 *
 * Core Principles:
 * - Zero Cognitive Load: Primary action clear in <2 seconds
 * - Calm by Default: No flashing, bouncing, or celebratory animations
 * - Glanceable Intelligence: Text-based insights > charts
 * - Trust Over Delight: No gamification manipulation
 * - Effortless Interaction: <=1 tap for frequent actions
 */

// ============================================================================
// BASE COLORS (95% of UI)
// Warm, sophisticated neutrals - never pure white or pure black
// ============================================================================

export const HYDRATION_BASE = {
  // Backgrounds
  background: '#FAFAF9', // Warm white with subtle warmth
  surface: '#F4F4F3', // Soft cream
  surfaceElevated: '#FFFFFF', // Cards
  surfaceSubtle: '#EFEEED', // Secondary cards

  // Text hierarchy
  text: {
    primary: '#18181B', // Rich charcoal (not pure black)
    secondary: '#52525B', // Zinc 600 - sophisticated gray
    tertiary: '#A1A1AA', // Zinc 400 - muted
    inverse: '#FAFAFA', // For dark backgrounds
  },

  // Dividers and borders
  divider: '#E4E4E7', // Zinc 200
  border: '#D4D4D8', // Zinc 300
};

// ============================================================================
// ACCENT COLORS (5% of UI maximum)
// Sophisticated teal-blue gradient spectrum
// Used ONLY on: progress ring, primary CTA, insight highlights
// ============================================================================

export const HYDRATION_ACCENT = {
  primary: '#0891B2', // Cyan 600 - modern, fresh
  primaryLight: '#22D3EE', // Cyan 400 - for gradients
  primaryDark: '#0E7490', // Cyan 700 - for depth

  // Premium gradient for progress ring & CTAs
  gradient: ['#0891B2', '#06B6D4', '#22D3EE'],

  // Glow effect for 100% progress
  glow: 'rgba(8, 145, 178, 0.15)',
  glowStrong: 'rgba(8, 145, 178, 0.25)',
};

// ============================================================================
// SEMANTIC COLORS
// Sophisticated, not alarming - no aggressive reds
// ============================================================================

export const HYDRATION_SEMANTIC = {
  success: {
    base: '#059669', // Emerald 600 - confident green
    light: '#10B981', // Emerald 500
    bg: 'rgba(5, 150, 105, 0.08)',
  },
  warning: {
    base: '#D97706', // Amber 600 - warm, not harsh
    light: '#F59E0B', // Amber 500
    bg: 'rgba(217, 119, 6, 0.08)',
  },
  // No danger/error - we don't shame users
};

// ============================================================================
// PREDICTION COLORS
// Violet spectrum for AI/intelligence features
// ============================================================================

export const HYDRATION_PREDICTION = {
  primary: '#7C3AED', // Violet 600 - AI/intelligence
  light: '#A78BFA', // Violet 400
  bg: 'rgba(124, 58, 237, 0.08)',
  gradient: ['#7C3AED', '#8B5CF6', '#A78BFA'],
};

// ============================================================================
// VISUAL EFFECTS
// Subtle shadows - never heavy
// ============================================================================

export const HYDRATION_EFFECTS = {
  shadow: {
    sm: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 15,
      elevation: 5,
    },
    // Accent glow for progress ring
    ring: {
      shadowColor: HYDRATION_ACCENT.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 0,
    },
    ringSuccess: {
      shadowColor: HYDRATION_SEMANTIC.success.base,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 0,
    },
  },

  // Border radius - modern, not bubbly
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24, // Cards
    full: 9999,
  },
};

// ============================================================================
// TYPOGRAPHY
// Luxury = Fewer Words, Fewer Fonts
// Max 3 font sizes per screen
// ============================================================================

export const HYDRATION_TYPOGRAPHY = {
  // One primary typeface (System/SF Pro)
  family: 'System',

  // Size scale - only use 3 per screen
  size: {
    headline: 28, // Screen title only
    title: 22, // Section titles
    body: 17, // Primary content
    bodySmall: 15, // Secondary content
    caption: 13, // Tertiary info
    micro: 11, // Smallest readable
  },

  // Weights - no bold except hierarchy
  weight: {
    regular: '400',
    medium: '500', // Sparingly
    semibold: '600', // Headlines only
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// ============================================================================
// SPACING
// 8-pt grid system - generous vertical rhythm
// Content breathes; nothing feels cramped
// ============================================================================

export const HYDRATION_SPACING = {
  grid: 8,

  // Named spacing
  xs: 4, // Tight gaps
  sm: 8, // Minimal gaps
  md: 16, // Between elements
  lg: 24, // Inside cards
  xl: 32, // Between sections
  xxl: 48, // Major sections
};

// ============================================================================
// MOTION
// Calm, Not Playful
// Motion reinforces cause -> effect only
// ============================================================================

export const HYDRATION_MOTION = {
  duration: {
    instant: 100, // Immediate feedback
    quick: 150, // Button feedback
    standard: 200, // Transitions
    ring: 600, // Progress ring updates (slow, deliberate)
  },

  // ONLY ease-out curves - no spring physics, no bounce
  easing: {
    default: 'ease-out',
    // React Native Animated compatible
    bezier: [0, 0, 0.2, 1], // ease-out
  },
};

// ============================================================================
// INTERACTION BUDGETS (Non-Negotiable)
// These are hard constraints, not suggestions
// ============================================================================

export const HYDRATION_BUDGETS = {
  maxTapsToLogWater: 1,
  maxTapsToLogBeverage: 2,
  maxSecondsToAction: 2,
  maxDecisionsPerScreen: 1,
  maxAnimationDurationMs: 250,
};

// ============================================================================
// PROGRESS RING SPECIFICATIONS
// The hero element - grounded and confident
// ============================================================================

export const HYDRATION_PROGRESS_RING = {
  // Dashboard card size
  dashboard: {
    size: 140,
    strokeWidth: 10,
  },
  // Full tracker size
  full: {
    size: 180,
    strokeWidth: 12,
  },
  // Track color (unfilled)
  trackColor: '#E4E4E7',
  // Animation duration for value changes
  animationDuration: 600,
};

// ============================================================================
// CARD STYLES
// Soft surfaces - objects resting calmly on a surface
// ============================================================================

export const HYDRATION_CARD = {
  primary: {
    backgroundColor: HYDRATION_BASE.surfaceElevated,
    borderRadius: HYDRATION_EFFECTS.radius.xl,
    padding: HYDRATION_SPACING.lg,
    ...HYDRATION_EFFECTS.shadow.lg,
  },
  secondary: {
    backgroundColor: HYDRATION_BASE.surface,
    borderRadius: HYDRATION_EFFECTS.radius.lg,
    padding: HYDRATION_SPACING.md,
    ...HYDRATION_EFFECTS.shadow.sm,
  },
  prediction: {
    backgroundColor: '#F8FAFC', // Slate 50 - slightly cool tint
    borderRadius: HYDRATION_EFFECTS.radius.lg,
    padding: HYDRATION_SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: HYDRATION_PREDICTION.primary,
  },
};

// ============================================================================
// BUTTON STYLES
// Primary CTA - gradient accent
// Secondary - text only
// ============================================================================

export const HYDRATION_BUTTON = {
  primary: {
    height: 52,
    borderRadius: HYDRATION_EFFECTS.radius.md,
    gradient: HYDRATION_ACCENT.gradient,
    textColor: HYDRATION_BASE.text.inverse,
    textSize: HYDRATION_TYPOGRAPHY.size.body,
    textWeight: HYDRATION_TYPOGRAPHY.weight.semibold,
    shadow: {
      shadowColor: HYDRATION_ACCENT.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
  },
  secondary: {
    textColor: HYDRATION_BASE.text.secondary,
    textSize: HYDRATION_TYPOGRAPHY.size.bodySmall,
    textWeight: HYDRATION_TYPOGRAPHY.weight.medium,
  },
  quickAdd: {
    height: 56,
    borderRadius: HYDRATION_EFFECTS.radius.md,
    backgroundColor: HYDRATION_BASE.surface,
    textColor: HYDRATION_BASE.text.primary,
    textSize: HYDRATION_TYPOGRAPHY.size.body,
    textWeight: HYDRATION_TYPOGRAPHY.weight.medium,
  },
};

// ============================================================================
// BEVERAGE PICKER
// Bottom sheet with beverage tiles and amount chips
// ============================================================================

export const HYDRATION_BEVERAGE_PICKER = {
  tile: {
    size: 76,
    borderRadius: HYDRATION_EFFECTS.radius.lg,
    backgroundDefault: HYDRATION_BASE.surface,
    backgroundSelected: `${HYDRATION_ACCENT.primary}15`, // 10% opacity
    borderSelected: HYDRATION_ACCENT.primary,
    borderWidth: 2,
    textSize: HYDRATION_TYPOGRAPHY.size.caption,
  },
  chip: {
    height: 40,
    minWidth: 56,
    borderRadius: HYDRATION_EFFECTS.radius.sm,
    backgroundDefault: HYDRATION_BASE.surface,
    backgroundSelected: HYDRATION_ACCENT.primary,
    textColorDefault: HYDRATION_BASE.text.secondary,
    textColorSelected: HYDRATION_BASE.text.inverse,
  },
  bottomSheet: {
    borderRadius: HYDRATION_EFFECTS.radius.xl,
    handleWidth: 36,
    handleHeight: 4,
    handleColor: HYDRATION_BASE.border,
    backdropOpacity: 0.4,
    backdropBlur: 8,
  },
};

// ============================================================================
// LOG ENTRY STYLES
// Swipeable history entries
// ============================================================================

export const HYDRATION_LOG_ENTRY = {
  backgroundColor: HYDRATION_BASE.surfaceElevated,
  borderRadius: HYDRATION_EFFECTS.radius.md,
  padding: HYDRATION_SPACING.md,
  ...HYDRATION_EFFECTS.shadow.sm,
  timeTextColor: HYDRATION_BASE.text.tertiary,
  timeTextSize: HYDRATION_TYPOGRAPHY.size.caption,
  beverageTextColor: HYDRATION_BASE.text.primary,
  beverageTextSize: HYDRATION_TYPOGRAPHY.size.body,
  effectiveTextColor: HYDRATION_BASE.text.tertiary,
  effectiveTextSize: HYDRATION_TYPOGRAPHY.size.caption,
};

// ============================================================================
// HAPTIC FEEDBACK
// Tactile responses - never excessive
// ============================================================================

export const HYDRATION_HAPTICS = {
  log: 'medium', // When water is logged
  quickAdd: 'light', // Quick add button press
  milestone: 'success', // Goal reached (Expo Haptics notificationAsync)
  error: 'warning', // Error state
};

// ============================================================================
// COLD START UX
// Progressive disclosure stages
// ============================================================================

export const HYDRATION_COLD_START = {
  stages: {
    DAY_0: 'day0', // First open
    DAYS_1_3: 'days1-3', // Building baseline
    DAYS_4_7: 'days4-7', // Pattern emergence
    ESTABLISHED: 'established', // Day 7+
    POWER_USER: 'power_user', // Day 30+
  },
  minimumDaysForPersona: 7,
  minimumDaysForPredictions: 7,
  minimumDaysForCorrelations: 30,
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export const HYDRATION_THEME = {
  base: HYDRATION_BASE,
  accent: HYDRATION_ACCENT,
  semantic: HYDRATION_SEMANTIC,
  prediction: HYDRATION_PREDICTION,
  effects: HYDRATION_EFFECTS,
  typography: HYDRATION_TYPOGRAPHY,
  spacing: HYDRATION_SPACING,
  motion: HYDRATION_MOTION,
  budgets: HYDRATION_BUDGETS,
  progressRing: HYDRATION_PROGRESS_RING,
  card: HYDRATION_CARD,
  button: HYDRATION_BUTTON,
  beveragePicker: HYDRATION_BEVERAGE_PICKER,
  logEntry: HYDRATION_LOG_ENTRY,
  haptics: HYDRATION_HAPTICS,
  coldStart: HYDRATION_COLD_START,
};

export default HYDRATION_THEME;
