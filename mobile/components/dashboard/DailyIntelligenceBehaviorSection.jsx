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
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  const router = useRouter();

  // Animation for section entry
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Callbacks MUST be defined before any returns (React Hooks Rule)
  const handleCorrelationDismiss = useCallback((correlationId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRequestDismiss?.(correlationId);
  }, [onRequestDismiss]);

  const handleAction = useCallback((action) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAction?.(action);
  }, [onAction]);

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

  // SILENT decision: Don't show anything - user finds "You're on track" unnecessary
  // The dashboard already shows progress, no need to repeat it
  if (decision?.type === 'SILENT') {
    return null;
  }

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
          <View style={componentStyles.correlationsHeader}>
            <Text
              style={componentStyles.correlationsTitle}
              accessibilityRole="header"
              accessibilityLabel="Other Patterns"
            >
              Other Patterns
            </Text>
            <TouchableOpacity
              style={componentStyles.viewAllButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/insights/patterns');
              }}
              accessibilityRole="button"
              accessibilityLabel="View all pattern insights"
            >
              <Text style={componentStyles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
          <FlatList
            scrollEnabled={false}
            data={correlations}
            keyExtractor={(item) => `correlation-${item.id}`}
            renderItem={({ item }) => (
              <View style={componentStyles.correlationCardContainer}>
                <CorrelationCard
                  id={item.id}
                  pattern={item.pattern}
                  confidence={item.confidence}
                  occurrences={item.occurrences}
                  affectedDomains={item.affectedDomains}
                  whatHappens={item.whatHappens}
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

      {/* Learning hint - only show for truly new users (DISCOVERER stage), not returning users
          Returning users with data shouldn't see generic "log more" messages */}
      {orchestratorData?.learningState?.canShowCorrelations === false &&
       ['DISCOVERER', 'ONBOARDING'].includes(orchestratorData?.lifecycle?.stage) && (
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
    // DailyIntelligenceCard handles its own marginHorizontal
    marginBottom: SPACING[2],
  },

  correlationsWrapper: {
    paddingHorizontal: SPACING[4],
    marginTop: SPACING[3],
  },

  correlationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },

  correlationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
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
