import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BRAND, TEXT, SURFACES, TYPOGRAPHY } from "../../constants/premiumTheme";
import { useProfileContext } from "../../providers/ProfileProvider";
import LoadingSpinner from "../../components/LoadingSpinner";

const TabsLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: TEXT.tertiary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: SURFACES.divider,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
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
  );
};

export default TabsLayout;
