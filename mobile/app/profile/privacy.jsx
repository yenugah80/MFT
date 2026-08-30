import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
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

const PRIVACY_DEFAULTS = Object.freeze({
  usageAnalytics: true,
  crossDomainInsights: false,
  contextInInsights: false,
  reflectionInInsights: false,
  sensitiveInsights: false,
  aiWellnessNarration: false,
  weeklyReviewReminder: false,
});

const DEPENDENT_INSIGHT_KEYS = [
  "contextInInsights",
  "reflectionInInsights",
  "sensitiveInsights",
  "aiWellnessNarration",
];

const PRIVACY_LABELS = {
  usageAnalytics: "Usage analytics",
  crossDomainInsights: "Cross-feature patterns",
  contextInInsights: "Context in patterns",
  reflectionInInsights: "Reflections in patterns",
  sensitiveInsights: "Sensitive context in patterns",
  aiWellnessNarration: "AI-written reviews",
  weeklyReviewReminder: "Weekly review reminder",
};

function normalizeApiPrivacy(data) {
  return {
    ...PRIVACY_DEFAULTS,
    usageAnalytics: data?.usageAnalytics ?? data?.analytics ?? true,
    crossDomainInsights: data?.crossDomainInsights ?? data?.shareInsights ?? false,
    contextInInsights: data?.contextInInsights === true,
    reflectionInInsights: data?.reflectionInInsights === true,
    sensitiveInsights: data?.sensitiveInsights === true,
    aiWellnessNarration: data?.aiWellnessNarration === true,
    weeklyReviewReminder: data?.weeklyReviewReminder === true,
  };
}

function applyPrivacyPatch(current, patch) {
  const next = { ...current, ...patch };
  if (patch.crossDomainInsights === false) {
    DEPENDENT_INSIGHT_KEYS.forEach((key) => {
      next[key] = false;
    });
  }
  return next;
}

