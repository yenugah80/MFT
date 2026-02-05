/**
 * Premium Unified Design System
 * Glossy, trendy, user-centric theme
 * Consistent across Log, Dashboard, and Profile
 */

// PRIMARY BRAND COLORS - Vibrant Modern Style
export const BRAND = {
  primary: '#6B4EFF',        // Vibrant purple (main brand color)
  primaryLight: '#8B6EFF',   // Light purple
  primaryDark: '#5A3EE0',    // Dark purple
  secondary: '#FF6B9D',      // Vibrant pink
  secondaryLight: '#FF8DB3', // Light pink
  accent: '#00D9FF',         // Vibrant cyan
};

// BACKGROUND & SURFACES
export const SURFACES = {
  background: {
    primary: '#FBF9F7',           // Warm off-white base
    secondary: '#FFFFFF',
    tertiary: '#F5F2EF',          // Warm light
    // Soft pastel gradients for screens (playful, encouraging)
    gradient: ['#FBF9F7', '#F5F0EB', '#FDF8F5'],  // Warm cream flow
    gradientWarm: ['#FDF8F5', '#FAF5F0', '#F8F3EE'],  // Peachy warmth
    gradientCool: ['#F8FAFC', '#F1F5F9', '#EFF6F5'],  // Soft mint-blue
    gradientSunrise: ['#FDF9F6', '#FBF5EF', '#F9F1E8'],  // Morning glow
  },
  divider: '#E5E1DB',             // Warm subtle divider
  card: {
    primary: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.92)',
    glassDark: 'rgba(79, 143, 139, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    border: 'rgba(138, 127, 120, 0.08)',  // Warm border
  },
  gradient: {
    primary: ['#6B4EFF', '#8B6EFF'],      // Vibrant purple gradient
    secondary: ['#FF6B9D', '#FF8DB3'],    // Vibrant pink gradient
    accent: ['#00D9FF', '#00E5FF'],       // Vibrant cyan gradient
    success: ['#10B981', '#34D399'],      // Vibrant emerald gradient
    warning: ['#F59E0B', '#FBBF24'],      // Vibrant amber gradient
    danger: ['#EF4444', '#F87171'],       // Vibrant red gradient
    purple: ['#6B4EFF', '#8B6EFF'],       // Vibrant purple
    blue: ['#3B82F6', '#60A5FA'],         // Vibrant blue
    pink: ['#D89B7D', '#E9C4B8'],         // Muted coral
    // Professional Pastel Gradients - Apple Health inspired
    pastelPeach: ['#FAF8F5', '#F5F0E8'],  // Warm white to sand
    pastelLavender: ['#F6F8FC', '#EEF2F9'], // Soft blue-white
    pastelMint: ['#F0F7F1', '#E5F2E6'],   // Soft sage
    pastelSky: ['#F8F9FA', '#F6F8FC'],    // Cool white to blue
    pastelRose: ['#FDF8F7', '#F5DDD5'],   // Soft peach
    softPurple: ['#F6F8FC', '#DCE4F0'],   // Soft blue
    softBlue: ['#F6F8FC', '#EEF2F9'],     // Soft blue-white
    softGreen: ['#F0F7F1', '#E5F2E6'],    // Soft sage
  },
};

// TEXT HIERARCHY - WCAG AA Compliant Contrast with Premium Glossy Gradients
// Premium iridescent gradients replacing flat grays - maintains full accessibility
export const TEXT = {
  // Primary text - Deep gradient with subtle iridescence
  primary: '#2D2522',       // Fallback: Warm charcoal - friendly, readable
  primaryGradient: ['#2D2522', '#1A1815', '#3D3633'],  // Deep charcoal → Rich espresso

  // Secondary text - Medium gradient for labels
  secondary: '#5D534D',     // Fallback: Warm taupe
  secondaryGradient: ['#5D534D', '#4A4440', '#6B6360'],  // Taupe → Deep brown

  // Tertiary text - Light glossy gradient
  tertiary: '#8A7F78',      // Fallback: Warm stone
  tertiaryGradient: ['#8A7F78', '#9E9892', '#7D7A74'],  // Stone → Silver-gray

  // Muted text - Ultra-premium subtle gradient
  muted: '#B5ACA5',         // Fallback: Warm sand
  mutedGradient: ['#B5ACA5', '#A89E97', '#C5BBAF'],  // Sand → Pearl

  white: '#FFFFFF',
  onPurple: '#FFFFFF',      // Text ON purple backgrounds
  onPurpleSecondary: '#EEF5F4',
  brand: BRAND.primary,
};

