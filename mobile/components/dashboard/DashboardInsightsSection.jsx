import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import InsightsCard from './InsightsCard';
import { BRAND, ICONS, ICON_SIZES } from '../../constants/premiumTheme';

export default function DashboardInsightsSection({
  styles,
  smartInsights,
  onInsightAction,
  dataAnomalies,
}) {
  if (smartInsights.length === 0 && dataAnomalies.length === 0) {
    return null;
  }

  return (
    <>
      {smartInsights.length > 0 && (
        <InsightsCard
          insights={smartInsights}
          onActionPress={onInsightAction}
        />
      )}

      {dataAnomalies.length > 0 && (
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
    </>
  );
}
