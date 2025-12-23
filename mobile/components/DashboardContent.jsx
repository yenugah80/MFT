/**
 * DashboardContent - Premium Redesign
 * Glossy, trendy, user-centric dashboard with:
 * - Ionicons throughout (no emoticons)
 * - LinearGradient accents
 * - Premium card design
 * - Proper overflow handling
 * - Data state detection
 */

import { View, ScrollView, Text, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDashboard } from "../hooks/useDashboard";
import { useState, useMemo } from "react";

// Utility to deduplicate logs by clientEventId (preferred) or id
function dedupeLogs(logs) {
  const seen = new Set();
  return logs.filter(log => {
    // Use clientEventId if available (preferred), otherwise fallback to id
    // This ensures deduplication works even if backend returns multiple entries per clientEventId
    const key = log.clientEventId || log.id;
    if (!key) return true; // Keep logs without any identifier
    if (seen.has(key)) return false; // Duplicate detected
    seen.add(key);
    return true;
  });
}
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
import MealCalendar from "./MealCalendar";

// Design tokens - using unified premium theme
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, detectDataState, formatters } from "../constants/designTokens";
import { BRAND, SURFACES, TEXT, SEMANTIC, ICON_SIZES, ICONS, SHADOWS as PREMIUM_SHADOWS } from "../constants/premiumTheme";

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

  // Deduplicate food logs for today
  const uniqueFoodLogs = useMemo(() => {
    if (!data?.today?.foodLogs) return [];
    return dedupeLogs(data.today.foodLogs);
  }, [data]);

  // Aggregate micros from deduplicated food logs
  const aggregatedMicros = useMemo(() => {
    if (!uniqueFoodLogs.length) return {};
    const micros = {};
    uniqueFoodLogs.forEach((log) => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
          micros[key] = (micros[key] || 0) + numValue;
        });
      }
    });
    return micros;
  }, [uniqueFoodLogs]);

  // Transform food logs to calendar format
  const calendarData = useMemo(() => {
    if (!data?.today?.foodLogs) return {};

    const calData = {};
    const allLogs = dedupeLogs(data.today.foodLogs);

    allLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!calData[key]) {
        calData[key] = { calories: 0, meals: 0, goalReached: false };
      }

      calData[key].calories += log.calories || 0;
      calData[key].meals += 1;

      const calorieGoal = data?.goals?.dailyCalories || 2000;
      calData[key].goalReached =
        calData[key].calories >= (calorieGoal * 0.9) &&
        calData[key].calories <= (calorieGoal * 1.1);
    });

    return calData;
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
        message: 'Today looks higher than usual. Want to double-check portions?',
        icon: '💡',
        tone: 'info',
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
        message: 'Protein intake is above your usual range. Double-check if needed.',
        icon: '💡',
        tone: 'info',
      });
    }

    return anomalies;
  }, [data]);

  // Handlers
  const handleLogMood = () => setMoodModalVisible(true);
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

        {/* DATA INSIGHT (calm tone, not warning) */}
        {dataAnomalies.length > 0 && (
          <GlassCard style={styles.infoCard} padding="md">
            <View style={styles.anomalyHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={ICONS.info} size={ICON_SIZES.lg} color={BRAND.primary} />
              </View>
              <View style={styles.anomalyTextContainer}>
                <Text style={styles.infoTitle}>Quick Check</Text>
                <Text style={styles.infoMessage}>
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

        {/* HYDRATION SUMMARY - Tap to open WaterLogger for full tracker */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setWaterModalVisible(true)}
          activeOpacity={0.9}
        >
          <GlassCard padding="lg">
            <View style={styles.hydrationSummary}>
              <View style={styles.hydrationHeader}>
                <Ionicons name="water" size={ICON_SIZES.lg} color={SEMANTIC.info.base} />
                <Text style={styles.sectionTitle}>Hydration</Text>
              </View>
              <View style={styles.hydrationStats}>
                <View style={styles.hydrationStat}>
                  <Text style={styles.hydrationValue}>
                    {(today.waterIntakeLiters * 1000).toFixed(0)}ml
                  </Text>
                  <Text style={styles.hydrationLabel}>Today</Text>
                </View>
                <View style={styles.hydrationDivider} />
                <View style={styles.hydrationStat}>
                  <Text style={styles.hydrationValue}>
                    {Math.min(100, Math.round((today.waterIntakeLiters / (goals?.waterLiters || 2.0)) * 100))}%
                  </Text>
                  <Text style={styles.hydrationLabel}>Progress</Text>
                </View>
                <View style={styles.hydrationDivider} />
                <View style={styles.hydrationStat}>
                  <Text style={styles.hydrationValue}>
                    {((goals?.waterLiters || 2.0) * 1000).toFixed(0)}ml
                  </Text>
                  <Text style={styles.hydrationLabel}>Goal</Text>
                </View>
              </View>
              <Text style={styles.hydrationTapHint}>Tap to log water →</Text>
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
        {uniqueFoodLogs.length > 0 && (
          <GlassCard style={styles.section} padding="md">
            <Text style={styles.sectionTitle}>Recent Meals</Text>
            {uniqueFoodLogs.slice(0, 3).map((log) => (
              <View key={log.id} style={styles.mealItem}>
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

        {/* MEAL CALENDAR - Monthly Tracking */}
        <MealCalendar
          data={calendarData}
          calorieGoal={goals?.dailyCalories || 2000}
          onDayPress={(dateKey, dayData) => {
            console.log('Day pressed:', dateKey, dayData);
            // Could navigate to history with date filter or show modal
          }}
        />

        {/* GAMIFICATION */}
        <GlassCard style={styles.section} padding="md">
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.gamificationRow}>
            <View style={styles.gamificationItem}>
              <View style={styles.levelBadge}>
                <Ionicons name={ICONS.trophy} size={ICON_SIZES.lg} color={SEMANTIC.info.base} />
                <Text style={styles.levelValue}>{gamification.level}</Text>
                <Text style={styles.levelLabel}>Level</Text>
              </View>
              <Text style={styles.gamificationSub}>
                {gamification.xp % 1000} / 1000 XP
              </Text>
            </View>
            <View style={styles.gamificationItem}>
              <View style={styles.streakBadge}>
                <Ionicons name={ICONS.fire} size={ICON_SIZES.xl} color={SEMANTIC.warning.base} />
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
              <View style={styles.weightIconContainer}>
                <Ionicons name={ICONS.weight} size={ICON_SIZES['2xl']} color={BRAND.primary} />
              </View>
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

  // Info card (calm, supportive tone - blue instead of orange/red)
  infoCard: {
    marginBottom: SPACING[4],
    backgroundColor: 'rgba(107, 78, 255, 0.05)', // Purple tint
    borderColor: 'rgba(107, 78, 255, 0.2)', // Purple border
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  anomalyTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#6B4EFF', // Brand purple
    marginBottom: SPACING[1],
  },
  infoMessage: {
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
  waterIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  quickAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
  },
  quickAddText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 3,
    borderColor: COLORS.semantic.warn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.black,
    color: COLORS.semantic.warn,
  },

  // Weight
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Hydration Summary
  hydrationSummary: {
    gap: SPACING[4],
  },
  hydrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hydrationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING[3],
  },
  hydrationStat: {
    alignItems: 'center',
    flex: 1,
  },
  hydrationValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
    marginBottom: SPACING[1],
  },
  hydrationLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hydrationDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.2)',
  },
  hydrationTapHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
