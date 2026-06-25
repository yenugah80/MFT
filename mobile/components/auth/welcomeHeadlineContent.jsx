import { StyleSheet, View } from "react-native";
import { WelcomeValueHero } from "./brand";

export function WelcomeHeadlineContent() {
  return (
    <View style={styles.root}>
      <WelcomeValueHero />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    transform: [{ translateY: 0 }],
  },
});
