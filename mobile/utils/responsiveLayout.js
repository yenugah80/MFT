/**
 * Responsive Layout Utilities
 *
 * Handles proper sizing for various device sizes:
 * - iPhone SE (320pt width) - Small
 * - iPhone 12 mini (360pt) - Compact
 * - iPhone 14 (390pt) - Standard
 * - iPhone 14 Plus (428pt) - Large
 * - iPhone 14 Pro Max (430pt) - Extra Large
 *
 * Design Philosophy:
 * - Use device-independent scaling
 * - Maintain readability on small devices
 * - Prevent overflow and clipping
 * - Consistent visual hierarchy across sizes
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

// ============================================================================
// DEVICE BREAKPOINTS
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BREAKPOINTS = {
  SMALL: 320,    // iPhone SE
  COMPACT: 360,  // iPhone mini
  STANDARD: 390, // iPhone 14/15
  LARGE: 414,    // iPhone Plus models
  XLARGE: 428,   // iPhone Pro Max
};

/**
 * Get current device size category
 */
export function getDeviceSize() {
  if (SCREEN_WIDTH < BREAKPOINTS.COMPACT) return 'SMALL';
  if (SCREEN_WIDTH < BREAKPOINTS.STANDARD) return 'COMPACT';
  if (SCREEN_WIDTH < BREAKPOINTS.LARGE) return 'STANDARD';
  if (SCREEN_WIDTH < BREAKPOINTS.XLARGE) return 'LARGE';
  return 'XLARGE';
}

export const DEVICE_SIZE = getDeviceSize();
export const IS_SMALL_DEVICE = SCREEN_WIDTH < BREAKPOINTS.STANDARD;

// ============================================================================
// RESPONSIVE GAUGE SIZING
// ============================================================================

/**
 * Get optimal gauge size based on screen width
 * Ensures gauges are visible but not oversized on any device
 *
 * @param {string} variant - 'hero' | 'standard' | 'mini' | 'compact'
 * @returns {Object} { size, strokeWidth, labelSize }
 */
export function getResponsiveGaugeSize(variant = 'standard') {
  const sizes = {
    // Hero gauge (main dashboard wellness score)
    hero: {
      SMALL: { size: 200, strokeWidth: 12, labelSize: 32 },
      COMPACT: { size: 220, strokeWidth: 14, labelSize: 36 },
      STANDARD: { size: 260, strokeWidth: 16, labelSize: 40 },
      LARGE: { size: 280, strokeWidth: 18, labelSize: 44 },
      XLARGE: { size: 300, strokeWidth: 20, labelSize: 48 },
    },
    // Standard gauge (analytics screens)
    standard: {
      SMALL: { size: 180, strokeWidth: 10, labelSize: 28 },
      COMPACT: { size: 200, strokeWidth: 12, labelSize: 30 },
      STANDARD: { size: 240, strokeWidth: 14, labelSize: 34 },
      LARGE: { size: 260, strokeWidth: 16, labelSize: 38 },
      XLARGE: { size: 280, strokeWidth: 18, labelSize: 42 },
    },
    // Mini gauge (category breakdown)
    mini: {
      SMALL: { size: 50, strokeWidth: 5, labelSize: 10 },
      COMPACT: { size: 55, strokeWidth: 5, labelSize: 11 },
      STANDARD: { size: 60, strokeWidth: 6, labelSize: 12 },
      LARGE: { size: 65, strokeWidth: 6, labelSize: 13 },
      XLARGE: { size: 70, strokeWidth: 7, labelSize: 14 },
    },
    // Compact gauge (inline displays)
    compact: {
      SMALL: { size: 70, strokeWidth: 6, labelSize: 14 },
      COMPACT: { size: 75, strokeWidth: 6, labelSize: 15 },
      STANDARD: { size: 80, strokeWidth: 7, labelSize: 16 },
      LARGE: { size: 85, strokeWidth: 7, labelSize: 17 },
      XLARGE: { size: 90, strokeWidth: 8, labelSize: 18 },
    },
  };

  return sizes[variant]?.[DEVICE_SIZE] || sizes.standard[DEVICE_SIZE];
}

// ============================================================================
// RESPONSIVE SPACING
// ============================================================================

/**
 * Scale a value based on device width
 * Base design is for 390pt (iPhone 14)
 *
 * @param {number} size - Size designed for 390pt screen
 * @returns {number} Scaled size for current device
 */
export function scale(size) {
  const baseWidth = 390;
  return Math.round((SCREEN_WIDTH / baseWidth) * size);
}

