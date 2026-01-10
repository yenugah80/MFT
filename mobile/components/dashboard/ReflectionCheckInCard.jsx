/**
 * ReflectionCheckInCard - Reflection-first entry point
 * Quick mood/energy check-in with a single CTA.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

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
        <View style={styles.headerText}>
          <Text style={styles.title}>Today's reflection</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="happy-outline" size={12} color={TEXT.tertiary} />
              <Text style={styles.chipText}>Mood</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="pulse-outline" size={12} color={TEXT.tertiary} />
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
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Ionicons name="happy-outline" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>{hasCheckIn ? 'Update' : 'Check in'}</Text>
        </LinearGradient>
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
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  body: {
    marginBottom: SPACING[3],
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  statPill: {
    flex: 1,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: 4,
  },
  emptyPrompt: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  cta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
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
