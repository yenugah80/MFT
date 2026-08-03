/**
 * SessionTimeline (design 7)
 *
 * Recent sessions grouped by day, newest first, with delete. Replaces the
 * horizontal card strip: a vertical list is scannable, and grouping by day
 * shows the rhythm of training rather than a flat run of cards.
 *
 * Names the specific exercise where the row carries one (migration 0041) and
 * falls back to the coarse activity type for anything logged before that.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import { resolveIntensity } from '../../services/exerciseDatabase';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SEMANTIC,
} from '../../constants/premiumTheme';

const typeLabel = (type) =>
  ACTIVITY_TYPES.find((t) => t.key === type)?.label || type || 'Activity';

export default function SessionTimeline({ groups = [], onDelete, isDeleting }) {
  const handleDelete = useCallback(
    (id) => {
      if (!onDelete || !id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDelete(id);
    },
    [onDelete]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recent sessions</Text>

      {groups.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet.</Text>
      ) : (
        groups.map((group) => (
          <View key={group.dayKey} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
              <Text style={styles.groupMeta}>{group.minutes} min</Text>
            </View>

            {group.sessions.map((activity, index) => {
              const intensity = resolveIntensity(activity.intensity);
              const coarse = typeLabel(activity.type);
              const name = activity.exerciseName || coarse;
              const isLast = index === group.sessions.length - 1;

              return (
                <View key={activity.id ?? `${group.dayKey}-${index}`} style={styles.row}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: intensity.color }]} />
                    {!isLast && <View style={styles.railLine} />}
                  </View>

                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.meta}>
                      {activity.exerciseName ? `${coarse} · ` : ''}
                      {activity.duration || 0} min · {intensity.label.toLowerCase()}
                      {activity.calories ? ` · ${Math.round(activity.calories)} kcal` : ''}
                    </Text>
                  </View>

                  {!!onDelete && (
                    <TouchableOpacity
                      onPress={() => handleDelete(activity.id)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isDeleting}
                      accessibilityLabel={`Delete ${name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={SEMANTIC.danger.base} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  empty: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  group: {
    marginBottom: SPACING[3],
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  groupLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    letterSpacing: 0.6,
  },
  groupMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  rail: {
    alignItems: 'center',
    width: 10,
    alignSelf: 'stretch',
    paddingTop: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  body: {
    flex: 1,
    paddingBottom: SPACING[3],
  },
  name: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  meta: {
    marginTop: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  deleteButton: {
    padding: 4,
  },
});
