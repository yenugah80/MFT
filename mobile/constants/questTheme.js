/**
 * Quest Theme - Modern Classic Pastel Edition
 *
 * A sophisticated, beautiful pastel color system for the Treasure Quest experience.
 * Design principles:
 * 1. SOFTNESS - Gentle, calming pastels that feel premium
 * 2. HARMONY - Colors that work together seamlessly
 * 3. MODERN CLASSIC - Timeless elegance with contemporary flair
 * 4. ACCESSIBILITY - All colors meet WCAG contrast requirements
 * 5. WARMTH - Inviting colors that feel personal
 */

// ============================================================================
// PASTEL PALETTE - The Foundation
// Modern, classic, beautiful pastels with depth
// ============================================================================

export const QUEST_PALETTE = {
  // Soft Ocean - Serene, calming waters
  ocean: {
    50: '#F0FDFF',
    100: '#E0F7FA',
    200: '#B2EBF2',
    300: '#80DEEA',
    400: '#4DD0E1',
    500: '#26C6DA',  // Primary - soft cyan
    600: '#00ACC1',
    700: '#0097A7',
    800: '#00838F',
    900: '#006064',
    950: '#004D40',
  },

  // Warm Peach - Gentle, welcoming warmth
  peach: {
    50: '#FFF8F5',
    100: '#FFEDE5',
    200: '#FFD7C7',
    300: '#FFBFA3',
    400: '#FFA77F',
    500: '#FF8F5C',  // Primary - soft peach
    600: '#FF7043',
    700: '#F4511E',
    800: '#E64A19',
    900: '#D84315',
    950: '#BF360C',
  },

  // Lavender Dreams - Elegant, sophisticated purple
  lavender: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // Primary - soft lavender
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#3B0764',
  },

  // Mint Fresh - Clean, refreshing green
  mint: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',  // Primary - soft mint
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  // Rose Blush - Soft, romantic pink
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',  // Primary - soft rose
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
    950: '#4C0519',
  },

  // Golden Sand - Warm, luxurious gold
  sand: {
    50: '#FFFBF0',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // Primary - soft gold
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Soft Gray - Neutral, sophisticated
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
};

// ============================================================================
// PREMIUM PASTEL GRADIENTS - Multi-stop beauty
// ============================================================================

export const QUEST_GRADIENTS = {
  // Main header - Soft sky gradient
  skyDream: ['#E0F7FA', '#B2EBF2', '#80DEEA'],
  oceanMist: ['#B2EBF2', '#80DEEA', '#4DD0E1'],

  // Treasure/Gold gradients - Warm and luxurious
  goldenHour: ['#FEF3C7', '#FDE68A', '#FCD34D'],
  sunsetGlow: ['#FFEDE5', '#FFD7C7', '#FFBFA3'],
  warmSand: ['#FDE68A', '#FBBF24', '#F59E0B'],

  // Island gradients - Beautiful pastel destinations
  islands: {
    starter: ['#E0F7FA', '#B2EBF2', '#80DEEA'],      // Soft cyan lagoon
    builder: ['#FEF3C7', '#FDE68A', '#FBBF24'],      // Warm golden beach
    tracker: ['#FFEDE5', '#FFD7C7', '#FF8F5C'],      // Peach sunset
    storm: ['#EDE9FE', '#DDD6FE', '#A78BFA'],        // Lavender mist
    reef: ['#DCFCE7', '#BBF7D0', '#4ADE80'],         // Fresh mint
    harbor: ['#E0F7FA', '#B2EBF2', '#26C6DA'],       // Tropical teal
    treasure: ['#FEF3C7', '#EDE9FE', '#FFE4E6'],     // Rainbow treasure
  },

  // Status gradients - Soft feedback
  success: ['#DCFCE7', '#BBF7D0', '#86EFAC'],
  warning: ['#FEF3C7', '#FDE68A', '#FCD34D'],
  info: ['#E0F7FA', '#B2EBF2', '#80DEEA'],

  // Glass morphism - Elegant overlays
  glass: {
    light: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
    soft: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)'],
    pastel: ['rgba(224,247,250,0.6)', 'rgba(178,235,242,0.4)'],
  },

  // Card backgrounds - Subtle warmth
  card: {
    warm: ['#FFFBF0', '#FFF8F5'],
    cool: ['#F0FDFF', '#F0FDF4'],
    neutral: ['#FAFAFA', '#F5F5F5'],
  },
};

