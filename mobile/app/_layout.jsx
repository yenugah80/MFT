import { useEffect } from "react";
import { Slot, useRouter } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import SafeScreen from "@/components/SafeScreen";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ApiInitializer from "@/components/ApiInitializer";
import DatabaseInitializer from "@/components/DatabaseInitializer";
import Toast from "react-native-toast-message";
import "@/i18n/config"; // Initialize i18n
import { LogBox } from 'react-native';

// Analytics & Crash Reporting (FREE - uses your backend)
import { initAnalytics, cleanupAnalytics } from "@/services/analytics";
import { setupGlobalErrorHandler } from "@/services/crashReporting";

// Suppress known deprecation warnings
LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'The app is running using the Legacy Architecture',
]);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
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
    // Set up global error handler for unhandled JS errors
    setupGlobalErrorHandler();

    // Initialize analytics session
    initAnalytics();

    // Cleanup on unmount
    return () => {
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
              {/* NotificationProvider must be INSIDE ClerkProvider to access useAuth */}
              <NotificationProvider>
                <ApiInitializer>
                  <SafeScreen>
                    <Slot />
                  </SafeScreen>
                </ApiInitializer>
              </NotificationProvider>
            </ClerkProvider>
          </QueryProvider>
        </DatabaseInitializer>
      </ThemeProvider>
      <Toast />
    </ErrorBoundary>
  );
}