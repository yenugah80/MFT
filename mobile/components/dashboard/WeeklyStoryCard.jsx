/**
 * WeeklyStoryCard - weekly narrative snapshot.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING } from '../../constants/designTokens';

export default function WeeklyStoryCard({ title, subtitle, actionLabel, onAction }) {
  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction?.();
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />
      <View style={styles.header}>
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.title}>Weekly story</Text>
      </View>

      <Text style={styles.primaryText}>{title}</Text>
      <Text style={styles.secondaryText}>{subtitle}</Text>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.9}
        onPress={handleAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={styles.ctaText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CARD_SYSTEM.standard,
    paddingTop: SPACING[5],
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  primaryText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
});
