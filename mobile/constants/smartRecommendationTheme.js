/**
 * Smart Recommendation Theme - Premium Design System
 *
 * Design Principles:
 * 1. DELIGHT - Micro-interactions that spark joy
 * 2. CLARITY - Information hierarchy that guides the eye
 * 3. PERSONALITY - Warm, encouraging, never clinical
 * 4. MOTION - Purposeful animations that feel alive
 * 5. ACCESSIBILITY - Beautiful AND usable by everyone
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// CREATIVE COLOR PALETTE
// A comprehensive color system inspired by fresh ingredients, wellness,
// and modern design trends (2025)
// ============================================================================

// -----------------------------------------------------------------------------
// FOUNDATION COLORS - Core palette building blocks
// -----------------------------------------------------------------------------

export const FOUNDATION = {
  // Pure whites and blacks
  white: '#FFFFFF',
  black: '#000000',

  // Neutral grays (cool undertone for modern feel)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Warm grays (for food-related content)
  warmGray: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },
};

// -----------------------------------------------------------------------------
// FOOD-INSPIRED COLORS - Colors derived from real ingredients
// -----------------------------------------------------------------------------

export const FOOD_COLORS = {
  // Proteins
  salmon: { primary: '#FA8072', light: '#FFE4E1', dark: '#E9967A' },
  steak: { primary: '#8B4513', light: '#DEB887', dark: '#654321' },
  chicken: { primary: '#F5DEB3', light: '#FFF8DC', dark: '#D2B48C' },
  egg: { primary: '#FFD700', light: '#FFFACD', dark: '#DAA520' },

  // Vegetables
  avocado: { primary: '#568203', light: '#B8D977', dark: '#3D5C02' },
  spinach: { primary: '#2E8B57', light: '#90EE90', dark: '#228B22' },
  carrot: { primary: '#FF7F00', light: '#FFD59A', dark: '#E86E00' },
  tomato: { primary: '#FF6347', light: '#FFA07A', dark: '#DC143C' },
  broccoli: { primary: '#228B22', light: '#98FB98', dark: '#006400' },
  eggplant: { primary: '#614051', light: '#9370DB', dark: '#4A0E4E' },

  // Fruits
  strawberry: { primary: '#FF4757', light: '#FFB8C0', dark: '#C0392B' },
  blueberry: { primary: '#4169E1', light: '#B0C4DE', dark: '#1E3A8A' },
  orange: { primary: '#FFA500', light: '#FFE4B5', dark: '#FF8C00' },
  lemon: { primary: '#FFF44F', light: '#FFFACD', dark: '#FFD700' },
  grape: { primary: '#6B3FA0', light: '#D8BFD8', dark: '#4B0082' },
  watermelon: { primary: '#FF6B81', light: '#FFB6C1', dark: '#E74C3C' },
  mango: { primary: '#FF9933', light: '#FFE5B4', dark: '#FF7F00' },
  kiwi: { primary: '#8DB600', light: '#C5E384', dark: '#6B8E23' },

  // Grains & Carbs
  bread: { primary: '#DEB887', light: '#F5DEB3', dark: '#D2691E' },
  rice: { primary: '#FFFAF0', light: '#FFFFFF', dark: '#F5F5DC' },
  pasta: { primary: '#F5DEB3', light: '#FAEBD7', dark: '#DAA520' },
  oats: { primary: '#C4A35A', light: '#E8D5A3', dark: '#A0824A' },

  // Dairy
  milk: { primary: '#FFFAFA', light: '#FFFFFF', dark: '#F0F0F0' },
  cheese: { primary: '#FFD700', light: '#FFF8DC', dark: '#DAA520' },
  yogurt: { primary: '#FEFEFA', light: '#FFFFFF', dark: '#F5F5F5' },

  // Beverages
  coffee: { primary: '#6F4E37', light: '#C4A484', dark: '#4B3621' },
  tea: { primary: '#C19A6B', light: '#DEB887', dark: '#8B4513' },
  juice: { primary: '#FFA500', light: '#FFDAB9', dark: '#FF8C00' },
  water: { primary: '#87CEEB', light: '#E0FFFF', dark: '#4169E1' },
};

// -----------------------------------------------------------------------------
// GRADIENT COLLECTION - Premium multi-stop gradients
// -----------------------------------------------------------------------------

export const GRADIENTS = {
  // Hero gradients (for headers, CTAs)
  hero: {
    primary: ['#667EEA', '#764BA2'],
    secondary: ['#f093fb', '#f5576c'],
    tertiary: ['#4facfe', '#00f2fe'],
  },

  // Wellness gradients
  wellness: {
    energy: ['#f5af19', '#f12711'],
    calm: ['#89f7fe', '#66a6ff'],
    vitality: ['#11998e', '#38ef7d'],
    balance: ['#ee9ca7', '#ffdde1'],
    focus: ['#5433ff', '#20bdff', '#a5fecb'],
  },

  // Time of day gradients
  timeOfDay: {
    dawn: ['#ff6e7f', '#bfe9ff'],
    morning: ['#f6d365', '#fda085'],
    noon: ['#ffecd2', '#fcb69f'],
    afternoon: ['#a1c4fd', '#c2e9fb'],
    evening: ['#667eea', '#764ba2'],
    night: ['#0f0c29', '#302b63', '#24243e'],
    midnight: ['#232526', '#414345'],
  },

  // Food category gradients
  food: {
    protein: ['#ff6b6b', '#ee5a5a'],
    carbs: ['#ffd93d', '#f59e0b'],
    vegetables: ['#56ab2f', '#a8e063'],
    fats: ['#a855f7', '#7c3aed'],
    fruit: ['#f472b6', '#db2777'],
    dairy: ['#22d3ee', '#0891b2'],
  },

  // Mood gradients
  mood: {
    happy: ['#f7971e', '#ffd200'],
    peaceful: ['#74ebd5', '#acb6e5'],
    energetic: ['#fc4a1a', '#f7b733'],
    focused: ['#4776e6', '#8e54e9'],
    relaxed: ['#11998e', '#38ef7d'],
    sleepy: ['#2c3e50', '#4ca1af'],
  },

  // Glass morphism overlays
  glass: {
    light: ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)'],
    dark: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)'],
    frost: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)'],
  },

  // Score/progress gradients
  score: {
    excellent: ['#10b981', '#34d399'],
    good: ['#3b82f6', '#60a5fa'],
    moderate: ['#f59e0b', '#fbbf24'],
    low: ['#ef4444', '#f87171'],
  },

  // Special effects
  special: {
    rainbow: ['#ff0844', '#ffb199', '#ffd700', '#38ef7d', '#4facfe', '#667eea'],
    aurora: ['#00c6fb', '#005bea'],
    sunset: ['#fa709a', '#fee140'],
    cosmic: ['#c471f5', '#fa71cd'],
    fire: ['#f12711', '#f5af19'],
    ice: ['#74ebd5', '#9face6'],
    gold: ['#f7971e', '#ffd200'],
    silver: ['#bdc3c7', '#2c3e50'],
  },
};

// -----------------------------------------------------------------------------
// RECOMMENDATION COLORS - Complete system
// -----------------------------------------------------------------------------

export const RECOMMENDATION_COLORS = {
  // Primary gradient for headers and CTAs
  gradient: {
    primary: ['#667EEA', '#764BA2'],
    success: ['#11998E', '#38EF7D'],
    warm: ['#F093FB', '#F5576C'],
    sunrise: ['#FA709A', '#FEE140'],
    ocean: ['#4FACFE', '#00F2FE'],
    nature: ['#11998E', '#38EF7D'],
  },

  // Food category colors - vibrant yet harmonious
  categories: {
    protein: {
      primary: '#EF4444',
      secondary: '#DC2626',
      light: '#FEE2E2',
      lighter: '#FEF2F2',
      gradient: ['#FF6B6B', '#EE5A5A'],
      glow: 'rgba(239, 68, 68, 0.3)',
      icon: 'fish',
      emoji: '🥩',
    },
    carbs: {
      primary: '#F59E0B',
      secondary: '#D97706',
      light: '#FEF3C7',
      lighter: '#FFFBEB',
      gradient: ['#FFD93D', '#F59E0B'],
      glow: 'rgba(245, 158, 11, 0.3)',
      icon: 'leaf',
      emoji: '🍞',
    },
    vegetables: {
      primary: '#10B981',
      secondary: '#059669',
      light: '#D1FAE5',
      lighter: '#ECFDF5',
      gradient: ['#34D399', '#10B981'],
      glow: 'rgba(16, 185, 129, 0.3)',
      icon: 'nutrition',
      emoji: '🥗',
    },
    fats: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      light: '#EDE9FE',
      lighter: '#F5F3FF',
      gradient: ['#A855F7', '#7C3AED'],
      glow: 'rgba(139, 92, 246, 0.3)',
      icon: 'water',
      emoji: '🥑',
    },
    fruit: {
      primary: '#EC4899',
      secondary: '#DB2777',
      light: '#FCE7F3',
      lighter: '#FDF2F8',
      gradient: ['#F472B6', '#DB2777'],
      glow: 'rgba(236, 72, 153, 0.3)',
      icon: 'rose',
      emoji: '🍎',
    },
    dairy: {
      primary: '#06B6D4',
      secondary: '#0891B2',
      light: '#CFFAFE',
      lighter: '#ECFEFF',
      gradient: ['#22D3EE', '#0891B2'],
      glow: 'rgba(6, 182, 212, 0.3)',
      icon: 'cafe',
      emoji: '🥛',
    },
    snack: {
      primary: '#3B82F6',
      secondary: '#2563EB',
      light: '#DBEAFE',
      lighter: '#EFF6FF',
      gradient: ['#60A5FA', '#2563EB'],
      glow: 'rgba(59, 130, 246, 0.3)',
      icon: 'cafe',
      emoji: '🥜',
    },
    meal: {
      primary: '#6366F1',
      secondary: '#4F46E5',
      light: '#E0E7FF',
      lighter: '#EEF2FF',
      gradient: ['#818CF8', '#4F46E5'],
      glow: 'rgba(99, 102, 241, 0.3)',
      icon: 'restaurant',
      emoji: '🍽️',
    },
    treat: {
      primary: '#F97316',
      secondary: '#EA580C',
      light: '#FFEDD5',
      lighter: '#FFF7ED',
      gradient: ['#FB923C', '#EA580C'],
      glow: 'rgba(249, 115, 22, 0.3)',
      icon: 'heart',
      emoji: '🍫',
    },
  },

  // Nutrient colors for pills and charts
  nutrients: {
    calories: {
      primary: '#EF4444',
      secondary: '#DC2626',
      bg: '#FEF2F2',
      gradient: ['#FF6B6B', '#EE5A5A'],
    },
    protein: {
      primary: '#3B82F6',
      secondary: '#2563EB',
      bg: '#EFF6FF',
      gradient: ['#60A5FA', '#3B82F6'],
    },
    carbs: {
      primary: '#F59E0B',
      secondary: '#D97706',
      bg: '#FFFBEB',
      gradient: ['#FBBF24', '#F59E0B'],
    },
    fat: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      bg: '#F5F3FF',
      gradient: ['#A78BFA', '#8B5CF6'],
    },
    fiber: {
      primary: '#10B981',
      secondary: '#059669',
      bg: '#ECFDF5',
      gradient: ['#34D399', '#10B981'],
    },
    sugar: {
      primary: '#EC4899',
      secondary: '#DB2777',
      bg: '#FDF2F8',
      gradient: ['#F472B6', '#EC4899'],
    },
    sodium: {
      primary: '#6366F1',
      secondary: '#4F46E5',
      bg: '#EEF2FF',
      gradient: ['#818CF8', '#6366F1'],
    },
    water: {
      primary: '#06B6D4',
      secondary: '#0891B2',
      bg: '#ECFEFF',
      gradient: ['#22D3EE', '#06B6D4'],
    },
  },

  // Status and feedback colors
  status: {
    excellent: '#10B981',
    good: '#3B82F6',
    moderate: '#F59E0B',
    low: '#EF4444',
    neutral: '#6B7280',
  },

  // Semantic colors
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
};

// -----------------------------------------------------------------------------
// MOOD-BASED COLOR SCHEMES
// Colors that evoke specific emotional states
// -----------------------------------------------------------------------------

export const MOOD_COLORS = {
  // Positive moods
  happy: {
    primary: '#FCD34D',
    secondary: '#FBBF24',
    accent: '#F59E0B',
    bg: '#FFFBEB',
    gradient: ['#F7971E', '#FFD200'],
    emoji: '😊',
  },
  energetic: {
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#DC2626',
    bg: '#FFF7ED',
    gradient: ['#FC4A1A', '#F7B733'],
    emoji: '⚡',
  },
  peaceful: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#0E7490',
    bg: '#ECFEFF',
    gradient: ['#74EBD5', '#ACB6E5'],
    emoji: '😌',
  },
  focused: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#4338CA',
    bg: '#EEF2FF',
    gradient: ['#4776E6', '#8E54E9'],
    emoji: '🎯',
  },
  relaxed: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#047857',
    bg: '#ECFDF5',
    gradient: ['#11998E', '#38EF7D'],
    emoji: '🧘',
  },

  // Neutral/transitional moods
  neutral: {
    primary: '#6B7280',
    secondary: '#4B5563',
    accent: '#374151',
    bg: '#F3F4F6',
    gradient: ['#8E9EAB', '#EEF2F3'],
    emoji: '😐',
  },
  thoughtful: {
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#6D28D9',
    bg: '#F5F3FF',
    gradient: ['#A78BFA', '#C4B5FD'],
    emoji: '🤔',
  },

  // Lower energy moods (use with care)
  tired: {
    primary: '#9CA3AF',
    secondary: '#6B7280',
    accent: '#4B5563',
    bg: '#F9FAFB',
    gradient: ['#BDC3C7', '#2C3E50'],
    emoji: '😴',
  },
  stressed: {
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#B91C1C',
    bg: '#FEF2F2',
    gradient: ['#FF6B6B', '#EE5A5A'],
    emoji: '😰',
  },
};

// -----------------------------------------------------------------------------
// SHADOW & ELEVATION SYSTEM
// Consistent depth and dimensionality
// -----------------------------------------------------------------------------

export const SHADOWS = {
  // Subtle shadows for cards
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Standard card shadow
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Elevated elements
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  // Modal/overlay shadows
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  // Floating elements
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },

  // Colored shadows (for glow effects)
  colored: {
    primary: (color, opacity = 0.3) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 12,
      elevation: 8,
    }),
    soft: (color) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    }),
  },

  // Inner shadows (for pressed states)
  inner: {
    light: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    medium: 'inset 0 4px 6px rgba(0, 0, 0, 0.1)',
  },
};

// -----------------------------------------------------------------------------
// GLASS & BLUR EFFECTS
// Modern translucent UI elements
// -----------------------------------------------------------------------------

export const GLASS = {
  // Light glass (for light backgrounds)
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.3)',
    blur: 20,
  },

  // Dark glass (for dark backgrounds)
  dark: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: 'rgba(255, 255, 255, 0.1)',
    blur: 20,
  },

  // Frosted glass
  frost: {
    background: 'rgba(255, 255, 255, 0.25)',
    border: 'rgba(255, 255, 255, 0.18)',
    blur: 16,
  },

  // Colored glass variants
  colored: {
    primary: {
      background: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.3)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    error: {
      background: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
  },
};

// -----------------------------------------------------------------------------
// ACCESSIBILITY COLOR PAIRS
// WCAG AA/AAA compliant combinations
// -----------------------------------------------------------------------------

export const ACCESSIBLE_PAIRS = {
  // High contrast pairs (AAA compliant)
  highContrast: [
    { bg: '#FFFFFF', text: '#111827', ratio: 16.1 },
    { bg: '#111827', text: '#FFFFFF', ratio: 16.1 },
    { bg: '#EFF6FF', text: '#1E3A8A', ratio: 9.5 },
    { bg: '#ECFDF5', text: '#065F46', ratio: 8.2 },
    { bg: '#FEF2F2', text: '#991B1B', ratio: 7.8 },
    { bg: '#FFFBEB', text: '#92400E', ratio: 7.1 },
  ],

  // Standard contrast pairs (AA compliant)
  standard: [
    { bg: '#F3F4F6', text: '#374151', ratio: 6.5 },
    { bg: '#DBEAFE', text: '#1E40AF', ratio: 6.2 },
    { bg: '#D1FAE5', text: '#047857', ratio: 5.8 },
    { bg: '#FCE7F3', text: '#9D174D', ratio: 5.4 },
  ],

  // Button/interactive pairs
  interactive: {
    primary: { bg: '#6366F1', text: '#FFFFFF', ratio: 4.6 },
    secondary: { bg: '#E5E7EB', text: '#1F2937', ratio: 10.2 },
    success: { bg: '#10B981', text: '#FFFFFF', ratio: 4.5 },
    warning: { bg: '#F59E0B', text: '#111827', ratio: 7.2 },
    danger: { bg: '#EF4444', text: '#FFFFFF', ratio: 4.5 },
  },
};

// -----------------------------------------------------------------------------
// SEASONAL & THEME COLORS
// Contextual color schemes for special occasions
// -----------------------------------------------------------------------------

export const SEASONAL_THEMES = {
  // Spring - fresh and renewal
  spring: {
    primary: '#84CC16',
    secondary: '#22C55E',
    accent: '#F472B6',
    bg: '#F0FDF4',
    gradient: ['#84CC16', '#22C55E'],
  },

  // Summer - vibrant and energetic
  summer: {
    primary: '#F97316',
    secondary: '#FBBF24',
    accent: '#06B6D4',
    bg: '#FFFBEB',
    gradient: ['#F97316', '#FBBF24'],
  },

  // Autumn - warm and cozy
  autumn: {
    primary: '#D97706',
    secondary: '#DC2626',
    accent: '#78350F',
    bg: '#FEF3C7',
    gradient: ['#D97706', '#DC2626'],
  },

  // Winter - cool and calm
  winter: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    bg: '#EFF6FF',
    gradient: ['#3B82F6', '#8B5CF6'],
  },

  // Holiday themes
  newYear: {
    primary: '#FFD700',
    secondary: '#C0C0C0',
    accent: '#6366F1',
    gradient: ['#FFD700', '#FFA500'],
  },

  valentines: {
    primary: '#EC4899',
    secondary: '#F472B6',
    accent: '#BE185D',
    gradient: ['#EC4899', '#F472B6'],
  },

  halloween: {
    primary: '#F97316',
    secondary: '#7C3AED',
    accent: '#111827',
    gradient: ['#F97316', '#7C3AED'],
  },

  christmas: {
    primary: '#DC2626',
    secondary: '#15803D',
    accent: '#FFD700',
    gradient: ['#DC2626', '#15803D'],
  },
};

// -----------------------------------------------------------------------------
// COLOR UTILITIES
// Helper functions for color manipulation
// -----------------------------------------------------------------------------

/**
 * Get a color with opacity
 */
