import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AUTH_COLORS, IS_COMPACT } from "./constants";

function GoogleIconSVG({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export function BackButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.surfacePressed]}>
      <Ionicons name="chevron-back" size={24} color={AUTH_COLORS.ink} />
    </Pressable>
  );
}

export function PrimaryButton({ title, loading, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryWrap,
        style,
        pressed && styles.primaryPressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={[AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>{title}</Text>
        <Ionicons
          name={loading ? "time-outline" : "arrow-forward"}
          size={24}
          color={AUTH_COLORS.white}
          style={styles.primaryIcon}
        />
      </LinearGradient>
    </Pressable>
  );
}

export function AppleButton({ onPress, loading, title = "Continue with Apple", style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.socialButton,
        styles.socialButtonApple,
        style,
        pressed && styles.socialButtonPressed,
        loading && styles.disabled,
      ]}
    >
      <View style={[styles.socialIconBadge, styles.appleIconBadge]}>
        {loading ? (
          <ActivityIndicator size="small" color={AUTH_COLORS.ink} />
        ) : (
          <Ionicons name="logo-apple" size={23} color="#000" />
        )}
      </View>
      <Text style={styles.socialButtonText}>{loading ? "Connecting…" : title}</Text>
      <Ionicons name="arrow-forward" size={20} color="rgba(7, 19, 30, 0.34)" style={styles.socialArrow} />
    </Pressable>
  );
}

export function GoogleButton({ onPress, loading, title = "Continue with Google", style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.socialButton,
        styles.socialButtonGoogle,
        style,
        pressed && styles.socialButtonPressed,
        loading && styles.disabled,
      ]}
    >
      <View style={styles.socialIconBadge}>
        {loading ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleIconSVG size={21} />}
      </View>
      <Text style={styles.socialButtonText}>{loading ? "Connecting…" : title}</Text>
      <Ionicons name="arrow-forward" size={20} color="rgba(7, 19, 30, 0.34)" style={styles.socialArrow} />
    </Pressable>
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
  surfacePressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82,
  },
  disabled: { opacity: 0.65 },
  backButton: {
    width: IS_COMPACT ? 44 : 48,
    height: IS_COMPACT ? 44 : 48,
    borderRadius: IS_COMPACT ? 22 : 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(35, 20, 65, 0.18)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryWrap: {
    marginTop: IS_COMPACT ? 10 : 16,
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButton: {
    height: IS_COMPACT ? 50 : 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: IS_COMPACT ? 16 : 17,
    color: AUTH_COLORS.white,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0,
  },
  primaryIcon: {
    position: "absolute",
    right: 24,
  },
  socialButton: {
    height: IS_COMPACT ? 44 : 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.94)",
    shadowColor: "rgba(7, 19, 30, 0.12)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 6,
  },
  socialButtonApple: {
    marginTop: 0,
  },
  socialButtonGoogle: {
    shadowOpacity: 0.11,
  },
  socialButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  socialIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(7, 19, 30, 0.06)",
    marginRight: 10,
  },
  appleIconBadge: {
    backgroundColor: "rgba(7, 19, 30, 0.04)",
  },
  socialButtonText: {
    flex: 1,
    fontSize: IS_COMPACT ? 13 : 14,
    fontFamily: "DMSans_700Bold",
    color: AUTH_COLORS.text,
    letterSpacing: 0,
  },
  socialArrow: {
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  footerPrompt: {
    fontSize: 14,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
  footerAction: {
    fontSize: 16,
    color: AUTH_COLORS.primary,
    fontFamily: "DMSans_700Bold",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(107, 78, 255, 0.38)",
    paddingBottom: 2,
  },
});
