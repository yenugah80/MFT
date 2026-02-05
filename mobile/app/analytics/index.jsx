/**
 * Analytics Screen - Your Progress Dashboard
 *
 * Clean, detailed progress viewing with:
 * - Domain-specific analytics (Nutrition, Mood, Activity, Hydration)
 * - Weekly/Monthly trends
 * - Graceful degradation when data is unavailable
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAnalytics } from '../../hooks/useAnalytics';

// Import domain-specific analytics tabs
import NutritionTab from '../../components/analytics/NutritionTab';
import MoodTab from '../../components/analytics/MoodTab';
import ActivityTab from '../../components/analytics/ActivityTab';
import HydrationTab from '../../components/analytics/HydrationTab';
import WellnessTab from '../../components/analytics/WellnessTab';
import AnalyticsTabBar from '../../components/analytics/AnalyticsTabBar';

import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
} from '../../constants/premiumTheme';

// Period options for time filtering
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const [activeDomain, setActiveDomain] = useState('nutrition');
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week');

  // Single analytics hook - graceful degradation built-in
  const {
    nutrition,
    mood,
    activity,
    hydration,
    wellness,
    recommendations,
    isLoading,
    refetch,
    queries,
  } = useAnalytics(period);

  // Check if we have any data to show (don't require all queries to complete)
  const hasAnyData = useMemo(() => {
    return nutrition || mood || activity || hydration || wellness;
  }, [nutrition, mood, activity, hydration, wellness]);

  // Check for errors
  const hasErrors = useMemo(() => {
    return Object.values(queries || {}).some(q => q?.isError);
  }, [queries]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleDomainChange = useCallback((domain) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDomain(domain);
  }, []);

  const handlePeriodChange = useCallback((newPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Silently handle refresh errors
    }
    setRefreshing(false);
  }, [refetch]);

  // Render domain-specific content with graceful fallbacks
  const renderDomainContent = () => {
    const commonProps = {
      period,
      onRefresh,
      refreshing,
    };

    switch (activeDomain) {
      case 'wellness':
        return (
          <WellnessTab
            data={wellness}
            recommendations={recommendations?.wellness || []}
            stats={recommendations?.stats}
            {...commonProps}
          />
        );
      case 'nutrition':
        return (
          <NutritionTab
            data={nutrition}
            recommendations={recommendations?.nutrition || []}
            {...commonProps}
          />
        );
      case 'mood':
        return (
          <MoodTab
            data={mood}
            recommendations={recommendations?.mood || []}
            {...commonProps}
          />
        );
      case 'activity':
        return (
          <ActivityTab
            data={activity}
            recommendations={recommendations?.activity || []}
            {...commonProps}
          />
        );
      case 'hydration':
        return (
          <HydrationTab
            data={hydration}
            recommendations={recommendations?.hydration || []}
            {...commonProps}
          />
        );
      default:
        return (
          <NutritionTab
            data={nutrition}
            recommendations={recommendations?.nutrition || []}
            {...commonProps}
          />
        );
    }
  };

  // Show loading only on initial load (not during refresh, not if we have data)
  const showLoading = isLoading && !refreshing && !hasAnyData;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={TEXT.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Progress</Text>
        <View style={styles.periodPicker}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
              onPress={() => handlePeriodChange(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Domain Tab Bar */}
      <AnalyticsTabBar selected={activeDomain} onSelect={handleDomainChange} />

      {/* Content - Each tab has its own ScrollView */}
      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      ) : hasErrors && !hasAnyData ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Unable to load data</Text>
          <Text style={styles.errorText}>Pull down to try again</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {renderDomainContent()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: SURFACES.background.tertiary,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: 'center',
    marginHorizontal: SPACING[3],
  },
  periodPicker: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1.5],
    borderRadius: RADIUS.sm,
  },
  periodButtonActive: {
    backgroundColor: SURFACES.card.primary,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  periodTextActive: {
    color: TEXT.primary,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[4],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[8],
    gap: SPACING[3],
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  retryButton: {
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.md,
  },
  retryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
});
