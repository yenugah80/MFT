/**
 * ActivityRecoveryScreen - Post-activity metrics & recovery optimization
 * Shows nutrition timing, recovery predictions, and pattern analysis
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/designSystem';

const mockData = {
  lastActivity: {
    type: 'Running',
    distance: 5.2,
    duration: 35,
    intensity: 'High',
    timestamp: 'Yesterday 5:30pm',
  },

  recoveryMetrics: {
    physical: {
      muscleSoreness: 40,
      restingHeartRate: 58,
      restingHeartRateChange: 4,
      recoveryRate: 85,
      status: 'good',
    },
    mental: {
      energyToday: 7.8,
      energyChange: 0.4,
      moodToday: 7.4,
      moodChange: 0.3,
      sleepQualityLastNight: 8.4,
      sleepNote: 'best in 2 weeks!',
    },
    confidence: 0.92,
  },

  optimalNutrition: {
    protein: {
      target: 30,
      examples: ['150g chicken breast', '2 eggs + 1 tbsp PB', '1 scoop protein shake'],
      benefit: 'repairs muscle microruptures',
    },
    carbs: {
      target: 60,
      examples: ['1 cup white rice', '2 slices bread', '1 banana + 1 bagel'],
      benefit: 'restore muscle energy',
    },
    hydration: {
      target: 500,
      electrolytes: true,
      benefit: 'restore lost fluids',
    },
    avoid: ['High fat + high fiber (slows digestion)', 'Caffeine (inhibits recovery)', 'Alcohol (dehydration)'],
  },

  mealTiming: [
    {
      time: '5:00-5:30pm',
      label: 'Activity',
      importance: 'activity',
    },
    {
      time: '5:30-6:00pm',
      label: '[GOLDEN WINDOW]',
      importance: 'critical',
      description: 'High priority window',
      examples: [
        'Chicken + Rice',
        'Protein shake + Banana + Toast',
        'Greek yogurt + Granola + Berries',
      ],
    },
    {
      time: '6:00-6:30pm',
      label: 'Secondary meal',
      importance: 'secondary',
      description: 'Still beneficial but less optimal',
    },
    {
      time: '7:00pm+',
      label: 'Dinner',
      importance: 'maintenance',
      description: 'Normal meal with extra protein & carbs',
    },
  ],

  prediction: {
    withNutrition: {
      recoveryTime: '26 hours',
      improvement: '2-4 hours faster',
      muscleSoreness: 35,
      nextDayEnergy: 8.2,
      sleepQuality: 8.6,
    },
    withoutNutrition: {
      recoveryTime: '32 hours',
      muscleSoreness: 45,
      nextDayEnergy: 7.0,
      sleepQuality: 7.8,
    },
    confidence: 0.89,
  },

  weeklyPattern: [
    { day: 'Mon', activity: 'Run (High)', followed: true, nextDayEnergy: 8.2, soreness: 38 },
    { day: 'Wed', activity: 'Strength (Medium)', followed: false, nextDayEnergy: 7.1, soreness: 45 },
    { day: 'Fri', activity: 'Run (High)', followed: true, nextDayEnergy: 8.1, soreness: 38 },
  ],

  pattern: {
    statement: 'Recovery nutrition = +1.1 point energy boost and -7% muscle soreness',
    energyBoost: 1.1,
    sorenessReduction: 7,
    sleepImprovement: 0.8,
  },
};

function NutritionBreakdown({ label, target, unit, items, benefit }) {
  return (
    <View style={styles.nutritionItem}>
      <View style={styles.nutritionHeader}>
        <Text style={styles.nutritionLabel}>{label}</Text>
        <Text style={styles.nutritionTarget}>✓ {target}{unit}</Text>
      </View>
      <Text style={styles.nutritionBenefit}>{benefit}</Text>
      <View style={styles.examplesList}>
        {items.map((item, index) => (
          <Text key={index} style={styles.exampleItem}>
            • {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function RecoveryComparison() {
  const { withNutrition, withoutNutrition } = mockData.prediction;

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonColumn}>
        <View style={[styles.comparisonHeader, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <Text style={styles.comparisonHeaderText}>✓ With Recovery Nutrition</Text>
        </View>
        <View style={styles.comparisonContent}>
          <View style={styles.comparisonMetric}>
            <Text style={styles.comparisonValue}>{withNutrition.recoveryTime}</Text>
            <Text style={styles.comparisonLabel}>Recovery time</Text>
            <Text style={styles.comparisonNote}>({withNutrition.improvement})</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={styles.comparisonValue}>{withNutrition.muscleSoreness}%</Text>
            <Text style={styles.comparisonLabel}>Muscle soreness</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={styles.comparisonValue}>{withNutrition.nextDayEnergy.toFixed(1)}/10</Text>
            <Text style={styles.comparisonLabel}>Next-day energy</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={styles.comparisonValue}>{withNutrition.sleepQuality.toFixed(1)}/10</Text>
            <Text style={styles.comparisonLabel}>Sleep quality</Text>
          </View>
        </View>
      </View>

      <View style={styles.comparisonColumn}>
        <View style={[styles.comparisonHeader, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <Text style={styles.comparisonHeaderText}>✗ Skip Recovery Nutrition</Text>
        </View>
        <View style={styles.comparisonContent}>
          <View style={styles.comparisonMetric}>
            <Text style={[styles.comparisonValue, { color: COLORS.mood.danger }]}>
              {withoutNutrition.recoveryTime}
            </Text>
            <Text style={styles.comparisonLabel}>Recovery time</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={[styles.comparisonValue, { color: COLORS.mood.danger }]}>
              {withoutNutrition.muscleSoreness}%
            </Text>
            <Text style={styles.comparisonLabel}>Muscle soreness</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={[styles.comparisonValue, { color: COLORS.mood.danger }]}>
              {withoutNutrition.nextDayEnergy.toFixed(1)}/10
            </Text>
            <Text style={styles.comparisonLabel}>Next-day energy</Text>
          </View>
          <View style={styles.comparisonMetric}>
            <Text style={[styles.comparisonValue, { color: COLORS.mood.danger }]}>
              {withoutNutrition.sleepQuality.toFixed(1)}/10
            </Text>
            <Text style={styles.comparisonLabel}>Sleep quality</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ActivityRecoveryScreen() {
  const router = useRouter();
  const [loading] = useState(false);

  const handlePlanMeals = () => {
    router.push('/(tabs)/log');
  };

  const handleViewHistory = () => {
    // Navigate to activity history
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.activity.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity & Recovery</Text>
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
          <Text style={styles.title}>💪 Maximize Your Recovery</Text>
        </View>

        {/* Workout Analysis */}
        <View style={[styles.card, SHADOWS.md]}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutType}>{mockData.lastActivity.type}</Text>
            <Text style={styles.workoutTime}>{mockData.lastActivity.timestamp}</Text>
          </View>

          <View style={styles.workoutStats}>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>{mockData.lastActivity.distance} km</Text>
              <Text style={styles.workoutStatLabel}>Distance</Text>
            </View>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>{mockData.lastActivity.duration} min</Text>
              <Text style={styles.workoutStatLabel}>Duration</Text>
            </View>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>{mockData.lastActivity.intensity}</Text>
              <Text style={styles.workoutStatLabel}>Intensity</Text>
            </View>
          </View>

          <View style={styles.recoveryMetricsSection}>
            <Text style={styles.recoveryMetricsTitle}>Recovery Metrics</Text>

            <View style={styles.metricGroup}>
              <Text style={styles.metricGroupLabel}>Physical:</Text>
              <Text style={styles.metricItem}>
                Muscle soreness: {mockData.recoveryMetrics.physical.muscleSoreness}% baseline
              </Text>
              <Text style={styles.metricItem}>
                Resting HR: {mockData.recoveryMetrics.physical.restingHeartRate} bpm (+
                {mockData.recoveryMetrics.physical.restingHeartRateChange})
              </Text>
              <Text style={styles.metricItem}>
                Recovery rate: {mockData.recoveryMetrics.physical.recoveryRate}% ({mockData.recoveryMetrics.physical.status})
              </Text>
            </View>

            <View style={styles.metricGroup}>
              <Text style={styles.metricGroupLabel}>Mental:</Text>
              <Text style={styles.metricItem}>
                Energy today: {mockData.recoveryMetrics.mental.energyToday.toFixed(1)}/10 (+
                {mockData.recoveryMetrics.mental.energyChange.toFixed(1)})
              </Text>
              <Text style={styles.metricItem}>
                Mood: {mockData.recoveryMetrics.mental.moodToday.toFixed(1)}/10 (+
                {mockData.recoveryMetrics.mental.moodChange.toFixed(1)})
              </Text>
              <Text style={styles.metricItem}>
                Sleep quality last night: {mockData.recoveryMetrics.mental.sleepQualityLastNight.toFixed(1)}/10 ({mockData.recoveryMetrics.mental.sleepNote})
              </Text>
            </View>

            <View style={styles.confidenceNote}>
              <Text style={styles.confidenceText}>
                Confidence: {Math.round(mockData.recoveryMetrics.confidence * 100)}% (Your historical post-workout recovery pattern)
              </Text>
            </View>
          </View>
        </View>

        {/* Optimal Recovery Nutrition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Optimal Recovery Nutrition</Text>
          <Text style={styles.sectionSubtitle}>Within 30 Minutes (CRITICAL):</Text>

          <View style={[styles.card, { marginBottom: SPACING['2xl'] }]}>
            <NutritionBreakdown
              label="🍗 Protein"
              target={mockData.optimalNutrition.protein.target}
              unit="g"
              items={mockData.optimalNutrition.protein.examples}
              benefit={`(${mockData.optimalNutrition.protein.benefit})`}
            />

            <View style={styles.nutritionDivider} />

            <NutritionBreakdown
              label="🍚 Carbs"
              target={mockData.optimalNutrition.carbs.target}
              unit="g"
              items={mockData.optimalNutrition.carbs.examples}
              benefit={`(${mockData.optimalNutrition.carbs.benefit})`}
            />

            <View style={styles.nutritionDivider} />

            <NutritionBreakdown
              label="💧 Hydration"
              target={mockData.optimalNutrition.hydration.target}
              unit="ml"
              items={['Water + electrolytes if: Sweat heavily, Activity >1 hour']}
              benefit={`(${mockData.optimalNutrition.hydration.benefit})`}
            />

            <View style={styles.avoidSection}>
              <Text style={styles.avoidLabel}>❌ Avoid:</Text>
              {mockData.optimalNutrition.avoid.map((item, index) => (
                <Text key={index} style={styles.avoidItem}>
                  • {item}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Meal Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Meal Timing Breakdown</Text>
          {mockData.mealTiming.map((slot, index) => (
            <View
              key={index}
              style={[
                styles.timingItem,
                slot.importance === 'critical' && {
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderLeftColor: COLORS.progress.primary,
                },
              ]}
            >
              <Text style={styles.timingTime}>{slot.time}</Text>
              <View style={styles.timingContent}>
                <Text style={styles.timingLabel}>{slot.label}</Text>
                {slot.description && (
                  <Text style={styles.timingDescription}>{slot.description}</Text>
                )}
                {slot.examples && (
                  <View style={styles.timingExamples}>
                    {slot.examples.map((example, i) => (
                      <Text key={i} style={styles.timingExample}>
                        • {example}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Recovery Prediction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Recovery Prediction</Text>
          <RecoveryComparison />
          <View style={styles.predictionNote}>
            <Text style={styles.predictionNoteText}>
              Confidence: {Math.round(mockData.prediction.confidence * 100)}%
            </Text>
          </View>
        </View>

        {/* Weekly Pattern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Weekly Recovery Pattern</Text>
          {mockData.weeklyPattern.map((item, index) => (
            <View
              key={index}
              style={[
                styles.patternItem,
                item.followed && { borderLeftColor: COLORS.activity.primary },
                !item.followed && { borderLeftColor: COLORS.mood.danger },
              ]}
            >
              <View style={styles.patternDay}>
                <Text style={styles.patternDayText}>{item.day}</Text>
              </View>

              <View style={styles.patternActivity}>
                <Text style={styles.patternActivityText}>{item.activity}</Text>
                {item.followed ? (
                  <Text style={styles.patternFollowed}>+ Recovery ✓</Text>
                ) : (
                  <Text style={styles.patternSkipped}>+ Skip ✗</Text>
                )}
              </View>

              <View style={styles.patternOutcome}>
                <Text style={[styles.patternMetric, { color: COLORS.activity.primary }]}>
                  {item.nextDayEnergy.toFixed(1)}/10 energy
                </Text>
                <Text style={styles.patternMetric}>Soreness: {item.soreness}%</Text>
              </View>
            </View>
          ))}

          <View style={styles.patternSummary}>
            <Text style={styles.patternSummaryText}>{mockData.pattern.statement}</Text>
            <View style={styles.patternStats}>
              <Text style={styles.patternStatItem}>= {mockData.pattern.energyBoost.toFixed(1)} point energy</Text>
              <Text style={styles.patternStatItem}>= {mockData.pattern.sorenessReduction}% less soreness</Text>
              <Text style={styles.patternStatItem}>= {mockData.pattern.sleepImprovement.toFixed(1)} point better sleep</Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonPrimary, SHADOWS.md]}
            onPress={handlePlanMeals}
          >
            <Text style={styles.ctaButtonTextPrimary}>🍽️ Plan Recovery Meals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonSecondary, SHADOWS.sm]}
            onPress={handleViewHistory}
          >
            <Text style={styles.ctaButtonTextSecondary}>📊 Activity History</Text>
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
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  workoutHeader: {
    marginBottom: SPACING.lg,
  },
  workoutType: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.activity.primary,
  },
  workoutTime: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    borderBottomWidth: 1,
    marginBottom: SPACING.lg,
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutStatValue: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.activity.primary,
  },
  workoutStatLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  recoveryMetricsSection: {
    marginTop: SPACING.lg,
  },
  recoveryMetricsTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  metricGroup: {
    marginBottom: SPACING.md,
  },
  metricGroupLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  metricItem: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  confidenceNote: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  nutritionItem: {
    marginBottom: SPACING.lg,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  nutritionLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  nutritionTarget: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.activity.primary,
  },
  nutritionBenefit: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  examplesList: {
    marginLeft: SPACING.lg,
  },
  exampleItem: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.lg,
  },
  avoidSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  avoidLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.mood.danger,
    marginBottom: SPACING.md,
  },
  avoidItem: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  timingItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface.primary,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border.light,
  },
  timingTime: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.activity.primary,
    marginRight: SPACING.lg,
    minWidth: 80,
  },
  timingContent: {
    flex: 1,
  },
  timingLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
  },
  timingDescription: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  timingExamples: {
    marginTop: SPACING.md,
    marginLeft: SPACING.lg,
  },
  timingExample: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  comparisonColumn: {
    flex: 1,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  comparisonHeader: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  comparisonHeaderText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  comparisonContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  comparisonMetric: {
    marginBottom: SPACING.lg,
  },
  comparisonValue: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.activity.primary,
  },
  comparisonLabel: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  comparisonNote: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  predictionNote: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  predictionNoteText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  patternItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  patternDay: {
    minWidth: 50,
  },
  patternDayText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  patternActivity: {
    flex: 1,
    marginHorizontal: SPACING.lg,
  },
  patternActivityText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.primary,
  },
  patternFollowed: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.activity.primary,
    marginTop: SPACING.xs,
  },
  patternSkipped: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.mood.danger,
    marginTop: SPACING.xs,
  },
  patternOutcome: {
    alignItems: 'flex-end',
  },
  patternMetric: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.secondary,
  },
  patternSummary: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
  },
  patternSummaryText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  patternStats: {
    gap: SPACING.sm,
  },
  patternStatItem: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.semantic.success,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
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
    backgroundColor: COLORS.activity.primary,
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
