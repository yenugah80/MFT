/**
 * ULTRA-LUXURY DESIGN SYSTEM
 * Rich, intensive, premium glossy design for maximum visual impact
 * Inspired by: Amex Platinum, Revolut Metal, Bentley, Rolex, High-end fintech
 */

// ============================================================================
// METALLIC & PRECIOUS COLORS
// ============================================================================

export const METALLIC = {
  // Platinum & Silver
  platinum: '#E5E4E2',
  platinumDark: '#C0C0C0',
  silver: '#C9C9C9',
  silverShine: '#F0F0F0',

  // Gold variants
  gold: '#FFD700',
  goldRich: '#FDB931',
  goldDeep: '#D4AF37',
  champagneGold: '#F7E7CE',
  roseGold: '#ECC5C0',
  roseGoldDeep: '#B76E79',

  // Bronze & Copper
  bronze: '#CD7F32',
  bronzeRich: '#B87333',
  copper: '#B87333',
  copperShine: '#DA8A67',
};

// ============================================================================
// RICH JEWEL TONES (Intensive, saturated colors)
// ============================================================================

export const JEWELS = {
  // Rich purples & violets
  royalPurple: '#7851A9',
  amethyst: '#9966CC',
  deepViolet: '#5D3FD3',
  ultraviolet: '#645394',

  // Emeralds & greens
  emerald: '#50C878',
  emeraldDeep: '#046307',
  jade: '#00A86B',

  // Sapphires & blues
  sapphire: '#0F52BA',
  sapphireDeep: '#082567',
  royalBlue: '#4169E1',
  midnightBlue: '#191970',

  // Rubies & reds
  ruby: '#E0115F',
  crimson: '#DC143C',
  garnet: '#733635',

  // Amber & topaz
  amber: '#FFBF00',
  topaz: '#FFC87C',
  citrine: '#E4D00A',
};

// ============================================================================
// LUXURY BACKGROUNDS (Rich, deep, intensive)
// ============================================================================

export const LUXURY_BACKGROUNDS = {
  // Dark luxury (primary)
  midnight: {
    solid: '#0A0E27',
    gradient: ['#0A0E27', '#1a1f3a', '#2a2f4a'],
    gradientVertical: ['#0A0E27', '#151937'],
  },

  // Light health-focused gradient (modern, clean, health-conscious)
  deepNavy: {
    solid: '#cdfb9fff',
    gradient: ['#b0d0e5ff', '#e0f2fe', '#b0c9e9ff'], // Soft sky blue pastels - fresh, healthy, modern
    gradientRadial: ['#c8fdfbff', '#a8c8ddff', '#e2ebbeff'],
  },

  // Royal purple luxury
  royalPurple: {
    solid: '#1e0d3d',
    gradient: ['#1e0d3d', '#2d1454', '#3d1b6b'],
    shimmer: ['#1e0d3d', '#4a1f82', '#1e0d3d'],
  },

  // Charcoal premium
  charcoal: {
    solid: '#1a1a2e',
    gradient: ['#1a1a2e', '#25254a', '#2f2f5a'],
  },

  // Elegant dark slate
  slate: {
    solid: '#0f1419',
    gradient: ['#0f1419', '#1a1f2b', '#252a36'],
  },
};

// ============================================================================
// PREMIUM SURFACES (High-gloss, metallic, glass)
// ============================================================================

export const LUXURY_SURFACES = {
  // Ultra-glossy glass (high opacity for rich effect)
  glassUltra: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.25)',
    blur: 20, // Strong blur for depth
  },

  // Metallic glass (with shimmer)
  glassMetal: {
    background: 'rgba(229, 228, 226, 0.12)', // Platinum tint
    border: 'rgba(255, 215, 0, 0.3)', // Gold border
    blur: 25,
  },

  // Dark glass (for luxury contrast)
  glassDark: {
    background: 'rgba(0, 0, 0, 0.35)',
    border: 'rgba(255, 255, 255, 0.15)',
    blur: 15,
  },

  // Gradient overlays (for rich depth)
  gradientOverlay: {
    darkVignette: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'],
    goldShimmer: ['rgba(255,215,0,0.05)', 'rgba(255,215,0,0)', 'rgba(255,215,0,0.05)'],
    purpleGlow: ['rgba(107,78,255,0.15)', 'rgba(107,78,255,0)'],
  },
};

// ============================================================================
// RICH GRADIENTS (Intensive, eye-catching)
// ============================================================================

