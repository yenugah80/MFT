/**
 * Nutrition Analytics - dedicated deep-dive screen
 *
 * Split out alongside the unified /analytics Nutrition tab (which is
 * today-focused: today's ring, AI-powered Smart Food Picks, today's
 * insights), the same way app/analytics/hydration.jsx sits alongside the
 * Hydration tab. This screen answers a different question — "how has my
 * eating actually looked over the last week/month" — rather than repeating
 * the Nutrition tab's today-centric view.
 *
 * Data source: GET /nutrition/dashboard?days=30 (the same endpoint the
 * Nutrition tab uses, now period-aware — see
 * docs/architecture/recommendation-engine.md's Fix 2 notes). No new backend
 * endpoint; this screen's job is depth of display, not a new data source.
 * Always fetches 30 days and slices locally for the 7-day view, same
 * reasoning as useHydrationHistory: a 7-day fetch would understate a longer
 * streak, and toggling shouldn't refetch data already in hand.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import apiClient from '../../services/apiClient';
import MiniLineChart from '../../components/analytics/MiniLineChart';
import GoalRealityCheckCard from '../../components/analytics/GoalRealityCheckCard';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  MACRO_COLORS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const RANGES = [
  { key: 7, label: '7 Days' },
  { key: 30, label: '30 Days' },
];

const NUTRITION_ORANGE = VIBRANT_WELLNESS.nutrition.solid;
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 2 - SPACING[4] * 2;

export default function NutritionAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rangeDays, setRangeDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nutrition-analytics-screen'],
    queryFn: async () => apiClient.get('/nutrition/dashboard', { params: { days: 30 } }),
    staleTime: 2 * 60 * 1000,
  });

  const summaries = data?.trends?.weekSummaries || [];
  const goals = data?.goals || {};
  const primaryGoal = goals?.primaryGoal || null;
  const calorieGoal = goals?.dailyCalories || 2000;

  // Zero-filled series over the selected range, oldest -> newest — a day
  // with no logs should render as a real gap, not skew the chart spacing.
  const series = useMemo(() => {
    // s.date comes back from Drizzle as "YYYY-MM-DD 00:00:00" (a date
    // column, not a plain date string) — .slice(0,10) normalizes it
    // regardless of whether it's space- or T-separated, or already bare.
    const byDate = new Map(summaries.map((s) => [String(s.date).slice(0, 10), s]));
    const out = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Local date components, not .toISOString() — that converts to UTC
      // first, which silently shifts the calendar day (e.g. late evening
      // in any timezone behind UTC lands on "tomorrow"). Matches the
      // already-correct pattern in useHydrationAnalytics.js.
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const s = byDate.get(dateStr);
      out.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        calories: s?.totalCalories || 0,
        protein: s?.totalProtein || 0,
        carbs: s?.totalCarbs || 0,
        fats: s?.totalFats || 0,
        hasData: !!s,
      });
    }
    return out;
  }, [summaries, rangeDays]);

  const rangeStats = useMemo(() => {
    const logged = series.filter((d) => d.hasData);
    const totalCal = logged.reduce((sum, d) => sum + d.calories, 0);
    const totalProtein = logged.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = logged.reduce((sum, d) => sum + d.carbs, 0);
    const totalFats = logged.reduce((sum, d) => sum + d.fats, 0);
    const n = logged.length || 1;
    // Highest-calorie logged day in range — a real, honest third stat.
    // (Per-meal counts aren't included: /nutrition/dashboard's weekSummaries
    // always reports mealCount as 0 — it's sourced from a table this
    // endpoint never joins — so displaying it would just show a false "0".)
    const peakDay = logged.reduce((best, d) => (d.calories > (best?.calories || 0) ? d : best), null);
    return {
      daysLogged: logged.length,
      consistency: series.length ? Math.round((logged.length / series.length) * 100) : 0,
      avgCalories: Math.round(totalCal / n),
      avgProtein: Math.round(totalProtein / n),
      avgCarbs: Math.round(totalCarbs / n),
      avgFats: Math.round(totalFats / n),
      peakCalories: peakDay?.calories || 0,
    };
  }, [series]);

  const weeklyAverages = useMemo(
    () => ({ avgCalories: rangeStats.avgCalories, avgProtein: rangeStats.avgProtein, avgCarbs: rangeStats.avgCarbs, avgFats: rangeStats.avgFats }),
    [rangeStats]
  );

  const hasAnyData = series.some((d) => d.hasData);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/dashboard');
  }, [router]);

  const handleRangeChange = useCallback((days) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRangeDays(days);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Non-fatal — the screen keeps whatever it already has
    }
    setRefreshing(false);
  }, [refetch]);

  const rangeLabel = rangeDays === 30 ? 'this month' : 'this week';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING[2] }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={TEXT.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Nutrition</Text>
            <Text style={styles.headerSubtitle}>Your food story</Text>
          </View>
        </View>

        <View style={styles.rangeRow}>
          {RANGES.map((range) => {
            const selected = rangeDays === range.key;
            return (
              <TouchableOpacity
                key={range.key}
                style={[styles.rangeChip, selected && styles.rangeChipSelected]}
                onPress={() => handleRangeChange(range.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading && !data ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={NUTRITION_ORANGE} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={NUTRITION_ORANGE} colors={[NUTRITION_ORANGE]} />}
        >
          {!hasAnyData ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="nutrition-outline" size={48} color={TEXT.tertiary} />
              <Text style={styles.emptyText}>No meals logged {rangeLabel}</Text>
              <Text style={styles.emptySubtext}>Log a meal to start building your food story</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <StatCard value={rangeStats.avgCalories.toLocaleString()} label="Avg Cal/Day" />
                <StatCard value={rangeStats.peakCalories.toLocaleString()} label="Peak Day" />
                <StatCard value={`${rangeStats.consistency}%`} label="Days Logged" />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Calorie Trend</Text>
                <MiniLineChart
                  data={series.map((d) => d.calories)}
                  labels={series.map((d) => d.label)}
                  width={CHART_WIDTH}
                  color={NUTRITION_ORANGE}
                  showGrid
                  showDots={series.length <= 10}
                />
              </View>

              <GoalRealityCheckCard
                weeklyAverages={weeklyAverages}
                primaryGoal={primaryGoal}
                calorieGoal={calorieGoal}
              />

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Macro Averages</Text>
                <View style={styles.macroList}>
                  <MacroBar name="Protein" value={rangeStats.avgProtein} goal={goals.proteinG || 150} color={MACRO_COLORS.protein.base} />
                  <MacroBar name="Carbs" value={rangeStats.avgCarbs} goal={goals.carbsG || 250} color={MACRO_COLORS.carbs.base} />
                  <MacroBar name="Fat" value={rangeStats.avgFats} goal={goals.fatsG || 65} color={MACRO_COLORS.fat.base} />
                </View>
              </View>
            </>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({ name, value, goal, color }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroValue}>{value}g / {goal}g</Text>
      </View>
      <View style={styles.macroBarContainer}>
        <View style={[styles.macroBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
    gap: SPACING[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: SURFACES.background.tertiary,
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: SPACING[1],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  rangeChip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
  },
  rangeChipSelected: {
    backgroundColor: `${NUTRITION_ORANGE}15`,
    borderWidth: 1,
    borderColor: NUTRITION_ORANGE,
  },
  rangeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  rangeTextSelected: {
    color: NUTRITION_ORANGE,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[2],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  statCard: {
    flex: 1,
    ...CARD_SYSTEM.standard,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  card: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  macroList: {
    gap: SPACING[3],
  },
  macroRow: {
    gap: SPACING[1],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  macroBarContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  bottomPadding: {
    height: SPACING[8],
  },
});
