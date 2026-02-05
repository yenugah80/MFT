/**
 * Insights Index - Simplified Weekly/Monthly Summary
 *
 * Clean, Apple Health-inspired summary screen
 * Shows 4 metrics: Nutrition, Mood, Hydration, Activity
 * With weekly/monthly toggle and trend charts
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  BRAND,
} from '../../constants/premiumTheme';

import { useInsightsSummary } from '../../hooks/useInsightsSummary';
import InsightSummaryCard from '../../components/insights/InsightSummaryCard';

// Period options
const PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

/**
 * Period Toggle Component
 */
function PeriodToggle({ selected, onSelect }) {
  const handleSelect = (period) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(period);
  };

  return (
    <View style={styles.toggleContainer}>
      {PERIODS.map((period) => {
        const isActive = selected === period.key;
        return (
          <TouchableOpacity
            key={period.key}
            style={[styles.togglePill, isActive && styles.togglePillActive]}
            onPress={() => handleSelect(period.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, isActive && styles.toggleLabelActive]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Loading Skeleton
 */
function LoadingSkeleton() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={BRAND.primary} />
      <Text style={styles.loadingText}>Loading insights...</Text>
    </View>
  );
}

/**
 * Main Insights Screen
 */
export default function InsightsIndex() {
  const router = useRouter();
  const [period, setPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);

  const { nutrition, mood, hydration, activity, isLoading, refetch } = useInsightsSummary(period);

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

  const handlePeriodChange = useCallback((newPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Insights',
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Summary</Text>
          <Text style={styles.headerSubtitle}>
            {period === 'week' ? 'Last 7 days' : 'Last 30 days'} overview
          </Text>
        </View>

        {/* Period Toggle */}
        <View style={styles.toggleWrapper}>
          <PeriodToggle selected={period} onSelect={handlePeriodChange} />
        </View>

        {/* Content */}
        {isLoading && !refreshing ? (
          <LoadingSkeleton />
        ) : (
          <View style={styles.cardsContainer}>
            {/* Nutrition Card */}
            <InsightSummaryCard
              metric="nutrition"
              data={nutrition}
              period={period}
            />

            {/* Mood Card */}
            <InsightSummaryCard
              metric="mood"
              data={mood}
              period={period}
            />

            {/* Hydration Card */}
            <InsightSummaryCard
              metric="hydration"
              data={hydration}
              period={period}
            />

            {/* Activity Card */}
            <InsightSummaryCard
              metric="activity"
              data={activity}
              period={period}
            />
          </View>
        )}

        {/* Footer Disclaimer */}
        <View style={styles.footer}>
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={16} color={TEXT.muted} />
            <Text style={styles.disclaimerText}>
              MyFoodTracker provides wellness insights for informational purposes only.
              Not intended as medical advice. Consult a healthcare professional for
              health decisions.
            </Text>
          </View>
          <Text style={styles.footerText}>
            Insights improve with more logged data
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING[10],
  },
  headerButton: {
    padding: SPACING[2],
  },

  // Header
  header: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },

  // Toggle
  toggleWrapper: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[1],
    gap: SPACING[1],
  },
  togglePill: {
    flex: 1,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  togglePillActive: {
    backgroundColor: SURFACES.card.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  toggleLabelActive: {
    color: TEXT.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Cards
  cardsContainer: {
    paddingTop: SPACING[2],
  },

  // Loading
  loadingContainer: {
    paddingVertical: SPACING[10],
    alignItems: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  disclaimerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    lineHeight: 16,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    textAlign: 'center',
  },
});
