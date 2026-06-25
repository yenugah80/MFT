import { useEffect, useCallback } from "react";
import { Slot, useRouter } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { Platform } from "react-native";
import { setBackgroundMessageHandler } from "@/services/fcmService";

// Register FCM background handler at module level — MUST be outside any component
// so it is registered before React renders (Firebase requirement).
// Skip on web: Firebase messaging is not supported and this crashes SSR.
if (Platform.OS !== 'web') {
  setBackgroundMessageHandler(async (remoteMessage) => {
    // Background/killed-state FCM messages are displayed automatically by Firebase.
    // Only add custom data processing here if needed.
    console.log("[App] FCM background message:", remoteMessage.notification?.title);
  });
}
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { LogBox, View } from "react-native";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { TenorSans_400Regular } from "@expo-google-fonts/tenor-sans";
import { GreatVibes_400Regular } from "@expo-google-fonts/great-vibes";
import SafeScreen from "@/components/SafeScreen";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ApiInitializer from "@/components/ApiInitializer";
import DatabaseInitializer from "@/components/DatabaseInitializer";
import OnboardingGuard from "@/components/OnboardingGuard";
import SmartNotificationInitializer from "@/components/SmartNotificationInitializer";
import InitializationGuard from "@/components/InitializationGuard";
import { cleanupAnalytics } from "@/services/analytics";
import { runProductionStartup, getStartupReport } from "@/services/productionStartup";
import Toast from "react-native-toast-message";
import "@/i18n/config"; // Initialize i18n

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// ✅ Module-level flag: persists across component remounts
// This survives even if RootLayout unmounts/remounts
let hasRootLayoutInitialized = false;

// Suppress known deprecation warnings & expected development errors
LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'The app is running using the Legacy Architecture',
  // Native module errors (expected in dev without native build)
  'Cannot find native module \'ExpoPushTokenManager\'',
  'Cannot find native module \'ExpoDevice\'',
  'Cannot find native module \'ExpoHaptics\'',
  'Cannot find native module \'ExpoCamera\'',
  'Cannot find native module \'ExpoAV\'',
  // Expected in development
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (_err) {
      await SecureStore.deleteItemAsync(key).catch(() => {});
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (_err) {
      return;
    }
  },
  async deleteToken(key) {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (_err) {
      return;
    }
  },
};

// Debug logging to verify environment variables
console.log("🔑 Clerk Key loaded:", publishableKey ? "✅ YES" : "❌ NO");
// Note: API_URL is configured in constants/api.js - defaults to the Railway backend.

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

export default function RootLayout() {
  const router = useRouter();

  // Load Inter fonts - professional, highly legible typography with proper weight hierarchy
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    TenorSans_400Regular,
    GreatVibes_400Regular,
  });

  // Hide splash screen when fonts are ready
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize analytics & crash reporting on app start
  useEffect(() => {
    // ✅ Use module-level flag instead of ref - survives component unmount/remount
    if (hasRootLayoutInitialized) {
      console.debug('[AppLayout] ⏳ Startup already initialized, skipping');
      return;
    }
    hasRootLayoutInitialized = true;

    let isMounted = true;

    const initializeApp = async () => {
      try {
        // Run complete production startup sequence
        const startupResult = await runProductionStartup();

        if (!isMounted) return;

        if (startupResult.success) {
          console.debug('[AppLayout] ✓ Production startup completed successfully');
        } else {
          console.error('[AppLayout] ✗ Production startup had errors:', startupResult.error);
          // App will still run with degraded features, but log the report
          console.debug('[AppLayout] Startup report:', getStartupReport());
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[AppLayout] Startup initialization failed:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      cleanupAnalytics();
    };
  }, []);

  const handleErrorReset = () => {
    router.replace('/(tabs)/dashboard');
  };

  // Wait for fonts to load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
    <ErrorBoundary onReset={handleErrorReset}>
      <ThemeProvider>
        <DatabaseInitializer>
          <QueryProvider>
            <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
              {/* NotificationProvider & ProfileProvider must be INSIDE ClerkProvider to access useAuth */}
              <SubscriptionProvider>
                <NotificationProvider>
                  <ProfileProvider>
                    <ApiInitializer>
                    {/* InitializationGuard ensures ProductionStartup completes before rendering child components */}
                    {/* This prevents race conditions where components try to use features before they're initialized */}
                    <InitializationGuard>
                      {/* SmartNotificationInitializer activates data-driven notifications with witty messages */}
                      <SmartNotificationInitializer>
                        <SafeScreen>
                          <OnboardingGuard>
                            <Slot />
                          </OnboardingGuard>
                        </SafeScreen>
                      </SmartNotificationInitializer>
                    </InitializationGuard>
                  </ApiInitializer>
                </ProfileProvider>
              </NotificationProvider>
              </SubscriptionProvider>
            </ClerkProvider>
          </QueryProvider>
        </DatabaseInitializer>
      </ThemeProvider>
      <Toast />
    </ErrorBoundary>
    </View>
  );
}
