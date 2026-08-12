/**
 * Activity Insights Screen
 *
 * Deep-dive analytics for activity: weekly goal progress, category breakdown,
 * 7-day trend, top exercises, and personalized recommendations.
 *
 * Wired to GET /api/activity/history (90-day window) via useActivityLog().fetchHistory.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND } from '../../constants/premiumTheme';
import { useActivityLog, ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import { useMoodInsights } from '../../hooks/useMoodInsights';
import apiClient from '../../services/apiClient';
import ActivityInsightsView from '../../components/ActivityInsightsView';
import { isOpenAIConsentError } from '../../constants/apiCodes';

// activityAnalytics.js (consumed by ActivityInsightsView) expects
// { timestamp, calories, duration, category, name } — the API returns
// { loggedAt, caloriesBurned, durationMinutes, type }. Adapt here rather than
// changing the shared analytics util or the API contract.
const TYPE_TO_CATEGORY = {
  running: 'Cardio',
  cycling: 'Cardio',
  walking: 'Cardio',
  swimming: 'Cardio',
  hiking: 'Cardio',
  dancing: 'Cardio',
  hiit: 'Cardio',
  cardio: 'Cardio',
  gym: 'Strength',
  strength: 'Strength',
  yoga: 'Flexibility',
  flexibility: 'Flexibility',
  sports: 'Sports',
  general: 'Other',
};

function adaptActivity(row) {
  const typeInfo = ACTIVITY_TYPES.find((t) => t.key === row.type);
  return {
    ...row,
    timestamp: row.loggedAt,
    calories: row.caloriesBurned || 0,
    duration: row.durationMinutes || 0,
    category: TYPE_TO_CATEGORY[row.type] || 'Other',
    name: typeInfo?.label || 'Activity',
  };
}

const CHART_WIDTH = Dimensions.get('window').width - 32 * 2 - 16;

export default function ActivityInsightsScreen() {
  const router = useRouter();
  const { fetchHistory, weeklyProgress, deleteActivity, isDeleting } = useActivityLog();
  // Per-day mood ratings for the movement/mood comparison
  const { data: moodData } = useMoodInsights({ windowDays: 30, trendDays: 30 });

  // The backend engine ranks activities using recovery, strain, timing and
  // fitness level — signals the client rule cannot see. Shared cache key with
  // the Recovery screen, so both read one answer rather than computing two.
  const { data: intelligence } = useQuery({
    queryKey: ['activityIntelligence'],
    queryFn: () => apiClient.get('/activity/intelligence'),
    staleTime: 5 * 60 * 1000,
  });

  // Stored daily scores for the readiness trend. Runs after the intelligence
  // call so today's snapshot exists by the time this reads it.
  const { data: recoveryHistory } = useQuery({
    queryKey: ['recoveryHistory', 30],
    queryFn: () => apiClient.get('/activity/recovery-history', { params: { days: 30 } }),
    enabled: !!intelligence,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['activityHistory', 'insights', 90],
    queryFn: () => fetchHistory({ days: 90, limit: 200 }),
    staleTime: 60000,
  });

  const activities = useMemo(
    () => (data?.activities || []).map(adaptActivity),
    [data]
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleDeleteActivity = useCallback(async (activityId) => {
    try {
      // deleteActivity invalidates ['activityHistory'], so this list refreshes
      await deleteActivity(activityId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[ActivityInsights] delete failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [deleteActivity]);


  // On demand only: this costs a model call and sends data to a third party
  const smartInsights = useMutation({
    mutationFn: () => apiClient.post('/activity/insights', { days: 30 }),
  });

  // Was comparing against 'OPENAI_CONSENT_REQUIRED'; the server sends
  // 'openai_consent_required', so that branch never matched and only the bare
  // 403 fallback carried it — which also mislabelled any other 403 as a consent
  // problem. POST /activity/insights has no other 403, so match the code alone.
  const consentRequired = isOpenAIConsentError(smartInsights.error);

  const handleGiveConsent = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/profile/privacy');
  }, [router]);

  const handleLogSignal = useCallback(() => {
    Haptics.selectionAsync();
    // Sleep and stress carry 65% of the recovery score between them
    router.push('/(tabs)/dashboard');
  }, [router]);

  const handleLogWorkout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/activity');
  }, [router]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);


  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Activity Insights',
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

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.centerText}>Loading your activity insights...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Unable to load activity data</Text>
          <Text style={styles.centerText}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={isRefetching}>
            <Text style={styles.retryText}>{isRefetching ? 'Retrying...' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ActivityInsightsView
          activities={activities}
          onLogWorkout={handleLogWorkout}
          targetMinutes={weeklyProgress?.target}
          moodTrend={moodData?.trendData}
          backendRecommendation={intelligence?.recommendations?.[0]}
          recovery={intelligence?.recovery}
          strainTarget={intelligence?.strainTarget}
          recoveryHistory={recoveryHistory}
          chartWidth={CHART_WIDTH}
          onLogSignal={handleLogSignal}
          smartInsights={{
            insights: smartInsights.data?.insights,
            message: smartInsights.data?.message,
            dataPoints: smartInsights.data?.dataPoints,
            minDataRequired: smartInsights.data?.minDataRequired,
            needsConsent: consentRequired,
            isLoading: smartInsights.isPending,
            error:
              smartInsights.isError && !consentRequired
                ? 'Could not generate insights just now.'
                : null,
            onGenerate: () => smartInsights.mutate(),
            onGiveConsent: handleGiveConsent,
          }}
          onDeleteActivity={handleDeleteActivity}
          isDeleting={isDeleting}
        />
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
});