function PrivacyToggleRow({ title, description, value, onChange, disabled, isLast = false }) {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: SURFACES.divider, true: BRAND.primary }}
        ios_backgroundColor={SURFACES.divider}
        accessibilityLabel={title}
        accessibilityHint={description}
      />
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [privacy, setPrivacy] = useState(PRIVACY_DEFAULTS);
  const [aiAnalysisConsent, setAiAnalysisConsent] = useState(false);
  const [isTogglingAI, setIsTogglingAI] = useState(false);
  // App lock is enforced by BiometricLockProvider. The device (SecureStore) is
  // the source of truth for whether this phone is gated. A server flag cannot
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [privacyHistory, setPrivacyHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [isInsightDetailOpen, setIsInsightDetailOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get("/profile/privacy");
      setPrivacy(normalizeApiPrivacy(data));
    } catch (error) {
      console.error("[PrivacyScreen] Failed to load settings", error);
      setLoadError("Failed to load privacy settings");
    } finally {
      setIsLoading(false);
    }

    // Food analysis consent has its own processor-specific endpoint.
    try {
      const status = await apiClient.get("/consent/status");
      setAiAnalysisConsent(status?.consent?.hasConsent === true);
    } catch (error) {
      console.error("[PrivacyScreen] Failed to load AI consent status", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const persistPrivacy = async (patch) => {
    const oldState = privacy;
    const nextState = applyPrivacyPatch(oldState, patch);

    setIsSaving(true);
    setPrivacy(nextState);

    try {
      const saved = await apiClient.patch("/profile/privacy", {
        privacy: patch,
        sourceScreen: "privacy-security",
        devicePlatform: Platform.OS,
      });
      setPrivacy(normalizeApiPrivacy(saved));
      if (patch.crossDomainInsights === true) setIsInsightDetailOpen(true);
      if (patch.crossDomainInsights === false) setIsInsightDetailOpen(false);
      if (isHistoryOpen) {
        await loadPrivacyHistory();
      } else {
        // Force the next expansion to request the latest server-owned audit
        // events instead of reusing a previously loaded snapshot.
        setPrivacyHistory([]);
      }
      console.log("[PrivacyScreen] Settings saved successfully");
    } catch (error) {
      console.error("[PrivacyScreen] Failed to save settings", error);
      // Rollback on error
      setPrivacy(oldState);
      Alert.alert("Save Failed", "Could not save your privacy settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadPrivacyHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await apiClient.get("/profile/privacy/audit?limit=8");
      setPrivacyHistory(Array.isArray(data?.events) ? data.events : []);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error("[PrivacyScreen] Failed to load privacy history", error);
      }
      setHistoryError("Privacy activity is temporarily unavailable.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const togglePrivacyHistory = () => {
    const nextOpen = !isHistoryOpen;
    setIsHistoryOpen(nextOpen);
    if (nextOpen && privacyHistory.length === 0 && !isHistoryLoading) {
      loadPrivacyHistory();
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
        await apiClient.patch("/profile/privacy", {
          privacy: { biometricLock: value },
          sourceScreen: "privacy-security",
          devicePlatform: Platform.OS,
        });
      } catch (syncError) {
        console.warn("[PrivacyScreen] Lock setting saved locally but not synced", syncError);
      }
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleToggleAIConsent = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsTogglingAI(true);
    const previous = aiAnalysisConsent;
    setAiAnalysisConsent(value);
    try {
      if (value) {
        // `understand` must be exactly `true`. The backend rejects anything
        // else (see requireAuth-gated POST /consent/give-openai-consent).
        await apiClient.post("/consent/give-openai-consent", {
          understand: true,
          purpose: "privacy-settings",
        });
      } else {
        await apiClient.post("/consent/revoke-openai-consent");
      }
    } catch (error) {
      console.error("[PrivacyScreen] Failed to update AI consent", error);
      setAiAnalysisConsent(previous);
      Alert.alert(
        "Couldn't Save",
        "Could not update AI-assisted analysis. Please try again."
      );
    } finally {
      setIsTogglingAI(false);
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
      <ScrollView contentContainerStyle={styles.screenContent}>
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
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Privacy & Security</Text>
            <Text style={styles.subtitle}>Control what stays private</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.info.bg }]} accessibilityElementsHidden>
              <Ionicons name="analytics-outline" size={18} color={BRAND.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.sectionTitle}>Data use</Text>
              <Text style={styles.sectionSubtitle}>Choose each purpose separately</Text>
            </View>
          </View>

          <PrivacyToggleRow
            title="Usage analytics"
            description="Share app performance and feature usage without wellness entries"
            value={privacy.usageAnalytics}
            onChange={(value) => persistPrivacy({ usageAnalytics: value })}
            disabled={isSaving}
          />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>AI food analysis</Text>
              <Text style={styles.rowSubtitle}>
                Send food photos and voice notes to OpenAI to estimate nutrition
              </Text>
            </View>
            {isTogglingAI ? (
              <ActivityIndicator size="small" color={BRAND.primary} />
            ) : (
              <Switch
                value={aiAnalysisConsent}
                onValueChange={handleToggleAIConsent}
                disabled={isTogglingAI}
                trackColor={{ false: SURFACES.divider, true: BRAND.primary }}
                ios_backgroundColor={SURFACES.divider}
                accessibilityLabel="AI food analysis"
              />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.success.bg }]} accessibilityElementsHidden>
              <Ionicons name="git-compare-outline" size={18} color={SEMANTIC.success.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.sectionTitle}>Wellness insights</Text>
              <Text style={styles.sectionSubtitle}>Control how your wellness domains connect</Text>
            </View>
          </View>

          <PrivacyToggleRow
            title="Cross-feature patterns"
            description="Compare domains such as sleep, stress, mood, hydration, and activity"
            value={privacy.crossDomainInsights}
            onChange={(value) => persistPrivacy({ crossDomainInsights: value })}
            disabled={isSaving}
          />

          {!privacy.crossDomainInsights ? (
            <View style={styles.privacyNotice}>
              <Ionicons name="shield-checkmark-outline" size={18} color={SEMANTIC.success.base} accessible={false} />
              <Text style={styles.privacyNoticeText}>
                Your wellness domains stay separate until you turn this on.
              </Text>
            </View>
          ) : null}

          {privacy.crossDomainInsights ? (
            <>
              <TouchableOpacity
                style={styles.disclosureRow}
                onPress={() => setIsInsightDetailOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isInsightDetailOpen }}
                accessibilityLabel="Pattern data controls"
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Pattern data controls</Text>
                  <Text style={styles.rowSubtitle}>
                    {DEPENDENT_INSIGHT_KEYS.filter((key) => privacy[key]).length} of {DEPENDENT_INSIGHT_KEYS.length} optional sources on
                  </Text>
                </View>
                <Ionicons
                  name={isInsightDetailOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={TEXT.tertiary}
                />
              </TouchableOpacity>

              {isInsightDetailOpen ? (
                <View style={styles.nestedSettings}>
                  <PrivacyToggleRow
                    title="Context in patterns"
                    description="Use tags such as work, travel, illness, or routine changes"
                    value={privacy.contextInInsights}
                    onChange={(value) => persistPrivacy({ contextInInsights: value })}
                    disabled={isSaving}
                  />
                  <PrivacyToggleRow
                    title="Reflections in patterns"
                    description="Include your private notes when finding personal patterns"
                    value={privacy.reflectionInInsights}
                    onChange={(value) => persistPrivacy({ reflectionInInsights: value })}
                    disabled={isSaving}
                  />
                  <PrivacyToggleRow
                    title="Sensitive context in patterns"
                    description="Include health, relationship, and other sensitive context tags"
                    value={privacy.sensitiveInsights}
                    onChange={(value) => persistPrivacy({ sensitiveInsights: value })}
                    disabled={isSaving}
                  />
                  <PrivacyToggleRow
                    title="AI-written reviews"
                    description="Use approved wellness data to draft weekly summaries"
                    value={privacy.aiWellnessNarration}
                    onChange={(value) => persistPrivacy({ aiWellnessNarration: value })}
                    disabled={isSaving}
                    isLast
                  />
                </View>
              ) : null}
            </>
          ) : null}
          <PrivacyToggleRow
            title="Weekly review reminder"
            description="Notify you when a new weekly review is ready"
            value={privacy.weeklyReviewReminder}
            onChange={(value) => persistPrivacy({ weeklyReviewReminder: value })}
            disabled={isSaving}
            isLast
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.info.bg }]} accessibilityElementsHidden>
              <Ionicons name="lock-closed-outline" size={18} color={BRAND.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.sectionTitle}>Security</Text>
              <Text style={styles.sectionSubtitle}>Protect access on this device</Text>
            </View>
          </View>

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
                trackColor={{ false: SURFACES.divider, true: BRAND.primary }}
                ios_backgroundColor={SURFACES.divider}
                accessibilityLabel="App lock"
              />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.success.bg }]} accessibilityElementsHidden>
              <Ionicons name="folder-open-outline" size={18} color={SEMANTIC.success.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.sectionTitle}>Your data</Text>
              <Text style={styles.sectionSubtitle}>Review, export, or remove account data</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dataRow}
            onPress={togglePrivacyHistory}
            accessibilityRole="button"
            accessibilityState={{ expanded: isHistoryOpen }}
            accessibilityLabel="Privacy activity"
            accessibilityHint="See when each privacy purpose was turned on or off"
          >
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.info.bg }]} accessibilityElementsHidden>
              <Ionicons name="time-outline" size={18} color={BRAND.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Privacy activity</Text>
              <Text style={styles.rowSubtitle}>See when each purpose was turned on or off</Text>
            </View>
            <Ionicons
              name={isHistoryOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>

          {isHistoryOpen ? (
            <View style={styles.historyPanel}>
              {isHistoryLoading ? (
                <ActivityIndicator size="small" color={BRAND.primary} />
              ) : historyError ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyText}>{historyError}</Text>
                  <TouchableOpacity onPress={loadPrivacyHistory} accessibilityRole="button">
                    <Text style={styles.retryInline}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : privacyHistory.length === 0 ? (
                <Text style={styles.historyEmptyText}>No privacy changes recorded yet.</Text>
              ) : privacyHistory.map((event) => (
                <View key={event.id} style={styles.historyRow}>
                  <View style={[
                    styles.historyDot,
                    { backgroundColor: event.newState ? SEMANTIC.success.base : TEXT.tertiary },
                  ]} />
                  <View style={styles.rowText}>
                    <Text style={styles.historyTitle}>
                      {PRIVACY_LABELS[event.purposeKey] || "Privacy purpose"} {event.newState ? "on" : "off"}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(event.changedAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleExportData}
            disabled={isExporting}
            accessibilityRole="button"
            accessible
            accessibilityLabel="Download my data"
            accessibilityHint="Export wellness records and privacy history as JSON"
          >
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.success.bg }]} accessibilityElementsHidden>
              <Ionicons name="download-outline" size={18} color={SEMANTIC.success.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Download my data</Text>
              <Text style={styles.rowSubtitle}>Export wellness records and privacy history as JSON</Text>
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
            accessibilityRole="button"
            accessible
            accessibilityLabel="Delete account"
            accessibilityHint="Permanently remove all account data"
          >
            <View style={[styles.iconCircle, { backgroundColor: SEMANTIC.danger.bg }]} accessibilityElementsHidden>
              <Ionicons name="trash-outline" size={18} color={SEMANTIC.danger.base} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: SEMANTIC.danger.base }]}>Delete account</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: SPACING[5],
  },
  header: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[3],
    paddingBottom: SPACING[1],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING[3],
    minHeight: 54,
    paddingVertical: SPACING[2],
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACES.divider,
  },
  rowDisabled: {
    opacity: 0.48,
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
    lineHeight: 18,
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
    backgroundColor: SEMANTIC.success.bg,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.success.dark,
    lineHeight: 19,
  },
  disclosureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[3],
    minHeight: 54,
    paddingVertical: SPACING[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACES.divider,
  },
  nestedSettings: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[3],
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
    paddingVertical: SPACING[3],
    minHeight: 56,
  },
  historyPanel: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[2],
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[3],
    minHeight: 44,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  historyDate: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  historyEmpty: {
    alignItems: "center",
    gap: SPACING[2],
  },
  historyEmptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: "center",
  },
  retryInline: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
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
