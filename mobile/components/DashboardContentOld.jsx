/**
 * DashboardContent - Premium Redesign
 * Glossy, trendy, user-centric dashboard with:
 * - Ionicons throughout (no emoticons)
 * - LinearGradient accents
 * - Premium card design
 * - Proper overflow handling
 * - Data state detection
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, ScrollView, Text, RefreshControl, StyleSheet, TouchableOpacity, Modal, Share } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import * as Haptics from 'expo-haptics';
import { trackEvent } from "../services/analytics";

// Hooks
import { useDashboard } from "../hooks/useDashboard";
import { useMoodTrends } from "../hooks/useMoodTrends";
import { useMoodInsights } from "../hooks/useMoodInsights";
import { useWaterLog } from "../hooks/useWaterLog";
import { useFoodLog } from "../hooks/useFoodLog";
import { useRecommendations } from "../hooks/useRecommendations";
import { useHydrationAnalytics } from "../hooks/useHydrationAnalytics";
import { useNotification } from "../providers/NotificationProvider";
import { useProfileContext } from "../providers/ProfileProvider";
import { useTheme } from "../providers/ThemeProvider";

// Premium components
import ThemeTransition from "./ThemeTransition";
import ThemeSettingsModal from "./ThemeSettingsModal";
import EmptyState from "./EmptyState";
import MoodInsightCard from "./MoodTracker/MoodInsightCard";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import StreakSavedModal from "./dashboard/StreakSavedModal";
import DashboardHeaderSection from "./dashboard/DashboardHeaderSection";
import RecommendationDetailModal from "./dashboard/RecommendationDetailModal";
import ReflectionCheckInCard from "./dashboard/ReflectionCheckInCard";
import DashboardPillarsGrid from "./dashboard/DashboardPillarsGrid";
import GuidanceCard from "./dashboard/GuidanceCard";
import WeeklyStoryCard from "./dashboard/WeeklyStoryCard";
import ProgressMilestonesCard from "./dashboard/ProgressMilestonesCard";

// Modern glassmorphism components
import GlassCard from "./GlassCard";
import GlowingButton from "./GlowingButton";
import FadeInView from "./FadeInView";
import ModernWellnessCard from "./dashboard/ModernWellnessCard";
import ModernStatCard from "./dashboard/ModernStatCard";

// Design tokens - using unified premium theme
import { TYPOGRAPHY, SPACING, RADIUS, detectDataState } from "../constants/designTokens";
import { BRAND, SURFACES, TEXT, SEMANTIC, SHADOWS as PREMIUM_SHADOWS } from "../constants/premiumTheme";

// Modern color palette for dashboard
import {
  MODERN_TEXT,
  MODERN_GRADIENTS,
  MODERN_SURFACES,
  WELLNESS_COLORS,
  MODERN_MACROS,
  MODERN_SEMANTIC,
  BOLD_GRADIENTS,
  DEPTH_SHADOWS,
} from "../constants/modernColorPalette";
import { getRandomMicrocopy } from "../constants/modernEffects";

// Utility functions
import { generateStoryLine, generateInsights, assessMacroBalance } from "../utils/healthCalculations";
import { calculateFoodMoodScore } from "../utils/foodMoodScore";
import { calculatePersonalizedWellnessScore } from "../utils/smartWellnessEngine";
import { parseDecimal, parseLiters, parseGoal, parseCalories, parseMacro, calculatePercentage } from "../utils/safeNumbers";
import { formatDateLocal, getTodayKey } from "../utils/dateHelpers";
import { scanMealsForAllergens } from "../utils/allergenDetection";
// Note: calculateDietaryComplianceScore and calculateCuisineDiversity moved to Profile > MyInsightsSection
import apiClient from "../services/apiClient";
import { getItem, setItem, STORAGE_KEYS } from "../utils/storage";

// Utility to deduplicate logs by clientEventId (preferred) or id
function dedupeLogs(logs) {
  const seen = new Set();
  return logs.filter(log => {
    // Use clientEventId if available (preferred), otherwise fallback to id
    // This ensures deduplication works even if backend returns multiple entries per clientEventId
    const key = log.clientEventId || log.id;
    if (!key) return true; // Keep logs without any identifier
    if (seen.has(key)) return false; // Duplicate detected
    seen.add(key);
    return true;
  });
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Get contextual error details based on error type
 * Provides user-friendly titles, messages, and icons for different error scenarios
 */
function getErrorDetails(error) {
  if (!error) {
    return {
      title: 'Something went wrong',
      message: 'Please try again',
      icon: 'alert-circle-outline',
      action: 'Try Again',
    };
  }

  const errorMessage = error.message || String(error);

  // Network errors
  if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      title: 'No Internet Connection',
      message: 'Please check your network connection and try again.',
      icon: 'cloud-offline-outline',
      action: 'Retry',
    };
  }

  // Authentication errors
  if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('auth')) {
    return {
      title: 'Session Expired',
      message: 'Please sign in again to continue.',
      icon: 'lock-closed-outline',
      action: 'Sign In',
    };
  }

  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('Server error')) {
    return {
      title: 'Server Unavailable',
      message: 'Our servers are experiencing issues. Please try again in a few moments.',
      icon: 'server-outline',
      action: 'Try Again',
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'The request took too long. Please check your connection and try again.',
      icon: 'time-outline',
      action: 'Retry',
    };
  }

  // Data not found errors
  if (errorMessage.includes('404') || errorMessage.includes('Not found') || errorMessage.includes('not found')) {
    return {
      title: 'Data Not Available',
      message: 'The requested data could not be found. Please refresh to try again.',
      icon: 'search-outline',
      action: 'Refresh',
    };
  }

  // Rate limiting
  if (errorMessage.includes('429') || errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')) {
    return {
      title: 'Too Many Requests',
      message: 'Please wait a moment before trying again.',
      icon: 'hourglass-outline',
      action: 'Wait & Retry',
    };
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'alert-circle-outline',
    action: 'Try Again',
  };
}

function getMoodScore(log) {
  const score = Number(log?.score ?? log?.moodScore ?? log?.intensity);
  return Number.isFinite(score) ? score : null;
}

function getEnergyScore(log) {
  const score = Number(log?.energy ?? log?.energyLevel);
  return Number.isFinite(score) ? score : null;
}

function getFoodMoodInsight({ trends, hasMeals, hasMood }) {
  if (trends?.breakfastMoodCorrelation > 0.3) {
    return 'Breakfast before 9am aligns with better mood for you.';
  }
  if (trends?.proteinMoodCorrelation > 0.2) {
    return 'Higher protein days align with steadier mood.';
  }
  if (!hasMeals || !hasMood) {
    return 'Log meals and mood to unlock your patterns.';
  }
  return 'Keep logging to surface clearer patterns.';
}

function getGuidanceConfig({ hasMeals, hasMood, waterIntake, waterGoal, hour }) {
  const mealLabel = hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : 'Dinner';
  if (!hasMood) {
    return {
      title: 'Quick check-in',
      message: '1 tap to log mood and energy.',
      actionLabel: 'Check in',
      action: 'mood',
    };
  }
  if (!hasMeals) {
    return {
      title: 'Next best step',
      message: `Log ${mealLabel.toLowerCase()} to anchor your day.`,
      actionLabel: `Add ${mealLabel}`,
      action: 'meal',
    };
  }
  if (waterIntake < Math.max(0.3, waterGoal * 0.25)) {
    return {
      title: 'Hydration boost',
      message: 'A quick glass helps keep energy steady.',
      actionLabel: 'Add water',
      action: 'water',
    };
  }
  return {
    title: 'Your weekly story',
    message: 'See what is shaping your week.',
    actionLabel: 'View story',
    action: 'story',
  };
}