// SEMANTIC COLORS - Professional, high contrast (Apple Health style)
export const SEMANTIC = {
  success: {
    base: '#6B9B76',         // Muted sage green (professional)
    light: '#A8C9A5',
    dark: '#4A7856',
    bg: '#F0F7F1',
    text: '#FFFFFF',         // White text on success backgrounds
  },
  warning: {
    base: '#D89B36',         // Muted amber (professional)
    light: '#E8B965',
    dark: '#B67F1F',
    bg: '#FDF8ED',
    text: '#FFFFFF',         // White text on warning backgrounds
  },
  danger: {
    base: '#C96B6B',         // Muted rose red (professional)
    light: '#E09B9B',
    dark: '#A84848',
    bg: '#FDF2F2',
    text: '#FFFFFF',         // White text on danger backgrounds
  },
  info: {
    base: '#6B82AD',         // Muted blue (Apple Health style)
    light: '#B9C7E0',
    dark: '#4A5F8C',
    bg: '#F6F8FC',
    text: '#FFFFFF',         // White text on info backgrounds
  },
};

// SEMANTIC ACTION COLORS - Vibrant Premium Gradients from palette
export const SEMANTIC_ACTIONS = {
  primary: '#FF8A50',     // Main actions - vibrant warm orange (CALORIES indicator)
  primaryGradient: ['#FF8A50', '#FFD700'],  // Warm orange → Gold (energetic, motivating)

  success: '#10B981',     // Goal achieved - vibrant emerald green
  successGradient: ['#10B981', '#34D399'],  // Deep emerald → Bright mint (positive)

  warning: '#F59E0B',     // Approaching limit - vibrant amber
  warningGradient: ['#F59E0B', '#FBBF24'],  // Deep amber → Light gold (caution)

  danger: '#EF4444',      // Over limit - vibrant red
  dangerGradient: ['#EF4444', '#F87171'],  // Deep red → Light rose (alert)

  info: '#00E5FF',        // Insights, informational - vibrant cyan (WATER indicator)
  infoGradient: ['#00E5FF', '#0096FF'],  // Bright cyan → Deep blue (hydration, refreshing)

  // Disabled/muted - Premium glossy gray gradient
  muted: '#C4BBB5',       // Fallback: warm muted
  mutedGradient: ['#C4BBB5', '#D4CCBE', '#A89E97'],  // Medium-light → Medium-dark
};

// CELEBRATION COLORS - For achievements and celebrations
export const CELEBRATION = {
  confetti: ['#6B4EFF', '#FF6B9D', '#00D9FF', '#10B981', '#F59E0B'],
  glow: 'rgba(107, 78, 255, 0.3)',
  sparkle: '#FFD700',
  streak: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  },
};

// NUTRISCORE COLORS - Official European NutriScore pastel gradients
export const NUTRISCORE = {
  A: {
    base: '#038141',
    light: '#85BB2F',
    gradient: ['#7BC96F', '#4CAF50'],
    pastel: ['#E8F5E9', '#C8E6C9'],
    bg: '#E8F5E9',
    text: '#1B5E20',
  },
  B: {
    base: '#85BB2F',
    light: '#A8D28C',
    gradient: ['#C5E1A5', '#AED581'],
    pastel: ['#F1F8E9', '#DCEDC8'],
    bg: '#F1F8E9',
    text: '#33691E',
  },
  C: {
    base: '#FECB02',
    light: '#FFE082',
    gradient: ['#FFE082', '#FFCA28'],
    pastel: ['#FFFDE7', '#FFF9C4'],
    bg: '#FFFDE7',
    text: '#F57F17',
  },
  D: {
    base: '#EE8100',
    light: '#FFB74D',
    gradient: ['#FFCC80', '#FFA726'],
    pastel: ['#FFF3E0', '#FFE0B2'],
    bg: '#FFF3E0',
    text: '#E65100',
  },
  E: {
    base: '#E63E11',
    light: '#EF5350',
    gradient: ['#EF9A9A', '#E57373'],
    pastel: ['#FFEBEE', '#FFCDD2'],
    bg: '#FFEBEE',
    text: '#B71C1C',
  },
};

