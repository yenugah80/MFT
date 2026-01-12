/**
 * UnifiedActivityInsightsCard - Consolidated Activity & Insights Component
 *
 * Design Philosophy: "One Card, Complete Picture"
 * Replaces both UnifiedActivityFeed and MealInsightsCard
 *
 * Tabs:
 * - Today: Chronological timeline of all activities (meals, water, mood)
 * - This Week: Period-based stats with 7d/14d/30d selector
 * - Insights: AI-driven patterns and suggestions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS, CARD_SYSTEM } from '../../constants/premiumTheme';

// Tab configuration
const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'insights', label: 'Insights' },
];

// Period options for week tab
const PERIODS = [7, 14, 30];

// Activity type styling
const ACTIVITY_TYPES = {
  meal: {
    icon: 'restaurant',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
  },
  water: {
    icon: 'water',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
  },
  mood: {
    icon: 'happy',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.10)',
  },
};

// Lottie mood animations
const MOOD_LOTTIE_SOURCES = {
  happy: require('../../constants/lottie/mood-happy.json'),
  calm: require('../../constants/lottie/mood-calm.json'),
  focused: require('../../constants/lottie/mood-focused.json'),
  energized: require('../../constants/lottie/mood-energized.json'),
  neutral: require('../../constants/lottie/mood-neutral.json'),
  tired: require('../../constants/lottie/mood-tired.json'),
  stressed: require('../../constants/lottie/mood-stressed.json'),
  sad: require('../../constants/lottie/mood-sad.json'),
};

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Activity Item Component
 */
function ActivityItem({ activity, onPress, isLast }) {
  const config = ACTIVITY_TYPES[activity.type];
  const isMood = activity.type === 'mood';
  const moodType = activity.data?.mood?.toLowerCase() || 'neutral';

  return (
    <TouchableOpacity
      style={[styles.activityItem, !isLast && styles.activityItemBorder]}
      onPress={() => onPress?.(activity)}
      activeOpacity={0.7}
    >
      <View style={[styles.activityIcon, { backgroundColor: config.bgColor }]}>
        {isMood && MOOD_LOTTIE_SOURCES[moodType] ? (
          <LottieView
            source={MOOD_LOTTIE_SOURCES[moodType]}
            autoPlay
            loop
            style={{ width: 24, height: 24 }}
          />
        ) : (
          <Ionicons name={config.icon} size={16} color={config.color} />
        )}
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.activitySubtitle} numberOfLines={1}>
          {activity.subtitle}
        </Text>
      </View>
      <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
    </TouchableOpacity>
  );
}

/**
 * Today Tab Content
 */
function TodayTab({ activities, onItemPress, totalCount }) {
  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={32} color={TEXT.tertiary} />
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={styles.emptySubtitle}>Start by logging a meal, water, or mood</Text>
      </View>
    );
  }

  return (
    <View>
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id || `${activity.type}-${index}`}
          activity={activity}
          onPress={onItemPress}
          isLast={index === activities.length - 1}
        />
      ))}
      {totalCount > 5 && (
        <Text style={styles.moreItemsHint}>
          +{totalCount - 5} more items
        </Text>
      )}
    </View>
  );
}

/**
 * Week Tab Content (Stats)
 */
