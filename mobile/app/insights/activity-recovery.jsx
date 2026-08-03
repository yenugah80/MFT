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
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import apiClient from '../../services/apiClient';
import { toDisplayText } from '../../utils/displayText';
import RecoveryHero from '../../components/activity/RecoveryHero';
import { SectionHeader } from '../../components/activity/layout';
import RecoveryTrendCard from '../../components/activity/RecoveryTrendCard';

const CHART_WIDTH = Dimensions.get('window').width - 32 * 2 - 16;

export default function ActivityRecoveryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['activityIntelligence'],
    queryFn: () => apiClient.get('/activity/intelligence'),
    staleTime: 5 * 60 * 1000,
  });

  // Stored daily scores. Fetched after the intelligence call so today's
  // snapshot has been written by the time this reads it.
  const { data: history } = useQuery({
    queryKey: ['recoveryHistory', 30],
    queryFn: () => apiClient.get('/activity/recovery-history', { params: { days: 30 } }),
    enabled: !!data,
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

  const handleLogSignal = useCallback(() => {
    Haptics.selectionAsync();
    // Sleep and stress carry 65% of the score between them
    router.push('/(tabs)/dashboard');
  }, [router]);

  const handlePlanSession = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/insights/activity-insights');
  }, [router]);


  const recovery = data?.recovery;
  const strainTarget = data?.strainTarget;
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
          <SectionHeader title="Today" />
          <RecoveryHero
            recovery={recovery}
            strainTarget={strainTarget}
            onLogSignal={handleLogSignal}
            onPlanSession={handlePlanSession}
          />

          <SectionHeader title="Trend" />
          <RecoveryTrendCard history={history} chartWidth={CHART_WIDTH} />

          <SectionHeader title="This week" />
          {/* Weekly insights */}
          {weeklyInsights.length > 0 && (
            <View style={styles.card}>
              {weeklyInsights.map((insight, idx) => (
                <View key={idx} style={styles.insightRow}>
                  <Ionicons name={insight.icon || 'information-circle'} size={18} color={insight.color || BRAND.primary} />
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>{toDisplayText(insight.title)}</Text>
                    <Text style={styles.insightMessage}>{toDisplayText(insight.message)}</Text>
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
