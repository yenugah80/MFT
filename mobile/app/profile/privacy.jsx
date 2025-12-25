import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";

export default function PrivacyScreen() {
  const router = useRouter();
  const [shareInsights, setShareInsights] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const data = await apiClient.get("/profile/privacy");
        if (!isMounted) return;
        setShareInsights(Boolean(data?.shareInsights));
        setAnalytics(data?.analytics !== false);
        setBiometricLock(Boolean(data?.biometricLock));
      } catch (error) {
        console.error("[PrivacyScreen] Failed to load settings", error);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistPrivacy = async (nextState) => {
    setIsSaving(true);
    setShareInsights(nextState.shareInsights);
    setAnalytics(nextState.analytics);
    setBiometricLock(nextState.biometricLock);
    try {
      await apiClient.post("/profile/privacy", { privacy: nextState });
    } catch (error) {
      console.error("[PrivacyScreen] Failed to save settings", error);
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
});