function WeekTab({ periodData, selectedPeriod, onPeriodChange }) {
  return (
    <View>
      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodChip,
              selectedPeriod === period && styles.periodChipActive,
            ]}
            onPress={() => onPeriodChange(period)}
            activeOpacity={0.7}
          >
            {selectedPeriod === period ? (
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryLight || '#8B7BFF']}
                style={styles.periodChipGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.periodText, styles.periodTextActive]}>{period}d</Text>
              </LinearGradient>
            ) : (
              <View style={styles.periodChipInactive}>
                <Text style={styles.periodText}>{period}d</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Grid */}
      {periodData ? (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{periodData.avgCalories || 0}</Text>
            <Text style={styles.statLabel}>avg cal/day</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{periodData.avgProtein || 0}g</Text>
            <Text style={styles.statLabel}>avg protein</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{periodData.totalMeals || 0}</Text>
            <Text style={styles.statLabel}>total meals</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptySubtitle}>No data for this period</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Insights Tab Content
 */
function InsightsTab({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="bulb-outline" size={32} color={TEXT.tertiary} />
        <Text style={styles.emptyTitle}>Building your insights</Text>
        <Text style={styles.emptySubtitle}>Log more meals to see patterns</Text>
      </View>
    );
  }

  return (
    <View style={styles.insightsList}>
      {insights.slice(0, 3).map((insight, index) => (
        <View key={index} style={styles.insightItem}>
          <View style={styles.insightIcon}>
            <Ionicons
              name={insight.icon || 'sparkles'}
              size={16}
              color={BRAND.primary}
            />
          </View>
          <Text style={styles.insightText} numberOfLines={2}>
            {insight.message || insight.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Main Component
 */
export default function UnifiedActivityInsightsCard({
  // Today tab data
  meals = [],
  waterLogs = [],
  moodLogs = [],
  onItemPress,
  // Week tab data
  periodData,
  // Insights tab data
  insights = [],
  // Navigation
  onViewAll,
  // Styling
  style,
}) {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  // Process today's activities with deduplication
  const { activities, totalCount } = useMemo(() => {
    // Deduplicate water logs
    const seenWaterIds = new Set();
    const seenWaterKeys = new Set();
    const uniqueWaterLogs = waterLogs.filter((w) => {
      const id = w.clientEventId || w.id;
      if (id && seenWaterIds.has(id)) return false;
      const timestamp = w.loggedDate ? new Date(w.loggedDate).toISOString().slice(0, 16) : '';
      const amount = Math.round((parseFloat(w.amountLiters) || 0) * 1000);
      const key = `${timestamp}-${amount}-${w.beverageType || 'water'}`;
      if (seenWaterKeys.has(key)) return false;
      if (id) seenWaterIds.add(id);
      seenWaterKeys.add(key);
      return true;
    });

    // Deduplicate meals
    const seenMealIds = new Set();
    const uniqueMeals = meals.filter((m) => {
      const id = m.clientEventId || m.id || m.local_id;
      if (!id || seenMealIds.has(id)) return false;
      seenMealIds.add(id);
      return true;
    });

    const allActivities = [
      ...uniqueMeals.map((m) => ({
        type: 'meal',
        timestamp: m.loggedDate || m.createdAt || m.timestamp,
        title: m.foodName || 'Food item',
        subtitle: `${Math.round(m.calories || 0)} cal${m.protein ? ` · ${Math.round(m.protein)}g protein` : ''}`,
        data: m,
        id: m.clientEventId || m.id || m.local_id,
      })),
      ...uniqueWaterLogs.map((w) => ({
        type: 'water',
        timestamp: w.loggedDate,
        title: w.beverageType
          ? w.beverageType.charAt(0).toUpperCase() + w.beverageType.slice(1)
          : 'Water',
        subtitle: `${Math.round((parseFloat(w.amountLiters) || 0) * 1000)} ml`,
        data: w,
        id: w.clientEventId || w.id,
      })),
      ...moodLogs.map((m) => ({
        type: 'mood',
        timestamp: m.loggedDate,
        title: m.mood ? m.mood.charAt(0).toUpperCase() + m.mood.slice(1) : 'Mood',
        subtitle: m.intensity ? `Intensity ${m.intensity}/10` : '',
        data: m,
        id: m.clientEventId || m.id,
      })),
    ];

    const sorted = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      activities: sorted.slice(0, 5),
      totalCount: sorted.length,
    };
  }, [meals, waterLogs, moodLogs]);

  // Don't render if no data at all
  const hasAnyData = activities.length > 0 || periodData || insights.length > 0;
  if (!hasAnyData) return null;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="analytics-outline" size={16} color={BRAND.primary} />
          </View>
          <Text style={styles.headerTitle}>Activity & Insights</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'today' && (
          <TodayTab
            activities={activities}
            onItemPress={onItemPress}
            totalCount={totalCount}
          />
        )}
        {activeTab === 'week' && (
          <WeekTab
            periodData={periodData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsTab insights={insights} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: `${SEMANTIC_ACTIONS.success}0D`,
    borderRadius: RADIUS.lg,
    padding: 3,
    marginBottom: SPACING[3],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  tabText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  tabTextActive: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  tabContent: {
    minHeight: 120,
  },

  // Activity Items
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2] + 2,
    gap: SPACING[3],
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}0F`,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  activitySubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  activityTime: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  moreItemsHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },

  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  periodChip: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  periodChipActive: {},
  periodChipInactive: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    backgroundColor: `${SEMANTIC_ACTIONS.success}0F`,
    borderRadius: RADIUS.full,
  },
  periodChipGradient: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: `${SEMANTIC_ACTIONS.success}0A`,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
  },

  // Insights
  insightsList: {
    gap: SPACING[2],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}0A`,
    borderRadius: RADIUS.lg,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[5],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginTop: SPACING[2],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
});
