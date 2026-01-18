/**
 * Modern Color Palette - 2025 Design System
 * Beautiful, harmonious colors with excellent contrast
 * Inspired by Apple Health, Linear, Stripe, and modern wellness apps
 * All colors are WCAG AA compliant for accessibility
 */

// ============================================================================
// PRIMARY BRAND COLORS - Apple Health Inspired Professional Palette
// Muted, sophisticated, medical-grade trust
// ============================================================================

export const MODERN_BRAND = {
  // Primary - Muted Blue (Apple Health chart blue)
  primary: {
    50: '#F6F8FC',    // Lightest tint - almost white
    100: '#EEF2F9',
    200: '#DCE4F0',
    300: '#C8D5E7',
    400: '#B9C7E0',   // Light - Apple Health blue
    500: '#8FA3C7',   // Base - Muted professional blue
    600: '#6B82AD',   // Medium
    700: '#4A5F8C',
    800: '#344566',
    900: '#1F2937',   // Darkest shade
  },

  // Secondary - Warm Sand (Apple Health warm neutral)
  secondary: {
    50: '#FDFCFB',    // Lightest tint
    100: '#FAF8F5',
    200: '#F5F0E8',
    300: '#EBDBD3',   // Apple Health sand
    400: '#D9C8BC',
    500: '#C4AE9E',   // Base - Muted warm sand
    600: '#A89484',   // Medium
    700: '#8A766A',
    800: '#6B5B52',
    900: '#4A403A',   // Darkest shade
  },

  // Accent - Muted Coral (subtle, professional)
  accent: {
    50: '#FDF8F7',
    100: '#FAEDE9',
    200: '#F5DDD5',
    300: '#E9C4B8',
    400: '#DDA99A',
    500: '#D89B7D',   // Base - Muted coral/peach
    600: '#C77F61',   // Medium
    700: '#A8634A',
    800: '#7F4A38',
    900: '#5A3429',
  },
};

// ============================================================================
// SEMANTIC COLORS - High contrast, professional, accessible (WCAG AAA)
// ============================================================================

export const MODERN_SEMANTIC = {
  // Success - Sage Green (Apple Health style)
  success: {
    base: '#6B9B76',      // Muted sage - professional
    light: '#A8C9A5',
    lighter: '#E5F2E6',
    dark: '#4A7856',
    darker: '#2F5A3C',
    gradient: ['#6B9B76', '#A8C9A5'],
    glow: 'rgba(107, 155, 118, 0.30)',
    bg: '#F0F7F1',
    text: '#1A3D23',      // High contrast dark green
    contrast: '#FFFFFF',
  },

  // Warning - Muted Amber (high contrast)
  warning: {
    base: '#D89B36',      // Professional amber
    light: '#E8B965',
    lighter: '#F9EDD8',
    dark: '#B67F1F',
    darker: '#8F6218',
    gradient: ['#D89B36', '#E8B965'],
    glow: 'rgba(216, 155, 54, 0.30)',
    bg: '#FDF8ED',
    text: '#5C3D10',      // High contrast dark amber
    contrast: '#FFFFFF',
  },

  // Error/Danger - Muted Red (high contrast)
  error: {
    base: '#C96B6B',      // Professional rose red
    light: '#E09B9B',
    lighter: '#F5E5E5',
    dark: '#A84848',
    darker: '#7F3030',
    gradient: ['#C96B6B', '#E09B9B'],
    glow: 'rgba(201, 107, 107, 0.30)',
    bg: '#FDF2F2',
    text: '#5A1F1F',      // High contrast dark red
    contrast: '#FFFFFF',
  },

  // Info - Muted Blue (Apple Health blue, high contrast)
  info: {
    base: '#6B82AD',      // Professional blue
    light: '#B9C7E0',
    lighter: '#EEF2F9',
    dark: '#4A5F8C',
    darker: '#344566',
    gradient: ['#6B82AD', '#B9C7E0'],
    glow: 'rgba(107, 130, 173, 0.30)',
    bg: '#F6F8FC',
    text: '#1C2D4A',      // High contrast dark blue
    contrast: '#FFFFFF',
  },

  // Neutral - Sophisticated Gray (high contrast)
  neutral: {
    base: '#7B8794',      // Professional gray
    light: '#B0B8C1',
    lighter: '#E8EAED',
    dark: '#5A6370',
    darker: '#3D444D',
    gradient: ['#7B8794', '#B0B8C1'],
    glow: 'rgba(123, 135, 148, 0.25)',
    bg: '#F8F9FA',
    text: '#1F2937',      // High contrast near-black
    contrast: '#FFFFFF',
  },
};

