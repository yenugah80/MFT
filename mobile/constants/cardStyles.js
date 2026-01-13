/**
 * Premium Card Styles & Color System
 *
 * Stunning card designs with beautiful gradients, shadows, and color palettes
 * Following 2025 design trends: glassmorphism, neumorphism, vibrant gradients
 */

/**
 * Premium Gradient Presets
 * Beautiful multi-color gradients for different card types
 */
export const GRADIENTS = {
  // Primary card gradient (purple-blue)
  primary: {
    colors: ['#6366F1', '#8B5CF6', '#A855F7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Success gradient (green-teal)
  success: {
    colors: ['#10B981', '#06B6D4', '#14B8A6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Warning gradient (amber-orange)
  warning: {
    colors: ['#F59E0B', '#F97316', '#EF4444'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Info gradient (blue-cyan)
  info: {
    colors: ['#3B82F6', '#06B6D4', '#0EA5E9'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Accent gradient (pink-purple)
  accent: {
    colors: ['#EC4899', '#A855F7', '#8B5CF6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Subtle gradient (light background)
  subtle: {
    colors: ['#FAFAFA', '#F5F5F5', '#FFFFFF'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // Glass effect (semi-transparent)
  glass: {
    colors: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
};

/**
 * Premium Shadow Presets
 * Elevation-based shadows for depth and hierarchy
 */
export const CARD_SHADOWS = {
  // Subtle elevation
  small: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Medium elevation (default for cards)
  medium: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },

  // High elevation (modals, floating elements)
  large: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },

  // Colored shadows for specific card types
  primary: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },

  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },

  warning: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
};

/**
 * Card Style Presets
 * Ready-to-use card styles with beautiful design
 */
export const CARD_STYLES = {
  // Default card
  default: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },

  // Elevated card (higher shadow)
  elevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    ...CARD_SHADOWS.large,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },

  // Gradient card
  gradient: {
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.primary,
  },

  // Glass card (semi-transparent with blur)
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.small,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Neumorphic card (soft, subtle 3D)
  neumorphic: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  // Interactive card (for touchable elements)
  interactive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.medium,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },

  // Success card
  success: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.success,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },

  // Warning card
  warning: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.warning,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },

  // Info card
  info: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOWS.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
};

/**
 * Typography Styles for Cards
 */
export const CARD_TYPOGRAPHY = {
  // Card title
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },

  // Card subtitle
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0,
  },

  // Card body text
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: '#374151',
    lineHeight: 20,
  },

  // Card caption/helper text
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    lineHeight: 16,
  },

  // Card stat value
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },

  // Card stat label
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

/**
 * Spacing System
 */
export const CARD_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Border Radius System
 */
export const CARD_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

/**
 * Icon Container Styles
 */
export const ICON_CONTAINERS = {
  // Primary icon container
  primary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Success icon container
  success: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Warning icon container
  warning: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Large icon container
  large: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

/**
 * Badge Styles
 */
export const BADGE_STYLES = {
  // Default badge
  default: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },

  // Primary badge
  primary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },

  // Success badge
  success: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },

  // Warning badge
  warning: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
};

export default {
  GRADIENTS,
  CARD_SHADOWS,
  CARD_STYLES,
  CARD_TYPOGRAPHY,
  CARD_SPACING,
  CARD_RADIUS,
  ICON_CONTAINERS,
  BADGE_STYLES,
};
