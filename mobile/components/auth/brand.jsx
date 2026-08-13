import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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

// Same bold-DMSans + purple bar-and-dot language as AuthHeroHeading on the
// sign-in screen — this screen previously used a different font entirely
// (TenorSans, a thin serif), which read as generic precisely because it
// didn't match anywhere else in the auth flow. One consistent typographic
// voice across welcome/sign-in/create-account is what actually reads as
// premium, not a fancier font in isolation.
export function WelcomeValueHero() {
  return (
    <View style={[styles.welcomeValueHero, styles.welcomeHeadlineWrap]}>
      <Text style={styles.welcomeHeadline}>
        Know Yourself{"\n"}
        <Text style={styles.welcomeHeadlineAccent}>Better</Text>
        <Text style={styles.heroSparkle}>  ✦</Text>
      </Text>
      <View style={styles.welcomeHeroIndicator}>
        <View style={styles.heroIndicatorBar} />
        <View style={styles.heroIndicatorDot} />
      </View>
    </View>
  );
}

export function WelcomeSubcopy() {
  return (
    <View style={styles.welcomeValueHero}>
      <Text style={styles.welcomeSubcopy}>
        Track your food, mood, water and activity.{"\n"}Build better habits. Live a healthier, happier you.
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
      {benefits.map((b) => (
        <View key={b.rest} style={styles.benefitChip}>
          <View style={[styles.benefitIcon, { backgroundColor: b.bg }]}>
            {/* Same top-left sheen as the category circles but weaker
                (0.40 vs 0.55), so these tiles stay a tier below them. */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.55)",
                "rgba(255,255,255,0)",
                "rgba(76,66,110,0.05)",
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.benefitIconSheen}
              pointerEvents="none"
            />
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
            {/* Top-left light source, shading to a faint cool tint at the
                bottom-right. The third stop is what actually sells the
                roundness: a highlight alone only brightens one corner and
                leaves the rest flat, so the first pass read as almost no
                depth at all. Shading BOTH ends is what makes a circle look
                spherical. It carries its own borderRadius rather than
                relying on overflow:"hidden" on the parent — that would clip
                the parent's shadow away on iOS. */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.75)",
                "rgba(255,255,255,0)",
                "rgba(76,66,110,0.07)",
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.featureNodeSheen}
              pointerEvents="none"
            />
            <Ionicons
              name={item.icon}
              size={IS_COMPACT ? 30 : 34}
              color={item.color}
              style={styles.featureNodeGlyph}
            />
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
  // Logo + wordmark are one brand lockup, so the gap between them is kept
  // deliberately tight — the separation that matters is the one BELOW the
  // lockup (welcomeHeadlineWrap.marginTop), not the one inside it.
  heroLogo: {
    width: IS_COMPACT ? 60 : 72,
    height: IS_COMPACT ? 60 : 72,
    marginBottom: IS_COMPACT ? 2 : 3,
    borderRadius: IS_COMPACT ? 30 : 36,
    overflow: "hidden",
  },
  heroBrand: {
    fontSize: IS_COMPACT ? 22 : 24,
    // Tightened from 28/32. A 24px face on a 32px line carries ~4px of dead
    // leading under the baseline, which loosened the lockup for no reason.
    lineHeight: IS_COMPACT ? 26 : 28,
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
  // Tightened from 18/26 — with a serif's looser rhythm this gap read fine,
  // but a bold sans sitting this far from the MFT wordmark above it read as
  // unbalanced rather than generous.
  // The one decisive break in the hero: separates the brand lockup above
  // from the headline group below. Was 10/16, which left the whole block
  // spaced almost evenly (~10 / 23 / 12 / 24 optically) so no grouping read
  // at all — the hierarchy was carried by font size alone. Roughly doubling
  // this is what makes the two groups legible as groups.
  welcomeHeadlineWrap: {
    marginTop: IS_COMPACT ? 22 : 32,
    marginBottom: IS_COMPACT ? 4 : 6,
  },
  // Same family/weight/tracking as heroTitle (AuthHeroHeading, sign-in) —
  // was TenorSans_400Regular, a thin serif that matched no other screen in
  // the auth flow and read as generic on its own. Slightly smaller than
  // heroTitle's 46 since this sits under a logo in a centered composition
  // rather than alone at the top of a left-aligned form.
  welcomeHeadline: {
    maxWidth: 400,
    fontSize: IS_COMPACT ? 34 : 40,
    lineHeight: IS_COMPACT ? 40 : 46,
    color: AUTH_COLORS.ink,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    letterSpacing: -1,
  },
  welcomeHeadlineAccent: { color: AUTH_COLORS.primary },
  welcomeHeroIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  welcomeSubcopy: {
    // The reference's two lines are different lengths (44 chars then 53),
    // which plain word-wrap can't produce from one container width no
    // matter how it's tuned — the text itself has an explicit "\n" after
    // "activity." now. This just needs to be wide enough for the longer
    // second line to not wrap again.
    maxWidth: 380,
    fontSize: IS_COMPACT ? 14 : 15,
    lineHeight: IS_COMPACT ? 20 : 23,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  heroHeadingWrap: {
    marginTop: IS_COMPACT ? 14 : 20,
    marginBottom: IS_COMPACT ? 14 : 16,
  },
  heroTitle: {
    fontSize: IS_COMPACT ? 32 : 38,
    lineHeight: IS_COMPACT ? 38 : 44,
    color: AUTH_COLORS.ink,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -1.2,
  },
  heroTitleAccent: { color: AUTH_COLORS.primary },
  heroSparkle: {
    fontSize: IS_COMPACT ? 17 : 19,
    color: AUTH_COLORS.primaryLight,
  },
  heroIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: IS_COMPACT ? 8 : 10,
    marginBottom: IS_COMPACT ? 10 : 12,
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
    fontSize: IS_COMPACT ? 15 : 16,
    lineHeight: IS_COMPACT ? 19 : 20,
    color: AUTH_COLORS.text,
    fontFamily: "DMSans_500Medium",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: IS_COMPACT ? 14 : 15,
    lineHeight: IS_COMPACT ? 18 : 19,
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
  // Icon-left, text-right (matching the reference) — row aligned to
  // flex-start rather than center. A chip whose description wraps to an
  // extra line (e.g. "Healthier Habits") stands taller than the others; with
  // the row centered on cross-axis that pulled every icon to a different
  // vertical position, visibly misaligned. Top-aligning the row keeps every
  // icon pinned to the same y regardless of how its own label wraps —
  // fixes the alignment without changing the horizontal icon+text shape.
  benefitRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  benefitChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingRight: 6,
  },
  // Soft glass tile — every value here is a step below the category circles
  // above (border 0.5 vs 0.7, shadow 0.06 vs 0.10, sheen 0.40 vs 0.55) so
  // these read as the lighter tier, per the brief.
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#1F1B3D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 1,
  },
  benefitIconSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
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
  // A true circle (equal width/height, radius = half) — was a squat
  // rounded-rect (66×52) that read visibly smaller/flatter than the
  // reference's clean circular badges.
  featureNodeIcon: {
    width: IS_COMPACT ? 54 : 64,
    height: IS_COMPACT ? 54 : 64,
    borderRadius: IS_COMPACT ? 27 : 32,
    alignItems: "center",
    justifyContent: "center",
    // The hairline white border doubles as the inner highlight.
    borderWidth: 0.7,
    borderColor: "rgba(255, 255, 255, 0.88)",
    // Ambient lift only — a cool near-navy at 10% over 6px of blur. Kept
    // deliberately small: enough to separate the circle from the pill behind
    // it, well short of the hard offset shadow that reads as claymorphism.
    shadowColor: "#1F1B3D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 2,
  },
  featureNodeSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: IS_COMPACT ? 27 : 32,
  },
  // Tiny soft shadow under the glyph itself so the line art sits *in* the
  // circle rather than floating flat on top of it. Ionicons renders as text,
  // so textShadow* applies.
  featureNodeGlyph: {
    textShadowColor: "rgba(31, 27, 61, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2.5,
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
