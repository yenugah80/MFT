import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AUTH_COLORS } from "./constants";

/**
 * Clickwrap consent, not a checkbox — same pattern DoorDash and Yelp use:
 * tapping Continue/Apple/Google IS the agreement to the Terms of Service and
 * Privacy Policy, no separate tick-then-tap step. Names all three sign-up
 * methods explicitly so the scope reads as covering whichever one the
 * person taps, not just email.
 *
 * Deliberately does NOT cover AI-assisted analysis (voice/photo food
 * logging via OpenAI). That consent touches health-adjacent data, and
 * GDPR Art. 9 requires it to be explicit and un-pre-ticked — a bundled
 * "by continuing" action doesn't satisfy that on its own. It's asked for
 * separately, once, via AIConsentPrompt (components/consent/AIConsentPrompt.jsx)
 * on first app open, with its own real Agree/Not now choice.
 */
export function ConsentDisclaimer() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        By continuing with email, Apple, or Google, you agree to our{" "}
        <Text style={styles.link} onPress={() => router.push("/terms")}>
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={() => router.push("/privacy")}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginBottom: 2,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    color: AUTH_COLORS.muted,
    textAlign: "center",
  },
  link: {
    color: AUTH_COLORS.primary,
    fontFamily: "DMSans_700Bold",
  },
});
