/**
 * NutritionTab - Enhanced analytics with personalized recommendations
 *
 * Displays:
 * - Key nutrition metrics (calories, macros)
 * - Personalized recommendations from AI
 * - Food-mood correlations
 * - Evidence-based insights
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
  MACRO_COLORS,
} from '../../constants/premiumTheme';

export default function NutritionTab({ data, period, recommendations = [] }) {
  // Empty state when no data and no recommendations
  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="nutrition-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No nutrition data yet</Text>
        <Text style={styles.emptySubtext}>Log your meals to see analytics and personalized insights</Text>
      </View>
    );
  }

  const { calories, macros, mealsLogged } = data || { calories: {}, macros: {}, mealsLogged: 0 };

  // Separate recommendations by type for organized display
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const insightRecs = recommendations.filter(r => r.type === 'insight');
  const patternRecs = recommendations.filter(r => r.type === 'pattern');
  const suggestionRecs = recommendations.filter(r => r.type === 'suggestion');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Priority Actions - Show first if any */}
      {actionRecs.length > 0 && (
        <View style={styles.actionsSection}>
          {actionRecs.map((rec, idx) => (
            <RecommendationCard key={rec.id || idx} recommendation={rec} />
          ))}
        </View>
      )}

      {/* Key Metrics - Only show if we have data */}
      {data && (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              value={calories.consumed?.toLocaleString() || '0'}
              label="Calories"
              subtitle={`of ${calories.budget?.toLocaleString() || '2000'}`}
              icon="flame"
              iconColor={VIBRANT_WELLNESS.nutrition.solid}
            />
            <MetricCard
              value={`${calories.percentage || 0}%`}
              label="of Goal"
              icon="pie-chart"
              iconColor={(calories.percentage || 0) >= 100 ? '#10B981' : VIBRANT_WELLNESS.nutrition.solid}
            />
            <MetricCard
              value={mealsLogged || 0}
              label="Meals"
              subtitle={period === 'today' ? 'today' : 'logged'}
              icon="restaurant"
              iconColor={VIBRANT_WELLNESS.nutrition.solid}
            />
          </View>

          {/* Calorie Progress */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calorie Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(calories.percentage || 0, 100)}%`,
                      backgroundColor: getCalorieColor(calories.percentage || 0),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {(calories.consumed || 0).toLocaleString()} / {(calories.budget || 2000).toLocaleString()} cal
              </Text>
            </View>
          </View>

          {/* Macro Breakdown */}
          {macros && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Macros</Text>
              <View style={styles.macroList}>
                <MacroBar
                  name="Protein"
                  consumed={macros.protein?.consumed || 0}
                  goal={macros.protein?.goal || 150}
                  percentage={macros.protein?.percentage || 0}
                  color={MACRO_COLORS.protein.base}
                  unit="g"
                />
                <MacroBar
                  name="Carbs"
                  consumed={macros.carbs?.consumed || 0}
                  goal={macros.carbs?.goal || 250}
                  percentage={macros.carbs?.percentage || 0}
                  color={MACRO_COLORS.carbs.base}
                  unit="g"
                />
                <MacroBar
                  name="Fat"
                  consumed={macros.fat?.consumed || 0}
                  goal={macros.fat?.goal || 65}
                  percentage={macros.fat?.percentage || 0}
                  color={MACRO_COLORS.fat.base}
                  unit="g"
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* AI Insights Section */}
      {insightRecs.length > 0 && (
        <RecommendationSection
          title="Nutrition Insights"
          subtitle="Based on your data"
          recommendations={insightRecs}
        />
      )}

      {/* Discovered Patterns */}
      {patternRecs.length > 0 && (
        <RecommendationSection
          title="Nutrition Patterns"
          subtitle="Food-mood connections we found"
          recommendations={patternRecs}
        />
      )}

      {/* Smart Suggestions */}
      {suggestionRecs.length > 0 && (
        <RecommendationSection
          title="Suggestions for You"
          subtitle="Personalized tips"
          recommendations={suggestionRecs}
        />
      )}

      {/* Fallback static insights if no recommendations but have data */}
      {recommendations.length === 0 && data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightsList}>
            <InsightItem
              icon="checkmark-circle"
              color="#10B981"
              text={`${calories.percentage || 0}% of your calorie goal reached`}
            />
            {(macros?.protein?.percentage || 0) >= 80 && (
              <InsightItem
                icon="thumbs-up"
                color="#10B981"
                text="Great protein intake today!"
              />
            )}
            {(macros?.protein?.percentage || 0) < 50 && macros?.protein?.percentage !== undefined && (
              <InsightItem
                icon="alert-circle"
                color="#F59E0B"
                text="Consider adding more protein-rich foods"
              />
            )}
            {mealsLogged === 0 && (
              <InsightItem
                icon="restaurant-outline"
                color="#3B82F6"
                text="Log your first meal to start tracking"
              />
            )}
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

function MacroBar({ name, consumed, goal, percentage, color, unit }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroValue}>
          {consumed}{unit} / {goal}{unit}
        </Text>
      </View>
      <View style={styles.macroBarContainer}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function InsightItem({ icon, color, text }) {
  return (
    <View style={styles.insightRow}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function getCalorieColor(percentage) {
  if (percentage >= 100) return '#10B981';
  if (percentage >= 75) return '#F59E0B';
  return VIBRANT_WELLNESS.nutrition.solid;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING[4],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[8],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[4],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: SPACING[2],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  card: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  progressContainer: {
    gap: SPACING[2],
  },
  progressBar: {
    height: 12,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  macroList: {
    gap: SPACING[3],
  },
  macroRow: {
    gap: SPACING[1],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  macroBarContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  insightsList: {
    gap: SPACING[2],
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    flex: 1,
  },
  bottomPadding: {
    height: SPACING[8],
  },
});
