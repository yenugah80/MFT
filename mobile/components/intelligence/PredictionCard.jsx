/**
 * PredictionCard - Displays AI predictions with confidence visualization
 *
 * Shows:
 * - Prediction statement with timeframe
 * - Confidence level with visual indicator
 * - Contributing factors
 * - Prevention/optimization strategies
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const PREDICTION_TYPES = {
  energy: {
    icon: 'flash',
    gradient: VIBRANT_WELLNESS.activity.gradient,
    color: VIBRANT_WELLNESS.activity.solid,
    label: 'Energy Forecast',
  },
  mood: {
    icon: 'happy',
    gradient: VIBRANT_WELLNESS.mood.gradient,
    color: VIBRANT_WELLNESS.mood.solid,
    label: 'Mood Forecast',
  },
  nutrients: {
    icon: 'nutrition',
    gradient: VIBRANT_WELLNESS.nutrition.gradient,
    color: VIBRANT_WELLNESS.nutrition.solid,
    label: 'Nutrient Projection',
  },
  hydration: {
    icon: 'water',
    gradient: VIBRANT_WELLNESS.hydration.gradient,
    color: VIBRANT_WELLNESS.hydration.solid,
    label: 'Hydration Forecast',
  },
};

export default function PredictionCard({
  type = 'energy',
  prediction,
  onPress,
  compact = false,
}) {
  if (!prediction) return null;

  const {
    statement,
    confidence = 0,
    factors = [],
    strategies = [],
    timeframe,
    hourlyLevels,
  } = prediction;

  const typeConfig = PREDICTION_TYPES[type] || PREDICTION_TYPES.energy;
  const confidencePercent = Math.round(confidence * 100);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(prediction);
  };

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.6) return '#F59E0B';
    return '#6B7280';
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handlePress} activeOpacity={0.7}>
        <LinearGradient
          colors={typeConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <Ionicons name={typeConfig.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.compactContent}>
          <Text style={styles.compactLabel}>{typeConfig.label}</Text>
          <Text style={styles.compactStatement} numberOfLines={2}>{statement}</Text>
        </View>
        <View style={styles.compactConfidence}>
          <Text style={[styles.confidenceValue, { color: getConfidenceColor() }]}>
            {confidencePercent}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <LinearGradient
        colors={typeConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name={typeConfig.icon} size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerLabel}>{typeConfig.label}</Text>
              {timeframe && (
                <Text style={styles.timeframe}>{timeframe}</Text>
              )}
            </View>
          </View>
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceRing}>
              <Text style={styles.confidenceRingValue}>{confidencePercent}%</Text>
            </View>
            <Text style={styles.confidenceLabel}>confidence</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Statement */}
      <View style={styles.body}>
        <Text style={styles.statement}>{statement}</Text>

        {/* Hourly visualization if available */}
        {hourlyLevels && hourlyLevels.length > 0 && (
          <View style={styles.hourlyContainer}>
            <Text style={styles.sectionTitle}>Hourly Forecast</Text>
            <View style={styles.hourlyChart}>
              {hourlyLevels.slice(0, 12).map((level, index) => {
                const height = Math.max(level.value * 40, 8);
                return (
                  <View key={index} style={styles.hourlyBar}>
                    <View
                      style={[
                        styles.hourlyBarFill,
                        {
                          height,
                          backgroundColor: level.value >= 0.7 ? '#10B981' :
                            level.value >= 0.4 ? '#F59E0B' : '#EF4444',
                        },
                      ]}
                    />
                    <Text style={styles.hourlyLabel}>{level.hour || index + 6}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Contributing factors */}
        {factors.length > 0 && (
          <View style={styles.factorsContainer}>
            <Text style={styles.sectionTitle}>Contributing Factors</Text>
            {factors.slice(0, 3).map((factor, index) => (
              <View key={index} style={styles.factorRow}>
                <View style={[
                  styles.factorDot,
                  { backgroundColor: factor.impact === 'positive' ? '#10B981' : '#EF4444' }
                ]} />
                <Text style={styles.factorText}>{factor.description || factor}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Prevention/optimization strategies */}
        {strategies.length > 0 && (
          <View style={styles.strategiesContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {strategies.slice(0, 2).map((strategy, index) => (
              <View key={index} style={styles.strategyCard}>
                <Ionicons name="bulb" size={16} color={typeConfig.color} />
                <Text style={styles.strategyText}>{strategy}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Confidence bar at bottom */}
      <View style={styles.confidenceBar}>
        <View
          style={[
            styles.confidenceBarFill,
            {
              width: `${confidencePercent}%`,
              backgroundColor: getConfidenceColor(),
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    shadowColor: '#3D3633',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    padding: SPACING[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  timeframe: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  confidenceRingValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING[1],
  },
  body: {
    padding: SPACING[4],
  },
  statement: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 26,
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  hourlyContainer: {
    marginBottom: SPACING[4],
  },
  hourlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    paddingTop: SPACING[2],
  },
  hourlyBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hourlyBarFill: {
    width: '60%',
    borderRadius: RADIUS.sm,
    minHeight: 8,
  },
  hourlyLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  factorsContainer: {
    marginBottom: SPACING[4],
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[1],
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  factorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    flex: 1,
  },
  strategiesContainer: {},
  strategyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
  },
  strategyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    flex: 1,
    lineHeight: 20,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: SURFACES.background.tertiary,
  },
  confidenceBarFill: {
    height: '100%',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    gap: SPACING[3],
  },
  compactGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  compactStatement: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    lineHeight: 18,
    marginTop: 2,
  },
  compactConfidence: {
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
});
