/**
 * DashboardContent - Premium Redesign
 * Instrument-style dashboard with:
 * - Proper overflow handling (no "200%+" spam)
 * - Data state detection (anomalies, missing data)
 * - Glass morphism design
 * - Premium components (PremiumRing, MacroDonut, NutriScoreDial)
 */

import { View, ScrollView, Text, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useDashboard } from "../hooks/useDashboard";
import { useState, useMemo } from "react";
import { useNotification } from "../providers/NotificationProvider";

// Premium components
import GlassCard from "./dashboard/GlassCard";
import PremiumRing from "./dashboard/PremiumRing";
import MacroDonut from "./dashboard/MacroDonut";
import NutriScoreDial from "./dashboard/NutriScoreDial";
import MoodChip from "./MoodChip";
import MoodLogger from "./MoodLogger";
import WaterLogger from "./WaterLogger";
import MicrosCoverageSection from "./MicrosCoverageSection";

// Design tokens
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, detectDataState, formatters } from "../constants/designTokens";

export default function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const notify = useNotification();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Aggregate micros from today's food logs
  const aggregatedMicros = useMemo(() => {
    if (!data?.today?.foodLogs) return {};

    const micros = {};
    data.today.foodLogs.forEach((log) => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
          micros[key] = (micros[key] || 0) + numValue;
        });
      }
    });

    return micros;
  }, [data]);

  // Detect anomalies in data
  const dataAnomalies = useMemo(() => {
    if (!data?.today || !data?.goals) return [];

    const anomalies = [];

    // Check calories
    const calorieState = detectDataState(
      data.today.nutrition.totalCalories,
      data.goals.dailyCalories,
      { warnThreshold: 0.8, overThreshold: 1.0 }
    );
    if (calorieState.isAnomaly) {
      anomalies.push({
        metric: 'Calories',
        value: data.today.nutrition.totalCalories,
        message: 'Unusually high - check serving sizes',
      });
    }

    // Check protein
    const proteinState = detectDataState(
      data.today.nutrition.totalProtein,
      data.goals.proteinG,
      { warnThreshold: 0.8, overThreshold: 1.2 }
    );
    if (proteinState.isAnomaly) {
      anomalies.push({
        metric: 'Protein',
        value: data.today.nutrition.totalProtein,
        message: 'Unusually high - review logs',
      });
    }

    return anomalies;
  }, [data]);

  // Handlers
  const handleLogMood = () => setMoodModalVisible(true);
  const handleLogWater = () => setWaterModalVisible(true);
  const handleViewAllMicros = () => notify.info('Detailed micros view - Coming soon');

  const handleMoodSuccess = () => {
    notify.success('Mood logged successfully! 😊');
    refetch();
  };

  const handleWaterSuccess = () => {
    notify.success('Water intake logged! 💧');
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.semantic.info} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to load dashboard</Text>
        <Text style={styles.errorText}>Please try again later</Text>
      </View>
    );
  }

  if (!data) return null;

  const { today, goals, gamification, trends, recentWeight } = data;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* DATA ANOMALY WARNING */}
        {dataAnomalies.length > 0 && (
          <GlassCard style={styles.anomalyCard} padding="md">
            <View style={styles.anomalyHeader}>
              <Text style={styles.anomalyIcon}>⚠️</Text>
              <View style={styles.anomalyTextContainer}>
                <Text style={styles.anomalyTitle}>Data Check Needed</Text>
                <Text style={styles.anomalyMessage}>
                  {dataAnomalies[0].message}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* PRIMARY KPI - Nutrition Score or Calories */}
        <GlassCard style={styles.primaryCard} padding="lg">
          {today.foodLogs && today.foodLogs.length > 0 ? (
            <View style={styles.primaryContent}>
              <NutriScoreDial data={data} size={180} />
              <Text style={styles.primaryHint}>
                Based on calories, protein, hydration, and consistency
              </Text>
            </View>
          ) : (
            <View style={styles.primaryContent}>
              <PremiumRing
                value={today.nutrition.totalCalories}
                goal={goals?.dailyCalories}
                label="Calories"
                unit="kcal"
                size={180}
                strokeWidth={16}
              />
              <Text style={styles.primaryHint}>
                {trends.weeklyAverages
                  ? `Weekly avg: ${Math.round(trends.weeklyAverages.avgCalories)} kcal/day`
                  : 'Log food to see nutrition score'}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* MACRONUTRIENTS - Single Donut */}
        <GlassCard style={styles.section} padding="lg">
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <MacroDonut
            protein={today.nutrition.totalProtein}
            carbs={today.nutrition.totalCarbs}
            fat={today.nutrition.totalFats}
            size={200}
            strokeWidth={24}
          />
        </GlassCard>

        {/* HYDRATION */}
        <TouchableOpacity onPress={handleLogWater} activeOpacity={0.9}>
          <GlassCard style={styles.section} padding="md">
            <View style={styles.waterContainer}>
              <View style={styles.waterLeft}>
                <Text style={styles.waterIcon}>💧</Text>
                <View>
                  <Text style={styles.waterTitle}>Hydration</Text>
                  <Text style={styles.waterValue}>
                    {(today.waterIntakeLiters * 1000).toFixed(0)}ml / {((goals?.waterLiters || 2.0) * 1000).toFixed(0)}ml
                  </Text>
                  <Text style={styles.waterPercent}>
                    {formatters.percent(today.waterIntakeLiters / (goals?.waterLiters || 2.0))} complete
                  </Text>
                </View>
              </View>
              <View style={styles.waterRight}>
                <View style={[
                  styles.quickAddButton,
                  { backgroundColor: COLORS.semantic.info }
                ]}>
                  <Text style={styles.quickAddText}>+ Quick Add</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* MICRONUTRIENTS */}
        <GlassCard style={styles.section} padding="md">
          <MicrosCoverageSection
            micros={aggregatedMicros}
            onViewAll={handleViewAllMicros}
          />
        </GlassCard>

        {/* MOOD */}
        <GlassCard style={styles.section} padding="md">
          <MoodChip mood={today.moodLogs} onLogMood={handleLogMood} />
        </GlassCard>

        {/* RECENT MEALS */}
        {today.foodLogs.length > 0 && (
          <GlassCard style={styles.section} padding="md">
            <Text style={styles.sectionTitle}>Recent Meals</Text>
            {today.foodLogs.slice(0, 3).map((log, index) => (
              <View key={log.id || index} style={styles.mealItem}>
                <View style={styles.mealDot} />
                <View style={styles.mealContent}>
                  <Text style={styles.mealName}>{log.foodName}</Text>
                  <Text style={styles.mealMeta}>
                    {log.mealType} · {log.calories} kcal
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {/* WEEKLY TRENDS */}
        {trends.weeklyAverages && (
          <GlassCard style={styles.section} padding="md">
            <Text style={styles.sectionTitle}>Weekly Trends</Text>
            <View style={styles.trendRow}>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>
                  {Math.round(trends.weeklyAverages.avgCalories)}
                </Text>
                <Text style={styles.trendLabel}>Avg Calories</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>
                  {Math.round(trends.weeklyAverages.avgProtein)}g
                </Text>
                <Text style={styles.trendLabel}>Avg Protein</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{gamification.streak}</Text>
                <Text style={styles.trendLabel}>Day Streak 🔥</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* GAMIFICATION */}
        <GlassCard style={styles.section} padding="md">
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.gamificationRow}>
            <View style={styles.gamificationItem}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{gamification.level}</Text>
                <Text style={styles.levelLabel}>Level</Text>
              </View>
              <Text style={styles.gamificationSub}>
                {gamification.xp % 1000} / 1000 XP
              </Text>
            </View>
            <View style={styles.gamificationItem}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakValue}>{gamification.streak}</Text>
              </View>
              <Text style={styles.gamificationSub}>
                {gamification.streak > 0 ? 'Keep it up!' : 'Start today!'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* RECENT WEIGHT */}
        {recentWeight.length > 0 && (
          <GlassCard style={styles.section} padding="md">
            <View style={styles.weightContainer}>
              <Text style={styles.weightIcon}>⚖️</Text>
              <View style={styles.weightInfo}>
                <Text style={styles.weightValue}>{recentWeight[0].weightKg} kg</Text>
                <Text style={styles.weightDate}>
                  {new Date(recentWeight[0].recordedDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Modals */}
      <MoodLogger
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        onSuccess={handleMoodSuccess}
      />

      <WaterLogger
        visible={waterModalVisible}
        onClose={() => setWaterModalVisible(false)}
        onSuccess={handleWaterSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  content: {
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    padding: SPACING[5],
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.secondary,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
  },

  // Header
  header: {
    marginBottom: SPACING[5],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Anomaly warning card
  anomalyCard: {
    marginBottom: SPACING[4],
    backgroundColor: COLORS.semantic.overGlow,
    borderColor: COLORS.semantic.over,
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anomalyIcon: {
    fontSize: 32,
    marginRight: SPACING[3],
  },
  anomalyTextContainer: {
    flex: 1,
  },
  anomalyTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.semantic.over,
    marginBottom: SPACING[1],
  },
  anomalyMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },

  // Primary KPI card
  primaryCard: {
    marginBottom: SPACING[5],
    alignItems: 'center',
  },
  primaryContent: {
    alignItems: 'center',
    width: '100%',
  },
  primaryHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING[4],
  },

  // Water section
  waterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waterIcon: {
    fontSize: 40,
    marginRight: SPACING[3],
  },
  waterTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  waterValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.semantic.info,
    marginBottom: SPACING[1],
  },
  waterPercent: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
  waterRight: {
    alignItems: 'flex-end',
  },
  quickAddButton: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
  },
  quickAddText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#fff',
  },

  // Meals
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.semantic.good,
    marginRight: SPACING[3],
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  mealMeta: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },

  // Trends
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.muted,
    textAlign: 'center',
  },

  // Gamification
  gamificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gamificationItem: {
    alignItems: 'center',
  },
  gamificationSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.muted,
    marginTop: SPACING[2],
  },
  levelBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.glass.highlight,
    borderWidth: 3,
    borderColor: COLORS.semantic.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: COLORS.semantic.info,
  },
  levelLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING[1],
  },
  streakBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.glass.highlight,
    borderWidth: 3,
    borderColor: COLORS.semantic.warn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 32,
  },
  streakValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.black,
    color: COLORS.semantic.warn,
    marginTop: SPACING[1],
  },

  // Weight
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightIcon: {
    fontSize: 40,
    marginRight: SPACING[3],
  },
  weightInfo: {
    flex: 1,
  },
  weightValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  weightDate: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
});
