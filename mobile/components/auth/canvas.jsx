import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { CONTENT_MAX_WIDTH, IS_COMPACT, height } from "./constants";

/**
 * Shared warm-cream backdrop — used behind both the auth screens and
 * the onboarding flow. A barely-there two-tone sheen (not a visible
 * color transition) gives it a soft premium feel without competing
 * with content, buttons, or cards for attention.
 */
export function ScreenBackdrop({ children, style }) {
  return (
    <LinearGradient
      colors={["#FFFEFA", "#FBF4E6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function AuthCanvas({ children, keyboard = true }) {
  const Wrapper = keyboard ? KeyboardAvoidingView : View;
  const wrapperProps = keyboard
    ? { behavior: Platform.OS === "ios" ? "padding" : "height" }
    : {};

  return (
    <ScreenBackdrop>
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
