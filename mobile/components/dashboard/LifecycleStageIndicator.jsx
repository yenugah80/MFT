import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { TEXT, SURFACES } from '../../constants/premiumTheme';

/**
 * LifecycleStageIndicator
 *
 * Shows user's current lifecycle stage and progress to next stage.
 * Displayed in footer of dashboard.
 *
 * Stages:
 * - DISCOVERER (0-1d) - Blue
 * - BUILDER (2-6d) - Yellow
 * - TRACKER (7-29d) - Amber
 * - OPTIMIZER (30-89d) - Orange
 * - MASTER (90-179d) - Green
 * - CHAMPION (180-364d) - Emerald
 * - ELITE (365+d) - Blue
 *
 * @param {Object} props
 * @param {string} props.stage - Current lifecycle stage
 * @param {number} props.daysInStage - Days user has been in current stage
 * @param {number} props.daysToNextStage - Days until next stage
 * @returns {JSX.Element}
 */
export function LifecycleStageIndicator({
  stage,
  daysInStage,
  daysToNextStage,
}) {
  const stageColors = {
    DISCOVERER: '#DBEAFE',  // Light blue
    BUILDER: '#FEF3C7',     // Yellow
    TRACKER: '#FED7AA',     // Amber
    OPTIMIZER: '#FDBA74',   // Orange
    MASTER: '#BBEF63',      // Green
    CHAMPION: '#A7F3D0',    // Emerald
    ELITE: '#BAE6FD',       // Blue
  };

  const stageEmojis = {
    DISCOVERER: '🌱',
    BUILDER: '🏗️',
    TRACKER: '📊',
    OPTIMIZER: '⚡',
    MASTER: '🧠',
    CHAMPION: '👑',
    ELITE: '🏆',
  };

  const stageNames = {
    DISCOVERER: 'Discoverer',
    BUILDER: 'Builder',
    TRACKER: 'Tracker',
    OPTIMIZER: 'Optimizer',
    MASTER: 'Master',
    CHAMPION: 'Champion',
    ELITE: 'Elite',
  };

  const nextStageMap = {
    DISCOVERER: 'BUILDER',
    BUILDER: 'TRACKER',
    TRACKER: 'OPTIMIZER',
    OPTIMIZER: 'MASTER',
    MASTER: 'CHAMPION',
    CHAMPION: 'ELITE',
    ELITE: 'ELITE',
  };

  const nextStage = nextStageMap[stage] || stage;
  const stageColor = stageColors[stage] || '#F3F4F6';
  const emoji = stageEmojis[stage] || '✨';
  const stageName = stageNames[stage] || stage;
  const nextStageName = stageNames[nextStage] || nextStage;

  // Progress to next stage (0-1)
  const progressPercent = daysToNextStage > 0
    ? Math.max(0, 1 - (daysToNextStage / (daysInStage + daysToNextStage)))
    : 1;

  return (
    <View style={[styles.container, { backgroundColor: stageColor }]}>
      {/* Stage Badge */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.stageName}>
          Your Stage: {stageName}
        </Text>
      </View>

      {/* Progress to Next Stage */}
      {stage !== 'ELITE' && (
        <View style={styles.progressSection}>
          <Text style={styles.nextStageText}>
            {daysToNextStage} more days → {nextStageName}
          </Text>
          <View style={styles.progressBar}>
            <ProgressBar
              current={progressPercent}
              goal={1}
              showPercent={false}
              unit=""
              height={6}
            />
          </View>
        </View>
      )}

      {/* Elite Status */}
      {stage === 'ELITE' && (
        <Text style={styles.eliteText}>
          You've reached the elite level! 🎉
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 20,
  },
  stageName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  progressSection: {
    gap: 8,
  },
  nextStageText: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  progressBar: {
    marginTop: 4,
  },
  eliteText: {
    fontSize: 13,
    color: TEXT.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
