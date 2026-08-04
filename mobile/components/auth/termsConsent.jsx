import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { AUTH_COLORS } from "./constants";

/**
 * Single bundled agreement for account creation — Terms of Service, Privacy
 * Policy, and AI-assisted food analysis (voice/photo logging via OpenAI) all
 * covered by one explicit, unchecked-by-default checkbox. Checking it and
 * creating an account is what grants OpenAI consent; nothing is pre-ticked.
 */
export function TermsConsentCheckbox({ checked, onToggle }) {
  const router = useRouter();

  const toggle = () => {
    try { Haptics.selectionAsync(); } catch (_) {}
    onToggle(!checked);
  };

  return (
    <Pressable
      onPress={toggle}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
      hitSlop={8}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color={AUTH_COLORS.white} />}
      </View>
      <Text style={styles.label}>
        I agree to the{" "}
        <Text style={styles.link} onPress={() => router.push("/terms")}>
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={() => router.push("/privacy")}>
          Privacy Policy
        </Text>
        , including AI-assisted meal analysis.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: AUTH_COLORS.primary,
    borderColor: AUTH_COLORS.primary,
  },
  label: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: AUTH_COLORS.muted,
  },
  link: {
    color: AUTH_COLORS.primary,
    fontFamily: "DMSans_700Bold",
  },
});
