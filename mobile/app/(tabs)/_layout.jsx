import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../constants/colors";
import { useProfileContext } from "../../providers/ProfileProvider";

const TabsLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { onboardingComplete, isLoading: profileLoading, error, refetchProfile } = useProfileContext();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Show loading while profile is being fetched
  if (profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // CRITICAL FIX: Handle API errors - don't redirect to onboarding on error!
  // This was causing returning users to see onboarding when backend was slow/failing
  if (error) {
    // 401 errors are expected when auth token isn't ready yet - don't show error screen
    const is401 = error?.message?.includes('401') || error?.response?.status === 401;
    if (is401) {
      console.log('[TabsLayout] Auth token not ready, waiting...');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    // Log non-401 errors as warnings (not errors to avoid red screen in dev)
    console.warn('[TabsLayout] Profile fetch error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 }}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textLight} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>
          Connection Issue
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' }}>
          Unable to load your profile. Please check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetchProfile()}
          style={{ marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Only redirect to onboarding if profile loaded successfully AND onboarding is incomplete
  // onboardingComplete is true if: onboardingCompletedAt exists OR profile has full data
  if (onboardingComplete === false) {
    console.log('[TabsLayout] New user detected - redirecting to onboarding');
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
