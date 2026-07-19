/**
 * Stress Patterns Screen
 *
 * Deep-dive on stress patterns: time-of-day and day-of-week breakdowns,
 * which coping strategies are actually working, and the overall trend.
 *
 * Wired to GET /api/stress/patterns?days=30 via useStressLog().patterns.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import { useStressLog } from '../../hooks/useStressLog';

const TIME_PERIOD_ORDER = ['morning', 'afternoon', 'evening', 'night'];
const TIME_PERIOD_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function levelColor(avgLevel) {
  if (avgLevel <= 3) return '#10B981';
  if (avgLevel <= 6) return '#F59E0B';
  return '#EF4444';
}

const TREND_META = {
  improving: { label: 'Improving', color: '#10B981', icon: 'trending-down' },
  worsening: { label: 'Worsening', color: '#EF4444', icon: 'trending-up' },
  stable: { label: 'Stable', color: TEXT.tertiary, icon: 'remove' },
};

export default function StressPatternsScreen() {
  const router = useRouter();
  const { patterns, isPatternsLoading, refetchPatterns } = useStressLog();
  const [refreshing, setRefreshing] = useState(false);

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
      await refetchPatterns();
    } finally {
      setRefreshing(false);
    }
  }, [refetchPatterns]);

  const trendMeta = patterns?.trend ? (TREND_META[patterns.trend.direction] || TREND_META.stable) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Stress Patterns',
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

      {isPatternsLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.centerText}>Loading your stress patterns...</Text>
        </View>
      ) : !patterns ? (
        <View style={styles.centerContainer}>
          <Ionicons name="pulse-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Not enough data yet</Text>
          <Text style={styles.centerText}>
            Log at least 5 stress entries to unlock pattern analysis.
          </Text>
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
          {/* Overall + Trend */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: levelColor(patterns.overallAvg) }]}>
                {patterns.overallAvg}
              </Text>
              <Text style={styles.statLabel}>Avg Level</Text>
            </View>
            {trendMeta && (
              <View style={styles.statCard}>
                <View style={styles.trendRow}>
                  <Ionicons name={trendMeta.icon} size={20} color={trendMeta.color} />
                  <Text style={[styles.statValue, { color: trendMeta.color, fontSize: TYPOGRAPHY.size.base }]}>
                    {trendMeta.label}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Recent Trend</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{patterns.entriesCount}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
          </View>

          {/* Time of day */}
          {Object.keys(patterns.timeOfDay || {}).length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="time-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Time of Day</Text>
              </View>
              <View style={styles.barList}>
                {TIME_PERIOD_ORDER.filter((p) => patterns.timeOfDay[p]).map((period) => {
                  const d = patterns.timeOfDay[period];
                  return (
                    <View key={period} style={styles.barRow}>
                      <Text style={styles.barLabel}>{TIME_PERIOD_LABELS[period]}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(d.avgLevel / 10) * 100}%`, backgroundColor: levelColor(d.avgLevel) },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{d.avgLevel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Day of week */}
          {Object.keys(patterns.dayOfWeek || {}).length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Day of Week</Text>
              </View>
              <View style={styles.barList}>
                {DAY_ORDER.filter((day) => patterns.dayOfWeek[day]).map((day) => {
                  const d = patterns.dayOfWeek[day];
                  return (
                    <View key={day} style={styles.barRow}>
                      <Text style={styles.barLabel}>{day.slice(0, 3)}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(d.avgLevel / 10) * 100}%`, backgroundColor: levelColor(d.avgLevel) },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{d.avgLevel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Coping effectiveness */}
          {patterns.copingStrategies?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>What's Actually Helping</Text>
              </View>
              <View style={styles.copingList}>
                {patterns.copingStrategies.map((strategy) => {
                  const isHelping = strategy.effectiveness > 0;
                  return (
                    <View key={strategy.key} style={styles.copingRow}>
                      <View style={[styles.copingIconBg, { backgroundColor: `${strategy.color || BRAND.primary}20` }]}>
                        <Ionicons name={strategy.icon || 'checkmark'} size={18} color={strategy.color || BRAND.primary} />
                      </View>
                      <View style={styles.copingInfo}>
                        <Text style={styles.copingLabel}>{strategy.label}</Text>
                        <Text style={styles.copingMeta}>Used {strategy.timesUsed}x</Text>
                      </View>
                      <Text style={[styles.copingEffect, { color: isHelping ? '#10B981' : '#EF4444' }]}>
                        {isHelping ? '−' : '+'}{Math.abs(strategy.effectiveness)} pts
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.copingDisclaimer}>
                Negative = stress level tends to be lower when you use this strategy.
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
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
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
  barList: {
    gap: SPACING[2],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  barLabel: {
    width: 64,
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
    borderRadius: 4,
    minWidth: 4,
  },
  barValue: {
    width: 28,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  copingList: {
    gap: SPACING[3],
  },
  copingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  copingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copingInfo: {
    flex: 1,
  },
  copingLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  copingMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  copingEffect: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  copingDisclaimer: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    marginTop: SPACING[3],
  },
  bottomPadding: {
    height: 40,
  },
});
