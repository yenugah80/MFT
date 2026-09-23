import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import apiClient from '../../services/apiClient';
import { useHydrationAnalytics, useHydrationHistory } from '../../hooks/useHydrationAnalytics';
import { useDashboard } from '../../hooks/useDashboard';
import { useWaterLog } from '../../hooks/useWaterLog';
import { BEVERAGE_TYPES, DEFAULT_WATER_GOAL_LITERS } from '../../constants/beverageConstants';
import HydrationTrendChart from '../../components/hydration/HydrationTrendChart';
import {
  buildHydrationInsights,
  HYDRATION_PERIODS,
  HYDRATION_RANGE_OPTIONS,
  summarizeHydrationRange,
} from '../../utils/hydrationHistory';
import {
  RADIUS,
  SHADOWS,
  SPACING,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

const HYDRATION = {
  primary: '#4169E1',
  bright: '#5B8DEE',
  cyan: '#0891B2',
  pale: '#EEF4FF',
  border: '#D9E5FF',
  gradient: ['#5B8DEE', '#4169E1', '#2E4A7D'],
};

const INITIAL_ENTRY_COUNT = 8;

function formatVolume(ml, compact = false) {
  const value = Math.max(0, Number(ml) || 0);
  if (value < 1000) return `${Math.round(value)} ml`;
  const liters = value / 1000;
  return `${liters.toFixed(compact && liters % 1 === 0 ? 0 : 1)} L`;
}

function formatEntryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatDay(value) {
  if (!value) return 'No logged day';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function titleCase(value) {
  if (!value) return 'None yet';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function getBeverageMeta(type) {
  return BEVERAGE_TYPES[type] || {
    label: titleCase(type || 'drink'),
    icon: 'ellipse-outline',
    color: HYDRATION.primary,
  };
}

export default function HydrationHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rangeKey, setRangeKey] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [visibleEntryCount, setVisibleEntryCount] = useState(INITIAL_ENTRY_COUNT);
  const [deletingEntryId, setDeletingEntryId] = useState(null);

  const selectedRange = HYDRATION_RANGE_OPTIONS.find((range) => range.key === rangeKey)
    || HYDRATION_RANGE_OPTIONS[2];

  const {
    analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useHydrationAnalytics();
  const {
    series: fullSeries,
    logs,
    isLoading: historyLoading,
    hasFailed: historyFailed,
    refetch: refetchHistory,
  } = useHydrationHistory(90);
  const { data: dashboard, refetch: refetchDashboard } = useDashboard();
  const { removeWater } = useWaterLog();

  const { data: waterToday, refetch: refetchToday } = useQuery({
    queryKey: ['waterToday'],
    queryFn: async () => {
      const response = await apiClient.get('/water/today');
      return response || { logs: [], totalLiters: 0, count: 0 };
    },
    staleTime: 30 * 1000,
  });

  const goalMl = Math.round(
    (Number(dashboard?.goals?.waterLiters) || DEFAULT_WATER_GOAL_LITERS) * 1000,
  );
  const summary = useMemo(() => summarizeHydrationRange({
    fullSeries,
    logs,
    rangeDays: selectedRange.days,
    goalMl,
  }), [fullSeries, goalMl, logs, selectedRange.days]);

  const todaySeriesMl = Number(fullSeries[fullSeries.length - 1]?.ml) || 0;
  const todayMl = Math.round(
    Number.isFinite(Number(waterToday?.totalLiters))
      ? Number(waterToday?.totalLiters) * 1000
      : todaySeriesMl,
  );
  const todayPercent = goalMl > 0 ? Math.round((todayMl / goalMl) * 100) : 0;
  const isDay = selectedRange.days === 1;
  const hasHistory = (logs || []).length > 0 || fullSeries.some((day) => day.ml > 0);
  const selectedRangeHasData = summary.daysTracked > 0;
  const isLoading = historyLoading && !hasHistory;
  const showLoadError = historyFailed && !hasHistory;
  const visibleEntries = summary.rangeLogs.slice(0, visibleEntryCount);
  const remainingEntries = Math.max(summary.rangeLogs.length - visibleEntries.length, 0);
  const insights = useMemo(
    () => buildHydrationInsights(summary, goalMl),
    [goalMl, summary],
  );

  const metrics = useMemo(() => {
    const topBeverage = getBeverageMeta(summary.topBeverageType);
    if (isDay) {
      return [
        { icon: 'water-outline', value: formatVolume(todayMl), label: 'Hydration today' },
        { icon: 'flag-outline', value: `${todayPercent}%`, label: 'Daily goal' },
        { icon: 'add-circle-outline', value: `${summary.rangeLogs.length}`, label: 'Drinks logged' },
        { icon: topBeverage.icon, value: summary.topBeverageType ? topBeverage.label : 'None yet', label: 'Top drink' },
      ];
    }
    return [
      { icon: 'water-outline', value: formatVolume(summary.averageLoggedDayMl), label: 'Avg logged day' },
      { icon: 'flag-outline', value: `${summary.daysOnTarget}/${summary.series.length}`, label: 'Goal days' },
      { icon: 'calendar-outline', value: `${summary.daysTracked}/${summary.series.length}`, label: 'Days tracked' },
      { icon: topBeverage.icon, value: summary.topBeverageType ? topBeverage.label : 'None yet', label: 'Top drink' },
    ];
  }, [isDay, summary, todayMl, todayPercent]);

  const prediction = analytics?.prediction;

  useEffect(() => {
    setVisibleEntryCount(INITIAL_ENTRY_COUNT);
  }, [rangeKey]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/dashboard');
  }, [router]);

  const handleLogWater = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/log?focus=hydration');
  }, [router]);

  const handleRangeChange = useCallback((nextRange) => {
    Haptics.selectionAsync();
    setRangeKey(nextRange);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAnalytics(), refetchHistory(), refetchToday(), refetchDashboard(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAnalytics, refetchDashboard, refetchHistory, refetchToday]);

  const handleDeleteEntry = useCallback((entry) => {
    const rawLiters = Number(entry?.amountLiters) || 0;
    const hydrationLiters = Number(entry?.hydrationLiters) || rawLiters;
    const amountMl = Math.round(rawLiters * 1000);
    const beverage = getBeverageMeta(entry?.beverageType);

    Alert.alert(
      'Delete hydration entry?',
      `Remove ${amountMl} ml of ${beverage.label} from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingEntryId(entry.id);
            try {
              await removeWater(Number(entry.id), rawLiters, hydrationLiters);
              await Promise.all([refetchAnalytics(), refetchHistory(), refetchToday()]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Could not delete entry', 'Your hydration entry is still safe. Please try again.');
            } finally {
              setDeletingEntryId(null);
            }
          },
        },
      ],
    );
  }, [refetchAnalytics, refetchHistory, refetchToday, removeWater]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={HYDRATION.primary}
            colors={[HYDRATION.primary]}
          />
        )}
      >
        <LinearGradient colors={HYDRATION.gradient} style={styles.hero}>
          <View style={[styles.heroSafe, { paddingTop: insets.top + SPACING[2] }]}>
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={24} color={TEXT.white} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Hydration history</Text>
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleLogWater}
                accessibilityRole="button"
                accessibilityLabel="Log water"
              >
                <Ionicons name="add" size={25} color={TEXT.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.heroIcon}>
                <Ionicons name="water-outline" size={25} color={TEXT.white} />
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>See how your water story flows</Text>
                <Text style={styles.heroSubtitle}>
                  Intake, consistency, drinks, and logging rhythm in one timeline.
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
        <RangeSelector selectedKey={rangeKey} onSelect={handleRangeChange} />

        {isLoading ? (
          <StateCard
            loading
            title="Bringing your hydration history together"
            body="Your live entries and trends are loading."
          />
        ) : showLoadError ? (
          <StateCard
            icon="cloud-offline-outline"
            title="Hydration history is taking a pause"
            body="Your entries are safe. Check your connection and try again."
            actionLabel="Try again"
            onAction={handleRefresh}
          />
        ) : !hasHistory ? (
          <StateCard
            icon="water-outline"
            title="Your hydration story starts here"
            body="Log a drink to begin tracking intake, consistency, and patterns."
            actionLabel="Log water"
            onAction={handleLogWater}
          />
        ) : (
          <>
            {historyFailed && (
              <View style={styles.staleNotice}>
                <Ionicons name="cloud-offline-outline" size={17} color="#9A6700" />
                <Text style={styles.staleNoticeText}>Showing saved hydration data. Pull to refresh.</Text>
              </View>
            )}

            <View style={styles.metricsGrid}>
              {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
            </View>

            {!selectedRangeHasData && (
              <View style={styles.rangeEmptyCard}>
                <View style={styles.rangeEmptyIcon}>
                  <Ionicons name="water-outline" size={24} color={HYDRATION.primary} />
                </View>
                <View style={styles.rangeEmptyCopy}>
                  <Text style={styles.rangeEmptyTitle}>Nothing logged in this range</Text>
                  <Text style={styles.rangeEmptyText}>Choose a longer range or add your first drink for today.</Text>
                </View>
                <TouchableOpacity
                  style={styles.rangeEmptyAction}
                  onPress={handleLogWater}
                  accessibilityRole="button"
                  accessibilityLabel="Log water"
                >
                  <Ionicons name="add" size={20} color={TEXT.white} />
                </TouchableOpacity>
              </View>
            )}

            <InsightsCard
              expanded={insightsExpanded}
              onToggle={() => setInsightsExpanded((current) => !current)}
              insights={insights}
              summary={summary}
              prediction={prediction}
              rangeLabel={selectedRange.label}
            />

            <View style={styles.sectionHeading}>
              <Text style={styles.eyebrow}>TRACKING</Text>
              <Text style={styles.sectionTitle}>
                {isDay ? 'Today at a glance' : `Your last ${selectedRange.label}`}
              </Text>
            </View>

            <View style={styles.trendCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.cardTitle}>{isDay ? 'Logged rhythm' : 'Hydration trend'}</Text>
                  <Text style={styles.cardSubtitle}>
                    {isDay
                      ? 'Volume by the time it was recorded'
                      : (selectedRange.days > 14
                        ? 'Weekly average on logged days'
                        : 'Hydration-adjusted daily totals')}
                  </Text>
                </View>
                <View style={styles.headerPill}>
                  <Text style={styles.headerPillText}>
                    {isDay ? `${summary.rangeLogs.length} logs` : `${summary.daysOnTarget} goal days`}
                  </Text>
                </View>
              </View>

              {isDay ? (
                <DayRhythmChart periodTotals={summary.periodTotals} />
              ) : (
                <HydrationTrendChart
                  series={summary.series}
                  goalMl={goalMl}
                  height={selectedRange.days >= 90 ? 132 : 148}
                />
              )}

              <View style={styles.trendSummary}>
                <View style={styles.trendSummaryItem}>
                  <Text style={styles.trendSummaryValue}>{formatVolume(summary.averageLoggedDayMl)}</Text>
                  <Text style={styles.trendSummaryLabel}>Avg on logged days</Text>
                </View>
                <View style={styles.trendDivider} />
                <View style={styles.trendSummaryItem}>
                  <Text style={styles.trendSummaryValue}>{summary.streak}</Text>
                  <Text style={styles.trendSummaryLabel}>Current 80% streak</Text>
                </View>
                <View style={styles.trendDivider} />
                <View style={styles.trendSummaryItem}>
                  <Text style={styles.trendSummaryValue}>{formatDay(summary.bestDay?.date)}</Text>
                  <Text style={styles.trendSummaryLabel}>Best logged day</Text>
                </View>
              </View>

              <View style={styles.evidenceNote}>
                <Ionicons name="information-circle-outline" size={15} color={TEXT.tertiary} />
                <Text style={styles.evidenceText}>
                  Averages use {summary.daysTracked} {summary.daysTracked === 1 ? 'day' : 'days'} with at least one entry. Missing days are shown as gaps, not counted as zero intake.
                  {selectedRange.days > 14 ? ' Long ranges are grouped into calendar weeks.' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.eyebrow}>RECENT</Text>
                <Text style={styles.sectionTitle}>Drinks</Text>
              </View>
              <Text style={styles.sectionCount}>{summary.rangeLogs.length} in range</Text>
            </View>

            {summary.rangeLogs.length > 0 ? (
              <View style={styles.entriesCard}>
                {visibleEntries.map((entry, index) => (
                  <HydrationEntry
                    key={entry.id}
                    entry={entry}
                    isLast={index === visibleEntries.length - 1 && remainingEntries === 0}
                    deleting={deletingEntryId === entry.id}
                    onDelete={() => handleDeleteEntry(entry)}
                  />
                ))}
                {remainingEntries > 0 && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setVisibleEntryCount((count) => count + INITIAL_ENTRY_COUNT)}
                    accessibilityRole="button"
                    accessibilityLabel={`Show more hydration entries. ${remainingEntries} remaining`}
                  >
                    <Text style={styles.showMoreText}>Show {Math.min(INITIAL_ENTRY_COUNT, remainingEntries)} more</Text>
                    <Ionicons name="chevron-down" size={17} color={HYDRATION.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noEntriesCard}>
                <Text style={styles.noEntriesText}>No drinks were recorded in this range.</Text>
              </View>
            )}
          </>
        )}

        {analyticsLoading && hasHistory && (
          <Text style={styles.analyticsLoadingText}>Refreshing deeper hydration insights...</Text>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

function RangeSelector({ selectedKey, onSelect }) {
  return (
    <View style={styles.rangeSelector}>
      {HYDRATION_RANGE_OPTIONS.map((range) => {
        const selected = range.key === selectedKey;
        return (
          <TouchableOpacity
            key={range.key}
            style={[styles.rangeButton, selected && styles.rangeButtonActive]}
            onPress={() => onSelect(range.key)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${range.label}`}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.rangeButtonText, selected && styles.rangeButtonTextActive]}>{range.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MetricCard({ icon, value, label }) {
  return (
    <View style={styles.metricCard} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metricIcon}><Ionicons name={icon} size={18} color={HYDRATION.primary} /></View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InsightsCard({ expanded, onToggle, insights, summary, prediction, rangeLabel }) {
  const beverageRows = Object.entries(summary.beverageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const beverageTotal = Object.values(summary.beverageTotals)
    .reduce((total, ml) => total + ml, 0);
  const evidenceLabel = rangeLabel === 'Day'
    ? "Observed from today's live entries"
    : `Observed from ${rangeLabel.toLowerCase()} of live entries`;

  return (
    <View style={styles.insightsCard}>
      <TouchableOpacity
        style={styles.insightsHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Hydration insights"
        accessibilityState={{ expanded }}
      >
        <View style={styles.insightsIcon}><Ionicons name="analytics-outline" size={21} color={HYDRATION.primary} /></View>
        <View style={styles.insightsHeadingCopy}>
          <Text style={styles.insightsEyebrow}>INSIGHTS</Text>
          <Text style={styles.insightsTitle}>Understand your hydration patterns</Text>
          <Text style={styles.insightsSubtitle}>{evidenceLabel}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={TEXT.tertiary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.insightsBody}>
          {insights.map((insight) => (
            <View key={insight.key} style={styles.insightRow}>
              <View style={styles.insightRowIcon}><Ionicons name={insight.icon} size={17} color={HYDRATION.primary} /></View>
              <View style={styles.insightRowCopy}>
                <Text style={styles.insightRowTitle}>{insight.title}</Text>
                <Text style={styles.insightRowBody}>{insight.body}</Text>
              </View>
            </View>
          ))}

          {beverageRows.length > 0 && (
            <View style={styles.mixSection}>
              <Text style={styles.mixTitle}>Hydration counted by drink</Text>
              {beverageRows.map(([type, ml]) => {
                const beverage = getBeverageMeta(type);
                const share = beverageTotal > 0 ? Math.round((ml / beverageTotal) * 100) : 0;
                return (
                  <View key={type} style={styles.mixRow}>
                    <View style={[styles.mixDot, { backgroundColor: beverage.color }]} />
                    <Text style={styles.mixLabel}>{beverage.label}</Text>
                    <View style={styles.mixTrack}>
                      <View style={[styles.mixFill, { width: `${share}%`, backgroundColor: beverage.color }]} />
                    </View>
                    <Text style={styles.mixValue}>{share}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {prediction?.hasPrediction && (
            <View style={styles.tomorrowCard}>
              <View style={styles.tomorrowIcon}><Ionicons name="sparkles-outline" size={18} color={HYDRATION.primary} /></View>
              <View style={styles.tomorrowCopy}>
                <Text style={styles.tomorrowLabel}>TOMORROW'S ESTIMATE</Text>
                <Text style={styles.tomorrowValue}>{(Number(prediction.predictedNeedLiters) || 0).toFixed(1)} L target</Text>
                <Text style={styles.tomorrowText}>Based on your goal and recent hydration history.</Text>
              </View>
            </View>
          )}

          <View style={styles.patternDisclaimer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={TEXT.tertiary} />
            <Text style={styles.patternDisclaimerText}>Patterns describe your records. They do not prove cause or health outcomes.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function DayRhythmChart({ periodTotals }) {
  const max = Math.max(...Object.values(periodTotals), 1);
  return (
    <View style={styles.dayChart}>
      {HYDRATION_PERIODS.map((period) => {
        const amount = Number(periodTotals[period.key]) || 0;
        const height = amount > 0 ? Math.max(24, (amount / max) * 104) : 6;
        return (
          <View key={period.key} style={styles.dayBarColumn}>
            <Text style={styles.dayBarValue}>{amount > 0 ? formatVolume(amount, true) : '0'}</Text>
            <View style={styles.dayBarArea}>
              <LinearGradient
                colors={[HYDRATION.bright, HYDRATION.primary]}
                style={[styles.dayBar, { height, opacity: amount > 0 ? 1 : 0.18 }]}
              />
            </View>
            <Text style={styles.dayBarLabel}>{period.label}</Text>
            <Text style={styles.dayBarHours}>{period.hours}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HydrationEntry({ entry, deleting, isLast, onDelete }) {
  const beverage = getBeverageMeta(entry.beverageType);
  const rawMl = Math.round((Number(entry.amountLiters) || 0) * 1000);
  const hydrationMl = Math.round((Number(entry.hydrationLiters) || Number(entry.amountLiters) || 0) * 1000);
  const adjusted = hydrationMl !== rawMl;

  return (
    <View style={[styles.entryRow, !isLast && styles.entryDivider]}>
      <View style={[styles.entryIcon, { backgroundColor: `${beverage.color}14` }]}>
        <Ionicons name={beverage.icon} size={21} color={beverage.color} />
      </View>
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>{formatVolume(rawMl)} {beverage.label}</Text>
        <Text style={styles.entryTime}>{formatEntryTime(entry.loggedDate)}</Text>
        {adjusted && <Text style={styles.entryAdjustment}>{formatVolume(hydrationMl)} hydration counted</Text>}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${rawMl} milliliter ${beverage.label} entry`}
      >
        {deleting
          ? <ActivityIndicator size="small" color="#C96B6B" />
          : <Ionicons name="trash-outline" size={20} color="#C96B6B" />}
      </TouchableOpacity>
    </View>
  );
}

function StateCard({ loading, icon, title, body, actionLabel, onAction }) {
  return (
    <View style={styles.stateCard}>
      {loading
        ? <ActivityIndicator size="large" color={HYDRATION.primary} />
        : <View style={styles.stateIcon}><Ionicons name={icon} size={32} color={HYDRATION.primary} /></View>}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && (
        <TouchableOpacity style={styles.stateAction} onPress={onAction} accessibilityRole="button">
          <Text style={styles.stateActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACES.background.primary },
  hero: { paddingBottom: SPACING[5], borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'], overflow: 'hidden' },
  heroSafe: { paddingHorizontal: SPACING[4] },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  navTitle: { color: TEXT.white, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.semibold },
  heroCopy: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingHorizontal: SPACING[1], paddingTop: SPACING[4] },
  heroIcon: { width: 48, height: 48, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  heroTextBlock: { flex: 1 },
  heroTitle: { color: TEXT.white, fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, letterSpacing: -0.35 },
  heroSubtitle: { marginTop: SPACING[1], color: 'rgba(255,255,255,0.86)', fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.regular, lineHeight: 17 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: SPACING[4] },
  rangeSelector: { flexDirection: 'row', padding: 4, marginBottom: SPACING[4], borderRadius: RADIUS.lg, backgroundColor: SURFACES.card.primary, ...SHADOWS.md },
  rangeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  rangeButtonActive: { backgroundColor: HYDRATION.primary },
  rangeButtonText: { color: TEXT.secondary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  rangeButtonTextActive: { color: TEXT.white },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3], marginBottom: SPACING[4] },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 112, padding: SPACING[4], borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, backgroundColor: SURFACES.card.primary, ...SHADOWS.sm },
  metricIcon: { width: 32, height: 32, marginBottom: SPACING[2], borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HYDRATION.pale },
  metricValue: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  metricLabel: { marginTop: 3, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  staleNotice: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], padding: SPACING[3], marginBottom: SPACING[3], borderRadius: RADIUS.md, backgroundColor: '#FFF8E8' },
  staleNoticeText: { flex: 1, color: '#7A5200', fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  rangeEmptyCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], padding: SPACING[4], marginBottom: SPACING[4], borderRadius: RADIUS.lg, borderWidth: 1, borderColor: HYDRATION.border, backgroundColor: HYDRATION.pale },
  rangeEmptyIcon: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: TEXT.white },
  rangeEmptyCopy: { flex: 1 },
  rangeEmptyTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  rangeEmptyText: { marginTop: 3, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  rangeEmptyAction: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HYDRATION.primary },
  insightsCard: { marginBottom: SPACING[5], borderRadius: RADIUS.xl, borderWidth: 1, borderColor: HYDRATION.border, backgroundColor: SURFACES.card.primary, overflow: 'hidden', ...SHADOWS.sm },
  insightsHeader: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: SPACING[3], padding: SPACING[4], borderLeftWidth: 4, borderLeftColor: HYDRATION.primary },
  insightsIcon: { width: 42, height: 42, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HYDRATION.pale },
  insightsHeadingCopy: { flex: 1 },
  insightsEyebrow: { color: HYDRATION.primary, fontSize: 10, letterSpacing: 1.1, fontFamily: TYPOGRAPHY.family.bold },
  insightsTitle: { marginTop: 2, color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  insightsSubtitle: { marginTop: 2, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs },
  insightsBody: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[4], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  insightRow: { flexDirection: 'row', gap: SPACING[3], paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  insightRowIcon: { width: 34, height: 34, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HYDRATION.pale },
  insightRowCopy: { flex: 1 },
  insightRowTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  insightRowBody: { marginTop: 3, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  mixSection: { paddingTop: SPACING[4] },
  mixTitle: { marginBottom: SPACING[3], color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[3] },
  mixDot: { width: 9, height: 9, borderRadius: RADIUS.full },
  mixLabel: { width: 74, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  mixTrack: { flex: 1, height: 7, borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary, overflow: 'hidden' },
  mixFill: { height: '100%', borderRadius: RADIUS.full },
  mixValue: { width: 34, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, textAlign: 'right', fontFamily: TYPOGRAPHY.family.medium },
  tomorrowCard: { flexDirection: 'row', gap: SPACING[3], padding: SPACING[3], marginTop: SPACING[2], borderRadius: RADIUS.md, backgroundColor: HYDRATION.pale },
  tomorrowIcon: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: TEXT.white },
  tomorrowCopy: { flex: 1 },
  tomorrowLabel: { color: HYDRATION.primary, fontSize: 9, letterSpacing: 0.9, fontFamily: TYPOGRAPHY.family.bold },
  tomorrowValue: { marginTop: 2, color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  tomorrowText: { marginTop: 2, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs },
  patternDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2], marginTop: SPACING[3] },
  patternDisclaimerText: { flex: 1, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  sectionHeading: { marginBottom: SPACING[3] },
  eyebrow: { color: HYDRATION.primary, fontSize: 10, letterSpacing: 1.2, fontFamily: TYPOGRAPHY.family.bold },
  sectionTitle: { marginTop: 3, color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  trendCard: { padding: SPACING[4], marginBottom: SPACING[5], borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, backgroundColor: SURFACES.card.primary, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING[3], marginBottom: SPACING[4] },
  cardTitleBlock: { flex: 1 },
  cardTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.md, fontFamily: TYPOGRAPHY.family.semibold },
  cardSubtitle: { marginTop: 3, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs },
  headerPill: { paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], borderRadius: RADIUS.full, backgroundColor: HYDRATION.pale },
  headerPillText: { color: HYDRATION.primary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold },
  dayChart: { height: 178, flexDirection: 'row', alignItems: 'flex-end', gap: SPACING[2] },
  dayBarColumn: { flex: 1, alignItems: 'center' },
  dayBarValue: { marginBottom: SPACING[2], color: TEXT.secondary, fontSize: 10, fontFamily: TYPOGRAPHY.family.medium },
  dayBarArea: { height: 104, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  dayBar: { width: '62%', maxWidth: 42, borderRadius: RADIUS.md },
  dayBarLabel: { marginTop: SPACING[2], color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold },
  dayBarHours: { marginTop: 2, color: TEXT.muted, fontSize: 8, textAlign: 'center' },
  trendSummary: { flexDirection: 'row', alignItems: 'stretch', marginTop: SPACING[4], paddingTop: SPACING[4], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  trendSummaryItem: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING[1] },
  trendSummaryValue: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.bold, textAlign: 'center' },
  trendSummaryLabel: { marginTop: 3, color: TEXT.tertiary, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  trendDivider: { width: 1, backgroundColor: SURFACES.divider },
  evidenceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2], marginTop: SPACING[4], padding: SPACING[3], borderRadius: RADIUS.md, backgroundColor: SURFACES.background.tertiary },
  evidenceText: { flex: 1, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: SPACING[3] },
  sectionCount: { color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  entriesCard: { borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, backgroundColor: SURFACES.card.primary, overflow: 'hidden', ...SHADOWS.sm },
  entryRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] },
  entryDivider: { borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  entryIcon: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  entryCopy: { flex: 1 },
  entryTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  entryTime: { marginTop: 3, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs },
  entryAdjustment: { marginTop: 3, color: HYDRATION.cyan, fontSize: 10, fontFamily: TYPOGRAPHY.family.medium },
  deleteButton: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F1' },
  showMoreButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  showMoreText: { color: HYDRATION.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  noEntriesCard: { padding: SPACING[5], borderRadius: RADIUS.lg, alignItems: 'center', backgroundColor: SURFACES.card.primary },
  noEntriesText: { color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.sm },
  stateCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: SPACING[6], borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, backgroundColor: SURFACES.card.primary, ...SHADOWS.sm },
  stateIcon: { width: 68, height: 68, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HYDRATION.pale },
  stateTitle: { marginTop: SPACING[4], color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold, textAlign: 'center' },
  stateBody: { marginTop: SPACING[2], color: TEXT.secondary, fontSize: TYPOGRAPHY.size.sm, lineHeight: 20, textAlign: 'center' },
  stateAction: { minWidth: 140, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: SPACING[5], paddingHorizontal: SPACING[5], borderRadius: RADIUS.lg, backgroundColor: HYDRATION.primary },
  stateActionText: { color: TEXT.white, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  analyticsLoadingText: { marginTop: SPACING[3], color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, textAlign: 'center' },
});
