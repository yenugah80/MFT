import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { CONTENT_MAX_WIDTH, IS_COMPACT, height, width } from "./constants";

const CREAM_GRADIENT = ["#FFFEFA", "#FBF4E6"];
const AUTH_LAVENDER_GRADIENT = ["#FCFBFF", "#F7F4FF", "#F1ECFF"];

/**
 * Shared backdrop — imported directly by onboarding (OnboardingLayout.jsx,
 * app/onboarding/index.jsx) as well as the auth screens. `colors` defaults to
 * the original warm cream so onboarding is unaffected; only AuthCanvas below
 * opts into the lavender ramp. Do NOT change the default here — that's the
 * exact "wide blast radius" mistake this file already burned a day on once.
 */
export function ScreenBackdrop({ children, style, colors = CREAM_GRADIENT }) {
  const locations = colors === AUTH_LAVENDER_GRADIENT ? [0, 0.55, 1] : undefined;
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, style]}
    >
      {children}
    </LinearGradient>
  );
}

/**
 * Flowing brand-tinted line work off the top-right, with a soft echo at the
 * bottom-left.
 *
 * pointerEvents="none" is load-bearing, not decoration: this layer sits above
 * the form in z-order, and without it every tap meant for a field or button
 * would be swallowed here — a silent failure with no error to trace.
 */
function AuthDecoration() {
  return (
    <View style={styles.decorLayer} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={`M ${width * 0.70} ${-30}
              C ${width * 1.06} ${height * 0.09}, ${width * 0.70} ${height * 0.21}, ${width * 1.05} ${height * 0.31}`}
          stroke="rgba(107, 78, 255, 0.13)" strokeWidth={30} fill="none" strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.60} ${-20}
              C ${width * 0.99} ${height * 0.10}, ${width * 0.60} ${height * 0.23}, ${width * 0.96} ${height * 0.35}
              C ${width * 1.12} ${height * 0.42}, ${width * 0.80} ${height * 0.51}, ${width * 1.04} ${height * 0.63}`}
          stroke="rgba(255, 255, 255, 0.65)" strokeWidth={1.5} fill="none"
        />
        <Path
          d={`M ${-30} ${height * 0.95}
              C ${width * 0.13} ${height * 0.87}, ${width * 0.11} ${height * 1.01}, ${width * 0.32} ${height * 0.97}`}
          stroke="rgba(107, 78, 255, 0.11)" strokeWidth={24} fill="none" strokeLinecap="round"
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
      <AuthDecoration />
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
    paddingTop: IS_COMPACT ? 14 : 20,
    paddingBottom: IS_COMPACT ? 18 : 24,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    minHeight: height - (IS_COMPACT ? 64 : 76),
    alignSelf: "center",
  },
});
