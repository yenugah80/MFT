import { View } from "react-native";
import { FooterLink } from "./buttons";

export function WelcomeSignInAction({ onPress }) {
  return (
    <View>
      <FooterLink prompt="Already have an account?" action="Sign In" onPress={onPress} />
    </View>
  );
}
