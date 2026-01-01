/**
 * SmartRecommendationsCard - AI-powered personalized food recommendations
 * Based on remaining budget, time of day, and user preferences
 * Enhanced with animations, pull-to-refresh, and loading states
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BRAND, SURFACES, TEXT, SPACING, SHADOWS } from '../../constants/premiumTheme';

const RECOMMENDATION_TYPES = {
  PROTEIN_BOOST: {
    icon: 'barbell-outline',
    title: '💪 Protein Boost',
    color: ['#FBBF24', '#F59E0B'],
    description: 'You need more protein',
  },
  BALANCED_MEAL: {
    icon: 'restaurant-outline',
    title: '🥗 Balanced Meal',
    color: ['#86EFAC', '#22C55E'],
    description: 'Complete macro nutrition',
  },
  LIGHT_SNACK: {
    icon: 'apple-outline',
    title: '🍎 Light Snack',
    color: ['#A7F3D0', '#10B981'],
    description: 'Low calorie option',
  },
  HYDRATION: {
    icon: 'water-outline',
    title: '💧 Hydration',
    color: ['#BFDBFE', '#3B82F6'],
    description: 'Boost water intake',
  },
  REGIONAL_PICK: {
    icon: 'flag-outline',
    title: '🌍 Regional Pick',
    color: ['#E9D5FF', '#8B5CF6'],
    description: 'Your cuisine preference',
  },
};

export default function SmartRecommendationsCard({
  today = {},
  goals = {},
  userProfile = {},
  recommendations = [],
  isLoading = false,
  onSelectRecommendation,
  onRefresh,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnims = useRef(recommendations.map(() => new Animated.Value(0))).current;

  const nutrition = today?.nutrition || {};

  // Animate cards on load
  useEffect(() => {
    if (!isLoading && recommendations.length > 0) {
      // Staggered animation for each card
      Animated.stagger(80,
        fadeAnims.slice(0, recommendations.length).map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        )
      ).start();
    } else if (recommendations.length === 0) {
      // Reset animations if no recommendations
      fadeAnims.forEach(anim => anim.setValue(0));
    }
  }, [isLoading, recommendations.length]);

  // Determine primary recommendation based on remaining budget
  const primaryRecommendation = useMemo(() => {
    const remainingCalories = Math.max(0, (goals?.dailyCalories || 2000) - (nutrition?.totalCalories || 0));
    const remainingProtein = Math.max(0, (goals?.proteinG || 150) - (nutrition?.totalProtein || 0));

    if (remainingProtein > 50) return RECOMMENDATION_TYPES.PROTEIN_BOOST;
    if (remainingCalories < 200) return RECOMMENDATION_TYPES.LIGHT_SNACK;
    if ((today?.waterIntakeLiters || 0) < (goals?.waterLiters || 2.0) - 1) {
      return RECOMMENDATION_TYPES.HYDRATION;
    }
    if (userProfile?.cuisinePreference?.[0]) return RECOMMENDATION_TYPES.REGIONAL_PICK;
    return RECOMMENDATION_TYPES.BALANCED_MEAL;
  }, [nutrition, goals, today, userProfile]);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (onRefresh) {
        await onRefresh();
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('[SmartRecommendationsCard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getTimeOfDayMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Breakfast recommendations';
    if (hour < 16) return '🌤️ Lunch recommendations';
    if (hour < 20) return '🌆 Dinner recommendations';
    return '🌙 Snack recommendations';
  };

  const RecommendationItem = ({ rec, index }) => (
    <Animated.View
      style={[
        styles.recCardWrapper,
        {
          opacity: fadeAnims[index] || 0,
          transform: [{
            translateY: (fadeAnims[index] || new Animated.Value(0)).interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.recCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelectRecommendation?.(rec);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={rec.color || primaryRecommendation.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recGradient}
        >
          <View style={styles.recContent}>
            <View style={styles.recHeader}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={TEXT.white} />
            </View>

            <Text style={styles.recFoodName}>{rec.foodName}</Text>

            <View style={styles.recNutrition}>
              <Text style={styles.recNutritionItem}>
                <Ionicons name="flame-outline" size={12} /> {rec.calories} cal
              </Text>
              <Text style={styles.recNutritionItem}>
                <Ionicons name="barbell-outline" size={12} /> {rec.protein}g protein
              </Text>
            </View>

            {rec.reason && (
              <Text style={styles.recReason}>💡 {rec.reason}</Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Getting personalized recommendations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with refresh button */}
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={24} color={BRAND.primary} />
          <Text style={styles.sectionTitle}>Smart Recommendations</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing || isLoading}
          style={styles.refreshButton}
          activeOpacity={0.6}
        >
          <Animated.View
            style={[
              refreshing && {
                transform: [{
                  rotate: refreshing ? '360deg' : '0deg'
                }]
              }
            ]}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={refreshing ? BRAND.primary : TEXT.secondary}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <Text style={styles.timeMessage}>{getTimeOfDayMessage()}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
          />
        }
      >
        {recommendations && recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <RecommendationItem key={rec.id || index} rec={rec} index={index} />
          ))
        ) : (
          // Default recommendations if none provided
          <>
            <RecommendationItem
              rec={{
                id: 'default-1',
                title: primaryRecommendation.title,
                foodName: 'Grilled Chicken Breast',
                calories: 165,
                protein: 31,
                reason: 'High protein, low calorie',
                color: primaryRecommendation.color,
              }}
              index={0}
            />
            <RecommendationItem
              rec={{
                id: 'default-2',
                title: '🥗 Balanced Meal',
                foodName: 'Quinoa Buddha Bowl',
                calories: 280,
                protein: 12,
                reason: 'Complete nutrition profile',
                color: RECOMMENDATION_TYPES.BALANCED_MEAL.color,
              }}
              index={1}
            />
            <RecommendationItem
              rec={{
                id: 'default-3',
                title: '🍎 Light Snack',
                foodName: 'Greek Yogurt',
                calories: 100,
                protein: 15,
                reason: 'Protein-rich snack',
                color: RECOMMENDATION_TYPES.LIGHT_SNACK.color,
              }}
              index={2}
            />
          </>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickAction}>
          <Ionicons name="search-outline" size={20} color={BRAND.primary} />
          <Text style={styles.quickActionText}>Search Foods</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <Ionicons name="camera-outline" size={20} color={BRAND.primary} />
          <Text style={styles.quickActionText}>Scan Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <Ionicons name="mic-outline" size={20} color={BRAND.primary} />
          <Text style={styles.quickActionText}>Voice Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: TEXT.secondary,
    fontSize: 14,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    marginLeft: SPACING.sm,
  },
  refreshButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.md,
  },
  timeMessage: {
    fontSize: 13,
    color: TEXT.secondary,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  scrollContent: {
    paddingRight: SPACING.md,
    gap: SPACING.md,
  },
  recCardWrapper: {
    width: 280,
  },
  recCard: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  recGradient: {
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  recContent: {
    gap: SPACING.sm,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.white,
  },
  recFoodName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.white,
    marginTop: SPACING.sm,
  },
  recNutrition: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  recNutritionItem: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  recReason: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  quickAction: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
});