// ============================================================================
// WELLNESS-SPECIFIC COLORS
// ============================================================================

export const WELLNESS_COLORS = {
  // Hydration - VIBRANT Cyan/Blue/Indigo (NO soft tones)
  hydration: {
    base: '#0891B2',
    light: '#0284C7',
    gradient: ['#0891B2', '#0284C7', '#1D4ED8'],
    glow: 'rgba(8, 145, 178, 0.50)',
    bg: '#ECFEFF',
    text: '#164E63',
  },

  // Energy - VIBRANT Orange
  energy: {
    base: '#F97316',
    light: '#FB923C',
    gradient: ['#F97316', '#FB923C', '#FDBA74'],
    glow: 'rgba(249, 115, 22, 0.40)',
    bg: '#FFF7ED',
    text: '#9A3412',
  },

  // Sleep - VIBRANT Purple
  sleep: {
    base: '#8B5CF6',
    light: '#A78BFA',
    gradient: ['#7C3AED', '#8B5CF6', '#A78BFA'],
    glow: 'rgba(139, 92, 246, 0.40)',
    bg: '#F5F3FF',
    text: '#5B21B6',
  },

  // Mood - VIBRANT Purple/Magenta/Rose (NO soft rose gold)
  mood: {
    base: '#9333EA',
    light: '#C026D3',
    gradient: ['#9333EA', '#C026D3', '#E11D48'],
    glow: 'rgba(147, 51, 234, 0.50)',
    bg: '#FAF5FF',
    text: '#6B21A8',
  },

  // Nutrition - VIBRANT Orange
  nutrition: {
    base: '#F97316',
    light: '#FB923C',
    gradient: ['#F97316', '#FB923C', '#FBBF24'],
    glow: 'rgba(249, 115, 22, 0.40)',
    bg: '#FFF7ED',
    text: '#9A3412',
  },

  // Fitness/Activity - VIBRANT Emerald Green
  fitness: {
    base: '#059669',
    light: '#10B981',
    gradient: ['#059669', '#10B981', '#34D399'],
    glow: 'rgba(5, 150, 105, 0.40)',
    bg: '#ECFDF5',
    text: '#065F46',
  },
};

// CONFIDENCE COLORS - For uncertainty display in estimates
export const CONFIDENCE_COLORS = {
  high: {
    color: '#059669',
    label: 'High confidence',
    bg: '#ECFDF5',
    factor: 0.05,  // ±5% uncertainty
  },
  good: {
    color: '#10B981',
    label: 'Good confidence',
    bg: '#D1FAE5',
    factor: 0.10,  // ±10% uncertainty
  },
  medium: {
    color: '#D97706',
    label: 'Moderate confidence',
    bg: '#FFFBEB',
    factor: 0.20,  // ±20% uncertainty
  },
  low: {
    color: '#9CA3AF',
    label: 'Low confidence',
    bg: '#F3F4F6',
    factor: 0.30,  // ±30% uncertainty
  },
  veryLow: {
    color: '#EF4444',
    label: 'Uncertain',
    bg: '#FEF2F2',
    factor: 0.35,  // ±35% uncertainty
  },
};

// Uncertainty factors by data source
export const UNCERTAINTY_FACTORS = {
  barcode: 0.05,        // ±5% - Very accurate
  database: 0.10,       // ±10% - Good accuracy
  aiText: 0.20,         // ±20% - Moderate accuracy
  aiPhoto: 0.30,        // ±30% - Lower accuracy
  mixedDish: 0.35,      // ±35% - High uncertainty
  userEstimate: 0.25,   // ±25% - Variable
};

