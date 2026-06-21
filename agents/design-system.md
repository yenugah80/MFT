# MyFoodTracker Design System Reference

> This document is the authoritative design reference for agents and skills working on the MFT mobile app. Read this before writing or reviewing any UI code.

---

## Source of Truth

There are multiple legacy theme files. Use only these two:

| File | Purpose | Use when |
|------|---------|----------|
| `mobile/constants/premiumTheme.js` | Full design system — colors, type, spacing, shadows, card recipes, palettes | Building any screen or component |
| `mobile/constants/designSystem.js` | Unified token aliases + glass/glow presets | When you need `GLASS`, `COMPONENT_PRESETS`, or functional metric colors |

**Never import from these deprecated files:**
- `mobile/constants/designTokens.js` — dark/navy theme, text is white (#faf8f7), will cause white-on-white bugs
- `mobile/constants/modernColorPalette.js` — duplicates
- `mobile/constants/premiumDesignSystem.js` — superseded

---

## Color System

### Brand
```js
import { BRAND } from '../constants/premiumTheme';

BRAND.primary        // '#6B4EFF'  — main purple, buttons, active states
BRAND.primaryLight   // '#8B6EFF'
BRAND.primaryDark    // '#5A3EE0'
BRAND.secondary      // '#FF6B9D'  — pink accent
BRAND.accent         // '#00D9FF'  — cyan highlight
```

### Surfaces & Backgrounds
```js
import { SURFACES } from '../constants/premiumTheme';

SURFACES.background.primary   // '#FBF9F7'  — screen base (warm off-white)
SURFACES.background.gradient  // ['#FBF9F7', '#F5F0EB', '#FDF8F5']
SURFACES.card.primary         // '#FFFFFF'
SURFACES.card.glass           // 'rgba(255, 255, 255, 0.92)'
SURFACES.card.border          // 'rgba(138, 127, 120, 0.08)'
SURFACES.divider              // '#E5E1DB'

// Named gradients for LinearGradient
SURFACES.gradient.primary     // ['#6B4EFF', '#8B6EFF']  — brand purple
SURFACES.gradient.success     // ['#10B981', '#34D399']
SURFACES.gradient.warning     // ['#F59E0B', '#FBBF24']
SURFACES.gradient.danger      // ['#EF4444', '#F87171']
SURFACES.gradient.pastelPeach // ['#FAF8F5', '#F5F0E8']  — card backgrounds
SURFACES.gradient.pastelMint  // ['#F0F7F1', '#E5F2E6']
```

### Text Colors
```js
import { TEXT } from '../constants/premiumTheme';

TEXT.primary    // '#2D2522'  — warm charcoal, main text
TEXT.secondary  // '#5D534D'  — warm taupe, labels
TEXT.tertiary   // '#8A7F78'  — warm stone, hints
TEXT.muted      // '#B5ACA5'  — placeholders
TEXT.white      // '#FFFFFF'  — text on dark backgrounds
TEXT.onPurple   // '#FFFFFF'  — text on BRAND.primary backgrounds
TEXT.brand      // '#6B4EFF'  — brand-colored text links
```

**Critical rule:** Never use `COLORS.text.*` from `designTokens.js` for text on light backgrounds — those values are white (#faf8f7) and will be invisible.

### Semantic Colors
```js
import { SEMANTIC, SEMANTIC_ACTIONS } from '../constants/premiumTheme';

// For badges, status indicators, backgrounds
SEMANTIC.success.base  // '#6B9B76'  muted sage
SEMANTIC.success.bg    // '#F0F7F1'  light background
SEMANTIC.warning.base  // '#D89B36'  muted amber
SEMANTIC.danger.base   // '#C96B6B'  muted red
SEMANTIC.info.base     // '#6B82AD'  muted blue

// For action buttons, progress bars, CTAs
SEMANTIC_ACTIONS.primary          // '#FF8A50'  warm orange
SEMANTIC_ACTIONS.primaryGradient  // ['#FF8A50', '#FFD700']
SEMANTIC_ACTIONS.success          // '#10B981'  emerald
SEMANTIC_ACTIONS.successGradient  // ['#10B981', '#34D399']
SEMANTIC_ACTIONS.danger           // '#EF4444'
SEMANTIC_ACTIONS.info             // '#00E5FF'  cyan (water)
SEMANTIC_ACTIONS.infoGradient     // ['#00E5FF', '#0096FF']
```

### Macro Colors
```js
import { MACRO_COLORS } from '../constants/premiumTheme';

MACRO_COLORS.protein.base  // '#8FA0E6'  blue-lavender
MACRO_COLORS.carbs.base    // '#A8C9B6'  sage green
MACRO_COLORS.fat.base      // '#E7B7B1'  warm peach
MACRO_COLORS.fiber.base    // '#B9B4E7'  soft purple
// Each has .light and .gradient as well
```

### Wellness / Metric Colors (vibrant, for dashboard cards)
```js
import { VIBRANT_WELLNESS } from '../constants/premiumTheme';

VIBRANT_WELLNESS.mood.gradient      // ['#9333EA', '#C026D3', '#E11D48']
VIBRANT_WELLNESS.hydration.gradient // ['#0891B2', '#0284C7', '#1D4ED8']
VIBRANT_WELLNESS.nutrition.gradient // ['#F97316', '#FB923C', '#FBBF24']
VIBRANT_WELLNESS.activity.gradient  // ['#059669', '#10B981', '#34D399']
VIBRANT_WELLNESS.sleep.gradient     // ['#6366F1', '#8B5CF6', '#A78BFA']
VIBRANT_WELLNESS.stress.gradient    // ['#F59E0B', '#FBBF24', '#FCD34D']
```

### NutriScore & Grade Colors
```js
import { NUTRISCORE, GRADE_COLORS } from '../constants/premiumTheme';

NUTRISCORE.A.base   // '#038141'  — European green
GRADE_COLORS.A      // { color: '#059669', bg: '#ECFDF5', label: 'Excellent' }
GRADE_COLORS.B      // { color: '#84CC16', bg: '#F7FEE7', label: 'Good' }
```

### Mood Palette
```js
import { MOOD_PALETTE } from '../constants/premiumTheme';

MOOD_PALETTE.happy.base      // '#FBBF24'  amber/gold
MOOD_PALETTE.calm.base       // '#06B6D4'  cyan
MOOD_PALETTE.focused.base    // '#8B5CF6'  purple
MOOD_PALETTE.energized.base  // '#10B981'  emerald
MOOD_PALETTE.neutral.base    // '#3B82F6'  blue
MOOD_PALETTE.tired.base      // '#C084FC'  orchid
MOOD_PALETTE.stressed.base   // '#DC2626'  red
MOOD_PALETTE.sad.base        // '#2563EB'  royal blue
```

---

## Typography

```js
import { TYPOGRAPHY, TEXT_STYLES, createTextStyle } from '../constants/premiumTheme';

// Font sizes
TYPOGRAPHY.size.xs    // 11
TYPOGRAPHY.size.sm    // 13
TYPOGRAPHY.size.base  // 15
TYPOGRAPHY.size.md    // 16
TYPOGRAPHY.size.lg    // 18
TYPOGRAPHY.size.xl    // 20
TYPOGRAPHY.size['2xl'] // 24
TYPOGRAPHY.size['3xl'] // 28
TYPOGRAPHY.size['4xl'] // 32
TYPOGRAPHY.size['5xl'] // 40

// Font families (Inter)
TYPOGRAPHY.family.regular  // 'Inter_400Regular'
TYPOGRAPHY.family.medium   // 'Inter_500Medium'
TYPOGRAPHY.family.semibold // 'Inter_600SemiBold'
TYPOGRAPHY.family.bold     // 'Inter_700Bold'
```

### Pre-built Text Styles (preferred over manual style objects)

Spread these directly in `StyleSheet.create`:

```js
// Hierarchy: display → heading → subheading → body → label → caption → numeric

TEXT_STYLES.displayLarge     // 40px bold  — hero sections
TEXT_STYLES.displayMedium    // 32px bold  — screen titles
TEXT_STYLES.displaySmall     // 28px bold

TEXT_STYLES.headingLarge     // 24px bold  — card titles
TEXT_STYLES.headingMedium    // 20px semibold
TEXT_STYLES.headingSmall     // 18px semibold — section headers

TEXT_STYLES.subheadingLarge  // 16px semibold
TEXT_STYLES.subheadingMedium // 15px medium
TEXT_STYLES.subheadingSmall  // 13px medium, TEXT.secondary

TEXT_STYLES.bodyLarge        // 16px regular
TEXT_STYLES.bodyMedium       // 15px regular  — main content
TEXT_STYLES.bodySmall        // 13px regular, TEXT.secondary

TEXT_STYLES.labelLarge       // 16px semibold — buttons
TEXT_STYLES.labelMedium      // 15px medium
TEXT_STYLES.labelSmall       // 13px medium
TEXT_STYLES.labelTiny        // 11px medium

TEXT_STYLES.caption          // 11px regular, TEXT.tertiary
TEXT_STYLES.captionMedium    // 11px medium
TEXT_STYLES.captionBold      // 11px semibold, TEXT.secondary

TEXT_STYLES.numericHero      // 40px bold, letterSpacing: -1 — dashboard main stat
TEXT_STYLES.numericLarge     // 28px bold
TEXT_STYLES.numericMedium    // 20px semibold
TEXT_STYLES.numericSmall     // 16px semibold
TEXT_STYLES.numericTiny      // 13px medium

TEXT_STYLES.cardTitle        // 18px semibold — consistent card headers
TEXT_STYLES.cardSubtitle     // 13px regular, TEXT.tertiary
TEXT_STYLES.buttonPrimary    // 16px semibold, TEXT.white — white text on colored buttons
TEXT_STYLES.buttonSecondary  // 15px medium, BRAND.primary
TEXT_STYLES.inputText        // 16px regular
TEXT_STYLES.inputPlaceholder // 16px regular, TEXT.muted
```

Usage:
```js
// In StyleSheet:
const styles = StyleSheet.create({
  title: { ...TEXT_STYLES.headingLarge },
  value: { ...TEXT_STYLES.numericHero, color: BRAND.primary },
});

// Or with createTextStyle:
const customStyle = createTextStyle('xl', 'bold', BRAND.primary);
```

---

## Spacing

```js
import { SPACING } from '../constants/premiumTheme';
// 4pt grid
SPACING[0.5] // 2
SPACING[1]   // 4
SPACING[2]   // 8
SPACING[3]   // 12
SPACING[4]   // 16  — standard padding
SPACING[5]   // 20
SPACING[6]   // 24
SPACING[7]   // 28
SPACING[8]   // 32
SPACING[10]  // 40
SPACING[12]  // 48
SPACING[16]  // 64
SPACING[20]  // 80
```

---

## Border Radius

```js
import { RADIUS } from '../constants/premiumTheme';

RADIUS.sm    // 8
RADIUS.md    // 12
RADIUS.lg    // 16  — buttons, inputs
RADIUS.xl    // 20  — standard cards
RADIUS['2xl'] // 24  — hero cards, modals
RADIUS['3xl'] // 28
RADIUS.full  // 9999  — pills, avatars
```

---

## Shadows

```js
import { SHADOWS } from '../constants/premiumTheme';

SHADOWS.sm   // elevation 2, 1px offset — compact cards
SHADOWS.md   // elevation 4, 2px offset — standard cards
SHADOWS.lg   // elevation 6, 4px offset — elevated cards
SHADOWS.xl   // elevation 8, 6px offset — modals

// Semantic glow shadows (colored)
SHADOWS.success  // sage green glow
SHADOWS.warning  // amber glow
SHADOWS.danger   // red glow
SHADOWS.info     // blue glow
```

---

## Card System

Three tiers — always pick the right tier:

```js
import { CARD_SYSTEM } from '../constants/premiumTheme';

// HERO — Primary metric, takes visual focus (Wellness Score, main stat)
// Radius 24px, padding 20px, elevation 8
CARD_SYSTEM.hero

// STANDARD — Most dashboard cards (meals, calendar, achievements)
// Radius 20px, padding 16px, elevation 4
CARD_SYSTEM.standard

// COMPACT — Small tiles, quick stats, grid items
// Radius 20px, padding 12px, elevation 2
CARD_SYSTEM.compact

// ELEVATED — Modals, bottom sheets, overlays
// Radius 24px, padding 20px, elevation 12, no border
CARD_SYSTEM.elevated

// Press state
CARD_SYSTEM.pressed  // { transform: [{ scale: 0.98 }], shadowOpacity: 0.03 }
```

Shorthand recipes:
```js
import { PREMIUM_CARD, GLASS_CARD } from '../constants/premiumTheme';

// PREMIUM_CARD — white card with border + SHADOWS.md
// GLASS_CARD   — 92% opacity white with border + SHADOWS.sm
```

---

## Icon Sizes

```js
import { ICON_SIZES } from '../constants/premiumTheme';

ICON_SIZES.xs   // 16
ICON_SIZES.sm   // 20
ICON_SIZES.md   // 24  — standard icon
ICON_SIZES.lg   // 28
ICON_SIZES.xl   // 32
ICON_SIZES['2xl'] // 40
ICON_SIZES['3xl'] // 48
ICON_SIZES['4xl'] // 64
ICON_SIZES['5xl'] // 80
```

Icon name constants:
```js
import { ICONS } from '../constants/premiumTheme';
// ICONS.food, ICONS.water, ICONS.mood, ICONS.add, ICONS.back, etc.
```

---

## Animation

```js
import { ANIMATION } from '../constants/premiumTheme';

ANIMATION.fast    // 150ms — feedback
ANIMATION.normal  // 250ms — default transitions
ANIMATION.slow    // 400ms — entrance/exit
ANIMATION.spring  // { tension: 300, friction: 20 }
```

---

## Helper Functions

```js
import { getSemanticColor, getSemanticGradient, formatPercent, formatNumber, getMutedToVibrantColor } from '../constants/premiumTheme';

getSemanticColor('success')       // '#6B9B76'
getSemanticGradient('warning')    // ['#F59E0B', '#FBBF24']
formatPercent(0.75)               // '75%'
formatNumber(12345)               // '12.3k'
getMutedToVibrantColor('protein') // ['#8FA0E6', '#C8D2F5']
```

---

## Skeleton / Loading

```js
import { SKELETON_GRADIENTS } from '../constants/premiumTheme';

SKELETON_GRADIENTS.shimmer       // ['#F0EEE8', '#FFFFFF', '#F5F2ED']
SKELETON_GRADIENTS.warmShimmer   // ['#F5F0EA', '#FFFBF7', '#F0E8E0']
```

---

## Component Patterns

### Standard Card with Header
```jsx
import { CARD_SYSTEM, TEXT_STYLES, TEXT, SPACING } from '../constants/premiumTheme';

<View style={CARD_SYSTEM.standard}>
  <Text style={TEXT_STYLES.cardTitle}>Title</Text>
  <Text style={[TEXT_STYLES.cardSubtitle, { marginBottom: SPACING[3] }]}>Subtitle</Text>
  {/* content */}
</View>
```

### Gradient Button (Primary Action)
```jsx
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES, RADIUS, SPACING, TEXT_STYLES } from '../constants/premiumTheme';

<TouchableOpacity activeOpacity={0.85}>
  <LinearGradient
    colors={SURFACES.gradient.primary}
    style={{ borderRadius: RADIUS.lg, paddingVertical: SPACING[3], paddingHorizontal: SPACING[5], alignItems: 'center' }}
  >
    <Text style={TEXT_STYLES.buttonPrimary}>Log Meal</Text>
  </LinearGradient>
</TouchableOpacity>
```

### Metric Value Display
```jsx
<Text style={TEXT_STYLES.numericHero}>1,842</Text>
<Text style={TEXT_STYLES.captionMedium}>kcal today</Text>
```

### Progress Bar (Macro)
```jsx
import { MACRO_COLORS, RADIUS, SURFACES } from '../constants/premiumTheme';

<View style={{ height: 6, backgroundColor: SURFACES.divider, borderRadius: RADIUS.full }}>
  <View style={{
    height: 6,
    width: `${Math.min(ratio * 100, 100)}%`,
    backgroundColor: MACRO_COLORS.protein.base,
    borderRadius: RADIUS.full,
  }} />
</View>
```

---

## Anti-Patterns

| Don't | Do instead |
|-------|-----------|
| `import { COLORS } from '../constants/designTokens'` for text | `import { TEXT } from '../constants/premiumTheme'` |
| Hardcode `color: '#fff'` on light backgrounds | Use `TEXT.primary` or `TEXT.secondary` |
| Use `fontFamily: 'Inter'` directly | Use `TYPOGRAPHY.family.regular` (etc.) |
| Create shadow styles manually | Spread `SHADOWS.md` or use `CARD_SYSTEM` |
| Use raw pixel values for spacing | Use `SPACING[4]` (etc.) |
| Mix `CARD_SYSTEM.hero` and `CARD_SYSTEM.compact` for same content type | Pick one tier per content type consistently |
| Wrap a `LinearGradient` in another `LinearGradient` | Use a single gradient with multiple color stops |
| `router.back()` for history screens | `router.replace()` — back nav can fail with hitSlop issues |

---

## Celebration & Streaks

```js
import { CELEBRATION } from '../constants/premiumTheme';

CELEBRATION.confetti  // ['#6B4EFF', '#FF6B9D', '#00D9FF', '#10B981', '#F59E0B']
CELEBRATION.glow      // 'rgba(107, 78, 255, 0.3)'
CELEBRATION.sparkle   // '#FFD700'
CELEBRATION.streak.bronze   // '#CD7F32'
CELEBRATION.streak.gold     // '#FFD700'
CELEBRATION.streak.diamond  // '#B9F2FF'
```

---

## Confidence Indicators

```js
import { CONFIDENCE_COLORS } from '../constants/premiumTheme';

CONFIDENCE_COLORS.high.color    // '#059669'  green
CONFIDENCE_COLORS.medium.color  // '#D97706'  amber
CONFIDENCE_COLORS.low.color     // '#B5ACA5'  warm gray
CONFIDENCE_COLORS.veryLow.color // '#EF4444'  red
```

---

## Health Score Colors

```js
import { HEALTH_SCORE } from '../constants/premiumTheme';
// Keys: excellent (80-100), good (60-79), average (40-59), poor (20-39), bad (0-19)
HEALTH_SCORE.excellent.gradient  // ['#4CAF50', '#66BB6A']
HEALTH_SCORE.excellent.text      // '#1B5E20'
```

---

## Glossy Backgrounds

```js
import { GLOSSY_BACKGROUNDS } from '../constants/premiumTheme';

GLOSSY_BACKGROUNDS.glossyWhite   // ['#FFFFFF', '#FEFDFB', '#FFFFFF']
GLOSSY_BACKGROUNDS.glossyCream   // ['#FDF9F7', '#FEFBF8', '#F9F5F0']
GLOSSY_BACKGROUNDS.glossyPearl   // ['#F8F7F6', '#FFFFFF', '#F5F4F2']
```
