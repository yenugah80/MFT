/**
 * PredictiveInsightCard - Premium Predictive Analytics Display
 *
 * Design Philosophy:
 * - Story-first predictions with visual evidence
 * - Shows what might happen and why
 * - Confidence-based presentation
 * - Actionable next steps
 *
 * Types:
 * - energy: Predicts energy levels throughout the day
 * - mood: Shows mood-food correlations
 * - nutrient: Projects nutrient deficiencies
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 64;

// ============================================================================
// TYPE CONFIGURATIONS
// ============================================================================

const INSIGHT_TYPES = {
  energy: {
    icon: 'flash',
    gradient: ['#F59E0B', '#D97706'],
    color: '#F59E0B',
    title: 'Energy Prediction',
    subtitle: 'Based on meal timing patterns',
  },
  mood: {
    icon: 'happy',
    gradient: ['#8B5CF6', '#7C3AED'],
    color: '#8B5CF6',
    title: 'Mood-Food Correlation',
    subtitle: 'Discovered from your logs',
  },
  nutrient: {
    icon: 'nutrition',
    gradient: ['#10B981', '#059669'],
    color: '#10B981',
    title: 'Nutrient Projection',
    subtitle: 'Next 7 days trajectory',
  },
};

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

function ConfidenceIndicator({ score }) {
  const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
  const config = {
    high: { label: 'High confidence', color: PREMIUM_COLORS.semantic.success.primary },
    medium: { label: 'Medium confidence', color: PREMIUM_COLORS.semantic.warning.primary },
    low: { label: 'Low confidence', color: PREMIUM_COLORS.text.tertiary },
  };

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: `${config[level].color}15` }]}>
      <Ionicons name="shield-checkmark" size={12} color={config[level].color} />
      <Text style={[styles.confidenceText, { color: config[level].color }]}>
        {score}% • {config[level].label}
      </Text>
    </View>
  );
}

// ============================================================================
// ENERGY PREDICTION CHART
// ============================================================================

function EnergyChart({ prediction }) {
  const data = {
    labels: ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'],
    datasets: [
      {
        data: prediction.hourlyLevels || [75, 80, 70, 45, 60, 75, 65],
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Find the dip point
  const minIdx = data.datasets[0].data.indexOf(Math.min(...data.datasets[0].data));
  const dipTime = data.labels[minIdx];

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={data}
        width={chartWidth}
        height={160}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: PREMIUM_COLORS.surface.primary,
          backgroundGradientTo: PREMIUM_COLORS.surface.primary,
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
          strokeWidth: 3,
          decimalPlaces: 0,
          propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: '#F59E0B',
            fill: PREMIUM_COLORS.surface.primary,
          },
          propsForLabels: {
            fontSize: 10,
            fill: PREMIUM_COLORS.text.tertiary,
          },
          propsForBackgroundLines: {
            stroke: PREMIUM_COLORS.border.light,
            strokeDasharray: '4 4',
          },
        }}
        bezier
        withHorizontalLines
        withVerticalLines={false}
        withOuterLines={false}
        style={styles.chart}
      />
      {/* Highlight dip */}
      <View style={styles.dipIndicator}>
        <Ionicons name="arrow-down" size={14} color="#D97706" />
        <Text style={styles.dipText}>Expected dip at {dipTime}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// MOOD CORRELATION CHART
// ============================================================================

function MoodCorrelationChart({ correlation }) {
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: correlation.moodScores || [7, 6, 8, 5, 7, 8, 7],
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <BarChart
        data={data}
        width={chartWidth}
        height={160}
        yAxisSuffix=""
        yAxisLabel=""
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: PREMIUM_COLORS.surface.primary,
          backgroundGradientTo: PREMIUM_COLORS.surface.primary,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          barPercentage: 0.6,
          decimalPlaces: 0,
          propsForLabels: {
            fontSize: 10,
            fill: PREMIUM_COLORS.text.tertiary,
          },
          propsForBackgroundLines: {
            stroke: PREMIUM_COLORS.border.light,
            strokeDasharray: '4 4',
          },
        }}
        withHorizontalLines
        withInnerLines={false}
        showValuesOnTopOfBars
        style={styles.chart}
      />
      {/* Correlation insight */}
      <View style={styles.correlationInsight}>
        <View style={[styles.correlationDot, { backgroundColor: '#8B5CF6' }]} />
        <Text style={styles.correlationText}>
          {correlation.factor || 'High-sugar lunches'} → {correlation.percentage || 67}% of low mood days
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// NUTRIENT PROJECTION
// ============================================================================

