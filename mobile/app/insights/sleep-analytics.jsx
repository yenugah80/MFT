/**
 * Sleep Analytics Screen
 *
 * Deep-dive on sleep trends: average duration/quality, bedtime consistency,
 * and which context tags (caffeine, alcohol, screen time, etc.) correlate
 * with better or worse sleep quality.
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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import { useSleepLog, SLEEP_CONTEXT_TAGS } from '../../hooks/useSleepLog';

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
  const { trends, isTrendsLoading, refetchTrends } = useSleepLog();
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sleep Analytics',
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
          <Text style={styles.centerText}>Loading your sleep analytics...</Text>
        </View>
      ) : !trends ? (
        <View style={styles.centerContainer}>
          <Ionicons name="moon-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Not enough data yet</Text>
          <Text style={styles.centerText}>
            Log at least 3 nights of sleep to unlock trends and quality insights.
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
          {/* Summary stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{trends.avgDurationHours}h</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{trends.avgQuality}/10</Text>
              <Text style={styles.statLabel}>Avg Quality</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{trends.consistencyScore}%</Text>
              <Text style={styles.statLabel}>Consistency</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bed-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>Bedtime Pattern</Text>
            </View>
            <Text style={styles.bedTimeValue}>{formatBedTime(trends.avgBedTime)}</Text>
            <Text style={styles.bedTimeSubtext}>Average bedtime over {trends.daysTracked} nights tracked</Text>
          </View>

          {tagImpactEntries.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="analytics-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>What Affects Your Sleep</Text>
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
                Compares average quality on nights with vs. without each tag.
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
  bedTimeValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  bedTimeSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
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
