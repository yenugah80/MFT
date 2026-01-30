/**
 * MoodFoodCorrelationScreen - Interactive mood-food matrix visualization
 * Shows which foods correlate with mood improvements
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/designSystem';

const mockData = {
  correlations: [
    { food: 'Chicken Curry', icon: '🍗', impact: 15, confidence: 0.78, dataPoints: 12 },
    { food: 'Rice', icon: '🍚', impact: 8, confidence: 0.65, dataPoints: 18 },
    { food: 'Eggs', icon: '🥚', impact: 12, confidence: 0.72, dataPoints: 15 },
    { food: 'Yogurt', icon: '🥛', impact: 3, confidence: 0.58, dataPoints: 8 },
    { food: 'Bread', icon: '🍞', impact: -2, confidence: 0.61, dataPoints: 22 },
    { food: 'Pasta', icon: '🍝', impact: 5, confidence: 0.55, dataPoints: 14 },
    { food: 'Salad', icon: '🥬', impact: 18, confidence: 0.72, dataPoints: 18 },
    { food: 'Coffee', icon: '☕', impact: 10, confidence: 0.68, dataPoints: 24 },
  ],

  topBooster: {
    food: 'Salad',
    icon: '🥬',
    moodGain: 18,
    confidence: 0.72,
    dataPoints: 18,
    nutrition: {
      fiber: { value: 12, status: 'High' },
      vitamins: ['A', 'K', 'C'],
      hydration: 300,
    },
    timing: 'Lunch (1pm-2pm)',
    whyItWorks:
      'High fiber promotes stable blood sugar, preventing the 3-4pm energy and mood crash you typically experience.',
  },

  moodDecline: {
    food: 'High sugar snacks',
    icon: '🍰',
    moodDecline: -12,
    confidence: 0.81,
    dataPoints: 28,
    explanation:
      '30min glucose spike → insulin crash → fatigue + mood dip at 3-4pm.',
    alternative: { food: 'Nuts + dates', expectedGain: 7 },
  },

  weeklyTimeline: [
    { day: 'Mon', food: 'Salad', moodScore: 7.2 },
    { day: 'Tue', food: 'Mix', moodScore: 6.5 },
    { day: 'Wed', food: 'Salad', moodScore: 7.4 },
    { day: 'Thu', food: 'Pasta', moodScore: 6.8 },
    { day: 'Fri', food: 'Salad', moodScore: 7.6 },
    { day: 'Sat', food: 'Pizza', moodScore: 6.3 },
    { day: 'Sun', food: 'Salad', moodScore: 7.5 },
  ],
};

function CorrelationMatrixRow({ item }) {
  const getColorForImpact = (impact) => {
    if (impact > 20) return COLORS.mood.primary;
    if (impact > 0) return COLORS.mood.success;
    return COLORS.mood.danger;
  };

  return (
    <View style={styles.matrixRow}>
      <View style={styles.foodName}>
        <Text style={styles.foodIcon}>{item.icon}</Text>
        <Text style={styles.foodLabel}>{item.food}</Text>
      </View>

      <View style={styles.impactDots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.impactDot,
              {
                backgroundColor:
                  i < Math.min(3, Math.ceil((Math.max(0, item.impact) / 20) * 3))
                    ? getColorForImpact(item.impact)
                    : COLORS.border.light,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.impactValue}>
        <Text
          style={[
            styles.impactText,
            {
              color: getColorForImpact(item.impact),
            },
          ]}
        >
          {item.impact > 0 ? '+' : ''}{item.impact}%
        </Text>
      </View>

      <View style={styles.ratingStars}>
        {[0, 1, 2].map((i) => (
          <Ionicons
            key={i}
            name={i < Math.ceil(item.confidence * 3) ? 'star' : 'star-outline'}
            size={14}
            color={i < Math.ceil(item.confidence * 3) ? '#F59E0B' : '#D1D5DB'}
            style={styles.star}
          />
        ))}
      </View>
    </View>
  );
}

export default function MoodFoodCorrelationScreen() {
  const router = useRouter();
  const [loading] = useState(false);

  const handleSetReminder = () => {
    console.log('Set reminder');
  };

  const handleMealPlan = () => {
    router.push('/(tabs)/log');
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.mood.primary} />
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
        <Text style={styles.headerTitle}>Mood-Food Patterns</Text>
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
          <Text style={styles.title}>📊 How Foods Affect Your Mood</Text>
        </View>

        {/* Correlation Matrix */}
        <View style={[styles.card, SHADOWS.md]}>
          <Text style={styles.matrixTitle}>Foods & Mood Impact</Text>
          <View style={styles.matrixHeader}>
            <Text style={styles.matrixHeaderLabel}>Food</Text>
            <Text style={styles.matrixHeaderLabel}>Impact</Text>
            <Text style={styles.matrixHeaderLabel}>Value</Text>
            <Text style={styles.matrixHeaderLabel}>Rating</Text>
          </View>
          {mockData.correlations.map((item, index) => (
            <CorrelationMatrixRow key={index} item={item} />
          ))}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.mood.primary }]} />
              <Text style={styles.legendText}>Strong positive (+20%+)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.mood.success }]} />
              <Text style={styles.legendText}>Mild positive (0-20%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.mood.danger }]} />
              <Text style={styles.legendText}>Negative (-20%+)</Text>
            </View>
          </View>
        </View>

        {/* Top Mood Booster */}
        <View style={styles.section}>
          <LinearGradient
            colors={[COLORS.mood.primary, COLORS.mood.primary + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.boosterCard, SHADOWS.md]}
          >
            <View style={styles.boosterHeader}>
              <Text style={styles.boosterIcon}>{mockData.topBooster.icon}</Text>
              <View style={styles.boosterTitleView}>
                <Text style={styles.boosterTitle}>Top Mood Booster</Text>
                <Text style={styles.boosterFood}>{mockData.topBooster.food}</Text>
              </View>
            </View>

            <View style={styles.boosterContent}>
              <View style={styles.boosterMetric}>
                <Text style={styles.boosterLabel}>Mood impact when consumed:</Text>
                <Text style={styles.boosterValue}>
                  🎯 +{mockData.topBooster.moodGain}% average (1-10 scale)
                </Text>
              </View>

              <View style={styles.boosterMetric}>
                <Text style={styles.boosterLabel}>
                  📊 Confidence: {Math.round(mockData.topBooster.confidence * 100)}% (based on{' '}
                  {mockData.topBooster.dataPoints} meals)
                </Text>
              </View>

              <View style={styles.boosterMetric}>
                <Text style={styles.boosterLabel}>🥬 Nutritional breakdown:</Text>
                <Text style={styles.boosterNutrition}>
                  Fiber: {mockData.topBooster.nutrition.fiber.value}g ({mockData.topBooster.nutrition.fiber.status})
                </Text>
                <Text style={styles.boosterNutrition}>
                  Vitamins: {mockData.topBooster.nutrition.vitamins.join(', ')}
                </Text>
              </View>

              <View style={styles.boosterMetric}>
                <Text style={styles.boosterLabel}>
                  ⏰ Best timing: {mockData.topBooster.timing}
                </Text>
                <Text style={styles.boosterExplanation}>
                  Your mood peaks 2-3 hours after salad consumption.
                </Text>
              </View>

              <View style={styles.boosterMetric}>
                <Text style={styles.boosterLabel}>💡 Why it works:</Text>
                <Text style={styles.boosterExplanation}>{mockData.topBooster.whyItWorks}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Mood Decline Pattern */}
        <View style={styles.section}>
          <View
            style={[
              styles.declineCard,
              { borderLeftColor: COLORS.mood.danger },
              SHADOWS.md,
            ]}
          >
            <View style={styles.declineHeader}>
              <Text style={styles.declineIcon}>{mockData.moodDecline.icon}</Text>
              <Text style={styles.declineTitle}>Foods to Limit</Text>
            </View>

            <View style={styles.declineContent}>
              <Text style={styles.declineFood}>{mockData.moodDecline.food}</Text>

              <View style={styles.declineMetric}>
                <Text style={styles.declineLabel}>Mood impact:</Text>
                <Text style={styles.declineValue}>
                  🔴 {mockData.moodDecline.moodDecline}% (crashes after)
                </Text>
              </View>

              <View style={styles.declineMetric}>
                <Text style={styles.declineLabel}>
                  Confidence: {Math.round(mockData.moodDecline.confidence * 100)}% (
                  {mockData.moodDecline.dataPoints} data points)
                </Text>
              </View>

              <View style={styles.declineMetric}>
                <Text style={styles.declineLabel}>Why:</Text>
                <Text style={styles.declineExplanation}>
                  {mockData.moodDecline.explanation}
                </Text>
              </View>

              <View style={styles.declineAlternative}>
                <Text style={styles.declineLabel}>Better alternative:</Text>
                <Text style={styles.declineAltFood}>
                  {mockData.moodDecline.alternative.food}
                </Text>
                <Text style={styles.declineAltValue}>
                  = +{mockData.moodDecline.alternative.expectedGain}% mood vs{' '}
                  {mockData.moodDecline.moodDecline}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Weekly Mood Timeline</Text>
          {mockData.weeklyTimeline.map((item, index) => (
            <View
              key={index}
              style={[styles.timelineItem, { borderLeftColor: COLORS.mood.primary }]}
            >
              <Text style={styles.timelineDay}>{item.day}</Text>
              <View style={styles.timelineFood}>
                <Text style={styles.timelineFoodName}>{item.food}</Text>
              </View>
              <View style={styles.timelineMood}>
                <Text
                  style={[
                    styles.timelineMoodScore,
                    {
                      color:
                        item.moodScore >= 7
                          ? COLORS.mood.primary
                          : COLORS.mood.success,
                    },
                  ]}
                >
                  {item.moodScore}/10
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.timelinePattern}>
            <Text style={styles.patternText}>
              Pattern: Salad days are 1.2 points higher mood than non-salad days.
            </Text>
            <Text style={styles.patternConfidence}>
              Confidence: 89% (4 weeks data)
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonPrimary, SHADOWS.md]}
            onPress={handleSetReminder}
          >
            <Text style={styles.ctaButtonTextPrimary}>🔔 Set Salad Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaButtonSecondary, SHADOWS.sm]}
            onPress={handleMealPlan}
          >
            <Text style={styles.ctaButtonTextSecondary}>📋 Meal Plan</Text>
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
  matrixTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  matrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    marginBottom: SPACING.md,
  },
  matrixHeaderLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  foodName: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
  },
  foodIcon: {
    fontSize: TYPOGRAPHY.size.title2,
    marginRight: SPACING.md,
  },
  foodLabel: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  impactDots: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flex: 1,
  },
  impactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  impactValue: {
    flex: 0.8,
    alignItems: 'center',
  },
  impactText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  ratingStars: {
    flexDirection: 'row',
    flex: 0.8,
  },
  star: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  legend: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
  },
  boosterCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  boosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  boosterIcon: {
    fontSize: TYPOGRAPHY.size.title1,
    marginRight: SPACING.md,
  },
  boosterTitleView: {
    flex: 1,
  },
  boosterTitle: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.inverse,
  },
  boosterFood: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
    marginTop: SPACING.xs,
  },
  boosterContent: {
    gap: SPACING.md,
  },
  boosterMetric: {
    marginBottom: SPACING.md,
  },
  boosterLabel: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING.xs,
  },
  boosterValue: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
  },
  boosterNutrition: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    marginTop: SPACING.xs,
  },
  boosterExplanation: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  declineCard: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
  },
  declineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  declineIcon: {
    fontSize: TYPOGRAPHY.size.title1,
    marginRight: SPACING.md,
  },
  declineTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  declineContent: {
    gap: SPACING.md,
  },
  declineFood: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.mood.danger,
  },
  declineMetric: {
    marginBottom: SPACING.md,
  },
  declineLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  declineValue: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.mood.danger,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  declineExplanation: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  declineAlternative: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  declineAltFood: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.mood.primary,
    marginTop: SPACING.xs,
  },
  declineAltValue: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.secondary,
  },
  timelineDay: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    width: 50,
  },
  timelineFood: {
    flex: 1,
  },
  timelineFoodName: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  timelineMood: {
    alignItems: 'flex-end',
  },
  timelineMoodScore: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  timelinePattern: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  patternText: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
  },
  patternConfidence: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
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
    backgroundColor: COLORS.mood.primary,
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
