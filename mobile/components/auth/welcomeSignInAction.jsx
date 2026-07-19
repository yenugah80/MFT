import { StyleSheet, View } from "react-native";
import { FooterLink } from "./buttons";

export function WelcomeSignInAction({ onPress }) {
  return (
    <View style={styles.root}>
      <FooterLink prompt="Already have an account?" action="Sign In" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 40,
    transform: [{ translateY: -38 }],
  },
});
