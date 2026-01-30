/**
 * Health Analytics Dashboard
 *
 * Simple overview: See how your health factors connect
 * No research jargon - just your data and insights
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import FoodMoodCorrelationCard from '../../components/analytics/FoodMoodCorrelationCard';
import HydrationCognitionCard from '../../components/analytics/HydrationCognitionCard';
import ActivityMoodCard from '../../components/analytics/ActivityMoodCard';

import { useFoodLog } from '../../hooks/useFoodLog';
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

export default function MultiFactorAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Get data
  const { logs: rawFoodLogs, isLoading: foodLoading, refetch: refetchFood } = useFoodLog();
  const { data: moodData, isLoading: moodLoading, refetch: refetchMood } = useMoodTrends({ days: 30 });
  const { logs: rawWaterLogs, isLoading: waterLoading, refetch: refetchWater } = useWaterLog();

  // Ensure arrays are never undefined
  const foodLogs = rawFoodLogs || [];
  const waterLogs = rawWaterLogs || [];
  const moodLogs = moodData?.data || [];
  const isLoading = foodLoading || moodLoading || waterLoading;

  // Simple stats
  const stats = useMemo(() => ({
    daysTracked: Math.min(foodLogs.length, moodLogs.length, waterLogs.length),
    hasFoodData: foodLogs.length > 0,
    hasMoodData: moodLogs.length > 0,
    hasWaterData: waterLogs.length > 0,
  }), [foodLogs, moodLogs, waterLogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchFood?.(), refetchMood?.(), refetchWater?.()]);
    setRefreshing(false);
  }, [refetchFood, refetchMood, refetchWater]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/insights');
    }
  }, [router]);

  // Loading state
  if (isLoading && !foodLogs.length && !moodLogs.length && !waterLogs.length) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Health Analytics',
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
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading your insights...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Health Analytics',
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
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <LinearGradient
          colors={[BRAND.primary, BRAND.accent]}
          style={styles.summaryCard}
        >
          <View style={styles.summaryIcon}>
            <Ionicons name="analytics" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryTitle}>Your Health Overview</Text>
          <Text style={styles.summarySubtitle}>
            See how your habits connect and affect each other
          </Text>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{foodLogs.length}</Text>
              <Text style={styles.quickStatLabel}>Meals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{moodLogs.length}</Text>
              <Text style={styles.quickStatLabel}>Moods</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{waterLogs.length}</Text>
              <Text style={styles.quickStatLabel}>Days</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Correlation Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Things Connect</Text>

          {/* Food & Mood */}
          <TouchableOpacity
            style={styles.correlationCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/insights/food-mood-correlation');
            }}
            accessibilityLabel="Food and mood correlation"
            accessibilityRole="button"
          >
            <FoodMoodCorrelationCard
              foodLogs={foodLogs}
              moodLogs={moodLogs}
              waterLogs={waterLogs}
              compact={true}
            />
          </TouchableOpacity>

          {/* Hydration */}
          <TouchableOpacity
            style={styles.correlationCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/insights/hydration-cognition');
            }}
            accessibilityLabel="Hydration insights"
            accessibilityRole="button"
          >
            <HydrationCognitionCard
              waterLogs={waterLogs}
              moodLogs={moodLogs}
              compact={true}
            />
          </TouchableOpacity>

          {/* Activity */}
          <TouchableOpacity
            style={styles.correlationCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/insights/activity-mood');
            }}
            accessibilityLabel="Activity and mood"
            accessibilityRole="button"
          >
            <ActivityMoodCard
              activityLogs={[]}
              moodLogs={moodLogs}
              compact={true}
            />
          </TouchableOpacity>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>

          <View style={styles.comingSoonGrid}>
            <View style={styles.comingSoonCard}>
              <View style={[styles.comingSoonIcon, { backgroundColor: `${VIBRANT_WELLNESS.mood.solid}20` }]}>
                <Ionicons name="moon" size={24} color={VIBRANT_WELLNESS.mood.solid} />
              </View>
              <Text style={styles.comingSoonTitle}>Sleep Tracking</Text>
              <Text style={styles.comingSoonText}>See how sleep affects everything</Text>
            </View>

            <View style={styles.comingSoonCard}>
              <View style={[styles.comingSoonIcon, { backgroundColor: `${SEMANTIC.warning.base}20` }]}>
                <Ionicons name="pulse" size={24} color={SEMANTIC.warning.base} />
              </View>
              <Text style={styles.comingSoonTitle}>Stress Tracking</Text>
              <Text style={styles.comingSoonText}>Understand stress patterns</Text>
            </View>
          </View>
        </View>

        {/* Tip */}
        {stats.daysTracked < 7 && (
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color={BRAND.primary} />
            <Text style={styles.tipText}>
              Keep logging for a week to see more detailed patterns
            </Text>
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
    gap: SPACING[5],
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

  // Summary Card
  summaryCard: {
    padding: SPACING[6],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: SPACING[3],
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  summarySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING[1],
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Section
  section: {
    gap: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },

  // Correlation Card
  correlationCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },

  // Coming Soon
  comingSoonGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  comingSoonCard: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.sm,
  },
  comingSoonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: `${BRAND.primary}10`,
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
});