export const LUXURY_GRADIENTS = {
  // Gold gradients
  goldLuxury: ['#FFD700', '#FDB931', '#D4AF37'],
  goldRich: ['#FDB931', '#D4AF37', '#B8860B'],
  goldToRose: ['#FFD700', '#ECC5C0', '#B76E79'],

  // Purple luxury
  purpleLuxury: ['#7851A9', '#9966CC', '#5D3FD3'],
  purpleRoyal: ['#5D3FD3', '#7851A9', '#4a148c'],
  purpleToBlue: ['#7851A9', '#645394', '#4169E1'],

  // Blue luxury
  blueLuxury: ['#0F52BA', '#4169E1', '#082567'],
  sapphireGradient: ['#082567', '#0F52BA', '#1E90FF'],

  // Emerald luxury
  emeraldLuxury: ['#50C878', '#00A86B', '#046307'],

  // Multi-color premium
  rainbowLuxury: ['#FFD700', '#9966CC', '#4169E1', '#50C878'],
  sunsetLuxury: ['#FF6B9D', '#FF9A76', '#FFC837', '#FFD700'],

  // Metallic gradients
  platinumGradient: ['#F0F0F0', '#E5E4E2', '#C0C0C0'],
  silverGradient: ['#F0F0F0', '#C9C9C9', '#A8A8A8'],
  roseGoldGradient: ['#ECC5C0', '#B76E79', '#8B5A5F'],

  // Dark premium gradients
  darkLuxury: ['#0A0E27', '#1a1f3a', '#2a2f4a'],
  darkPurple: ['#1e0d3d', '#2d1454', '#3d1b6b'],
};

// ============================================================================
// ADVANCED SHADOWS & GLOWS (Intensive, premium)
// ============================================================================

export const LUXURY_SHADOWS = {
  // Metallic glows
  goldGlow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },

  roseGoldGlow: {
    shadowColor: '#ECC5C0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 10,
  },

  platinumGlow: {
    shadowColor: '#E5E4E2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
  },

  // Rich color glows
  purpleGlow: {
    shadowColor: '#7851A9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  sapphireGlow: {
    shadowColor: '#0F52BA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },

  emeraldGlow: {
    shadowColor: '#50C878',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },

  // Ultra-premium deep shadows
  ultraDeep: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },

  // Layered shadow (for maximum depth)
  layered: {
    // Use multiple shadow layers in implementation
    layer1: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    layer2: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
    },
    elevation: 12,
  },
};

// ============================================================================
// LUXURY CARD RECIPES (Pre-made premium card styles)
// ============================================================================

export const LUXURY_CARD_RECIPES = {
  // Platinum card (ultra-premium)
  platinum: {
    background: 'linear-gradient(135deg, rgba(240,240,240,0.15), rgba(192,192,192,0.12))',
    borderColor: 'rgba(229, 228, 226, 0.3)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    ...LUXURY_SHADOWS.platinumGlow,
  },

  // Gold card (luxury)
  gold: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(212,175,55,0.1))',
    borderColor: 'rgba(255, 215, 0, 0.35)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    ...LUXURY_SHADOWS.goldGlow,
  },

  // Rose gold card (elegant)
  roseGold: {
    background: 'linear-gradient(135deg, rgba(236,197,192,0.12), rgba(183,110,121,0.1))',
    borderColor: 'rgba(236, 197, 192, 0.35)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    ...LUXURY_SHADOWS.roseGoldGlow,
  },

  // Ultra-glass (high-end glass morphism)
  ultraGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    backdropFilter: 'blur(25px)',
    ...LUXURY_SHADOWS.ultraDeep,
  },

  // Dark luxury (for high contrast)
  darkLuxury: {
    background: 'linear-gradient(135deg, rgba(26,26,46,0.95), rgba(37,37,74,0.9))',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    ...LUXURY_SHADOWS.layered.layer2,
  },
};

// ============================================================================
// PREMIUM TEXT COLORS (Rich, high-contrast)
// ============================================================================

export const LUXURY_TEXT = {
  // On dark backgrounds
  onDark: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.85)',
    tertiary: 'rgba(255, 255, 255, 0.65)',
    muted: 'rgba(255, 255, 255, 0.45)',
  },

  // On light backgrounds (for health-focused light theme)
  onLight: {
    primary: '#1a202c',
    secondary: 'rgba(26, 32, 44, 0.85)',
    tertiary: 'rgba(26, 32, 44, 0.65)',
    muted: 'rgba(26, 32, 44, 0.45)',
  },

  // Metallic text
  metallic: {
    gold: '#FFD700',
    silver: '#C9C9C9',
    platinum: '#E5E4E2',
    roseGold: '#ECC5C0',
  },

  // Jewel tone text (for emphasis)
  jewel: {
    purple: '#9966CC',
    blue: '#4169E1',
    emerald: '#50C878',
    amber: '#FFBF00',
  },
};

