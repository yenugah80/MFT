/**
 * SmartMealSuggestionCard - Premium Meal Suggestions
 *
 * Design Philosophy: "Calm Luxury" with Oura-inspired aesthetics
 * - Time-aware intelligent suggestions
 * - Beautiful gradient cards
 * - Ionicons (NO emojis)
 * - Smooth animations
 * - Premium visual hierarchy
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS, CARD_SYSTEM } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';

// Premium color palette for food categories
const CATEGORY_COLORS = {
  protein: {
    gradient: ['#10B981', '#059669'],
    icon: 'fish-outline',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  balanced: {
    gradient: ['#6366F1', '#4F46E5'],
    icon: 'restaurant-outline',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  light: {
    gradient: ['#F59E0B', '#D97706'],
    icon: 'leaf-outline',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  carbs: {
    gradient: ['#8B5CF6', '#7C3AED'],
    icon: 'pizza-outline',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
};

// Premium food suggestions with Ionicons
const SUGGESTIONS_DB = [
  // High protein
  { name: 'Grilled Chicken', cal: 165, protein: 31, icon: 'flame-outline', category: 'protein' },
  { name: 'Greek Yogurt', cal: 150, protein: 15, icon: 'nutrition-outline', category: 'protein' },
  { name: 'Salmon Fillet', cal: 208, protein: 20, icon: 'fish-outline', category: 'protein' },
  { name: 'Eggs & Avocado', cal: 240, protein: 14, icon: 'egg-outline', category: 'protein' },
  { name: 'Cottage Cheese', cal: 110, protein: 14, icon: 'cube-outline', category: 'protein' },
  // Balanced meals
  { name: 'Chicken Rice Bowl', cal: 450, protein: 35, icon: 'restaurant-outline', category: 'balanced' },
  { name: 'Quinoa Salad', cal: 320, protein: 12, icon: 'leaf-outline', category: 'balanced' },
  { name: 'Turkey Wrap', cal: 380, protein: 28, icon: 'fast-food-outline', category: 'balanced' },
  { name: 'Buddha Bowl', cal: 420, protein: 18, icon: 'flower-outline', category: 'balanced' },
  // Light options
  { name: 'Garden Salad', cal: 120, protein: 4, icon: 'leaf-outline', category: 'light' },
  { name: 'Apple & Almonds', cal: 200, protein: 5, icon: 'nutrition-outline', category: 'light' },
  { name: 'Protein Smoothie', cal: 250, protein: 20, icon: 'water-outline', category: 'light' },
  { name: 'Veggie Sticks', cal: 80, protein: 2, icon: 'color-wand-outline', category: 'light' },
];

/**
 * Get meal type based on current hour
 */
function getCurrentMealContext() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return {
    type: 'breakfast',
    label: 'Breakfast Ideas',
    icon: 'sunny-outline',
    gradient: ['#FBBF24', '#F59E0B'],
  };
  if (hour >= 10 && hour < 12) return {
    type: 'snack',
    label: 'Morning Snack',
    icon: 'cafe-outline',
    gradient: ['#A78BFA', '#8B5CF6'],
  };
  if (hour >= 12 && hour < 14) return {
    type: 'lunch',
    label: 'Lunch Ideas',
    icon: 'restaurant-outline',
    gradient: ['#34D399', '#10B981'],
  };
  if (hour >= 14 && hour < 17) return {
    type: 'snack',
    label: 'Afternoon Snack',
    icon: 'nutrition-outline',
    gradient: ['#FB923C', '#F97316'],
  };
  if (hour >= 17 && hour < 21) return {
    type: 'dinner',
    label: 'Dinner Ideas',
    icon: 'moon-outline',
    gradient: ['#60A5FA', '#3B82F6'],
  };
  return {
    type: 'snack',
    label: 'Late Night Snack',
    icon: 'bed-outline',
    gradient: ['#C084FC', '#A855F7'],
  };
}

/**
 * Generate smart suggestions based on context
 */
