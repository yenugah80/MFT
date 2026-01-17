/**
 * Stress Patterns Screen
 *
 * Detailed view of stress patterns with:
 * - Stress level trends
 * - Trigger analysis
 * - Coping strategy effectiveness
 * - Tips for managing stress
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import {
  useStressLog,
  STRESS_LEVELS,
  STRESS_TRIGGERS,
  COPING_STRATEGIES,
} from '../../hooks/useStressLog';

// Stress color gradient
const STRESS_COLORS = [
  '#10B981', '#10B981', '#22C55E', '#22C55E', '#F59E0B',
  '#F59E0B', '#F97316', '#F97316', '#EF4444', '#EF4444',
];

export default function StressPatternsScreen() {
  const router = useRouter();
  const {
    stressLogs,
    todaySummary,
    patterns,
    isLoading,
    refetch,
  } = useStressLog();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Get stress info
  const getStressInfo = (level) => {
    const info = STRESS_LEVELS.find(l => l.value === Math.round(level));
    return info || STRESS_LEVELS[4];
  };

  // Calculate stats
  const avgLevel = patterns?.weekAvg || todaySummary?.avgLevel || 5;
  const topTriggers = patterns?.topTriggers || todaySummary?.topTriggers || [];
  const copingEffectiveness = patterns?.copingEffectiveness || [];
  const highStressDays = patterns?.highStressDays || 0;

  const stressInfo = getStressInfo(avgLevel);
  const stressColor = STRESS_COLORS[Math.round(avgLevel) - 1] || STRESS_COLORS[4];

  // Get status message
  const getStatusMessage = () => {
    if (avgLevel <= 3) return { text: 'Low Stress Week', icon: 'leaf', color: SEMANTIC.success.base };
    if (avgLevel <= 5) return { text: 'Moderate Stress', icon: 'water', color: SEMANTIC.info.base };
    if (avgLevel <= 7) return { text: 'Elevated Stress', icon: 'warning', color: SEMANTIC.warning.base };
    return { text: 'High Stress', icon: 'alert-circle', color: SEMANTIC.danger.base };
  };

  const status = getStatusMessage();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[stressColor, `${stressColor}CC`]}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="pulse" size={32} color="#FFF" />
          <Text style={styles.headerTitle}>Stress Patterns</Text>
          <Text style={styles.headerSubtitle}>Your stress trends</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={stressColor}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.levelCircle, { backgroundColor: `${stressColor}20`, borderColor: stressColor }]}>
                <Text style={[styles.levelValue, { color: stressColor }]}>{avgLevel.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Avg Level</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={28} color={SEMANTIC.warning.base} />
              <Text style={styles.statValue}>{highStressDays}</Text>
              <Text style={styles.statLabel}>High Stress Days</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-done" size={28} color={SEMANTIC.success.base} />
              <Text style={styles.statValue}>{stressLogs?.length || 0}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
          <View style={styles.statusContent}>
            <Ionicons name={status.icon} size={28} color={status.color} />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: status.color }]}>
                {status.text}
              </Text>
              <Text style={styles.statusDescription}>
                {stressInfo.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Triggers */}
        {topTriggers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Triggers</Text>
            <View style={styles.triggersList}>
              {topTriggers.slice(0, 4).map((trigger, index) => {
                const triggerInfo = STRESS_TRIGGERS.find(t => t.key === trigger.key || t.key === trigger);
                const triggerKey = typeof trigger === 'string' ? trigger : trigger.key;
                const count = trigger.count || 1;
                return (
                  <View key={index} style={styles.triggerItem}>
                    <View style={[styles.triggerIcon, { backgroundColor: `${SEMANTIC.warning.base}15` }]}>
                      <Ionicons
                        name={triggerInfo?.icon || 'help'}
                        size={20}
                        color={SEMANTIC.warning.base}
                      />
                    </View>
                    <View style={styles.triggerContent}>
                      <Text style={styles.triggerLabel}>{triggerInfo?.label || triggerKey}</Text>
                      <Text style={styles.triggerCount}>{count} times</Text>
                    </View>
                    <View style={styles.triggerBar}>
                      <View
                        style={[
                          styles.triggerBarFill,
                          { width: `${Math.min(100, (count / (topTriggers[0]?.count || count)) * 100)}%` }
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* What Helps */}
        {copingEffectiveness.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Helps You</Text>
            <View style={styles.copingList}>
              {copingEffectiveness.slice(0, 4).map((coping, index) => {
                const strategy = COPING_STRATEGIES.find(s => s.key === coping.key || s.key === coping);
                const strategyKey = typeof coping === 'string' ? coping : coping.key;
                const effectiveness = coping.effectiveness || 75;
                return (
                  <View key={index} style={styles.copingItem}>
                    <View style={[styles.copingIcon, { backgroundColor: `${SEMANTIC.success.base}15` }]}>
                      <Ionicons
                        name={strategy?.icon || 'heart'}
                        size={20}
                        color={SEMANTIC.success.base}
                      />
                    </View>
                    <View style={styles.copingContent}>
                      <Text style={styles.copingLabel}>{strategy?.label || strategyKey}</Text>
                      <View style={styles.effectivenessBar}>
                        <View
                          style={[
                            styles.effectivenessBarFill,
                            { width: `${effectiveness}%` }
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.effectivenessText}>{effectiveness}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Check-ins</Text>
          {stressLogs?.slice(0, 5).map((log, index) => {
            const level = log.level || 5;
            const color = STRESS_COLORS[level - 1] || STRESS_COLORS[4];
            const info = getStressInfo(level);
            return (
              <View key={log.id || index} style={styles.logItem}>
                <View style={styles.logDate}>
                  <Text style={styles.logDateText}>
                    {new Date(log.loggedDate || log.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.logDetails}>
                  <View style={[styles.logLevelBadge, { backgroundColor: `${color}15` }]}>
                    <Text style={[styles.logLevelText, { color }]}>{level}/10</Text>
                  </View>
                  <Text style={[styles.logLevelLabel, { color }]}>{info.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Managing Stress</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={SEMANTIC.info.base} />
            <Text style={styles.tipText}>
              Take a few deep breaths when you notice stress building. Even 60 seconds of focused breathing can help.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={SEMANTIC.info.base} />
            <Text style={styles.tipText}>
              Regular check-ins help you spot patterns. Try logging stress at the same times each day.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },

  // Header
  header: {
    paddingTop: SPACING[2],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[4],
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
    marginBottom: SPACING[2],
  },
  headerContent: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Sections
  section: {
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.sm,
  },
  levelCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Status Card
  statusCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING[4],
    marginBottom: SPACING[5],
    ...SHADOWS.sm,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  statusDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Triggers List
  triggersList: {
    gap: SPACING[2],
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    gap: SPACING[3],
    ...SHADOWS.sm,
  },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerContent: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  triggerCount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  triggerBar: {
    width: 60,
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  triggerBarFill: {
    height: '100%',
    backgroundColor: SEMANTIC.warning.base,
    borderRadius: 3,
  },

  // Coping List
  copingList: {
    gap: SPACING[2],
  },
  copingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    gap: SPACING[3],
    ...SHADOWS.sm,
  },
  copingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copingContent: {
    flex: 1,
  },
  copingLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  effectivenessBar: {
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  effectivenessBarFill: {
    height: '100%',
    backgroundColor: SEMANTIC.success.base,
    borderRadius: 3,
  },
  effectivenessText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.success.base,
    width: 40,
    textAlign: 'right',
  },

  // Log Items
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    ...SHADOWS.sm,
  },
  logDate: {
    flex: 1,
  },
  logDateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
  },
  logDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  logLevelBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  logLevelText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  logLevelLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: `${SEMANTIC.info.base}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
});
