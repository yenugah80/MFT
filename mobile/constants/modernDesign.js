/**
 * Modern Design System for MyFoodTracker
 * Clean, health-focused, 2025 aesthetic
 * Replaces luxury theme with professional health app design
 */

// ============================================================================
// COLORS - Health & Wellness Focused
// ============================================================================

export const MODERN_COLORS = {
  // Backgrounds - Clean and fresh
  background: {
    primary: '#F8FAFC',      // Very light blue-gray (Slate 50)
    secondary: '#FFFFFF',    // Pure white for cards
    tertiary: '#F1F5F9',     // Light gray (Slate 100)
  },

  // Text - Clear hierarchy
  text: {
    primary: '#0F172A',      // Slate 900 - Main text
    secondary: '#475569',    // Slate 600 - Secondary text
    tertiary: '#94A3B8',     // Slate 400 - Muted text
    quaternary: '#CBD5E1',   // Slate 300 - Very muted
  },

  // Accent Colors - Health focused
  accent: {
    primary: '#3B82F6',      // Blue 500 - Trust, reliability
    secondary: '#10B981',    // Emerald 500 - Health, vitality
    tertiary: '#8B5CF6',     // Violet 500 - Premium feel (subtle)
  },

  // Semantic Colors - Clear meaning
  semantic: {
    success: '#10B981',      // Emerald 500 - Achievements, goals met
    warning: '#F59E0B',      // Amber 500 - Attention needed
    error: '#EF4444',        // Red 500 - Problems, errors
    info: '#3B82F6',         // Blue 500 - Information, tips
  },

  // Status Colors - For metrics
  status: {
    excellent: '#10B981',    // Green - Over goal, excellent
    good: '#3B82F6',         // Blue - On track
    warning: '#F59E0B',      // Amber - Below target
    critical: '#EF4444',     // Red - Way off track
  },

  // Borders & Dividers - Subtle separation
  border: {
    light: 'rgba(0, 0, 0, 0.06)',   // Very subtle
    medium: 'rgba(0, 0, 0, 0.1)',   // Standard borders
    dark: 'rgba(0, 0, 0, 0.2)',     // Emphasized borders
  },

  // Overlays - For modals, alerts
  overlay: {
    light: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

// ============================================================================
// TYPOGRAPHY - Clear, readable hierarchy
// ============================================================================

export const MODERN_TYPOGRAPHY = {
  // Display text (hero numbers, big stats)
  hero: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
    letterSpacing: -2,
  },

  // Large display (section numbers)
  display: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -1,
  },

  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.25,
  },

  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },

  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },

  bodyStrong: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Small text
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  captionStrong: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Very small text
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  smallStrong: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Labels & badges
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

// ============================================================================
// SPACING - Consistent 8pt grid system
// ============================================================================

export const MODERN_SPACING = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
};

// ============================================================================
// SHADOWS - Subtle elevation
// ============================================================================

export const MODERN_SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

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
    shadowRadius: 8,
    elevation: 2,
  },

  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
};

// ============================================================================
// RADIUS - Rounded corners
// ============================================================================

export const MODERN_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// ============================================================================
// COMPONENTS - Pre-configured styles
// ============================================================================

