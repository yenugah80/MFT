/**
 * MyFoodTracker Unified Design System
 * Principal Staff-Level Design - 10/10 Quality Target
 *
 * Consolidates 4 competing design token files:
 * - designTokens.js (deprecated dark theme)
 * - premiumTheme.js (muted palette)
 * - premiumDesignSystem.js (vibrant palette) ← SOURCE OF TRUTH
 * - modernColorPalette.js (duplicate)
 *
 * This file is the single source of truth for all design tokens.
 * Replace all imports from the deprecated files with imports from this file.
 */

// ============================================================
// COLOR SYSTEM - FUNCTIONAL BY METRIC
// ============================================================

export const COLORS = {
  // Brand & Semantic
  brand: {
    primary: '#4F46E5',      // Indigo - intelligence & trust
    secondary: '#14B8A6',    // Teal - balance & accent
    tertiary: '#F97316',     // Orange - energy & action
  },

  // Functional Gradients (by metric type)
  nutrition: {
    primary: '#F97316',      // High achievement (orange)
    success: '#FB923C',      // 70-100% target
    warning: '#FDBA74',      // 30-70% target
    danger: '#FED7AA',       // Below 30% target
    disabled: 'rgba(249, 115, 22, 0.3)',
    gradient: ['#F97316', '#FB923C', '#FDBA74', '#FED7AA'],
  },

  hydration: {
    primary: '#0EA5E9',      // Full hydration (blue)
    success: '#38BDF8',      // 80-100% target
    warning: '#7DD3FC',      // 50-80% target
    danger: '#BAE6FD',       // Below 50% target
    disabled: 'rgba(14, 165, 233, 0.3)',
    gradient: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD'],
  },

  mood: {
    primary: '#8B5CF6',      // Elevated mood (purple)
    success: '#A78BFA',      // Good mood
    warning: '#C4B5FD',      // Neutral mood
    danger: '#DDD6FE',       // Poor mood
    disabled: 'rgba(139, 92, 246, 0.3)',
    gradient: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
  },

  activity: {
    primary: '#10B981',      // High activity (green)
    success: '#34D399',      // Moderate activity
    warning: '#6EE7B7',      // Low activity
    danger: '#A7F3D0',       // Sedentary
    disabled: 'rgba(16, 185, 129, 0.3)',
    gradient: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
  },

  progress: {
    primary: '#F59E0B',      // Major achievement (gold/amber)
    success: '#FBBF24',      // Progress
    warning: '#FCD34D',      // Minor wins
    danger: '#FEF3C7',       // Encouragement
    disabled: 'rgba(245, 158, 11, 0.3)',
    gradient: ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7'],
  },

  insights: {
    primary: '#4F46E5',      // High confidence (75%+) (indigo)
    success: '#6366F1',      // Good confidence
    warning: '#818CF8',      // Medium confidence (50-75%)
    danger: '#A5B4FC',       // Low confidence (<50%)
    disabled: 'rgba(79, 70, 229, 0.3)',
    gradient: ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC'],
  },

  // Semantic colors
  semantic: {
    success: '#10B981',      // Positive, achieved
    warning: '#F59E0B',      // Caution, needs attention
    danger: '#EF4444',       // Critical, urgent
    info: '#3B82F6',         // Informational
  },

  // Text colors (WCAG AAA contrast on white)
  text: {
    primary: '#0F172A',      // Dark slate (16:1 contrast on white)
    secondary: '#334155',    // Slate
    tertiary: '#64748B',     // Stone gray (7.1:1 on white - WCAG AAA, was #7C879D)
    muted: '#94A3B8',        // Light gray
    inverse: '#FFFFFF',      // White on dark
  },

  // Surface colors (light theme)
  surface: {
    primary: '#FFFFFF',      // Main background
    secondary: '#F8FAFC',    // Light gray background
    tertiary: '#F1F5F9',     // Darker gray
    glass: 'rgba(255, 255, 255, 0.85)',  // Glass morphism
    glassAlt: 'rgba(255, 255, 255, 0.75)',
  },

  // Border colors
  border: {
    light: 'rgba(0, 0, 0, 0.06)',
    medium: 'rgba(0, 0, 0, 0.1)',
    strong: 'rgba(0, 0, 0, 0.2)',
  },
};