// ============================================================================
// LUXURY SEMANTIC COLORS (Rich, intensive)
// ============================================================================

export const LUXURY_SEMANTIC = {
  success: {
    base: '#50C878',       // Rich emerald
    light: '#5FD68A',
    dark: '#046307',
    gradient: LUXURY_GRADIENTS.emeraldLuxury,
    glow: LUXURY_SHADOWS.emeraldGlow,
  },

  warning: {
    base: '#FFBF00',       // Rich amber
    light: '#FFD24D',
    dark: '#CC9900',
    gradient: ['#FFBF00', '#FFD700', '#FFA500'],
    glow: LUXURY_SHADOWS.goldGlow,
  },

  danger: {
    base: '#E0115F',       // Ruby
    light: '#FF1F6F',
    dark: '#B00E4C',
    gradient: ['#E0115F', '#DC143C', '#B00E4C'],
    glow: {
      shadowColor: '#E0115F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
  },

  info: {
    base: '#0F52BA',       // Sapphire
    light: '#1E90FF',
    dark: '#082567',
    gradient: LUXURY_GRADIENTS.sapphireGradient,
    glow: LUXURY_SHADOWS.sapphireGlow,
  },

  premium: {
    base: '#7851A9',       // Royal purple
    light: '#9966CC',
    dark: '#5D3FD3',
    gradient: LUXURY_GRADIENTS.purpleLuxury,
    glow: LUXURY_SHADOWS.purpleGlow,
  },
};

// ============================================================================
// ANIMATION & EFFECTS
// ============================================================================

export const LUXURY_EFFECTS = {
  // Shimmer animation keyframes (for metallic effects)
  shimmer: {
    duration: 2000,
    easing: 'ease-in-out',
    // Use with Animated API or CSS keyframes
    positions: [
      { offset: 0, opacity: 0.5 },
      { offset: 0.5, opacity: 1 },
      { offset: 1, opacity: 0.5 },
    ],
  },

  // Pulse glow (for interactive elements)
  pulseGlow: {
    duration: 1500,
    easing: 'ease-in-out',
    loop: true,
  },

  // Premium spring animation
  luxurySpring: {
    tension: 280,
    friction: 20,
    mass: 0.8,
  },
};

// ============================================================================
// COMPLETE LUXURY THEME EXPORT
// ============================================================================

export const LUXURY_THEME = {
  METALLIC,
  JEWELS,
  LUXURY_BACKGROUNDS,
  LUXURY_SURFACES,
  LUXURY_GRADIENTS,
  LUXURY_SHADOWS,
  LUXURY_CARD_RECIPES,
  LUXURY_TEXT,
  LUXURY_SEMANTIC,
  LUXURY_EFFECTS,
};

export default LUXURY_THEME;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Platinum Card
<View style={{
  background: LinearGradient(LUXURY_GRADIENTS.platinumGradient),
  borderColor: LUXURY_CARD_RECIPES.platinum.borderColor,
  ...LUXURY_SHADOWS.platinumGlow,
  borderRadius: 24,
  padding: 24,
}}>
  <Text style={{ color: LUXURY_TEXT.metallic.platinum }}>
    Premium Content
  </Text>
</View>

// Example 2: Gold Accent Button
<TouchableOpacity style={{
  background: LinearGradient(LUXURY_GRADIENTS.goldLuxury),
  ...LUXURY_SHADOWS.goldGlow,
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 32,
}}>
  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: 'TenorSans_400Regular' }}>
    Upgrade to Premium
  </Text>
</TouchableOpacity>

// Example 3: Rich Background Container
<View style={{
  background: LinearGradient(LUXURY_BACKGROUNDS.midnight.gradient),
  flex: 1,
}}>
  {children}
</View>

// Example 4: Ultra-Glass Card
<View style={{
  backgroundColor: LUXURY_SURFACES.glassUltra.background,
  borderColor: LUXURY_SURFACES.glassUltra.border,
  borderWidth: 1,
  ...LUXURY_SHADOWS.ultraDeep,
  borderRadius: 24,
  padding: 20,
}}>
  <Text style={{ color: LUXURY_TEXT.onDark.primary }}>
    Glass Morphism Card
  </Text>
</View>
*/
