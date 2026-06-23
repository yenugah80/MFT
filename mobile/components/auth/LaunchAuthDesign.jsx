import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

export const AUTH_COLORS = {
  canvas: "#FFFDF8",
  canvasWarm: "#FFF5E9",
  canvasMint: "#ECF7EC",
  green: "#06452D",
  greenDeep: "#03371F",
  greenSoft: "#2C7A53",
  text: "#0D1B18",
  muted: "#67747B",
  line: "rgba(15, 36, 31, 0.12)",
  card: "rgba(255, 255, 255, 0.82)",
  danger: "#A64252",
  dangerBg: "rgba(166, 66, 82, 0.1)",
  success: "#2C7A53",
  successBg: "rgba(44, 122, 83, 0.12)",
  white: "#FFFFFF",
};

const CONTENT_MAX_WIDTH = width >= 768 ? 500 : 460;
const IS_COMPACT = height <= 760;
const IS_SHORT = height <= 700;

// Proper multicolor Google G logo using SVG paths
function GoogleIconSVG({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export function AuthCanvas({ children, keyboard = true }) {
  const Wrapper = keyboard ? KeyboardAvoidingView : View;
  const wrapperProps = keyboard
    ? { behavior: Platform.OS === "ios" ? "padding" : "height" }
    : {};

  return (
    <LinearGradient
      colors={[AUTH_COLORS.canvasMint, AUTH_COLORS.canvas, AUTH_COLORS.canvasWarm]}
      locations={[0, 0.44, 1]}
      style={styles.root}
    >
      <View pointerEvents="none" style={styles.decorLayer}>
        <LinearGradient
          colors={["rgba(172, 214, 165, 0.42)", "rgba(255, 255, 255, 0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topWash}
        />
        <LinearGradient
          colors={["rgba(255, 190, 114, 0)", "rgba(255, 190, 114, 0.34)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bottomWash}
        />
        <Ionicons name="leaf-outline" size={150} color="rgba(44, 122, 83, 0.15)" style={styles.leafLeft} />
        <Ionicons name="leaf-outline" size={136} color="rgba(237, 144, 61, 0.12)" style={styles.leafRight} />
      </View>

      <Wrapper {...wrapperProps} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </Wrapper>
    </LinearGradient>
  );
}

export function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.backButton}>
      <Ionicons name="chevron-back" size={24} color={AUTH_COLORS.text} />
    </TouchableOpacity>
  );
}

export function SmallBrand({ style }) {
  return (
    <View style={[styles.smallBrand, style]}>
      <Image source={require("../../assets/images/app-logo.png")} style={styles.smallLogo} contentFit="contain" />
      <Text style={styles.smallBrandText}>M F T</Text>
    </View>
  );
}

export function WelcomeBrand() {
  return (
    <Animated.View entering={FadeIn.delay(80).duration(420)} style={styles.welcomeBrand}>
      <View style={styles.logoPedestal}>
        <View style={styles.logoShadow} />
        <Image source={require("../../assets/images/app-logo.png")} style={styles.heroLogo} contentFit="contain" />
      </View>
      <Text style={styles.heroBrand}>MFT</Text>
      <Text style={styles.heroSubBrand}>My Food & Mood Tracker</Text>
      <View style={styles.brandDivider}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerDot} />
        <View style={styles.dividerLine} />
      </View>
    </Animated.View>
  );
}

// compact=true → smaller title for form screens (Create your account, Sign In, etc.)
// centered=true → center-align all text
export function AuthHeading({ title, subtitle, centered = false, compact = false }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(90).duration(420)}
      style={[
        styles.heading,
        centered && styles.headingCentered,
        compact && styles.headingCompact,
      ]}
    >
      <Text style={[styles.screenTitle, centered && styles.textCenter, compact && styles.screenTitleCompact]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.screenSubtitle, centered && styles.textCenter]}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

export function FeatureRail() {
  const features = useMemo(
    () => [
      { label: "Food", icon: "leaf-outline", color: "#228656", bg: "rgba(34, 134, 86, 0.11)" },
      { label: "Mood", icon: "happy-outline", color: "#198B5C", bg: "rgba(25, 139, 92, 0.11)" },
      { label: "Water", icon: "water-outline", color: "#0AA8C7", bg: "rgba(10, 168, 199, 0.11)" },
      { label: "Activity", icon: "walk-outline", color: "#E87924", bg: "rgba(232, 121, 36, 0.12)" },
    ],
    []
  );

  return (
    <Animated.View entering={FadeInDown.delay(170).duration(420)} style={styles.featureRow}>
      {features.map((item) => (
        <View key={item.label} style={styles.featureItem}>
          <View style={styles.featureTile}>
            <View style={[styles.featureIconWash, { backgroundColor: item.bg }]} />
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>
          <Text style={styles.featureLabel}>{item.label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// Renders an optional label above the input shell
export function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  inputRef,
  children,
  ...inputProps
}) {
  return (
    <View style={[styles.fieldWrapper, !label && styles.fieldWrapperNoLabel]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        <Ionicons
          name={icon}
          size={22}
          color={focused ? AUTH_COLORS.green : AUTH_COLORS.muted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={AUTH_COLORS.muted}
          selectionColor={AUTH_COLORS.green}
          keyboardAppearance="light"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          {...inputProps}
        />
        {children}
      </View>
    </View>
  );
}

// White card button with the official Google multicolor G logo
export function GoogleButton({ onPress, loading, title = "Continue with Google" }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[styles.googleButton, loading && styles.disabled]}
    >
      <GoogleIconSVG size={22} />
      <Text style={styles.googleButtonText}>{loading ? "Connecting…" : title}</Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({ title, loading, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[styles.primaryWrap, (disabled || loading) && styles.disabled]}
    >
      <LinearGradient
        colors={[AUTH_COLORS.greenDeep, AUTH_COLORS.green, "#075C3C"]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>{title}</Text>
        <Ionicons
          name={loading ? "time-outline" : "arrow-forward"}
          size={26}
          color={AUTH_COLORS.white}
          style={styles.primaryIcon}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function Notice({ type, text }) {
  if (!text) return null;
  const isError = type === "error";
  return (
    <View style={[styles.notice, isError ? styles.noticeError : styles.noticeSuccess]}>
      <Ionicons
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={17}
        color={isError ? AUTH_COLORS.danger : AUTH_COLORS.success}
      />
      <Text style={[styles.noticeText, isError && styles.noticeTextError]}>{text}</Text>
    </View>
  );
}

export function AuthDivider({ label = "OR" }) {
  return (
    <View style={styles.authDivider}>
      <View style={styles.authDividerLine} />
      <Text style={styles.authDividerText}>{label}</Text>
      <View style={styles.authDividerLine} />
    </View>
  );
}

export function FooterLink({ prompt, action, onPress }) {
  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerPrompt}>{prompt}</Text>
      <Pressable onPress={onPress} hitSlop={10}>
        <Text style={styles.footerAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  decorLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "58%",
    height: "36%",
  },
  bottomWash: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "64%",
    height: "30%",
  },
  leafLeft: {
    position: "absolute",
    left: -46,
    bottom: -12,
    transform: [{ rotate: "-24deg" }],
  },
  leafRight: {
    position: "absolute",
    right: -32,
    bottom: 18,
    transform: [{ rotate: "32deg" }],
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: IS_COMPACT ? 34 : 54,
    paddingBottom: 34,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    minHeight: height - 88,
    alignSelf: "center",
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(12, 34, 26, 0.18)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  smallBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  smallLogo: { width: 34, height: 34 },
  smallBrandText: {
    fontSize: 20,
    color: AUTH_COLORS.green,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 8,
  },
  welcomeBrand: {
    alignItems: "center",
    marginTop: IS_SHORT ? 16 : 46,
  },
  logoPedestal: {
    width: 214,
    height: IS_COMPACT ? 130 : 154,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: IS_COMPACT ? 8 : 16,
  },
  logoShadow: {
    position: "absolute",
    bottom: 4,
    width: 206,
    height: 58,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    shadowColor: "rgba(30, 58, 42, 0.16)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 8,
  },
  heroLogo: {
    width: IS_COMPACT ? 104 : 126,
    height: IS_COMPACT ? 104 : 126,
    marginBottom: 18,
  },
  heroBrand: {
    fontSize: IS_COMPACT ? 88 : 104,
    lineHeight: IS_COMPACT ? 96 : 112,
    color: AUTH_COLORS.green,
    fontFamily: "TenorSans_400Regular",
    letterSpacing: 7,
  },
  heroSubBrand: {
    marginTop: IS_COMPACT ? 0 : 4,
    fontSize: 19,
    color: AUTH_COLORS.greenSoft,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1.5,
  },
  brandDivider: {
    marginTop: 20,
    marginBottom: IS_COMPACT ? 22 : 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dividerLine: {
    width: 58,
    height: 1,
    backgroundColor: "rgba(6, 69, 45, 0.12)",
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AUTH_COLORS.greenSoft,
  },
  heading: {
    marginTop: IS_COMPACT ? 44 : 88,
    marginBottom: 28,
  },
  headingCentered: {
    alignItems: "center",
    marginTop: 0,
  },
  headingCompact: {
    marginTop: IS_COMPACT ? 20 : 28,
    marginBottom: IS_COMPACT ? 22 : 28,
  },
  textCenter: { textAlign: "center" },
  screenTitle: {
    fontSize: IS_COMPACT ? 44 : 52,
    lineHeight: IS_COMPACT ? 52 : 60,
    color: AUTH_COLORS.green,
    fontFamily: "TenorSans_400Regular",
    letterSpacing: 0,
  },
  // Smaller title variant used on form screens (sign-in/sign-up details)
  screenTitleCompact: {
    fontSize: IS_COMPACT ? 30 : 36,
    lineHeight: IS_COMPACT ? 38 : 44,
  },
  screenSubtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: IS_COMPACT ? 24 : 34,
    marginBottom: IS_COMPACT ? 30 : 42,
  },
  featureItem: {
    width: "23%",
    alignItems: "center",
  },
  featureTile: {
    width: IS_COMPACT ? 58 : 64,
    height: IS_COMPACT ? 58 : 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "rgba(27, 46, 36, 0.12)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  featureIconWash: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  featureLabel: {
    marginTop: 12,
    fontSize: 13,
    color: AUTH_COLORS.text,
    fontFamily: "DMSans_500Medium",
  },
  // Wrapper gives each field its top label + bottom spacing
  fieldWrapper: {
    marginBottom: 18,
  },
  fieldWrapperNoLabel: {
    // no extra margin needed — inputShell's own marginBottom handled inline
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: AUTH_COLORS.text,
    marginBottom: 8,
    letterSpacing: 0,
  },
  inputShell: {
    height: IS_COMPACT ? 62 : 68,
    borderRadius: 17,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: AUTH_COLORS.line,
    shadowColor: "rgba(22, 33, 30, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  inputShellFocused: {
    borderColor: "rgba(6, 69, 45, 0.34)",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  inputIcon: { marginRight: 16 },
  input: {
    flex: 1,
    height: "100%",
    color: AUTH_COLORS.text,
    fontSize: 17,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0,
  },
  // Google SSO button — white card with Google G logo
  googleButton: {
    height: IS_COMPACT ? 62 : 68,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: AUTH_COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
    color: AUTH_COLORS.text,
    letterSpacing: 0,
  },
  primaryWrap: {
    marginTop: 24,
    shadowColor: "rgba(3, 55, 31, 0.28)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 7,
  },
  disabled: { opacity: 0.65 },
  primaryButton: {
    height: IS_COMPACT ? 64 : 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 21,
    color: AUTH_COLORS.white,
    fontFamily: "TenorSans_400Regular",
    letterSpacing: 0,
  },
  primaryIcon: {
    position: "absolute",
    right: 28,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    marginBottom: 18,
  },
  noticeSuccess: { backgroundColor: AUTH_COLORS.successBg },
  noticeError: { backgroundColor: AUTH_COLORS.dangerBg },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: AUTH_COLORS.success,
    fontFamily: "DMSans_500Medium",
  },
  noticeTextError: { color: AUTH_COLORS.danger },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginVertical: 22,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(15, 36, 31, 0.1)",
  },
  authDividerText: {
    fontSize: 14,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  footerPrompt: {
    fontSize: 15,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
  footerAction: {
    fontSize: 15,
    color: AUTH_COLORS.green,
    fontFamily: "DMSans_700Bold",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(6, 69, 45, 0.38)",
    paddingBottom: 2,
  },
});

export const authStyles = styles;