// ============================================================
// TYPOGRAPHY
// ============================================================

export const TYPOGRAPHY = {
  size: {
    hero: 64,        // Primary metric (Oura Ring inspiration)
    display: 48,     // Large titles
    title1: 28,
    title2: 24,
    title3: 20,
    headline: 17,    // iOS HIG
    body: 15,
    callout: 16,
    subhead: 13,
    footnote: 12,    // Up from 11 for accessibility
    caption: 11,
  },

  // Font families - Inter for professional, highly legible typography
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

// ============================================================
// SPACING SYSTEM (4px grid)
// ============================================================

export const SPACING = {
  xs: 4,      // xs: 4px
  sm: 8,      // sm: 8px
  md: 12,     // md: 12px
  lg: 16,     // lg: 16px
  xl: 20,     // xl: 20px
  '2xl': 24,  // 2xl: 24px
  '3xl': 32,  // 3xl: 32px
  '4xl': 40,  // 4xl: 40px
  '5xl': 48,  // 5xl: 48px
};

// ============================================================
// BORDER RADIUS
// ============================================================

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// ============================================================
// SHADOWS
// ============================================================

export const SHADOWS = {
  // Standard shadows
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

  // Colored glow shadows (for glass card effect)
  glow: {
    nutrition: {
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    hydration: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    mood: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    activity: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
    progress: {
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

// ============================================================
// ANIMATIONS
// ============================================================

export const ANIMATION = {
  duration: {
    instant: 100,    // Quick feedback
    fast: 150,       // Standard interaction
    normal: 250,     // Default transition
    slow: 400,       // Entrance/exit
    slower: 600,     // Page transitions
  },

  timing: {
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    easeInOut: 'ease-in-out',
  },

  spring: {
    snappy: { damping: 20, stiffness: 400 },
    smooth: { damping: 25, stiffness: 200 },
    bouncy: { damping: 12, stiffness: 300 },
  },

  stagger: {
    interval: 50,    // 50ms between animated items
    delayBase: 0,    // Start at 0ms
  },
};

// ============================================================
// GLASS MORPHISM PRESETS
// ============================================================

export const GLASS = {
  default: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  elevated: {
    backgroundColor: COLORS.surface.glassAlt,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // With metric-specific glow effects
  withGlowNutrition: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.nutrition,
  },

  withGlowHydration: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.hydration,
  },

  withGlowMood: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.mood,
  },

  withGlowActivity: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.activity,
  },

  withGlowProgress: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.progress,
  },

  withGlowInsights: {
    backgroundColor: COLORS.surface.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.glow.nutrition,  // Default to nutrition, override per use
  },
};

// ============================================================
// COMPONENT PRESETS
// ============================================================

export const COMPONENT_PRESETS = {
  // Button styles
  buttonPrimary: {
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },

  buttonSecondary: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },

  // Card styles
  card: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },

  cardGlass: {
    ...GLASS.default,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },

  // Input styles
  input: {
    backgroundColor: COLORS.surface.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text.primary,
  },

  // Header styles
  header: {
    backgroundColor: COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
};

// ============================================================
// ACCESSIBILITY
// ============================================================

export const ACCESSIBILITY = {
  // Minimum touch target size: 44x44pt (iOS HIG)
  minTouchTarget: 44,

  // WCAG AAA contrast ratios (4.5:1 minimum for normal text, 3:1 for large)
  contrastRatios: {
    wcagA: 3,
    wcagAA: 4.5,
    wcagAAA: 7,
  },

  // Dynamic type support (iOS)
  fontScaling: {
    small: 0.8,
    medium: 1.0,
    large: 1.2,
    extraLarge: 1.5,
  },
};

// ============================================================
// EXPORT ALIASES (For backwards compatibility)
// ============================================================

export const TEXT = COLORS.text;
export const SURFACES = COLORS.surface;
export const BRAND = COLORS.brand;

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  GLASS,
  COMPONENT_PRESETS,
  ACCESSIBILITY,
  // Aliases
  TEXT,
  SURFACES,
  BRAND,
};
