import React, { useMemo } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { TEXT, SURFACES } from '../../constants/premiumTheme';

// Single source of truth for stage progression
const STAGE_PROGRESSION = {
  DISCOVERER: { duration: 1, color: '#DBEAFE', emoji: '🌱', name: 'Discoverer' },
  BUILDER: { duration: 5, color: '#FEF3C7', emoji: '🏗️', name: 'Builder' },
  TRACKER: { duration: 23, color: '#FED7AA', emoji: '📊', name: 'Tracker' },
  OPTIMIZER: { duration: 60, color: '#FDBA74', emoji: '⚡', name: 'Optimizer' },
  MASTER: { duration: 90, color: '#BBEF63', emoji: '🧠', name: 'Master' },
  CHAMPION: { duration: 185, color: '#A7F3D0', emoji: '👑', name: 'Champion' },
  ELITE: { duration: Infinity, color: '#BAE6FD', emoji: '🏆', name: 'Elite' },
};

const STAGE_ORDER = ['DISCOVERER', 'BUILDER', 'TRACKER', 'OPTIMIZER', 'MASTER', 'CHAMPION', 'ELITE'];

/**
 * LifecycleStageIndicator
 *
 * Shows user's current lifecycle stage and progress to next stage.
 * Displayed in footer of dashboard.
 *
 * Uses single source of truth (STAGE_PROGRESSION) to compute progress accurately.
 *
 * @param {Object} props
 * @param {string} props.stage - Current lifecycle stage key
 * @param {number} props.daysSinceStart - Total days since user started (single source of truth)
 * @returns {JSX.Element}
 */
export function LifecycleStageIndicator({
  stage = 'DISCOVERER',
  daysSinceStart = 0,
}) {
  const stageData = useMemo(() => {
    const current = STAGE_PROGRESSION[stage];
    if (!current) return null;

    // Find next stage
    const currentIndex = STAGE_ORDER.indexOf(stage);
    const nextIndex = currentIndex + 1;
    const nextStageName = nextIndex < STAGE_ORDER.length
      ? STAGE_ORDER[nextIndex]
      : stage;
    const nextStage = STAGE_PROGRESSION[nextStageName];

    // Calculate cumulative days for this stage start (sum of all previous stage durations)
    let stageDaysStart = 0;
    for (let i = 0; i < currentIndex; i++) {
      stageDaysStart += STAGE_PROGRESSION[STAGE_ORDER[i]].duration;
    }

    // Days into current stage
    const daysInStage = daysSinceStart - stageDaysStart;

    // Days until next stage (clamped to 0)
    const daysToNextStage = Math.max(
      0,
      current.duration - daysInStage
    );

    // Progress to next stage (0-1, clamped)
    const progressPercent = current.duration === Infinity
      ? 1
      : Math.min(
          1,
          Math.max(0, daysInStage / current.duration)
        );

    return {
      current,
      nextStage,
      daysInStage,
      daysToNextStage,
      progressPercent,
      isElite: stage === 'ELITE',
    };
  }, [stage, daysSinceStart]);

  if (!stageData) return null;

  const {
    current,
    nextStage,
    daysToNextStage,
    progressPercent,
    isElite,
  } = stageData;

  return (
    <View
      style={[styles.container, { backgroundColor: current.color }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Your lifecycle stage: ${current.name}`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progressPercent * 100),
        text: isElite
          ? `Elite unlocked. Long-term patterns now enabled.`
          : `${daysToNextStage} more days to ${nextStage.name}`,
      }}
    >
      {/* Stage Badge */}
      <View style={styles.header}>
        <Text
          style={styles.emoji}
          accessible={false}
        >
          {current.emoji}
        </Text>
        <Text
          style={styles.stageName}
          accessibilityRole="header"
        >
          Your Stage: {current.name}
        </Text>
      </View>

      {/* Progress to Next Stage */}
      {!isElite && (
        <View style={styles.progressSection}>
          <Text
            style={styles.nextStageText}
            accessibilityLabel={`${daysToNextStage} more days until ${nextStage.name} stage`}
          >
            {daysToNextStage} more days → {nextStage.name}
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
      {isElite && (
        <Text
          style={styles.eliteText}
          accessibilityRole="header"
          accessibilityLabel="Elite unlocked. Long-term patterns now enabled."
        >
          Elite unlocked — long-term patterns now enabled.
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
