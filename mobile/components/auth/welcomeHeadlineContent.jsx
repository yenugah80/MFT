import { View } from "react-native";
import { WelcomeValueHero } from "./brand";

// Spacing lives in WelcomeValueHero / the parent's `gap`. This used to carry a
// translateY nudge tuned for the old three-block welcome layout; with the story
// divider and benefit chips added it pulled content into an overlap.
export function WelcomeHeadlineContent() {
  return (
    <View>
      <WelcomeValueHero />
    </View>
  );
}
