/**
 * HydrationEnergyScreen - 24-hour timeline showing hydration-energy relationship
 * Interactive visualization with optimal timing recommendations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Circle as SvgCircle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/designSystem';

const mockData = {
  discovery: {
    statement: 'You recover 40% faster when hydrating within 30 min of activity.',
    improvement: 40,
    timing: 'Within 30 min of activity',
    confidence: 0.81,
    dataPoints: 14,
  },

  schedule: [
    {
      time: '6am',
      volume: 300,
      context: 'with breakfast',
      benefit: 'Activates metabolism',
      outcome: 'Energy lift by 7am',
    },
    {
      time: '10am',
      volume: 300,
      context: 'before energy dip',
      benefit: 'Prevents 10:30am crash',
      outcome: 'Concentration peaks to 11am',
    },
    {
      time: '1pm',
      volume: 400,
      context: 'with meal',
      benefit: 'Aids digestion',
      outcome: 'Sustains afternoon energy',
    },
    {
      time: '4pm',
      volume: 250,
      context: 'before 5pm',
      benefit: 'Prepares for exercise',
      outcome: 'Reduces post-activity crash',
    },
    {
      time: '5:15pm',
      volume: 500,
      context: 'after activity',
      benefit: 'CRITICAL - Recovery',
      outcome: '40% faster recovery',
      isCritical: true,
    },
    {
      time: '7pm',
      volume: 300,
      context: 'with dinner',
      benefit: 'Completes daily goal',
      outcome: 'Better sleep quality',
    },
  ],

  personalPattern: {
    highHydration: {
      energy: 7.4,
      mood: 7.1,
      sleep: 8.2,
      days: 12,
    },
    lowHydration: {
      energy: 6.1,
      mood: 6.3,
      sleep: 6.8,
      days: 9,
    },
    difference: {
      energy: 1.3,
      mood: 0.8,
      sleep: 1.4,
    },
    confidence: 0.87,
    period: 21,
  },
};

function TimelineVisualization() {
  const width = Dimensions.get('window').width - SPACING.lg * 2;
  const height = 120;
  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Sample hourly data (24 hours)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const energyValues = [5, 5.2, 5, 5.5, 6, 6.5, 7, 7.2, 7.5, 7.3, 6.8, 7.2, 7.8, 7.6, 6.2, 6.8, 7.2, 7.8, 7.5, 7, 6.5, 6, 5.5, 5.2];
  const hydrationValues = [1, 0.5, 0, 0, 0.5, 1.5, 2.5, 2, 2.5, 3, 2.5, 2, 3.5, 4, 1.5, 1, 4.5, 3, 2, 1.5, 1, 0.8, 0.5, 0];

  // Scale values
  const maxEnergy = 10;
  const maxHydration = 5;

  const energyPoints = energyValues
    .map((val, i) => ({
      x: (i / (hours.length - 1)) * graphWidth + padding,
      y: height - padding - (val / maxEnergy) * graphHeight,
    }));

  const hydrationPoints = hydrationValues
    .map((val, i) => ({
      x: (i / (hours.length - 1)) * graphWidth + padding,
      y: height - padding - (val / maxHydration) * (graphHeight * 0.4), // Hydration on different scale
    }));

  const energyPointsString = energyPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const hydrationPointsString = hydrationPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.insights.primary} />
          <Stop offset="100%" stopColor={COLORS.insights.primary} stopOpacity="0.1" />
        </SvgGradient>
        <SvgGradient id="hydrationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.hydration.primary} />
          <Stop offset="100%" stopColor={COLORS.hydration.primary} stopOpacity="0.1" />
        </SvgGradient>
      </Defs>

      {/* Energy line */}
      <Polyline
        points={energyPointsString}
        stroke={COLORS.insights.primary}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hydration line */}
      <Polyline
        points={hydrationPointsString}
        stroke={COLORS.hydration.primary}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="5,5"
      />

      {/* Legend */}
      <Text x={padding} y={height - 5} fontSize="10" fill={COLORS.insights.primary}>
        — Energy
      </Text>
      <Text x={padding + 80} y={height - 5} fontSize="10" fill={COLORS.hydration.primary}>
        ··· Hydration
      </Text>
    </Svg>
  );
}

