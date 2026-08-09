import { StyleSheet, View } from "react-native";
import { FeatureRail } from "./brand";

export function WelcomeFeatureChips() {
  return (
    <View style={styles.root}>
      <FeatureRail />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
  },
});
