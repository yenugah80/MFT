import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND, TEXT, SURFACES, TYPOGRAPHY } from "../../constants/premiumTheme";
import { useProfileContext } from "../../providers/ProfileProvider";
import LoadingSpinner from "../../components/LoadingSpinner";
import AIConsentPrompt from "../../components/consent/AIConsentPrompt";

// Height of the bar's own content (icon + label + padding), excluding whatever
// the device reserves at the bottom for the home indicator.
const TAB_BAR_CONTENT_HEIGHT = 60;

const TabsLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();
  const { onboardingComplete, profile, isLoading } = useProfileContext();

  // Safety guards — index.jsx handles the happy-path routing;
  // these only fire on direct deep-links or unexpected state changes.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Block only on the INITIAL profile load (no cached data yet).
  // Background refetches keep isLoading false, so this never re-fires mid-session.
  if (!profile && isLoading) return <LoadingSpinner message="Loading your profile…" />;

  if (onboardingComplete === false) return <Redirect href="/onboarding" />;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: TEXT.tertiary,
        // Height and bottom padding are derived from the device's safe-area
        // inset rather than hardcoded. A fixed `height: 80, paddingBottom: 8`
        // crowded the labels against the home indicator on iPhone X and later
        // (~34pt inset), and made the bar needlessly tall on devices with no
        // inset at all, like the SE.
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: SURFACES.divider,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: TYPOGRAPHY.family.semibold,
        },
      }}
    >
      {/* Hidden index route - redirects to dashboard, not shown in tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hides from tab bar
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    {/* Mounted here rather than at the app root so it can only appear for a
        signed-in, onboarded user — never over the auth or onboarding flow.
        Self-gating: renders null unless the server says this account has never
        been asked. */}
    <AIConsentPrompt />
    </>
  );
};

export default TabsLayout;
