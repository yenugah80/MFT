/**
 * Modern UI Effects - 2025 Design Trends
 * Glassmorphism, light effects, glows, and immersive elements
 * For emotionally intelligent, futuristic interfaces
 */

import { BRAND, SURFACES, TEXT, SEMANTIC } from './premiumTheme';

// ============================================================================
// GLASSMORPHISM EFFECTS
// ============================================================================

export const GLASS = {
  // Light glassmorphism for light backgrounds
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(79, 143, 139, 0.15)',
    // Simulated blur effect with subtle overlay
    overlay: 'rgba(255, 255, 255, 0.40)',
  },

  // Medium glass - more pronounced
  medium: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 143, 139, 0.20)',
    overlay: 'rgba(255, 255, 255, 0.50)',
  },

  // Heavy glass - almost opaque
  heavy: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(79, 143, 139, 0.25)',
    overlay: 'rgba(255, 255, 255, 0.60)',
  },

  // Tinted glass - brand colored
  tinted: {
    backgroundColor: 'rgba(79, 143, 139, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79, 143, 139, 0.25)',
    overlay: 'rgba(79, 143, 139, 0.05)',
  },

  // Frosted glass - textured appearance
  frosted: {
    backgroundColor: 'rgba(246, 250, 249, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(79, 143, 139, 0.18)',
    overlay: 'rgba(255, 255, 255, 0.65)',
  },
};

// ============================================================================
// GLOW & LIGHT EFFECTS
// ============================================================================

export const GLOW = {
  // Subtle glow for interactive elements
  subtle: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Medium glow for emphasis
  medium: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  // Strong glow for CTAs and important elements
  strong: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },

  // Pulsing glow (use with animation)
  pulse: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },

  // Colored glows for semantic states
  success: {
    shadowColor: SEMANTIC.success.base,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },

  warning: {
    shadowColor: SEMANTIC.warning.base,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },

  info: {
    shadowColor: SEMANTIC.info.base,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },

  // Multicolor glow for celebrations
  celebration: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ============================================================================
// LIGHT BORDERS & HIGHLIGHTS
// ============================================================================

export const LIGHT_BORDER = {
  // Top highlight (simulates light from above)
  top: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.80)',
  },

  // All sides subtle light border
  all: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.50)',
  },

  // Illuminated border (glowing edge)
  illuminated: {
    borderWidth: 1.5,
    borderColor: 'rgba(79, 143, 139, 0.40)',
  },

  // Gradient border simulation (use with LinearGradient wrapper)
  gradient: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
};

// Gradient border colors for wrapping elements
export const GRADIENT_BORDERS = {
  primary: ['rgba(79, 143, 139, 0.4)', 'rgba(156, 201, 198, 0.2)'],
  success: ['rgba(79, 143, 139, 0.5)', 'rgba(156, 201, 198, 0.3)'],
  warning: ['rgba(201, 162, 106, 0.5)', 'rgba(232, 209, 175, 0.3)'],
  info: ['rgba(111, 127, 168, 0.5)', 'rgba(201, 212, 236, 0.3)'],
  celebration: ['#6B4EFF', '#FF6B9D', '#00D9FF'],
};

// ============================================================================
// LIGHT RAYS & BEAM EFFECTS
// ============================================================================

export const LIGHT_RAYS = {
  // Subtle ray from corner (use with positioned View)
  corner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    opacity: 0.15,
  },

  // Horizontal beam accent
  horizontal: {
    height: 2,
    opacity: 0.25,
  },

  // Vertical beam accent
  vertical: {
    width: 2,
    opacity: 0.25,
  },

  // Radial glow (center emanating light)
  radial: {
    position: 'absolute',
    alignSelf: 'center',
    opacity: 0.20,
  },
};

// Gradient colors for light rays
export const RAY_GRADIENTS = {
  primary: ['rgba(79, 143, 139, 0.3)', 'rgba(79, 143, 139, 0)'],
  white: ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)'],
  accent: ['rgba(156, 201, 198, 0.4)', 'rgba(156, 201, 198, 0)'],
};

// ============================================================================
// DEPTH & LAYERING
// ============================================================================

