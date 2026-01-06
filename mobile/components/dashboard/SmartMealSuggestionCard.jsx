/**
 * SmartMealSuggestionCard - Elegant Meal Suggestions
 *
 * Minimal, clean design with:
 * - Time-aware suggestions
 * - Quick-add functionality
 * - Subtle animations
 * - No visual clutter
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SHADOWS } from '../../constants/premiumTheme';

/**
 * Get meal type based on current hour
 */
function getCurrentMealContext() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return { type: 'breakfast', label: 'Breakfast ideas', icon: 'sunny-outline' };
  if (hour >= 10 && hour < 12) return { type: 'snack', label: 'Snack ideas', icon: 'cafe-outline' };
  if (hour >= 12 && hour < 14) return { type: 'lunch', label: 'Lunch ideas', icon: 'restaurant-outline' };
  if (hour >= 14 && hour < 17) return { type: 'snack', label: 'Snack ideas', icon: 'nutrition-outline' };
  if (hour >= 17 && hour < 21) return { type: 'dinner', label: 'Dinner ideas', icon: 'moon-outline' };
  return { type: 'snack', label: 'Late snack', icon: 'bed-outline' };
}

/**
 * Generate smart suggestions based on context
 */
function generateSuggestions({ remainingCalories, remainingProtein, mealType, recentMeals = [] }) {
  const suggestions = [
    // High protein
    { name: 'Grilled Chicken', cal: 165, protein: 31, icon: '🍗', category: 'protein' },
    { name: 'Greek Yogurt', cal: 150, protein: 15, icon: '🥣', category: 'protein' },
    { name: 'Salmon', cal: 208, protein: 20, icon: '🐟', category: 'protein' },
    { name: 'Eggs', cal: 140, protein: 12, icon: '🥚', category: 'protein' },
    // Balanced
    { name: 'Chicken Rice Bowl', cal: 450, protein: 35, icon: '🍚', category: 'balanced' },
    { name: 'Quinoa Salad', cal: 320, protein: 12, icon: '🥗', category: 'balanced' },
    { name: 'Turkey Sandwich', cal: 380, protein: 28, icon: '🥪', category: 'balanced' },
    // Light
    { name: 'Green Salad', cal: 120, protein: 4, icon: '🥬', category: 'light' },
    { name: 'Apple & Almond Butter', cal: 200, protein: 5, icon: '🍎', category: 'light' },
    { name: 'Protein Smoothie', cal: 250, protein: 20, icon: '🥤', category: 'light' },
  ];

  // Score and filter
  const scored = suggestions.map(s => {
    let score = 50;
    if (s.cal <= remainingCalories) score += 30;
    if (remainingProtein > 20 && s.protein >= 15) score += 25;
    if (remainingCalories < 400 && s.cal < 250) score += 20;
    if (mealType.type === 'snack' && s.category === 'light') score += 15;
    if (mealType.type === 'dinner' && s.category === 'balanced') score += 10;
    // Avoid recent
    const recent = recentMeals.map(m => m.foodName?.toLowerCase() || '');
    if (recent.some(r => s.name.toLowerCase().includes(r))) score -= 30;
    return { ...s, score };
  });

  return scored
    .filter(s => s.cal <= remainingCalories + 100)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Suggestion Item Component
 */
function SuggestionItem({ item, index, onSelect }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(item);
  };

  return (
    <Animated.View
      style={[
        styles.suggestionItem,
        {
          opacity: anim,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.suggestionRow}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.suggestionEmoji}>{item.icon}</Text>
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.suggestionMeta}>
            {item.cal} cal · {item.protein}g protein
          </Text>
        </View>
        <View style={styles.addBtn}>
          <Ionicons name="add" size={18} color={BRAND.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Main SmartMealSuggestionCard Component
 */
export default function SmartMealSuggestionCard({
  today = {},
  goals = {},
  recentMeals = [],
  userProfile = {},
  onSelectSuggestion,
  onViewMore,
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Calculate remaining budget
  const remaining = useMemo(() => {
    const nutrition = today?.nutrition || {};
    return {
      calories: Math.max(0, (goals?.dailyCalories || 2000) - (nutrition.totalCalories || 0)),
      protein: Math.max(0, (goals?.proteinG || 150) - (nutrition.totalProtein || 0)),
    };
  }, [today, goals]);

  // Get meal context
  const mealContext = useMemo(() => getCurrentMealContext(), []);

  // Generate suggestions
  const suggestions = useMemo(() => {
    return generateSuggestions({
      remainingCalories: remaining.calories,
      remainingProtein: remaining.protein,
      mealType: mealContext,
      recentMeals: today?.foodLogs || [],
    });
  }, [remaining, mealContext, today]);

  // Entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  if (suggestions.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: cardAnim }], opacity: cardAnim },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={mealContext.icon} size={18} color={BRAND.primary} />
          <Text style={styles.headerTitle}>{mealContext.label}</Text>
        </View>
        <View style={styles.budgetPill}>
          <Text style={styles.budgetText}>{remaining.calories} cal left</Text>
        </View>
      </View>

      {/* Suggestions */}
      <View style={styles.suggestionsList}>
        {suggestions.map((item, index) => (
          <SuggestionItem
            key={item.name}
            item={item}
            index={index}
            onSelect={onSelectSuggestion}
          />
        ))}
      </View>

      {/* View more */}
      <TouchableOpacity style={styles.viewMore} onPress={onViewMore} activeOpacity={0.7}>
        <Text style={styles.viewMoreText}>Browse more options</Text>
        <Ionicons name="chevron-forward" size={14} color={TEXT.tertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS['2xl'],
    backgroundColor: '#FFFFFF',
    padding: SPACING[5],
    // Luxurious shadow
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    // Premium border
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  budgetPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  budgetText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#10B981',
  },

  // Suggestions
  suggestionsList: {
    gap: SPACING[2],
  },
  suggestionItem: {
    // For animation
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: RADIUS.lg,
  },
  suggestionEmoji: {
    fontSize: 22,
    marginRight: SPACING[3],
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // View more
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  viewMoreText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
