/**
 * Hydration Card
 *
 * Simple card showing hydration status and its effect on mood
 * Clean, user-friendly design
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  BRAND,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// Simple targets
const TARGET_MIN = 2000;
const TARGET_MAX = 3000;

export default function HydrationCognitionCard({
  waterLogs = [],
  moodLogs = [],
  compact = true,
}) {
  const router = useRouter();

  // Calculate average
  const avgHydration = useMemo(() => {
    if (!waterLogs.length) return 0;
    return Math.round(
      waterLogs.reduce((sum, log) => sum + (log.amount || 0), 0) / waterLogs.length
    );
  }, [waterLogs]);

  // Simple status
  const status = useMemo(() => {
    if (avgHydration === 0) return { text: 'Start Tracking', color: TEXT.tertiary, icon: 'water-outline' };
    if (avgHydration < TARGET_MIN) return { text: 'Drink More', color: SEMANTIC.warning.base, icon: 'arrow-up' };
    if (avgHydration > TARGET_MAX) return { text: 'Maybe Less', color: SEMANTIC.info.base, icon: 'arrow-down' };
    return { text: 'On Track', color: SEMANTIC.success.base, icon: 'checkmark-circle' };
  }, [avgHydration]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/hydration-cognition');
  };

  // Empty state
  if (!waterLogs.length) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}20` }]}>
            <Ionicons name="water" size={24} color={VIBRANT_WELLNESS.hydration.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Hydration</Text>
            <Text style={styles.subtitle}>Track your water</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>
          Log water to see how hydration affects your energy and focus
        </Text>
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel="Hydration insights"
        accessibilityRole="button"
      >
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}20` }]}>
            <Ionicons name="water" size={24} color={VIBRANT_WELLNESS.hydration.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Hydration</Text>
            <Text style={styles.subtitle}>{waterLogs.length} days tracked</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
            <Ionicons name={status.icon} size={18} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
          <Text style={styles.avgText}>{avgHydration} ml/day</Text>
        </View>

        {/* Range Bar */}
        <View style={styles.rangeSection}>
          <View style={styles.rangeBar}>
            <View style={[styles.rangeZone, { backgroundColor: SEMANTIC.danger.base, opacity: 0.6 }]} />
            <View style={[styles.rangeZone, { backgroundColor: SEMANTIC.success.base }]} />
            <View style={[styles.rangeZone, { backgroundColor: SEMANTIC.warning.base, opacity: 0.6 }]} />
          </View>
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>Low</Text>
            <Text style={[styles.rangeLabel, styles.rangeLabelCenter]}>Goal</Text>
            <Text style={styles.rangeLabel}>High</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Expanded view
  return (
    <View style={styles.card}>
      <View style={styles.headerExpanded}>
        <View style={[styles.iconBgLarge, { backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}20` }]}>
          <Ionicons name="water" size={32} color={VIBRANT_WELLNESS.hydration.solid} />
        </View>
        <View style={styles.headerTextExpanded}>
          <Text style={styles.titleExpanded}>Hydration</Text>
          <Text style={styles.subtitleExpanded}>
            {waterLogs.length} days tracked
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.bigStatusCard, { borderLeftColor: status.color }]}>
        <View style={styles.bigStatusContent}>
          <Ionicons name={status.icon} size={32} color={status.color} />
          <View style={styles.bigStatusText}>
            <Text style={[styles.bigStatusTitle, { color: status.color }]}>{status.text}</Text>
            <Text style={styles.bigStatusValue}>{avgHydration} ml/day average</Text>
          </View>
        </View>
      </View>

      {/* Target Range */}
      <View style={styles.targetSection}>
        <Text style={styles.sectionTitle}>Your Target</Text>
        <View style={styles.targetCard}>
          <View style={styles.targetItem}>
            <Text style={styles.targetValue}>{TARGET_MIN}</Text>
            <Text style={styles.targetLabel}>ml minimum</Text>
          </View>
          <Ionicons name="remove" size={20} color={TEXT.tertiary} />
          <View style={styles.targetItem}>
            <Text style={styles.targetValue}>{TARGET_MAX}</Text>
            <Text style={styles.targetLabel}>ml maximum</Text>
          </View>
        </View>
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb" size={20} color={VIBRANT_WELLNESS.hydration.solid} />
        <Text style={styles.tipText}>
          Staying hydrated helps you feel more focused and energetic
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  avgText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Range Section
  rangeSection: {
    gap: SPACING[2],
  },
  rangeBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rangeZone: {
    flex: 1,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  rangeLabelCenter: {
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Expanded View
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  iconBgLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextExpanded: {
    flex: 1,
  },
  titleExpanded: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitleExpanded: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Big Status Card
  bigStatusCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  bigStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  bigStatusText: {
    flex: 1,
  },
  bigStatusTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  bigStatusValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },

  // Target Section
  targetSection: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[4],
    borderRadius: RADIUS.md,
    gap: SPACING[4],
  },
  targetItem: {
    alignItems: 'center',
  },
  targetValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  targetLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
});
