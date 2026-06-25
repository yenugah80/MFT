import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { AUTH_COLORS, CONTENT_MAX_WIDTH, IS_COMPACT, height } from "./constants";

export function AuthCanvas({ children, keyboard = true }) {
  const Wrapper = keyboard ? KeyboardAvoidingView : View;
  const wrapperProps = keyboard
    ? { behavior: Platform.OS === "ios" ? "padding" : "height" }
    : {};

  return (
    <LinearGradient
      colors={["#F2FAF4", AUTH_COLORS.canvas, "#FFF6EA"]}
      locations={[0, 0.52, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <View pointerEvents="none" style={styles.decorLayer}>
        <LinearGradient
          colors={["rgba(197, 233, 218, 0.34)", "rgba(255, 255, 255, 0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topWash}
        />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0)", "rgba(255, 213, 154, 0.24)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomWash}
        />
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  decorLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "52%",
  },
  bottomWash: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: IS_COMPACT ? 20 : 28,
    paddingBottom: 34,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    minHeight: height - 88,
    alignSelf: "center",
  },
});