// ============================================================================
// CHEST RARITY SYSTEM - Pastel treasure visualization
// ============================================================================

export const CHEST_RARITY = {
  common: {
    name: 'Common',
    colors: {
      primary: '#A3A3A3',
      secondary: '#737373',
      light: '#E5E5E5',
      glow: 'rgba(163,163,163,0.2)',
    },
    gradient: ['#E5E5E5', '#D4D4D4', '#A3A3A3'],
    borderGradient: ['#F5F5F5', '#E5E5E5'],
    icon: '📦',
    sparkle: false,
  },
  rare: {
    name: 'Rare',
    colors: {
      primary: '#26C6DA',
      secondary: '#00ACC1',
      light: '#E0F7FA',
      glow: 'rgba(38,198,218,0.25)',
    },
    gradient: ['#80DEEA', '#4DD0E1', '#26C6DA'],
    borderGradient: ['#B2EBF2', '#80DEEA'],
    icon: '💫',
    sparkle: true,
  },
  epic: {
    name: 'Epic',
    colors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      light: '#EDE9FE',
      glow: 'rgba(139,92,246,0.3)',
    },
    gradient: ['#C4B5FD', '#A78BFA', '#8B5CF6'],
    borderGradient: ['#DDD6FE', '#C4B5FD'],
    icon: '✨',
    sparkle: true,
  },
  legendary: {
    name: 'Legendary',
    colors: {
      primary: '#F59E0B',
      secondary: '#D97706',
      light: '#FEF3C7',
      glow: 'rgba(245,158,11,0.35)',
    },
    gradient: ['#FDE68A', '#FCD34D', '#FBBF24'],
    borderGradient: ['#FEF3C7', '#FDE68A'],
    icon: '👑',
    sparkle: true,
    animated: true,
  },
};

// ============================================================================
// QUEST STATUS COLORS - Soft feedback
// ============================================================================

export const QUEST_STATUS = {
  pending: {
    bg: QUEST_PALETTE.neutral[100],
    border: QUEST_PALETTE.neutral[200],
    text: QUEST_PALETTE.neutral[600],
    icon: QUEST_PALETTE.neutral[400],
    gradient: ['#F5F5F5', '#E5E5E5'],
  },
  active: {
    bg: QUEST_PALETTE.ocean[50],
    border: QUEST_PALETTE.ocean[200],
    text: QUEST_PALETTE.ocean[700],
    icon: QUEST_PALETTE.ocean[500],
    gradient: ['#E0F7FA', '#B2EBF2'],
  },
  completed: {
    bg: QUEST_PALETTE.mint[50],
    border: QUEST_PALETTE.mint[200],
    text: QUEST_PALETTE.mint[700],
    icon: QUEST_PALETTE.mint[500],
    gradient: ['#DCFCE7', '#BBF7D0'],
  },
};

// ============================================================================
// XP & LEVEL COLORS - Beautiful progress
// ============================================================================

export const XP_COLORS = {
  ring: {
    track: 'rgba(255,255,255,0.3)',
    progress: ['#FDE68A', '#FBBF24'],
    glow: 'rgba(251,191,36,0.3)',
  },
  bar: {
    track: 'rgba(255,255,255,0.25)',
    fill: ['#FDE68A', '#FCD34D', '#FBBF24'],
  },
  text: {
    value: '#FFFBF0',
    label: 'rgba(255,255,255,0.85)',
  },
};

// ============================================================================
// CAPTAIN CHARACTER COLORS - Warm and friendly
// ============================================================================

