import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { TEXT, SURFACES, SPACING, TYPOGRAPHY, BRAND } from "../constants/premiumTheme";

export default function LoadingSpinner({ message = "Loading...", size = "large" }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size={size} color={BRAND.primary} />
        <Text style={styles.message}>{message}</Text>
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
    backgroundColor: SURFACES.background.primary,
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
