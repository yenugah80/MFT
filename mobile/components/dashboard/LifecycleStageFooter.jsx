/**
 * LifecycleStageFooter
 *
 * Wrapper component that displays user lifecycle stage progression.
 * Receives orchestratorData as prop (NOT fetched here).
 * Passes lifecycle information to LifecycleStageIndicator.
 *
 * ARCHITECTURE: Single data source in parent (DashboardContent)
 *
 * @param {Object} props
 * @param {Object} props.orchestratorData - From useOrchestrator() in DashboardContent
 * @returns {JSX.Element|null}
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LifecycleStageIndicator } from './LifecycleStageIndicator';
import { SPACING } from '../../constants/designTokens';

export function LifecycleStageFooter({ orchestratorData }) {
  // Guard: no lifecycle data
  if (!orchestratorData?.lifecycle) {
    return null;
  }

  const { lifecycle } = orchestratorData;

  return (
    <View
      style={styles.container}
      accessibilityRole="footer"
      accessibilityLabel="User lifecycle stage indicator"
    >
      <LifecycleStageIndicator
        stage={lifecycle.stage}
        daysSinceStart={lifecycle.daysSinceStart}
        daysInStage={lifecycle.daysInCurrentStage}
        daysToNextStage={lifecycle.daysToNextStage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    marginTop: SPACING[4],
  },
});