// HEALTH SCORE COLORS - For 0-100 health ratings
export const HEALTH_SCORE = {
  excellent: { // 80-100
    gradient: ['#4CAF50', '#66BB6A'],
    pastel: ['#E8F5E9', '#C8E6C9'],
    text: '#1B5E20',
  },
  good: { // 60-79
    gradient: ['#8BC34A', '#9CCC65'],
    pastel: ['#F1F8E9', '#DCEDC8'],
    text: '#33691E',
  },
  average: { // 40-59
    gradient: ['#FFEB3B', '#FFF176'],
    pastel: ['#FFFDE7', '#FFF9C4'],
    text: '#F57F17',
  },
  poor: { // 20-39
    gradient: ['#FF9800', '#FFB74D'],
    pastel: ['#FFF3E0', '#FFE0B2'],
    text: '#E65100',
  },
  bad: { // 0-19
    gradient: ['#F44336', '#EF5350'],
    pastel: ['#FFEBEE', '#FFCDD2'],
    text: '#B71C1C',
  },
};

// TYPOGRAPHY
// Inter font family - Professional, highly legible, excellent for data-heavy UIs
// Each weight maps to its proper font file for crisp rendering
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
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Font families - Inter with proper weight variants
  // Each weight has its own font file for crisp, professional rendering
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
};

// =============================================================================
// TEXT STYLE UTILITIES - Centralized font system for consistent typography
// =============================================================================
// Use these instead of hardcoded fontFamily values throughout the app.
// This ensures Tenor Sans is used everywhere and makes weight changes easy.
// =============================================================================

/**
 * Create a text style object with proper Tenor Sans font family
 * @param {string} size - Key from TYPOGRAPHY.size (xs, sm, base, md, lg, xl, 2xl, etc.)
 * @param {string} weight - Key from TYPOGRAPHY.family (regular, medium, semibold, bold)
 * @param {string} color - Color value (defaults to TEXT.primary)
 * @returns {object} Style object with fontSize, fontFamily, and color
 */
export const createTextStyle = (size = 'base', weight = 'regular', color = TEXT.primary) => ({
  fontSize: TYPOGRAPHY.size[size] || TYPOGRAPHY.size.base,
  fontFamily: TYPOGRAPHY.family[weight] || TYPOGRAPHY.family.regular,
  color,
});

/**
 * Pre-defined text styles for common use cases
 * Import and spread these in your StyleSheet for consistent typography
 *
 * TYPOGRAPHY HIERARCHY (use consistently):
 * ─────────────────────────────────────────
 * DISPLAY    → Hero sections, main screen titles (Bold, 32-48px)
 * HEADING    → Section headers, card titles (Bold/SemiBold, 18-24px)
 * SUBHEADING → Subsection titles, secondary headers (SemiBold/Medium, 15-16px)
 * BODY       → Paragraphs, descriptions (Regular, 13-16px)
 * LABEL      → Buttons, chips, tags (Medium/SemiBold, 11-16px)
 * CAPTION    → Metadata, timestamps, hints (Regular, 11px)
 * NUMERIC    → Stats, values, metrics (Bold, various sizes)
 */
