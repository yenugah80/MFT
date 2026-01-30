/**
 * MoodInsightCard - AI-Powered Mood Insights Display
 *
 * Features:
 * - Displays AI-generated insights with confidence scores
 * - Color-coded confidence badges
 * - Expandable suggestions
 * - Refresh functionality
 * - Loading states
 * - Professional disclaimer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
} from '../../constants/premiumTheme';

const MoodInsightCard = ({
  insights = [],
  loading = false,
  onRefresh,
  minDataMessage = null,
}) => {
  const [expandedInsights, setExpandedInsights] = useState(new Set());

  const toggleExpand = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInsights(newExpanded);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRefresh?.();
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return SEMANTIC.success.base;
    if (confidence >= 0.7) return SEMANTIC.info.base;
    if (confidence >= 0.6) return SEMANTIC.warning.base;
    return SEMANTIC.danger.base;
  };

  // Get confidence label
  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.6) return 'Moderate';
    return 'Low';
  };

  // Get insight icon
  const getInsightIcon = (type) => {
    const iconMap = {
      'Meal-Mood Pattern': 'restaurant',
      'Energy Pattern': 'flash',
      'Meal Timing': 'time',
      'NOVA Impact': 'analytics',
      'Macro Balance': 'pie-chart',
    };
    return iconMap[type] || 'bulb';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[SEMANTIC.info.base, SEMANTIC.info.light]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="bulb" size={ICON_SIZES.md} color={TEXT.white} />
          </LinearGradient>
          <View>
            <Text style={styles.title}>AI Insights</Text>
            <Text style={styles.subtitle}>Personalized from your logs</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          disabled={loading}
        >
          <Ionicons
            name="refresh"
            size={ICON_SIZES.md}
            color={loading ? SEMANTIC.info.light : SEMANTIC.info.base}
            style={loading ? styles.spinning : null}
          />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SEMANTIC.info.base} />
          <Text style={styles.loadingText}>Analyzing your mood patterns...</Text>
        </View>
      )}

      {/* Minimum Data Message */}
      {!loading && minDataMessage && (
        <View style={styles.minDataContainer}>
          <Ionicons name="information-circle" size={ICON_SIZES.lg} color={SEMANTIC.warning.base} />
          <Text style={styles.minDataText}>{minDataMessage}</Text>
          <Text style={styles.minDataSubtext}>
            Keep logging your mood and meals to unlock AI-powered insights!
          </Text>
        </View>
      )}

      {/* Insights List */}
      {!loading && !minDataMessage && insights.length > 0 && (
        <ScrollView style={styles.insightsContainer} showsVerticalScrollIndicator={false}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              {/* Insight Header */}
              <TouchableOpacity
                style={styles.insightHeader}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.insightHeaderLeft}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: getConfidenceColor(insight.confidence) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getInsightIcon(insight.type)}
                      size={ICON_SIZES.sm}
                      color={getConfidenceColor(insight.confidence)}
                    />
                  </View>

                  <View style={styles.insightHeaderText}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightType}>{insight.type}</Text>
                  </View>
                </View>

                <View style={styles.insightHeaderRight}>
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: getConfidenceColor(insight.confidence) },
                    ]}
                  >
                    <Text style={styles.confidenceText}>
                      {Math.round(insight.confidence * 100)}%
                    </Text>
                    <Text style={styles.confidenceLabel}>
                      {getConfidenceLabel(insight.confidence)}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedInsights.has(index) ? 'chevron-up' : 'chevron-down'}
                    size={ICON_SIZES.sm}
                    color={SEMANTIC.info.base}
                  />
                </View>
              </TouchableOpacity>

              {/* Insight Message */}
              <Text style={styles.insightMessage}>{insight.message}</Text>

              {/* Expandable Suggestions */}
              {expandedInsights.has(index) && insight.suggestions && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
                  {insight.suggestions.map((suggestion, i) => (
                    <View key={i} style={styles.suggestionRow}>
                      <View style={styles.suggestionBullet} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Empty State */}
      {!loading && !minDataMessage && insights.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={48} color={SEMANTIC.info.base} />
          <Text style={styles.emptyText}>No insights yet</Text>
          <Text style={styles.emptySubtext}>
            We need more data to generate meaningful insights
          </Text>
        </View>
      )}

      {/* Professional Disclaimer */}
      {!loading && insights.length > 0 && (
        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={ICON_SIZES.xs} color={SEMANTIC.info.base} />
          <Text style={styles.disclaimerText}>
            AI-generated insights. Consult a healthcare professional for medical advice.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    marginTop: SPACING[0.5],
  },
  refreshButton: {
    padding: SPACING[2],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    marginTop: SPACING[3],
  },
  minDataContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
  },
  minDataText: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'center',
    marginTop: SPACING[3],
  },
  minDataSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  insightsContainer: {
    maxHeight: 600,
  },
  insightCard: {
    backgroundColor: SEMANTIC.info.light,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: SEMANTIC.info.base,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightHeaderText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  insightType: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    marginTop: SPACING[0.5],
  },
  insightHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  confidenceBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 60,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.white,
    opacity: 0.9,
  },
  insightMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    lineHeight: 20,
    marginBottom: SPACING[2],
  },
  suggestionsContainer: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SEMANTIC.info.base,
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING[2],
  },
  suggestionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SEMANTIC.info.base,
    marginTop: 6,
    marginRight: SPACING[2],
  },
  suggestionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.info.base,
    marginTop: SPACING[3],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    marginTop: SPACING[1],
    textAlign: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SEMANTIC.info.light,
  },
  disclaimerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.info.base,
    lineHeight: 16,
  },
});

export default MoodInsightCard;
