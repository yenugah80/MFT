/**
 * Analytics Screen - Your Progress Dashboard
 *
 * Clean, detailed progress viewing with:
 * - Domain-specific analytics (Nutrition, Mood, Activity, Hydration)
 * - Weekly/Monthly trends
 * - Graceful degradation when data is unavailable
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAnalytics } from '../../hooks/useAnalytics';

// Import domain-specific analytics tabs
import NutritionTab from '../../components/analytics/NutritionTab';
import MoodTab from '../../components/analytics/MoodTab';
import ActivityTab from '../../components/analytics/ActivityTab';
import HydrationTab from '../../components/analytics/HydrationTab';
import WellnessTab from '../../components/analytics/WellnessTab';
import AnalyticsTabBar from '../../components/analytics/AnalyticsTabBar';
import TimeframeSelector from '../../components/analytics/TimeframeSelector';
import FadeInView from '../../components/FadeInView';

import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
} from '../../constants/premiumTheme';
import { BOLD_GRADIENTS } from '../../constants/modernColorPalette';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { domain, period: requestedPeriodParam } = useLocalSearchParams();
  const requestedDomain = Array.isArray(domain) ? domain[0] : domain;
  const validDomain = ['wellness', 'nutrition', 'mood', 'activity', 'hydration'].includes(requestedDomain)
    ? requestedDomain
    : 'nutrition';
  const requestedPeriod = Array.isArray(requestedPeriodParam) ? requestedPeriodParam[0] : requestedPeriodParam;
  const validPeriod = ['today', 'week', 'month'].includes(requestedPeriod) ? requestedPeriod : 'week';
  const [activeDomain, setActiveDomain] = useState(validDomain);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(validPeriod);
  const [focusVersion, setFocusVersion] = useState(0);

  // Cached routes should reopen at the start of the selected story, not at a
  // scroll offset inherited from the last domain/range the user viewed.
  useFocusEffect(useCallback(() => {
    setFocusVersion((value) => value + 1);
  }, []));

  useEffect(() => {
    setActiveDomain(validDomain);
  }, [validDomain]);

  useEffect(() => {
    setPeriod(validPeriod);
  }, [validPeriod]);

  // Single analytics hook - graceful degradation built-in
  const {
    nutrition,
    mood,
    activity,
    hydration,
    wellness,
    recommendations,
    onCompleteRecommendation,
    onDismissRecommendation,
    isLoading,
    refetch,
    queries,
  } = useAnalytics(period);

  const activeData = {
    wellness,
    nutrition,
    mood,
    activity,
    hydration,
  }[activeDomain];
  const activeQuery = queries?.[activeDomain];

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleDomainChange = useCallback((nextDomain) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDomain(nextDomain);
    router.setParams({ domain: nextDomain, period });
  }, [period, router]);

  const handlePeriodChange = useCallback((newPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
    router.setParams({ domain: activeDomain, period: newPeriod });
  }, [activeDomain, router]);

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
      onCompleteRecommendation,
      onDismissRecommendation,
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
  const showLoading = (activeQuery?.isLoading ?? isLoading) && !refreshing && !activeData;
  const showError = activeQuery?.isError && !activeData;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={BOLD_GRADIENTS.dashboard} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={TEXT.primary} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>INSIGHTS & HISTORY</Text>
            <Text style={styles.title}>Your progress</Text>
            <Text style={styles.subtitle}>Notice change, rhythm, and context over time.</Text>
          </View>
        </View>
        <TimeframeSelector selected={period} onSelect={handlePeriodChange} />
      </View>

      {/* Domain Tab Bar */}
      <AnalyticsTabBar selected={activeDomain} onSelect={handleDomainChange} />

      {/* Content - Each tab has its own ScrollView */}
      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      ) : showError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Unable to load data</Text>
          <Text style={styles.errorText}>Pull down to try again</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FadeInView key={`${activeDomain}-${period}-${focusVersion}`} animation="slideUp" style={styles.contentContainer}>
          {renderDomainContent()}
        </FadeInView>
      )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[3],
    gap: SPACING[3],
    backgroundColor: SURFACES.card.primary,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: SURFACES.background.tertiary,
  },
  titleBlock: {
    flex: 1,
    paddingTop: 1,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
    marginBottom: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitle: {
    marginTop: 3,
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 16,
    color: TEXT.tertiary,
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
