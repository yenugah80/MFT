import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import { SUPPORTED_LANGUAGES, LANGUAGE_ORDER, getLanguageConfig } from "../../constants/languages";
import apiClient from "../../services/apiClient";

export default function PreferencesScreen() {
  const router = useRouter();
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [metricUnits, setMetricUnits] = useState(true);
  const [audioConfirmations, setAudioConfirmations] = useState(false);
  const [assistedVoiceMode, setAssistedVoiceMode] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get("/profile/preferences");
      setAutoAnalyze(data?.autoAnalyze !== false);
      setHapticFeedback(data?.hapticFeedback !== false);
      setMetricUnits(data?.metricUnits !== false);
      setAudioConfirmations(data?.audioConfirmations === true);
      setAssistedVoiceMode(data?.assistedVoiceMode === true);
      setVoiceLanguage(data?.voiceLanguage || 'en');
    } catch (error) {
      console.error("[PreferencesScreen] Failed to load settings", error);
      setLoadError("Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const persistPreferences = async (nextState) => {
    // Store old state for rollback on error
    const oldState = { autoAnalyze, hapticFeedback, metricUnits, audioConfirmations, assistedVoiceMode, voiceLanguage };

    // Optimistic update
    setIsSaving(true);
    setAutoAnalyze(nextState.autoAnalyze);
    setHapticFeedback(nextState.hapticFeedback);
    setMetricUnits(nextState.metricUnits);
    if (nextState.audioConfirmations !== undefined) {
      setAudioConfirmations(nextState.audioConfirmations);
    }
    if (nextState.assistedVoiceMode !== undefined) {
      setAssistedVoiceMode(nextState.assistedVoiceMode);
    }
    if (nextState.voiceLanguage !== undefined) {
      setVoiceLanguage(nextState.voiceLanguage);
    }

    try {
      await apiClient.post("/profile/preferences", { preferences: nextState });
      console.log("[PreferencesScreen] Settings saved successfully");
    } catch (error) {
      console.error("[PreferencesScreen] Failed to save settings", error);
      // Rollback on error
      setAutoAnalyze(oldState.autoAnalyze);
      setHapticFeedback(oldState.hapticFeedback);
      setMetricUnits(oldState.metricUnits);
      setAudioConfirmations(oldState.audioConfirmations);
      setAssistedVoiceMode(oldState.assistedVoiceMode);
      setVoiceLanguage(oldState.voiceLanguage);
      Alert.alert("Save Failed", "Could not save your preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
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
          onPress={() => router.back()}
          accessibilityLabel="Back to Profile"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>App Preferences</Text>
          <Text style={styles.subtitle}>Personalize your experience</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Experience</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Auto‑analyze meals</Text>
              <Text style={styles.rowSubtitle}>Instant nutrition insights as you type</Text>
            </View>
            <Switch
              value={autoAnalyze}
              onValueChange={(value) =>
                persistPreferences({
                  autoAnalyze: value,
                  hapticFeedback,
                  metricUnits,
                  audioConfirmations,
                  assistedVoiceMode,
                  voiceLanguage,
                })
              }
              disabled={isSaving}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Haptic feedback</Text>
              <Text style={styles.rowSubtitle}>Subtle taps for key actions</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={(value) =>
                persistPreferences({
                  autoAnalyze,
                  hapticFeedback: value,
                  metricUnits,
                  audioConfirmations,
                  assistedVoiceMode,
                  voiceLanguage,
                })
              }
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Units</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Metric units</Text>
              <Text style={styles.rowSubtitle}>g, kg, ml, liters</Text>
            </View>
            <Switch
              value={metricUnits}
              onValueChange={(value) =>
                persistPreferences({
                  autoAnalyze,
                  hapticFeedback,
                  metricUnits: value,
                  audioConfirmations,
                  assistedVoiceMode,
                  voiceLanguage,
                })
              }
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Voice</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowLanguagePicker(true)}
            disabled={isSaving}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Voice Language</Text>
              <Text style={styles.rowSubtitle}>Language for voice input and audio feedback</Text>
            </View>
            <View style={styles.languageSelector}>
              <Text style={styles.languageFlag}>{getLanguageConfig(voiceLanguage).flag}</Text>
              <Text style={styles.languageValue}>{getLanguageConfig(voiceLanguage).name}</Text>
              <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accessibility</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Audio Confirmations</Text>
              <Text style={styles.rowSubtitle}>Spoken feedback when logging food, mood, or water</Text>
            </View>
            <Switch
              value={audioConfirmations}
              onValueChange={(value) =>
                persistPreferences({
                  autoAnalyze,
                  hapticFeedback,
                  metricUnits,
                  audioConfirmations: value,
                  assistedVoiceMode,
                  voiceLanguage,
                })
              }
              disabled={isSaving}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Assisted Voice Mode</Text>
              <Text style={styles.rowSubtitle}>Larger buttons, audio guidance, and simplified voice logging</Text>
            </View>
            <Switch
              value={assistedVoiceMode}
              onValueChange={(value) =>
                persistPreferences({
                  autoAnalyze,
                  hapticFeedback,
                  metricUnits,
                  audioConfirmations,
                  assistedVoiceMode: value,
                  voiceLanguage,
                })
              }
              disabled={isSaving}
            />
          </View>

          {assistedVoiceMode && (
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="volume-high" size={16} color={BRAND.primary} />
                <Text style={styles.featureText}>Voice guidance throughout recording</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="resize" size={16} color={BRAND.primary} />
                <Text style={styles.featureText}>Extra-large buttons and text</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={BRAND.primary} />
                <Text style={styles.featureText}>Auto-confirm after recording</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLanguagePicker(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Voice Language</Text>
              <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                <Ionicons name="close" size={24} color={TEXT.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {LANGUAGE_ORDER.map((code) => {
                const lang = SUPPORTED_LANGUAGES[code];
                const isSelected = voiceLanguage === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
                    onPress={() => {
                      persistPreferences({
                        autoAnalyze,
                        hapticFeedback,
                        metricUnits,
                        audioConfirmations,
                        assistedVoiceMode,
                        voiceLanguage: code,
                      });
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                    <View style={styles.languageOptionText}>
                      <Text style={[styles.languageOptionName, isSelected && styles.languageOptionNameSelected]}>
                        {lang.name}
                      </Text>
                      <Text style={styles.languageOptionNative}>{lang.nativeName}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={BRAND.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  featureList: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
    gap: SPACING[2],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  featureText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  languageFlag: {
    fontSize: 20,
  },
  languageValue: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACES.card.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  languageList: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[6],
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  languageOptionSelected: {
    backgroundColor: `${BRAND.primary}15`,
  },
  languageOptionFlag: {
    fontSize: 28,
  },
  languageOptionText: {
    flex: 1,
  },
  languageOptionName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  languageOptionNameSelected: {
    color: BRAND.primary,
  },
  languageOptionNative: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
});
