import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";

export default function PreferencesScreen() {
  const router = useRouter();
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [metricUnits, setMetricUnits] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const data = await apiClient.get("/profile/preferences");
        if (!isMounted) return;
        setAutoAnalyze(data?.autoAnalyze !== false);
        setHapticFeedback(data?.hapticFeedback !== false);
        setMetricUnits(data?.metricUnits !== false);
      } catch (error) {
        console.error("[PreferencesScreen] Failed to load settings", error);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistPreferences = async (nextState) => {
    // Store old state for rollback on error
    const oldState = { autoAnalyze, hapticFeedback, metricUnits };

    // Optimistic update
    setIsSaving(true);
    setAutoAnalyze(nextState.autoAnalyze);
    setHapticFeedback(nextState.hapticFeedback);
    setMetricUnits(nextState.metricUnits);

    try {
      await apiClient.post("/profile/preferences", { preferences: nextState });
      console.log("[PreferencesScreen] Settings saved successfully");
    } catch (error) {
      console.error("[PreferencesScreen] Failed to save settings", error);
      // Rollback on error
      setAutoAnalyze(oldState.autoAnalyze);
      setHapticFeedback(oldState.hapticFeedback);
      setMetricUnits(oldState.metricUnits);
    } finally {
      setIsSaving(false);
    }
  };

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
});
