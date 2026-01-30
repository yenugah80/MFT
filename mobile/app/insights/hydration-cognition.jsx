/**
 * Hydration Insights Screen
 *
 * Simple view: Your hydration status, trend, and recommendations
 * No research, no explanations - just what you need to know
 */

import React, { useState, useMemo, useCallback } from 'react';
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

import HydrationCognitionCard from '../../components/analytics/HydrationCognitionCard';

import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useWaterLog } from '../../hooks/useWaterLog';

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

// Target: 8-12 glasses (2000-3000ml)
const TARGET_MIN = 2000;
const TARGET_MAX = 3000;

export default function HydrationCognitionScreen() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const { logs: waterLogs, isLoading: waterLoading, error: waterError, refetch: refetchWater } = useWaterLog();
  const { data: moodData, isLoading: moodLoading, error: moodError, refetch: refetchMood } = useMoodTrends({ days: timeRange });
  const moodLogs = moodData?.data || [];

  const isLoading = waterLoading || moodLoading;
  const error = waterError || moodError;

  // Calculate average hydration
  const avgHydration = useMemo(() => {
    if (!waterLogs.length) return 0;
    const recent = waterLogs.slice(-7);
    return Math.round(recent.reduce((sum, log) => sum + (log.amount || 0), 0) / recent.length);
  }, [waterLogs]);

  // Simple status
  const status = useMemo(() => {
    if (avgHydration === 0) return { text: 'Start Tracking', color: TEXT.tertiary, icon: 'water-outline' };
    if (avgHydration < TARGET_MIN) return { text: 'Drink More', color: SEMANTIC.warning.base, icon: 'arrow-up' };
    if (avgHydration > TARGET_MAX) return { text: 'Maybe Ease Up', color: SEMANTIC.info.base, icon: 'arrow-down' };
    return { text: 'On Track!', color: SEMANTIC.success.base, icon: 'checkmark-circle' };
  }, [avgHydration]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchWater?.(), refetchMood?.()]);
    setRefreshing(false);
  }, [refetchWater, refetchMood]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/insights');
    }
  }, [router]);

  // Loading state
  if (isLoading && !waterLogs.length) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Hydration',
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
        <ActivityIndicator size="large" color={VIBRANT_WELLNESS.hydration.solid} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error && !waterLogs.length) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Hydration',
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
          title: 'Hydration',
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
            tintColor={VIBRANT_WELLNESS.hydration.solid}
            colors={[VIBRANT_WELLNESS.hydration.solid]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={32} color={status.color} />
          </View>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          <Text style={styles.avgText}>
            {avgHydration > 0 ? `${avgHydration} ml/day average` : 'Log water to see your average'}
          </Text>
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target:</Text>
            <Text style={styles.targetValue}>{TARGET_MIN}-{TARGET_MAX} ml/day</Text>
          </View>
        </View>

        {/* Correlation Card - shows how hydration affects mood */}
        <HydrationCognitionCard waterLogs={waterLogs} moodLogs={moodLogs} compact={false} />

        {/* Simple Recommendation */}
        {avgHydration > 0 && avgHydration < TARGET_MIN && (
          <View style={[styles.tipCard, { borderLeftColor: SEMANTIC.warning.base }]}>
            <Ionicons name="water" size={24} color={SEMANTIC.warning.base} />
            <Text style={styles.tipText}>
              Try adding {Math.round((TARGET_MIN - avgHydration) / 250)} more glasses to reach your goal
            </Text>
          </View>
        )}

        {avgHydration >= TARGET_MIN && avgHydration <= TARGET_MAX && (
          <View style={[styles.tipCard, { borderLeftColor: SEMANTIC.success.base }]}>
            <Ionicons name="checkmark-circle" size={24} color={SEMANTIC.success.base} />
            <Text style={styles.tipText}>Great job staying hydrated! Keep it up.</Text>
          </View>
        )}
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
    backgroundColor: VIBRANT_WELLNESS.hydration.solid,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: TEXT.white,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Status Card
  statusCard: {
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[6],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: SPACING[3],
    ...SHADOWS.md,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  avgText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  targetRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[1],
  },
  targetLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  targetValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
    borderLeftWidth: 4,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
});
