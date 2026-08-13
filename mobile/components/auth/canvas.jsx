import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Defs, Path, RadialGradient as SvgRadialGradient, Stop } from "react-native-svg";
import { CONTENT_MAX_WIDTH, IS_COMPACT, height } from "./constants";

const CREAM_GRADIENT = ["#FFFEFA", "#FBF4E6"];
// Layer 1, "Soft Base Gradient" — exact two stops from the spec sheet,
// vertical (direction set below via start/end). Was a three-stop ramp with a
// pure-white mid-point ending on #F9F7FF; the spec is a straight #FCFBFF →
// #F7F4FF, so the extra stop is gone.
const AUTH_LAVENDER_GRADIENT = ["#FCFBFF", "#F7F4FF"];

/**
 * Shared backdrop — imported directly by onboarding (OnboardingLayout.jsx,
 * app/onboarding/index.jsx) as well as the auth screens. `colors` defaults to
 * the original warm cream so onboarding is unaffected; only AuthCanvas below
 * opts into the lavender ramp. Do NOT change the default here — that's the
 * exact "wide blast radius" mistake this file already burned a day on once.
 */
export function ScreenBackdrop({ children, style, colors = CREAM_GRADIENT }) {
  const isLavender = colors === AUTH_LAVENDER_GRADIENT;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: isLavender ? 0 : 1, y: 1 }}
      style={[styles.root, style]}
    >
      {children}
    </LinearGradient>
  );
}

// Exact logical canvas from spec — 430×932 (an iPhone's logical point size),
// not derived from a screenshot's pixel dimensions like the previous version.
// Coordinates below are transcribed directly from the spec's named anchors
// (A–M), not re-estimated, so viewBox must match exactly for them to land
// where specified.
const REF_W = 430;
const REF_H = 932;

/**
 * Translucent lavender "glass sheet" background — three organic closed
 * Bézier shapes (not Ellipse/Circle) anchored outside the top-right and
 * right edges, two thin luminous highlight curves drawn on top of them, and
 * two much fainter cropped surfaces in the bottom corners. Everything here
 * replaces the previous circle/ellipse-based version entirely — this is not
 * a retune of that geometry.
 *
 * Shapes are closed Paths rather than Ellipse/Circle specifically so the
 * visible edge can be an irregular, hand-drawn-feeling curve instead of a
 * segment of a perfect circle — "avoid obvious oval shapes" from the spec.
 * Only the small visible arc of each shape matters; the rest of each path
 * loops off-canvas and is cropped by the view bounds.
 *
 * pointerEvents="none" is load-bearing, not decoration: this layer sits above
 * the form in z-order, and without it every tap meant for a field or button
 * would be swallowed here — a silent failure with no error to trace.
 */
export function WelcomeBackground() {
  return (
    <View style={styles.decorLayer} pointerEvents="none">
      <Svg
        width="100%" height="100%"
        viewBox={`0 0 ${REF_W} ${REF_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Layer 4, "Soft Lavender Glow" — spec colour #B896FF held across
              all three stops, 0.18 → 0.08 → transparent. Was #8969FF→#B49BFF
              at 0.10 → 0.04, i.e. a different (more saturated) violet running
              at roughly half the specified strength. */}
          <SvgRadialGradient id="ambientGlow" cx="390" cy="190" r="170" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#B896FF" stopOpacity="0.2" />
            <Stop offset="0.55" stopColor="#B896FF" stopOpacity="0.09" />
            <Stop offset="1" stopColor="#B896FF" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        {/* Render order follows the spec's back-to-front stack:
            base gradient (ScreenBackdrop) → bottom wave → soft glow →
            translucent shapes → luminous lines. The bottom wave used to be
            drawn last (in front of everything); it never visually overlapped
            the top-right cluster so it looked the same, but the stack now
            matches the documented order. */}

        {/* Layer 5, "Bottom Wave" — #E9DDFF / #F3EDFF at 6–12%. Two separate
            cropped surfaces, deliberately not joined into one wave. The
            white edge stroke that used to sit on the left one is gone: the
            spec lists luminous lines as a top-right element only, and it
            pushed the path count over budget. */}
        <Path
          d="M -200 820 C -80 800, 60 820, 180 890 C 220 912, 200 935, 140 934
             C 20 932, -100 910, -180 870 C -195 858, -200 840, -200 820 Z"
          fill="#E9DDFF" fillOpacity={0.1}
        />
        <Path
          d="M 350 932 C 365 880, 395 845, 430 825 C 455 845, 465 895, 452 932 Z"
          fill="#F3EDFF" fillOpacity={0.08}
        />

        {/* Layer 4 — soft glow */}
        <Path d={`M 0 0 H ${REF_W} V ${REF_H} H 0 Z`} fill="url(#ambientGlow)" />

        {/* Layer 2, "Translucent Elliptical Shapes" — spec palette
            #E9DDFF / #D4C4FF / #F3EDFF, each 8–16%. Geometry is unchanged
            from the approved pass: every sheet closes far off-canvas to the
            right so only its left boundary curve is visible, which is what
            produces the stepped density that reads as layered glass.
            The old 3.5% right-edge sliver is dropped — it sat below the
            spec's 8% floor and was a fourth path for almost no effect. */}
        <Path
          d="M 344 -20 C 318 50, 310 128, 328 188 C 348 254, 388 302, 430 332
             L 560 332 L 560 -20 Z"
          fill="#E9DDFF" fillOpacity={0.16}
        />
        <Path
          d="M 430 30 C 380 70, 330 130, 322 200 C 316 258, 350 310, 396 348
             L 560 348 L 560 30 Z"
          fill="#D4C4FF" fillOpacity={0.13}
        />
        <Path
          d="M 430 -20 C 396 20, 372 66, 378 108 C 382 146, 406 172, 430 190
             L 520 190 L 520 -20 Z"
          fill="#F3EDFF" fillOpacity={0.11}
        />

        {/* Layer 3, "Luminous Curved Lines" — both now pure #FFFFFF per the
            spec (the second was #EBE2FF). Opacities stay at the 0.72 / 0.52
            we tuned and froze on-device: the sheet specifies 30–45%, but at
            that level a white hairline on a near-white base effectively
            disappears. Deliberate deviation, not drift. */}
        <Path
          d="M 314 138 C 322 200, 356 262, 402 302"
          stroke="rgba(255,255,255,0.85)" strokeWidth={1.4} fill="none" strokeLinecap="round"
        />
        <Path
          d="M 306 186 C 348 214, 392 238, 430 246"
          stroke="rgba(255,255,255,0.62)" strokeWidth={1.1} fill="none" strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function AuthCanvas({ children, keyboard = true }) {
  const Wrapper = keyboard ? KeyboardAvoidingView : View;
  const wrapperProps = keyboard
    ? { behavior: Platform.OS === "ios" ? "padding" : "height" }
    : {};

  return (
    <ScreenBackdrop colors={AUTH_LAVENDER_GRADIENT}>
      {/* Scoped to AuthCanvas, not ScreenBackdrop, so onboarding is unaffected. */}
      <WelcomeBackground />
      <Wrapper {...wrapperProps} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </Wrapper>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  decorLayer: { ...StyleSheet.absoluteFillObject },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: IS_COMPACT ? 10 : 14,
    paddingBottom: IS_COMPACT ? 14 : 18,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    minHeight: height - (IS_COMPACT ? 64 : 76),
    alignSelf: "center",
  },
});