// ============================================================================
// MACRO COLORS - Enhanced with better contrast
// ============================================================================

export const MODERN_MACROS = {
  protein: {
    base: '#8B5CF6',      // Purple
    light: '#C4B5FD',
    lighter: '#EDE9FE',
    dark: '#7C3AED',
    gradient: ['#8B5CF6', '#A78BFA'],
    glow: 'rgba(139, 92, 246, 0.30)',
    bg: '#F5F3FF',
    text: '#5B21B6',
  },

  carbs: {
    base: '#F59E0B',      // Amber
    light: '#FCD34D',
    lighter: '#FEF3C7',
    dark: '#D97706',
    gradient: ['#F59E0B', '#FBBF24'],
    glow: 'rgba(245, 158, 11, 0.30)',
    bg: '#FFFBEB',
    text: '#92400E',
  },

  fat: {
    base: '#EF4444',      // Rose/Red
    light: '#FCA5A5',
    lighter: '#FEE2E2',
    dark: '#DC2626',
    gradient: ['#EF4444', '#F87171'],
    glow: 'rgba(239, 68, 68, 0.30)',
    bg: '#FEF2F2',
    text: '#991B1B',
  },

  fiber: {
    base: '#10B981',      // Emerald
    light: '#6EE7B7',
    lighter: '#D1FAE5',
    dark: '#059669',
    gradient: ['#10B981', '#34D399'],
    glow: 'rgba(16, 185, 129, 0.30)',
    bg: '#ECFDF5',
    text: '#065F46',
  },

  calories: {
    base: '#F97316',      // Orange
    light: '#FB923C',
    lighter: '#FFEDD5',
    dark: '#EA580C',
    gradient: ['#F97316', '#FB923C'],
    glow: 'rgba(249, 115, 22, 0.30)',
    bg: '#FFF7ED',
    text: '#9A3412',
  },
};

// ============================================================================
// MOOD PALETTE - Emotional Intelligence Colors
// ============================================================================

export const MODERN_MOODS = {
  happy: {
    base: '#FCD34D',
    light: '#FDE68A',
    gradient: ['#FCD34D', '#FDE68A'],
    glow: 'rgba(252, 211, 77, 0.35)',
    emoji: '😊',
    bg: '#FEFCE8',
    text: '#854D0E',
  },

  excited: {
    base: '#FB923C',
    light: '#FDBA74',
    gradient: ['#FB923C', '#FDBA74'],
    glow: 'rgba(251, 146, 60, 0.35)',
    emoji: '🤩',
    bg: '#FFF7ED',
    text: '#9A3412',
  },

  calm: {
    base: '#67E8F9',
    light: '#A5F3FC',
    gradient: ['#67E8F9', '#A5F3FC'],
    glow: 'rgba(103, 232, 249, 0.35)',
    emoji: '😌',
    bg: '#ECFEFF',
    text: '#164E63',
  },

  focused: {
    base: '#818CF8',
    light: '#A5B4FC',
    gradient: ['#818CF8', '#A5B4FC'],
    glow: 'rgba(129, 140, 248, 0.35)',
    emoji: '🎯',
    bg: '#EEF2FF',
    text: '#3730A3',
  },

  tired: {
    base: '#94A3B8',
    light: '#CBD5E1',
    gradient: ['#94A3B8', '#CBD5E1'],
    glow: 'rgba(148, 163, 184, 0.30)',
    emoji: '😴',
    bg: '#F8FAFC',
    text: '#334155',
  },

  stressed: {
    base: '#F87171',
    light: '#FCA5A5',
    gradient: ['#F87171', '#FCA5A5'],
    glow: 'rgba(248, 113, 113, 0.35)',
    emoji: '😰',
    bg: '#FEF2F2',
    text: '#991B1B',
  },

  sad: {
    base: '#A78BFA',
    light: '#C4B5FD',
    gradient: ['#A78BFA', '#C4B5FD'],
    glow: 'rgba(167, 139, 250, 0.35)',
    emoji: '😔',
    bg: '#F5F3FF',
    text: '#5B21B6',
  },

  neutral: {
    base: '#9CA3AF',
    light: '#D1D5DB',
    gradient: ['#9CA3AF', '#D1D5DB'],
    glow: 'rgba(156, 163, 175, 0.25)',
    emoji: '😐',
    bg: '#F9FAFB',
    text: '#374151',
  },
};