function generateSuggestions({ remainingCalories, remainingProtein, mealType, recentMeals = [] }) {
  const scored = SUGGESTIONS_DB.map(s => {
    let score = 50;
    if (s.cal <= remainingCalories) score += 30;
    if (remainingProtein > 20 && s.protein >= 15) score += 25;
    if (remainingCalories < 400 && s.cal < 250) score += 20;
    if (mealType.type === 'snack' && s.category === 'light') score += 15;
    if (mealType.type === 'dinner' && s.category === 'balanced') score += 10;
    if (mealType.type === 'breakfast' && s.category === 'protein') score += 10;
    // Avoid recent
    const recent = recentMeals.map(m => (m.foodName || '').toLowerCase());
    if (recent.some(r => s.name.toLowerCase().includes(r))) score -= 30;
    return { ...s, score };
  });

  return scored
    .filter(s => s.cal <= remainingCalories + 100)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Premium Suggestion Card Component
 */
function SuggestionCard({ item, index, onSelect, isDark }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const categoryConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.balanced;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(item);
  };

  return (
    <Animated.View
      style={[
        styles.suggestionCard,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.suggestionTouchable,
          isDark && styles.suggestionTouchableDark,
        ]}
      >
        {/* Category Icon with Gradient */}
        <LinearGradient
          colors={categoryConfig.gradient}
          style={styles.suggestionIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={item.icon} size={20} color="#FFF" />
        </LinearGradient>

        {/* Content */}
        <View style={styles.suggestionContent}>
          <Text
            style={[styles.suggestionName, isDark && styles.textDark]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.suggestionMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={12} color={TEXT.tertiary} />
              <Text style={styles.metaText}>{item.cal} cal</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="barbell-outline" size={12} color={TEXT.tertiary} />
              <Text style={styles.metaText}>{item.protein}g</Text>
            </View>
          </View>
        </View>

        {/* Add Button */}
        <View style={styles.addButtonContainer}>
          <LinearGradient
            colors={[BRAND.primary, '#8B6EFF']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={18} color="#FFF" />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Remaining Budget Indicator
 */
function BudgetIndicator({ remaining, isDark }) {
  const isLow = remaining.calories < 300;
  const percentage = Math.min(100, (remaining.calories / 500) * 100);

  return (
    <View style={[styles.budgetContainer, isDark && styles.budgetContainerDark]}>
      <View style={styles.budgetHeader}>
        <Text style={[styles.budgetLabel, isDark && styles.textMutedDark]}>Remaining</Text>
        <Text style={[
          styles.budgetValue,
          isLow && styles.budgetValueLow,
          isDark && styles.textDark,
        ]}>
          {remaining.calories} cal
        </Text>
      </View>
      <View style={styles.budgetBarBg}>
        <LinearGradient
          colors={isLow ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
          style={[styles.budgetBarFill, { width: `${percentage}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <View style={styles.budgetMeta}>
        <View style={styles.budgetMetaItem}>
          <Ionicons name="barbell-outline" size={12} color={TEXT.tertiary} />
          <Text style={styles.budgetMetaText}>{remaining.protein}g protein left</Text>
        </View>
      </View>
    </View>
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
  const { isDark } = useTheme();
  const cardAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [cardAnim, shimmerAnim]);

  // Show encouraging empty state instead of hiding completely
  if (suggestions.length === 0) {
    return (
      <Animated.View
        style={[
          styles.container,
          isDark && styles.containerDark,
          {
            opacity: cardAnim,
            transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          },
        ]}
      >
        {/* Header with Meal Context */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={mealContext.gradient}
              style={styles.headerIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={mealContext.icon} size={18} color="#FFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, isDark && styles.textDark]}>
                {mealContext.label}
              </Text>
              <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
                Ready to suggest meals
              </Text>
            </View>
          </View>
        </View>

        {/* Empty State Content */}
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="sparkles-outline" size={28} color={BRAND.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, isDark && styles.textDark]}>
            Log your first meal
          </Text>
          <Text style={[styles.emptyStateText, isDark && styles.textMutedDark]}>
            We'll personalize suggestions based on your nutrition goals and preferences
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isDark && styles.containerDark,
        {
          opacity: cardAnim,
          transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        },
      ]}
    >
      {/* Header with Meal Context */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={mealContext.gradient}
            style={styles.headerIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={mealContext.icon} size={18} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerTitle, isDark && styles.textDark]}>
              {mealContext.label}
            </Text>
            <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
              Personalized for you
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewMore}
          style={styles.viewMoreButton}
          activeOpacity={0.7}
        >
          <Text style={styles.viewMoreText}>More</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* Budget Indicator */}
      <BudgetIndicator remaining={remaining} isDark={isDark} />

      {/* Suggestions List */}
      <View style={styles.suggestionsList}>
        {suggestions.map((item, index) => (
          <SuggestionCard
            key={item.name}
            item={item}
            index={index}
            onSelect={onSelectSuggestion}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, isDark && styles.quickActionDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectSuggestion?.({ name: 'Custom meal', isCustom: true });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={BRAND.primary} />
          <Text style={styles.quickActionText}>Log custom meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, isDark && styles.quickActionDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectSuggestion?.({ name: 'Scan barcode', isBarcode: true });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="scan-outline" size={16} color={BRAND.primary} />
          <Text style={styles.quickActionText}>Scan barcode</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2], // Consistent with other cards
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base, // Consistent with other cards
    fontWeight: TYPOGRAPHY.weight.semibold, // Consistent with other cards
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
  },
  viewMoreText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: 'rgba(248, 250, 252, 0.6)',
  },

  // Budget Indicator
  budgetContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  budgetContainerDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  budgetLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  budgetValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#10B981',
  },
  budgetValueLow: {
    color: '#F59E0B',
  },
  budgetBarBg: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  budgetMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetMetaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Suggestion Cards
  suggestionsList: {
    gap: SPACING[3],
  },
  suggestionCard: {
    // For animation wrapper
  },
  suggestionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  suggestionTouchableDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: SPACING[2],
  },
  addButtonContainer: {
    // Container for shadow
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: `${BRAND.primary}08`,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  quickActionDark: {
    backgroundColor: `${BRAND.primary}15`,
  },
  quickActionText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
  },
  emptyStateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
