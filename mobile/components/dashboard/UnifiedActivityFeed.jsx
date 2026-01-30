/**
 * TodayActivityCard - Premium Chronological Activity Timeline
 *
 * Design Philosophy: "Single source of truth for TODAY's logged activities"
 * - Combines meals, water logs, and mood entries in one timeline
 * - Sorted by time (most recent first)
 * - Color-coded by activity type (green/blue/amber)
 * - Uses CARD_SYSTEM.standard styling
 * - Maximum 5 items with "View All" option
 * - Shows encouraging empty state (never hides)
 *
 * Navigation:
 * - Tap meal → /history/meal/{id}
 * - Tap water → /(tabs)/log?focus=hydration
 * - Tap mood → /insights/mood
 * - View All → /activity/today (full day timeline)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, BRAND, CARD_SYSTEM, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

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
  },
  water: {
    icon: 'water',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
  },
  mood: {
    icon: 'happy', // Fallback - Lottie is preferred
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.10)',
  },
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
      {/* Icon - Use Lottie for mood, Ionicons for others */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        {isMood && MOOD_LOTTIE_SOURCES[moodType] ? (
          <LottieView
            source={MOOD_LOTTIE_SOURCES[moodType]}
            autoPlay
            loop
            style={{ width: 24, height: 24 }}
          />
        ) : (
          <Ionicons name={config.icon} size={18} color={config.color} />
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
      <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
    </TouchableOpacity>
  );
}

/**
 * Empty state when no activity
 */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={28} color={TEXT.tertiary} />
      </View>
      <Text style={styles.emptyText}>Today&apos;s activity</Text>
      <Text style={styles.emptyHint}>Meals, water, and mood appear here</Text>
    </View>
  );
}

/**
 * Main UnifiedActivityFeed Component
 */
export default function UnifiedActivityFeed({
  meals = [],
  waterLogs = [],
  moodLogs = [],
  onItemPress,
  onViewAll,
  maxItems = 5,
  style,
}) {
  // Combine and sort all activities chronologically
  const activities = useMemo(() => {
    // Deduplicate water logs by BOTH id AND timestamp+amount (handles different IDs with same data)
    const seenWaterIds = new Set();
    const seenWaterKeys = new Set();
    const uniqueWaterLogs = waterLogs.filter((w) => {
      // Check by ID
      const id = w.clientEventId || w.id;
      if (id && seenWaterIds.has(id)) return false;

      // Also check by timestamp (truncated to minute) + amount + type
      // This catches duplicates that have different IDs but same actual data
      const timestamp = w.loggedDate ? new Date(w.loggedDate).toISOString().slice(0, 16) : '';
      const amount = Math.round((parseFloat(w.amountLiters) || 0) * 1000); // Round to ml to avoid float issues
      const key = `${timestamp}-${amount}-${w.beverageType || 'water'}`;

      if (seenWaterKeys.has(key)) return false;

      // Add to both sets
      if (id) seenWaterIds.add(id);
      seenWaterKeys.add(key);
      return true;
    });

    // Deduplicate meals by id OR by timestamp+name
    const seenMeals = new Set();
    const uniqueMeals = meals.filter((m) => {
      const id = m.clientEventId || m.id || m.local_id;
      if (id) {
        if (seenMeals.has(id)) return false;
        seenMeals.add(id);
        return true;
      }
      // Fallback: dedupe by timestamp + foodName
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

    // Sort by timestamp (most recent first)
    return allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, maxItems);
  }, [meals, waterLogs, moodLogs, maxItems]);

  // Calculate total count after deduplication for accurate "View all X items"
  const totalCount = useMemo(() => {
    const seenWaterIds = new Set();
    const seenWaterKeys = new Set();
    const uniqueWaterCount = waterLogs.filter((w) => {
      const id = w.clientEventId || w.id;
      if (id && seenWaterIds.has(id)) return false;

      const timestamp = w.loggedDate ? new Date(w.loggedDate).toISOString().slice(0, 16) : '';
      const amount = Math.round((parseFloat(w.amountLiters) || 0) * 1000);
      const key = `${timestamp}-${amount}-${w.beverageType || 'water'}`;

      if (seenWaterKeys.has(key)) return false;

      if (id) seenWaterIds.add(id);
      seenWaterKeys.add(key);
      return true;
    }).length;

    const seenMeals = new Set();
    const uniqueMealCount = meals.filter((m) => {
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
    }).length;

    return uniqueMealCount + uniqueWaterCount + moodLogs.length;
  }, [meals, waterLogs, moodLogs]);

  const hasMore = totalCount > maxItems;
  const hasActivity = activities.length > 0;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="time-outline" size={16} color={BRAND.primary} />
          </View>
          <Text style={styles.headerTitle}>Today</Text>
        </View>
        {totalCount > 0 && (
          <Text style={styles.headerCount}>{totalCount} items</Text>
        )}
      </View>

      {/* Empty State or Timeline */}
      {!hasActivity ? (
        <EmptyState />
      ) : (
        <>
          {/* Timeline */}
          <View style={styles.timeline}>
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id || `${activity.type}-${index}`}
                activity={activity}
                onPress={onItemPress}
                isLast={index === activities.length - 1}
              />
            ))}
          </View>

          {/* View All Button */}
          {hasMore && onViewAll && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all today's activity</Text>
              <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  headerCount: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Timeline
  timeline: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}0F`,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  activityTime: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },

  // View All
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: `${SEMANTIC_ACTIONS.success}0F`,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[5],
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
});
