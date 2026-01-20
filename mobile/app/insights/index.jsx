/**
 * Insights Index - Clean Analytics Navigation
 *
 * Simple, focused navigation to analytics screens
 * NO duplicate wellness scores - that's on the dashboard
 *
 * Design: Clean, minimal, Apple Health inspired
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

// Analytics components
import PersonalizedPatternsCard from '../../components/analytics/PersonalizedPatternsCard';
import MorningPredictionCard from '../../components/dashboard/MorningPredictionCard';
import { NovelDiscoveriesSection } from '../../components/wellness/WellnessRecommendation';
import { useNovelCorrelations } from '../../hooks/useInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// INSIGHT SECTIONS - Full structure (no duplicate wellness dashboard)
// ============================================================================

const INSIGHT_SECTIONS = [
  {
    title: 'Health Analytics',
    subtitle: 'Deep dive into each category',
    items: [
      {
        id: 'nutrition',
        title: 'Nutrition Analytics',
        description: 'Calorie & macro tracking with goal progress',
        icon: 'nutrition',
        route: '/insights/food-analytics',
        gradient: VIBRANT_WELLNESS.nutrition.gradient,
      },
      {
        id: 'activity',
        title: 'Activity Analytics',
        description: 'CDC guidelines progress and movement patterns',
        icon: 'fitness',
        route: '/insights/activity-analytics',
        gradient: VIBRANT_WELLNESS.activity.gradient,
      },
      {
        id: 'hydration',
        title: 'Hydration Analytics',
        description: 'Daily water intake and hydration patterns',
        icon: 'water',
        route: '/insights/hydration-analytics',
        gradient: VIBRANT_WELLNESS.hydration.gradient,
      },
      {
        id: 'mood',
        title: 'Mood Analytics',
        description: 'Emotional patterns and mood trends',
        icon: 'happy',
        route: '/insights/mood',
        gradient: VIBRANT_WELLNESS.mood.gradient,
      },
    ],
  },
  {
    title: 'Correlations',
    subtitle: 'How your habits connect',
    items: [
      {
        id: 'mood-hydration',
        title: 'Mood & Hydration',
        description: 'How hydration affects how you feel',
        icon: 'water',
        route: '/insights/mood-hydration',
        gradient: ['#0EA5E9', '#38BDF8'],
        isNew: true,
      },
      {
        id: 'multi-factor',
        title: 'Multi-Factor Analysis',
        description: 'Advanced correlations across all metrics',
        icon: 'git-network',
        route: '/insights/multi-factor-analytics',
        gradient: ['#3B82F6', '#60A5FA'],
      },
      {
        id: 'activity-mood',
        title: 'Activity & Mood',
        description: 'How exercise affects your emotions',
        icon: 'trending-up',
        route: '/insights/activity-mood',
        gradient: ['#10B981', '#34D399'],
      },
      {
        id: 'food-mood',
        title: 'Food & Mood',
        description: 'Diet-emotion connections',
        icon: 'restaurant',
        route: '/insights/food-mood-correlation',
        gradient: ['#F59E0B', '#FBBF24'],
      },
    ],
  },
  {
    title: 'Predictions',
    subtitle: 'Tomorrow\'s forecast',
    items: [
      {
        id: 'predictive',
        title: 'Predictive Insights',
        description: 'Energy and mood predictions based on your data',
        icon: 'sunny',
        route: '/insights/predictive',
        gradient: ['#FBBF24', '#FDE68A'],
      },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InsightsIndex() {
  const router = useRouter();

  // Novel correlations - AI-discovered patterns unique to this user
  const {
    patterns: novelPatterns,
    isLoading: novelLoading,
    emptyStateMessage,
    hasEnoughData,
  } = useNovelCorrelations({ lookbackDays: 30, limit: 3 });

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleItemPress = useCallback((route) => {
    Haptics.selectionAsync();
    router.push(route);
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Insights',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTintColor: TEXT.primary,
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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Health Insights</Text>
          <Text style={styles.headerSubtitle}>
            Discover patterns, correlations, and personalized recommendations
          </Text>
        </View>

        {/* What's Ahead - Day Forecast */}
        <View style={styles.forecastSection}>
          <MorningPredictionCard
            onTipPress={(tip) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (tip.icon === 'water') {
                router.push('/(tabs)/log?focus=hydration');
              } else if (tip.icon === 'nutrition' || tip.icon === 'egg' || tip.icon === 'sunny') {
                router.push('/(tabs)/log');
              }
            }}
            onExpandPress={() => {
              router.push('/insights/wellness-history');
            }}
          />
        </View>

        {/* Personalized Patterns Card - Deep behavioral insights */}
        <View style={styles.patternsSection}>
          <PersonalizedPatternsCard
            compact={true}
            limit={3}
            onPatternPress={(pattern) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const routes = {
                'meal-timing': '/insights/food-mood-correlation',
                'next-day-carryover': '/insights/food-mood-correlation',
                'hydration': '/insights/hydration-analytics',
                'activity': '/insights/activity-mood',
              };
              const route = routes[pattern.category] || '/insights/multi-factor-analytics';
              router.push(route);
            }}
            onViewAll={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/insights/multi-factor-analytics');
            }}
          />
        </View>

        {/* AI Discoveries - Novel patterns unique to this user */}
        <View style={styles.discoveriesSection}>
          <NovelDiscoveriesSection
            patterns={novelPatterns}
            isLoading={novelLoading}
            emptyMessage={emptyStateMessage}
            onPatternPress={(discovery) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Navigate based on the factors involved
              const factors = discovery.technical?.factorA || '';
              if (factors.includes('water') || factors.includes('hydration')) {
                router.push('/insights/hydration-analytics');
              } else if (factors.includes('activity') || factors.includes('exercise')) {
                router.push('/insights/activity-mood');
              } else if (factors.includes('mood') || factors.includes('energy')) {
                router.push('/insights/mood');
              } else {
                router.push('/insights/multi-factor-analytics');
              }
            }}
          />
        </View>

        {/* All Sections */}
        {INSIGHT_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>

            <View style={styles.itemsContainer}>
              {section.items.map((item, index) => (
                <InsightItem
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item.route)}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Footer with Legal Disclaimer */}
        <View style={styles.footer}>
          <View style={styles.disclaimerContainer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={TEXT.muted} />
            <Text style={styles.disclaimerText}>
              These insights are for informational purposes only and are not medical advice.
              Patterns shown are based on your personal data. Consult a healthcare professional
              for health concerns.
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

// ============================================================================
// INSIGHT ITEM COMPONENT
// ============================================================================

function InsightItem({ item, onPress, isLast }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, !isLast && styles.itemBorder]}
      activeOpacity={0.7}
      accessibilityLabel={item.title}
      accessibilityHint={item.description}
    >
      <View style={[styles.itemIcon, { backgroundColor: `${item.gradient[0]}15` }]}>
        <Ionicons name={item.icon} size={22} color={item.gradient[0]} />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemDescription} numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    lineHeight: 22,
  },

  // Forecast Section (What's Ahead)
  forecastSection: {
    marginTop: SPACING[3],
  },

  // Personalized Patterns Section
  patternsSection: {
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
  },

  // AI Discoveries Section
  discoveriesSection: {
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
  },

  // Section
  section: {
    marginTop: SPACING[5],
  },
  sectionHeader: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Items Container
  itemsContainer: {
    marginHorizontal: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    ...SHADOWS.sm,
  },

  // Regular Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  newBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  itemDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING[6],
    paddingHorizontal: SPACING[4],
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  disclaimerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    lineHeight: 16,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    textAlign: 'center',
  },
});