function NutrientProjection({ projection }) {
  const nutrients = projection.nutrients || [
    { name: 'Vitamin K', current: 66, target: 100, projected: 75, unit: 'mcg' },
    { name: 'Iron', current: 72, target: 100, projected: 68, unit: 'mg' },
    { name: 'Fiber', current: 85, target: 100, projected: 90, unit: 'g' },
  ];

  return (
    <View style={styles.projectionContainer}>
      {nutrients.map((nutrient, idx) => {
        const isAtRisk = nutrient.projected < 80;
        return (
          <View key={idx} style={styles.nutrientRow}>
            <View style={styles.nutrientHeader}>
              <Text style={styles.nutrientName}>{nutrient.name}</Text>
              <Text style={[
                styles.nutrientProjected,
                { color: isAtRisk ? PREMIUM_COLORS.semantic.warning.primary : PREMIUM_COLORS.semantic.success.primary }
              ]}>
                {nutrient.projected}% by Sun
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              {/* Background */}
              <View style={styles.progressBarBg} />
              {/* Current level */}
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${nutrient.current}%`,
                    backgroundColor: isAtRisk
                      ? PREMIUM_COLORS.semantic.warning.primary
                      : PREMIUM_COLORS.semantic.success.primary,
                  },
                ]}
              />
              {/* Projected indicator */}
              <View
                style={[
                  styles.projectedIndicator,
                  { left: `${nutrient.projected}%` },
                ]}
              />
            </View>
            <View style={styles.nutrientLabels}>
              <Text style={styles.nutrientCurrent}>Now: {nutrient.current}%</Text>
              <Text style={styles.nutrientTarget}>Target: 100%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PredictiveInsightCard({
  type = 'energy',
  prediction = {},
  confidence = 75,
  dataPoints = 14,
  onPress,
  onAction,
  style,
}) {
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.energy;

  // Build the prevention/action text
  const actionText = useMemo(() => {
    switch (type) {
      case 'energy':
        return prediction.prevention || 'Have a protein-rich snack at 1pm to maintain energy';
      case 'mood':
        return prediction.suggestion || 'Try a balanced lunch to improve afternoon mood';
      case 'nutrient':
        return prediction.recommendation || 'Add leafy greens to 2 meals this week';
      default:
        return 'Take action to improve this pattern';
    }
  }, [type, prediction]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      {/* Header with gradient */}
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </LinearGradient>

      {/* Main content */}
      <View style={styles.content}>
        {/* The prediction statement */}
        <Text style={styles.predictionText}>
          {prediction.statement || `Based on your patterns, we predict changes in your ${type} levels.`}
        </Text>

        {/* Chart based on type */}
        {type === 'energy' && <EnergyChart prediction={prediction} />}
        {type === 'mood' && <MoodCorrelationChart correlation={prediction} />}
        {type === 'nutrient' && <NutrientProjection projection={prediction} />}

        {/* Confidence & data */}
        <View style={styles.metaRow}>
          <ConfidenceIndicator score={confidence} />
          <Text style={styles.dataPointsText}>{dataPoints} days of data</Text>
        </View>

        {/* Action suggestion */}
        <View style={styles.actionContainer}>
          <View style={styles.actionLeft}>
            <Ionicons name="bulb" size={18} color={config.color} />
            <Text style={styles.actionText}>{actionText}</Text>
          </View>
          {onAction && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: config.color }]}
              onPress={handleAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Try this</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255,255,255,0.8)',
  },

  // Content
  content: {
    padding: SPACING[4],
  },
  predictionText: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
    marginBottom: SPACING[4],
  },

  // Chart container
  chartContainer: {
    marginBottom: SPACING[4],
  },
  chart: {
    borderRadius: RADIUS.lg,
    marginLeft: -SPACING[4],
  },
  dipIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1.5],
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  dipText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: '#D97706',
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Correlation
  correlationInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
    padding: SPACING[3],
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
  },
  correlationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  correlationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: '#6D28D9',
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Nutrient projection
  projectionContainer: {
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  nutrientRow: {
    gap: SPACING[2],
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientName: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  nutrientProjected: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: PREMIUM_COLORS.border.light,
    borderRadius: 4,
    position: 'relative',
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PREMIUM_COLORS.border.light,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  projectedIndicator: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 12,
    backgroundColor: PREMIUM_COLORS.text.muted,
    borderRadius: 2,
    marginLeft: -2,
  },
  nutrientLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutrientCurrent: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },
  nutrientTarget: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  dataPointsText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },

  // Action
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[3],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginRight: SPACING[3],
  },
  actionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
});