function getWeeklyStoryCopy({ trends, moodAvg, waterAvg }) {
  if (trends?.breakfastMoodCorrelation > 0.3) {
    return {
      title: 'Breakfast timing lifts mood.',
      subtitle: 'Earlier meals align with higher scores.',
    };
  }
  if (waterAvg > 1.2) {
    return {
      title: 'Hydration looks steady.',
      subtitle: 'Energy holds above 1.2L.',
    };
  }
  if (moodAvg != null) {
    return {
      title: 'Your mood is finding a baseline.',
      subtitle: 'More check-ins sharpen the story.',
    };
  }
  return {
    title: 'Your weekly story is waiting.',
    subtitle: 'Log a few days to reveal patterns.',
  };
}

function getReflectionMilestone(streak) {
  if (streak <= 0) {
    return 'Log your first check-in to start a reflection streak.';
  }
  const target = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : 21;
  const remaining = Math.max(0, target - streak);
  if (remaining === 0) {
    return `Milestone reached: ${target}-day reflection streak.`;
  }
  return `${remaining} day${remaining === 1 ? '' : 's'} to reach a ${target}-day reflection streak.`;
}


export default function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { logs: localFoodLogs } = useFoodLog(); // Get local SQLite logs
  const { profile: contextProfile } = useProfileContext(); // Get profile from context (eliminates duplicate /profile/me fetch)
  const [refreshing, setRefreshing] = useState(false);
  const [streakSavedVisible, setStreakSavedVisible] = useState(false);
  const notify = useNotification();
  const router = useRouter();
  const { user } = useUser();
  const { theme, colors } = useTheme();
  const queryClient = useQueryClient();
  const hasTrackedView = useRef(false);

  // Insights modal state
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [moodInsights, setMoodInsights] = useState([]);
  const [insightsMessage, setInsightsMessage] = useState(null);
  const [insightsError, setInsightsError] = useState(null);
  const [proteinModalVisible, setProteinModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [insightsDays, setInsightsDays] = useState(30);
  const [insightsMeta, setInsightsMeta] = useState({
    moods: 0,
    meals: 0,
    minMoods: 10,
    minMeals: 10,
    days: 30,
    generatedAt: null,
    cached: false,
    cacheAge: null,
  });

  // REMOVED: Collapsible section states - now handled internally by Intelligence Cards
  // const [nutritionExpanded, setNutritionExpanded] = useState(true);
  // const [wellnessExpanded, setWellnessExpanded] = useState(true);
  // const [progressExpanded, setProgressExpanded] = useState(false);

  // Focus mode state - simplifies view to reduce cognitive load
  const [focusMode, setFocusMode] = useState(false);

  // Recommendation detail modal state
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [recommendationModalVisible, setRecommendationModalVisible] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [acceptingRecommendation, setAcceptingRecommendation] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Phase 3: Preference-based insights state
  // Note: complianceScore and cuisineDiversity moved to Profile > MyInsightsSection
  const [allergenWarnings, setAllergenWarnings] = useState([]);

  // Recommendations hook (handles caching internally with 5-min cache)
  const {
    acceptRecommendation: acceptRecommendationAction,
    trackInteraction,
  } = useRecommendations();

  // Mood tracking hooks
  const { data: trendData } = useMoodTrends({ period: 'week' });
  const { data: moodInsightsData, isLoading: moodInsightsLoading } = useMoodInsights({ windowDays: 30, trendDays: 7 });

  // Water tracking hook
  const { markHydrationCelebration, logWater } = useWaterLog();

  // Hydration analytics (V2 features)
  const { analytics: hydrationAnalytics } = useHydrationAnalytics();

  useEffect(() => {
    if (!hasTrackedView.current && data) {
      const mealsCount = data?.today?.foodLogs?.length || 0;
      const moodsCount = data?.today?.moodLogs?.length || 0;
      const waterLiters = parseLiters(data?.today?.waterIntakeLiters);
      const hasAny = mealsCount > 0 || moodsCount > 0 || waterLiters > 0;

      trackEvent('dashboard_viewed', {
        has_any_data: hasAny,
        has_meals: mealsCount > 0,
        has_mood: moodsCount > 0,
        water_intake_liters: waterLiters,
      });
      hasTrackedView.current = true;
    }
  }, [data]);

  useEffect(() => {
    let isActive = true;
    const loadSavedFilter = async () => {
      const savedDays = await getItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS);
      if (!isActive) return;
      if ([7, 30, 90].includes(savedDays)) {
        setInsightsDays(savedDays);
      }
    };

    loadSavedFilter();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS, insightsDays);
  }, [insightsDays]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Note: useFocusEffect manual refetch removed - React Query handles staleness automatically
  // Data will refetch if >30s old (respects staleTime configuration)

  // Load profile when dashboard data is available
  // OPTIMIZATION: React Query's useRecommendations hook handles fetching automatically
  // with 5-min caching internally. We don't call fetchRecommendations() here because:
  // - useRecommendations hook already fetches on mount
  // - Calling it creates a dependency that changes every render, causing infinite refetches
  // - React Query deduplicates requests automatically, no need to manual call
  useEffect(() => {
    if (!data || isLoading) return;

    // Use profile from context instead of fetching (eliminates duplicate /profile/me)
    if (contextProfile) {
      setUserProfile(contextProfile);
    }
  }, [data, isLoading, contextProfile]);

  // Phase 3: Scan for allergen warnings (urgent alerts stay on Dashboard)
  // Note: complianceScore and cuisineDiversity calculations moved to Profile > MyInsightsSection
  useEffect(() => {
    if (!data || isLoading) return;

    try {
      // Scan meals for allergen warnings - these are urgent and stay on Dashboard
      if (data?.today?.foodLogs && userProfile?.dietary?.allergies) {
        const warnings = scanMealsForAllergens(
          data.today.foodLogs,
          userProfile.dietary.allergies
        );
        setAllergenWarnings(warnings);
      }
    } catch (error) {
      console.error('[Dashboard Phase 3] Error scanning allergens:', error);
      // Fail silently - allergen detection is secondary
    }
  }, [data, isLoading, userProfile]);

  // Track recommendation view interaction (delegates to hook)
  // eslint-disable-next-line no-unused-vars
  const trackRecommendationView = useCallback(async (recommendationId) => {
    await trackInteraction(recommendationId, 'view');
  }, [trackInteraction]);

  // Accept recommendation and add to food log (delegates to hook)
  const handleAcceptRecommendation = useCallback(async (recommendation) => {
    try {
      setAcceptingRecommendation(true);

      const result = await acceptRecommendationAction(recommendation);

      if (result.success) {
        notify.success(result.message || 'Added to food log!');
        setRecommendationModalVisible(false);
        setSelectedRecommendation(null);

        // Refresh dashboard to show updated nutrition
        await refetch();
      } else {
        notify.error(result.error || 'Failed to add to log');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to accept recommendation:', error);
      notify.error(error?.response?.data?.error || 'Failed to add to log');
    } finally {
      setAcceptingRecommendation(false);
    }
  }, [acceptRecommendationAction, refetch, notify]);

  // Reject recommendation (delegates to hook)
  const handleRejectRecommendation = useCallback(async (recommendation, reason) => {
    try {
      await trackInteraction(recommendation.id, 'reject', { reason });

      notify.info('Thanks for the feedback!');
      setRecommendationModalVisible(false);
      setSelectedRecommendation(null);
    } catch (error) {
      console.error('[Dashboard] Failed to reject recommendation:', error);
      // Fail silently - rejection tracking is not critical
    }
  }, [notify, trackInteraction]);

  // Update nutrition goals (inline edit from RemainingBudgetCard)
  // eslint-disable-next-line no-unused-vars
  const handleGoalsUpdate = useCallback(async (goalUpdates) => {
    try {
      const response = await apiClient.post('/api/nutrition/goals', goalUpdates);
      if (response?.data?.success) {
        notify.success('Goal updated!');
        // Refresh dashboard data
        await refetch();
      } else {
        notify.error('Failed to update goal');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to update goals:', error);
      notify.error(error?.response?.data?.error || 'Failed to update goal');
    }
  }, [refetch, notify]);

  // ============================================================================
  // GAMIFICATION LOGIC
  // ============================================================================
  
  // Track previous streak to detect increments
  const prevStreakRef = useRef(data?.gamification?.streak);

  const checkStreakReward = useCallback(async (currentStreak) => {
    try {
      const result = await apiClient.post('/gamification/check-streak', { currentStreak });
      if (result.awarded) {
        notify.success(result.message);
        refetch(); // Refresh to show new freeze count
      }
    } catch (error) {
      console.error("Failed to check streak reward:", error);
      // Fail silently for rewards - don't disrupt user experience
    }
  }, [notify, refetch]);

  useEffect(() => {
    if (data?.gamification?.streak && prevStreakRef.current !== undefined) {
      if (data.gamification.streak > prevStreakRef.current) {
        checkStreakReward(data.gamification.streak);
      }
    }
    prevStreakRef.current = data?.gamification?.streak;
  }, [data?.gamification?.streak, checkStreakReward]);

  // Check if a freeze was consumed (Logic: if streak preserved but logged date gap > 1 day)
  // For now, we can trigger this manually or based on a backend flag in 'data'
  useEffect(() => {
    if (data?.gamification?.freezeConsumed) {
      setStreakSavedVisible(true);
    }
  }, [data?.gamification?.freezeConsumed]);

  // Deduplicate food logs for today (merge local SQLite + backend)
  const uniqueFoodLogs = useMemo(() => {
    // Get today's date range for filtering local logs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Filter local logs for today only
    const todayLocalLogs = localFoodLogs.filter(log => {
      const logDate = new Date(log.timestamp || log.loggedDate);
      return logDate >= todayStart && logDate <= todayEnd;
    });

    // Merge backend logs with local logs
    const backendLogs = data?.today?.foodLogs || [];
    const allLogs = [...backendLogs, ...todayLocalLogs];

    // Deduplicate by clientEventId (backend + local may have same meal)
    return dedupeLogs(allLogs);
  }, [data, localFoodLogs]);

  // Calculate period data for MealInsightsCard History tab
  const mealPeriodData = useMemo(() => {
    const summaries = data?.trends?.weekSummaries || [];
    if (summaries.length === 0) return null;

    const totalCalories = summaries.reduce((sum, s) => sum + (s.totalCalories || 0), 0);
    const totalProtein = summaries.reduce((sum, s) => sum + (s.totalProtein || 0), 0);
    const totalMeals = summaries.reduce((sum, s) => sum + (s.mealCount || 0), 0);

    return {
      avgCalories: Math.round(totalCalories / summaries.length),
      avgProtein: Math.round(totalProtein / summaries.length),
      totalMeals: totalMeals || uniqueFoodLogs.length,
      caloriesTrend: 0, // Could calculate week-over-week if we have prior week data
    };
  }, [data?.trends?.weekSummaries, uniqueFoodLogs.length]);

  const hydrationEvents = useMemo(() => {
    if (!data?.today?.waterLogs) return [];
    return data.today.waterLogs.map((log) => {
      const hydrationLiters = parseLiters(log.hydrationLiters || log.amountLiters);
      const rawLiters = parseLiters(log.amountLiters);
      return {
        timestamp: log.loggedDate,
        amountMl: Math.round(hydrationLiters * 1000),
        rawAmountMl: Math.round(rawLiters * 1000),
        type: log.beverageType || 'water',
      };
    });
  }, [data]);

  const hydrationLastLoggedAt = useMemo(() => {
    if (!data?.today?.waterLogs || data.today.waterLogs.length === 0) return null;
    return data.today.waterLogs.reduce((latest, log) => {
      const timestamp = Date.parse(log.loggedDate);
      if (!Number.isFinite(timestamp)) return latest;
      return latest ? Math.max(latest, timestamp) : timestamp;
    }, null);
  }, [data]);

  const hydrationCelebratedKey = useMemo(() => {
    if (!data?.today?.hydrationCelebratedAt) return null;
    const date = new Date(data.today.hydrationCelebratedAt);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }, [data]);

  const handleHydrationCelebration = async (dayKey) => {
    try {
      await markHydrationCelebration(dayKey);
    } catch (error) {
      console.error('[Dashboard] Failed to persist hydration celebration:', error);
    }
  };

  // Aggregate micros from deduplicated food logs
  const aggregatedMicros = useMemo(() => {
    if (!uniqueFoodLogs.length) return {};

    const parseMicroValue = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (value && typeof value === 'object') {
        if (typeof value.value === 'number' && Number.isFinite(value.value)) {
          return value.value;
        }
        if (typeof value.value === 'string') {
          const parsed = parseFloat(value.value.replace(/[^0-9.]/g, ''));
          return Number.isFinite(parsed) ? parsed : 0;
        }
        if (typeof value.amount === 'number' && Number.isFinite(value.amount)) {
          return value.amount;
        }
      }
      return 0;
    };

    // Key mapping to normalize camelCase to snake_case (vitaminA -> vitamin_a)
    const keyMapping = {
      'vitaminA': 'vitamin_a',
      'vitaminC': 'vitamin_c',
      'vitaminD': 'vitamin_d',
      'vitaminE': 'vitamin_e',
      'vitaminK': 'vitamin_k',
      'vitaminB12': 'vitamin_b12',
      'vitamin_a': 'vitamin_a',
      'vitamin_c': 'vitamin_c',
      'vitamin_d': 'vitamin_d',
      'vitamin_e': 'vitamin_e',
      'vitamin_k': 'vitamin_k',
      'vitamin_b12': 'vitamin_b12',
      'calcium': 'calcium',
      'iron': 'iron',
      'magnesium': 'magnesium',
      'potassium': 'potassium',
      'zinc': 'zinc',
      'sodium': 'sodium',
      'folate': 'folate',
    };

    const micros = {};
    uniqueFoodLogs.forEach((log) => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          // Normalize key (camelCase -> snake_case)
          const normalizedKey = keyMapping[key] || key;
          const numValue = parseMicroValue(value);
          micros[normalizedKey] = (micros[normalizedKey] || 0) + numValue;
        });
      }
    });
    return micros;
  }, [uniqueFoodLogs]);

  const topProteinFoods = useMemo(() => {
    if (!uniqueFoodLogs.length) return [];
    return uniqueFoodLogs
      .map((log) => ({
        id: log.id || log.clientEventId || log.foodName,
        name: log.foodName || 'Food item',
        protein: parseMacro(log.protein),
        calories: parseCalories(log.calories),
      }))
      .filter((item) => Number.isFinite(item.protein) && item.protein > 0)
      .sort((a, b) => b.protein - a.protein)
      .slice(0, 6);
  }, [uniqueFoodLogs]);

  // Transform data into rich calendar format (Food + Mood + Hydration)
  const calendarData = useMemo(() => {
    const calData = {};

    // 1. Process Food Logs (Today)
    const todayKey = getTodayKey();

    if (data?.today?.foodLogs && uniqueFoodLogs.length > 0) {
      const totalCals = uniqueFoodLogs.reduce((sum, l) => sum + parseCalories(l.calories), 0);
      const goal = parseGoal(data?.goals?.dailyCalories, 2000, 800, 10000);

      const waterIntake = parseLiters(data.today.waterIntakeLiters);
      const waterGoalValue = parseGoal(data.goals?.waterLiters, 2.0, 0.5, 10);
      const hydrationPercent = calculatePercentage(waterIntake, waterGoalValue, 200);

      const micronutrientCount = Object.keys(aggregatedMicros).length;
      const currentMood = data.today.moodLogs?.length > 0
        ? data.today.moodLogs.reduce((sum, log) => sum + (log.intensity ?? 5), 0) / data.today.moodLogs.length
        : null;

      const totalProtein = parseMacro(data.today.nutrition.totalProtein);
      const proteinGoalValue = parseGoal(data.goals?.proteinG, 150, 20, 500);

      const foodMoodScore = calculateFoodMoodScore({
        calories: totalCals,
        calorieGoal: goal,
        protein: totalProtein,
        proteinGoal: proteinGoalValue,
        hydrationPercent,
        micronutrientCount,
        moodIntensity: currentMood,
      });

      const goalReached = totalCals >= (goal * 0.9) && totalCals <= (goal * 1.1);

      calData[todayKey] = {
        calories: totalCals,
        meals: uniqueFoodLogs.length,
        goalReached,
        logged: uniqueFoodLogs.length > 0,
        moodAvg: currentMood,
        hydrationPercent,
        foodMoodScore,
        protein: totalProtein,
        proteinGoal: proteinGoalValue,
        storyLine: generateStoryLine({
          calories: totalCals,
          calorieGoal: goal,
          meals: uniqueFoodLogs.length,
          goalReached,
          moodAvg: currentMood,
          hydrationPercent,
          protein: totalProtein,
          proteinGoal: proteinGoalValue,
        }),
      };
    }

    // 2. Process Weekly Nutrition History (Last 7 Days)
    if (data?.trends?.weekSummaries) {
      const goal = parseGoal(data?.goals?.dailyCalories, 2000, 800, 10000);
      const proteinGoalValue = parseGoal(data.goals?.proteinG, 150, 20, 500);

      data.trends.weekSummaries.forEach(summary => {
        const date = new Date(summary.date);
        const key = formatDateLocal(date);

        // Skip today since we already processed it above
        if (key === todayKey) return;

        const totalCals = parseCalories(summary.totalCalories);
        const totalProtein = parseMacro(summary.totalProtein);
        const goalReached = totalCals >= (goal * 0.9) && totalCals <= (goal * 1.1);

        // Merge with existing data (in case mood data exists)
        calData[key] = {
          ...(calData[key] || {}),
          calories: totalCals,
          meals: summary.mealCount || 0,
          goalReached,
          logged: totalCals > 0,
          protein: totalProtein,
          proteinGoal: proteinGoalValue,
          // Calculate food mood score if we have the data
          foodMoodScore: calculateFoodMoodScore({
            calories: totalCals,
            calorieGoal: goal,
            protein: totalProtein,
            proteinGoal: proteinGoalValue,
            hydrationPercent: calData[key]?.hydrationPercent || 0,
            micronutrientCount: 0,
            moodIntensity: calData[key]?.moodAvg || null,
          }),
          storyLine: generateStoryLine({
            calories: totalCals,
            calorieGoal: goal,
            meals: summary.mealCount || 0,
            goalReached,
            moodAvg: calData[key]?.moodAvg || null,
            hydrationPercent: calData[key]?.hydrationPercent || 0,
            protein: totalProtein,
            proteinGoal: proteinGoalValue,
          }),
        };
      });
    }

    // 3. Process Mood Trends (History)
    if (trendData?.data) {
      trendData.data.forEach(log => {
        const date = new Date(log.loggedDate);
        const key = formatDateLocal(date);

        if (!calData[key]) {
          calData[key] = {
            calories: 0, meals: 0, goalReached: false, logged: true,
            moodAvg: 0, hydrationPercent: 0, foodMoodScore: 0
          };
        }

        // Update mood data
        calData[key].moodAvg = log.intensity || 5;
        calData[key].logged = true;
      });
    }

    // Ensure today exists even if empty
    if (!calData[todayKey]) {
      calData[todayKey] = { calories: 0, meals: 0, goalReached: false, logged: false, moodAvg: null, hydrationPercent: null, foodMoodScore: null };
    }

    return calData;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, trendData]);

  // Detect anomalies in data
  const dataAnomalies = useMemo(() => {
    if (!data?.today || !data?.goals) return [];

    const anomalies = [];

    // Check calories
    const totalCalories = parseCalories(data.today.nutrition.totalCalories);
    const calorieGoal = parseGoal(data.goals?.dailyCalories, 2000, 800, 10000);
    const calorieState = detectDataState(
      totalCalories,
      calorieGoal,
      { warnThreshold: 0.8, overThreshold: 1.0 }
    );
    if (calorieState.isAnomaly) {
      const percentageDiff = Math.round(((totalCalories - calorieGoal) / calorieGoal) * 100);
      const isOver = totalCalories > calorieGoal;

      anomalies.push({
        metric: 'Calories',
        value: totalCalories,
        goal: calorieGoal,
        percentageDiff: Math.abs(percentageDiff),
        message: `Today's calories (${Math.round(totalCalories)} kcal) are ${Math.abs(percentageDiff)}% ${isOver ? 'above' : 'below'} your goal (${Math.round(calorieGoal)} kcal). ${isOver ? 'Want to double-check portions?' : 'Make sure you\'re eating enough!'}`,
        icon: 'analytics-outline',
        tone: isOver ? 'warning' : 'info',
        actionLabel: 'View History',
        action: () => router.push('/history'),
      });
    }

    // Check protein
    const totalProtein = parseMacro(data.today.nutrition.totalProtein);
    const proteinGoal = parseGoal(data.goals?.proteinG, 150, 20, 500);
    const proteinState = detectDataState(
      totalProtein,
      proteinGoal,
      { warnThreshold: 0.8, overThreshold: 1.2 }
    );
    if (proteinState.isAnomaly) {
      const percentageDiff = Math.round(((totalProtein - proteinGoal) / proteinGoal) * 100);
      const isOver = totalProtein > proteinGoal;

      anomalies.push({
        metric: 'Protein',
        value: totalProtein,
        goal: proteinGoal,
        percentageDiff: Math.abs(percentageDiff),
        message: `Protein intake (${Math.round(totalProtein)}g) is ${Math.abs(percentageDiff)}% ${isOver ? 'above' : 'below'} your goal (${Math.round(proteinGoal)}g). ${isOver ? 'Great job staying on track!' : 'Consider adding more protein-rich foods.'}`,
        icon: 'analytics-outline',
        tone: isOver ? 'success' : 'info',
        actionLabel: 'View History',
        action: () => router.push('/history'),
      });
    }

    return anomalies;
  }, [data, router]);

  // Generate smart insights based on current data and time
  const smartInsights = useMemo(() => {
    if (!data?.today || !data?.goals) return [];

    const currentCalories = parseCalories(data.today.nutrition.totalCalories);
    const currentWater = parseLiters(data.today.waterIntakeLiters);
    const todayMoodLogs = data.today.moodLogs?.length || 0;
    const hasTodayActivity = currentCalories > 0 || currentWater > 0 || todayMoodLogs > 0;

    // Check if returning user (has historical data but nothing today)
    const isReturningUser = parseDecimal(data.gamification?.totalMealsLogged, 0) > 0 ||
                           parseDecimal(data.gamification?.xp, 0) > 0 ||
                           parseDecimal(data.gamification?.level, 1) > 1;

    // Show friendly welcome back message for returning users with no today's data
    if (isReturningUser && !hasTodayActivity) {
      const hour = new Date().getHours();
      let greeting = 'Ready to start your day?';
      let message = 'Log your first meal to kick off today\'s tracking.';

      if (hour >= 12 && hour < 17) {
        greeting = 'Good to see you back!';
        message = 'Start logging to pick up where you left off.';
      } else if (hour >= 17) {
        greeting = 'Welcome back!';
        message = 'It\'s not too late to log today\'s meals.';
      }

      return [{
        type: 'welcome',
        icon: 'hand-right',
        title: greeting,
        message: message,
        action: 'Quick Log',
      }];
    }

    return generateInsights({
      currentCalories,
      calorieGoal: parseGoal(data.goals?.dailyCalories, 2000, 800, 10000),
      currentProtein: parseMacro(data.today.nutrition.totalProtein),
      proteinGoal: parseGoal(data.goals?.proteinG, 150, 20, 500),
      currentHydration: currentWater,
      hydrationGoal: parseGoal(data.goals?.waterLiters, 2.0, 0.5, 10),
      streak: parseDecimal(data.trends?.currentStreak, 0) || parseDecimal(data.gamification?.streak, 0),
      timeOfDay: new Date().getHours(),
    });
  }, [data]);

  // Assess macro balance quality
  const macroAssessment = useMemo(() => {
    if (!data?.today?.nutrition) return null;

    return assessMacroBalance({
      protein: parseMacro(data.today.nutrition.totalProtein),
      carbs: parseMacro(data.today.nutrition.totalCarbs),
      fat: parseMacro(data.today.nutrition.totalFats),
    });
  }, [data]);

  // Calculate personalized wellness score for EnhancedMoodCard
  const wellnessScore = useMemo(() => {
    if (!data?.today || !data?.goals) return null;

    const rawScore = calculatePersonalizedWellnessScore({
      today: data.today,
      goals: data.goals,
      historicalData: data.trends?.weekSummaries || [],
      streak: parseDecimal(data.trends?.currentStreak, 0) || parseDecimal(data.gamification?.streak, 0),
    });

    // Transform to format expected by EnhancedMoodCard
    // breakdown should have simple percentage values, not nested objects
    const breakdown = rawScore.breakdown || {};

    // Safe percentage calculation helper - prevents NaN and division by zero
    const safePercent = (category) => {
      const score = breakdown[category]?.score;
      const max = breakdown[category]?.max;
      if (!max || max <= 0 || typeof score !== 'number') return 0;
      const pct = Math.round((score / max) * 100);
      return Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
    };

    return {
      score: typeof rawScore.score === 'number' && Number.isFinite(rawScore.score)
        ? Math.min(100, Math.max(0, rawScore.score))
        : 0,
      tier: rawScore.tier,
      label: rawScore.label,
      breakdown: {
        nutrition: safePercent('nutrition'),
        hydration: safePercent('hydration'),
        mood: safePercent('mood'),
        habits: safePercent('habits'),
      },
    };
  }, [data]);

  // Handlers
  // eslint-disable-next-line no-unused-vars
  const handleLogMood = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
  };

  const handleMoodLogged = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['moodInsights'] });
  };

  const loadMoodInsights = useCallback(async ({ days = insightsDays, forceRefresh = false } = {}) => {
    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const response = await apiClient.post('/mood/insights', {
        days,
        forceRefresh,
      });

      const insights = response?.insights || [];
      setMoodInsights(insights);

      const moodsCount = response?.dataPoints?.moods ?? response?.currentData?.moods ?? 0;
      const mealsCount = response?.dataPoints?.meals ?? response?.currentData?.meals ?? 0;
      const minMoods = response?.minDataRequired?.moods ?? 10;
      const minMeals = response?.minDataRequired?.meals ?? 10;
      setInsightsMeta({
        moods: moodsCount,
        meals: mealsCount,
        minMoods,
        minMeals,
        days,
        generatedAt: response?.generatedAt || null,
        cached: Boolean(response?.cached),
        cacheAge: response?.cacheAge ?? null,
      });

      if (response?.message) {
        if (response?.minDataRequired && response?.currentData) {
          const { moods, meals } = response.currentData;
          const { moods: minMoods, meals: minMeals } = response.minDataRequired;
          setInsightsMessage(
            `${response.message} (${moods}/${minMoods} mood logs, ${meals}/${minMeals} meals)`
          );
        } else {
          setInsightsMessage(response.message);
        }
      } else {
        setInsightsMessage(null);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load mood insights:', err);
      setInsightsError('Unable to load insights right now. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  }, [insightsDays]);

  // eslint-disable-next-line no-unused-vars
  const handlePreviewInsights = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/insights/mood', params: { days: String(insightsDays) } });
  };

  const handleViewInsights = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/insights/mood', params: { days: String(insightsDays) } });
  };

  const handleInsightsDaysChange = (days) => {
    setInsightsDays(days);
    loadMoodInsights({ days, forceRefresh: true });
  };

  const handleShareInsights = async () => {
    if (!moodInsights.length && !insightsMessage) {
      notify.error('No insights to share yet.');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - insightsDays + 1);
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    const header = `Mood Insights (${insightsDays} days)`;
    const coverage = `Data coverage: ${insightsMeta.moods}/${insightsMeta.minMoods}+ moods, ${insightsMeta.meals}/${insightsMeta.minMeals}+ meals`;
    const items = moodInsights.map((insight, index) => {
      const confidence = insight.confidence ? ` (${Math.round(insight.confidence * 100)}%)` : '';
      return `${index + 1}. ${insight.title}${confidence}\n${insight.message}`;
    });
    const highlights = items.length ? items.join('\n\n') : insightsMessage;
    const message = `${header}\n${dateRange}\n${coverage}\n\nHighlights\n${highlights}\n\nWhy this matters\nPatterns between mood and meals can help you make small changes with big impact.\n\nNext step\nPick one suggestion and try it for 3 days.`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('[Dashboard] Failed to share insights:', error);
      notify.error('Unable to share insights right now.');
    }
  };

  const handleLogMealFromInsights = () => {
    setInsightsModalVisible(false);
    router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
  };

  const handleLogMoodFromInsights = () => {
    setInsightsModalVisible(false);
    router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
  };

  const handleViewMealHistory = () => {
    router.push('/history');
  };

  const handleInsightAction = (insight) => {
    // Handle different insight actions
    switch (insight.action) {
      case 'Log Dinner':
        router.push({ pathname: '/(tabs)/log', params: { focus: 'meal', mealType: 'dinner' } });
        break;
      case 'Quick Log':
        router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
        break;
      case 'View High-Protein Foods':
        setProteinModalVisible(true);
        break;
      case 'Log Water':
        router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
        break;
      default:
        notify.info(insight.action);
    }
  };



  const insightsCoverage = useMemo(() => {
    const moodProgress = insightsMeta.minMoods > 0
      ? Math.min(insightsMeta.moods / insightsMeta.minMoods, 1)
      : 1;
    const mealsProgress = insightsMeta.minMeals > 0
      ? Math.min(insightsMeta.meals / insightsMeta.minMeals, 1)
      : 1;
    return { moodProgress, mealsProgress };
  }, [insightsMeta]);

  const insightsHighlights = useMemo(() => {
    return moodInsights.slice(0, 2);
  }, [moodInsights]);

  const insightsUpdatedText = useMemo(() => {
    if (insightsMeta.cacheAge !== null && insightsMeta.cacheAge !== undefined) {
      return `Updated ${insightsMeta.cacheAge}m ago`;
    }

    if (insightsMeta.generatedAt) {
      const generatedAt = new Date(insightsMeta.generatedAt);
      if (!Number.isNaN(generatedAt.getTime())) {
        return `Updated ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }

    return 'Updated recently';
  }, [insightsMeta]);

  // Loading state - comprehensive skeleton that mirrors app layout
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface.background.primary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <DashboardSkeleton />
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error) {
    const errorDetails = getErrorDetails(error);

    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconContainer}>
          <Ionicons name={errorDetails.icon} size={64} color={TEXT.tertiary} />
        </View>
        <Text style={styles.errorTitle}>{errorDetails.title}</Text>
        <Text style={styles.errorText}>
          {errorDetails.message}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            refetch();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={errorDetails.action}
          accessibilityHint="Attempts to reload the dashboard data"
        >
          <LinearGradient
            colors={SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.retryGradient}
          >
            <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryText}>{errorDetails.action}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const { today, goals, gamification, trends, recentWeight } = data;

  // Use calculated streak from trends (fresh calculation) instead of DB streak
  // DB streak may be stale if updateStreak wasn't called properly
  const displayStreak = parseDecimal(trends?.currentStreak, 0) || parseDecimal(gamification?.streak, 0);

  // Check if user has any data (first-time user detection)
  // Include historical data checks so returning users don't see welcome banner
  const hasTodayData = uniqueFoodLogs.length > 0 ||
                        parseLiters(today.waterIntakeLiters) > 0 ||
                        today.moodLogs?.length > 0;

  const hasHistoricalData = displayStreak > 0 ||
                            parseDecimal(gamification?.xp, 0) > 0 ||
                            parseDecimal(gamification?.level, 1) > 1 ||
                            parseDecimal(gamification?.totalMealsLogged, 0) > 0 ||
                            (trends?.weekSummaries && trends.weekSummaries.length > 0) ||
                            recentWeight != null;

  const hasAnyData = hasTodayData || hasHistoricalData;

  const displayName = user?.firstName
    || user?.fullName?.split(' ')?.[0]
    || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const headerTitle = `${getGreeting()}, ${displayName}`;

  const moodLogs = today?.moodLogs || [];
  const waterLogs = today?.waterLogs || [];
  const waterIntake = parseLiters(today?.waterIntakeLiters);
  const waterGoal = parseGoal(goals?.waterLiters, 2.0, 0.5, 10);
  const hasMeals = uniqueFoodLogs.length > 0;
  const hasMood = moodLogs.length > 0;
  const activityCount = uniqueFoodLogs.length + waterLogs.length + moodLogs.length;

  const moodScores = moodLogs.map(getMoodScore).filter((value) => value != null);
  const energyScores = moodLogs.map(getEnergyScore).filter((value) => value != null);
  const moodAvg = moodScores.length ? moodScores.reduce((sum, value) => sum + value, 0) / moodScores.length : null;
  const energyAvg = energyScores.length ? energyScores.reduce((sum, value) => sum + value, 0) / energyScores.length : null;

  const foodMoodInsight = getFoodMoodInsight({ trends, hasMeals, hasMood });
  const guidance = getGuidanceConfig({
    hasMeals,
    hasMood,
    waterIntake,
    waterGoal,
    hour: new Date().getHours(),
  });
  const weeklyStory = getWeeklyStoryCopy({ trends, moodAvg, waterAvg: waterIntake });
  const milestoneText = getReflectionMilestone(displayStreak);

  // Calculate progress percentages for each pillar
  const calorieGoal = parseGoal(goals?.dailyCalories, 2000, 800, 10000);
  const calorieProgress = Math.min((parseCalories(today?.nutrition?.totalCalories) / calorieGoal) * 100, 100);
  const hydrationProgress = Math.min((waterIntake / waterGoal) * 100, 100);
  const moodProgress = moodAvg != null ? moodAvg * 10 : 0; // Mood is out of 10, so multiply by 10 for percentage
  const activityGoal = 5; // Default daily activity goal
  const activityProgress = Math.min((activityCount / activityGoal) * 100, 100);

  const pillarItems = [
    {
      key: 'food',
      title: 'Nutrition',
      icon: 'restaurant',
      gradient: BOLD_GRADIENTS.nutrition,
      value: `${Math.round(parseCalories(today?.nutrition?.totalCalories))} cal`,
      caption: hasMeals ? `of ${calorieGoal} goal` : 'Log meals',
      progress: calorieProgress,
      onPress: () => {
        trackEvent('dashboard_pillar_tap', { pillar: 'food_mood' });
        router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
      },
    },
    {
      key: 'mood',
      title: 'Mood',
      icon: 'happy-outline',
      gradient: BOLD_GRADIENTS.mood,
      value: moodAvg != null ? `${moodAvg.toFixed(1)}/10` : '--',
      caption: energyAvg != null ? `Energy ${energyAvg.toFixed(1)}/10` : 'Check in',
      progress: moodProgress,
      onPress: () => {
        trackEvent('dashboard_pillar_tap', { pillar: 'mood_energy' });
        router.push('/insights/mood');
      },
    },
    {
      key: 'hydration',
      title: 'Hydration',
      icon: 'water-outline',
      gradient: BOLD_GRADIENTS.hydration,
      value: `${waterIntake.toFixed(1)}L`,
      caption: `of ${waterGoal.toFixed(1)}L goal`,
      progress: hydrationProgress,
      onPress: () => {
        trackEvent('dashboard_pillar_tap', { pillar: 'hydration' });
        router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
      },
    },
    {
      key: 'activity',
      title: 'Activity',
      icon: 'pulse-outline',
      gradient: BOLD_GRADIENTS.activity,
      value: `${activityCount}`,
      caption: `of ${activityGoal} moments`,
      progress: activityProgress,
      onPress: () => {
        trackEvent('dashboard_pillar_tap', { pillar: 'activity' });
        router.push('/activity/today');
      },
    },
  ];

  const handleGuidanceAction = () => {
    trackEvent('dashboard_guidance_action', { action: guidance.action });
    if (guidance.action === 'meal') {
      router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
    } else if (guidance.action === 'water') {
      router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
    } else if (guidance.action === 'mood') {
      router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
    } else if (guidance.action === 'story') {
      router.push('/history');
    } else {
      router.push('/insights/mood');
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.container]}
      >
        <ThemeTransition>
          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        <DashboardHeaderSection
          styles={styles}
          headerTitle={headerTitle}
          theme={theme}
          focusMode={focusMode}
          refreshing={refreshing}
          onOpenTheme={() => setThemeModalVisible(true)}
          onToggleFocusMode={() => {
            const newFocusMode = !focusMode;
            setFocusMode(newFocusMode);

            // Focus mode now handled by Intelligence Cards (collapsed by default)
            // No need to manually collapse sections anymore
          }}
          // Enhanced header props
          userInitials={user?.firstName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'U'}
          userImageUrl={user?.imageUrl || null}
          todayCalories={parseCalories(today?.nutrition?.totalCalories)}
          calorieGoal={parseGoal(goals?.dailyCalories, 2000, 800, 10000)}
          waterProgress={calculatePercentage(
            parseLiters(today?.waterIntakeLiters),
            parseGoal(goals?.waterLiters, 2.0, 0.5, 10),
            200
          )}
          waterIntakeLiters={parseLiters(today?.waterIntakeLiters)}
          waterGoalLiters={parseGoal(goals?.waterLiters, 2.0, 0.5, 10)}
          hasNotifications={allergenWarnings.length > 0}
          onNotificationPress={() => {
            // Scroll to allergen warnings or show notification modal
            if (allergenWarnings.length > 0) {
              notify.info(`${allergenWarnings.length} allergen warning${allergenWarnings.length > 1 ? 's' : ''} detected`);
            }
          }}
          showQuickStats={false}
        />

        {/* FIRST-TIME USER EMPTY STATE */}
        {!hasAnyData && (
          <EmptyState
            icon="rocket"
            title="Welcome to Your Health Journey!"
            description="Start logging meals, water, and mood to unlock insights and build a steady daily rhythm."
            actionLabel="Add moment"
            onAction={() => {
              trackEvent('dashboard_empty_state_action', { action: 'add_moment' });
              router.push('/(tabs)/log');
            }}
          />
        )}
        <FadeInView animation="floatIn" delay={0}>
          <ReflectionCheckInCard
            moodLogs={moodLogs}
            onCheckIn={() => {
              trackEvent('dashboard_reflection_checkin_tap');
              router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
            }}
          />
        </FadeInView>

        <FadeInView animation="floatIn" delay={150}>
          <DashboardPillarsGrid items={pillarItems} />
        </FadeInView>

        <FadeInView animation="floatIn" delay={300}>
          <GuidanceCard
            title={guidance.title}
            message={guidance.message}
            actionLabel={guidance.actionLabel}
            onAction={handleGuidanceAction}
          />
        </FadeInView>

        <FadeInView animation="floatIn" delay={450}>
          <WeeklyStoryCard
            title={weeklyStory.title}
            subtitle={weeklyStory.subtitle}
            actionLabel="View weekly story"
            onAction={() => {
              trackEvent('dashboard_weekly_story_view');
              router.push('/history');
            }}
          />
        </FadeInView>

        {hasAnyData && (
          <FadeInView animation="floatIn" delay={600}>
            <ProgressMilestonesCard
              reflectionStreak={displayStreak}
              insightsUnlocked={trends?.patternsDiscovered || 0}
              milestoneText={milestoneText}
              onViewProgress={() => {
                trackEvent('dashboard_progress_view');
                router.push('/profile');
              }}
            />
          </FadeInView>
        )}
      </ScrollView>
        </ThemeTransition>
      </LinearGradient>

      {/* Modals */}
      <Modal
        visible={insightsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInsightsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.insightsModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Mood Insights</Text>
                <Text style={styles.modalSubtitle}>Last {insightsDays} days</Text>
                <Text style={styles.modalMeta}>{insightsUpdatedText}</Text>
              </View>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={handleShareInsights}
                  style={styles.modalActionButton}
                  disabled={insightsLoading}
                >
                  <Ionicons name="share-outline" size={20} color={TEXT.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleViewInsights}
                  style={styles.modalActionButton}
                >
                  <Ionicons name="expand-outline" size={20} color={TEXT.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setInsightsModalVisible(false);
                  }}
                  style={styles.modalActionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close insights"
                >
                  <Ionicons name="close" size={22} color={TEXT.secondary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterRow}>
              {[7, 30, 90].map((days) => {
                const isActive = insightsDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={styles.filterChip}
                    onPress={() => handleInsightsDaysChange(days)}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={SURFACES.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.filterChipActive}
                      >
                        <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
                          {days} days
                        </Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.filterChipText}>
                        {days} days
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {insightsError && (
              <Text style={styles.modalErrorText}>{insightsError}</Text>
            )}
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.insightsSummaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Overview</Text>
                  {insightsMeta.cached && (
                    <Text style={styles.summaryMeta}>
                      Cached {insightsMeta.cacheAge ? `${insightsMeta.cacheAge}m` : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.coverageRow}>
                  <View style={styles.coverageItem}>
                    <View style={styles.coverageHeader}>
                      <Text style={styles.coverageLabel}>Mood logs</Text>
                      <Text style={styles.coverageValue}>
                        {insightsMeta.moods}/{insightsMeta.minMoods}+
                      </Text>
                    </View>
                    <View style={styles.coverageBar}>
                      <View style={[styles.coverageFill, { width: `${insightsCoverage.moodProgress * 100}%` }]} />
                    </View>
                  </View>
                  <View style={styles.coverageItem}>
                    <View style={styles.coverageHeader}>
                      <Text style={styles.coverageLabel}>Meals</Text>
                      <Text style={styles.coverageValue}>
                        {insightsMeta.meals}/{insightsMeta.minMeals}+
                      </Text>
                    </View>
                    <View style={styles.coverageBar}>
                      <View style={[styles.coverageFill, { width: `${insightsCoverage.mealsProgress * 100}%` }]} />
                    </View>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <Text style={styles.summarySectionTitle}>Why this matters</Text>
                <Text style={styles.summaryText}>
                  Patterns between mood and meals can highlight small changes that improve your day.
                </Text>
                <Text style={styles.summarySectionTitle}>Next step</Text>
                <Text style={styles.summaryText}>
                  Pick one suggestion below and try it for 3 days, then check results.
                </Text>
                {insightsHighlights.length > 0 && (
                  <>
                    <Text style={styles.summarySectionTitle}>Highlights</Text>
                    {insightsHighlights.map((insight) => (
                      <View key={insight.title} style={styles.summaryHighlightRow}>
                        <View style={styles.summaryBullet} />
                        <Text style={styles.summaryHighlightText}>{insight.title}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
              <MoodInsightCard
                insights={moodInsights}
                loading={insightsLoading}
                onRefresh={() => loadMoodInsights({ forceRefresh: true })}
                minDataMessage={insightsMessage}
              />
              {!insightsLoading && (
                <View style={styles.insightsCtaRow}>
                  <TouchableOpacity
                    style={styles.insightsCtaButton}
                    onPress={handleLogMoodFromInsights}
                  >
                    <Ionicons name="happy-outline" size={18} color={TEXT.white} />
                    <Text style={styles.insightsCtaText}>Log Mood</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.insightsCtaButtonSecondary}
                    onPress={handleLogMealFromInsights}
                  >
                    <Ionicons name="restaurant-outline" size={18} color={BRAND.primary} />
                    <Text style={styles.insightsCtaTextSecondary}>Log Meal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={proteinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProteinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.proteinModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>High-Protein Foods</Text>
              <TouchableOpacity
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setProteinModalVisible(false);
                }}
                style={styles.modalActionButton}
                accessibilityRole="button"
                accessibilityLabel="Close high-protein foods"
              >
                <Ionicons name="close" size={22} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>
            {topProteinFoods.length > 0 ? (
              <View style={styles.proteinList}>
                {topProteinFoods.map((item) => (
                  <View key={item.id} style={styles.proteinRow}>
                    <Text style={styles.proteinName}>{item.name}</Text>
                    <Text style={styles.proteinValue}>
                      {Math.round(item.protein)}g protein
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.proteinHistoryButton}
                  onPress={handleViewMealHistory}
                >
                  <Text style={styles.proteinHistoryButtonText}>View full meal history</Text>
                  <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.modalEmptyText}>
                Log meals to see your top protein foods.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <StreakSavedModal
        visible={streakSavedVisible}
        onClose={() => setStreakSavedVisible(false)}
        freezesLeft={gamification?.streakFreezes || 0}
        styles={styles}
      />

      <ThemeSettingsModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      {/* Recommendation Detail Modal */}
      <RecommendationDetailModal
        visible={recommendationModalVisible}
        recommendation={selectedRecommendation}
        onClose={() => {
          setRecommendationModalVisible(false);
          setSelectedRecommendation(null);
        }}
        onAccept={handleAcceptRecommendation}
        onReject={handleRejectRecommendation}
        onSaveForLater={(rec) => {
          notify.info('Saved for later!');
          setRecommendationModalVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[5],
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary, // Dark text for light background
  },
  errorIconContainer: {
    marginBottom: SPACING[4],
    opacity: 0.5,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary, // Dark text for light background
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary, // Medium text for light background
    textAlign: 'center',
    marginBottom: SPACING[6],
    paddingHorizontal: SPACING[4],
  },
  retryButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    minWidth: 160,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
  },
  retryText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[5],
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: TEXT.primary, // Dark text for light background
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary, // Medium text for light background
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  focusModeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 78, 255, 0.08)', // Soft brand purple (was white glass)
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.15)',
  },
  focusModeButtonActive: {
    backgroundColor: 'rgba(107, 78, 255, 0.15)', // Stronger purple when active (was gold)
    borderColor: 'rgba(107, 78, 255, 0.3)',
  },
  focusModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    marginBottom: SPACING[4],
  },
  focusModeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  focusModeSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginLeft: 'auto',
  },
  moodInsightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
    marginBottom: SPACING[3],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    alignSelf: 'flex-start',
  },
  moodInsightsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    backgroundColor: 'rgba(107, 78, 255, 0.08)', // Soft brand purple tint
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.15)',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399', // Bright green (visible on dark)
  },
  syncDotActive: {
    backgroundColor: '#60A5FA', // Bright blue (visible on dark)
  },
  syncText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary, // Dark text for light background
  },

  // Info card (calm, supportive tone - blue instead of orange/red)
  infoCard: {
    marginBottom: SPACING[4],
    backgroundColor: 'rgba(107, 78, 255, 0.05)', // Purple tint
    borderColor: 'rgba(107, 78, 255, 0.2)', // Purple border
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  anomalyTextContainer: {
    flex: 1,
  },
  anomalyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[1],
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#6B4EFF', // Brand purple
  },
  percentageBadge: {
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#6B4EFF',
  },
  infoMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  anomalyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[2],
    alignSelf: 'flex-start',
    paddingVertical: SPACING[1],
  },
  anomalyActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Primary KPI card
  primaryCard: {
    marginBottom: SPACING[5],
    alignItems: 'center',
  },
  primaryContent: {
    alignItems: 'center',
    width: '100%',
  },
  primaryHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  primaryHintCta: {
    marginTop: SPACING[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: SURFACES.card.secondary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  primaryHintCtaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },
  sectionCard: {
    marginBottom: SPACING[3],
  },

  // Wellness Vertical Stack
  wellnessStack: {
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  wellnessDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Collapsible Section
  collapsibleSection: {
    marginBottom: SPACING[4],
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    ...PREMIUM_SHADOWS.sm,
    marginBottom: SPACING[2],
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  collapsibleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsibleTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    flex: 1,
  },
  collapsibleBadge: {
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  collapsibleBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  collapsibleContent: {
    gap: SPACING[3],
  },

  // Water section
  waterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waterIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  waterTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  waterValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
    marginBottom: SPACING[1],
  },
  waterPercent: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  waterRight: {
    alignItems: 'flex-end',
  },
  quickAddButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  quickAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
  },
  quickAddText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },

  // Meals
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card.border,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SEMANTIC.success.base,
    marginRight: SPACING[3],
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  mealMeta: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Trends
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    textAlign: 'center',
  },

  // Gamification
  gamificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gamificationItem: {
    alignItems: 'center',
  },
  gamificationSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[2],
  },

  // Weight
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  weightInfo: {
    flex: 1,
  },
  weightValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  weightDate: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Hydration Summary
  hydrationSummary: {
    gap: SPACING[4],
  },
  hydrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hydrationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING[3],
  },
  hydrationStat: {
    alignItems: 'center',
    flex: 1,
  },
  hydrationValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
    marginBottom: SPACING[1],
  },
  hydrationLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hydrationDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.2)',
  },
  hydrationTapHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Insights & Protein Modals
  insightsModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...PREMIUM_SHADOWS.lg,
  },
  proteinModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...PREMIUM_SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  modalActionButton: {
    padding: SPACING[2],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  modalMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[0.5],
  },
  modalErrorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.danger.base,
    marginBottom: SPACING[3],
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  filterChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: SURFACES.background.secondary,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
  },
  filterChipTextActive: {
    color: TEXT.white,
  },
  modalScrollContent: {
    paddingBottom: SPACING[4],
  },
  insightsSummaryCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  summaryMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  coverageRow: {
    gap: SPACING[3],
  },
  coverageItem: {
    gap: SPACING[2],
  },
  coverageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverageLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  coverageValue: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.primary,
  },
  coverageBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  coverageFill: {
    height: '100%',
    backgroundColor: SEMANTIC.info.base,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: SPACING[3],
  },
  summarySectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  summaryText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[1],
    lineHeight: 16,
  },
  summaryHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  summaryBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SEMANTIC.info.base,
  },
  summaryHighlightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  insightsCtaRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[3],
  },
  insightsCtaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
  },
  insightsCtaButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.3)',
  },
  insightsCtaText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  insightsCtaTextSecondary: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  modalEmptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    paddingVertical: SPACING[4],
  },
  proteinList: {
    gap: SPACING[2],
  },
  proteinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  proteinName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    marginRight: SPACING[3],
  },
  proteinValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.info.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  proteinHistoryButton: {
    marginTop: SPACING[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.3)',
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
  },
  proteinHistoryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Streak Saved Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[6],
  },
  streakSavedCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...PREMIUM_SHADOWS.lg,
  },
  streakSavedGradient: {
    padding: SPACING[6],
    alignItems: 'center',
  },
  freezeIconContainer: {
    marginBottom: SPACING[4],
    backgroundColor: '#FFFFFF', // Required for shadow efficiency
    borderRadius: RADIUS.full,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  streakSavedTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  streakSavedDesc: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[5],
    lineHeight: 22,
  },
  freezeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: '#DBEAFE',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    marginBottom: SPACING[5],
  },
  freezeCountText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#2563EB',
  },
  savedButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  savedButtonGradient: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  savedButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.md,
  },
});