export const TEXT_STYLES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY STYLES - Hero text, main screen titles, prominent headings
  // Use for: Dashboard greeting, screen titles, hero metrics
  // ═══════════════════════════════════════════════════════════════════════════
  displayLarge: {
    fontSize: TYPOGRAPHY.size['5xl'],  // 40px
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.8,
    lineHeight: TYPOGRAPHY.size['5xl'] * TYPOGRAPHY.lineHeight.tight,
  },
  displayMedium: {
    fontSize: TYPOGRAPHY.size['4xl'],  // 32px
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.5,
    lineHeight: TYPOGRAPHY.size['4xl'] * TYPOGRAPHY.lineHeight.tight,
  },
  displaySmall: {
    fontSize: TYPOGRAPHY.size['3xl'],  // 28px
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3,
    lineHeight: TYPOGRAPHY.size['3xl'] * TYPOGRAPHY.lineHeight.tight,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADING STYLES - Section titles, card headers
  // Use for: Card titles, section headers, modal titles
  // ═══════════════════════════════════════════════════════════════════════════
  headingLarge: {
    fontSize: TYPOGRAPHY.size['2xl'],  // 24px
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.2,
    lineHeight: TYPOGRAPHY.size['2xl'] * TYPOGRAPHY.lineHeight.snug,
  },
  headingMedium: {
    fontSize: TYPOGRAPHY.size.xl,      // 20px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.xl * TYPOGRAPHY.lineHeight.snug,
  },
  headingSmall: {
    fontSize: TYPOGRAPHY.size.lg,      // 18px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.lg * TYPOGRAPHY.lineHeight.snug,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBHEADING STYLES - Secondary headers, subsection titles
  // Use for: Subsections within cards, list group headers, field labels
  // ═══════════════════════════════════════════════════════════════════════════
  subheadingLarge: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.md * TYPOGRAPHY.lineHeight.snug,
  },
  subheadingMedium: {
    fontSize: TYPOGRAPHY.size.base,    // 15px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.base * TYPOGRAPHY.lineHeight.snug,
  },
  subheadingSmall: {
    fontSize: TYPOGRAPHY.size.sm,      // 13px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.secondary,
    lineHeight: TYPOGRAPHY.size.sm * TYPOGRAPHY.lineHeight.snug,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BODY STYLES - Paragraphs, descriptions, general content
  // Use for: Descriptions, explanations, long-form text
  // ═══════════════════════════════════════════════════════════════════════════
  bodyLarge: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.md * TYPOGRAPHY.lineHeight.normal,
  },
  bodyMedium: {
    fontSize: TYPOGRAPHY.size.base,    // 15px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.base * TYPOGRAPHY.lineHeight.normal,
  },
  bodySmall: {
    fontSize: TYPOGRAPHY.size.sm,      // 13px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.secondary,
    lineHeight: TYPOGRAPHY.size.sm * TYPOGRAPHY.lineHeight.normal,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LABEL STYLES - Buttons, chips, tags, interactive elements
  // Use for: Button text, chip labels, tab labels, navigation items
  // ═══════════════════════════════════════════════════════════════════════════
  labelLarge: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: TYPOGRAPHY.size.base,    // 15px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.primary,
  },
  labelSmall: {
    fontSize: TYPOGRAPHY.size.sm,      // 13px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.secondary,
  },
  labelTiny: {
    fontSize: TYPOGRAPHY.size.xs,      // 11px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.tertiary,
    letterSpacing: 0.2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPTION STYLES - Metadata, timestamps, hints, tertiary info
  // Use for: Timestamps, helper text, footnotes, attribution
  // ═══════════════════════════════════════════════════════════════════════════
  caption: {
    fontSize: TYPOGRAPHY.size.xs,      // 11px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.tertiary,
    lineHeight: TYPOGRAPHY.size.xs * TYPOGRAPHY.lineHeight.normal,
  },
  captionMedium: {
    fontSize: TYPOGRAPHY.size.xs,      // 11px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  captionBold: {
    fontSize: TYPOGRAPHY.size.xs,      // 11px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.secondary,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMERIC STYLES - Stats, values, metrics, data display
  // Use for: Calorie counts, percentages, scores, measurements
  // ═══════════════════════════════════════════════════════════════════════════
  numericHero: {
    fontSize: TYPOGRAPHY.size['5xl'],  // 40px - Main dashboard stat
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -1,
  },
  numericLarge: {
    fontSize: TYPOGRAPHY.size['3xl'],  // 28px
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  numericMedium: {
    fontSize: TYPOGRAPHY.size.xl,      // 20px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
  },
  numericSmall: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
  },
  numericTiny: {
    fontSize: TYPOGRAPHY.size.sm,      // 13px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: TEXT.secondary,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL STYLES - Specific use cases
  // ═══════════════════════════════════════════════════════════════════════════
  // Card title - Use for all card headers consistently
  cardTitle: {
    fontSize: TYPOGRAPHY.size.lg,      // 18px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.size.lg * TYPOGRAPHY.lineHeight.snug,
  },
  // Card subtitle - Secondary info below card title
  cardSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,      // 13px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.tertiary,
    lineHeight: TYPOGRAPHY.size.sm * TYPOGRAPHY.lineHeight.normal,
  },
  // Button text - Primary buttons
  buttonPrimary: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.white,
    letterSpacing: 0.2,
  },
  // Button text - Secondary buttons
  buttonSecondary: {
    fontSize: TYPOGRAPHY.size.base,    // 15px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
    color: BRAND.primary,
  },
  // Tab bar label
  tabLabel: {
    fontSize: TYPOGRAPHY.size.xs,      // 11px
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: '500',
  },
  // Input field text
  inputText: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.primary,
  },
  // Input placeholder
  inputPlaceholder: {
    fontSize: TYPOGRAPHY.size.md,      // 16px
    fontFamily: TYPOGRAPHY.family.regular,
    fontWeight: '400',
    color: TEXT.muted,
  },
};

