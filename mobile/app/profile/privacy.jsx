import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";

export default function PrivacyScreen() {
  const router = useRouter();
  const [shareInsights, setShareInsights] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get("/profile/privacy");
      setShareInsights(Boolean(data?.shareInsights));
      setAnalytics(data?.analytics !== false);
      setBiometricLock(Boolean(data?.biometricLock));
    } catch (error) {
      console.error("[PrivacyScreen] Failed to load settings", error);
      setLoadError("Failed to load privacy settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const persistPrivacy = async (nextState) => {
    // Store old state for rollback on error
    const oldState = { shareInsights, analytics, biometricLock };

    // Optimistic update
    setIsSaving(true);
    setShareInsights(nextState.shareInsights);
    setAnalytics(nextState.analytics);
    setBiometricLock(nextState.biometricLock);

    try {
      await apiClient.post("/profile/privacy", { privacy: nextState });
      console.log("[PrivacyScreen] Settings saved successfully");
    } catch (error) {
      console.error("[PrivacyScreen] Failed to save settings", error);
      // Rollback on error
      setShareInsights(oldState.shareInsights);
      setAnalytics(oldState.analytics);
      setBiometricLock(oldState.biometricLock);
      Alert.alert("Save Failed", "Could not save your privacy settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (loadError) {
    return (
      <SafeScreen>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/profile")}
          accessibilityLabel="Back to Profile"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Privacy & Security</Text>
          <Text style={styles.subtitle}>Control what stays private</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Share insights</Text>
              <Text style={styles.rowSubtitle}>Allow anonymous insights to improve recommendations</Text>
            </View>
            <Switch
              value={shareInsights}
              onValueChange={(value) =>
                persistPrivacy({
                  shareInsights: value,
                  analytics,
                  biometricLock,
                })
              }
              disabled={isSaving}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Usage analytics</Text>
              <Text style={styles.rowSubtitle}>Help us improve with anonymous usage data</Text>
            </View>
            <Switch
              value={analytics}
              onValueChange={(value) =>
                persistPrivacy({
                  shareInsights,
                  analytics: value,
                  biometricLock,
                })
              }
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Biometric lock</Text>
              <Text style={styles.rowSubtitle}>Require Face ID / Touch ID to open the app</Text>
            </View>
            <Switch
              value={biometricLock}
              onValueChange={(value) =>
                persistPrivacy({
                  shareInsights,
                  analytics,
                  biometricLock: value,
                })
              }
              disabled={isSaving}
            />
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING[3],
  },
  headerText: {
    gap: 6,
  },
  title: {
    fontSize: TYPOGRAPHY.size["2xl"],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: "rgba(255,255,255,0.9)",
  },
  content: {
    padding: SPACING[5],
    gap: SPACING[4],
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.md,
    gap: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING[3],
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  rowSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
    padding: SPACING[5],
  },
  errorText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING[4],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.lg,
  },
  retryText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
});
