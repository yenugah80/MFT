/**
 * TrainingRibbon
 *
 * Five weeks of trained/rest days compressed to a single row, with the one
 * consequence that follows from it.
 *
 * This replaces the heatmap on the landing screen. The grid is better for
 * studying a habit, but studying is not what you do on arrival — on arrival
 * you want to know whether the habit is holding and what today costs. The grid
 * still exists one tap deeper.
 *
 * Costs ~70pt where the heatmap cost ~260pt.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  BRAND,
} from '../../constants/premiumTheme';

/** Deeper fill for a longer session, matching the grid's encoding */
const opacityFor = (minutes) => {
  if (minutes >= 60) return 1;
  if (minutes >= 30) return 0.78;
  if (minutes >= 15) return 0.58;
  return 0.42;
};

export default function TrainingRibbon({ consistency, pace, onPress }) {
  const days = (consistency?.grid || []).flat().filter((day) => !day.isFuture);
  const trainedDays = consistency?.trainedDays || 0;
  const elapsedDays = consistency?.elapsedDays || days.length;

  const remaining = Number(pace?.remainingMinutes);
  const daysLeft = Number(pace?.daysLeft);
  const onPace = pace?.onPace;

  // One consequence, not a second statistic
  const consequence = (() => {
    if (!Number.isFinite(remaining)) return null;
    if (remaining <= 0) return 'Weekly target reached';
    if (!Number.isFinite(daysLeft) || daysLeft <= 0) {
      return `${remaining} min short with the week closing`;
    }
    if (onPace) return `On pace · ${remaining} min left`;
    return `${Math.ceil(remaining / Math.max(daysLeft, 1))} min/day to land it`;
  })();

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Training history, ${trainedDays} of last ${elapsedDays} days trained`}
    >
      <View style={styles.ribbon}>
        {days.map((day) => (
          <View
            key={day.dayKey}
            style={[
              styles.cell,
              day.trained && {
                backgroundColor: BRAND.primary,
                opacity: opacityFor(day.minutes),
              },
              day.isToday && styles.today,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <View style={[styles.chip, { backgroundColor: `${BRAND.primary}18` }]}>
          <Ionicons name="flame-outline" size={15} color={BRAND.primary} />
        </View>
        <Text style={styles.summary}>
          {trainedDays} of last {elapsedDays} days
          {consequence ? ` · ${consequence}` : ''}
        </Text>
        {!!onPress && <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />}
      </View>
    </Wrapper>
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
  ribbon: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    height: 34,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  today: {
    borderWidth: 2,
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}22`,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
});