// SPACING (4pt grid)
export const SPACING = {
  0: 0,
  0.5: 2,    // Half-step for fine adjustments
  1: 4,
  1.5: 6,    // 1.5x step
  2: 8,
  2.5: 10,   // 2.5x step
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

// BORDER RADIUS
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

// PREMIUM SHADOWS - Subtle, warm (playful, encouraging)
export const SHADOWS = {
  sm: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3D3633',    // Warm shadow (friendly feel)
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3D3633',    // Warm shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3D3633',    // Warm shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 6,
  },
  xl: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3D3633',    // Warm shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  // Subtle colored glows for emphasis (professional tone)
  success: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6B9B76',    // Sage green glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  warning: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#D89B36',    // Muted amber glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  danger: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#C96B6B',    // Muted red glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  info: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6B82AD',    // Professional blue glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ICON SIZES
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
};

// PREMIUM CARD RECIPE
export const PREMIUM_CARD = {
  backgroundColor: SURFACES.card.primary,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(43, 93, 255, 0.12)',
  padding: SPACING[4],
  ...SHADOWS.md,
};

// GLASS CARD RECIPE
export const GLASS_CARD = {
  backgroundColor: SURFACES.card.glass,
  borderRadius: RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(43, 93, 255, 0.15)',
  padding: SPACING[4],
  ...SHADOWS.sm,
};

// GRADIENT BUTTON RECIPE
export const GRADIENT_BUTTON = {
  borderRadius: RADIUS.lg,
  paddingVertical: SPACING[3],
  paddingHorizontal: SPACING[5],
  alignItems: 'center',
  justifyContent: 'center',
  ...SHADOWS.md,
};

// =============================================================================
// STANDARDIZED CARD SYSTEM - Use consistently across ALL dashboard cards
// =============================================================================
// Design Philosophy: "Calm Luxury" - Oura Ring, Apple Health, Linear inspired
// - Brand-tinted shadows (not black)
// - Consistent radius and spacing
// - Three tiers: hero (50% viewport), standard (most cards), compact (tiles)
// =============================================================================

export const CARD_SYSTEM = {
  // HERO CARD - Primary metric, demands attention (e.g., Wellness Score)
  hero: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],        // 24px - generous rounding
    padding: SPACING[5],                // 20px - breathing room
    marginBottom: SPACING[3],           // 12px - tighter spacing
    borderWidth: 1,
    borderColor: 'rgba(138, 127, 120, 0.12)',  // Warm subtle border
    shadowColor: '#3D3633',             // Warm shadow (friendly)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },

  // STANDARD CARD - Most dashboard cards (calendar, meals, achievements)
  standard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,            // 20px
    padding: SPACING[4],                // 16px
    marginBottom: SPACING[3],           // 12px - tighter spacing
    borderWidth: 1,
    borderColor: 'rgba(138, 127, 120, 0.10)',  // Warm subtle border
    shadowColor: '#3D3633',             // Warm shadow (friendly)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },

  // COMPACT CARD - Small tiles, quick stats, glassmorphism
  compact: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.xl,            // 20px
    padding: SPACING[3],                // 12px
    marginBottom: SPACING[3],           // 12px
    borderWidth: 1,
    borderColor: 'rgba(138, 127, 120, 0.08)',  // Warm subtle border
    shadowColor: '#3D3633',             // Warm shadow (friendly)
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // INTERACTIVE STATES - Apply when card is pressed/focused
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.03,
  },

  // ELEVATED - For modals, bottom sheets, overlays
  elevated: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 0,
    shadowColor: '#3D3633',             // Warm shadow (friendly)
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ANIMATION TIMINGS
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    tension: 300,
    friction: 20,
  },
};

// MACRO COLORS (consistent with dashboard)
export const MACRO_COLORS = {
  protein: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  carbs: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  fat: {
    base: '#E7B7B1',
    light: '#F6D7CC',
    gradient: ['#E7B7B1', '#F6D7CC'],
  },
  fiber: {
    base: '#B9B4E7',
    light: '#D9D5F2',
    gradient: ['#B9B4E7', '#D9D5F2'],
  },
};

