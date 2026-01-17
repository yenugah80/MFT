/**
 * Activity & Mood Screen
 *
 * Simple view: How your activity affects your mood
 * No research, no explanations - just your data and what it means
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ActivityMoodCard from '../../components/analytics/ActivityMoodCard';

import { useMoodTrends } from '../../hooks/useMoodTrends';

import {
  TEXT,
  BRAND,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

export default function ActivityMoodScreen() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const { data: moodData, isLoading, error, refetch } = useMoodTrends({ days: timeRange });
  const moodLogs = moodData?.data || [];

  // Activity logs placeholder (coming soon)
  const activityLogs = [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch?.();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/insights');
    }
  }, [router]);

  // Loading state
  if (isLoading && !moodData) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Activity & Mood',
            headerShown: true,
            headerStyle: { backgroundColor: SURFACES.background.primary },
            headerTintColor: TEXT.primary,
            headerLeft: () => (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <ActivityIndicator size="large" color={VIBRANT_WELLNESS.activity.solid} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error && !moodData) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Activity & Mood',
            headerShown: true,
            headerStyle: { backgroundColor: SURFACES.background.primary },
            headerTintColor: TEXT.primary,
            headerLeft: () => (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <Ionicons name="alert-circle-outline" size={48} color={SEMANTIC.danger.base} />
        <Text style={styles.errorText}>Couldn't load data</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRefresh}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Activity & Mood',
          headerShown: true,
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTintColor: TEXT.primary,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={VIBRANT_WELLNESS.activity.solid}
            colors={[VIBRANT_WELLNESS.activity.solid]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View
          style={styles.timeRangeContainer}
          accessibilityRole="tablist"
          accessibilityLabel="Select time range"
        >
          {[
            { days: 1, label: 'Today' },
            { days: 7, label: '7 Days' },
            { days: 30, label: '30 Days' },
          ].map(({ days, label }) => (
            <TouchableOpacity
              key={days}
              style={[styles.timeRangeButton, timeRange === days && styles.timeRangeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: timeRange === days }}
              accessibilityLabel={`${label} time range`}
            >
              <Text style={[styles.timeRangeText, timeRange === days && styles.timeRangeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Correlation Card */}
        <ActivityMoodCard activityLogs={activityLogs} moodLogs={moodLogs} compact={false} />

        {/* Coming Soon Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIcon}>
            <Ionicons name="fitness" size={32} color={VIBRANT_WELLNESS.activity.solid} />
          </View>
          <Text style={styles.comingSoonTitle}>Activity Tracking Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            Soon you'll be able to log your workouts and see how they affect your mood
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  content: {
    padding: SPACING[4],
    paddingBottom: SPACING[10],
    gap: SPACING[4],
  },
  centerContainer: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[6],
    gap: SPACING[3],
  },
  headerButton: {
    padding: SPACING[2],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  retryButton: {
    backgroundColor: VIBRANT_WELLNESS.activity.solid,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: TEXT.white,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[1],
    borderRadius: RADIUS.md,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: VIBRANT_WELLNESS.activity.solid,
  },
  timeRangeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  timeRangeTextActive: {
    color: TEXT.white,
  },

  // Coming Soon Card
  comingSoonCard: {
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[6],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: SPACING[3],
    ...SHADOWS.md,
  },
  comingSoonIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${VIBRANT_WELLNESS.activity.solid}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
