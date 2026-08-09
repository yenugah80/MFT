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
      <Text style={styles.welcomeHeadline}>
        Know Yourself{"\n"}
        <Text style={styles.welcomeHeadlineAccent}>Better</Text>
        <Text style={styles.heroSparkle}>  ✦</Text>
      </Text>
    </View>
  );
}

export function WelcomeSubcopy() {
  return (
    <View style={styles.welcomeValueHero}>
      <Text style={styles.welcomeSubcopy}>
        Track your food, mood, water and activity. Build better habits.
        Live a healthier, happier you.
      </Text>
    </View>
  );
}

/**
 * Large two-tone heading for the sign-in screen. Splits the final word into
 * the accent colour ("Welcome back" → "Welcome" + "back ✦"); a single-word
 * title simply renders plain, so any string is safe.
 */
export function AuthHeroHeading({ title, lead, subtitle }) {
  const words = String(title || "").trim().split(" ");
  const accent = words.pop();
  const leading = words.join(" ");

  return (
    <View style={styles.heroHeadingWrap}>
      <Text style={styles.heroTitle}>
        {leading ? `${leading}\n` : ""}
        <Text style={styles.heroTitleAccent}>{accent}</Text>
        <Text style={styles.heroSparkle}>  ✦</Text>
      </Text>
      <View style={styles.heroIndicator}>
        <View style={styles.heroIndicatorBar} />
        <View style={styles.heroIndicatorDot} />
      </View>
      {lead ? <Text style={styles.heroLead}>{lead}</Text> : null}
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Small-caps rule between the feature icons and the benefit chips. */
export function WelcomeStoryDivider() {
  return (
    <View style={styles.storyDivider}>
      <View style={styles.storyDividerLine} />
      <View style={styles.storyDividerDot} />
      <Text style={styles.storyDividerText}>Every habit tells a story</Text>
      <View style={styles.storyDividerDot} />
      <View style={styles.storyDividerLine} />
    </View>
  );
}

/** Three-up "what this gets you" row under the feature icons. */
export function WelcomeBenefitChips() {
  const benefits = useMemo(
    () => [
      { lead: "See",   rest: "Your Progress",    icon: "bar-chart",  color: "#5B4B8A", bg: "rgba(91, 75, 138, 0.10)" },
      { lead: "Feel",  rest: "Your Best",        icon: "heart",      color: "#D45A83", bg: "rgba(212, 90, 131, 0.12)" },
      { lead: "Build", rest: "Healthier Habits", icon: "leaf",       color: "#2E7D4F", bg: "rgba(46, 125, 79, 0.12)" },
    ],
    []
  );

  return (
    <View style={styles.benefitRow}>
      {benefits.map((b, i) => (
        <View key={b.rest} style={[styles.benefitChip, i < benefits.length - 1 && styles.benefitChipDivider]}>
          <View style={[styles.benefitIcon, { backgroundColor: b.bg }]}>
            <Ionicons name={b.icon} size={15} color={b.color} />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text style={styles.benefitLead}>{b.lead}</Text>
            <Text style={styles.benefitRest}>{b.rest}</Text>
          </View>
        </View>
      ))}
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
      <Ionicons name="analytics-outline" size={17} color={AUTH_COLORS.primaryLight} />
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
    color: AUTH_COLORS.primaryLight,
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
    color: AUTH_COLORS.primary,
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
    maxWidth: 380,
    fontSize: IS_COMPACT ? 34 : 42,
    lineHeight: IS_COMPACT ? 40 : 48,
    color: AUTH_COLORS.ink,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  welcomeHeadlineAccent: { color: AUTH_COLORS.primary },
  welcomeSubcopy: {
    maxWidth: 340,
    fontSize: IS_COMPACT ? 14 : 15,
    lineHeight: IS_COMPACT ? 20 : 23,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  heroHeadingWrap: {
    marginTop: IS_COMPACT ? 20 : 34,
    marginBottom: 26,
  },
  heroTitle: {
    fontSize: IS_COMPACT ? 38 : 46,
    lineHeight: IS_COMPACT ? 44 : 52,
    color: AUTH_COLORS.ink,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -1.2,
  },
  heroTitleAccent: { color: AUTH_COLORS.primary },
  heroSparkle: {
    fontSize: IS_COMPACT ? 19 : 22,
    color: AUTH_COLORS.primaryLight,
  },
  heroIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  heroIndicatorBar: {
    width: 44,
    height: 4,
    borderRadius: 10,
    backgroundColor: AUTH_COLORS.primary,
  },
  heroIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 7,
    backgroundColor: AUTH_COLORS.primaryLight,
  },
  heroLead: {
    fontSize: IS_COMPACT ? 16 : 17,
    lineHeight: 24,
    color: AUTH_COLORS.text,
    fontFamily: "DMSans_500Medium",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: IS_COMPACT ? 15 : 16,
    lineHeight: 23,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
  storyDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingHorizontal: 2,
  },
  storyDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(107, 78, 255, 0.16)",
  },
  storyDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AUTH_COLORS.primaryLight,
  },
  storyDividerText: {
    fontSize: 11,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  benefitRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  benefitChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingRight: 6,
  },
  benefitChipDivider: {
    borderRightWidth: 1,
    borderRightColor: "rgba(15, 36, 31, 0.08)",
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextWrap: { flexShrink: 1 },
  benefitLead: {
    fontSize: 11,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
  benefitRest: {
    fontSize: 11.5,
    color: AUTH_COLORS.text,
    fontFamily: "DMSans_700Bold",
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
    borderColor: "rgba(107, 78, 255, 0.07)",
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
    color: AUTH_COLORS.primary,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  privacyNote: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  privacyNoteText: {
    fontSize: 12,
    // Was 99 — a typo that padded this row to ~99pt tall and pushed the whole
    // welcome layout up. The lock icon and label are meant to sit tight.
    lineHeight: 16,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.1,
  },
});
