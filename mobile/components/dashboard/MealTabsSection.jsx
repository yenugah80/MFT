/**
 * Meal Tabs Section - Today's Meals by type
 * Shows Breakfast, Lunch, Dinner tabs with meal list
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designSystem';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🍽️' },
  { id: 'dinner', label: 'Dinner', emoji: '🍗' },
];

export default function MealTabsSection({
  meals = [
    { id: 1, type: 'breakfast', name: 'Green Sochi', time: '08:10', calories: 100, image: null },
    { id: 2, type: 'lunch', name: 'Chicken Salad', time: '12:30', calories: 380, image: null },
    { id: 3, type: 'lunch', name: 'Green Sochi', time: '14:15', calories: 280, image: null },
    { id: 4, type: 'dinner', name: 'Salmon Bowl', time: '19:00', calories: 520, image: null },
  ],
  onAddMeal,
  onMealPress,
}) {
  const [activeTab, setActiveTab] = useState('breakfast');

  const filteredMeals = meals.filter(meal => meal.type === activeTab);
  const totalMealCalories = filteredMeals.reduce((sum, meal) => sum + meal.calories, 0);

  const MealCard = ({ meal }) => (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => onMealPress?.(meal)}
      activeOpacity={0.7}
    >
      {/* Meal Image */}
      <View style={styles.mealImage}>
        {meal.image ? (
          <Image source={{ uri: meal.image }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholderImage]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Meal Info */}
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealTime}>{meal.time}</Text>
      </View>

      {/* Calories Circle */}
      <View style={styles.calorieCircle}>
        <Text style={styles.calorieValue}>{meal.calories}</Text>
        <Text style={styles.calorieUnit}>cal</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Today's Meals</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {MEAL_TYPES.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meals List */}
      {filteredMeals.length > 0 ? (
        <View style={styles.mealsList}>
          {filteredMeals.map(meal => (
            <MealCard key={meal.id} meal={meal} />
          ))}

          {/* Tab Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalCalories}>{totalMealCalories} cal</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="bowl-outline" size={32} color="rgba(255, 255, 255, 0.4)" />
          <Text style={styles.emptyText}>Meals appear here</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAddMeal}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[COLORS.nutrition.primary, COLORS.nutrition.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabActive: {
    backgroundColor: COLORS.nutrition.primary,
    borderColor: COLORS.nutrition.primary,
  },
  tabEmoji: {
    fontSize: TYPOGRAPHY.size.title2,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.size.body,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  mealsList: {
    marginBottom: SPACING.lg,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  placeholderEmoji: {
    fontSize: TYPOGRAPHY.size.title1,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.xs,
  },
  mealTime: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  calorieCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.nutrition.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  calorieValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  calorieUnit: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.md,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  totalCalories: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.nutrition.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.body,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
});
