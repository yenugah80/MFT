/**
 * RelatedInsights - Cross-linking component for insight screens
 *
 * Addresses the gap identified in the analysis:
 * - Insight screens were siloed without cross-links
 * - Users couldn't easily discover related insights
 *
 * Design: Horizontal scrollable cards that link to related insights
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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

// Related insights configuration for each category
const RELATED_INSIGHTS = {
  activity: [
    {
      id: 'mood',
      title: 'Activity & Mood',
      subtitle: 'How exercise affects emotions',
      icon: 'happy',
      route: '/insights/activity-mood',
      gradient: VIBRANT_WELLNESS.mood.gradient,
    },
    {
      id: 'patterns',
      title: 'Movement Patterns',
      subtitle: 'Your activity trends',
      icon: 'pulse',
      route: '/insights/patterns',
      gradient: ['#8B5CF6', '#A78BFA'],
    },
    {
      id: 'hub',
      title: 'Insights Hub',
      subtitle: 'Complete overview',
      icon: 'analytics',
      route: '/insights/recommendations-hub',
      gradient: [BRAND.primary, BRAND.primaryLight],
    },
  ],
  hydration: [
    {
      id: 'cognition',
      title: 'Hydration & Focus',
      subtitle: 'Cognitive impact',
      icon: 'bulb',
      route: '/insights/hydration-cognition',
      gradient: ['#06B6D4', '#22D3EE'],
    },
    {
      id: 'recommendations',
      title: 'Water Guidelines',
      subtitle: 'Science-backed advice',
      icon: 'water-outline',
      route: '/insights/water-recommendations',
      gradient: ['#0284C7', '#38BDF8'],
    },
    {
      id: 'patterns',
      title: 'Hydration Trends',
      subtitle: 'Your patterns',
      icon: 'trending-up',
      route: '/insights/patterns',
      gradient: ['#8B5CF6', '#A78BFA'],
    },
  ],
  mood: [
    {
      id: 'food-mood',
      title: 'Food & Mood',
      subtitle: 'Diet connections',
      icon: 'nutrition',
      route: '/insights/food-mood-correlation',
      gradient: VIBRANT_WELLNESS.nutrition.gradient,
    },
    {
      id: 'activity-mood',
      title: 'Activity Impact',
      subtitle: 'Exercise effects',
      icon: 'fitness',
      route: '/insights/activity-mood',
      gradient: VIBRANT_WELLNESS.activity.gradient,
    },
    {
      id: 'predictive',
      title: 'Tomorrow\'s Mood',
      subtitle: 'AI prediction',
      icon: 'sunny',
      route: '/insights/predictive',
      gradient: ['#FBBF24', '#FDE68A'],
    },
  ],
  nutrition: [
    {
      id: 'food-mood',
      title: 'Food & Mood',
      subtitle: 'Emotional connections',
      icon: 'happy',
      route: '/insights/food-mood-correlation',
      gradient: VIBRANT_WELLNESS.mood.gradient,
    },
    {
      id: 'patterns',
      title: 'Eating Patterns',
      subtitle: 'Your trends',
      icon: 'trending-up',
      route: '/insights/patterns',
      gradient: ['#8B5CF6', '#A78BFA'],
    },
    {
      id: 'hub',
      title: 'Insights Hub',
      subtitle: 'Full dashboard',
      icon: 'analytics',
      route: '/insights/recommendations-hub',
      gradient: [BRAND.primary, BRAND.primaryLight],
    },
  ],
  patterns: [
    {
      id: 'multi-factor',
      title: 'Multi-Factor',
      subtitle: 'Advanced analysis',
      icon: 'git-network',
      route: '/insights/multi-factor-analytics',
      gradient: ['#3B82F6', '#60A5FA'],
    },
    {
      id: 'predictive',
      title: 'Predictions',
      subtitle: 'AI forecasts',
      icon: 'sunny',
      route: '/insights/predictive',
      gradient: ['#FBBF24', '#FDE68A'],
    },
    {
      id: 'hub',
      title: 'Insights Hub',
      subtitle: 'All insights',
      icon: 'analytics',
      route: '/insights/recommendations-hub',
      gradient: [BRAND.primary, BRAND.primaryLight],
    },
  ],
};

export default function RelatedInsights({
  category = 'patterns',
  excludeId,
  maxItems = 3,
  title = 'Related Insights',
  style,
}) {
  const router = useRouter();

  // Get related insights for this category, excluding current page
  const insights = (RELATED_INSIGHTS[category] || RELATED_INSIGHTS.patterns)
    .filter((item) => item.id !== excludeId)
    .slice(0, maxItems);

  const handlePress = useCallback((route) => {
    Haptics.selectionAsync();
    router.push(route);
  }, [router]);

  if (insights.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {insights.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item.route)}
            style={styles.card}
            activeOpacity={0.8}
            accessibilityLabel={item.title}
            accessibilityHint={item.subtitle}
          >
            <LinearGradient
              colors={[`${item.gradient[0]}15`, `${item.gradient[0]}05`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.gradient[0]}20` }]}>
                <Ionicons name={item.icon} size={20} color={item.gradient[0]} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* View All Card */}
        <TouchableOpacity
          onPress={() => handlePress('/insights')}
          style={[styles.card, styles.viewAllCard]}
          activeOpacity={0.8}
          accessibilityLabel="View all insights"
        >
          <View style={styles.viewAllContent}>
            <Ionicons name="grid-outline" size={20} color={TEXT.tertiary} />
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={TEXT.tertiary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/**
 * Compact inline link to related insight
 */
export function RelatedInsightLink({
  title,
  subtitle,
  icon,
  route,
  gradient,
  style,
}) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    router.push(route);
  }, [router, route]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.inlineLink, style]}
      activeOpacity={0.7}
      accessibilityLabel={title}
    >
      <View style={[styles.inlineLinkIcon, { backgroundColor: `${gradient?.[0] || BRAND.primary}15` }]}>
        <Ionicons name={icon} size={16} color={gradient?.[0] || BRAND.primary} />
      </View>
      <View style={styles.inlineLinkContent}>
        <Text style={styles.inlineLinkTitle}>{title}</Text>
        {subtitle && <Text style={styles.inlineLinkSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING[6],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    gap: SPACING[3],
  },
  card: {
    width: 140,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  cardGradient: {
    padding: SPACING[3],
    height: 120,
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: SPACING[3],
    left: SPACING[3],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  viewAllCard: {
    backgroundColor: SURFACES.background.tertiary,
  },
  viewAllContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },

  // Inline link styles
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginTop: SPACING[3],
  },
  inlineLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[2],
  },
  inlineLinkContent: {
    flex: 1,
  },
  inlineLinkTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  inlineLinkSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
});
