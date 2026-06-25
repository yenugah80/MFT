import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AUTH_COLORS, IS_COMPACT } from "./constants";

export function WelcomeBrand() {
  return (
    <View style={styles.welcomeBrand}>
      <Image source={require("../../assets/images/app-logo.png")} style={styles.heroLogo} contentFit="contain" />
      <Text style={styles.heroBrand}>MFT</Text>
    </View>
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

export function WelcomeValueHero() {
  return (
    <View style={[styles.welcomeValueHero, styles.welcomeHeadlineWrap]}>
      <Text style={styles.welcomeHeadline}>Know Yourself Better</Text>
    </View>
  );
}

export function WelcomeSubcopy() {
  return (
    <View style={styles.welcomeValueHero}>
      <Text style={styles.welcomeSubcopy}>Every habit tells a story</Text>
    </View>
  );
}

export function FeatureRail() {
  const features = useMemo(
    () => [
      { label: "Food",     icon: "restaurant-outline", color: "#C1642B", bg: "rgba(193, 100, 43, 0.13)"  },
      { label: "Mood",     icon: "happy-outline",      color: "#6B4EAE", bg: "rgba(107, 78, 174, 0.12)" },
      { label: "Water",    icon: "water-outline",      color: "#087F9B", bg: "rgba(8, 127, 155, 0.13)"  },
      { label: "Activity", icon: "walk-outline",       color: "#2E7D4F", bg: "rgba(46, 125, 79, 0.13)"  },
    ],
    []
  );

  return (
    <View style={styles.featureSystem}>
      {features.map((item) => (
        <View key={item.label} style={styles.featureNode}>
          <View style={[styles.featureNodeIcon, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={IS_COMPACT ? 28 : 31} color={item.color} />
          </View>
          <Text style={styles.featureNodeLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function WelcomeTrustMessage() {
  return (
    <View style={styles.trustMessage}>
      <Ionicons name="analytics-outline" size={17} color={AUTH_COLORS.greenSoft} />
      <Text style={styles.trustMessageText}>Personalized insights from your daily habits</Text>
    </View>
  );
}

export function WelcomePrivacyNote() {
  return (
    <View style={styles.privacyNote}>
      <Ionicons name="lock-closed-outline" size={15} color={AUTH_COLORS.muted} />
      <Text style={styles.privacyNoteText}>Your data is private and secure</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeBrand: {
    alignItems: "center",
    paddingTop: IS_COMPACT ? 4 : 6,
  },
  heroLogo: {
    width: IS_COMPACT ? 60 : 72,
    height: IS_COMPACT ? 60 : 72,
    marginBottom: IS_COMPACT ? 4 : 6,
    borderRadius: IS_COMPACT ? 30 : 36,
    overflow: "hidden",
  },
  heroBrand: {
    fontSize: IS_COMPACT ? 22 : 24,
    lineHeight: IS_COMPACT ? 28 : 32,
    color: AUTH_COLORS.ink,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.8,
    marginLeft: 1,
  },
  heroSubBrand: {
    marginTop: 4,
    fontSize: 13,
    color: AUTH_COLORS.greenSoft,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.2,
  },
  smallBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  smallLogo: { width: 34, height: 34 },
  smallBrandText: {
    fontSize: 12,
    color: AUTH_COLORS.green,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 8,
  },
  welcomeValueHero: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 2,
  },
  welcomeHeadlineWrap: {
    marginTop: IS_COMPACT ? 18 : 26,
    marginBottom: IS_COMPACT ? 8 : 12,
  },
  welcomeHeadline: {
    maxWidth: 360,
    fontSize: IS_COMPACT ? 36 : 44,
    lineHeight: IS_COMPACT ? 44 : 54,
    color: AUTH_COLORS.ink,
    fontFamily: "TenorSans_400Regular",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  welcomeSubcopy: {
    maxWidth: 320,
    fontSize: IS_COMPACT ? 13 : 15,
    lineHeight: IS_COMPACT ? 19 : 23,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  featureSystem: {
    width: "105%",
    marginTop: IS_COMPACT ? 6 : 10,
    height: IS_COMPACT ? 108 : 116,
    borderRadius: 72,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 0.5,
    borderColor: "rgba(6, 69, 45, 0.07)",
    shadowColor: "rgba(7, 19, 30, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  featureNode: {
    flex: 0.6,
    alignItems: "center",
    justifyContent: "center",
  },
  featureNodeIcon: {
    width: IS_COMPACT ? 48 : 66,
    height: IS_COMPACT ? 38 : 52,
    borderRadius: IS_COMPACT ? 14 : 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.7,
    borderColor: "rgba(255, 255, 255, 0.88)",
  },
  featureNodeLabel: {
    marginTop: 1,
    fontSize: IS_COMPACT ? 11 : 12,
    color: AUTH_COLORS.text,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.1,
  },
  trustMessage: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  trustMessageText: {
    fontSize: 11,
    lineHeight: 15,
    color: AUTH_COLORS.green,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  privacyNote: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  privacyNoteText: {
    fontSize: 12,
    lineHeight: 99,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.1,
  },
});