// MOOD COLORS (8 core moods for premium MoodTracker)
// VIBRANT GLOWY colors - Premium look like legacy design, NO muted/grayish tones
export const MOOD_PALETTE = {
  happy: {
    base: '#FBBF24',      // VIBRANT amber/gold
    light: '#FCD34D',
    dark: '#F59E0B',
    bg: '#FFFBEB',
    gradient: ['#FBBF24', '#FCD34D', '#FDE68A'],
  },
  calm: {
    base: '#06B6D4',      // VIBRANT cyan (legacy glowy)
    light: '#22D3EE',
    dark: '#0891B2',
    bg: '#ECFEFF',
    gradient: ['#06B6D4', '#22D3EE', '#67E8F9'],
  },
  focused: {
    base: '#8B5CF6',      // VIBRANT purple
    light: '#A78BFA',
    dark: '#7C3AED',
    bg: '#F5F3FF',
    gradient: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
  },
  energized: {
    base: '#10B981',      // VIBRANT emerald green (legacy glowy)
    light: '#34D399',
    dark: '#059669',
    bg: '#ECFDF5',
    gradient: ['#10B981', '#34D399', '#6EE7B7'],
  },
  neutral: {
    base: '#3B82F6',      // VIBRANT blue (legacy glowy - NO gray)
    light: '#60A5FA',
    dark: '#2563EB',
    bg: '#EFF6FF',
    gradient: ['#3B82F6', '#60A5FA', '#93C5FD'],
  },
  tired: {
    base: '#C084FC',      // Soft orchid/lavender - dreamy, low-energy
    light: '#E9D5FF',
    dark: '#A855F7',
    bg: '#FAF5FF',
    gradient: ['#C084FC', '#D8B4FE', '#E9D5FF'],
  },
  stressed: {
    base: '#DC2626',      // True red - serious tension, not cheerful
    light: '#FCA5A5',
    dark: '#B91C1C',
    bg: '#FEF2F2',
    gradient: ['#DC2626', '#EF4444', '#F87171'],
  },
  sad: {
    base: '#2563EB',      // VIBRANT royal blue - deeper, melancholic
    light: '#60A5FA',
    dark: '#1D4ED8',
    bg: '#EFF6FF',
    gradient: ['#2563EB', '#3B82F6', '#60A5FA'],
  },
  // Future expansion (Phase 4+): angry, anxious, excited, relaxed
};

// VIBRANT WELLNESS COLORS - For dashboard cards (NO soft tones)
export const VIBRANT_WELLNESS = {
  // Mood Card - VIBRANT purple/magenta/rose
  mood: {
    gradient: ['#9333EA', '#C026D3', '#E11D48'],
    solid: '#9333EA',
    glow: 'rgba(147, 51, 234, 0.5)',
    shadow: '#9333EA',
  },
  // Hydration Card - VIBRANT cyan/blue/indigo
  hydration: {
    gradient: ['#0891B2', '#0284C7', '#1D4ED8'],
    solid: '#0891B2',
    glow: 'rgba(8, 145, 178, 0.5)',
    shadow: '#0891B2',
  },
  // Food/Nutrition - VIBRANT orange
  nutrition: {
    gradient: ['#F97316', '#FB923C', '#FBBF24'],
    solid: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    shadow: '#EA580C',
  },
  // Activity - VIBRANT green
  activity: {
    gradient: ['#059669', '#10B981', '#34D399'],
    solid: '#059669',
    glow: 'rgba(5, 150, 105, 0.4)',
    shadow: '#059669',
  },
  // Sleep - VIBRANT indigo/purple
  sleep: {
    gradient: ['#6366F1', '#8B5CF6', '#A78BFA'],
    solid: '#6366F1',
    glow: 'rgba(99, 102, 241, 0.4)',
    shadow: '#6366F1',
  },
  // Stress - VIBRANT amber/orange
  stress: {
    gradient: ['#F59E0B', '#FBBF24', '#FCD34D'],
    solid: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.4)',
    shadow: '#F59E0B',
  },
};

// CONFIDENCE INDICATOR COLORS - For uncertainty display
export const CONFIDENCE_COLORS = {
  high: {
    color: '#059669',     // Emerald green
    label: 'High confidence',
    bg: '#ECFDF5',
  },
  medium: {
    color: '#D97706',     // Amber
    label: 'Moderate confidence',
    bg: '#FFFBEB',
  },
  low: {
    color: '#B5ACA5',     // Warm gray (encouraging)
    label: 'Low confidence',
    bg: '#F7F5F4',
  },
  veryLow: {
    color: '#EF4444',     // Red
    label: 'Uncertain',
    bg: '#FEF2F2',
  },
};

