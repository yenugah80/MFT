import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { TEXT, SPACING, TYPOGRAPHY, BRAND } from "../constants/premiumTheme";

export default function LoadingSpinner({ message, size = "large", backgroundColor = "#FFFFFF" }) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <ActivityIndicator size={size} color={BRAND.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING[8],
  },
  content: {
    alignItems: "center",
    gap: SPACING[4],
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: "center",
  },
});
