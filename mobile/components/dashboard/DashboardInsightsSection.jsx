import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import InsightNudge from './InsightNudge';
import { BRAND, ICONS, ICON_SIZES } from '../../constants/premiumTheme';

/**
 * DashboardInsightsSection
 *
 * Displays insights in two ways:
 * 1. Subtle nudges (InsightNudge) - for welcome messages, gentle reminders
 * 2. Cards (GlassCard) - only for important anomalies that need attention
 *
 * This follows UX best practices: non-intrusive, dismissible, doesn't overwhelm
 */
export default function DashboardInsightsSection({
  styles,
  smartInsights,
  onInsightAction,
  dataAnomalies,
}) {
  if (smartInsights.length === 0 && dataAnomalies.length === 0) {
    return null;
  }

  // Separate welcome/gentle insights from actionable ones
  const welcomeInsights = smartInsights.filter(i => i.type === 'welcome' || i.type === 'info');
  const actionableInsights = smartInsights.filter(i => i.type !== 'welcome' && i.type !== 'info');

  return (
    <>
      {/* Subtle nudges for welcome messages and gentle reminders */}
      {welcomeInsights.map((insight, index) => (
        <InsightNudge
          key={`nudge-${index}`}
          icon={insight.icon}
          message={insight.message}
          actionLabel={insight.action}
          onAction={() => onInsightAction(insight)}
          type="welcome"
        />
      ))}

      {/* Subtle nudges for other non-critical insights */}
      {actionableInsights.map((insight, index) => (
        <InsightNudge
          key={`insight-${index}`}
          icon={insight.icon}
          message={insight.title || insight.message}
          actionLabel={insight.action}
          onAction={() => onInsightAction(insight)}
          type={insight.type === 'reminder' ? 'reminder' : 'default'}
        />
      ))}

      {/* Only show large card for truly important anomalies */}
      {dataAnomalies.length > 0 && dataAnomalies[0].tone === 'warning' && (
        <GlassCard style={styles.infoCard} padding="md">
          <View style={styles.anomalyHeader}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={dataAnomalies[0].icon || ICONS.info}
                size={ICON_SIZES.lg}
                color={BRAND.primary}
              />
            </View>
            <View style={styles.anomalyTextContainer}>
              <View style={styles.anomalyTitleRow}>
                <Text style={styles.infoTitle}>{dataAnomalies[0].metric} Check</Text>
                {dataAnomalies[0].percentageDiff !== undefined && (
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>
                      {dataAnomalies[0].percentageDiff}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoMessage}>
                {dataAnomalies[0].message}
              </Text>
              {dataAnomalies[0].actionLabel && dataAnomalies[0].action && (
                <TouchableOpacity
                  style={styles.anomalyActionButton}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dataAnomalies[0].action();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={dataAnomalies[0].actionLabel}
                >
                  <Text style={styles.anomalyActionText}>
                    {dataAnomalies[0].actionLabel}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={BRAND.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GlassCard>
      )}

      {/* Non-warning anomalies as nudges too */}
      {dataAnomalies.filter(a => a.tone !== 'warning').map((anomaly, index) => (
        <InsightNudge
          key={`anomaly-${index}`}
          icon={anomaly.icon}
          message={anomaly.message}
          actionLabel={anomaly.actionLabel}
          onAction={anomaly.action}
          type={anomaly.tone === 'success' ? 'success' : 'reminder'}
        />
      ))}
    </>
  );
}
