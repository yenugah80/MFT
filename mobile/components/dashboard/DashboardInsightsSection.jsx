import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import InsightNudge from './InsightNudge';
import { BRAND, ICONS, ICON_SIZES, SEMANTIC } from '../../constants/premiumTheme';

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

  const primaryAnomaly = dataAnomalies[0];
  const isWarning = primaryAnomaly?.tone === 'warning';
  const accentColor = isWarning ? SEMANTIC.warning.base : BRAND.primary;
  const percentageLabel = primaryAnomaly?.percentageLabel
    || (primaryAnomaly?.percentageDiff !== undefined ? `${primaryAnomaly.percentageDiff}%` : null);

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
      {dataAnomalies.length > 0 && isWarning && (
        <GlassCard style={styles.infoCard} padding="md">
          <View style={styles.anomalyHeader}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={primaryAnomaly.icon || ICONS.info}
                size={ICON_SIZES.lg}
                color={accentColor}
              />
            </View>
            <View style={styles.anomalyTextContainer}>
              <View style={styles.anomalyTitleRow}>
                <Text style={styles.infoTitle}>{primaryAnomaly.metric} Check</Text>
                {percentageLabel && (
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>
                      {percentageLabel}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoMessage}>
                {primaryAnomaly.message}
              </Text>
              {primaryAnomaly.actionLabel && primaryAnomaly.action && (
                <TouchableOpacity
                  style={[styles.anomalyActionButton, isWarning && styles.anomalyActionButtonWarning]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    primaryAnomaly.action();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={primaryAnomaly.actionLabel}
                >
                  <Text style={[styles.anomalyActionText, isWarning && styles.anomalyActionTextWarning]}>
                    {primaryAnomaly.actionLabel}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={isWarning ? '#FFFFFF' : BRAND.primary} />
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