/**
 * Scale vertical values based on device height
 * @param {number} size - Size designed for standard screen
 * @returns {number} Scaled size
 */
export function verticalScale(size) {
  const baseHeight = 844; // iPhone 14 height
  return Math.round((SCREEN_HEIGHT / baseHeight) * size);
}

/**
 * Moderate scaling - less aggressive, good for fonts
 * @param {number} size - Base size
 * @param {number} factor - How much to moderate (0.5 = half scaling)
 * @returns {number} Moderately scaled size
 */
export function moderateScale(size, factor = 0.5) {
  return Math.round(size + (scale(size) - size) * factor);
}

// ============================================================================
// RESPONSIVE PADDING & MARGINS
// ============================================================================

/**
 * Get responsive horizontal padding
 * Smaller devices need less padding to maximize content area
 */
export function getHorizontalPadding() {
  switch (DEVICE_SIZE) {
    case 'SMALL': return 12;
    case 'COMPACT': return 14;
    case 'STANDARD': return 16;
    case 'LARGE': return 18;
    case 'XLARGE': return 20;
    default: return 16;
  }
}

/**
 * Get responsive card margin
 */
export function getCardMargin() {
  return IS_SMALL_DEVICE ? 8 : 12;
}

// ============================================================================
// RESPONSIVE FONT SIZES
// ============================================================================

/**
 * Get responsive font size
 * @param {string} variant - 'hero' | 'title' | 'subtitle' | 'body' | 'caption'
 * @returns {number} Font size in points
 */
export function getResponsiveFontSize(variant) {
  const fontSizes = {
    hero: {
      SMALL: 28,
      COMPACT: 32,
      STANDARD: 36,
      LARGE: 40,
      XLARGE: 44,
    },
    title: {
      SMALL: 18,
      COMPACT: 19,
      STANDARD: 20,
      LARGE: 22,
      XLARGE: 24,
    },
    subtitle: {
      SMALL: 14,
      COMPACT: 15,
      STANDARD: 16,
      LARGE: 17,
      XLARGE: 18,
    },
    body: {
      SMALL: 13,
      COMPACT: 14,
      STANDARD: 15,
      LARGE: 16,
      XLARGE: 17,
    },
    caption: {
      SMALL: 11,
      COMPACT: 12,
      STANDARD: 13,
      LARGE: 14,
      XLARGE: 15,
    },
  };

  return fontSizes[variant]?.[DEVICE_SIZE] || fontSizes.body[DEVICE_SIZE];
}

// ============================================================================
// RESPONSIVE GRID
// ============================================================================

/**
 * Get number of columns for a grid based on screen width
 * @param {string} itemType - 'card' | 'icon' | 'stat'
 * @returns {number} Number of columns
 */
export function getGridColumns(itemType = 'card') {
  const columns = {
    card: IS_SMALL_DEVICE ? 1 : 2,
    icon: IS_SMALL_DEVICE ? 3 : 4,
    stat: IS_SMALL_DEVICE ? 2 : 3,
  };
  return columns[itemType] || 2;
}

/**
 * Calculate item width for a grid
 * @param {number} columns - Number of columns
 * @param {number} gap - Gap between items
 * @param {number} containerPadding - Container horizontal padding
 * @returns {number} Width of each item
 */
export function getGridItemWidth(columns, gap = 12, containerPadding = 16) {
  const availableWidth = SCREEN_WIDTH - (containerPadding * 2) - (gap * (columns - 1));
  return Math.floor(availableWidth / columns);
}

// ============================================================================
// SAFE AREA HELPERS
// ============================================================================

/**
 * Check if device has notch (for safe area handling)
 */
export const HAS_NOTCH = Platform.OS === 'ios' &&
  (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812);

/**
 * Get bottom safe area padding
 */
export function getBottomSafeArea() {
  return HAS_NOTCH ? 34 : 0;
}

/**
 * Get top safe area padding
 */
export function getTopSafeArea() {
  return HAS_NOTCH ? 44 : 20;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  DEVICE_SIZE,
  IS_SMALL_DEVICE,
  BREAKPOINTS,
  HAS_NOTCH,

  // Functions
  getDeviceSize,
  getResponsiveGaugeSize,
  scale,
  verticalScale,
  moderateScale,
  getHorizontalPadding,
  getCardMargin,
  getResponsiveFontSize,
  getGridColumns,
  getGridItemWidth,
  getBottomSafeArea,
  getTopSafeArea,
};
