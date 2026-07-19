import { StyleSheet, View } from "react-native";
import { WelcomeSubcopy } from "./brand";

export function WelcomeSubheadlineContent() {
  return (
    <View style={styles.root}>
      <WelcomeSubcopy />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    transform: [{ translateY: 10 }],
  },
});