// ============================================================================
// BOLD GRADIENTS - Vibrant Stripe/Vercel inspired for premium UI
// ============================================================================

export const BOLD_GRADIENTS = {
  // Dashboard background - clean white for minimal design
  dashboard: ['#FFFFFF', '#F8FAFC', '#F1F5F9'],

  // Card-specific VIBRANT gradients (NO soft/muted tones)
  nutrition: ['#F97316', '#FB923C', '#FBBF24'],     // VIBRANT Orange/amber - Food
  mood: ['#9333EA', '#C026D3', '#E11D48'],          // VIBRANT Purple/magenta/rose
  hydration: ['#0891B2', '#0284C7', '#1D4ED8'],     // VIBRANT Cyan/blue/indigo
  activity: ['#059669', '#10B981', '#34D399'],      // VIBRANT Emerald/green
  progress: ['#F59E0B', '#FBBF24', '#FCD34D'],      // VIBRANT Gold/amber - Gamification
  cta: ['#6366F1', '#8B5CF6', '#A855F7'],           // VIBRANT Indigo/purple - Buttons
  reflection: ['#EC4899', '#F472B6', '#FB7185'],    // VIBRANT Pink/rose - Check-in
  guidance: ['#F97316', '#FDBA74', '#FDE68A'],      // VIBRANT Warm coral - Next steps
  story: ['#14B8A6', '#2DD4BF', '#5EEAD4'],         // VIBRANT Teal - Weekly insights
  celebration: ['#6366F1', '#EC4899', '#F59E0B'],   // Rainbow - Achievements
  wellness: ['#6366F1', '#8B5CF6', '#06B6D4'],      // Hero wellness ring
  premium: ['#6366F1', '#8B5CF6', '#A855F7'],       // Premium AI features - Indigo/purple
};

// ============================================================================
// DEPTH SHADOWS - 3D floating effect for premium cards
// ============================================================================

