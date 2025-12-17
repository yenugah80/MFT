import { Slot, useRouter } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import SafeScreen from "@/components/SafeScreen";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ApiInitializer from "@/components/ApiInitializer";

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
console.log("🌐 API URL:", process.env.EXPO_PUBLIC_API_URL || "Not set, using fallback");

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

export default function RootLayout() {
  const router = useRouter();

  const handleErrorReset = () => {
    router.replace('/(tabs)/dashboard');
  };

  return (
    <ErrorBoundary onReset={handleErrorReset}>
      <NotificationProvider>
        <QueryProvider>
          <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
            <ApiInitializer>
              <SafeScreen>
                <Slot />
              </SafeScreen>
            </ApiInitializer>
          </ClerkProvider>
        </QueryProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}