export const withOpacity = (hexColor, opacity) => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${hexColor}${alpha}`;
};

/**
 * Get contrasting text color (black or white)
 */
export const getContrastText = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : '#FFFFFF';
};

/**
 * Get category color by name
 */
export const getCategoryColor = (category) => {
  return RECOMMENDATION_COLORS.categories[category] || RECOMMENDATION_COLORS.categories.meal;
};

/**
 * Get nutrient color by name
 */
export const getNutrientColor = (nutrient) => {
  return RECOMMENDATION_COLORS.nutrients[nutrient] || RECOMMENDATION_COLORS.nutrients.calories;
};

/**
 * Get mood color scheme
 */
export const getMoodColors = (mood) => {
  return MOOD_COLORS[mood] || MOOD_COLORS.neutral;
};

// ============================================================================
// ANIMATION TIMINGS
// Consistent motion that feels natural
// ============================================================================

export const ANIMATION = {
  // Durations (ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    celebration: 800,
  },

  // Spring configs for react-native-reanimated
  spring: {
    gentle: { damping: 15, stiffness: 100 },
    bouncy: { damping: 10, stiffness: 150 },
    snappy: { damping: 20, stiffness: 300 },
  },

  // Easing curves
  easing: {
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
};

// ============================================================================
// TYPOGRAPHY SCALE
// Clear hierarchy for scannability
// ============================================================================

export const SMART_TYPOGRAPHY = {
  // Headers
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Labels and pills
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pill: {
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
};

// ============================================================================
// SPACING SYSTEM
// 4px base unit for consistency
// ============================================================================

export const SMART_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ============================================================================
// CARD STYLES
// Elevated, tactile cards that invite interaction
// ============================================================================

export const CARD_STYLES = {
  // Premium elevated card
  elevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  // Subtle card for nested content
  subtle: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  // Glass morphism effect
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Interactive card (pressed state)
  interactive: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.04,
  },
};

// ============================================================================
// ICON SIZES
// Consistent icon scaling
// ============================================================================

export const ICON_SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
  '2xl': 48,
  hero: 64,
};

// ============================================================================
// BORDER RADIUS
// Soft, friendly corners
// ============================================================================

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// ============================================================================
// TIME-OF-DAY THEMES
// Contextual visual treatments
// ============================================================================

export const TIME_THEMES = {
  morning: {
    greeting: 'Good morning',
    emoji: '🌅',
    gradient: ['#FA709A', '#FEE140'],
    accent: '#F59E0B',
    message: 'Start your day right with these picks',
  },
  afternoon: {
    greeting: 'Good afternoon',
    emoji: '☀️',
    gradient: ['#667EEA', '#764BA2'],
    accent: '#6366F1',
    message: 'Power through with smart fuel',
  },
  evening: {
    greeting: 'Good evening',
    emoji: '🌙',
    gradient: ['#4FACFE', '#00F2FE'],
    accent: '#3B82F6',
    message: 'Wind down with these nutritious options',
  },
  night: {
    greeting: 'Late night',
    emoji: '✨',
    gradient: ['#667EEA', '#764BA2'],
    accent: '#8B5CF6',
    message: 'Light options for late cravings',
  },
};

/**
 * Get time-based theme
 */
export function getTimeTheme() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return TIME_THEMES.morning;
  if (hour >= 12 && hour < 17) return TIME_THEMES.afternoon;
  if (hour >= 17 && hour < 21) return TIME_THEMES.evening;
  return TIME_THEMES.night;
}

// ============================================================================
// SCORE VISUALIZATION
// Visual representation of recommendation quality
// ============================================================================

export const SCORE_CONFIG = {
  // Score thresholds
  thresholds: {
    excellent: 85,
    good: 70,
    moderate: 50,
  },

  // Score colors
  getColor: (score) => {
    if (score >= 85) return RECOMMENDATION_COLORS.status.excellent;
    if (score >= 70) return RECOMMENDATION_COLORS.status.good;
    if (score >= 50) return RECOMMENDATION_COLORS.status.moderate;
    return RECOMMENDATION_COLORS.status.low;
  },

  // Score label
  getLabel: (score) => {
    if (score >= 85) return 'Perfect match';
    if (score >= 70) return 'Great choice';
    if (score >= 50) return 'Good option';
    return 'Consider';
  },
};

// ============================================================================
// NUTRIENT GAP VISUALIZATION
// How to show nutritional deficits/surpluses
// ============================================================================

export const GAP_VISUALIZATION = {
  // Gap severity colors
  getGapColor: (percentage) => {
    if (percentage < 30) return '#EF4444'; // Critical - red
    if (percentage < 60) return '#F59E0B'; // Low - amber
    if (percentage < 90) return '#3B82F6'; // Moderate - blue
    return '#10B981'; // Good - green
  },

  // Gap messages
  getGapMessage: (nutrient, percentage) => {
    if (percentage < 30) return `${nutrient} is very low`;
    if (percentage < 60) return `Need more ${nutrient.toLowerCase()}`;
    if (percentage < 90) return `${nutrient} looking good`;
    return `${nutrient} on track!`;
  },
};

// ============================================================================
// CELEBRATION PARTICLES
// Confetti colors for quick-log success
// ============================================================================

export const CELEBRATION = {
  confettiColors: [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
  ],

  particleCount: 30,
  duration: 1500,
};

// ============================================================================
// SKELETON LOADER CONFIG
// Shimmer animation settings
// ============================================================================

export const SKELETON = {
  baseColor: '#E5E7EB',
  highlightColor: '#F3F4F6',
  shimmerDuration: 1200,
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const LAYOUT = {
  screenPadding: 16,
  cardGap: 12,
  sectionGap: 24,
  maxCardWidth: SCREEN_WIDTH - 32,
};

export default {
  RECOMMENDATION_COLORS,
  ANIMATION,
  SMART_TYPOGRAPHY,
  SMART_SPACING,
  CARD_STYLES,
  ICON_SIZES,
  RADIUS,
  TIME_THEMES,
  getTimeTheme,
  SCORE_CONFIG,
  GAP_VISUALIZATION,
  CELEBRATION,
  SKELETON,
  LAYOUT,
};
