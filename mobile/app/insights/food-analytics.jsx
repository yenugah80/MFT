/**
 * Food Analytics Screen
 *
 * ISOLATED nutrition analytics - shows ONLY food/nutrition data:
 * - Nutrition balance score and macro tracking from useDashboard
 * - AI food recommendations from useRecommendations
 *
 * Cross-category data (food-mood correlations, predictions) belongs in:
 * - /insights/food-mood-correlation - Food-mood pattern analysis
 * - /insights/multi-factor-analytics - Cross-category correlations
 * - /insights/predictive - Predictions based on multiple factors
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
  SEMANTIC,
  BRAND,
  MACRO_COLORS,
} from '../../constants/premiumTheme';

import HalfGaugeChart, { MiniHalfGauge } from '../../components/insights/HalfGaugeChart';
import ColdStartCard from '../../components/insights/ColdStartCard';
import MicroBar from '../../components/MicroBar';
import { getMicrosWithPercentages, calculateMicrosCoverage, getMicrosCoverageColor } from '../../utils/microsCalculations';
// Note: RelatedInsights removed - this screen shows ONLY nutrition data

import { useDashboard } from '../../hooks/useDashboard';
// Note: useCorrelations removed - cross-category correlations belong in /insights/food-mood-correlation
import { useRecommendations } from '../../hooks/useRecommendations';
import { useDecisionBrainNutritionInsights } from '../../hooks/useMoodInsights';
import { useFoodLog } from '../../hooks/useFoodLog';
import { fetchFoodSuggestions, trackEvent, Events } from '../../services/analytics';

// Responsive layout for small devices
import { getResponsiveGaugeSize, IS_SMALL_DEVICE, getHorizontalPadding } from '../../utils/responsiveLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_CONFIG = getResponsiveGaugeSize('standard');

// ============================================================================
// SECTION ERROR BOUNDARY - Graceful fallback for individual sections
// ============================================================================

class SectionErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.sectionName || 'Section'} error:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          marginTop: SPACING[4],
          padding: SPACING[4],
          backgroundColor: SURFACES.background.secondary,
          borderRadius: RADIUS.md,
          alignItems: 'center',
        }}>
          <Ionicons name="warning-outline" size={24} color={TEXT.tertiary} />
          <Text style={{ color: TEXT.tertiary, fontSize: 12, marginTop: SPACING[2] }}>
            {this.props.sectionName || 'Section'} unavailable
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FoodAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [selectedTrendDay, setSelectedTrendDay] = useState(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Expandable sections - default collapsed counts
  const [expandedSections, setExpandedSections] = useState({
    recommendations: false,
    patterns: false,
    correlations: false,
    topFoods: false,
    gaps: false,
    recentMeals: false,
  });

  // Toggle section expansion
  const toggleSection = useCallback((section) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Food log for recent meals and comparison
  const foodLog = useFoodLog();

  // Accessibility
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription?.remove();
  }, []);

  // Track screen view
  useEffect(() => {
    trackEvent('screen_view', { screen_name: 'food_analytics' });
  }, []);

  // Skeleton pulse animation
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reducedMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [reducedMotion, pulseAnim]);

  // Decision Brain - ML-powered insights (PRIMARY data source)
  const { data: decisionBrainData, isLoading: dbLoading, refetch: refetchDB } = useDecisionBrainNutritionInsights();

  // Dashboard as fallback for basic metrics
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboard();
  const { recommendations, isLoading: recsLoading, refetch: refetchRecs, acceptRecommendation } = useRecommendations();

  const isLoading = dbLoading || dashboardLoading || recsLoading;
  const isFoodLogLoading = foodLog.isLoading;
  // Critical error only if both Decision Brain and dashboard fail
  const hasError = !!dashboardError && !decisionBrainData?.success;

  // Calculate nutrition metrics - PREFER Decision Brain stats, fall back to dashboard
  const nutritionMetrics = useMemo(() => {
    // If Decision Brain returned stats, use them (ML-enhanced)
    if (decisionBrainData?.stats && decisionBrainData.hasEnoughData) {
      const stats = decisionBrainData.stats;
      return {
        calories: {
          consumed: stats.todayCalories || 0,
          budget: stats.calorieGoal || 2000,
          remaining: (stats.calorieGoal || 2000) - (stats.todayCalories || 0),
          isOverBudget: (stats.todayCalories || 0) > (stats.calorieGoal || 2000),
          progress: stats.calorieGoalAdherence || 0,
        },
        macros: {
          protein: { consumed: stats.todayProtein || 0, goal: stats.proteinGoal || 120, progress: stats.proteinProgress || 0 },
          carbs: { consumed: stats.todayCarbs || 0, goal: stats.carbsGoal || 250, progress: stats.carbsProgress || 0 },
          fat: { consumed: stats.todayFat || 0, goal: stats.fatGoal || 65, progress: stats.fatProgress || 0 },
        },
        balanceScore: stats.nutritionScore || 50,
        mealsToday: stats.mealsToday || 0,
        totalMealsLogged: stats.totalMealsLogged || 0,
        totalDaysWithLogs: stats.totalDaysWithLogs || 0,
        trend: stats.trend || 'stable',
        avgCalories: stats.avgCalories || 0,
        micros: dashboard?.today?.nutrition?.micros || {},
      };
    }

    // Fallback to dashboard data
    if (!dashboard) return null;

    // Extract data from correct dashboard structure
    const todayNutrition = dashboard.today?.nutrition || {};
    const goals = dashboard.goals || {};
    const userLifecycle = dashboard.userLifecycle || {};

    // Use goals if available, otherwise defaults
    const caloriesBudget = goals.dailyCalories || 2000;
    const proteinGoal = goals.proteinG || 120;
    const carbsGoal = goals.carbsG || 250;
    const fatGoal = goals.fatsG || 65;

    // Get consumed from today's nutrition summary
    const caloriesConsumed = todayNutrition.totalCalories || 0;
    const proteinConsumed = todayNutrition.totalProtein || 0;
    const carbsConsumed = todayNutrition.totalCarbs || 0;
    const fatConsumed = todayNutrition.totalFats || 0;

    // Allow negative remaining to show "over budget" - don't clamp to 0
    const caloriesRemaining = caloriesBudget - caloriesConsumed;
    const isOverBudget = caloriesRemaining < 0;

    // Calculate actual percentages - don't cap for display, cap only for gauge visual
    const proteinProgress = proteinGoal > 0 ? (proteinConsumed / proteinGoal) * 100 : 0;
    const carbsProgress = carbsGoal > 0 ? (carbsConsumed / carbsGoal) * 100 : 0;
    const fatProgress = fatGoal > 0 ? (fatConsumed / fatGoal) * 100 : 0;

    // Calculate balance score based on how close each macro is to 100%
    const getScore = (progress) => {
      if (progress >= 80 && progress <= 120) return 100;
      if (progress >= 60 && progress <= 140) return 80;
      if (progress >= 40 && progress <= 160) return 60;
      return 40;
    };
    const balanceScore = Math.round((getScore(proteinProgress) + getScore(carbsProgress) + getScore(fatProgress)) / 3);

    // Get meal counts from correct locations
    const mealsToday = dashboard.today?.foodLogs?.length || 0;
    const totalMealsLogged = userLifecycle.totalMealsLogged || 0;
    const totalDaysWithLogs = userLifecycle.totalDaysWithLogs || 0;

    return {
      calories: {
        consumed: caloriesConsumed,
        budget: caloriesBudget,
        remaining: caloriesRemaining,
        isOverBudget,
        progress: caloriesBudget > 0 ? (caloriesConsumed / caloriesBudget) * 100 : 0,
      },
      macros: {
        protein: { consumed: proteinConsumed, goal: proteinGoal, progress: proteinProgress },
        carbs: { consumed: carbsConsumed, goal: carbsGoal, progress: carbsProgress },
        fat: { consumed: fatConsumed, goal: fatGoal, progress: fatProgress },
      },
      balanceScore,
      mealsToday,
      totalMealsLogged,
      totalDaysWithLogs,
      micros: todayNutrition.micros || {},
    };
  }, [dashboard, decisionBrainData]);

  // Recommendations - PREFER Decision Brain witty recommendations, fall back to AI recs
  // Return all recommendations, display count is controlled by expandedSections state
  const foodRecommendations = useMemo(() => {
    if (decisionBrainData?.recommendations?.length > 0) {
      return decisionBrainData.recommendations;
    }
    return recommendations || [];
  }, [recommendations, decisionBrainData]);

  // ML-powered patterns from Decision Brain - return all, display controlled by state
  const nutritionPatterns = useMemo(() => {
    return decisionBrainData?.patterns || [];
  }, [decisionBrainData]);

  // ML correlations with confidence scores - return all, display controlled by state
  const nutritionCorrelations = useMemo(() => {
    return decisionBrainData?.correlations || [];
  }, [decisionBrainData]);

  // Process micronutrient data for display
  const micronutrientData = useMemo(() => {
    if (!nutritionMetrics?.micros || Object.keys(nutritionMetrics.micros).length === 0) {
      return { items: [], coverage: 0, coverageColor: getMicrosCoverageColor(0) };
    }
    const items = getMicrosWithPercentages(nutritionMetrics.micros);
    const coverage = calculateMicrosCoverage(nutritionMetrics.micros);
    return {
      items,
      coverage,
      coverageColor: getMicrosCoverageColor(coverage),
    };
  }, [nutritionMetrics?.micros]);

  // Recent meals for comparison feature (last 7 days) - no hard limit, controlled by state
  const recentMeals = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return (foodLog.logs || [])
      .filter(log => log.timestamp && log.timestamp > sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [foodLog.logs]);

  // Weekly Trends - Daily calories and protein for past 7 days
  const weeklyTrends = useMemo(() => {
    const logs = foodLog.logs || [];
    const now = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= date && logDate < nextDay;
      });

      const totalCalories = dayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
      const totalProtein = dayLogs.reduce((sum, log) => sum + (log.protein || 0), 0);

      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        mealsCount: dayLogs.length,
      });
    }

    const maxCalories = Math.max(...days.map(d => d.calories), 1);
    const avgCalories = Math.round(days.reduce((sum, d) => sum + d.calories, 0) / 7);
    const avgProtein = Math.round(days.reduce((sum, d) => sum + d.protein, 0) / 7);

    return { days, maxCalories, avgCalories, avgProtein };
  }, [foodLog.logs]);

  // Normalize food name for better matching (handles variations)
  const normalizeFood = useCallback((name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      // Remove common prefixes/suffixes
      .replace(/^(grilled|baked|fried|steamed|roasted|fresh|organic)\s+/i, '')
      // Remove portion descriptors
      .replace(/\s+(small|medium|large|slice|piece|cup|bowl)$/i, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }, []);

  // Top Foods - Most frequently logged items with normalized matching
  const topFoods = useMemo(() => {
    const logs = foodLog.logs || [];
    const foodCounts = {};

    logs.forEach(log => {
      const rawName = (log.foodName || '').trim();
      if (!rawName) return;

      const normalizedKey = normalizeFood(rawName);
      if (!normalizedKey) return;

      if (!foodCounts[normalizedKey]) {
        foodCounts[normalizedKey] = {
          name: rawName, // Keep original display name
          normalizedKey,
          count: 0,
          avgCalories: 0,
          avgProtein: 0,
          totalCalories: 0,
          totalProtein: 0,
          lastLogged: log.timestamp,
        };
      }

      foodCounts[normalizedKey].count++;
      foodCounts[normalizedKey].totalCalories += log.calories || 0;
      foodCounts[normalizedKey].totalProtein += log.protein || 0;
      // Keep the most recent name variation for display
      if (log.timestamp > foodCounts[normalizedKey].lastLogged) {
        foodCounts[normalizedKey].lastLogged = log.timestamp;
        foodCounts[normalizedKey].name = rawName;
      }
    });

    return Object.values(foodCounts)
      .map(f => ({
        ...f,
        avgCalories: Math.round(f.totalCalories / f.count),
        avgProtein: Math.round(f.totalProtein / f.count),
      }))
      .sort((a, b) => b.count - a.count);
    // No slice - display count controlled by expandedSections state
  }, [foodLog.logs, normalizeFood]);

  // Meal Timing Insights - When user typically eats
  const mealTimingInsights = useMemo(() => {
    const logs = foodLog.logs || [];
    if (logs.length < 3) return null;

    const hourBuckets = Array(24).fill(0);
    const hourCalories = Array(24).fill(0);

    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourBuckets[hour]++;
      hourCalories[hour] += log.calories || 0;
    });

    // Find peak eating hours (top 3)
    const peakHours = hourBuckets
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Categorize meal times
    const formatHour = (hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h = hour % 12 || 12;
      return `${h}${ampm}`;
    };

    const getMealType = (hour) => {
      if (hour >= 5 && hour < 11) return 'Breakfast';
      if (hour >= 11 && hour < 15) return 'Lunch';
      if (hour >= 15 && hour < 18) return 'Snack';
      if (hour >= 18 && hour < 22) return 'Dinner';
      return 'Late Night';
    };

    return {
      peakHours: peakHours.map(h => ({
        hour: h.hour,
        label: formatHour(h.hour),
        mealType: getMealType(h.hour),
        count: h.count,
      })),
      totalMeals: logs.length,
    };
  }, [foodLog.logs]);

  // Goal Adherence Score - % of days hitting calorie/macro targets
  const goalAdherence = useMemo(() => {
    if (!nutritionMetrics || !weeklyTrends) return null;

    const calorieGoal = nutritionMetrics.calories?.budget || 2000;
    const proteinGoal = nutritionMetrics.macros?.protein?.goal || 120;
    const carbsGoal = nutritionMetrics.macros?.carbs?.goal || 250;
    const fatGoal = nutritionMetrics.macros?.fat?.goal || 65;

    // Need to recalculate daily carbs/fat from logs
    const logs = foodLog.logs || [];
    const now = new Date();

    const daysWithMacros = weeklyTrends.days.map((day, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= date && logDate < nextDay;
      });

      return {
        ...day,
        carbs: Math.round(dayLogs.reduce((sum, log) => sum + (log.carbs || 0), 0)),
        fat: Math.round(dayLogs.reduce((sum, log) => sum + (log.fat || log.fats || 0), 0)),
      };
    });

    const daysWithLogs = daysWithMacros.filter(d => d.mealsCount > 0);
    if (daysWithLogs.length === 0) return null;

    // Calorie target: 80-110% of goal (avoid under/over eating)
    const calorieDaysHit = daysWithLogs.filter(d =>
      d.calories >= calorieGoal * 0.8 && d.calories <= calorieGoal * 1.1
    ).length;

    // Macro targets: at least 80% of goal
    const proteinDaysHit = daysWithLogs.filter(d => d.protein >= proteinGoal * 0.8).length;
    const carbsDaysHit = daysWithLogs.filter(d => d.carbs >= carbsGoal * 0.7).length;
    const fatDaysHit = daysWithLogs.filter(d => d.fat >= fatGoal * 0.7).length;

    const calorieAdherence = Math.round((calorieDaysHit / daysWithLogs.length) * 100);
    const proteinAdherence = Math.round((proteinDaysHit / daysWithLogs.length) * 100);
    const carbsAdherence = Math.round((carbsDaysHit / daysWithLogs.length) * 100);
    const fatAdherence = Math.round((fatDaysHit / daysWithLogs.length) * 100);

    // Overall: weighted average (calories and protein more important)
    const overallAdherence = Math.round(
      (calorieAdherence * 0.35 + proteinAdherence * 0.35 + carbsAdherence * 0.15 + fatAdherence * 0.15)
    );

    return {
      overall: overallAdherence,
      calories: calorieAdherence,
      protein: proteinAdherence,
      carbs: carbsAdherence,
      fat: fatAdherence,
      daysTracked: daysWithLogs.length,
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal,
    };
  }, [nutritionMetrics, weeklyTrends, foodLog.logs]);

  // Fallback suggestions (used when API fails)
  const fallbackSuggestions = useMemo(() => ({
    iron: 'spinach, lentils, red meat',
    calcium: 'dairy, leafy greens, fortified foods',
    vitamin_d: 'fatty fish, eggs, fortified milk',
    vitamin_c: 'citrus fruits, bell peppers, berries',
    potassium: 'bananas, potatoes, avocado',
    magnesium: 'nuts, seeds, whole grains',
    zinc: 'meat, shellfish, legumes',
    fiber: 'whole grains, vegetables, legumes',
    vitamin_a: 'carrots, sweet potato, leafy greens',
    vitamin_b12: 'meat, fish, dairy, eggs',
  }), []);

  // Raw nutritional gaps (without suggestions) - no limit, controlled by expandedSections
  const rawNutritionalGaps = useMemo(() => {
    if (!micronutrientData.items || micronutrientData.items.length === 0) return [];

    return micronutrientData.items
      .filter(micro => micro.percentage < 50)
      .sort((a, b) => a.percentage - b.percentage);
  }, [micronutrientData.items]);

  // Fetch dynamic food suggestions when gaps change
  useEffect(() => {
    if (rawNutritionalGaps.length === 0) {
      setDynamicSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const suggestions = await fetchFoodSuggestions(rawNutritionalGaps);
        if (suggestions) {
          setDynamicSuggestions(suggestions);
          // Track successful AI suggestions load
          trackEvent(Events.FEATURE_USED, {
            feature: 'ai_food_suggestions',
            action: 'loaded',
            gaps_count: rawNutritionalGaps.length,
            suggestions_count: Object.keys(suggestions).length,
          });
        }
      } catch (error) {
        console.warn('[FoodAnalytics] Failed to fetch suggestions:', error);
        // Track failure for debugging
        trackEvent(Events.FEATURE_USED, {
          feature: 'ai_food_suggestions',
          action: 'failed',
          error_message: error?.message || 'unknown',
        });
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [rawNutritionalGaps]);

  // Nutritional gaps with dynamic or fallback suggestions
  const nutritionalGaps = useMemo(() => {
    return rawNutritionalGaps.map(gap => {
      // Try dynamic suggestions first
      const dynamicSuggestion = dynamicSuggestions?.[gap.key];
      if (dynamicSuggestion?.foods) {
        return {
          ...gap,
          suggestion: dynamicSuggestion.foods.join(', '),
          tip: dynamicSuggestion.tip,
        };
      }
      // Fall back to static suggestions
      return {
        ...gap,
        suggestion: fallbackSuggestions[gap.key] || 'varied whole foods',
      };
    });
  }, [rawNutritionalGaps, dynamicSuggestions, fallbackSuggestions]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([
      refetchDB?.(),
      refetchDashboard?.(),
      refetchRecs?.(),
    ]);
    setRefreshing(false);
  }, [refetchDB, refetchDashboard, refetchRecs]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleAcceptRecommendation = useCallback(async (rec) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Track recommendation acceptance
    trackEvent(Events.RECOMMENDATION_ACCEPTED, {
      recommendation_name: rec?.name || rec?.title,
      recommendation_id: rec?.id,
      calories: rec?.calories,
      protein: rec?.protein,
    });
    try {
      await acceptRecommendation?.(rec);
    } catch (error) {
      console.error('Failed to accept recommendation:', error);
    }
  }, [acceptRecommendation]);

  // Comparison handlers
  const getMealId = useCallback((meal) => {
    if (meal?.id) return `id:${meal.id}`;
    if (meal?.clientEventId) return `cid:${meal.clientEventId}`;
    if (meal?.timestamp) return `ts:${meal.timestamp}`;
    return null;
  }, []);

  const handleMealSelect = useCallback((meal) => {
    if (!compareMode) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mealKey = getMealId(meal);

    const isSelected = selectedMeals.some(m => getMealId(m) === mealKey);
    if (isSelected) {
      setSelectedMeals(selectedMeals.filter(m => getMealId(m) !== mealKey));
      return;
    }

    if (selectedMeals.length === 0) {
      setSelectedMeals([meal]);
    } else if (selectedMeals.length === 1) {
      // Two meals selected - navigate to comparison
      const ids = [getMealId(selectedMeals[0]), getMealId(meal)].filter(Boolean);
      router.push({
        pathname: '/history/compare',
        params: { ids: ids.join(',') },
      });
      setSelectedMeals([]);
      setCompareMode(false);
    } else {
      setSelectedMeals([meal]);
    }
  }, [compareMode, selectedMeals, getMealId, router]);

  const toggleCompareMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newMode = !compareMode;
    setCompareMode(newMode);
    setSelectedMeals([]);
    // Track compare mode usage
    if (newMode) {
      trackEvent(Events.FEATURE_USED, {
        feature: 'meal_comparison',
        action: 'compare_mode_enabled',
      });
    }
  }, [compareMode]);

  // Handler for tapping a day on the trends chart
  const handleTrendDayPress = useCallback((day, index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTrendDay?.dayName === day.dayName) {
      setSelectedTrendDay(null); // Toggle off if same day
    } else {
      setSelectedTrendDay({ ...day, index });
      // Track chart interaction
      trackEvent(Events.FEATURE_USED, {
        feature: 'weekly_trends_chart',
        action: 'day_selected',
        day_name: day.dayName,
        has_data: day.calories > 0,
      });
    }
  }, [selectedTrendDay]);

  // Cold start check - show real data if user has ANY logged meals
  // Only show cold start screen for users with zero food history
  const hasAnyData = (
    (nutritionMetrics?.totalMealsLogged || 0) > 0 ||
    (nutritionMetrics?.mealsToday || 0) > 0
  );

  // Enough data for AI recommendations and advanced insights (7+ days)
  const hasEnoughForInsights = (
    (foodRecommendations?.length || 0) > 0 ||
    (nutritionMetrics?.totalDaysWithLogs || 0) >= 7
  );

  // Get status based on balance score
  const getStatus = (score) => {
    if (score >= 80) return { label: 'Excellent', color: SEMANTIC.success.base };
    if (score >= 60) return { label: 'Good', color: VIBRANT_WELLNESS.nutrition.solid };
    if (score >= 40) return { label: 'Fair', color: SEMANTIC.warning.base };
    return { label: 'Needs Focus', color: SEMANTIC.danger.base };
  };

  const status = getStatus(nutritionMetrics?.balanceScore || 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Food Analytics',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />}
      >
        {/* Loading State */}
        {isLoading && !nutritionMetrics && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={styles.loadingText}>Loading your nutrition data...</Text>
          </View>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={SEMANTIC.danger.base} />
            <Text style={styles.errorTitle}>Unable to Load Data</Text>
            <Text style={styles.errorText}>
              {dashboardError?.message || 'Please check your connection and try again.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cold Start - Only show if user has ZERO logged meals */}
        {!isLoading && !hasAnyData && (
          <ColdStartCard
            category="nutrition"
            distinctDays={nutritionMetrics?.totalDaysWithLogs || 0}
            totalLogs={nutritionMetrics?.totalMealsLogged || 0}
            onAction={() => router.push('/(tabs)/log')}
            style={styles.coldStartCard}
          />
        )}

        {/* Main Nutrition Score Card */}
        {nutritionMetrics && (
          <View style={[styles.heroCard, CARD_SYSTEM.hero]}>
            <LinearGradient
              colors={SURFACES.background.gradientWarm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.heroTitle}>Nutrition Balance</Text>
                  <Text style={[styles.heroStatus, { color: status.color }]}>{status.label}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                  <Ionicons name="nutrition" size={20} color={status.color} />
                </View>
              </View>

              <View style={styles.gaugeContainer}>
                <HalfGaugeChart
                  value={nutritionMetrics.balanceScore}
                  maxValue={100}
                  label="Balance Score"
                  sublabel={`${nutritionMetrics.calories.consumed} / ${nutritionMetrics.calories.budget} cal`}
                  size={GAUGE_CONFIG.size}
                  strokeWidth={GAUGE_CONFIG.strokeWidth}
                  animated={!reducedMotion}
                />
              </View>

              <View style={styles.calorieRow}>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{nutritionMetrics.calories.consumed}</Text>
                  <Text style={styles.calorieLabel}>consumed</Text>
                </View>
                <View style={styles.calorieDivider} />
                <View style={styles.calorieItem}>
                  <Text style={[
                    styles.calorieValue,
                    { color: nutritionMetrics.calories.isOverBudget ? SEMANTIC.danger.base : SEMANTIC.success.base }
                  ]}>
                    {nutritionMetrics.calories.isOverBudget
                      ? `+${Math.abs(nutritionMetrics.calories.remaining)}`
                      : nutritionMetrics.calories.remaining}
                  </Text>
                  <Text style={styles.calorieLabel}>
                    {nutritionMetrics.calories.isOverBudget ? 'over' : 'remaining'}
                  </Text>
                </View>
                <View style={styles.calorieDivider} />
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{nutritionMetrics.calories.budget}</Text>
                  <Text style={styles.calorieLabel}>budget</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Macro Breakdown */}
        {nutritionMetrics && (
          <View style={[styles.macroCard, CARD_SYSTEM.standard]}>
            <Text style={styles.cardTitle}>Macro Breakdown</Text>
            <View style={styles.macroGauges}>
              {[
                { key: 'protein', label: 'Protein', ...nutritionMetrics.macros.protein, color: MACRO_COLORS.protein.base },
                { key: 'carbs', label: 'Carbs', ...nutritionMetrics.macros.carbs, color: MACRO_COLORS.carbs.base },
                { key: 'fat', label: 'Fat', ...nutritionMetrics.macros.fat, color: MACRO_COLORS.fat.base },
              ].map((macro) => (
                <View key={macro.key} style={styles.macroGaugeItem}>
                  <MiniHalfGauge
                    value={macro.progress}
                    maxValue={100}
                    size={80}
                    strokeWidth={8}
                    color={macro.color}
                  />
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(macro.consumed)}<Text style={styles.macroUnit}>/{macro.goal}g</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Micronutrients Section - All tracked vitamins and minerals */}
        {micronutrientData.items.length > 0 && (
          <View style={[styles.microsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="leaf-outline" size={20} color={micronutrientData.coverageColor} />
              <Text style={styles.cardTitle}>Micronutrients</Text>
              <View style={[styles.coverageBadge, { backgroundColor: `${micronutrientData.coverageColor}15` }]}>
                <Text style={[styles.coverageBadgeText, { color: micronutrientData.coverageColor }]}>
                  {micronutrientData.coverage}% coverage
                </Text>
              </View>
            </View>
            <Text style={styles.microsSubtitle}>
              {micronutrientData.coverage >= 70
                ? 'Great job! Your vitamin and mineral intake is well-balanced.'
                : micronutrientData.coverage >= 50
                ? 'You\'re making progress. Focus on the nutrients below.'
                : 'These nutrients need more attention in your diet.'}
            </Text>
            <View style={styles.microsGrid}>
              {micronutrientData.items.map((micro) => (
                <MicroBar
                  key={micro.key}
                  label={micro.label}
                  value={micro.value}
                  unit={micro.unit}
                  percentage={micro.percentage}
                  rdi={micro.rdi}
                />
              ))}
            </View>
            <View style={styles.microsNote}>
              <Ionicons name="information-circle-outline" size={14} color={TEXT.muted} />
              <Text style={styles.microsNoteText}>
                Values are estimated based on logged foods. RDI = Recommended Daily Intake.
              </Text>
            </View>
          </View>
        )}

        {/* Skeleton Loading for Food Log sections */}
        {isFoodLogLoading && (
          <Animated.View style={{ opacity: pulseAnim }}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTitle} />
              </View>
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonBar} />
                <View style={styles.skeletonRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <View key={i} style={[styles.skeletonBarSmall, { flex: 1 }]} />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTitle} />
              </View>
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonBar} />
                <View style={styles.skeletonBar} />
              </View>
            </View>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTitle} />
              </View>
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonBar} />
                <View style={styles.skeletonBar} />
                <View style={styles.skeletonBar} />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Weekly Trends Chart */}
        {!isFoodLogLoading && weeklyTrends.days.some(d => d.mealsCount > 0) && (
          <SectionErrorBoundary sectionName="Weekly Trends">
            <View
              style={[styles.trendsCard, CARD_SYSTEM.standard]}
              accessible={true}
              accessibilityLabel={`Weekly calorie trends. Average ${weeklyTrends.avgCalories} calories and ${weeklyTrends.avgProtein} grams protein per day`}
              accessibilityRole="summary"
            >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trending-up" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>Weekly Trends</Text>
            </View>
            <View style={styles.trendsAvgRow}>
              <View style={styles.trendsAvgItem} accessibilityLabel={`Average ${weeklyTrends.avgCalories} calories per day`}>
                <Text style={styles.trendsAvgValue}>{weeklyTrends.avgCalories}</Text>
                <Text style={styles.trendsAvgLabel}>avg cal/day</Text>
              </View>
              <View style={styles.trendsAvgDivider} />
              <View style={styles.trendsAvgItem} accessibilityLabel={`Average ${weeklyTrends.avgProtein} grams protein per day`}>
                <Text style={styles.trendsAvgValue}>{weeklyTrends.avgProtein}g</Text>
                <Text style={styles.trendsAvgLabel}>avg protein/day</Text>
              </View>
            </View>
            <View style={styles.trendsChart} accessibilityRole="image" accessibilityLabel="Bar chart showing daily calorie intake for the past 7 days. Tap any day for details.">
              {weeklyTrends.days.map((day, index) => {
                const barHeight = weeklyTrends.maxCalories > 0
                  ? (day.calories / weeklyTrends.maxCalories) * 80
                  : 0;
                const isToday = index === 6;
                const isSelected = selectedTrendDay?.dayName === day.dayName;
                return (
                  <TouchableOpacity
                    key={day.dayName}
                    style={[styles.trendsDayColumn, isSelected && styles.trendsDayColumnSelected]}
                    onPress={() => handleTrendDayPress(day, index)}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayName}${isToday ? ', today' : ''}: ${day.calories > 0 ? `${day.calories} calories, ${day.protein}g protein, ${day.mealsCount} meals` : 'no data'}. Tap for details.`}
                    accessibilityHint="Shows detailed nutrition breakdown for this day"
                  >
                    <Text style={styles.trendsCalValue}>
                      {day.calories > 0 ? day.calories : '-'}
                    </Text>
                    <View style={styles.trendsBarContainer}>
                      <View
                        style={[
                          styles.trendsBar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: isSelected ? SEMANTIC.success.base : isToday ? BRAND.primary : `${BRAND.primary}60`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.trendsDayLabel, isToday && styles.trendsDayLabelToday, isSelected && styles.trendsDayLabelSelected]}>
                      {day.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Day Details */}
            {selectedTrendDay && (
              <View style={styles.trendsDayDetail}>
                <View style={styles.trendsDayDetailHeader}>
                  <Text style={styles.trendsDayDetailTitle}>
                    {selectedTrendDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedTrendDay(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={20} color={TEXT.tertiary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.trendsDayDetailStats}>
                  <View style={styles.trendsDayDetailStat}>
                    <Text style={styles.trendsDayDetailValue}>{selectedTrendDay.calories}</Text>
                    <Text style={styles.trendsDayDetailLabel}>calories</Text>
                  </View>
                  <View style={styles.trendsDayDetailDivider} />
                  <View style={styles.trendsDayDetailStat}>
                    <Text style={styles.trendsDayDetailValue}>{selectedTrendDay.protein}g</Text>
                    <Text style={styles.trendsDayDetailLabel}>protein</Text>
                  </View>
                  <View style={styles.trendsDayDetailDivider} />
                  <View style={styles.trendsDayDetailStat}>
                    <Text style={styles.trendsDayDetailValue}>{selectedTrendDay.mealsCount}</Text>
                    <Text style={styles.trendsDayDetailLabel}>meals</Text>
                  </View>
                </View>
                {selectedTrendDay.calories > 0 && nutritionMetrics?.calories?.budget && (
                  <View style={styles.trendsDayDetailProgress}>
                    <View style={styles.trendsDayDetailProgressBar}>
                      <View
                        style={[
                          styles.trendsDayDetailProgressFill,
                          {
                            width: `${Math.min((selectedTrendDay.calories / nutritionMetrics.calories.budget) * 100, 100)}%`,
                            backgroundColor: selectedTrendDay.calories > nutritionMetrics.calories.budget ? SEMANTIC.danger.base : SEMANTIC.success.base,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.trendsDayDetailProgressText}>
                      {Math.round((selectedTrendDay.calories / nutritionMetrics.calories.budget) * 100)}% of {nutritionMetrics.calories.budget} cal goal
                    </Text>
                  </View>
                )}
              </View>
            )}
            </View>
          </SectionErrorBoundary>
        )}

        {/* Goal Adherence Score */}
        {!isFoodLogLoading && goalAdherence && goalAdherence.daysTracked >= 3 && (
          <SectionErrorBoundary sectionName="Goal Adherence">
            <View
              style={[styles.adherenceCard, CARD_SYSTEM.standard]}
              accessible={true}
              accessibilityLabel={`Goal adherence ${goalAdherence.overall}% based on ${goalAdherence.daysTracked} tracked days`}
              accessibilityRole="summary"
            >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon-outline" size={20} color={goalAdherence.overall >= 70 ? SEMANTIC.success.base : goalAdherence.overall >= 40 ? SEMANTIC.warning.base : SEMANTIC.danger.base} />
              <Text style={styles.cardTitle}>Goal Adherence</Text>
              <View style={[styles.adherenceBadge, { backgroundColor: goalAdherence.overall >= 70 ? SEMANTIC.success.light : goalAdherence.overall >= 40 ? SEMANTIC.warning.light : SEMANTIC.danger.light }]}>
                <Text style={[styles.adherenceBadgeText, { color: goalAdherence.overall >= 70 ? SEMANTIC.success.base : goalAdherence.overall >= 40 ? SEMANTIC.warning.base : SEMANTIC.danger.base }]}>
                  {goalAdherence.overall}%
                </Text>
              </View>
            </View>
            <Text style={styles.adherenceSubtitle}>
              Based on {goalAdherence.daysTracked} tracked days this week
            </Text>
            <View style={styles.adherenceMetrics}>
              <View style={styles.adherenceMetric} accessibilityLabel={`Calories ${goalAdherence.calories}% adherence`}>
                <View style={styles.adherenceProgress}>
                  <View style={[styles.adherenceProgressFill, { width: `${goalAdherence.calories}%`, backgroundColor: SEMANTIC.info.base }]} />
                </View>
                <Text style={styles.adherenceMetricLabel}>Calories ({goalAdherence.calories}%)</Text>
              </View>
              <View style={styles.adherenceMetric} accessibilityLabel={`Protein ${goalAdherence.protein}% adherence`}>
                <View style={styles.adherenceProgress}>
                  <View style={[styles.adherenceProgressFill, { width: `${goalAdherence.protein}%`, backgroundColor: MACRO_COLORS.protein.base }]} />
                </View>
                <Text style={styles.adherenceMetricLabel}>Protein ({goalAdherence.protein}%)</Text>
              </View>
              <View style={styles.adherenceMetric} accessibilityLabel={`Carbs ${goalAdherence.carbs}% adherence`}>
                <View style={styles.adherenceProgress}>
                  <View style={[styles.adherenceProgressFill, { width: `${goalAdherence.carbs}%`, backgroundColor: MACRO_COLORS.carbs.base }]} />
                </View>
                <Text style={styles.adherenceMetricLabel}>Carbs ({goalAdherence.carbs}%)</Text>
              </View>
              <View style={styles.adherenceMetric} accessibilityLabel={`Fat ${goalAdherence.fat}% adherence`}>
                <View style={styles.adherenceProgress}>
                  <View style={[styles.adherenceProgressFill, { width: `${goalAdherence.fat}%`, backgroundColor: MACRO_COLORS.fat.base }]} />
                </View>
                <Text style={styles.adherenceMetricLabel}>Fat ({goalAdherence.fat}%)</Text>
              </View>
            </View>
            </View>
          </SectionErrorBoundary>
        )}

        {/* Top Foods Section */}
        {!isFoodLogLoading && topFoods.length >= 2 && (
          <SectionErrorBoundary sectionName="Top Foods">
            <View
              style={[styles.topFoodsCard, CARD_SYSTEM.standard]}
              accessible={true}
              accessibilityLabel={`Your top ${topFoods.length} most logged foods. Tap any food to quickly log it again.`}
              accessibilityRole="list"
            >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="star-outline" size={20} color={VIBRANT_WELLNESS.nutrition.solid} />
              <Text style={styles.cardTitle}>Your Top Foods</Text>
            </View>
            <View style={styles.topFoodsList}>
              {(expandedSections.topFoods ? topFoods.slice(0, 10) : topFoods.slice(0, 5)).map((food, index) => (
                <TouchableOpacity
                  key={food.name}
                  style={styles.topFoodItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Track quick re-log usage
                    trackEvent(Events.FEATURE_USED, {
                      feature: 'quick_relog',
                      action: 'top_food_tapped',
                      food_name: food.name,
                      food_rank: index + 1,
                      times_logged: food.count,
                    });
                    router.push({
                      pathname: '/(tabs)/log',
                      params: { prefill: food.name },
                    });
                  }}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${food.name}, logged ${food.count} times, about ${food.avgCalories} calories. Double tap to log again.`}
                  accessibilityHint="Opens the food log with this food pre-filled"
                >
                  <View style={[styles.topFoodRank, { backgroundColor: index === 0 ? SEMANTIC.warning.light : SURFACES.background.secondary }]}>
                    <Text style={[styles.topFoodRankText, { color: index === 0 ? SEMANTIC.warning.base : TEXT.tertiary }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.topFoodInfo}>
                    <Text style={styles.topFoodName} numberOfLines={1}>{food.name}</Text>
                    <Text style={styles.topFoodMeta}>
                      {food.count}x logged · ~{food.avgCalories} cal
                    </Text>
                  </View>
                  <View style={styles.topFoodAction}>
                    <Ionicons name="add-circle-outline" size={22} color={BRAND.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {topFoods.length > 5 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('topFoods')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.topFoods ? 'Show Less' : `Show ${Math.min(topFoods.length - 5, 5)} More`}
                </Text>
                <Ionicons
                  name={expandedSections.topFoods ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}
            </View>
          </SectionErrorBoundary>
        )}

        {/* Meal Timing Insights */}
        {!isFoodLogLoading && mealTimingInsights && mealTimingInsights.peakHours.length > 0 && (
          <SectionErrorBoundary sectionName="Eating Patterns">
            <View
              style={[styles.timingCard, CARD_SYSTEM.standard]}
              accessible={true}
              accessibilityLabel={`Eating patterns based on ${mealTimingInsights.totalMeals} logged meals`}
              accessibilityRole="summary"
            >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>Eating Patterns</Text>
            </View>
            <Text style={styles.timingSubtitle}>
              Based on {mealTimingInsights.totalMeals} logged meals
            </Text>
            <View style={styles.timingList}>
              {mealTimingInsights.peakHours.map((hour, index) => (
                <View
                  key={hour.hour}
                  style={styles.timingItem}
                  accessible={true}
                  accessibilityLabel={`${hour.mealType} around ${hour.label}, ${hour.count} meals`}
                >
                  <View style={[styles.timingIcon, { backgroundColor: index === 0 ? `${BRAND.primary}15` : SURFACES.background.secondary }]}>
                    <Ionicons
                      name={hour.mealType === 'Breakfast' ? 'sunny-outline' : hour.mealType === 'Dinner' ? 'moon-outline' : 'restaurant-outline'}
                      size={18}
                      color={index === 0 ? BRAND.primary : TEXT.tertiary}
                    />
                  </View>
                  <View style={styles.timingInfo}>
                    <Text style={styles.timingLabel}>{hour.mealType}</Text>
                    <Text style={styles.timingTime}>around {hour.label}</Text>
                  </View>
                  <Text style={styles.timingCount}>{hour.count} meals</Text>
                </View>
              ))}
            </View>
            </View>
          </SectionErrorBoundary>
        )}

        {/* Nutritional Gaps Alert */}
        {nutritionalGaps.length > 0 && (
          <SectionErrorBoundary sectionName="Nutritional Gaps">
            <View
              style={[styles.gapsCard, CARD_SYSTEM.standard]}
              accessible={true}
              accessibilityLabel={`Nutritional gaps: ${nutritionalGaps.length} nutrients below 50% of daily recommended intake`}
              accessibilityRole="alert"
            >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="alert-circle-outline" size={20} color={SEMANTIC.warning.base} />
              <Text style={styles.cardTitle}>Nutritional Gaps</Text>
              {suggestionsLoading && (
                <ActivityIndicator size="small" color={BRAND.primary} style={{ marginLeft: 'auto' }} />
              )}
            </View>
            <Text style={styles.gapsSubtitle}>
              These nutrients are below 50% of daily recommended intake
            </Text>
            <View style={styles.gapsList}>
              {(expandedSections.gaps ? nutritionalGaps : nutritionalGaps.slice(0, 3)).map((gap) => (
                <View
                  key={gap.key}
                  style={styles.gapItem}
                  accessible={true}
                  accessibilityLabel={`${gap.label} at ${gap.percentage}%. Try ${gap.suggestion}${gap.tip ? `. Tip: ${gap.tip}` : ''}`}
                >
                  <View style={styles.gapHeader}>
                    <Text style={styles.gapName}>{gap.label}</Text>
                    <Text style={[styles.gapPercent, { color: gap.percentage < 25 ? SEMANTIC.danger.base : SEMANTIC.warning.base }]}>
                      {gap.percentage}%
                    </Text>
                  </View>
                  <View style={styles.gapProgress}>
                    <View style={[styles.gapProgressFill, { width: `${gap.percentage}%`, backgroundColor: gap.percentage < 25 ? SEMANTIC.danger.base : SEMANTIC.warning.base }]} />
                  </View>
                  <Text style={styles.gapSuggestion}>
                    Try: {gap.suggestion}
                  </Text>
                  {gap.tip && (
                    <View style={styles.gapTipRow}>
                      <Ionicons name="bulb-outline" size={12} color={TEXT.tertiary} />
                      <Text style={styles.gapTip}>{gap.tip}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            {nutritionalGaps.length > 3 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('gaps')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.gaps ? 'Show Less' : `Show ${nutritionalGaps.length - 3} More`}
                </Text>
                <Ionicons
                  name={expandedSections.gaps ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}
            </View>
          </SectionErrorBoundary>
        )}

        {/* ML Patterns Section - Decision Brain detected patterns */}
        {nutritionPatterns.length > 0 && (
          <View style={[styles.patternsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bulb-outline" size={20} color={VIBRANT_WELLNESS.nutrition.solid} />
              <Text style={styles.cardTitle}>Nutrition Patterns</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {(expandedSections.patterns ? nutritionPatterns : nutritionPatterns.slice(0, 3)).map((pattern, i) => (
              <View key={i} style={styles.patternRow}>
                <View style={[styles.patternIcon, { backgroundColor: (pattern.light || `${pattern.color}15`) }]}>
                  <Ionicons name={pattern.icon || 'nutrition'} size={18} color={pattern.color || VIBRANT_WELLNESS.nutrition.solid} />
                </View>
                <View style={styles.patternContent}>
                  <Text style={[styles.patternTitle, { color: pattern.color || TEXT.primary }]}>{pattern.title}</Text>
                  <Text style={styles.patternDescription}>{pattern.description}</Text>
                  {pattern.confidence && (
                    <Text style={styles.confidenceText}>{Math.round(pattern.confidence * 100)}% confidence</Text>
                  )}
                </View>
              </View>
            ))}
            {nutritionPatterns.length > 3 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('patterns')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.patterns ? 'Show Less' : `Show ${nutritionPatterns.length - 3} More`}
                </Text>
                <Ionicons
                  name={expandedSections.patterns ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ML Correlations Section - What affects your nutrition */}
        {nutritionCorrelations.length > 0 && (
          <View style={[styles.correlationsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="git-network-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>What We Noticed</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {(expandedSections.correlations ? nutritionCorrelations : nutritionCorrelations.slice(0, 3)).map((corr, i) => (
              <View key={corr.id || i} style={styles.correlationRow}>
                <View style={[styles.correlationIcon, { backgroundColor: corr.impactType === 'positive' ? SEMANTIC.success.light : SEMANTIC.warning.light }]}>
                  <Ionicons
                    name={corr.impactType === 'positive' ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={corr.impactType === 'positive' ? SEMANTIC.success.base : SEMANTIC.warning.base}
                  />
                </View>
                <View style={styles.correlationContent}>
                  <Text style={styles.correlationStatement}>{corr.statement}</Text>
                  <View style={styles.correlationMeta}>
                    <Text style={styles.correlationConfidence}>{Math.round(corr.confidence * 100)}% confident</Text>
                  </View>
                  {corr.suggestion && (
                    <View style={styles.suggestionRow}>
                      <Ionicons name="bulb-outline" size={12} color={TEXT.tertiary} />
                      <Text style={styles.suggestionText}>{corr.suggestion}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            {nutritionCorrelations.length > 3 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('correlations')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.correlations ? 'Show Less' : `Show ${nutritionCorrelations.length - 3} More`}
                </Text>
                <Ionicons
                  name={expandedSections.correlations ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}
            <View style={styles.mlAttribution}>
              <Ionicons name="sparkles" size={12} color={TEXT.muted} />
              <Text style={styles.mlAttributionText}>Powered by ML analysis of your data</Text>
            </View>
          </View>
        )}

        {/* AI Food Recommendations */}
        {foodRecommendations.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{decisionBrainData?.recommendations?.length > 0 ? 'Recommendations' : 'AI Recommendations'}</Text>
              <Text style={styles.sectionSubtitle}>Personalized for your goals</Text>
            </View>

            {(expandedSections.recommendations ? foodRecommendations : foodRecommendations.slice(0, 3)).map((rec, index) => (
              <View key={rec.id || index} style={[styles.recommendationCard, CARD_SYSTEM.standard]}>
                <View style={styles.recommendationContent}>
                  <View style={[styles.recommendationIcon, { backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}15` }]}>
                    <Ionicons name={rec.icon || 'restaurant'} size={24} color={VIBRANT_WELLNESS.nutrition.solid} />
                  </View>
                  <View style={styles.recommendationText}>
                    <Text style={styles.recommendationTitle}>{rec.name || rec.title}</Text>
                    <Text style={styles.recommendationDescription} numberOfLines={2}>
                      {rec.reason || rec.description}
                    </Text>
                    {rec.calories && (
                      <Text style={styles.recommendationMacros}>
                        {rec.calories} cal • {rec.protein}g protein
                      </Text>
                    )}
                    {rec.priority && (
                      <View style={[styles.priorityBadge, { backgroundColor: rec.priority === 'high' ? SEMANTIC.danger.light : SEMANTIC.info.light }]}>
                        <Text style={[styles.priorityText, { color: rec.priority === 'high' ? SEMANTIC.danger.base : SEMANTIC.info.base }]}>
                          {rec.priority === 'high' ? 'Priority' : 'Tip'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {!decisionBrainData?.recommendations?.length && (
                  <TouchableOpacity
                    onPress={() => handleAcceptRecommendation(rec)}
                    style={[styles.actionButton, { backgroundColor: VIBRANT_WELLNESS.nutrition.solid }]}
                  >
                    <Text style={styles.actionButtonText}>Add to Log</Text>
                    <Ionicons name="add" size={16} color={TEXT.white} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {foodRecommendations.length > 3 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('recommendations')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.recommendations ? 'Show Less' : `Show ${foodRecommendations.length - 3} More`}
                </Text>
                <Ionicons
                  name={expandedSections.recommendations ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Recent Meals with Comparison Feature */}
        {recentMeals.length >= 2 && (
          <View style={[styles.recentMealsCard, CARD_SYSTEM.standard]}>
            <View style={styles.recentMealsHeader}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time-outline" size={20} color={BRAND.primary} />
                <Text style={styles.cardTitle}>Recent Meals</Text>
              </View>
              <TouchableOpacity
                style={[styles.compareButton, compareMode && styles.compareButtonActive]}
                onPress={toggleCompareMode}
              >
                <Ionicons
                  name="git-compare-outline"
                  size={16}
                  color={compareMode ? TEXT.white : BRAND.primary}
                />
                <Text style={[styles.compareButtonText, compareMode && styles.compareButtonTextActive]}>
                  {compareMode ? 'Cancel' : 'Compare'}
                </Text>
              </TouchableOpacity>
            </View>

            {compareMode && (
              <View style={styles.compareHint}>
                <Ionicons name="information-circle-outline" size={14} color={BRAND.primary} />
                <Text style={styles.compareHintText}>
                  {selectedMeals.length === 0
                    ? 'Select 2 meals to compare nutrition'
                    : `${selectedMeals.length}/2 selected`}
                </Text>
              </View>
            )}

            <View style={styles.recentMealsList}>
              {(expandedSections.recentMeals ? recentMeals.slice(0, 15) : recentMeals.slice(0, 5)).map((meal, index) => {
                const isSelected = selectedMeals.some(m => getMealId(m) === getMealId(meal));
                return (
                  <TouchableOpacity
                    key={meal.id || meal.clientEventId || `${meal.timestamp}-${index}`}
                    style={[
                      styles.mealItem,
                      compareMode && styles.mealItemSelectable,
                      isSelected && styles.mealItemSelected,
                    ]}
                    onPress={() => compareMode ? handleMealSelect(meal) : null}
                    activeOpacity={compareMode ? 0.7 : 1}
                  >
                    {compareMode && (
                      <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color={TEXT.white} />}
                      </View>
                    )}
                    <View style={styles.mealItemContent}>
                      <Text style={styles.mealItemName} numberOfLines={1}>
                        {meal.foodName || 'Meal'}
                      </Text>
                      <Text style={styles.mealItemTime}>
                        {new Date(meal.timestamp).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.mealItemStats}>
                      <Text style={styles.mealItemCalories}>{Math.round(meal.calories || 0)} cal</Text>
                      <Text style={styles.mealItemMacros}>P:{Math.round(meal.protein || 0)}g</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {recentMeals.length > 5 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleSection('recentMeals')}>
                <Text style={styles.showMoreText}>
                  {expandedSections.recentMeals ? 'Show Less' : `Show ${Math.min(recentMeals.length - 5, 10)} More`}
                </Text>
                <Ionicons
                  name={expandedSections.recentMeals ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={BRAND.primary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.viewAllMealsButton}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.viewAllMealsText}>View Full History</Text>
              <Ionicons name="arrow-forward" size={14} color={BRAND.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State - Show when user has data but not enough for AI recommendations */}
        {!isLoading && foodRecommendations.length === 0 && hasAnyData && !hasEnoughForInsights && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
            <Text style={styles.emptyStateTitle}>Building Your Profile</Text>
            <Text style={styles.emptyStateText}>
              {nutritionMetrics?.totalDaysWithLogs || 0}/7 days logged. Keep going to unlock AI-powered recommendations.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACES.background.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[10] },
  headerButton: { padding: SPACING[2] },

  // Loading
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[10] },
  loadingText: { marginTop: SPACING[3], fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary },

  // Cold Start
  coldStartCard: { marginTop: SPACING[4] },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING[10],
    paddingHorizontal: SPACING[4],
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: SPACING[4],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  retryButton: {
    marginTop: SPACING[4],
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: TEXT.white,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Hero Card
  heroCard: { marginTop: SPACING[4], overflow: 'hidden', padding: 0 },
  heroGradient: { padding: SPACING[4] },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  heroStatus: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, marginTop: 2 },
  fontFamily: TYPOGRAPHY.family.semibold,
  statusBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gaugeContainer: { alignItems: 'center', marginVertical: SPACING[2] },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  calorieItem: { alignItems: 'center' },
  calorieValue: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  calorieLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  calorieDivider: { width: 1, height: 40, backgroundColor: SURFACES.divider },

  // Macro Card
  macroCard: { marginTop: SPACING[4] },
  cardTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: SPACING[3] },
  fontFamily: TYPOGRAPHY.family.semibold,
  macroGauges: { flexDirection: 'row', justifyContent: 'space-around' },
  macroGaugeItem: { alignItems: 'center' },
  macroLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[1] },
  fontFamily: TYPOGRAPHY.family.semibold,
  macroValue: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary },
  macroUnit: { color: TEXT.tertiary },

  // Micronutrients Card
  microsCard: { marginTop: SPACING[4] },
  microsSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, marginBottom: SPACING[4], lineHeight: 20 },
  microsGrid: { gap: SPACING[2] },
  coverageBadge: { paddingHorizontal: SPACING[2], paddingVertical: 3, borderRadius: RADIUS.sm, marginLeft: 'auto' },
  coverageBadgeText: { fontSize: 11, fontWeight: TYPOGRAPHY.weight.semibold },
  microsNote: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2], marginTop: SPACING[4], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  microsNoteText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: TEXT.muted, lineHeight: 16 },

  // Section Header
  sectionHeader: { marginTop: SPACING[6], marginBottom: SPACING[3] },
  sectionTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  sectionSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.tertiary, marginTop: 2 },

  // Recommendation Card
  recommendationCard: { marginTop: SPACING[3] },
  recommendationContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING[3] },
  recommendationIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  recommendationText: { flex: 1 },
  recommendationTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: 2 },
  fontFamily: TYPOGRAPHY.family.semibold,
  recommendationDescription: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, lineHeight: 20 },
  recommendationMacros: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: RADIUS.md, gap: SPACING[1] },
  actionButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.white },
  fontFamily: TYPOGRAPHY.family.semibold,

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING[10] },
  emptyStateTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[3] },
  fontFamily: TYPOGRAPHY.family.semibold,
  emptyStateText: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, textAlign: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[4] },

  // ML Patterns Section
  patternsCard: { marginTop: SPACING[4] },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[3] },
  mlBadge: { backgroundColor: BRAND.primaryLight, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: RADIUS.sm },
  mlBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: BRAND.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  patternRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  patternIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  patternContent: { flex: 1 },
  patternTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold },
  patternDescription: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, marginTop: 2, lineHeight: 16 },
  confidenceText: { fontSize: 10, color: TEXT.muted, marginTop: SPACING[1], fontStyle: 'italic' },

  // ML Correlations Section
  correlationsCard: { marginTop: SPACING[4] },
  correlationRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  correlationIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  correlationContent: { flex: 1 },
  correlationStatement: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: TEXT.primary, lineHeight: 20 },
  fontFamily: TYPOGRAPHY.family.medium,
  correlationMeta: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING[1] },
  correlationConfidence: { fontSize: 11, color: TEXT.tertiary },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[1], marginTop: SPACING[2], paddingTop: SPACING[2], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  suggestionText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, lineHeight: 16 },
  mlAttribution: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[1], marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  mlAttributionText: { fontSize: 11, color: TEXT.muted },

  // Priority Badge for recommendations
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: SPACING[1] },
  priorityText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.semibold },

  // Recent Meals with Comparison
  recentMealsCard: { marginTop: SPACING[4] },
  recentMealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[2] },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND.primary,
    backgroundColor: 'transparent',
  },
  compareButtonActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  compareButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  compareButtonTextActive: {
    color: TEXT.white,
  },
  compareHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: `${BRAND.primary}10`,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3],
  },
  compareHintText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  recentMealsList: {
    gap: SPACING[2],
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealItemSelectable: {
    borderColor: SURFACES.divider,
  },
  mealItemSelected: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}08`,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT.tertiary,
    marginRight: SPACING[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectCircleActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  mealItemContent: {
    flex: 1,
  },
  mealItemName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  mealItemTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  mealItemStats: {
    alignItems: 'flex-end',
  },
  mealItemCalories: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  mealItemMacros: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  viewAllMealsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
  },
  viewAllMealsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Weekly Trends Chart
  trendsCard: { marginTop: SPACING[4] },
  trendsAvgRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
  },
  trendsAvgItem: { alignItems: 'center', paddingHorizontal: SPACING[4] },
  trendsAvgValue: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  trendsAvgLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  trendsAvgDivider: { width: 1, height: 30, backgroundColor: SURFACES.divider },
  trendsChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: SPACING[2] },
  trendsDayColumn: { alignItems: 'center', flex: 1, paddingVertical: SPACING[1], borderRadius: RADIUS.sm },
  trendsDayColumnSelected: { backgroundColor: `${SEMANTIC.success.base}10` },
  trendsCalValue: { fontSize: 10, color: TEXT.tertiary, marginBottom: SPACING[1] },
  trendsBarContainer: { height: 80, width: 24, justifyContent: 'flex-end', alignItems: 'center' },
  trendsBar: { width: 16, borderRadius: 4 },
  trendsDayLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: SPACING[1] },
  trendsDayLabelToday: { color: BRAND.primary, fontWeight: TYPOGRAPHY.weight.semibold },
  trendsDayLabelSelected: { color: SEMANTIC.success.base, fontWeight: TYPOGRAPHY.weight.semibold },

  // Trend Day Detail Card
  trendsDayDetail: {
    marginTop: SPACING[3],
    padding: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: SEMANTIC.success.base,
  },
  trendsDayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  trendsDayDetailTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  trendsDayDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  trendsDayDetailStat: { alignItems: 'center' },
  trendsDayDetailValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  trendsDayDetailLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  trendsDayDetailDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider,
  },
  trendsDayDetailProgress: {
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  trendsDayDetailProgressBar: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  trendsDayDetailProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  trendsDayDetailProgressText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Goal Adherence
  adherenceCard: { marginTop: SPACING[4] },
  adherenceBadge: { paddingHorizontal: SPACING[3], paddingVertical: SPACING[1], borderRadius: RADIUS.full, marginLeft: 'auto' },
  adherenceBadgeText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold },
  adherenceSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, marginBottom: SPACING[3] },
  adherenceMetrics: { gap: SPACING[3] },
  adherenceMetric: { gap: SPACING[1] },
  adherenceProgress: { height: 8, backgroundColor: SURFACES.background.secondary, borderRadius: 4, overflow: 'hidden' },
  adherenceProgressFill: { height: '100%', borderRadius: 4 },
  adherenceMetricLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },

  // Top Foods
  topFoodsCard: { marginTop: SPACING[4] },
  topFoodsList: { gap: SPACING[2] },
  topFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
  },
  topFoodRank: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  topFoodRankText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold },
  topFoodInfo: { flex: 1 },
  topFoodName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.semibold,
  topFoodMeta: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  topFoodAction: { padding: SPACING[2] },

  // Meal Timing
  timingCard: { marginTop: SPACING[4] },
  timingSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, marginBottom: SPACING[3] },
  timingList: { gap: SPACING[2] },
  timingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING[2] },
  timingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  timingInfo: { flex: 1 },
  timingLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.semibold,
  timingTime: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  timingCount: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },

  // Nutritional Gaps
  gapsCard: { marginTop: SPACING[4] },
  gapsSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, marginBottom: SPACING[3] },
  gapsList: { gap: SPACING[3] },
  gapItem: { paddingBottom: SPACING[3], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[1] },
  gapName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  fontFamily: TYPOGRAPHY.family.semibold,
  gapPercent: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold },
  gapProgress: { height: 6, backgroundColor: SURFACES.background.secondary, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING[2] },
  gapProgressFill: { height: '100%', borderRadius: 3 },
  gapSuggestion: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, fontStyle: 'italic' },
  gapTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[1], marginTop: SPACING[1] },
  gapTip: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, lineHeight: 16 },

  // Skeleton Loading
  skeletonCard: { marginTop: SPACING[4], ...CARD_SYSTEM.standard, padding: SPACING[4] },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[3] },
  skeletonIcon: { width: 20, height: 20, borderRadius: 4, backgroundColor: SURFACES.background.tertiary },
  skeletonTitle: { width: 120, height: 18, borderRadius: 4, backgroundColor: SURFACES.background.tertiary },
  skeletonContent: { gap: SPACING[2] },
  skeletonBar: { height: 40, borderRadius: RADIUS.md, backgroundColor: SURFACES.background.tertiary },
  skeletonBarSmall: { height: 24, borderRadius: RADIUS.sm, backgroundColor: SURFACES.background.tertiary },
  skeletonRow: { flexDirection: 'row', gap: SPACING[2] },

  // Show More Button
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[3],
    marginTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  showMoreText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
