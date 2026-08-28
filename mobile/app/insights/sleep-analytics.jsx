/**
 * Sleep Patterns Screen
 *
 * Deep-dive on sleep patterns: schedule, quality trend, weekday rhythm,
 * duration balance, and context associations.
 *
 * Wired to GET /api/sleep/trends?days=30 via useSleepLog().trends.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import { useSleepLog, SLEEP_CONTEXT_TAGS } from '../../hooks/useSleepLog';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TREND_META = {
  improving: { label: 'Improving', color: '#10B981', icon: 'trending-up' },
  declining: { label: 'Declining', color: '#EF4444', icon: 'trending-down' },
  stable: { label: 'Stable', color: TEXT.tertiary, icon: 'remove' },
};

function qualityColor(value) {
  if (value >= 7) return '#10B981';
  if (value >= 5) return '#F59E0B';
  return '#EF4444';
}

function formatBedTime(avgBedTime) {
  // avgBedTime is "H:MM" in 24h, minutes since midnight-relative average
  if (!avgBedTime) return '--';
  const [hStr, mStr] = avgBedTime.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

function tagLabel(key) {
  return SLEEP_CONTEXT_TAGS.find((t) => t.key === key)?.label || key;
}

export default function SleepAnalyticsScreen() {
  const router = useRouter();
  const { days } = useLocalSearchParams();
  const requestedDays = Number(Array.isArray(days) ? days[0] : days);
  const rangeDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const expandedRange = rangeDays < 30 ? 30 : (rangeDays < 90 ? 90 : null);
  const { trends, isTrendsLoading, trendsError, refetchTrends } = useSleepLog(rangeDays);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetchTrends();
    } finally {
      setRefreshing(false);
    }
  }, [refetchTrends]);

  const tagImpactEntries = trends?.tagImpact
    ? Object.entries(trends.tagImpact).sort((a, b) => Math.abs(b[1].impact) - Math.abs(a[1].impact))
    : [];
  const trendMeta = trends?.trend ? (TREND_META[trends.trend.direction] || TREND_META.stable) : TREND_META.stable;
  const durationBuckets = trends?.durationBuckets ? Object.entries(trends.durationBuckets) : [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sleep Patterns',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTintColor: TEXT.primary,
          headerTitleStyle: {
            fontFamily: TYPOGRAPHY.family.semibold,
            fontSize: TYPOGRAPHY.size.lg,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {isTrendsLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.centerText}>Loading your sleep patterns...</Text>
        </View>
      ) : trendsError ? (
        <View style={styles.centerContainer} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Sleep patterns are unavailable</Text>
          <Text style={styles.centerText}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetchTrends} accessibilityRole="button">
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : !trends ? (
        <View style={styles.centerContainer}>
          <Ionicons name="moon-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Not enough data in this {rangeDays}-day view</Text>
          <Text style={styles.centerText}>
            This range needs at least 3 nights of sleep to calculate reliable trends.
          </Text>
          {!!expandedRange && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace(`/insights/sleep-analytics?days=${expandedRange}`)}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>View {expandedRange} days</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />
          }
        >
          {/* Overall + trend — mirrors the evidence hierarchy in Stress Patterns. */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: qualityColor(trends.avgQuality) }]}>{trends.avgQuality}</Text>
              <Text style={styles.statLabel}>Avg Quality</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.trendRow}>
                <Ionicons name={trendMeta.icon} size={20} color={trendMeta.color} />
                <Text style={[styles.trendValue, { color: trendMeta.color }]}>{trendMeta.label}</Text>
              </View>
              <Text style={styles.statLabel}>Recent Trend</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{trends.daysTracked}</Text>
              <Text style={styles.statLabel}>Nights</Text>
            </View>
          </View>
          <Text style={styles.evidenceText}>Based on {trends.daysTracked} nights in this {rangeDays}-day view.</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bed-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>Sleep Schedule</Text>
            </View>
            <View style={styles.scheduleGrid}>
              <View style={styles.scheduleMetric}>
                <Text style={styles.scheduleLabel}>BEDTIME</Text>
                <Text style={styles.scheduleValue}>{formatBedTime(trends.avgBedTime)}</Text>
              </View>
              <View style={styles.scheduleMetric}>
                <Text style={styles.scheduleLabel}>WAKE TIME</Text>
                <Text style={styles.scheduleValue}>{formatBedTime(trends.avgWakeTime)}</Text>
              </View>
              <View style={styles.scheduleMetric}>
                <Text style={styles.scheduleLabel}>DURATION</Text>
                <Text style={styles.scheduleValue}>{trends.avgDurationHours}h</Text>
              </View>
              <View style={styles.scheduleMetric}>
                <Text style={styles.scheduleLabel}>CONSISTENCY</Text>
                <Text style={styles.scheduleValue}>{trends.consistencyScore}%</Text>
              </View>
            </View>
          </View>

          {Object.keys(trends.dayOfWeek || {}).length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Weekly Rhythm</Text>
              </View>
              <View style={styles.barList}>
                {DAY_ORDER.filter((day) => trends.dayOfWeek[day]).map((day) => {
                  const data = trends.dayOfWeek[day];
                  return (
                    <View key={day} style={styles.barRow}>
                      <Text style={styles.barLabel}>{day.slice(0, 3)}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${data.avgQuality * 10}%`, backgroundColor: qualityColor(data.avgQuality) }]} />
                      </View>
                      <View style={styles.dayValueGroup}>
                        <Text style={styles.barValue}>{data.avgQuality}</Text>
                        <Text style={styles.dayDuration}>{data.avgDurationHours}h</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.cardFootnote}>Bar = average quality · hours shown at right</Text>
            </View>
          )}

          {!!durationBuckets.length && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="hourglass-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Duration Balance</Text>
              </View>
              <View style={styles.bucketRow}>
                {durationBuckets.map(([key, bucket]) => (
                  <View key={key} style={[styles.bucketCard, key === 'goal' && styles.bucketCardGoal]}>
                    <Text style={[styles.bucketCount, key === 'goal' && styles.bucketCountGoal]}>{bucket.count}</Text>
                    <Text style={styles.bucketLabel}>{bucket.label}</Text>
                    <Text style={styles.bucketPercent}>{bucket.percentage}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tagImpactEntries.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="analytics-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Sleep Quality Associations</Text>
              </View>
              <View style={styles.tagList}>
                {tagImpactEntries.map(([tag, data]) => {
                  const isPositive = data.impact > 0;
                  const isNeutral = data.impact === 0;
                  const color = isNeutral ? TEXT.tertiary : isPositive ? '#10B981' : '#EF4444';
                  return (
                    <View key={tag} style={styles.tagRow}>
                      <View style={styles.tagLeft}>
                        <Ionicons
                          name={isNeutral ? 'remove' : isPositive ? 'trending-up' : 'trending-down'}
                          size={16}
                          color={color}
                        />
                        <Text style={styles.tagLabel}>{tagLabel(tag)}</Text>
                      </View>
                      <Text style={[styles.tagImpact, { color }]}>
                        {isPositive ? '+' : ''}{data.impact} pts ({data.occurrences}x)
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.tagDisclaimer}>
                Compares nights with vs. without each tag. These are observational signals, not proof of cause.
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  retryButton: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: BRAND.primary,
  },
  retryButtonText: {
    color: TEXT.white,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontSize: TYPOGRAPHY.size.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  evidenceText: {
    marginBottom: SPACING[4],
    color: TEXT.tertiary,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    textAlign: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING[3],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  scheduleMetric: {
    width: '48%',
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.secondary,
  },
  scheduleLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  scheduleValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  barList: {
    gap: SPACING[2],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  barLabel: {
    width: 32,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    minWidth: 4,
    borderRadius: 4,
  },
  dayValueGroup: {
    width: 64,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  dayDuration: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  cardFootnote: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    marginTop: SPACING[3],
  },
  bucketRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  bucketCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bucketCardGoal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bucketCount: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  bucketCountGoal: {
    color: '#059669',
  },
  bucketLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginTop: 2,
  },
  bucketPercent: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  tagList: {
    gap: SPACING[2],
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  tagImpact: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  tagDisclaimer: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    marginTop: SPACING[2],
  },
  bottomPadding: {
    height: 40,
  },
});
