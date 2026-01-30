/**
 * Sleep Summary Card
 *
 * Compact card showing last night's sleep on the dashboard
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
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';
import { useSleepLog, SLEEP_QUALITY_LABELS } from '../../hooks/useSleepLog';
import SleepLogger from '../SleepLogger';

export default function SleepSummaryCard({ compact = true }) {
  const router = useRouter();
  const { lastSleep, isLoading } = useSleepLog();
  const [showLogger, setShowLogger] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!lastSleep) {
      setShowLogger(true);
    } else {
      router.push('/insights/sleep-analytics');
    }
  };

  const handleLogSleep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogger(true);
  };

  // Get quality label
  const getQualityInfo = (quality) => {
    const label = SLEEP_QUALITY_LABELS.find(l => l.value === quality);
    return label || SLEEP_QUALITY_LABELS[6]; // Default to 7
  };

  // Format duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // No data state
  if (!lastSleep && !isLoading) {
    return (
      <>
        <TouchableOpacity
          style={styles.card}
          onPress={handleLogSleep}
          activeOpacity={0.7}
        >
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}20` }]}>
              <Ionicons name="moon" size={24} color={VIBRANT_WELLNESS.sleep.solid} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Sleep</Text>
              <Text style={styles.subtitle}>Track your rest</Text>
            </View>
            <View style={styles.logButton}>
              <Ionicons name="add" size={20} color={VIBRANT_WELLNESS.sleep.solid} />
            </View>
          </View>
          <Text style={styles.emptyText}>
            Log last night's sleep to see how it affects your day
          </Text>
        </TouchableOpacity>
        <SleepLogger visible={showLogger} onClose={() => setShowLogger(false)} />
      </>
    );
  }

  const qualityInfo = getQualityInfo(lastSleep?.quality || 7);
  const durationMinutes = lastSleep?.durationMinutes || 0;

  // Determine sleep quality status
  const getSleepStatus = () => {
    if (durationMinutes < 360) return { text: 'Need More Rest', color: SEMANTIC.warning.base, icon: 'alert-circle' };
    if (durationMinutes >= 420 && durationMinutes <= 540) return { text: 'Well Rested', color: SEMANTIC.success.base, icon: 'checkmark-circle' };
    if (durationMinutes > 600) return { text: 'Overslept', color: SEMANTIC.info.base, icon: 'time' };
    return { text: 'Good Sleep', color: SEMANTIC.success.base, icon: 'thumbs-up' };
  };

  const sleepStatus = getSleepStatus();

  if (compact) {
    return (
      <>
        <View
          style={styles.card}
          accessibilityLabel="Sleep summary"
        >
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}20` }]}>
              <Ionicons name="moon" size={24} color={VIBRANT_WELLNESS.sleep.solid} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Sleep</Text>
              <Text style={styles.subtitle}>Last night</Text>
            </View>
            <TouchableOpacity onPress={handleLogSleep} style={styles.logButton}>
              <Ionicons name="add" size={20} color={VIBRANT_WELLNESS.sleep.solid} />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDuration(durationMinutes)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.qualityBadge}>
                <Ionicons name={qualityInfo.icon} size={16} color={qualityInfo.color} />
                <Text style={[styles.qualityText, { color: qualityInfo.color }]}>
                  {lastSleep?.quality}/10
                </Text>
              </View>
              <Text style={styles.statLabel}>Quality</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${sleepStatus.color}15` }]}>
            <Ionicons name={sleepStatus.icon} size={16} color={sleepStatus.color} />
            <Text style={[styles.statusText, { color: sleepStatus.color }]}>{sleepStatus.text}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/insights/sleep-analytics');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="analytics-outline" size={14} color={VIBRANT_WELLNESS.sleep.solid} />
              <Text style={styles.actionButtonText}>Insights</Text>
              <Ionicons name="chevron-forward" size={12} color={TEXT.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLogSleep}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={14} color={VIBRANT_WELLNESS.sleep.solid} />
              <Text style={styles.actionButtonText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>
        <SleepLogger visible={showLogger} onClose={() => setShowLogger(false)} />
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.background.secondary,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  qualityText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}10`,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${VIBRANT_WELLNESS.sleep.solid}20`,
  },
  actionButtonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
});
