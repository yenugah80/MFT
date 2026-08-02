/**
 * Hydration Analytics - dedicated deep-dive screen
 *
 * Split out of the unified /analytics screen (which stacks Wellness, Nutrition,
 * Mood, Activity and Hydration behind one tab bar) so hydration gets the same
 * treatment as its own insights/recommendations screens: one domain, one story,
 * no tab hunting.
 *
 * Deliberately does NOT repeat what the tracker modal already shows. The tracker
 * answers "how am I doing right now"; this screen answers "how have I been
 * doing, when do I drink, what do I drink, and what should I expect tomorrow".
 * Today's ring is kept only as a small anchor at the top for context.
 *
 * Data sources (all existing endpoints, no backend changes):
 *   GET /hydration/analytics/dashboard  → patterns, persona, prediction, cold start
 *   GET /water/history                  → per-day series for the trend chart
 *   GET /water/today                    → today's total (shared cache with the log tab)
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import apiClient from '../../services/apiClient';
import { useHydrationAnalytics, useHydrationHistory } from '../../hooks/useHydrationAnalytics';
import { useDashboard } from '../../hooks/useDashboard';
import { BEVERAGE_TYPES } from '../../constants/beverageConstants';
import HydrationTrendChart from '../../components/hydration/HydrationTrendChart';
import ProgressRing from '../../components/analytics/ProgressRing';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  SEMANTIC,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const RANGES = [
  { key: 7, label: '7 Days' },
  { key: 30, label: '30 Days' },
];

const HYDRATION_BLUE = VIBRANT_WELLNESS.hydration.solid; // #0891B2
const HYDRATION_LIGHT = '#7DD3EF';

const PERIODS = [
  { key: 'morning', label: 'Morning', hint: '6am–12pm', icon: 'sunny-outline' },
  { key: 'afternoon', label: 'Afternoon', hint: '12pm–6pm', icon: 'partly-sunny-outline' },
  { key: 'evening', label: 'Evening', hint: '6pm–12am', icon: 'moon-outline' },
];

function formatHour(hour) {
  if (hour === undefined || hour === null) return null;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
}

function formatVolume(ml) {
  if (!ml || ml < 0) return '0ml';
  if (ml < 1000) return `${Math.round(ml)}ml`;
  return `${(ml / 1000).toFixed(1)}L`;
}

export default function HydrationAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rangeDays, setRangeDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const {
    analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useHydrationAnalytics();

  // Always pull 30 days; the range toggle slices locally. Streaks and averages
  // off a 7-day fetch would understate a longer run, and toggling would refetch
  // data we already have.
  const {
    series: fullSeries,
    isLoading: historyLoading,
    hasFailed: historyFailed,
    refetch: refetchHistory,
  } = useHydrationHistory(30);

  const series = useMemo(
    () => fullSeries.slice(-rangeDays),
    [fullSeries, rangeDays]
  );

  // Same query key as the log tab so today's number never disagrees between screens
  const { data: waterToday, refetch: refetchToday } = useQuery({
    queryKey: ['waterToday'],
    queryFn: async () => {
      const response = await apiClient.get('/water/today');
      return response || { logs: [], totalLiters: 0, count: 0 };
    },
    staleTime: 30 * 1000,
  });

  const { data: dashboard } = useDashboard();

  const patterns = analytics?.patterns;
  const persona = analytics?.persona;
  const prediction = analytics?.prediction;
  const coldStart = analytics?.coldStart;

  // patterns is null until there's at least one log in the lookback window, so
  // a brand-new user would otherwise be measured against a hardcoded 2L rather
  // than the goal they set in onboarding.
  const goalMl =
    patterns?.goalMl ||
    Math.round((dashboard?.goals?.waterLiters || 0) * 1000) ||
    2000;
  const todayMl = Math.round((waterToday?.totalLiters || 0) * 1000);
  const todayPercent = goalMl > 0 ? Math.round((todayMl / goalMl) * 100) : 0;

  // Derived stats from the day series — computed here rather than trusting the
  // aggregate endpoint so the numbers always match the bars on screen.
  const rangeStats = useMemo(() => {
    const loggedDays = series.filter((d) => d.ml > 0);
    const total = loggedDays.reduce((sum, d) => sum + d.ml, 0);
    const daysOnTarget = series.filter((d) => d.ml >= goalMl).length;
    const best = series.reduce((m, d) => (d.ml > (m?.ml || 0) ? d : m), null);

    // Streak runs over the full 30-day window, not the visible slice — a
    // 12-day run shouldn't read as "7" just because the 7-day view is open.
    // Today is excluded from breaking it: a day still in progress isn't a miss.
    // Threshold is 80% of goal, matching the backend's rule.
    let streak = 0;
    for (let i = fullSeries.length - 1; i >= 0; i--) {
      const day = fullSeries[i];
      if (day.ml >= goalMl * 0.8) streak++;
      else if (day.isToday) continue;
      else break;
    }

    return {
      avgMl: loggedDays.length ? Math.round(total / loggedDays.length) : 0,
      daysLogged: loggedDays.length,
      daysOnTarget,
      bestMl: best?.ml || 0,
      streak,
      consistency: series.length ? Math.round((loggedDays.length / series.length) * 100) : 0,
    };
  }, [series, fullSeries, goalMl]);

  const beverages = useMemo(() => {
    const breakdown = patterns?.beverageBreakdown;
    if (!breakdown) return [];
    return Object.entries(breakdown)
      .map(([type, value]) => ({
        type,
        // Falling back to BEVERAGE_TYPES.water would label an unrecognised
        // type "Water" — silently wrong. Show the raw type instead.
        meta: BEVERAGE_TYPES[type] || {
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
          icon: 'ellipse-outline',
          color: HYDRATION_BLUE,
        },
        volumeMl: Math.round((value?.volume || 0) * 1000),
        percentage: Math.round((value?.percentage || 0) * 100),
      }))
      .filter((b) => b.volumeMl > 0)
      .sort((a, b) => b.volumeMl - a.volumeMl);
  }, [patterns]);

  const peakHourLabel = formatHour(patterns?.peakHour);
  const hasAnyLogs =
    (coldStart?.totalLogs || 0) > 0 ||
    todayMl > 0 ||
    fullSeries.some((d) => d.ml > 0);
  // A failed history fetch must not masquerade as "you've never logged water".
  const showLoadError = historyFailed && !hasAnyLogs;
  const isLoading = (analyticsLoading || historyLoading) && !hasAnyLogs && !historyFailed;

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleRangeChange = useCallback((days) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRangeDays(days);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAnalytics(), refetchHistory(), refetchToday()]);
    } catch {
      // Non-fatal — the screen keeps whatever it already has
    }
    setRefreshing(false);
  }, [refetchAnalytics, refetchHistory, refetchToday]);

  const handleLogWater = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/log?focus=hydration');
  }, [router]);

  const handleEnergyInsights = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/insights/hydration-cognition');
  }, [router]);

  return (
    <View style={styles.screen}>
      {/* Header */}
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
            <Text style={styles.headerTitle}>Hydration</Text>
            <Text style={styles.headerSubtitle}>Your water story</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleLogWater}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Log water"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
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

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={HYDRATION_BLUE} />
          <Text style={styles.loadingText}>Loading your hydration data…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={HYDRATION_BLUE}
              colors={[HYDRATION_BLUE]}
            />
          }
        >
          {showLoadError ? (
            <LoadErrorState onRetry={handleRefresh} />
          ) : !hasAnyLogs ? (
            <EmptyState onLogWater={handleLogWater} />
          ) : (
            <>
              {/* TODAY — small anchor, not the main event */}
              <View style={styles.todayCard}>
                <ProgressRing
                  value={todayMl}
                  goal={goalMl}
                  size={104}
                  strokeWidth={10}
                  color={todayPercent >= 100 ? SEMANTIC.success.base : HYDRATION_BLUE}
                  centerValue={`${todayPercent}%`}
                  centerLabel="today"
                />
                <View style={styles.todayDetails}>
                  <Text style={styles.todayValue}>
                    {formatVolume(todayMl)}
                    <Text style={styles.todayGoal}> / {formatVolume(goalMl)}</Text>
                  </Text>
                  <Text style={styles.todayCaption}>
                    {todayMl >= goalMl
                      ? 'Goal met — nice work'
                      : `${formatVolume(goalMl - todayMl)} left today`}
                  </Text>
                  <TouchableOpacity
                    style={styles.todayCta}
                    onPress={handleLogWater}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="water" size={14} color={HYDRATION_BLUE} />
                    <Text style={styles.todayCtaText}>Log water</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TREND — the reason this screen exists */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Last {rangeDays} days</Text>
                  <Text style={styles.cardMeta}>
                    {rangeStats.daysOnTarget}/{series.length} on target
                  </Text>
                </View>
                <HydrationTrendChart
                  series={series}
                  goalMl={goalMl}
                  height={rangeDays > 7 ? 130 : 150}
                />
                {rangeStats.avgMl > 0 && (
                  <Text style={styles.cardFooterNote}>
                    You averaged {formatVolume(rangeStats.avgMl)} on the days you logged —{' '}
                    {Math.round((rangeStats.avgMl / goalMl) * 100)}% of your{' '}
                    {formatVolume(goalMl)} goal.
                  </Text>
                )}
              </View>

              {/* CONSISTENCY */}
              <View style={styles.statsRow}>
                <StatTile
                  value={formatVolume(rangeStats.avgMl)}
                  label="Daily avg"
                  icon="water-outline"
                  color={HYDRATION_BLUE}
                />
                <StatTile
                  value={`${rangeStats.streak}`}
                  label="Day streak"
                  icon="flame-outline"
                  color={rangeStats.streak > 0 ? '#F97316' : TEXT.tertiary}
                />
                <StatTile
                  value={`${rangeStats.consistency}%`}
                  label="Days logged"
                  icon="calendar-outline"
                  color={HYDRATION_BLUE}
                />
              </View>

              {/* WHEN YOU DRINK */}
              {patterns?.periodDistribution && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>When you drink</Text>
                    {peakHourLabel && (
                      <View style={styles.peakChip}>
                        <Ionicons name="time-outline" size={12} color={HYDRATION_BLUE} />
                        <Text style={styles.peakChipText}>Peak {peakHourLabel}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.periodList}>
                    {PERIODS.map((period) => {
                      const share = Math.round(
                        (patterns.periodDistribution[period.key] || 0) * 100
                      );
                      return (
                        <View key={period.key} style={styles.periodRow}>
                          <Ionicons name={period.icon} size={16} color={TEXT.tertiary} />
                          <View style={styles.periodLabelBlock}>
                            <Text style={styles.periodLabel}>{period.label}</Text>
                            <Text style={styles.periodHint}>{period.hint}</Text>
                          </View>
                          <View style={styles.periodBarTrack}>
                            <View
                              style={[
                                styles.periodBarFill,
                                { width: `${Math.min(share, 100)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.periodValue}>{share}%</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.cardFooterNote}>
                    Front-loading water before mid-afternoon tends to hold energy steadier
                    than catching up at night.
                  </Text>
                </View>
              )}

              {/* WHAT YOU DRINK */}
              {beverages.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>What you drink</Text>
                  <View style={styles.beverageList}>
                    {beverages.slice(0, 6).map((bev) => (
                      <View key={bev.type} style={styles.beverageRow}>
                        <View
                          style={[
                            styles.beverageIcon,
                            { backgroundColor: `${bev.meta.color}18` },
                          ]}
                        >
                          <Ionicons
                            name={bev.meta.icon}
                            size={15}
                            color={bev.meta.color}
                          />
                        </View>
                        <Text style={styles.beverageLabel}>{bev.meta.label}</Text>
                        <View style={styles.beverageBarTrack}>
                          <View
                            style={[
                              styles.beverageBarFill,
                              {
                                width: `${Math.min(bev.percentage, 100)}%`,
                                backgroundColor: bev.meta.color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.beverageValue}>{bev.percentage}%</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.cardFooterNote}>
                    Shares are of hydration counted, not raw volume — coffee and tea are
                    already discounted by their hydration factor.
                  </Text>
                </View>
              )}

              {/* PERSONA */}
              {persona?.title ? (
                <LinearGradient
                  colors={VIBRANT_WELLNESS.hydration.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.personaCard}
                >
                  <View style={styles.personaHeader}>
                    <View style={styles.personaIcon}>
                      <Ionicons
                        name={persona.icon || 'water-outline'}
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.personaTitleBlock}>
                      <Text style={styles.personaEyebrow}>Your hydration type</Text>
                      <Text style={styles.personaTitle}>{persona.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.personaDescription}>{persona.description}</Text>
                  {persona.recommendation && (
                    <View style={styles.personaTip}>
                      <Ionicons name="bulb-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.personaTipText}>{persona.recommendation}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Your hydration type</Text>
                  <Text style={styles.progressiveText}>
                    Keep logging — after about a week of data we can tell whether you're a
                    steady sipper, a morning dehydrator, or an evening catch-up drinker.
                  </Text>
                  <ProgressTrack
                    current={coldStart?.distinctDays || rangeStats.daysLogged}
                    target={7}
                  />
                </View>
              )}

              {/* TOMORROW */}
              {prediction?.hasPrediction && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Tomorrow's target</Text>
                    <Text style={styles.cardMeta}>
                      {Math.round((prediction.confidence || 0.6) * 100)}% confidence
                    </Text>
                  </View>
                  <Text style={styles.predictionValue}>
                    {(prediction.predictedNeedLiters || 0).toFixed(1)}L
                  </Text>
                  <Text style={styles.predictionCaption}>
                    Based on your {formatVolume((prediction.typicalIntakeLiters || 0) * 1000)}{' '}
                    typical day and your {(prediction.baseGoalLiters || 2).toFixed(1)}L goal.
                  </Text>
                  {(prediction.factors || []).map((factor, index) => (
                    <View key={factor.type || index} style={styles.factorRow}>
                      <Ionicons name="arrow-up-circle-outline" size={14} color={HYDRATION_BLUE} />
                      <Text style={styles.factorText}>{factor.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* DEEP DIVE LINK */}
              <TouchableOpacity
                style={styles.linkCard}
                onPress={handleEnergyInsights}
                activeOpacity={0.7}
              >
                <View style={styles.linkIcon}>
                  <Ionicons name="flash-outline" size={18} color={HYDRATION_BLUE} />
                </View>
                <View style={styles.linkTextBlock}>
                  <Text style={styles.linkTitle}>Hydration & Energy</Text>
                  <Text style={styles.linkSubtitle}>
                    How your water intake tracks with focus and mood
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

function StatTile({ value, label, icon, color }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressTrack({ current = 0, target = 7 }) {
  const clamped = Math.min(current, target);
  return (
    <View style={styles.progressTrackWrap}>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(clamped / target) * 100}%` }]}
        />
      </View>
      <Text style={styles.progressTrackLabel}>
        {clamped} of {target} days
      </Text>
    </View>
  );
}

function LoadErrorState({ onRetry }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cloud-offline-outline" size={36} color={TEXT.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>Couldn't load your hydration data</Text>
      <Text style={styles.emptyText}>
        Your logs are safe — we just couldn't reach them right now.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onRetry} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.emptyCtaText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onLogWater }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="water-outline" size={36} color={HYDRATION_BLUE} />
      </View>
      <Text style={styles.emptyTitle}>No hydration data yet</Text>
      <Text style={styles.emptyText}>
        Log a drink and this screen fills in with your daily trend, when you drink, and
        what you drink.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onLogWater} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.emptyCtaText}>Log your first drink</Text>
      </TouchableOpacity>
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: HYDRATION_BLUE,
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
    backgroundColor: `${HYDRATION_BLUE}15`,
    borderWidth: 1,
    borderColor: HYDRATION_BLUE,
  },
  rangeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  rangeTextSelected: {
    color: HYDRATION_BLUE,
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
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Today anchor
  todayCard: {
    ...CARD_SYSTEM.standard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  todayDetails: {
    flex: 1,
    gap: SPACING[1],
  },
  todayValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  todayGoal: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  todayCaption: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  todayCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING[1],
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1.5],
    borderRadius: RADIUS.full,
    backgroundColor: `${HYDRATION_BLUE}12`,
  },
  todayCtaText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: HYDRATION_BLUE,
  },

  // Generic card
  card: {
    ...CARD_SYSTEM.standard,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  cardMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  cardFooterNote: {
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 17,
    color: TEXT.tertiary,
    marginTop: SPACING[3],
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    ...CARD_SYSTEM.standard,
    marginBottom: 0,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },

  // When you drink
  peakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    backgroundColor: `${HYDRATION_BLUE}12`,
  },
  peakChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: HYDRATION_BLUE,
  },
  periodList: {
    gap: SPACING[3],
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  periodLabelBlock: {
    width: 76,
  },
  periodLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  periodHint: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
  periodBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  periodBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: HYDRATION_BLUE,
  },
  periodValue: {
    width: 38,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  // Beverages
  beverageList: {
    gap: SPACING[3],
  },
  beverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  beverageIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beverageLabel: {
    width: 84,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
  },
  beverageBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  beverageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  beverageValue: {
    width: 38,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  // Persona
  personaCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    gap: SPACING[3],
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  personaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  personaTitleBlock: {
    flex: 1,
  },
  personaEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  personaTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  personaDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  personaTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  personaTipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 17,
    color: '#FFFFFF',
  },

  // Progressive disclosure
  progressiveText: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
    color: TEXT.secondary,
  },
  progressTrackWrap: {
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: HYDRATION_LIGHT,
  },
  progressTrackLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Prediction
  predictionValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: HYDRATION_BLUE,
  },
  predictionCaption: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  factorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },

  // Link card
  linkCard: {
    ...CARD_SYSTEM.standard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${HYDRATION_BLUE}12`,
  },
  linkTextBlock: {
    flex: 1,
  },
  linkTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  linkSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
    paddingHorizontal: SPACING[6],
    gap: SPACING[3],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${HYDRATION_BLUE}12`,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: HYDRATION_BLUE,
  },
  emptyCtaText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  bottomPadding: {
    height: SPACING[10],
  },
});
