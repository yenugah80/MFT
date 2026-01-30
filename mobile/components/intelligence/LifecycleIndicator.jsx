/**
 * LifecycleIndicator - Shows user's journey stage and data quality
 *
 * Stages: DISCOVERER → BUILDER → TRACKER → OPTIMIZER → MASTER
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
} from '../../constants/premiumTheme';

const STAGES = {
  DISCOVERER: {
    index: 0,
    icon: 'compass',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
    label: 'Getting Started',
    shortLabel: 'Start',
    description: 'Learning your habits',
    minDays: 0,
  },
  BUILDER: {
    index: 1,
    icon: 'construct',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#60A5FA'],
    label: 'Building Profile',
    shortLabel: 'Build',
    description: 'Collecting enough data',
    minDays: 3,
  },
  TRACKER: {
    index: 2,
    icon: 'analytics',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
    label: 'Finding Patterns',
    shortLabel: 'Patterns',
    description: 'Discovering what works for you',
    minDays: 8,
  },
  OPTIMIZER: {
    index: 3,
    icon: 'trending-up',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
    label: 'Personalized',
    shortLabel: 'Custom',
    description: 'Custom insights for you',
    minDays: 31,
  },
  MASTER: {
    index: 4,
    icon: 'trophy',
    color: '#EC4899',
    gradient: ['#EC4899', '#F472B6'],
    label: 'Expert',
    shortLabel: 'Expert',
    description: 'Deep personalized insights',
    minDays: 91,
  },
};

const STAGE_ORDER = ['DISCOVERER', 'BUILDER', 'TRACKER', 'OPTIMIZER', 'MASTER'];

export default function LifecycleIndicator({
  userContext,
  compact = false,
}) {
  if (!userContext) return null;

  const {
    lifecycleStage = 'DISCOVERER',
    stageLabel,
    daysActive = 0,
    dataQuality = {},
  } = userContext;

  const currentStage = STAGES[lifecycleStage] || STAGES.DISCOVERER;
  const currentIndex = currentStage.index;

  // Calculate progress to next stage
  const nextStageKey = STAGE_ORDER[currentIndex + 1];
  const nextStage = nextStageKey ? STAGES[nextStageKey] : null;
  const progressToNext = nextStage
    ? Math.min((daysActive - currentStage.minDays) / (nextStage.minDays - currentStage.minDays), 1)
    : 1;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <LinearGradient
          colors={currentStage.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.compactBadge}
        >
          <Ionicons name={currentStage.icon} size={14} color="#FFFFFF" />
          <Text style={styles.compactLabel}>{currentStage.label}</Text>
        </LinearGradient>
        <Text style={styles.compactDays}>{daysActive} days logged</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={currentStage.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons name={currentStage.icon} size={24} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.stageLabel}>{currentStage.label}</Text>
            <Text style={styles.stageDescription}>{currentStage.description}</Text>
          </View>
        </View>
        <View style={styles.daysContainer}>
          <Text style={styles.daysValue}>{daysActive}</Text>
          <Text style={styles.daysLabel}>days logged</Text>
        </View>
      </View>

      {/* Stage progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.stageTrack}>
          {STAGE_ORDER.map((stageKey, index) => {
            const stage = STAGES[stageKey];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLocked = index > currentIndex;

            return (
              <React.Fragment key={stageKey}>
                {/* Stage dot */}
                <View style={styles.stageDotContainer}>
                  <View
                    style={[
                      styles.stageDot,
                      isCompleted && { backgroundColor: stage.color },
                      isCurrent && styles.currentDot,
                      isLocked && styles.lockedDot,
                    ]}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                    {isCurrent && (
                      <View style={[styles.currentDotInner, { backgroundColor: stage.color }]} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stageDotLabel,
                      isCurrent && { color: stage.color, fontWeight: TYPOGRAPHY.weight.semibold },
                    ]}
                  >
                    {stage.shortLabel}
                  </Text>
                </View>

                {/* Connector line */}
                {index < STAGE_ORDER.length - 1 && (
                  <View style={styles.connectorContainer}>
                    <View
                      style={[
                        styles.connector,
                        isCompleted && { backgroundColor: stage.color },
                      ]}
                    />
                    {isCurrent && (
                      <View
                        style={[
                          styles.connectorProgress,
                          {
                            width: `${progressToNext * 100}%`,
                            backgroundColor: stage.color,
                          },
                        ]}
                      />
                    )}
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Data quality indicators */}
      {dataQuality && (
        <View style={styles.qualityContainer}>
          <Text style={styles.qualityTitle}>Your Progress</Text>
          <View style={styles.qualityMetrics}>
            <View style={styles.qualityMetric}>
              <Text style={styles.qualityValue}>{dataQuality.observations || 0}</Text>
              <Text style={styles.qualityLabel}>Entries Logged</Text>
            </View>
            <View style={styles.qualityDivider} />
            <View style={styles.qualityMetric}>
              <Text style={styles.qualityValue}>{dataQuality.correlations || 0}</Text>
              <Text style={styles.qualityLabel}>Patterns Found</Text>
            </View>
            <View style={styles.qualityDivider} />
            <View style={styles.qualityMetric}>
              <Text style={styles.qualityValue}>
                {dataQuality.avgConfidence
                  ? `${Math.round(dataQuality.avgConfidence * 100)}%`
                  : '—'}
              </Text>
              <Text style={styles.qualityLabel}>Accuracy</Text>
            </View>
          </View>
        </View>
      )}

      {/* Next milestone */}
      {nextStage && (
        <View style={styles.milestoneContainer}>
          <Ionicons name="flag" size={14} color={TEXT.tertiary} />
          <Text style={styles.milestoneText}>
            Log {nextStage.minDays - daysActive} more days to unlock "{nextStage.label}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  stageDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  daysContainer: {
    alignItems: 'center',
  },
  daysValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  daysLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  progressContainer: {
    marginBottom: SPACING[4],
  },
  stageTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stageDotContainer: {
    alignItems: 'center',
    width: 50,
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SURFACES.divider,
  },
  currentDot: {
    borderColor: BRAND.primary,
    backgroundColor: SURFACES.card.primary,
  },
  currentDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lockedDot: {
    opacity: 0.4,
  },
  stageDotLabel: {
    fontSize: 9,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
    textAlign: 'center',
  },
  connectorContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  connector: {
    height: 2,
    backgroundColor: SURFACES.divider,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  connectorProgress: {
    height: 2,
    position: 'absolute',
    left: 0,
  },
  qualityContainer: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  qualityTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  qualityMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityMetric: {
    flex: 1,
    alignItems: 'center',
  },
  qualityValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  qualityLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  qualityDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider,
  },
  milestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    justifyContent: 'center',
  },
  milestoneText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  compactLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  compactDays: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
