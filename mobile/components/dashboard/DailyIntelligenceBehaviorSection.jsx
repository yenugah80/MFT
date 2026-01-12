/**
 * DailyIntelligenceBehaviorSection (CORRECTED)
 *
 * Wrapper for behavioral health intelligence display.
 * Renders:
 * 1. DailyIntelligenceCard (main decision: SPEAK/REINFORCE/PREDICT/SILENT)
 * 2. CorrelationCard list (supporting patterns)
 * 3. NO modal (callbacks only)
 *
 * CRITICAL FIX: Receives orchestratorData as prop (single fetch in parent)
 *
 * @param {Object} props
 * @param {Object} props.orchestratorData - From useOrchestrator() in DashboardContent
 * @param {Function} props.onRequestDismiss - Callback: (correlationId) => parent shows modal
 * @param {Function} props.onAction - Callback: (action) => parent handles action
 * @returns {JSX.Element|null}
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';

// Components
import { DailyIntelligenceCard } from './DailyIntelligenceCard';
import { CorrelationCard } from './CorrelationCard';
import { QuietConfidenceCard } from './QuietConfidenceCard';

// Design tokens
import { SPACING } from '../../constants/designTokens';
import { TEXT } from '../../constants/premiumTheme';

/**
 * Main render component - CORRECTED ARCHITECTURE
 */
export default function DailyIntelligenceBehaviorSection({
  orchestratorData,      // ← Passed from parent (NOT fetched here)
  onRequestDismiss,      // ← Callback to parent (NO modal state here)
  onAction,
}) {
  // Animation for section entry
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Guard: no data
  if (!orchestratorData) {
    return null;
  }

  // Support both V1 (message) and V2 (decision) contract
  const decision = orchestratorData?.message ?? orchestratorData?.decision;
  const { correlations = [] } = orchestratorData;

  // Guard: no decision
  if (!decision) {
    return null;
  }

  // SILENT decision: Show quiet confirmation (no patterns)
  if (decision?.type === 'SILENT') {
    return (
      <Animated.View
        style={[componentStyles.container, { opacity: fadeAnim }]}
        accessibilityRole="summary"
        accessibilityLabel="Daily health status: All metrics on track"
      >
        <QuietConfidenceCard />
      </Animated.View>
    );
  }

  // SPEAK/REINFORCE/PREDICT: Show main card + correlations
  const handleCorrelationDismiss = useCallback((correlationId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRequestDismiss?.(correlationId);
  }, [onRequestDismiss]);

  const handleAction = useCallback((action) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAction?.(action);
  }, [onAction]);

  return (
    <Animated.View
      style={[componentStyles.container, { opacity: fadeAnim }]}
      testID="daily-intelligence-section"
      accessibilityRole="summary"
      accessibilityLabel="Daily health intelligence and pattern insights"
    >
      {/* Main Decision Card */}
      <View style={componentStyles.mainCardWrapper}>
        <DailyIntelligenceCard
          type={decision.type}
          headline={decision.headline}
          subtitle={decision.subtitle}
          confidence={decision.confidence}
          confidenceLabel={decision.confidenceLabel}
          actions={decision.actions || []}
          onAction={handleAction}
          lifecycleStage={orchestratorData.lifecycle?.stage}
        />
      </View>

      {/* Supporting Correlations */}
      {orchestratorData?.learningState?.canShowCorrelations !== false && correlations?.length > 0 && (
        <View style={componentStyles.correlationsWrapper}>
          <Text
            style={componentStyles.correlationsTitle}
            accessibilityRole="header"
            accessibilityLabel="Other Patterns"
          >
            Other Patterns
          </Text>
          <FlatList
            scrollEnabled={false}
            data={correlations}
            keyExtractor={(item) => `correlation-${item.id}`}
            renderItem={({ item }) => (
              <View style={componentStyles.correlationCardContainer}>
                <CorrelationCard
                  id={item.id}
                  headline={item.pattern}
                  confidence={item.confidence}
                  occurrences={item.occurrences}
                  affectedDomains={item.affectedDomains}
                  whatHappens={item.whatHappens}
                  evidence={item.evidence}
                  onDismiss={() => handleCorrelationDismiss(item.id)}
                />
              </View>
            )}
            ItemSeparatorComponent={() => (
              <View style={componentStyles.itemSeparator} />
            )}
          />
        </View>
      )}

      {/* Learning hint */}
      {orchestratorData?.learningState?.canShowCorrelations === false && (
        <View style={componentStyles.hintContainer}>
          <Text style={componentStyles.hintText}>
            Log more meals to discover patterns
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const componentStyles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: SPACING[3],
  },

  mainCardWrapper: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[2],
  },

  correlationsWrapper: {
    paddingHorizontal: SPACING[4],
    marginTop: SPACING[3],
  },

  correlationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },

  correlationCardContainer: {
    width: '100%',
  },

  itemSeparator: {
    height: SPACING[2],
  },

  hintContainer: {
    marginTop: SPACING[4],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },

  hintText: {
    fontSize: 12,
    color: '#047857',
  },
});
