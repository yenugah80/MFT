/**
 * ProgressMilestonesCard - reflection-aligned gamification.
 * Premium UI with gold gradient
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BOLD_GRADIENTS, DEPTH_SHADOWS } from '../../constants/modernColorPalette';

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
    <View style={[styles.cardWrapper, DEPTH_SHADOWS.progress]}>
      <LinearGradient
        colors={BOLD_GRADIENTS.progress}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Glass overlay for depth */}
        <View style={styles.glassOverlay} />

        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="trophy" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Progress & milestones</Text>
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
          <Ionicons name="flag" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.milestoneText}>{milestoneText}</Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="View progress"
        >
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText}>View progress</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: RADIUS['2xl'],
    marginBottom: SPACING[4],
    overflow: 'hidden',
  },
  card: {
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: SPACING[4],
  },
  milestoneText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  cta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
});
