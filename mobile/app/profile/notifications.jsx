import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";

export default function NotificationsScreen() {
  const router = useRouter();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [hydrationNudges, setHydrationNudges] = useState(true);
  const [insightDrops, setInsightDrops] = useState(true);
  const [streakCelebrations, setStreakCelebrations] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const data = await apiClient.get("/profile/notifications");
        if (!isMounted) return;
        setDailyReminder(data?.dailyReminder !== false);
        setHydrationNudges(data?.hydrationNudges !== false);
        setInsightDrops(data?.insightDrops !== false);
        setStreakCelebrations(data?.streakCelebrations !== false);
      } catch (error) {
        console.error("[NotificationsScreen] Failed to load settings", error);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistNotifications = async (nextState) => {
    setIsSaving(true);
    setDailyReminder(nextState.dailyReminder);
    setHydrationNudges(nextState.hydrationNudges);
    setInsightDrops(nextState.insightDrops);
    setStreakCelebrations(nextState.streakCelebrations);
    try {
      await apiClient.post("/profile/notifications", { notifications: nextState });
    } catch (error) {
      console.error("[NotificationsScreen] Failed to save settings", error);
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
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Tailor your reminders</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Essentials</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Daily check-in</Text>
              <Text style={styles.rowSubtitle}>A gentle prompt to log meals and mood</Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={(value) =>
                persistNotifications({
                  dailyReminder: value,
                  hydrationNudges,
                  insightDrops,
                  streakCelebrations,
                })
              }
              disabled={isSaving}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Hydration nudges</Text>
              <Text style={styles.rowSubtitle}>Smart reminders when intake is low</Text>
            </View>
            <Switch
              value={hydrationNudges}
              onValueChange={(value) =>
                persistNotifications({
                  dailyReminder,
                  hydrationNudges: value,
                  insightDrops,
                  streakCelebrations,
                })
              }
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Insights</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Insight drops</Text>
              <Text style={styles.rowSubtitle}>Highlights from your recent patterns</Text>
            </View>
            <Switch
              value={insightDrops}
              onValueChange={(value) =>
                persistNotifications({
                  dailyReminder,
                  hydrationNudges,
                  insightDrops: value,
                  streakCelebrations,
                })
              }
              disabled={isSaving}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Streak celebrations</Text>
              <Text style={styles.rowSubtitle}>Celebrate consistency milestones</Text>
            </View>
            <Switch
              value={streakCelebrations}
              onValueChange={(value) =>
                persistNotifications({
                  dailyReminder,
                  hydrationNudges,
                  insightDrops,
                  streakCelebrations: value,
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
