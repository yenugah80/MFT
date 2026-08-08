import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, SEMANTIC } from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";
import { deleteAccountAndPurgeDevice } from "../../services/accountDeletion";
import { useAuth } from "@clerk/clerk-expo";
import { useBiometricLock } from "../../providers/BiometricLockProvider";

export default function PrivacyScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [shareInsights, setShareInsights] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  // App lock is enforced by BiometricLockProvider. The device (SecureStore) is
  // the source of truth for whether this phone is gated — a server flag can't
  // be trusted to gate a cold start, and a device that can't authenticate must
  // not inherit "on" from another one. The server copy is written alongside so
  // the setting is visible across devices, but it never drives the gate.
  const { isEnabled: biometricLock, isReady: isLockReady, method, enable, disable } = useBiometricLock();
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get("/profile/privacy");
      setShareInsights(Boolean(data?.shareInsights));
      setAnalytics(data?.analytics !== false);
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
    const oldState = { shareInsights, analytics };

    // Optimistic update
    setIsSaving(true);
    setShareInsights(nextState.shareInsights);
    setAnalytics(nextState.analytics);

    try {
      await apiClient.post("/profile/privacy", { privacy: nextState });
      console.log("[PrivacyScreen] Settings saved successfully");
    } catch (error) {
      console.error("[PrivacyScreen] Failed to save settings", error);
      // Rollback on error
      setShareInsights(oldState.shareInsights);
      setAnalytics(oldState.analytics);
      Alert.alert("Save Failed", "Could not save your privacy settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const LOCK_FAILURE_COPY = {
    no_hardware: "This device doesn't support biometric unlock.",
    not_enrolled:
      "Set up Face ID, Touch ID, or a fingerprint in your device settings first.",
    storage_failed: "Could not save the setting securely on this device.",
    lockout: "Too many failed attempts. Try again later.",
    user_cancel: null, // A deliberate cancel needs no alert.
    busy: null,
  };

  const handleToggleBiometricLock = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsTogglingLock(true);
    try {
      const result = value ? await enable() : await disable();

      if (!result.ok) {
        const message =
          result.reason in LOCK_FAILURE_COPY
            ? LOCK_FAILURE_COPY[result.reason]
            : "Authentication failed. The setting was not changed.";
        if (message) {
          Alert.alert(value ? "Couldn't Turn On App Lock" : "Couldn't Turn Off App Lock", message);
        }
        return;
      }

      // Mirror to the server so the choice is visible on the account. A failure
      // here must not revert the device gate, which is already applied.
      try {
        await apiClient.post("/profile/privacy", {
          privacy: { shareInsights, analytics, biometricLock: value },
        });
      } catch (syncError) {
        console.warn("[PrivacyScreen] Lock setting saved locally but not synced", syncError);
      }
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleExportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExporting(true);
    try {
      const data = await apiClient.get("/profile/export");
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `mft-data-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.cacheDirectory || ''}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Your Data',
        });
      } else {
        Alert.alert("Success", "Your data has been saved to your device.");
      }
    } catch (error) {
      console.error("[PrivacyScreen] Export failed", error);
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data including meals, mood entries, and health metrics. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Deletes the account and Clerk identity server-side, purges every local
      // cache, and ends the session. Only a server-side failure throws.
      await deleteAccountAndPurgeDevice({ signOut, queryClient });
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("[PrivacyScreen] Delete account failed", error);
      Alert.alert("Delete Failed", "Could not delete your account. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
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

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App lock</Text>
              <Text style={styles.rowSubtitle}>
                Require {method} to open MFT
              </Text>
            </View>
            {isTogglingLock ? (
              <ActivityIndicator size="small" color={BRAND.primary} />
            ) : (
              <Switch
                value={biometricLock}
                onValueChange={handleToggleBiometricLock}
                disabled={!isLockReady}
              />
            )}
          </View>
        </View>


        {/* GDPR Data Rights */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Data</Text>

          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.success.bg }]}>
              <Ionicons name="download-outline" size={18} color={SEMANTIC.success.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Download My Data</Text>
              <Text style={styles.rowSubtitle}>Export all your data as JSON</Text>
            </View>
            {isExporting ? (
              <ActivityIndicator size="small" color={BRAND.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.danger.bg }]}>
              <Ionicons name="trash-outline" size={18} color={SEMANTIC.danger.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: SEMANTIC.danger.base }]}>Delete Account</Text>
              <Text style={styles.rowSubtitle}>Permanently remove all your data</Text>
            </View>
            {isDeleting ? (
              <ActivityIndicator size="small" color={SEMANTIC.danger.base} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Under GDPR, you have the right to access, export, and delete your personal data at any time.
        </Text>
      </ScrollView>
    </View>
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[3],
    paddingVertical: SPACING[2],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: "center",
    paddingHorizontal: SPACING[4],
    lineHeight: 18,
  },
});
