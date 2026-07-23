/**
 * AnalyticsEmptyState - shared "no real data yet" block for a domain tab
 *
 * Used when a tab's `data` object exists (goals/profile are set up) but every
 * displayed number is zero — the case the old `if (!data && ...)` gates never
 * caught, since `data` is never null once an account has goals configured.
 *
 * No CTA button here by design: every tab already renders its `type: 'action'`
 * recommendations (e.g. "Log Your First Meal") in its own "Priority Actions"
 * block above this one, so a second copy of the same card would just duplicate it.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

export default function AnalyticsEmptyState({ icon, iconColor, title, subtitle }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={iconColor || TEXT.tertiary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
  },
});
