import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import InsightNudge from './InsightNudge';
import { BRAND, ICONS, ICON_SIZES } from '../../constants/premiumTheme';

/**
 * DashboardInsightsSection
 *
 * Premium Design: Shows ONLY the single most important insight
 * This follows "Calm Luxury" philosophy - no overwhelm, one clear message
 *
 * Priority order:
 * 1. Warning anomalies (highest priority)
 * 2. Actionable insights
 * 3. Success anomalies
 * 4. Welcome messages (lowest priority)
 */
export default function DashboardInsightsSection({
  styles,
  smartInsights,
  onInsightAction,
  dataAnomalies,
}) {
  // Pick the single most important insight to show
  const primaryInsight = useMemo(() => {
    // Priority 1: Warning anomalies (urgent) - from data analysis
    const warningAnomaly = dataAnomalies.find(a => a.tone === 'warning');
    if (warningAnomaly) {
      return {
        type: 'warning',
        isDataAnomaly: true, // Flag to show as GlassCard
        icon: warningAnomaly.icon || 'alert-circle',
        message: warningAnomaly.message,
        title: `${warningAnomaly.metric} Check`,
        actionLabel: warningAnomaly.actionLabel,
        action: warningAnomaly.action,
        percentageDiff: warningAnomaly.percentageDiff,
      };
    }

    // Priority 2: Actionable insights (reminders, suggestions, warnings from smart insights)
    const actionableInsight = smartInsights.find(i => i.type !== 'welcome' && i.type !== 'info');
    if (actionableInsight) {
      // Preserve original type (warning, reminder, etc.) - don't map to 'default'
      const insightType = ['warning', 'reminder', 'success'].includes(actionableInsight.type)
        ? actionableInsight.type
        : 'default';
      return {
        type: insightType,
        icon: actionableInsight.icon,
        title: actionableInsight.title, // Include title for GlassCard display
        message: actionableInsight.message || actionableInsight.title, // Use message, fallback to title
        actionLabel: actionableInsight.action,
        action: () => onInsightAction(actionableInsight),
      };
    }

    // Priority 3: Success anomalies (celebrations)
    const successAnomaly = dataAnomalies.find(a => a.tone === 'success');
    if (successAnomaly) {
      return {
        type: 'success',
        icon: successAnomaly.icon || 'checkmark-circle',
        message: successAnomaly.message,
        actionLabel: successAnomaly.actionLabel,
        action: successAnomaly.action,
      };
    }

    // Priority 4: Welcome/info messages
    const welcomeInsight = smartInsights.find(i => i.type === 'welcome' || i.type === 'info');
    if (welcomeInsight) {
      return {
        type: 'welcome',
        icon: welcomeInsight.icon,
        message: welcomeInsight.message,
        actionLabel: welcomeInsight.action,
        action: () => onInsightAction(welcomeInsight),
      };
    }

    // Priority 5: Any remaining non-warning anomalies
    const otherAnomaly = dataAnomalies[0];
    if (otherAnomaly) {
      return {
        type: 'reminder',
        icon: otherAnomaly.icon,
        message: otherAnomaly.message,
        actionLabel: otherAnomaly.actionLabel,
        action: otherAnomaly.action,
      };
    }

    return null;
  }, [smartInsights, dataAnomalies, onInsightAction]);

  if (!primaryInsight) {
    return null;
  }

  // For warning-level insights from DATA ANOMALIES only, show the larger card format
  // Smart insight warnings should use the subtle nudge format with warning colors
  if (primaryInsight.type === 'warning' && primaryInsight.isDataAnomaly) {
    return (
      <GlassCard style={styles.infoCard} padding="md">
        <View style={styles.anomalyHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={primaryInsight.icon || ICONS.info}
              size={ICON_SIZES.lg}
              color={BRAND.primary}
            />
          </View>
          <View style={styles.anomalyTextContainer}>
            <View style={styles.anomalyTitleRow}>
              <Text style={styles.infoTitle}>{primaryInsight.title}</Text>
              {primaryInsight.percentageDiff !== undefined && (
                <View style={styles.percentageBadge}>
                  <Text style={styles.percentageText}>
                    {primaryInsight.percentageDiff}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.infoMessage}>
              {primaryInsight.message}
            </Text>
            {primaryInsight.actionLabel && primaryInsight.action && (
              <TouchableOpacity
                style={styles.anomalyActionButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  primaryInsight.action();
                }}
                accessibilityRole="button"
                accessibilityLabel={primaryInsight.actionLabel}
              >
                <Text style={styles.anomalyActionText}>
                  {primaryInsight.actionLabel}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={BRAND.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    );
  }

  // For all other insights, show the subtle nudge format
  return (
    <InsightNudge
      icon={primaryInsight.icon}
      message={primaryInsight.message}
      actionLabel={primaryInsight.actionLabel}
      onAction={primaryInsight.action}
      type={primaryInsight.type}
    />
  );
}