export default function HydrationEnergyScreen() {
  const router = useRouter();
  const [loading] = useState(false);

  const handleSetReminders = () => {
    console.log('Set water reminders');
  };

  const handleViewTrends = () => {
    // Navigate to trends screen
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.hydration.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Energy & Hydration</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerButton}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.title}>💧 Your Hydration Powers Energy</Text>
        </View>

        {/* 24-Hour Timeline */}
        <View style={[styles.card, SHADOWS.md]}>
          <Text style={styles.cardTitle}>24-Hour Timeline</Text>
          <TimelineVisualization />
          <View style={styles.timelineNote}>
            <Text style={styles.timelineNoteText}>
              Energy (purple line) vs Hydration (blue dotted line). Notice the dip at 3pm
              without water.
            </Text>
          </View>
        </View>

        {/* Key Discovery */}
        <View style={styles.section}>
          <LinearGradient
            colors={[COLORS.hydration.primary, COLORS.hydration.primary + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.discoveryCard, SHADOWS.md]}
          >
            <Text style={styles.discoveryTitle}>🎯 Key Discovery</Text>
            <Text style={styles.discoveryStatement}>{mockData.discovery.statement}</Text>

            <View style={styles.discoveryMetrics}>
              <View style={styles.discoveryMetric}>
                <Text style={styles.discoveryLabel}>Recovery improvement:</Text>
                <Text style={styles.discoveryValue}>{mockData.discovery.improvement}%</Text>
              </View>

              <View style={styles.discoveryMetric}>
                <Text style={styles.discoveryLabel}>Optimal timing:</Text>
                <Text style={styles.discoveryValue}>{mockData.discovery.timing}</Text>
              </View>

              <View style={styles.discoveryMetric}>
                <Text style={styles.discoveryLabel}>
                  Confidence: {Math.round(mockData.discovery.confidence * 100)}% ({mockData.discovery.dataPoints} days)
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Optimal Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Optimal Hydration Schedule</Text>
          {mockData.schedule.map((slot, index) => (
            <View
              key={index}
              style={[
                styles.scheduleItem,
                slot.isCritical && {
                  borderLeftColor: COLORS.semantic.danger,
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                },
                SHADOWS.sm,
              ]}
            >
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>{slot.time}</Text>
                {slot.isCritical && (
                  <Text style={styles.scheduleCritical}>CRITICAL</Text>
                )}
              </View>

              <View style={styles.scheduleContent}>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleVolume}>{slot.volume}ml</Text>
                  <Text style={styles.scheduleContext}>{slot.context}</Text>
                </View>

                <Text style={styles.scheduleBenefit}>💡 {slot.benefit}</Text>
                <Text style={styles.scheduleOutcome}>→ {slot.outcome}</Text>
              </View>
            </View>
          ))}

          <View style={styles.scheduleSummary}>
            <Text style={styles.scheduleSummaryText}>
              Total: 2.05L water per day
            </Text>
          </View>
        </View>

        {/* Personal Pattern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Personal Pattern</Text>

          <View style={[styles.patternCard, SHADOWS.md]}>
            <View style={styles.patternGroup}>
              <Text style={styles.patternLabel}>Days with 2L+ water:</Text>
              <View style={styles.patternMetrics}>
                <View style={styles.patternMetric}>
                  <Text style={styles.patternValue}>{mockData.personalPattern.highHydration.energy.toFixed(1)}/10</Text>
                  <Text style={styles.patternMetricLabel}>Energy</Text>
                </View>
                <View style={styles.patternMetric}>
                  <Text style={styles.patternValue}>{mockData.personalPattern.highHydration.mood.toFixed(1)}/10</Text>
                  <Text style={styles.patternMetricLabel}>Mood</Text>
                </View>
                <View style={styles.patternMetric}>
                  <Text style={styles.patternValue}>{mockData.personalPattern.highHydration.sleep.toFixed(1)}/10</Text>
                  <Text style={styles.patternMetricLabel}>Sleep</Text>
                </View>
              </View>
            </View>

            <View style={styles.patternDivider} />

            <View style={styles.patternGroup}>
              <Text style={styles.patternLabel}>Days with &lt;1.5L water:</Text>
              <View style={styles.patternMetrics}>
                <View style={styles.patternMetric}>
                  <Text style={[styles.patternValue, { color: COLORS.mood.danger }]}>
                    {mockData.personalPattern.lowHydration.energy.toFixed(1)}/10
                  </Text>
                  <Text style={styles.patternMetricLabel}>Energy</Text>
                </View>
                <View style={styles.patternMetric}>
                  <Text style={[styles.patternValue, { color: COLORS.mood.danger }]}>
                    {mockData.personalPattern.lowHydration.mood.toFixed(1)}/10
                  </Text>
                  <Text style={styles.patternMetricLabel}>Mood</Text>
                </View>
                <View style={styles.patternMetric}>
                  <Text style={[styles.patternValue, { color: COLORS.mood.danger }]}>
                    {mockData.personalPattern.lowHydration.sleep.toFixed(1)}/10
                  </Text>
                  <Text style={styles.patternMetricLabel}>Sleep</Text>
                </View>
              </View>
            </View>

            <View style={styles.patternDifference}>
              <Text style={styles.patternDifferenceLabel}>Difference with hydration:</Text>
              <View style={styles.patternDifferenceMetrics}>
                <Text style={styles.patternDifferenceValue}>
                  +{mockData.personalPattern.difference.energy.toFixed(1)} energy
                </Text>
                <Text style={styles.patternDifferenceValue}>
                  +{mockData.personalPattern.difference.sleep.toFixed(1)} sleep quality
                </Text>
              </View>
              <Text style={styles.patternConfidence}>
                Confidence: {Math.round(mockData.personalPattern.confidence * 100)}% ({mockData.personalPattern.period} days)
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonPrimary, SHADOWS.md]}
            onPress={handleSetReminders}
          >
            <Text style={styles.ctaButtonTextPrimary}>📱 Set Water Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonSecondary, SHADOWS.sm]}
            onPress={handleViewTrends}
          >
            <Text style={styles.ctaButtonTextSecondary}>📊 View Trends</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.brand.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  headerButton: {
    fontSize: TYPOGRAPHY.size.headline,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  title: {
    fontSize: TYPOGRAPHY.size.title1,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  timelineNote: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  timelineNoteText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  discoveryCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  discoveryTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.md,
  },
  discoveryStatement: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.lg,
  },
  discoveryMetrics: {
    gap: SPACING.md,
  },
  discoveryMetric: {
    marginBottom: SPACING.sm,
  },
  discoveryLabel: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  discoveryValue: {
    fontSize: TYPOGRAPHY.size.headline,
    color: COLORS.text.inverse,
    marginTop: SPACING.xs,
  },
  scheduleItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.hydration.primary,
  },
  scheduleTime: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    minWidth: 60,
  },
  scheduleTimeText: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.hydration.primary,
  },
  scheduleCritical: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.semantic.danger,
    marginTop: SPACING.xs,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  scheduleVolume: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.hydration.primary,
  },
  scheduleContext: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  scheduleBenefit: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  scheduleOutcome: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  scheduleSummary: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  scheduleSummaryText: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  patternCard: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  patternGroup: {
    marginBottom: SPACING.lg,
  },
  patternLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  patternMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  patternMetric: {
    alignItems: 'center',
  },
  patternValue: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.hydration.primary,
  },
  patternMetricLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  patternDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.lg,
  },
  patternDifference: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  patternDifferenceLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  patternDifferenceMetrics: {
    gap: SPACING.sm,
  },
  patternDifferenceValue: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.semantic.success,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  patternConfidence: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
  },
  ctaSection: {
    flexDirection: 'column',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  ctaButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPrimary: {
    backgroundColor: COLORS.hydration.primary,
  },
  ctaButtonTextPrimary: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
  },
  ctaButtonSecondary: {
    backgroundColor: COLORS.surface.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  ctaButtonTextSecondary: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
  },
});
