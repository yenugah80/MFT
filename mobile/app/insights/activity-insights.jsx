/**
 * Activity Insights Screen
 *
 * Deep-dive analytics for activity: weekly goal progress, category breakdown,
 * 7-day trend, top exercises, and personalized recommendations.
 *
 * Wired to GET /api/activity/history (90-day window) via useActivityLog().fetchHistory.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND } from '../../constants/premiumTheme';
import { useActivityLog, ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import ActivityInsightsView from '../../components/ActivityInsightsView';

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

export default function ActivityInsightsScreen() {
  const router = useRouter();
  const { fetchHistory } = useActivityLog();

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

  const handleLogWorkout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/activity');
  }, [router]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleViewRecovery = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/activity-recovery');
  }, [router]);

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
          headerRight: () => (
            <TouchableOpacity
              onPress={handleViewRecovery}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="View recovery"
            >
              <Ionicons name="pulse-outline" size={22} color={TEXT.primary} />
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
        <ActivityInsightsView activities={activities} onLogWorkout={handleLogWorkout} />
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
