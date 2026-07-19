/**
 * Hydration & Energy Screen
 *
 * Deep-dive on hydration patterns and how they relate to energy/focus:
 * daily average vs. goal, when you drink during the day, your hydration
 * "persona", and tomorrow's predicted need.
 *
 * Wired to GET /api/hydration/analytics/dashboard via useHydrationAnalytics().
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
import { useHydrationAnalytics } from '../../hooks/useHydrationAnalytics';

const PERIOD_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

function formatHour(hour) {
  if (hour === undefined || hour === null) return '--';
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${period}`;
}

export default function HydrationCognitionScreen() {
  const router = useRouter();
  const { analytics, isLoading, refetch } = useHydrationAnalytics();
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
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const patterns = analytics?.patterns;
  const persona = analytics?.persona?.persona;
  const prediction = analytics?.prediction;
  const hasBasicData = !!patterns;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Hydration & Energy',
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

      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.centerText}>Loading your hydration insights...</Text>
        </View>
      ) : !hasBasicData ? (
        <View style={styles.centerContainer}>
          <Ionicons name="water-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Not enough data yet</Text>
          <Text style={styles.centerText}>
            Log your water intake for a few days to see how hydration tracks with your energy and focus.
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
              <Text style={styles.statValue}>{(patterns.avgMl / 1000).toFixed(1)}L</Text>
              <Text style={styles.statLabel}>Daily Avg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{patterns.avgPercentage}%</Text>
              <Text style={styles.statLabel}>Of Goal</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{patterns.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Persona */}
          {persona && (
            <View style={styles.card}>
              <View style={styles.personaHeader}>
                <View style={styles.personaIconBg}>
                  <Ionicons name={persona.icon || 'water'} size={28} color={BRAND.primary} />
                </View>
                <View style={styles.personaInfo}>
                  <Text style={styles.personaTitle}>{persona.title}</Text>
                  <Text style={styles.personaDescription}>{persona.description}</Text>
                </View>
              </View>
              <View style={styles.recommendationBadge}>
                <Ionicons name="bulb" size={14} color={BRAND.primary} />
                <Text style={styles.recommendationText}>{persona.recommendation}</Text>
              </View>
            </View>
          )}

          {/* When you drink */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>When You Hydrate</Text>
            </View>
            <View style={styles.periodRow}>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => {
                const pct = Math.round((patterns.periodDistribution?.[key] || 0) * 100);
                return (
                  <View key={key} style={styles.periodItem}>
                    <View style={styles.periodBarTrack}>
                      <View style={[styles.periodBarFill, { height: `${Math.max(pct, 4)}%` }]} />
                    </View>
                    <Text style={styles.periodPct}>{pct}%</Text>
                    <Text style={styles.periodLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.peakHourText}>
              Peak hydration hour: {formatHour(patterns.peakHour)}
            </Text>
            {patterns.coffeeToWaterRatio > 0.3 && (
              <View style={styles.caffeineNote}>
                <Ionicons name="cafe-outline" size={16} color="#F59E0B" />
                <Text style={styles.caffeineNoteText}>
                  Your caffeine intake is high relative to water — this can affect focus later in the day.
                </Text>
              </View>
            )}
          </View>

          {/* Tomorrow's prediction */}
          {prediction?.hasPrediction && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Tomorrow's Target</Text>
              </View>
              <Text style={styles.predictionValue}>{prediction.predictedNeedLiters}L</Text>
              {prediction.factors?.map((factor) => (
                <View key={factor.type} style={styles.factorRow}>
                  <Ionicons name="chevron-forward" size={14} color={TEXT.tertiary} />
                  <Text style={styles.factorText}>{factor.description}</Text>
                </View>
              ))}
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
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  personaIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaInfo: {
    flex: 1,
  },
  personaTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  personaDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: `${BRAND.primary}10`,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  recommendationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: SPACING[3],
  },
  periodItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  periodBarTrack: {
    width: 32,
    height: 60,
    borderRadius: 8,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  periodBarFill: {
    width: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 8,
  },
  periodPct: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  periodLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  peakHourText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  caffeineNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SPACING[3],
    backgroundColor: '#F59E0B15',
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  caffeineNoteText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  predictionValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  factorText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  bottomPadding: {
    height: 40,
  },
});
