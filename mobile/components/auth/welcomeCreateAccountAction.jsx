import { StyleSheet, View } from "react-native";
import { PrimaryButton } from "./buttons";

export function WelcomeCreateAccountAction({ onPress }) {
  return (
    <View style={styles.root}>
      <PrimaryButton title="Create Account" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    transform: [{ translateY: -46 }],
  },
});
