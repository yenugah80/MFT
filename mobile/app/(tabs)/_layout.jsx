import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { fetchUserProfile } from "../../services/profileAPI";

const TabsLayout = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  // Check if onboarding has been completed
  useEffect(() => {
    if (!isSignedIn) return;

    const checkOnboarding = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const profile = await fetchUserProfile(token);
        console.log('[TabsLayout] Profile data:', {
          age: profile?.age,
          weightKg: profile?.weightKg,
          heightCm: profile?.heightCm,
          activityLevel: profile?.activityLevel,
          onboardingCompletedAt: profile?.onboardingCompletedAt,
        });

        // Onboarding is complete if:
        // 1. onboardingCompletedAt timestamp is set (new path), OR
        // 2. Profile has full setup (age, weight, height, activityLevel) - existing users
        const hasCompletedOnboarding = !!profile?.onboardingCompletedAt;
        const hasFullProfile = !!(
          profile?.age &&
          profile?.weightKg &&
          profile?.heightCm &&
          profile?.activityLevel
        );

        console.log('[TabsLayout] hasCompletedOnboarding:', hasCompletedOnboarding);
        console.log('[TabsLayout] hasFullProfile:', hasFullProfile);

        setOnboardingComplete(hasCompletedOnboarding || hasFullProfile);
      } catch (error) {
        console.warn("[TabsLayout] Error checking onboarding status:", error);
        // If we can't fetch, assume onboarding is needed
        setOnboardingComplete(false);
      }
    };

    checkOnboarding();
  }, [isSignedIn, getToken]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // If we're still checking onboarding status, show loading
  if (onboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Redirect to onboarding if not completed (index route handles step resume)
  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
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
