/**
 * Activity Recovery Screen
 *
 * Shows a computed recovery score (sleep/stress/prior-activity/hydration/mood
 * weighted), a recommended strain target for today, and the top personalized
 * activity recommendation — all from the existing (previously unused by the
 * app) activity intelligence engine.
 *
 * Wired to GET /api/activity/intelligence.
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
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import apiClient from '../../services/apiClient';

const FACTOR_LABELS = {
  sleep: 'Sleep',
  stress: 'Stress',
  activity_load: 'Prior Activity',
  hydration: 'Hydration',
  mood: 'Mood',
};

const IMPACT_COLOR = {
  positive: '#10B981',
  neutral: '#F59E0B',
  negative: '#EF4444',
  caution: '#F59E0B',
  unknown: TEXT.tertiary,
};

export default function ActivityRecoveryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['activityIntelligence'],
    queryFn: () => apiClient.get('/activity/intelligence'),
    staleTime: 5 * 60 * 1000,
  });

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

  const handleLogWorkout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/activity');
  }, [router]);

  const recovery = data?.recovery;
  const strainTarget = data?.strainTarget;
  const topRecommendation = data?.recommendations?.[0];
  const weeklyInsights = data?.weeklyInsights || [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Recovery',
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
          <Text style={styles.centerText}>Calculating your recovery...</Text>
        </View>
      ) : isError || !recovery ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Unable to load recovery data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} disabled={isRefetching}>
            <Text style={styles.retryText}>{isRefetching ? 'Retrying...' : 'Retry'}</Text>
          </TouchableOpacity>
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
          {/* Recovery score */}
          <View style={[styles.card, styles.scoreCard]}>
            <View style={[styles.scoreRing, { borderColor: recovery.color }]}>
              <Text style={[styles.scoreValue, { color: recovery.color }]}>{recovery.score}</Text>
            </View>
            <Text style={styles.scoreLabel}>{recovery.label} Recovery</Text>
            {strainTarget && (
              <Text style={styles.strainText}>
                Today's target strain: {strainTarget.target} ({strainTarget.zone})
              </Text>
            )}
          </View>

          {/* Factor breakdown */}
          {recovery.factors?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="pulse-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>What's Affecting Your Recovery</Text>
              </View>
              <View style={styles.factorList}>
                {recovery.factors.map((factor) => (
                  <View key={factor.factor} style={styles.factorRow}>
                    <View
                      style={[
                        styles.factorDot,
                        { backgroundColor: IMPACT_COLOR[factor.impact] || TEXT.tertiary },
                      ]}
                    />
                    <View style={styles.factorInfo}>
                      <Text style={styles.factorLabel}>
                        {FACTOR_LABELS[factor.factor] || factor.factor}
                      </Text>
                      <Text style={styles.factorDetail}>{factor.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top recommendation */}
          {topRecommendation && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="fitness-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Recommended for Today</Text>
              </View>
              <Text style={styles.recName}>{topRecommendation.name || topRecommendation.label}</Text>
              {topRecommendation.reasons?.length > 0 && (
                <Text style={styles.recReason}>{topRecommendation.reasons[0]}</Text>
              )}
              <View style={styles.recStatsRow}>
                {topRecommendation.duration && (
                  <Text style={styles.recStat}>{topRecommendation.duration} min</Text>
                )}
                {topRecommendation.intensity && (
                  <Text style={styles.recStat}>{topRecommendation.intensity} intensity</Text>
                )}
                {topRecommendation.calories && (
                  <Text style={styles.recStat}>~{topRecommendation.calories} kcal</Text>
                )}
              </View>
              <TouchableOpacity style={styles.logButton} onPress={handleLogWorkout}>
                <Text style={styles.logButtonText}>Log This Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weekly insights */}
          {weeklyInsights.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>This Week</Text>
              </View>
              {weeklyInsights.map((insight, idx) => (
                <View key={idx} style={styles.insightRow}>
                  <Ionicons name={insight.icon || 'information-circle'} size={18} color={insight.color || BRAND.primary} />
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                  </View>
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
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: BRAND.primary,
    borderRadius: 12,
  },
  retryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  scoreCard: {
    alignItems: 'center',
  },
  scoreRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  strainText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
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
  factorList: {
    gap: SPACING[3],
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  factorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  factorInfo: {
    flex: 1,
  },
  factorLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  factorDetail: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  recName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  recReason: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
  },
  recStatsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  recStat: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  logButton: {
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  insightInfo: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  insightMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
