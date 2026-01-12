import { useEffect } from "react";
import { Slot, useRouter } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
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
import Toast from "react-native-toast-message";
import "@/i18n/config"; // Initialize i18n
import { LogBox } from 'react-native';

// Analytics & Crash Reporting (FREE - uses your backend)
import { cleanupAnalytics } from "@/services/analytics";

// Production startup utilities
import { runProductionStartup, getStartupReport } from "@/services/productionStartup";

// Initialization guard (prevents premature renders)
import InitializationGuard from "@/components/InitializationGuard";

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
      return SecureStore.getItemAsync(key);
    } catch (_err) {
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
};

// Debug logging to verify environment variables
console.log("🔑 Clerk Key loaded:", publishableKey ? "✅ YES" : "❌ NO");
// Note: API_URL is configured in constants/api.js - defaults to Render backend

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

export default function RootLayout() {
  const router = useRouter();

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

  return (
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
                      <SafeScreen>
                        <OnboardingGuard>
                          <Slot />
                        </OnboardingGuard>
                      </SafeScreen>
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
  );
}