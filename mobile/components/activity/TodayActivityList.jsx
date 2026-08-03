/**
 * TodayActivityList
 *
 * Today's logged workouts with delete. Lives on the Insights screen — the
 * Activity tab is for logging, this is where you review what landed.
 *
 * Renders plain Views (no FlatList) so it can sit inside a parent ScrollView.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useActivityLog, ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import { resolveIntensity } from '../../services/exerciseDatabase';
import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
  BRAND,
} from '../../constants/premiumTheme';

const TYPE_ICONS = {
  running: 'walk',
  cycling: 'bicycle',
  walking: 'footsteps',
  swimming: 'water',
  yoga: 'leaf',
  strength: 'barbell',
  hiit: 'flash',
  flexibility: 'body',
  dancing: 'musical-notes',
  hiking: 'trail-sign',
  sports: 'football',
  gym: 'fitness',
  cardio: 'pulse',
  general: 'fitness',
};

export default function TodayActivityList({ onLogWorkout }) {
  const { activities, todaySummary, isFetching, deleteActivity, isDeleting } = useActivityLog();

  // `activities` is already today's list, scoped server-side by the user's
  // timezone dayKey — re-filtering here by device date drops rows near midnight.
  const todayActivities = activities || [];

  const handleDelete = useCallback(async (activityId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await deleteActivity(activityId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[TodayActivityList] delete failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [deleteActivity]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Activities</Text>
        {isFetching ? (
          <ActivityIndicator size="small" color={BRAND.primary} />
        ) : todayActivities.length > 0 ? (
          <Text style={styles.sectionMeta}>
            {todaySummary?.totalMinutes || 0} min • {todaySummary?.totalCalories || 0} cal
          </Text>
        ) : null}
      </View>

      {todayActivities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="barbell-outline" size={28} color={TEXT.tertiary} />
          <Text style={styles.emptyText}>Nothing logged today</Text>
          {!!onLogWorkout && (
            <TouchableOpacity style={styles.emptyButton} onPress={onLogWorkout} activeOpacity={0.8}>
              <Text style={styles.emptyButtonText}>Log a workout</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        todayActivities.map((item) => {
          const intensityInfo = resolveIntensity(item.intensity);
          const label = ACTIVITY_TYPES.find((t) => t.key === item.type)?.label || item.type;

          return (
            <View key={item.id?.toString() || item.clientEventId} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.icon, { backgroundColor: `${intensityInfo.color}20` }]}>
                  <Ionicons
                    name={TYPE_ICONS[item.type] || 'fitness'}
                    size={20}
                    color={intensityInfo.color}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{label}</Text>
                  <Text style={styles.details}>
                    {item.durationMinutes} min • {intensityInfo.label}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.caloriesBadge}>
                  <Ionicons name="flame" size={16} color={SEMANTIC.warning.base} />
                  <Text style={styles.calories}>{item.caloriesBurned || 0}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isDeleting}
                  accessibilityLabel={`Delete ${label} activity`}
                >
                  <Ionicons name="trash-outline" size={18} color={SEMANTIC.danger.base} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionMeta: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  details: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: SPACING[2],
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${SEMANTIC.warning.base}20`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  calories: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.warning.base,
  },
  deleteButton: {
    padding: 4,
  },
  emptyCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING[4],
    paddingVertical: SPACING[5],
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  emptyButton: {
    marginTop: SPACING[1],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: BRAND.primary,
  },
  emptyButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
});
