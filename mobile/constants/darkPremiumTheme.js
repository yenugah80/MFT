/**
 * DARK PREMIUM THEME - My-Food-Tracker
 * Inspired by Whoop, Levels, Apple Watch
 *
 * Features:
 * - Deep dark backgrounds with animated mesh gradients
 * - Glassmorphism cards with frosted glass effects
 * - Vibrant accent colors that pop on dark
 * - Premium shadows and glows
 * - High contrast for readability
 *
 * Updated: 2025-12-26
 */

// ============================================================================
// DARK BACKGROUNDS - Animated Mesh Gradients
// ============================================================================

export const DARK_BACKGROUNDS = {
  // Primary gradient - deep navy to darker navy (for most screens)
  deepNavy: {
    colors: ['#0A0E27', '#1A1F3A', '#0F1420'],
    locations: [0, 0.5, 1],
    gradient: ['#0A0E27', '#1A1F3A', '#0F1420'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Accent gradient - subtle purple/blue mix (for dashboard)
  cosmicPurple: {
    colors: ['#1A0B2E', '#2D1B4E', '#16213E'],
    locations: [0, 0.5, 1],
    gradient: ['#1A0B2E', '#2D1B4E', '#16213E'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Dark teal gradient (for mood/wellness screens)
  deepTeal: {
    colors: ['#0D1117', '#1C2541', '#0B132B'],
    locations: [0, 0.5, 1],
    gradient: ['#0D1117', '#1C2541', '#0B132B'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Pure black (for OLED optimization)
  trueBlack: {
    colors: ['#000000', '#0A0A0A', '#000000'],
    locations: [0, 0.5, 1],
    gradient: ['#000000', '#0A0A0A', '#000000'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// ============================================================================
// GLASSMORPHISM - Frosted Glass Effects
// ============================================================================

export const GLASS = {
  // Card backgrounds (rgba for transparency)
  card: {
    primary: 'rgba(255, 255, 255, 0.08)',      // Default glass card
    secondary: 'rgba(255, 255, 255, 0.05)',    // Subtle glass
    elevated: 'rgba(255, 255, 255, 0.12)',     // More prominent glass
    hover: 'rgba(255, 255, 255, 0.15)',        // Interactive state
  },

  // Borders (subtle highlights)
  border: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.18)',
    glow: 'rgba(255, 255, 255, 0.25)',
  },

  // Overlays (for modals, drawers)
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    heavy: 'rgba(0, 0, 0, 0.7)',
    blur: 'rgba(10, 14, 39, 0.85)',
  },

  // Blur strength (for backdrop-filter equivalent)
  blur: {
    light: 10,
    medium: 20,
    heavy: 30,
  },
};

// ============================================================================
// VIBRANT ACCENT COLORS (Pop on Dark)
// ============================================================================

export const VIBRANT = {
  // Primary brand colors (more saturated for dark mode)
  brand: {
    primary: '#7C66FF',        // Bright purple (was #6B4EFF)
    primaryLight: '#9D8AFF',
    primaryDark: '#6B4EFF',
    glow: 'rgba(124, 102, 255, 0.4)',
  },

  // Neon accents
  neon: {
    cyan: '#00F0FF',
    pink: '#FF2E97',
    green: '#00FF94',
    yellow: '#FFD60A',
    purple: '#BF5AF2',
    orange: '#FF9500',
  },

  // Semantic colors (vibrant on dark)
  semantic: {
    success: {
      base: '#0FD97A',         // Neon green
      light: '#30E58D',
      dark: '#0BC768',
      glow: 'rgba(15, 217, 122, 0.4)',
    },
    warning: {
      base: '#FFD60A',         // Bright yellow
      light: '#FFE135',
      dark: '#FFC400',
      glow: 'rgba(255, 214, 10, 0.4)',
    },
    danger: {
      base: '#FF453A',         // Bright red
      light: '#FF6961',
      dark: '#FF2D20',
      glow: 'rgba(255, 69, 58, 0.4)',
    },
    info: {
      base: '#0A84FF',         // Bright blue
      light: '#409CFF',
      dark: '#006CE0',
      glow: 'rgba(10, 132, 255, 0.4)',
    },
  },

  // Mood colors (vibrant versions for dark mode)
  mood: {
    happy: {
      base: '#0FD97A',         // Neon green
      gradient: ['#0FD97A', '#30E58D'],
      glow: 'rgba(15, 217, 122, 0.4)',
    },
    calm: {
      base: '#0A84FF',         // Bright blue
      gradient: ['#0A84FF', '#409CFF'],
      glow: 'rgba(10, 132, 255, 0.4)',
    },
    focused: {
      base: '#30D5C8',         // Bright teal
      gradient: ['#30D5C8', '#5EDFD5'],
      glow: 'rgba(48, 213, 200, 0.4)',
    },
    energized: {
      base: '#FFD60A',         // Bright yellow
      gradient: ['#FFD60A', '#FFE135'],
      glow: 'rgba(255, 214, 10, 0.4)',
    },
    tired: {
      base: '#8E8E93',         // Soft gray (calm)
      gradient: ['#8E8E93', '#AEAEB2'],
      glow: 'rgba(142, 142, 147, 0.3)',
    },
    stressed: {
      base: '#FF9500',         // Orange
      gradient: ['#FF9500', '#FFB340'],
      glow: 'rgba(255, 149, 0, 0.4)',
    },
    sad: {
      base: '#64D2FF',         // Light blue (calming)
      gradient: ['#64D2FF', '#8DE0FF'],
      glow: 'rgba(100, 210, 255, 0.3)',
    },
  },

  // Macro colors (vibrant for dark)
  macros: {
    protein: {
      base: '#FF9500',         // Bright orange
      gradient: ['#FF9500', '#FFB340'],
    },
    carbs: {
      base: '#BF5AF2',         // Purple
      gradient: ['#BF5AF2', '#D291F7'],
    },
    fat: {
      base: '#FF2E97',         // Hot pink
      gradient: ['#FF2E97', '#FF5AAD'],
    },
  },
};

// ============================================================================
// TEXT COLORS (High Contrast for Dark)
// ============================================================================

export const DARK_TEXT = {
  primary: '#FFFFFF',          // Pure white - main text
  secondary: '#E5E5EA',        // Light gray - secondary text
  tertiary: '#AEAEB2',         // Medium gray - tertiary text
  muted: '#8E8E93',            // Dark gray - muted text
  disabled: '#636366',         // Very dark gray - disabled
  brand: '#7C66FF',            // Brand purple for links
};

// ============================================================================
// SHADOWS & GLOWS (Premium Depth)
// ============================================================================

export const DARK_SHADOWS = {
  // Glass card shadows (subtle)
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },

  // Elevated cards
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Floating elements (FAB, modals)
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },

  // Brand glow (for primary buttons)
  brandGlow: {
    shadowColor: '#7C66FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },

  // Success glow
  successGlow: {
    shadowColor: '#0FD97A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },

  // Danger glow
  dangerGlow: {
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
};

// ============================================================================
// GRADIENTS (Vibrant for Dark)
// ============================================================================

export const DARK_GRADIENTS = {
  // Primary brand
  primary: ['#7C66FF', '#9D8AFF'],
  secondary: ['#FF2E97', '#FF5AAD'],
  accent: ['#00F0FF', '#0A84FF'],

  // Semantic
  success: ['#0FD97A', '#30E58D'],
  warning: ['#FFD60A', '#FFE135'],
  danger: ['#FF453A', '#FF6961'],
  info: ['#0A84FF', '#409CFF'],

  // Macros
  protein: ['#FF9500', '#FFB340'],
  carbs: ['#BF5AF2', '#D291F7'],
  fat: ['#FF2E97', '#FF5AAD'],

  // Special effects
  cosmic: ['#7C66FF', '#00F0FF'],      // Purple to cyan
  sunset: ['#FF9500', '#FF2E97'],      // Orange to pink
  ocean: ['#00F0FF', '#0FD97A'],       // Cyan to green
  fire: ['#FFD60A', '#FF453A'],        // Yellow to red
};

// ============================================================================
// ANIMATION CONFIG (Mesh Gradient Movement)
// ============================================================================

export const ANIMATION = {
  // Mesh gradient animation (use with react-native-reanimated)
  meshGradient: {
    duration: 8000,              // 8 seconds per cycle
    easing: 'easeInOut',
    loop: true,

    // Keyframes for gradient position animation
    keyframes: [
      { x: 0, y: 0 },
      { x: 1, y: 0.3 },
      { x: 0.7, y: 1 },
      { x: 0, y: 0.7 },
      { x: 0, y: 0 },
    ],
  },

  // Shimmer effect for loading states
  shimmer: {
    duration: 2000,
    colors: [
      'rgba(255, 255, 255, 0.0)',
      'rgba(255, 255, 255, 0.08)',
      'rgba(255, 255, 255, 0.0)',
    ],
  },

  // Glow pulse (for notifications, badges)
  glowPulse: {
    duration: 2000,
    minOpacity: 0.3,
    maxOpacity: 0.8,
  },
};

// ============================================================================
// SPACING, RADIUS, TYPOGRAPHY (Same as before)
// ============================================================================

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

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

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

export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get glass card style with blur effect
 * @param {'primary'|'secondary'|'elevated'} type
 * @returns {Object} Card style
 */
export function getGlassCard(type = 'primary') {
  return {
    backgroundColor: GLASS.card[type],
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: GLASS.border.light,
    ...DARK_SHADOWS.glass,
    overflow: 'hidden',
  };
}

/**
 * Get vibrant gradient colors
 * @param {'primary'|'success'|'danger'|'cosmic'|'sunset'} type
 * @returns {Array<string>}
 */
export function getVibrantGradient(type = 'primary') {
  return DARK_GRADIENTS[type] || DARK_GRADIENTS.primary;
}

/**
 * Get mood color with glow
 * @param {string} mood
 * @returns {Object}
 */
export function getMoodStyle(mood) {
  const moodData = VIBRANT.mood[mood] || VIBRANT.mood.happy;
  return {
    color: moodData.base,
    gradient: moodData.gradient,
    glow: moodData.glow,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  DARK_BACKGROUNDS,
  GLASS,
  VIBRANT,
  DARK_TEXT,
  DARK_SHADOWS,
  DARK_GRADIENTS,
  ANIMATION,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  ICON_SIZES,

  // Utility functions
  getGlassCard,
  getVibrantGradient,
  getMoodStyle,
};
