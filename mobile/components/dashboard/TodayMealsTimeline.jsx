/**
 * TodayMealsTimeline - Premium vertical timeline for today's meals
 * Features: Thumbnails, NutriScore (A-E) or health scores (0-100), micro tags
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';

// NutriScore badge colors
const NUTRISCORE_COLORS = {
  A: { bg: '#22C55E', text: '#FFF' },
  B: { bg: '#84CC16', text: '#FFF' },
  C: { bg: '#EAB308', text: '#000' },
  D: { bg: '#F97316', text: '#FFF' },
  E: { bg: '#EF4444', text: '#FFF' },
};

// Health score color
function getHealthScoreColor(score) {
  if (score >= 80) return SEMANTIC.success.base;
  if (score >= 60) return SEMANTIC.warning.base;
  if (score >= 40) return '#F97316';
  return SEMANTIC.error?.base || '#EF4444';
}

// Meal type icons
const MEAL_TYPE_ICONS = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

// Single meal timeline item
function MealTimelineItem({ meal, isLast, onPress }) {
  const {
    foodName,
    calories,
    protein,
    mealType,
    imageUrl,
    nutriscore,
    healthScore,
    loggedDate,
    micros,
  } = meal;

  // Format time
  const time = loggedDate
    ? new Date(loggedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Get score display (NutriScore or health score)
  const hasNutriScore = nutriscore && ['A', 'B', 'C', 'D', 'E'].includes(nutriscore.toUpperCase());
  const scoreColors = hasNutriScore ? NUTRISCORE_COLORS[nutriscore.toUpperCase()] : null;
  const displayScore = hasNutriScore ? nutriscore.toUpperCase() : healthScore;

  // Extract key micros for tags
  const microTags = [];
  if (micros) {
    if (micros.vitamin_c?.value > 0) microTags.push({ label: 'Vit C', color: '#F97316' });
    if (micros.iron?.value > 0) microTags.push({ label: 'Iron', color: '#EF4444' });
    if (micros.calcium?.value > 0) microTags.push({ label: 'Ca', color: '#3B82F6' });
    if (micros.potassium?.value > 0) microTags.push({ label: 'K', color: '#8B5CF6' });
  }

  return (
    <TouchableOpacity
      style={styles.mealItem}
      onPress={() => onPress?.(meal)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${foodName}, ${calories} calories, logged at ${time}`}
    >
      {/* Timeline connector */}
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot}>
          <Ionicons
            name={MEAL_TYPE_ICONS[mealType] || 'restaurant-outline'}
            size={12}
            color={BRAND.primary}
          />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Meal content card */}
      <View style={styles.mealCard}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={20} color={TEXT.tertiary} />
            </View>
          )}
          {/* Score badge overlay */}
          {(hasNutriScore || (healthScore && healthScore > 0)) && (
            <View
              style={[
                styles.scoreBadge,
                {
                  backgroundColor: hasNutriScore
                    ? scoreColors.bg
                    : getHealthScoreColor(healthScore),
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreBadgeText,
                  hasNutriScore && { color: scoreColors.text },
                ]}
              >
                {hasNutriScore ? displayScore : Math.round(healthScore)}
              </Text>
            </View>
          )}
        </View>

        {/* Meal info */}
        <View style={styles.mealInfo}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName} numberOfLines={1}>
              {foodName || 'Food item'}
            </Text>
            <Text style={styles.mealTime}>{time}</Text>
          </View>

          {/* Macros row */}
          <View style={styles.macrosRow}>
            <Text style={styles.calorieText}>{Math.round(calories || 0)} cal</Text>
            {protein > 0 && (
              <Text style={styles.proteinText}>{Math.round(protein)}g protein</Text>
            )}
          </View>

          {/* Micro tags */}
          {microTags.length > 0 && (
            <View style={styles.microTagsRow}>
              {microTags.slice(0, 3).map((tag, idx) => (
                <View
                  key={idx}
                  style={[styles.microTag, { backgroundColor: `${tag.color}15` }]}
                >
                  <Text style={[styles.microTagText, { color: tag.color }]}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function TodayMealsTimeline({
  meals = [],
  onMealPress,
  onViewAll,
  maxItems = 5,
}) {
  if (!meals || meals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="restaurant-outline" size={32} color={TEXT.tertiary} />
        </View>
        <Text style={styles.emptyTitle}>No meals logged today</Text>
        <Text style={styles.emptySubtitle}>
          Log your first meal to see it here
        </Text>
      </View>
    );
  }

  // Sort by time (newest first) and limit
  const sortedMeals = [...meals]
    .sort((a, b) => {
      const dateA = new Date(a.loggedDate || a.createdAt).getTime();
      const dateB = new Date(b.loggedDate || b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, maxItems);

  // Calculate totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const avgScore = meals.reduce((sum, m) => sum + (m.healthScore || 0), 0) / meals.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={18} color={BRAND.primary} />
          <Text style={styles.headerTitle}>Today's Meals</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{meals.length}</Text>
          </View>
        </View>
        {meals.length > maxItems && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(totalCalories)}</Text>
          <Text style={styles.summaryLabel}>total cal</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{meals.length}</Text>
          <Text style={styles.summaryLabel}>meals</Text>
        </View>
        {avgScore > 0 && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getHealthScoreColor(avgScore) }]}>
                {Math.round(avgScore)}
              </Text>
              <Text style={styles.summaryLabel}>avg score</Text>
            </View>
          </>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {sortedMeals.map((meal, index) => (
          <MealTimelineItem
            key={meal.id || meal.clientEventId || index}
            meal={meal}
            isLast={index === sortedMeals.length - 1}
            onPress={onMealPress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  countBadge: {
    backgroundColor: BRAND.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[2],
    marginBottom: SPACING[4],
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  summaryLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
  },
  timeline: {
    paddingLeft: SPACING[1],
  },
  mealItem: {
    flexDirection: 'row',
    marginBottom: SPACING[2],
  },
  timelineConnector: {
    width: 24,
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${BRAND.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    bottom: -8,
    width: 2,
    backgroundColor: `${BRAND.primary}20`,
    left: 11,
  },
  mealCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[2],
    gap: SPACING[3],
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  mealInfo: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mealName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginRight: SPACING[2],
  },
  mealTime: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: 4,
  },
  calorieText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  proteinText: {
    fontSize: 11,
    color: '#3B82F6',
  },
  microTagsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  microTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  microTagText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  emptyContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});