export const CAPTAIN_COLORS = {
  avatar: {
    bg: ['#FEF3C7', '#FDE68A'],
    border: QUEST_PALETTE.sand[300],
  },
  bubble: {
    bg: '#F0FDFF',
    border: QUEST_PALETTE.ocean[100],
    pointer: '#F0FDFF',
    title: QUEST_PALETTE.ocean[600],
    text: QUEST_PALETTE.neutral[600],
  },
  streak: {
    bg: QUEST_PALETTE.peach[100],
    text: QUEST_PALETTE.peach[700],
    icon: '🔥',
  },
};

// ============================================================================
// WEEKLY CHALLENGE COLORS - Premium purple
// ============================================================================

export const WEEKLY_COLORS = {
  card: ['#C4B5FD', '#A78BFA', '#8B5CF6'],
  accent: QUEST_PALETTE.sand[400],
  progress: {
    track: 'rgba(255,255,255,0.25)',
    fill: QUEST_PALETTE.sand[300],
  },
  reward: {
    bg: 'rgba(255,255,255,0.2)',
    text: '#FEF3C7',
  },
  text: {
    title: '#FFFFFF',
    description: 'rgba(255,255,255,0.9)',
    progress: 'rgba(255,255,255,0.75)',
  },
};

// ============================================================================
// MAP VISUALIZATION COLORS - Soft and dreamy
// ============================================================================

export const MAP_COLORS = {
  ocean: ['#E0F7FA', '#B2EBF2', '#80DEEA'],
  waves: 'rgba(255,255,255,0.4)',
  path: {
    incomplete: 'rgba(255,255,255,0.5)',
    complete: QUEST_PALETTE.sand[400],
  },
  ship: {
    wake: 'rgba(255,255,255,0.6)',
  },
  island: {
    locked: ['#E5E5E5', '#D4D4D4'],
    current: {
      border: QUEST_PALETTE.sand[400],
      shadow: 'rgba(251,191,36,0.3)',
    },
  },
};

// ============================================================================
// TYPOGRAPHY COLORS - Clear and readable
// ============================================================================

export const QUEST_TEXT = {
  // On light backgrounds
  light: {
    primary: QUEST_PALETTE.neutral[800],
    secondary: QUEST_PALETTE.neutral[600],
    tertiary: QUEST_PALETTE.neutral[500],
    muted: QUEST_PALETTE.neutral[400],
  },
  // On dark/colored backgrounds
  dark: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.92)',
    tertiary: 'rgba(255,255,255,0.8)',
    muted: 'rgba(255,255,255,0.65)',
  },
  // Accent text colors
  accent: {
    gold: QUEST_PALETTE.sand[600],
    ocean: QUEST_PALETTE.ocean[600],
    success: QUEST_PALETTE.mint[600],
    lavender: QUEST_PALETTE.lavender[600],
  },
};

// ============================================================================
// SHADOWS - Soft and elegant
// ============================================================================

export const QUEST_SHADOWS = {
  sm: {
    shadowColor: QUEST_PALETTE.neutral[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: QUEST_PALETTE.neutral[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: QUEST_PALETTE.neutral[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    gold: {
      shadowColor: QUEST_PALETTE.sand[400],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    ocean: {
      shadowColor: QUEST_PALETTE.ocean[400],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

// ============================================================================
// BORDER RADIUS - Soft and friendly
// ============================================================================

export const QUEST_RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 9999,
};

// ============================================================================
// SCREEN BACKGROUNDS - Clean and airy
// ============================================================================

export const QUEST_BACKGROUNDS = {
  main: '#F5FDFF',  // Very soft cyan tint
  card: '#FFFFFF',
  section: QUEST_PALETTE.neutral[50],
};

export default {
  QUEST_PALETTE,
  QUEST_GRADIENTS,
  CHEST_RARITY,
  QUEST_STATUS,
  XP_COLORS,
  CAPTAIN_COLORS,
  WEEKLY_COLORS,
  MAP_COLORS,
  QUEST_TEXT,
  QUEST_SHADOWS,
  QUEST_RADIUS,
  QUEST_BACKGROUNDS,
};