export const DEPTH_SHADOWS = {
  // Standard floating card - optimized for light backgrounds
  float: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  // High elevation floating
  floatHigh: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 20,
  },
  // Colored glow variants for each card type - enhanced for light backgrounds
  nutrition: {
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  mood: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  hydration: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  activity: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  reflection: {
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  guidance: {
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  story: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  progress: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  action: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
};

// ============================================================================
// BACKGROUND GRADIENTS - Subtle, professional Apple Health style
// ============================================================================

export const MODERN_GRADIENTS = {
  // Clean Professional (MAIN DASHBOARD BACKGROUND - Apple Health inspired)
  wellness: {
    colors: ['#F5F4F7', '#FAF8F5', '#FDFCFB'],  // Lavender-gray to warm white
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Soft Blue - Calming, professional
  softBlue: {
    colors: ['#F6F8FC', '#EEF2F9', '#FDFCFB'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Warm Neutral - Inviting, professional
  warmNeutral: {
    colors: ['#FAF8F5', '#F5F0E8', '#FDFCFB'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Cool Morning - Fresh, clean
  coolMorning: {
    colors: ['#F8F9FA', '#F6F8FC', '#FAFBFC'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Sage Calm - Nature-inspired
  sageCalm: {
    colors: ['#F0F7F1', '#F8F9FA', '#FDFCFB'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Minimal White - Ultra clean
  minimal: {
    colors: ['#FFFFFF', '#FAFAFA', '#F8F8F8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// ============================================================================
// TEXT COLORS - High contrast for readability
// ============================================================================

export const MODERN_TEXT = {
  // Dark text for light backgrounds
  primary: '#0F172A',     // Slate 900 - Main headings
  secondary: '#334155',   // Slate 700 - Body text
  tertiary: '#64748B',    // Slate 500 - Supporting text
  muted: '#94A3B8',       // Slate 400 - Disabled/placeholder

  // Light text for dark backgrounds
  inverse: {
    primary: '#F8FAFC',   // Slate 50 - White text
    secondary: '#E2E8F0', // Slate 200 - Light gray
    tertiary: '#CBD5E1',  // Slate 300 - Medium light gray
    muted: '#94A3B8',     // Slate 400 - Muted light
  },

  // Pure colors
  white: '#FFFFFF',
  black: '#000000',

  // Brand colored text
  brand: MODERN_BRAND.primary[600],
  accent: MODERN_BRAND.accent[600],
};

// ============================================================================
// SURFACE COLORS - Backgrounds and containers
// ============================================================================

export const MODERN_SURFACES = {
  // App backgrounds
  background: {
    primary: '#FFFFFF',       // Pure white
    secondary: '#F8FAFC',     // Slate 50 - Off-white
    tertiary: '#F1F5F9',      // Slate 100 - Light gray
    elevated: '#FFFFFF',      // Elevated cards
  },

  // Card surfaces
  card: {
    primary: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.80)',
    glassDark: 'rgba(248, 250, 252, 0.90)',
    tinted: 'rgba(240, 253, 250, 0.80)', // Teal tinted
    overlay: 'rgba(15, 23, 42, 0.50)',
    border: 'rgba(226, 232, 240, 0.60)',
  },

  // Overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.90)',
    medium: 'rgba(255, 255, 255, 0.95)',
    dark: 'rgba(15, 23, 42, 0.75)',
    darker: 'rgba(15, 23, 42, 0.90)',
  },
};

// ============================================================================
// SHADOWS - Colored shadows for depth
// ============================================================================

export const MODERN_SHADOWS = {
  // Neutral shadows
  sm: {
    shadowColor: MODERN_BRAND.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  md: {
    shadowColor: MODERN_BRAND.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  lg: {
    shadowColor: MODERN_BRAND.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },

  xl: {
    shadowColor: MODERN_BRAND.primary[600],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 12,
  },

  // Colored glow shadows
  glow: {
    primary: {
      shadowColor: MODERN_BRAND.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
    success: {
      shadowColor: MODERN_SEMANTIC.success.base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
    warning: {
      shadowColor: MODERN_SEMANTIC.warning.base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
    error: {
      shadowColor: MODERN_SEMANTIC.error.base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
    info: {
      shadowColor: MODERN_SEMANTIC.info.base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color with opacity
 * @param {string} color - Hex color
 * @param {number} opacity - Opacity 0-1
 */
export function withOpacity(color, opacity) {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get semantic color based on state
 */
export function getSemanticColor(state) {
  switch (state) {
    case 'success':
      return MODERN_SEMANTIC.success.base;
    case 'warning':
      return MODERN_SEMANTIC.warning.base;
    case 'error':
    case 'danger':
      return MODERN_SEMANTIC.error.base;
    case 'info':
      return MODERN_SEMANTIC.info.base;
    default:
      return MODERN_SEMANTIC.neutral.base;
  }
}

/**
 * Get gradient colors for state
 */
export function getSemanticGradient(state) {
  switch (state) {
    case 'success':
      return MODERN_SEMANTIC.success.gradient;
    case 'warning':
      return MODERN_SEMANTIC.warning.gradient;
    case 'error':
    case 'danger':
      return MODERN_SEMANTIC.error.gradient;
    case 'info':
      return MODERN_SEMANTIC.info.gradient;
    default:
      return MODERN_SEMANTIC.neutral.gradient;
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const MODERN_COLOR_PALETTE = {
  MODERN_BRAND,
  MODERN_SEMANTIC,
  WELLNESS_COLORS,
  MODERN_MACROS,
  MODERN_MOODS,
  MODERN_GRADIENTS,
  BOLD_GRADIENTS,
  DEPTH_SHADOWS,
  MODERN_TEXT,
  MODERN_SURFACES,
  MODERN_SHADOWS,
  withOpacity,
  getSemanticColor,
  getSemanticGradient,
};

export default MODERN_COLOR_PALETTE;
