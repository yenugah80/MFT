/**
 * ReflectionCheckInCard - Reflection-first entry point
 * Quick mood/energy check-in with premium pink/purple gradient
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BOLD_GRADIENTS, DEPTH_SHADOWS } from '../../constants/modernColorPalette';

function getScore(log, fields, fallback = 5) {
  for (const field of fields) {
    const value = Number(log?.[field]);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  return fallback;
}

export default function ReflectionCheckInCard({ moodLogs = [], onCheckIn }) {
  const latestMood = moodLogs?.[0];
  const hasCheckIn = Boolean(latestMood);
  const moodScore = getScore(latestMood, ['score', 'moodScore', 'intensity'], 5);
  const energyScore = getScore(latestMood, ['energy', 'energyLevel'], 5);

  const handleCheckIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCheckIn?.();
  };

  return (
    <View style={[styles.cardWrapper, DEPTH_SHADOWS.reflection]}>
      <LinearGradient
        colors={BOLD_GRADIENTS.reflection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Glass overlay for depth */}
        <View style={styles.glassOverlay} />

        <View style={styles.header}>
          {/* Icon badge with inner glow */}
          <View style={styles.iconBadge}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Today's reflection</Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Ionicons name="happy-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.chipText}>Mood</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="pulse-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.chipText}>Energy</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {hasCheckIn ? (
            <View style={styles.statRow}>
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>Mood</Text>
                <Text style={styles.statValue}>{moodScore}/10</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>Energy</Text>
                <Text style={styles.statValue}>{energyScore}/10</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyPrompt}>
              How are you feeling right now?
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={handleCheckIn}
          accessibilityRole="button"
          accessibilityLabel={hasCheckIn ? 'Update check-in' : 'Start check-in'}
        >
          <View style={styles.ctaInner}>
            <Ionicons name="happy-outline" size={18} color="#FFFFFF" />
            <Text style={styles.ctaText}>{hasCheckIn ? 'Update' : 'Check in'}</Text>
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  body: {
    marginBottom: SPACING[4],
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  statPill: {
    flex: 1,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyPrompt: {
    fontSize: TYPOGRAPHY.size.md,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Glow effect
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
});