// FOOD QUALITY GRADE COLORS
export const GRADE_COLORS = {
  A: { color: '#059669', bg: '#ECFDF5', label: 'Excellent' },
  B: { color: '#84CC16', bg: '#F7FEE7', label: 'Good' },
  C: { color: '#EAB308', bg: '#FEFCE8', label: 'Average' },
  D: { color: '#F97316', bg: '#FFF7ED', label: 'Below Average' },
  E: { color: '#EF4444', bg: '#FEF2F2', label: 'Occasional Choice' },
};

// ENERGY LEVEL COLORS
export const ENERGY_PALETTE = {
  veryHigh: {
    color: '#F1C6A8',
    label: 'Very High',
    range: [9, 10],
  },
  high: {
    color: '#A8C9B6',
    label: 'High',
    range: [7, 8],
  },
  medium: {
    color: '#8FA0E6',
    label: 'Medium',
    range: [5, 6],
  },
  low: {
    color: '#E7B7B1',
    label: 'Low',
    range: [3, 4],
  },
  veryLow: {
    color: '#B9B4E7',
    label: 'Very Low',
    range: [1, 2],
  },
};

// CORRELATION STRENGTH COLORS (for meal-mood correlations)
export const CORRELATION_COLORS = {
  strong: {
    base: '#A8C9B6',
    light: '#D6EFE6',
    label: 'Strong',
    gradient: ['#A8C9B6', '#D6EFE6'],
  },
  moderate: {
    base: '#8FA0E6',
    light: '#C8D2F5',
    label: 'Moderate',
    gradient: ['#8FA0E6', '#C8D2F5'],
  },
  weak: {
    base: '#E7B7B1',
    light: '#F6D7CC',
    label: 'Weak',
    gradient: ['#E7B7B1', '#F6D7CC'],
  },
  none: {
    base: '#A9A099',      // Warm stone
    light: '#CCC6C1',
    label: 'None',
    gradient: ['#A9A099', '#CCC6C1'],
  },
};

// ICON NAMES MAPPING (Ionicons)
export const ICONS = {
  // Navigation
  dashboard: 'stats-chart',
  log: 'restaurant',
  profile: 'person',

  // Food & Nutrition
  food: 'fast-food',
  meal: 'restaurant-outline',
  breakfast: 'sunny',
  lunch: 'partly-sunny',
  dinner: 'moon',
  snack: 'ice-cream',
  water: 'water',

  // Macros
  protein: 'barbell',
  carbs: 'nutrition',
  fat: 'flame',
  fiber: 'leaf',
  calories: 'flame-outline',

  // Input modes
  text: 'create',
  photo: 'camera',
  voice: 'mic',
  barcode: 'barcode',

  // Actions
  add: 'add-circle',
  remove: 'close-circle',
  edit: 'create-outline',
  save: 'checkmark-circle',
  cancel: 'close',
  delete: 'trash',
  search: 'search',
  filter: 'funnel',
  refresh: 'refresh',

  // Mood & Health
  mood: 'happy',
  moodGreat: 'happy-outline',
  moodGood: 'happy-outline',
  moodOkay: 'sad-outline',
  moodBad: 'sad-outline',
  weight: 'scale',
  activity: 'walk',

  // UI Elements
  info: 'information-circle',
  warning: 'warning',
  success: 'checkmark-circle',
  error: 'close-circle',
  star: 'star',
  heart: 'heart',
  fire: 'flame',
  trophy: 'trophy',
  time: 'time',
  calendar: 'calendar',
  chart: 'bar-chart',
  settings: 'settings',
  logout: 'log-out',

  // Arrows & Navigation
  back: 'arrow-back',
  forward: 'arrow-forward',
  up: 'chevron-up',
  down: 'chevron-down',
  left: 'chevron-back',
  right: 'chevron-forward',
};

// PREMIUM SKELETON LOADERS - Glossy gradient animations
export const SKELETON_GRADIENTS = {
  // Premium shimmer effect - Iridescent white to pearl
  shimmer: ['#F0EEE8', '#FFFFFF', '#F5F2ED'],
  // Deep loading gradient - Sophisticated gray animation
  deepShimmer: ['#E5E1DB', '#F0ECEA', '#DBD6D0'],
  // Premium blue loading
  blueShimmer: ['#E0E6F0', '#F0F5FC', '#E8EEF6'],
  // Warm glow loading
  warmShimmer: ['#F5F0EA', '#FFFBF7', '#F0E8E0'],
  // Glossy pearl gradient
  pearlShimmer: ['#E8E6E2', '#F8F7F5', '#E0DDDA'],
  // Metal effect loading
  metalShimmer: ['#D8D4CE', '#F0EFED', '#D0CCCA'],
};

