/**
 * MealMoodCorrelation - Recent Meals with Mood Correlation Display
 *
 * Features:
 * - Shows recent meals within 4-hour window
 * - Displays macro breakdown bars
 * - NOVA score badges
 * - Time delta calculation
 * - Correlation strength indicators (optional)
 * - Tap to expand meal details
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  MACRO_COLORS,
} from '../../constants/premiumTheme';

const MealMoodCorrelation = ({ meals = [], currentMood = null }) => {
  const [expandedMeals, setExpandedMeals] = useState(new Set());

  const toggleExpand = (mealId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId);
    } else {
      newExpanded.add(mealId);
    }
    setExpandedMeals(newExpanded);
  };

  // Calculate time delta in human-readable format
  const getTimeDelta = (loggedDate) => {
    const now = new Date();
    const mealTime = new Date(loggedDate);
    const diffMs = now - mealTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    }
    return `${diffMinutes}m ago`;
  };

  // Get NOVA score color
  const getNovaColor = (score) => {
    if (score <= 1) return SEMANTIC.success.base;
    if (score <= 2) return SEMANTIC.info.base;
    if (score <= 3) return SEMANTIC.warning.base;
    return SEMANTIC.error.base;
  };

  // Get NOVA score label
  const getNovaLabel = (score) => {
    if (score <= 1) return 'Whole';
    if (score <= 2) return 'Processed';
    if (score <= 3) return 'Processed';
    return 'Ultra-Processed';
  };

  if (meals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="restaurant" size={20} color={TEXT.secondary} />
          <Text style={styles.title}>Recent Meals</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent meals (4h window)</Text>
          <Text style={styles.emptySubtext}>Meals logged within 4 hours will appear here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="restaurant" size={20} color={TEXT.secondary} />
        <Text style={styles.title}>Recent Meals (4h window)</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{meals.length}</Text>
        </View>
      </View>

      {/* Meals List */}
      {meals.map((meal, index) => {
        const isExpanded = expandedMeals.has(meal.id);
        const totalMacros = (meal.carbs || 0) + (meal.protein || 0) + (meal.fats || 0);

        return (
          <TouchableOpacity
            key={meal.id || index}
            style={styles.mealCard}
            onPress={() => toggleExpand(meal.id)}
            activeOpacity={0.7}
          >
            {/* Meal Header */}
            <View style={styles.mealHeader}>
              <View style={styles.mealHeaderLeft}>
                <Text style={styles.mealName} numberOfLines={1}>
                  {meal.foodName}
                </Text>
                <Text style={styles.mealTime}>{getTimeDelta(meal.loggedDate)}</Text>
              </View>

              <View style={styles.mealHeaderRight}>
                {/* NOVA Score Badge */}
                {meal.novaScore && (
                  <View
                    style={[
                      styles.novaBadge,
                      { backgroundColor: getNovaColor(meal.novaScore) },
                    ]}
                  >
                    <Text style={styles.novaText}>NOVA {meal.novaScore}</Text>
                  </View>
                )}

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={TEXT.tertiary}
                />
              </View>
            </View>

            {/* Macro Bars (Always Visible) */}
            {totalMacros > 0 && (
              <View style={styles.macrosContainer}>
                <MacroBar
                  label="C"
                  value={meal.carbs || 0}
                  total={totalMacros}
                  color={MACRO_COLORS.carbs.base}
                />
                <MacroBar
                  label="P"
                  value={meal.protein || 0}
                  total={totalMacros}
                  color={MACRO_COLORS.protein.base}
                />
                <MacroBar
                  label="F"
                  value={meal.fats || 0}
                  total={totalMacros}
                  color={MACRO_COLORS.fat.base}
                />
              </View>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <View style={styles.expandedDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Calories:</Text>
                  <Text style={styles.detailValue}>{meal.calories || 0} kcal</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Carbs:</Text>
                  <Text style={styles.detailValue}>{meal.carbs || 0}g</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Protein:</Text>
                  <Text style={styles.detailValue}>{meal.protein || 0}g</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fat:</Text>
                  <Text style={styles.detailValue}>{meal.fats || 0}g</Text>
                </View>

                {meal.novaScore && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Processing:</Text>
                    <Text style={styles.detailValue}>{getNovaLabel(meal.novaScore)}</Text>
                  </View>
                )}

                {meal.timeDeltaHours !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time since meal:</Text>
                    <Text style={styles.detailValue}>
                      {meal.timeDeltaHours.toFixed(1)}h
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * MacroBar Component - Horizontal bar showing macro percentage
 */
const MacroBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <View style={styles.macroBarContainer}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroBarTrack}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.macroValue}>{value}g</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: SEMANTIC.info.base,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[0.5],
    borderRadius: RADIUS.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  mealCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  mealHeaderLeft: {
    flex: 1,
    marginRight: SPACING[2],
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  mealTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  novaBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  novaText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  macrosContainer: {
    gap: SPACING[1.5],
  },
  macroBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    width: 12,
  },
  macroBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    width: 32,
    textAlign: 'right',
  },
  expandedDetails: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: SPACING[2],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
    textAlign: 'center',
  },
});

export default MealMoodCorrelation;
