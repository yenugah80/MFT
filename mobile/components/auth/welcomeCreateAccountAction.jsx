import { View } from "react-native";
import { PrimaryButton } from "./buttons";

// No translateY here: the welcome screen positions this block with
// `marginTop: "auto"`, and a transform on top of that used to lift the button
// over the content above it — including into the benefit chips' tap area.
export function WelcomeCreateAccountAction({ onPress }) {
  return (
    <View>
      <PrimaryButton title="Create Account" onPress={onPress} />
    </View>
  );
}