// GLOSSY BACKGROUND GRADIENTS - Premium smooth transitions
export const GLOSSY_BACKGROUNDS = {
  // Soft white with iridescent tint
  glossyWhite: ['#FFFFFF', '#FEFDFB', '#FFFFFF'],
  // Premium warm cream
  glossyCream: ['#FDF9F7', '#FEFBF8', '#F9F5F0'],
  // Subtle pearl effect
  glossyPearl: ['#F8F7F6', '#FFFFFF', '#F5F4F2'],
  // Elegant neutral
  glossyNeutral: ['#F2F0ED', '#FCFBFA', '#EBE9E6'],
};

// HELPER: Get semantic color based on state
export const getSemanticColor = (state) => {
  switch (state) {
    case 'success':
    case 'good':
      return SEMANTIC.success.base;
    case 'warning':
    case 'warn':
      return SEMANTIC.warning.base;
    case 'danger':
    case 'error':
    case 'over':
      return SEMANTIC.danger.base;
    case 'info':
    case 'neutral':
    default:
      return SEMANTIC.info.base;
  }
};

// HELPER: Get gradient for state
export const getSemanticGradient = (state) => {
  switch (state) {
    case 'success':
    case 'good':
      return SURFACES.gradient.success;
    case 'warning':
    case 'warn':
      return SURFACES.gradient.warning;
    case 'danger':
    case 'error':
      return SURFACES.gradient.danger;
    case 'info':
    case 'neutral':
    default:
      return SURFACES.gradient.primary;
  }
};

// HELPER: Format percentage
export const formatPercent = (ratio) => {
  if (ratio === null || ratio === undefined) return '0%';
  const percent = Math.round(ratio * 100);
  return percent > 150 ? '150%+' : `${percent}%`;
};

// HELPER: Format number
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
};

// HELPER: Map old muted colors to new vibrant SEMANTIC_ACTIONS colors
// Use this to systematically replace all muted blues/grays with vibrant colors
export const getMutedToVibrantColor = (type = 'primary') => {
  const colorMap = {
    'primary': SEMANTIC_ACTIONS.primaryGradient,      // Orange-to-gold for primary actions
    'success': SEMANTIC_ACTIONS.successGradient,      // Emerald-to-mint for success
    'info': SEMANTIC_ACTIONS.infoGradient,            // Cyan-to-blue for info/water
    'warning': SEMANTIC_ACTIONS.warningGradient,      // Amber-to-gold for warnings
    'danger': SEMANTIC_ACTIONS.dangerGradient,        // Red-to-rose for danger
    'calories': SEMANTIC_ACTIONS.primaryGradient,     // Orange-to-gold for calories
    'water': SEMANTIC_ACTIONS.infoGradient,           // Cyan-to-blue for water
    'protein': ['#8FA0E6', '#C8D2F5'],                // Blue for protein (MACRO_COLORS.protein)
    'carbs': ['#A8C9B6', '#D6EFE6'],                  // Green for carbs (MACRO_COLORS.carbs)
    'fat': ['#E7B7B1', '#F6D7CC'],                    // Peachy for fat (MACRO_COLORS.fat)
    'fiber': ['#B9B4E7', '#D9D5F2'],                  // Purple for fiber (MACRO_COLORS.fiber)
  };
  return colorMap[type] || SEMANTIC_ACTIONS.primaryGradient;
};

// HELPER: Get solid vibrant color (first color from gradient, good for solid fills)
export const getMutedToVibrantSolid = (type = 'primary') => {
  const gradient = getMutedToVibrantColor(type);
  return Array.isArray(gradient) ? gradient[0] : gradient;
};

// Export all
export const PREMIUM_THEME = {
  BRAND,
  SURFACES,
  TEXT,
  SEMANTIC,
  SEMANTIC_ACTIONS,
  CELEBRATION,
  TYPOGRAPHY,
  TEXT_STYLES,
  createTextStyle,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  PREMIUM_CARD,
  GLASS_CARD,
  GRADIENT_BUTTON,
  CARD_SYSTEM,
  ANIMATION,
  MACRO_COLORS,
  MOOD_PALETTE,
  ENERGY_PALETTE,
  CORRELATION_COLORS,
  ICONS,
  VIBRANT_WELLNESS,
  CONFIDENCE_COLORS,
  GRADE_COLORS,
  NUTRISCORE,
  HEALTH_SCORE,
  SKELETON_GRADIENTS,
  GLOSSY_BACKGROUNDS,
};

export default PREMIUM_THEME;
