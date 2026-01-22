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

import { BRAND, TEXT, SURFACES, SHADOWS, CARD_SYSTEM, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';
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

// Premium food suggestions with Ionicons - enhanced with dietary tags and micronutrients
const SUGGESTIONS_DB = [
  // High protein
  { name: 'Grilled Chicken', cal: 165, protein: 31, icon: 'flame-outline', category: 'protein', tags: ['gluten-free', 'dairy-free', 'low-carb'], micros: ['b6', 'niacin'], mood: ['energy'] },
  { name: 'Greek Yogurt', cal: 150, protein: 15, icon: 'nutrition-outline', category: 'protein', tags: ['vegetarian', 'gluten-free'], micros: ['calcium', 'b12', 'probiotics'], mood: ['calm'] },
  { name: 'Salmon Fillet', cal: 208, protein: 20, icon: 'fish-outline', category: 'protein', tags: ['gluten-free', 'dairy-free', 'pescatarian'], micros: ['omega3', 'vitaminD', 'b12'], mood: ['focus', 'calm'] },
  { name: 'Eggs & Avocado', cal: 240, protein: 14, icon: 'egg-outline', category: 'protein', tags: ['vegetarian', 'gluten-free', 'dairy-free', 'keto'], micros: ['b12', 'vitaminD', 'potassium'], mood: ['energy'] },
  { name: 'Cottage Cheese', cal: 110, protein: 14, icon: 'cube-outline', category: 'protein', tags: ['vegetarian', 'gluten-free'], micros: ['calcium', 'b12'], mood: ['calm'] },
  { name: 'Lentil Soup', cal: 180, protein: 12, icon: 'flame-outline', category: 'protein', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['iron', 'folate', 'fiber'], mood: ['comfort'] },
  { name: 'Tofu Stir-fry', cal: 220, protein: 18, icon: 'restaurant-outline', category: 'protein', tags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'], micros: ['iron', 'calcium'], mood: ['energy'] },
  // Balanced meals
  { name: 'Chicken Rice Bowl', cal: 450, protein: 35, icon: 'restaurant-outline', category: 'balanced', tags: ['gluten-free', 'dairy-free'], micros: ['b6', 'niacin'], mood: ['energy', 'comfort'] },
  { name: 'Quinoa Salad', cal: 320, protein: 12, icon: 'leaf-outline', category: 'balanced', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['iron', 'magnesium', 'fiber'], mood: ['focus'] },
  { name: 'Turkey Wrap', cal: 380, protein: 28, icon: 'fast-food-outline', category: 'balanced', tags: ['dairy-free'], micros: ['b6', 'zinc'], mood: ['energy'] },
  { name: 'Buddha Bowl', cal: 420, protein: 18, icon: 'flower-outline', category: 'balanced', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['fiber', 'vitaminC', 'iron'], mood: ['calm', 'focus'] },
  { name: 'Mediterranean Plate', cal: 400, protein: 15, icon: 'restaurant-outline', category: 'balanced', tags: ['vegetarian', 'gluten-free'], micros: ['omega3', 'fiber', 'vitaminE'], mood: ['calm'] },
  // Light options
  { name: 'Garden Salad', cal: 120, protein: 4, icon: 'leaf-outline', category: 'light', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-carb'], micros: ['vitaminC', 'vitaminA', 'fiber'], mood: ['focus'] },
  { name: 'Apple & Almonds', cal: 200, protein: 5, icon: 'nutrition-outline', category: 'light', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['fiber', 'vitaminE', 'magnesium'], mood: ['focus', 'energy'] },
  { name: 'Protein Smoothie', cal: 250, protein: 20, icon: 'water-outline', category: 'light', tags: ['vegetarian', 'gluten-free'], micros: ['calcium', 'b12', 'potassium'], mood: ['energy'] },
  { name: 'Veggie Sticks & Hummus', cal: 150, protein: 6, icon: 'color-wand-outline', category: 'light', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['fiber', 'iron', 'vitaminA'], mood: ['focus'] },
  { name: 'Dark Chocolate & Berries', cal: 180, protein: 3, icon: 'heart-outline', category: 'light', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['antioxidants', 'iron', 'magnesium'], mood: ['comfort', 'calm'] },
  { name: 'Banana & Nut Butter', cal: 220, protein: 6, icon: 'nutrition-outline', category: 'light', tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], micros: ['potassium', 'magnesium', 'b6'], mood: ['energy', 'comfort'] },
];

/**
 * Map backend mealType to category for styling
 */
function mapMealTypeToCategory(mealType) {
  const mapping = {
    breakfast: 'protein',
    lunch: 'balanced',
    dinner: 'balanced',
    snack: 'light',
    dessert: 'carbs',
  };
  return mapping[mealType?.toLowerCase()] || 'balanced';
}

/**
 * Get icon based on category/meal type
 */
function getCategoryIcon(mealType) {
  const icons = {
    breakfast: 'sunny-outline',
    lunch: 'restaurant-outline',
    dinner: 'moon-outline',
    snack: 'nutrition-outline',
    dessert: 'ice-cream-outline',
    protein: 'fish-outline',
    balanced: 'restaurant-outline',
    light: 'leaf-outline',
    carbs: 'pizza-outline',
  };
  return icons[mealType?.toLowerCase()] || 'restaurant-outline';
}

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
 * Generate smart suggestions based on context - ENHANCED with personalization
 *
 * Scoring factors:
 * - Budget fit (calories/protein remaining)
 * - Meal type match (breakfast/lunch/dinner/snack)
 * - Primary goal (lose/maintain/gain weight)
 * - Lifecycle stage (brand_new → simpler, power_user → variety)
 * - Gamification level (higher level → more diverse options)
 * - Dietary preferences & allergies (hard filters)
 * - Correlation insights (good/avoid foods)
 * - Micronutrient deficits
 * - Mood context
 */
function generateSuggestions({
  remainingCalories,
  remainingProtein,
  mealType,
  recentMeals = [],
  userProfile = {},
  correlationInsights = null,
  micronutrientDeficits = null,
  moodContext = null,
  goals = {},
  lifecycleStage = null,
  level = 1,
}) {
  // Extract user preferences
  const allergens = (userProfile?.allergies || []).map(a => a.toLowerCase());
  const dietaryPrefs = (userProfile?.dietaryPreferences || []).map(p => p.toLowerCase());
  const avoidFoods = (correlationInsights?.avoidFoods || []).map(f => f.toLowerCase());
  const goodFoods = (correlationInsights?.goodFoods || []).map(f => f.toLowerCase());
  const lowMicros = (micronutrientDeficits?.low || []).map(m => m.toLowerCase());
  const currentMood = moodContext?.currentMood?.toLowerCase();
  const energyLevel = moodContext?.energyLevel;

  // Extract goal-based preferences
  const primaryGoal = goals?.primaryGoal?.toLowerCase(); // 'lose' | 'maintain' | 'gain'

  // Map mood to suggestion mood tags
  const moodMapping = {
    stressed: ['comfort', 'calm'],
    anxious: ['calm'],
    tired: ['energy'],
    sad: ['comfort'],
    happy: ['focus', 'energy'],
    calm: ['focus'],
    energetic: ['focus'],
  };
  const desiredMoodTags = moodMapping[currentMood] || [];

  // Lifecycle-based complexity preferences
  // New users get simpler, familiar meals; advanced users get more variety
  const isNewUser = ['brand_new', 'onboarding', 'discoverer'].includes(lifecycleStage);
  const isPowerUser = ['power_user', 'optimizer'].includes(lifecycleStage);

  // Filter and score suggestions
  const scored = SUGGESTIONS_DB
    .filter(s => {
      // HARD FILTERS - exclude foods that violate preferences/allergies

      // Check allergens (simplified check - production would need more sophisticated matching)
      if (allergens.includes('dairy') && !s.tags?.includes('dairy-free')) return false;
      if (allergens.includes('gluten') && !s.tags?.includes('gluten-free')) return false;
      if (allergens.includes('eggs') && s.name.toLowerCase().includes('egg')) return false;
      if (allergens.includes('fish') && (s.name.toLowerCase().includes('salmon') || s.name.toLowerCase().includes('fish'))) return false;
      if (allergens.includes('nuts') && (s.name.toLowerCase().includes('almond') || s.name.toLowerCase().includes('nut'))) return false;

      // Check dietary preferences
      if (dietaryPrefs.includes('vegan') && !s.tags?.includes('vegan')) return false;
      if (dietaryPrefs.includes('vegetarian') && !s.tags?.includes('vegetarian') && !s.tags?.includes('vegan')) return false;
      if (dietaryPrefs.includes('keto') && !s.tags?.includes('keto') && !s.tags?.includes('low-carb')) return false;
      if (dietaryPrefs.includes('pescatarian') && !s.tags?.includes('pescatarian') && !s.tags?.includes('vegetarian') && !s.tags?.includes('vegan')) return false;

      // Check correlation-based avoid foods
      if (avoidFoods.some(avoid => s.name.toLowerCase().includes(avoid))) return false;

      return true;
    })
    .map(s => {
      let score = 50;

      // ============================================
      // BUDGET & MEAL TYPE SCORING
      // ============================================
      if (s.cal <= remainingCalories) score += 30;
      if (remainingProtein > 20 && s.protein >= 15) score += 25;
      if (remainingCalories < 400 && s.cal < 250) score += 20;

      // Meal type scoring
      if (mealType.type === 'snack' && s.category === 'light') score += 15;
      if (mealType.type === 'dinner' && s.category === 'balanced') score += 10;
      if (mealType.type === 'breakfast' && s.category === 'protein') score += 10;
      if (mealType.type === 'lunch' && s.category === 'balanced') score += 10;

      // Avoid recently eaten
      const recent = recentMeals.map(m => (m.foodName || '').toLowerCase());
      if (recent.some(r => s.name.toLowerCase().includes(r))) score -= 30;

      // ============================================
      // PRIMARY GOAL SCORING (lose/maintain/gain)
      // ============================================
      if (primaryGoal === 'lose') {
        // Weight loss: favor lower calorie, higher protein foods
        if (s.cal < 200) score += 20;
        if (s.cal < 300 && s.protein >= 15) score += 15;
        if (s.category === 'light') score += 10;
        if (s.tags?.includes('low-carb')) score += 10;
        // Penalize high calorie options
        if (s.cal > 400) score -= 15;
      } else if (primaryGoal === 'gain') {
        // Muscle gain: favor higher protein, balanced meals
        if (s.protein >= 20) score += 25;
        if (s.protein >= 15 && s.cal >= 300) score += 15;
        if (s.category === 'protein') score += 15;
        if (s.category === 'balanced' && s.cal >= 350) score += 10;
        // Slightly penalize very low calorie options
        if (s.cal < 150) score -= 10;
      } else if (primaryGoal === 'maintain') {
        // Maintenance: favor balanced, moderate options
        if (s.category === 'balanced') score += 15;
        if (s.cal >= 200 && s.cal <= 400) score += 10;
      }

      // ============================================
      // LIFECYCLE STAGE SCORING
      // ============================================
      if (isNewUser) {
        // New users: favor familiar, simple meals
        const familiarMeals = ['grilled chicken', 'greek yogurt', 'eggs', 'salad', 'smoothie', 'rice bowl'];
        if (familiarMeals.some(f => s.name.toLowerCase().includes(f))) score += 20;
        // Light penalty for "exotic" options for new users
        const complexMeals = ['buddha bowl', 'quinoa', 'tofu', 'mediterranean'];
        if (complexMeals.some(c => s.name.toLowerCase().includes(c))) score -= 10;
      } else if (isPowerUser) {
        // Power users: encourage variety and nutritious options
        if (s.micros?.length >= 3) score += 15; // Nutrient-dense
        // Boost variety - foods they might not have tried
        const varietyFoods = ['quinoa', 'lentil', 'buddha bowl', 'mediterranean', 'tofu'];
        if (varietyFoods.some(v => s.name.toLowerCase().includes(v))) score += 10;
      }

      // ============================================
      // GAMIFICATION LEVEL SCORING
      // ============================================
      // Higher levels unlock more "adventurous" suggestions
      if (level >= 5) {
        // Level 5+: Slight boost for variety
        if (s.micros?.length >= 2) score += 5;
      }
      if (level >= 10) {
        // Level 10+: Reward nutrient-dense choices
        if (s.micros?.includes('omega3') || s.micros?.includes('iron')) score += 10;
      }
      if (level >= 20) {
        // Level 20+: Full variety unlocked
        score += 5; // Small universal boost for high-level users
      }

      // ============================================
      // CORRELATION & PERSONALIZATION BOOSTS
      // ============================================
      if (goodFoods.some(good => s.name.toLowerCase().includes(good))) {
        score += 35;
      }

      // Micronutrient deficit boost
      if (lowMicros.length > 0 && s.micros) {
        const matchingMicros = s.micros.filter(m =>
          lowMicros.some(low => m.toLowerCase().includes(low) || low.includes(m.toLowerCase()))
        );
        score += matchingMicros.length * 15;
      }

      // Mood-based boost
      if (desiredMoodTags.length > 0 && s.mood) {
        const moodMatch = s.mood.some(m => desiredMoodTags.includes(m));
        if (moodMatch) score += 20;
      }

      // Energy level boost
      if (energyLevel !== undefined) {
        if (energyLevel < 3 && s.mood?.includes('energy')) score += 15;
        if (energyLevel > 7 && s.mood?.includes('focus')) score += 10;
      }

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
function SuggestionCard({ item, index, onSelect, onAccept, onTrack, isDark }) {
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

    // Track that this AI recommendation was shown
    if (item.isAIPowered && item.id && onTrack) {
      onTrack(item.id, 'view');
    }
  }, [anim, index, item.isAIPowered, item.id, onTrack]);

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

  const handleAccept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.isAIPowered && item.originalRec && onAccept) {
      const result = await onAccept(item.originalRec);
      if (result?.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      onSelect?.(item);
    }
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
          <View style={styles.nameRow}>
            <Text
              style={[styles.suggestionName, isDark && styles.textDark]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.isAIPowered && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#8B5CF6" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
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
          {item.reason && (
            <Text style={styles.reasonText} numberOfLines={1}>{item.reason}</Text>
          )}
        </View>

        {/* Add Button - Accept for AI, Select for static */}
        <TouchableOpacity
          style={styles.addButtonContainer}
          onPress={handleAccept}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={item.isAIPowered ? ['#10B981', '#059669'] : [BRAND.primary, '#8B6EFF']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={item.isAIPowered ? 'checkmark' : 'add'} size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
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
 *
 * Personalization hooks (for future pattern-based features):
 * - lifecycleStage: Adjusts messaging tone (brand_new vs power_user)
 * - level: Gamification level for achievement-based suggestions
 * - correlationInsights: Pattern-based suggestions from correlation engine
 * - micronutrientDeficits: Micronutrient-specific meal recommendations
 * - moodContext: Mood-aware meal suggestions
 */
export default function SmartMealSuggestionCard({
  today = {},
  goals = {},
  recentMeals = [],
  userProfile = {},
  onSelectSuggestion,
  onViewMore,
  // AI-powered backend recommendations
  backendRecommendations = [],
  recommendationsLoading = false,
  onAcceptRecommendation,
  onTrackInteraction,
  // Personalization props
  lifecycleStage = null,
  level = 1,
  correlationInsights = null,
  micronutrientDeficits = null,
  moodContext = null,
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

  // Transform backend recommendations to component format
  const transformedBackendRecs = useMemo(() => {
    if (!backendRecommendations?.length) return [];

    return backendRecommendations.slice(0, 3).map(rec => ({
      id: rec.id,
      name: rec.foodName || rec.title,
      cal: rec.calories || 0,
      protein: rec.protein || 0,
      icon: getCategoryIcon(rec.mealType || rec.category),
      category: mapMealTypeToCategory(rec.mealType),
      reason: rec.reason,
      isAIPowered: true,
      originalRec: rec, // Keep original for accept action
    }));
  }, [backendRecommendations]);

  // Use backend recommendations if available, otherwise fall back to static
  const hasBackendRecs = transformedBackendRecs.length > 0;

  // Generate smart suggestions as fallback (uses ALL personalization props)
  const staticSuggestions = useMemo(() => {
    return generateSuggestions({
      remainingCalories: remaining.calories,
      remainingProtein: remaining.protein,
      mealType: mealContext,
      recentMeals: today?.foodLogs || [],
      userProfile,
      correlationInsights,
      micronutrientDeficits,
      moodContext,
      goals,
      lifecycleStage,
      level,
    });
  }, [remaining, mealContext, today, userProfile, correlationInsights, micronutrientDeficits, moodContext, goals, lifecycleStage, level]);

  // Final suggestions: prefer backend, fallback to static
  const suggestions = hasBackendRecs ? transformedBackendRecs : staticSuggestions;

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

        {/* Empty State Content - Lifecycle aware */}
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="sparkles-outline" size={28} color={BRAND.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, isDark && styles.textDark]}>
            {lifecycleStage === 'brand_new' ? 'Start your food journey' :
             lifecycleStage === 'onboarding' ? 'Keep building your profile' :
             'Log your first meal today'}
          </Text>
          <Text style={[styles.emptyStateText, isDark && styles.textMutedDark]}>
            {lifecycleStage === 'brand_new'
              ? 'Log a few meals and we\'ll learn your preferences'
              : lifecycleStage === 'power_user'
                ? 'Your personalized suggestions are ready when you log'
                : 'We\'ll personalize suggestions based on your nutrition goals'}
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
              {/* Personalized subtitle based on context */}
              {recommendationsLoading
                ? 'Finding personalized picks...'
                : hasBackendRecs
                  ? 'AI-powered picks for you'
                  : correlationInsights?.reason
                    ? correlationInsights.reason
                    : micronutrientDeficits?.low?.length > 0
                      ? `Boost your ${micronutrientDeficits.low[0]} intake`
                      : moodContext?.currentMood === 'stressed'
                        ? 'Comfort food to ease your day'
                        : lifecycleStage === 'power_user'
                          ? 'Curated for your goals'
                          : 'Personalized for you'}
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
            key={item.id || item.name}
            item={item}
            index={index}
            onSelect={onSelectSuggestion}
            onAccept={onAcceptRecommendation}
            onTrack={onTrackInteraction}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: 4,
  },
  suggestionName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
    fontStyle: 'italic',
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
    padding: 4,
    marginLeft: SPACING[1],
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
