/**
 * Stress Summary Card
 *
 * Compact card showing today's stress level on the dashboard
 * Clean, user-friendly design with quick logging action
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
} from '../../constants/premiumTheme';
import { useStressLog, STRESS_LEVELS } from '../../hooks/useStressLog';
import StressLogger from '../StressLogger';

// Stress color gradient
const STRESS_COLORS = [
  '#10B981', '#10B981', '#22C55E', '#22C55E', '#F59E0B',
  '#F59E0B', '#F97316', '#F97316', '#EF4444', '#EF4444',
];

export default function StressSummaryCard({ compact = true }) {
  const router = useRouter();
  const { todaySummary, isLoading } = useStressLog();
  const [showLogger, setShowLogger] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!todaySummary?.avgLevel) {
      setShowLogger(true);
    } else {
      router.push('/insights/stress-patterns');
    }
  };

  const handleLogStress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogger(true);
  };

  // Get stress info
  const getStressInfo = (level) => {
    const info = STRESS_LEVELS.find(l => l.value === Math.round(level));
    return info || STRESS_LEVELS[4]; // Default to level 5
  };

  // No data state
  if (!todaySummary?.avgLevel && !isLoading) {
    return (
      <>
        <TouchableOpacity
          style={styles.card}
          onPress={handleLogStress}
          activeOpacity={0.7}
        >
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: `${SEMANTIC.warning.base}20` }]}>
              <Ionicons name="pulse" size={24} color={SEMANTIC.warning.base} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Stress</Text>
              <Text style={styles.subtitle}>Check in</Text>
            </View>
            <View style={styles.logButton}>
              <Ionicons name="add" size={20} color={SEMANTIC.warning.base} />
            </View>
          </View>
          <Text style={styles.emptyText}>
            Track stress to understand what helps you stay calm
          </Text>
        </TouchableOpacity>
        <StressLogger visible={showLogger} onClose={() => setShowLogger(false)} />
      </>
    );
  }

  const avgLevel = Math.round(todaySummary?.avgLevel || 5);
  const stressInfo = getStressInfo(avgLevel);
  const stressColor = STRESS_COLORS[avgLevel - 1] || STRESS_COLORS[4];
  const checkInCount = todaySummary?.checkInCount || 0;
  const topTrigger = todaySummary?.topTriggers?.[0];

  // Get status based on level
  const getStressStatus = () => {
    if (avgLevel <= 3) return { text: 'Feeling Calm', icon: 'leaf' };
    if (avgLevel <= 5) return { text: 'Moderate', icon: 'water' };
    if (avgLevel <= 7) return { text: 'Elevated', icon: 'warning' };
    return { text: 'High Stress', icon: 'alert-circle' };
  };

  const stressStatus = getStressStatus();

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityLabel="Stress summary"
          accessibilityRole="button"
        >
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: `${stressColor}20` }]}>
              <Ionicons name="pulse" size={24} color={stressColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Stress</Text>
              <Text style={styles.subtitle}>
                {checkInCount} check-in{checkInCount !== 1 ? 's' : ''} today
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogStress} style={styles.logButton}>
              <Ionicons name="add" size={20} color={stressColor} />
            </TouchableOpacity>
          </View>

          {/* Level Display */}
          <View style={styles.levelRow}>
            <View style={[styles.levelCircle, { backgroundColor: `${stressColor}20`, borderColor: stressColor }]}>
              <Text style={[styles.levelValue, { color: stressColor }]}>{avgLevel}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelLabel, { color: stressColor }]}>{stressInfo.label}</Text>
              <Text style={styles.levelDescription}>{stressInfo.description}</Text>
            </View>
          </View>

          {/* Status and Trigger */}
          <View style={styles.footer}>
            <View style={[styles.statusBadge, { backgroundColor: `${stressColor}15` }]}>
              <Ionicons name={stressStatus.icon} size={14} color={stressColor} />
              <Text style={[styles.statusText, { color: stressColor }]}>{stressStatus.text}</Text>
            </View>
            {topTrigger && (
              <Text style={styles.triggerText}>
                Top trigger: {topTrigger}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <StressLogger visible={showLogger} onClose={() => setShowLogger(false)} />
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    ...SHADOWS.sm,
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
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  logButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Level Display
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  levelCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  levelDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  triggerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