export const MODERN_COMPONENTS = {
  // Card styles
  card: {
    default: {
      backgroundColor: MODERN_COLORS.background.secondary,
      borderRadius: MODERN_RADIUS.xl,
      borderWidth: 1,
      borderColor: MODERN_COLORS.border.light,
      ...MODERN_SHADOWS.md,
    },
    elevated: {
      backgroundColor: MODERN_COLORS.background.secondary,
      borderRadius: MODERN_RADIUS.xl,
      borderWidth: 0,
      ...MODERN_SHADOWS.lg,
    },
    flat: {
      backgroundColor: MODERN_COLORS.background.secondary,
      borderRadius: MODERN_RADIUS.xl,
      borderWidth: 1,
      borderColor: MODERN_COLORS.border.light,
    },
  },

  // Button styles
  button: {
    primary: {
      backgroundColor: MODERN_COLORS.accent.primary,
      borderRadius: MODERN_RADIUS.lg,
      paddingVertical: MODERN_SPACING.md,
      paddingHorizontal: MODERN_SPACING.lg,
      ...MODERN_SHADOWS.sm,
    },
    secondary: {
      backgroundColor: MODERN_COLORS.background.tertiary,
      borderRadius: MODERN_RADIUS.lg,
      paddingVertical: MODERN_SPACING.md,
      paddingHorizontal: MODERN_SPACING.lg,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: MODERN_RADIUS.lg,
      paddingVertical: MODERN_SPACING.md,
      paddingHorizontal: MODERN_SPACING.lg,
      borderWidth: 1,
      borderColor: MODERN_COLORS.border.medium,
    },
  },

  // Input styles
  input: {
    default: {
      backgroundColor: MODERN_COLORS.background.secondary,
      borderRadius: MODERN_RADIUS.md,
      borderWidth: 1,
      borderColor: MODERN_COLORS.border.medium,
      paddingVertical: MODERN_SPACING.sm,
      paddingHorizontal: MODERN_SPACING.md,
      ...MODERN_TYPOGRAPHY.body,
    },
    focused: {
      borderColor: MODERN_COLORS.accent.primary,
      borderWidth: 2,
    },
    error: {
      borderColor: MODERN_COLORS.semantic.error,
      borderWidth: 2,
    },
  },

  // Badge styles
  badge: {
    success: {
      backgroundColor: `${MODERN_COLORS.semantic.success}15`,
      paddingVertical: MODERN_SPACING.xxs,
      paddingHorizontal: MODERN_SPACING.sm,
      borderRadius: MODERN_RADIUS.full,
    },
    warning: {
      backgroundColor: `${MODERN_COLORS.semantic.warning}15`,
      paddingVertical: MODERN_SPACING.xxs,
      paddingHorizontal: MODERN_SPACING.sm,
      borderRadius: MODERN_RADIUS.full,
    },
    error: {
      backgroundColor: `${MODERN_COLORS.semantic.error}15`,
      paddingVertical: MODERN_SPACING.xxs,
      paddingHorizontal: MODERN_SPACING.sm,
      borderRadius: MODERN_RADIUS.full,
    },
    info: {
      backgroundColor: `${MODERN_COLORS.semantic.info}15`,
      paddingVertical: MODERN_SPACING.xxs,
      paddingHorizontal: MODERN_SPACING.sm,
      borderRadius: MODERN_RADIUS.full,
    },
  },
};

// ============================================================================
// GRADIENTS - Subtle, health-focused
// ============================================================================

export const MODERN_GRADIENTS = {
  // Primary accent gradient
  primary: ['#3B82F6', '#2563EB'],      // Blue 500 → Blue 600

  // Success/health gradient
  success: ['#10B981', '#059669'],      // Emerald 500 → Emerald 600

  // Background gradients (very subtle)
  backgroundLight: ['#F8FAFC', '#F1F5F9'],  // Slate 50 → Slate 100

  // Premium subtle gradient
  premium: ['#8B5CF6', '#7C3AED'],      // Violet 500 → Violet 600
};

// ============================================================================
// ANIMATIONS - Smooth, professional
// ============================================================================

export const MODERN_ANIMATIONS = {
  // Duration
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Easing
  easing: {
    standard: 'ease-in-out',
    accelerate: 'ease-in',
    decelerate: 'ease-out',
  },

  // Spring configs (for react-native-reanimated)
  spring: {
    gentle: {
      damping: 20,
      stiffness: 100,
    },
    bouncy: {
      damping: 15,
      stiffness: 150,
    },
    stiff: {
      damping: 25,
      stiffness: 200,
    },
  },
};

// ============================================================================
// BREAKPOINTS - Responsive design
// ============================================================================

export const MODERN_BREAKPOINTS = {
  sm: 375,   // Small phones
  md: 768,   // Tablets
  lg: 1024,  // Large tablets / small desktop
  xl: 1280,  // Desktop
};

// ============================================================================
// Z-INDEX - Layering
// ============================================================================

export const MODERN_Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export const MODERN_DESIGN = {
  COLORS: MODERN_COLORS,
  TYPOGRAPHY: MODERN_TYPOGRAPHY,
  SPACING: MODERN_SPACING,
  SHADOWS: MODERN_SHADOWS,
  RADIUS: MODERN_RADIUS,
  COMPONENTS: MODERN_COMPONENTS,
  GRADIENTS: MODERN_GRADIENTS,
  ANIMATIONS: MODERN_ANIMATIONS,
  BREAKPOINTS: MODERN_BREAKPOINTS,
  Z_INDEX: MODERN_Z_INDEX,
};

export default MODERN_DESIGN;
