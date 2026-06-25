import { StyleSheet, View } from "react-native";
import { WelcomePrivacyNote } from "./brand";

export function WelcomePrivacyAction() {
  return (
    <View style={styles.root}>
      <WelcomePrivacyNote />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    transform: [{ translateY: 0 }],
  },
});
