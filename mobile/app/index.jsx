import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useProfileContext } from "@/providers/ProfileProvider";
import { BRAND, TEXT, SURFACES, TYPOGRAPHY } from "@/constants/premiumTheme";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Single routing hub — decides where a cold-start user goes.
 *
 * Clerk not ready          → branded spinner
 * Not signed in            → /(auth)/sign-in
 * Profile loading          → branded spinner
 * Profile load failed      → error + retry (disabled while retry pending)
 * Onboarding not done      → /onboarding  (shows resume screen if partial progress)
 * All good                 → /(tabs)
 */
export default function AppIndex() {
  const { isLoaded, isSignedIn } = useAuth();
  const { onboardingComplete, isError, isFetching, refetchProfile } = useProfileContext();

  if (!isLoaded) return <LoadingSpinner />;

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Waiting for initial profile load (isFetching is true, no cached data yet)
  if (onboardingComplete === null && !isError) return <LoadingSpinner message="Loading your profile…" />;

  // All retries exhausted with no cached fallback — let the user act
  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't load your profile</Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Pressable
          onPress={refetchProfile}
          disabled={isFetching}
          style={[styles.retryBtn, isFetching && styles.retryBtnPending]}
        >
          {isFetching
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text style={styles.retryBtnText}>Try Again</Text>}
        </Pressable>
      </View>
    );
  }

  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SURFACES.background?.primary ?? "#FFFFFF",
    padding: 32,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: BRAND.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    marginTop: 8,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnPending: {
    opacity: 0.65,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
