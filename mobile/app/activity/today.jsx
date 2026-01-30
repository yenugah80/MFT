/**
 * Today's Activity Screen - Full Day Timeline
 *
 * Design Philosophy: Complete view of all today's logged activities
 * - Chronological timeline of meals, water, mood
 * - Color-coded by activity type
 * - Swipe to delete/edit
 * - Filter by activity type
 *
 * Navigation:
 * - Back → Dashboard
 * - Tap meal → /meal/{id}
 * - Tap water → /(tabs)/log?focus=hydration
 * - Tap mood → /insights/mood
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useDashboard } from '../../hooks/useDashboard';
import {
  TEXT,
  SURFACES,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

// Lottie mood animation sources
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

// Activity type configuration
const ACTIVITY_TYPES = {
  meal: {
    icon: 'restaurant',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
    label: 'Meals',
  },
  water: {
    icon: 'water',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
    label: 'Water',
  },
  mood: {
    icon: 'happy',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    label: 'Mood',
  },
};

// Filter options
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'meal', label: 'Meals' },
  { key: 'water', label: 'Water' },
  { key: 'mood', label: 'Mood' },
];

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Single activity item in the timeline
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
      {/* Timeline line */}
      <View style={styles.timelineConnector}>
        <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        {isMood && MOOD_LOTTIE_SOURCES[moodType] ? (
          <LottieView
            source={MOOD_LOTTIE_SOURCES[moodType]}
            autoPlay
            loop
            style={{ width: 24, height: 24 }}
          />
        ) : (
          <Ionicons name={config.icon} size={20} color={config.color} />
        )}
      </View>

      {/* Content */}
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.activitySubtitle} numberOfLines={1}>
          {activity.subtitle}
        </Text>
      </View>

      {/* Time */}
      <View style={styles.timeContainer}>
        <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
        <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Filter chip component
 */
function FilterChip({ filter, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Empty state component
 */
function EmptyState({ filter }) {
  const message = filter === 'all'
    ? "No activity logged today"
    : `No ${ACTIVITY_TYPES[filter]?.label.toLowerCase() || filter} logged today`;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={32} color={TEXT.tertiary} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
      <Text style={styles.emptyHint}>Start by logging a meal, water, or mood</Text>
    </View>
  );
}

/**
 * Main Today Activity Screen
 */
export default function TodayActivityScreen() {
  const router = useRouter();
  const { data, refetch } = useDashboard();
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Memoize today's data to avoid reference changes on each render
  const meals = useMemo(() => data?.today?.foodLogs || [], [data?.today?.foodLogs]);
  const waterLogs = useMemo(() => data?.today?.waterLogs || [], [data?.today?.waterLogs]);
  const moodLogs = useMemo(() => data?.today?.moodLogs || [], [data?.today?.moodLogs]);

  // Combine and process all activities
  const activities = useMemo(() => {
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
    const seenMeals = new Set();
    const uniqueMeals = meals.filter((m) => {
      const id = m.clientEventId || m.id || m.local_id;
      if (id) {
        if (seenMeals.has(id)) return false;
        seenMeals.add(id);
        return true;
      }
      const key = `${m.loggedDate || m.createdAt}-${m.foodName}`;
      if (seenMeals.has(key)) return false;
      seenMeals.add(key);
      return true;
    });

    const allActivities = [
      // Meals
      ...uniqueMeals.map((m) => ({
        type: 'meal',
        timestamp: m.loggedDate || m.createdAt || m.timestamp,
        title: m.foodName || 'Food item',
        subtitle: `${Math.round(m.calories || 0)} cal${m.protein ? ` · ${Math.round(m.protein)}g protein` : ''}`,
        data: m,
        id: m.clientEventId || m.id || m.local_id,
      })),
      // Water logs
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
      // Mood logs
      ...moodLogs.map((m) => ({
        type: 'mood',
        timestamp: m.loggedDate,
        title: m.mood ? m.mood.charAt(0).toUpperCase() + m.mood.slice(1) : 'Mood',
        subtitle: m.intensity ? `Intensity ${m.intensity}/10` : '',
        data: m,
        id: m.clientEventId || m.id,
      })),
    ];

    // Filter by active filter
    let filtered = allActivities;
    if (activeFilter !== 'all') {
      filtered = allActivities.filter((a) => a.type === activeFilter);
    }

    // Sort by timestamp (most recent first)
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [meals, waterLogs, moodLogs, activeFilter]);

  // Calculate summary stats
  const stats = useMemo(() => ({
    meals: meals.length,
    water: waterLogs.length,
    mood: moodLogs.length,
    total: meals.length + waterLogs.length + moodLogs.length,
  }), [meals, waterLogs, moodLogs]);

  // Handle item press
  const handleItemPress = useCallback((activity) => {
    if (activity.type === 'meal') {
      const mealId = activity.data?.id || activity.data?.clientEventId;
      if (mealId) {
        router.push(`/meal/${mealId}`);
      }
    } else if (activity.type === 'water') {
      router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
    } else if (activity.type === 'mood') {
      router.push('/analytics');
    }
  }, [router]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/dashboard');
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Today&apos;s Activity</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} items logged
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: ACTIVITY_TYPES.meal.bgColor }]}>
            <Ionicons name="restaurant" size={16} color={ACTIVITY_TYPES.meal.color} />
          </View>
          <Text style={styles.statValue}>{stats.meals}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: ACTIVITY_TYPES.water.bgColor }]}>
            <Ionicons name="water" size={16} color={ACTIVITY_TYPES.water.color} />
          </View>
          <Text style={styles.statValue}>{stats.water}</Text>
          <Text style={styles.statLabel}>Water</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: ACTIVITY_TYPES.mood.bgColor }]}>
            <Ionicons name="happy" size={16} color={ACTIVITY_TYPES.mood.color} />
          </View>
          <Text style={styles.statValue}>{stats.mood}</Text>
          <Text style={styles.statLabel}>Mood</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            filter={filter}
            isActive={activeFilter === filter.key}
            onPress={() => setActiveFilter(filter.key)}
          />
        ))}
      </View>

      {/* Activity List */}
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
        {activities.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <View style={styles.activityList}>
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id || `${activity.type}-${index}`}
                activity={activity}
                onPress={handleItemPress}
                isLast={index === activities.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACES.background.primary,
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: RADIUS.xl,
    ...SHADOWS.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  filterChip: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(107, 78, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: BRAND.primary,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Activity List
  activityList: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 78, 255, 0.06)',
  },

  // Timeline
  timelineConnector: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    width: 2,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },

  // Icon
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  activitySubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Time
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  activityTime: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[4],
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
    textAlign: 'center',
  },
});
