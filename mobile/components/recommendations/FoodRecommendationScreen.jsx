/**
 * FoodRecommendationScreen - Detailed food recommendation with explainability
 * Shows why to change, impact/effort, recommended foods, macro targets, predictions
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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, GLASS } from '../../constants/designSystem';
import ConfidenceIndicator from './ConfidenceIndicator';
import ImpactEffortRings from './ImpactEffortRings';

const mockRecommendation = {
  title: 'Boost Your Energy',
  subtitle: 'Increase protein intake by 15-20g/day',
  explanation:
    'On high-protein days, your energy levels stay 20% higher through the afternoon. This correlation is based on 45 logged meals where you tracked mood + energy.',
  impactScore: 0.85,
  effortScore: 0.90,
  confidence: 0.78,
  dataPoints: 45,

  recommendedFoods: [
    {
      name: 'Eggs',
      icon: '🥚',
      proteinG: 27,
      caloriesPerServing: 155,
      servingSize: 'per 100g',
      nutriScore: 'A',
      explanation:
        'Eggs paired with your morning toast create optimal amino acid profile for sustained energy.',
      frequency: 12,
    },
    {
      name: 'Chicken',
      icon: '🍗',
      proteinG: 31,
      caloriesPerServing: 165,
      servingSize: 'per 100g',
      nutriScore: 'A+',
      explanation:
        'You log chicken 4-5x per week and consistently report improved energy afterward.',
      frequency: 18,
    },
    {
      name: 'Greek Yogurt',
      icon: '🥛',
      proteinG: 17,
      caloriesPerServing: 100,
      servingSize: '1 cup',
      nutriScore: 'B',
      explanation: 'Low sugar Greek yogurt avoids afternoon energy dip.',
      frequency: 8,
    },
  ],

  macroAnalysis: {
    current: { protein: 78, carbs: 230, fat: 65 },
    target: { protein: 95, carbs: 240, fat: 70 },
    gap: { protein: 17, carbs: 10, fat: 5 },
  },

  prediction: {
    metric: 'energy',
    currentValue: 6.2,
    predictedValue: 7.8,
    metricName: 'Energy level (1-10)',
    timeframe: '1 week',
    confidence: 0.72,
  },
};

function MacroBar({ label, current, target, color }) {
  const percentage = Math.min(100, (current / target) * 100);

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroLabel}>
        <Text style={styles.macroName}>{label}</Text>
        <Text style={styles.macroValues}>
          {current}g → {target}g (+{target - current}g)
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: COLORS.border.light }]}>
        <LinearGradient
          colors={[color, color + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.macroFill, { width: `${percentage}%` }]}
        />
      </View>
    </View>
  );
}

export default function FoodRecommendationScreen() {
  const router = useRouter();
  const [loading] = useState(false);
  const rec = mockRecommendation;

  const handleAddToMealPlan = () => {
    // TODO: Implement add to meal plan logic
    console.log('Add to meal plan');
  };

  const handleViewRecipes = () => {
    // TODO: Navigate to recipes screen
    router.push('/(tabs)/log');
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.nutrition.primary} />
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
        <Text style={styles.headerTitle}>Food Recommendations</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerButton}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>💡 {rec.title}</Text>
          <Text style={styles.subtitle}>{rec.subtitle}</Text>
        </View>

        {/* Explanation Card */}
        <View style={[styles.card, SHADOWS.md]}>
          <Text style={styles.cardExplanation}>{rec.explanation}</Text>
          <View style={styles.confidenceRow}>
            <ConfidenceIndicator
              confidence={rec.confidence}
              dataPoints={rec.dataPoints}
              metricColor={COLORS.nutrition.primary}
              size={60}
            />
          </View>
        </View>

        {/* Impact & Effort Rings */}
        <View style={styles.section}>
          <ImpactEffortRings
            impact={rec.impactScore}
            effort={rec.effortScore}
            impactColor={COLORS.insights.success}
            effortColor={COLORS.insights.warning}
          />
          <View style={styles.effortDescription}>
            <Text style={styles.effortText}>
              Only need to add one egg, scoop of protein powder, or handful of almonds
            </Text>
          </View>
        </View>

        {/* Recommended Foods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Recommended Foods</Text>
          {rec.recommendedFoods.map((food, index) => (
            <View key={index} style={[styles.foodCard, SHADOWS.sm]}>
              <View style={styles.foodHeader}>
                <Text style={styles.foodIcon}>{food.icon}</Text>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodServing}>{food.servingSize}</Text>
                </View>
                <View style={styles.foodNutri}>
                  <View
                    style={[
                      styles.nutriBadge,
                      {
                        backgroundColor:
                          food.nutriScore === 'A' ||
                          food.nutriScore === 'A+'
                            ? COLORS.nutrition.primary
                            : COLORS.nutrition.warning,
                      },
                    ]}
                  >
                    <Text style={styles.nutriBadgeText}>
                      {food.nutriScore}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.foodExplanation}>{food.explanation}</Text>

              <View style={styles.foodStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{food.proteinG}g</Text>
                  <Text style={styles.statLabel}>Protein</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{food.caloriesPerServing}</Text>
                  <Text style={styles.statLabel}>kcal</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{food.frequency}x</Text>
                  <Text style={styles.statLabel}>Logged</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Macro Targets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Macro Targets</Text>
          <View style={[styles.card, { padding: SPACING.lg }]}>
            <MacroBar
              label="Protein"
              current={rec.macroAnalysis.current.protein}
              target={rec.macroAnalysis.target.protein}
              color={COLORS.nutrition.primary}
            />
            <MacroBar
              label="Carbs"
              current={rec.macroAnalysis.current.carbs}
              target={rec.macroAnalysis.target.carbs}
              color={COLORS.nutrition.success}
            />
            <MacroBar
              label="Fat"
              current={rec.macroAnalysis.current.fat}
              target={rec.macroAnalysis.target.fat}
              color={COLORS.nutrition.warning}
            />

            <View style={styles.macroNote}>
              <Text style={styles.macroNoteText}>
                This recommendation alone hits +15g of your protein gap if you
                replace 1 snack/day with one of the above foods.
              </Text>
            </View>
          </View>
        </View>

        {/* Prediction Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Before & After</Text>
          <LinearGradient
            colors={[COLORS.nutrition.primary, COLORS.nutrition.primary + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.predictionCard, SHADOWS.md]}
          >
            <View style={styles.predictionContent}>
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>
                  If you add protein daily for 1 week:
                </Text>
              </View>

              <View style={styles.predictionMetric}>
                <Text style={styles.predictionMetricName}>Energy level:</Text>
                <View style={styles.predictionChange}>
                  <Text style={styles.predictionBefore}>
                    {rec.prediction.currentValue}/10
                  </Text>
                  <Text style={styles.predictionArrow}>→</Text>
                  <Text style={styles.predictionAfter}>
                    {rec.prediction.predictedValue}/10
                  </Text>
                </View>
              </View>

              <View style={styles.predictionMetric}>
                <Text style={styles.predictionMetricName}>Confidence:</Text>
                <Text style={styles.predictionConfidence}>
                  {Math.round(rec.prediction.confidence * 100)}% based on your
                  patterns
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              styles.ctaButtonPrimary,
              SHADOWS.md,
            ]}
            onPress={handleAddToMealPlan}
          >
            <Text style={styles.ctaButtonTextPrimary}>📥 Add to Meal Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ctaButton,
              styles.ctaButtonSecondary,
              SHADOWS.sm,
            ]}
            onPress={handleViewRecipes}
          >
            <Text style={styles.ctaButtonTextSecondary}>→ View Recipes</Text>
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
    backgroundColor: COLORS.surface.primary,
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  titleSection: {
    marginBottom: SPACING['2xl'],
  },
  title: {
    fontSize: TYPOGRAPHY.size.title1,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: COLORS.text.secondary,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  card: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.nutrition.primary,
  },
  cardExplanation: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.lg,
  },
  confidenceRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: SPACING['3xl'],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  effortDescription: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  effortText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  foodCard: {
    backgroundColor: COLORS.surface.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  foodIcon: {
    fontSize: TYPOGRAPHY.size.title1,
    marginRight: SPACING.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
  },
  foodServing: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  foodNutri: {
    marginLeft: SPACING.md,
  },
  nutriBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  nutriBadgeText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
  },
  foodExplanation: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.md,
  },
  foodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.nutrition.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  macroBar: {
    marginBottom: SPACING.lg,
  },
  macroLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  macroName: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
  },
  macroValues: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
  },
  macroTrack: {
    height: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  macroNote: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  macroNoteText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  predictionCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  predictionContent: {
    // Content will be over the gradient
  },
  predictionRow: {
    marginBottom: SPACING.md,
  },
  predictionLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.inverse,
  },
  predictionMetric: {
    marginBottom: SPACING.md,
  },
  predictionMetricName: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
    marginBottom: SPACING.sm,
  },
  predictionChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  predictionBefore: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.inverse,
    opacity: 0.7,
  },
  predictionArrow: {
    fontSize: TYPOGRAPHY.size.headline,
    color: COLORS.text.inverse,
  },
  predictionAfter: {
    fontSize: TYPOGRAPHY.size.title2,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
  },
  predictionConfidence: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
  },
  ctaSection: {
    flexDirection: 'column',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
  },
  ctaButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPrimary: {
    backgroundColor: COLORS.nutrition.primary,
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