export const DEPTH = {
  // Background layer (furthest)
  background: {
    zIndex: 0,
    opacity: 1,
  },

  // Content layer
  content: {
    zIndex: 10,
    opacity: 1,
  },

  // Floating elements (cards above surface)
  floating: {
    zIndex: 20,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Elevated (modals, overlays)
  elevated: {
    zIndex: 100,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },

  // Overlay (dimmed background)
  overlay: {
    zIndex: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.40)',
  },
};

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const MOTION = {
  // Gentle fade in
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 400,
  },

  // Slide up entrance
  slideUp: {
    from: { opacity: 0, transform: [{ translateY: 20 }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
    duration: 350,
  },

  // Scale in (pop)
  scaleIn: {
    from: { opacity: 0, transform: [{ scale: 0.95 }] },
    to: { opacity: 1, transform: [{ scale: 1 }] },
    duration: 300,
  },

  // Glow pulse animation
  glowPulse: {
    from: { shadowOpacity: 0.2 },
    to: { shadowOpacity: 0.45 },
    duration: 1000,
    loop: true,
    easing: 'ease-in-out',
  },

  // Shimmer effect
  shimmer: {
    from: { opacity: 0.5 },
    to: { opacity: 1 },
    duration: 1500,
    loop: true,
    easing: 'ease-in-out',
  },

  // Bounce for success states
  bounce: {
    from: { transform: [{ scale: 1 }] },
    to: { transform: [{ scale: 1.05 }] },
    duration: 200,
    easing: 'spring',
  },
};

// ============================================================================
// CARD RECIPES WITH MODERN EFFECTS
// ============================================================================

export const MODERN_CARDS = {
  // Glass card with subtle glow
  glass: {
    ...GLASS.light,
    borderRadius: 20,
    padding: 16,
    ...GLOW.subtle,
  },

  // Glass card with top light border
  glassLit: {
    ...GLASS.medium,
    ...LIGHT_BORDER.top,
    borderRadius: 20,
    padding: 16,
    ...GLOW.medium,
  },

  // Hero card with strong glow
  hero: {
    ...GLASS.heavy,
    ...LIGHT_BORDER.illuminated,
    borderRadius: 24,
    padding: 20,
    ...GLOW.strong,
  },

  // Interactive card (for pressable elements)
  interactive: {
    ...GLASS.light,
    borderRadius: 16,
    padding: 12,
    ...GLOW.subtle,
  },

  // CTA card with celebration glow
  cta: {
    ...GLASS.tinted,
    ...LIGHT_BORDER.illuminated,
    borderRadius: 16,
    padding: 16,
    ...GLOW.pulse,
  },

  // Frosted compact card
  compact: {
    ...GLASS.frosted,
    borderRadius: 12,
    padding: 12,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
};

// ============================================================================
// EMOTIONALLY INTELLIGENT MICROCOPY
// ============================================================================

export const MICROCOPY = {
  encouragement: [
    "You're doing great! 🌟",
    "Keep up the momentum!",
    "Nice progress today!",
    "You've got this!",
    "Every step counts!",
  ],

  motivation: [
    "Almost there!",
    "So close to your goal!",
    "You're on fire!",
    "Looking good!",
    "Great consistency!",
  ],

  supportive: [
    "No worries, tomorrow's a new day",
    "Progress, not perfection",
    "Every journey has ups and downs",
    "You're building healthy habits",
    "Small steps lead to big changes",
  ],

  celebration: [
    "Goal crushed! 🎉",
    "Absolutely amazing!",
    "You're unstoppable!",
    "Incredible work!",
    "That's what we're talking about!",
  ],

  gentle: [
    "Remember to log your meals",
    "How are you feeling today?",
    "Time for a quick check-in",
    "Stay hydrated today",
    "You matter, take care of yourself",
  ],
};

// Helper to get random microcopy
export const getRandomMicrocopy = (category) => {
  const options = MICROCOPY[category] || MICROCOPY.encouragement;
  return options[Math.floor(Math.random() * options.length)];
};

// ============================================================================
// PROGRESS RING STYLES (half-closed gauge)
// ============================================================================

export const PROGRESS_RING = {
  // Small ring (40-60px)
  small: {
    size: 50,
    strokeWidth: 4,
    radius: 21,
  },

  // Medium ring (80-100px)
  medium: {
    size: 90,
    strokeWidth: 6,
    radius: 39,
  },

  // Large ring (120-140px)
  large: {
    size: 130,
    strokeWidth: 8,
    radius: 57,
  },

  // Hero ring (160-200px)
  hero: {
    size: 180,
    strokeWidth: 10,
    radius: 80,
  },
};

// ============================================================================
// INTERACTIVE STATES
// ============================================================================

export const INTERACTION = {
  // Pressed state (scale down slightly)
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },

  // Hover state (for web)
  hover: {
    transform: [{ scale: 1.02 }],
    ...GLOW.medium,
  },

  // Focus state
  focused: {
    borderWidth: 2,
    borderColor: BRAND.primary,
    ...GLOW.medium,
  },

  // Disabled state
  disabled: {
    opacity: 0.40,
    shadowOpacity: 0,
  },

  // Active/selected state
  active: {
    backgroundColor: 'rgba(79, 143, 139, 0.15)',
    borderColor: BRAND.primary,
    ...GLOW.subtle,
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export const MODERN_EFFECTS = {
  GLASS,
  GLOW,
  LIGHT_BORDER,
  GRADIENT_BORDERS,
  LIGHT_RAYS,
  RAY_GRADIENTS,
  DEPTH,
  MOTION,
  MODERN_CARDS,
  MICROCOPY,
  PROGRESS_RING,
  INTERACTION,
  getRandomMicrocopy,
};

export default MODERN_EFFECTS;
