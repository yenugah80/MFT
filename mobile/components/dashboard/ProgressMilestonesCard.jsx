/**
 * ProgressMilestonesCard - reflection-aligned gamification.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

export default function ProgressMilestonesCard({
  reflectionStreak = 0,
  insightsUnlocked = 0,
  milestoneText,
  onViewProgress,
}) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewProgress?.();
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={SURFACES.gradient.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />
      <View style={styles.header}>
        <LinearGradient
          colors={SURFACES.gradient.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name="trophy-outline" size={16} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.title}>Progress and milestones</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{reflectionStreak}</Text>
          <Text style={styles.statLabel}>Reflection streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{insightsUnlocked}</Text>
          <Text style={styles.statLabel}>Insights unlocked</Text>
        </View>
      </View>

      <View style={styles.milestone}>
        <Ionicons name="flag-outline" size={14} color={TEXT.tertiary} />
        <Text style={styles.milestoneText}>{milestoneText}</Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="View progress"
      >
        <Text style={styles.ctaText}>View progress</Text>
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
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  stat: {
    flex: 1,
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
    height: 32,
    backgroundColor: SURFACES.card.border,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    marginBottom: SPACING[3],
  },
  milestoneText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
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
