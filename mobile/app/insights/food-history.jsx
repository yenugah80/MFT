/**
 * Food History Screen
 *
 * Features:
 * - Gradient hero card with today's nutrition summary
 * - Recent meals list grouped by date
 * - Quick nutrition stats
 * - Navigate to full history for comparison
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useFoodLog } from '../../hooks/useFoodLog';
import { useDashboard } from '../../hooks/useDashboard';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: '#6B4EFF',
  primaryDark: '#5B3EEF',
  primaryLight: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  gradient: {
    hero: ['#8B5CF6', '#6B4EFF', '#5B3EEF'],
    success: ['#34D399', '#10B981', '#059669'],
  },
};

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getDateKey = (timestamp) => {
  const date = new Date(timestamp);
  return date.toDateString();
};

// ============================================================================
// COMPONENTS
// ============================================================================

const HeroCard = ({ todayStats, goals }) => {
  const caloriesPercent = goals?.dailyCalories
    ? Math.min(100, (todayStats.calories / goals.dailyCalories) * 100)
    : 0;
  const proteinPercent = goals?.proteinG
    ? Math.min(100, (todayStats.protein / goals.proteinG) * 100)
    : 0;

  return (
    <LinearGradient colors={COLORS.gradient.hero} style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="restaurant" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitle}>Today's Nutrition</Text>
          <Text style={styles.heroSubtitle}>{todayStats.meals} meals logged</Text>
        </View>
      </View>

      <View style={styles.heroStats}>
        <View style={styles.heroStatItem}>
          <Text style={styles.heroStatValue}>{Math.round(todayStats.calories)}</Text>
          <Text style={styles.heroStatLabel}>calories</Text>
          <View style={styles.heroProgressBar}>
            <View style={[styles.heroProgressFill, { width: `${caloriesPercent}%` }]} />
          </View>
        </View>

        <View style={styles.heroStatDivider} />

        <View style={styles.heroStatItem}>
          <Text style={styles.heroStatValue}>{Math.round(todayStats.protein)}g</Text>
          <Text style={styles.heroStatLabel}>protein</Text>
          <View style={styles.heroProgressBar}>
            <View style={[styles.heroProgressFill, { width: `${proteinPercent}%` }]} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const MealCard = ({ meal, onPress }) => {
  return (
    <TouchableOpacity style={styles.mealCard} onPress={() => onPress(meal)} activeOpacity={0.7}>
      <View style={styles.mealIconContainer}>
        <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.mealContent}>
        <Text style={styles.mealName} numberOfLines={1}>{meal.foodName || 'Meal'}</Text>
        <Text style={styles.mealTime}>{formatTime(meal.timestamp)}</Text>
      </View>
      <View style={styles.mealStats}>
        <Text style={styles.mealCalories}>{Math.round(meal.calories || 0)} cal</Text>
        <Text style={styles.mealMacros}>
          P:{Math.round(meal.protein || 0)}g
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );
};

const DateSection = ({ title, meals, onMealPress }) => {
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  return (
    <View style={styles.dateSection}>
      <View style={styles.dateSectionHeader}>
        <Text style={styles.dateSectionTitle}>{title}</Text>
        <Text style={styles.dateSectionStats}>
          {meals.length} meals | {Math.round(totalCalories)} cal
        </Text>
      </View>
      {meals.map((meal, index) => (
        <MealCard
          key={meal.id || meal.clientEventId || `${meal.timestamp}-${index}`}
          meal={meal}
          onPress={onMealPress}
        />
      ))}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FoodHistoryScreen() {
  const router = useRouter();
  const foodLog = useFoodLog();
  const { data: dashboardData } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const goals = dashboardData?.goals;

  // Get recent meals (last 7 days)
  const recentMeals = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return (foodLog.logs || [])
      .filter(log => log.timestamp && log.timestamp > sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [foodLog.logs]);

  // Group meals by date
  const groupedMeals = useMemo(() => {
    const groups = {};
    recentMeals.forEach(meal => {
      const key = getDateKey(meal.timestamp);
      if (!groups[key]) {
        groups[key] = {
          title: formatDate(meal.timestamp),
          timestamp: meal.timestamp,
          meals: [],
        };
      }
      groups[key].meals.push(meal);
    });

    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [recentMeals]);

  // Today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayMeals = recentMeals.filter(m => new Date(m.timestamp).toDateString() === today);

    return {
      meals: todayMeals.length,
      calories: todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fat: todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0),
    };
  }, [recentMeals]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);

      await foodLog.fetchHistory({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 100,
      });
    } finally {
      setRefreshing(false);
    }
  }, [foodLog]);

  const handleMealPress = useCallback((meal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mealId = meal.clientEventId || meal.mealId || meal.id || meal.timestamp;
    router.push({
      pathname: `/meal/${mealId}`,
      params: { logData: JSON.stringify(meal) },
    });
  }, [router]);

  const handleViewFullHistory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/history');
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food History</Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewFullHistory}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <HeroCard todayStats={todayStats} goals={goals} />

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{recentMeals.length}</Text>
              <Text style={styles.quickStatLabel}>meals this week</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {Math.round(recentMeals.reduce((sum, m) => sum + (m.calories || 0), 0) / 7)}
              </Text>
              <Text style={styles.quickStatLabel}>avg daily cal</Text>
            </View>
          </View>

          {/* Meals List */}
          <View style={styles.mealsSection}>
            <View style={styles.mealsSectionHeader}>
              <Text style={styles.mealsSectionTitle}>Recent Meals</Text>
              <TouchableOpacity onPress={handleViewFullHistory}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {groupedMeals.length > 0 ? (
              groupedMeals.map(group => (
                <DateSection
                  key={group.title}
                  title={group.title}
                  meals={group.meals}
                  onMealPress={handleMealPress}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="restaurant-outline" size={40} color={COLORS.text.tertiary} />
                </View>
                <Text style={styles.emptyTitle}>No meals logged</Text>
                <Text style={styles.emptySubtitle}>
                  Start logging meals to see your history here
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleContainer: {
    marginLeft: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  quickStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // Meals Section
  mealsSection: {
    marginHorizontal: 16,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Date Section
  dateSection: {
    marginBottom: 16,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  dateSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  dateSectionStats: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },

  // Meal Card
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealContent: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  mealTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  mealStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  mealMacros: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
