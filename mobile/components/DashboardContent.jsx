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

// Hooks
import { useDashboard } from "../hooks/useDashboard";
import { useMoodTrends } from "../hooks/useMoodTrends";
import { useMoodInsights } from "../hooks/useMoodInsights";
import { useCalendarData } from "../hooks/useCalendarData";
import { useWaterLog } from "../hooks/useWaterLog";
import { useFoodLog } from "../hooks/useFoodLog";
import { useActivityLog } from "../hooks/useActivityLog";
import { useRecommendations } from "../hooks/useRecommendations";
import { useOrchestrator, useCorrelationFeedback } from "../hooks/useOrchestrator";
import { useNotification } from "../providers/NotificationProvider";
import { useProfileContext } from "../providers/ProfileProvider";
import { useTheme } from "../providers/ThemeProvider";

// Premium components
import ThemeTransition from "./ThemeTransition";
import ThemeSettingsModal from "./ThemeSettingsModal";
import EmptyState from "./EmptyState";
import MoodInsightCard from "./MoodTracker/MoodInsightCard";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import FloatingActionButton from "./FloatingActionButton";
import StreakSavedModal from "./dashboard/StreakSavedModal";
import StreakRestoreModal from "./dashboard/StreakRestoreModal";
import DashboardHeaderSection from "./dashboard/DashboardHeaderSection";
import MinimalDashboardHeader from "./dashboard/MinimalDashboardHeader";
import DashboardInsightsSection from "./dashboard/DashboardInsightsSection";
// DashboardPrimaryCard removed - redundant with FoodMoodScoreCard hero + CompactDashboardTiles
import RecommendationDetailModal from "./dashboard/RecommendationDetailModal";
// DashboardNutritionSection removed - replaced with comprehensive NutritionDetailsSection
import DashboardWellnessSection from "./dashboard/DashboardWellnessSection";
import DashboardProgressSection from "./dashboard/DashboardProgressSection";
// RemainingBudgetCard removed - redundant with InsightNudge system

// NEW KILLER FEATURES - Differentiators
import FoodMoodScoreCard from "./dashboard/FoodMoodScoreCard";
import SmartMealSuggestionCard from "./dashboard/SmartMealSuggestionCard";
import PremiumCalendarStrip from "./dashboard/PremiumCalendarStrip";
// MorningPredictionCard moved to Insights screen - less dashboard clutter

// Phase 3: Dashboard Enhancements - Preference-based insights
// Note: DietaryComplianceCard and CuisineDiversityCard moved to Profile > MyInsightsSection
import AllergenWarningCard from "./dashboard/AllergenWarningCard";
import PremiumAchievementsCard from "./dashboard/PremiumAchievementsCard";

// Premium dashboard enhancements - compact tiles
import CompactDashboardTiles from "./dashboard/CompactDashboardTiles";

// NEW: Comprehensive nutrition details component with integrated progress rings and macro breakdown
import NutritionDetailsSection from "./dashboard/NutritionDetailsSection";

// Behavioral Health Intelligence System - Phase 6
import DailyIntelligenceBehaviorSection from "./dashboard/DailyIntelligenceBehaviorSection";
import { LifecycleStageFooter } from "./dashboard/LifecycleStageFooter";
import { DismissReasonSelector } from "./dashboard/DismissReasonSelector";
import { DailyIntelligenceErrorBoundary } from "./dashboard/DailyIntelligenceErrorBoundary";

// Notification Center - Centralized notification hub
import NotificationCenter from "./notifications/NotificationCenter";

// Design tokens - using unified premium theme
import { detectDataState } from "../constants/designTokens";
import { TYPOGRAPHY, SPACING, RADIUS, BRAND, SURFACES, TEXT, SEMANTIC, SEMANTIC_ACTIONS, SHADOWS as PREMIUM_SHADOWS } from "../constants/premiumTheme";
import { BOLD_GRADIENTS, WELLNESS_COLORS, DEPTH_SHADOWS } from "../constants/modernColorPalette";

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
import { foodMessages, generalMessages, goalMessages, insightMessages } from "../utils/wittyMessages";

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


export default function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { logs: localFoodLogs } = useFoodLog(); // Get local SQLite logs
  const { profile: contextProfile } = useProfileContext(); // Get profile from context (eliminates duplicate /profile/me fetch)
  const [refreshing, setRefreshing] = useState(false);

  // Yesterday fallback: When today is empty, show yesterday's data to avoid zeros
  const showYesterdayFallback = data?.showYesterdayFallback && data?.yesterday;
  const displayData = useMemo(() => {
    if (!data) return null;
    // If showing yesterday's data, use it instead of empty today
    if (showYesterdayFallback) {
      return {
        ...data.yesterday,
        // Keep today's date for display purposes but mark it as fallback
        isYesterdayFallback: true,
        fallbackDate: data.yesterday.date,
      };
    }
    return {
      ...data.today,
      isYesterdayFallback: false,
    };
  }, [data, showYesterdayFallback]);
  const [streakSavedVisible, setStreakSavedVisible] = useState(false);
  const [streakRestoreVisible, setStreakRestoreVisible] = useState(false);
  const [streakRestoreChecked, setStreakRestoreChecked] = useState(false);
  const notify = useNotification();
  const router = useRouter();
  const { user } = useUser();
  const { theme, colors } = useTheme();
  const queryClient = useQueryClient();

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

  // Collapsible section states
  const [nutritionExpanded, setNutritionExpanded] = useState(true);
  const [wellnessExpanded, setWellnessExpanded] = useState(true);
  const [progressExpanded, setProgressExpanded] = useState(false);

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

  // Behavioral Health Intelligence System - Phase 6
  const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);

  // Notification Center state
  const [notificationCenterVisible, setNotificationCenterVisible] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  // Recommendations hook (handles caching internally with 5-min cache)
  // AI-powered recommendations from backend
  const {
    recommendations,
    loading: recommendationsLoading,
    error: recommendationsError,
    fetchRecommendations,
    acceptRecommendation: acceptRecommendationAction,
    trackInteraction,
  } = useRecommendations({ enabled: true });

  // Mood tracking hooks
  const { data: trendData } = useMoodTrends({ period: 'week' });
  const { data: moodInsightsData, isLoading: moodInsightsLoading } = useMoodInsights({ windowDays: 30, trendDays: 7 });

  // Water tracking hook
  const { markHydrationCelebration } = useWaterLog();

  // Activity tracking hook - for wellness score calculation
  const { todayData: activityTodayData } = useActivityLog();

  // Calendar data with complete historical water/mood/activity data
  // Request 90 days to support 30D/60D/90D views in calendar modal
  const { calendarData: fullCalendarData } = useCalendarData({ days: 90 });

  // Behavioral Health Intelligence - single fetch point
  const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();
  const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();

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

  // Behavioral Health Intelligence - Handlers
  const handleDismissRequest = useCallback((correlationId) => {
    setDismissingCorrelationId(correlationId);
  }, []);

  const handleCorrelationDismiss = useCallback((reasonId) => {
    if (!dismissingCorrelationId) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Send feedback (reasonId maps to: 'not_relevant' | 'temporary' | 'fixed' | 'never_show')
    // Hook's onSuccess will invalidate orchestrator cache automatically
    sendCorrelationFeedback(
      { correlationId: dismissingCorrelationId, reason: reasonId },
      {
        // Additional handlers for user feedback
        onSuccess: () => {
          setDismissingCorrelationId(null);
          notify?.success(insightMessages.patternDismissed());
        },
        onError: (error) => {
          console.error('[Dashboard] Feedback error:', error);
          // Keep modal open on error so user can retry
          notify?.error(generalMessages.error());
        },
      }
    );
  }, [dismissingCorrelationId, sendCorrelationFeedback, notify]);

  const handleCorrelationCancel = useCallback(() => {
    setDismissingCorrelationId(null);
  }, []);

  const handleIntelligenceAction = useCallback((action) => {
    if (action?.type === 'navigate') {
      router.push(action.path);
    } else if (action?.callback) {
      action.callback();
    }
  }, [router]);

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
        notify?.success(result.message || foodMessages.logged());
        setRecommendationModalVisible(false);
        setSelectedRecommendation(null);

        // Refresh dashboard to show updated nutrition
        await refetch();
      } else {
        notify?.error(result.error || generalMessages.error());
      }
    } catch (error) {
      console.error('[Dashboard] Failed to accept recommendation:', error);
      notify?.error(error?.response?.data?.error || generalMessages.error());
    } finally {
      setAcceptingRecommendation(false);
    }
  }, [acceptRecommendationAction, refetch, notify]);

  // Reject recommendation (delegates to hook)
  const handleRejectRecommendation = useCallback(async (recommendation, reason) => {
    try {
      await trackInteraction(recommendation.id, 'reject', { reason });

      notify?.info(generalMessages.feedbackThanks());
      setRecommendationModalVisible(false);
      setSelectedRecommendation(null);
    } catch (error) {
      console.error('[Dashboard] Failed to reject recommendation:', error);
      // Fail silently - rejection tracking is not critical
    }
  }, [notify]);

  // Update nutrition goals (inline edit from RemainingBudgetCard)
  // eslint-disable-next-line no-unused-vars
  const handleGoalsUpdate = useCallback(async (goalUpdates) => {
    try {
      const response = await apiClient.post('/api/nutrition/goals', goalUpdates);
      if (response?.data?.success) {
        notify?.success(goalMessages.updated());
        // Refresh dashboard data
        await refetch();
      } else {
        notify?.error(generalMessages.error());
      }
    } catch (error) {
      console.error('[Dashboard] Failed to update goals:', error);
      notify?.error(error?.response?.data?.error || generalMessages.error());
    }
  }, [refetch, notify]);

  // ============================================================================
  // GAMIFICATION LOGIC
  // ============================================================================

  // Track previous streak to detect increments
  // Use gamification.streak (authoritative DB value) - fallback to trends.currentStreak
  const currentStreak = data?.gamification?.streak ?? data?.trends?.currentStreak ?? 0;
  const prevStreakRef = useRef(currentStreak);

  const checkStreakReward = useCallback(async (streakValue) => {
    try {
      const result = await apiClient.post('/gamification/check-streak', { currentStreak: streakValue });
      if (result.awarded && result.message) {
        notify?.success(result.message);
        refetch(); // Refresh to show new freeze count
      }
    } catch (error) {
      console.error("Failed to check streak reward:", error);
      // Fail silently for rewards - don't disrupt user experience
    }
  }, [notify, refetch]);

  useEffect(() => {
    if (currentStreak && prevStreakRef.current !== undefined) {
      if (currentStreak > prevStreakRef.current) {
        checkStreakReward(currentStreak);
      }
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak, checkStreakReward]);

  // Check if a freeze was consumed (Logic: if streak preserved but logged date gap > 1 day)
  // For now, we can trigger this manually or based on a backend flag in 'data'
  useEffect(() => {
    if (data?.gamification?.freezeConsumed) {
      setStreakSavedVisible(true);
    }
  }, [data?.gamification?.freezeConsumed]);

  // Check if streak can be restored (user lost streak but has freezes and within 24h)
  useEffect(() => {
    // Only check once per session to avoid re-showing on every data refresh
    if (streakRestoreChecked) return;

    const canRestore = data?.gamification?.canRestoreStreak;
    const previousStreak = data?.gamification?.previousStreak;

    if (canRestore && previousStreak > 0) {
      setStreakRestoreVisible(true);
      setStreakRestoreChecked(true);
    }
  }, [data?.gamification?.canRestoreStreak, data?.gamification?.previousStreak, streakRestoreChecked]);

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

      const totalProtein = parseMacro(data.today?.nutrition?.totalProtein);
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
        // CRITICAL FIX: Extract date string directly to avoid timezone issues
        // Backend sends "2026-01-16T00:00:00.000Z" which gets shifted when parsed as Date
        const key = typeof summary.date === 'string'
          ? summary.date.substring(0, 10)  // Extract "YYYY-MM-DD" from ISO string
          : formatDateLocal(new Date(summary.date));

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
        // CRITICAL FIX: Extract date string directly to avoid timezone issues
        const key = typeof log.loggedDate === 'string'
          ? log.loggedDate.substring(0, 10)
          : formatDateLocal(new Date(log.loggedDate));

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
  }, [data, trendData]);

  // Detect anomalies in data
  const dataAnomalies = useMemo(() => {
    if (!data?.today || !data?.goals) return [];

    const anomalies = [];

    // Check calories
    const totalCalories = parseCalories(data.today?.nutrition?.totalCalories);
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
        percentageLabel: `${isOver ? '+' : '-'}${Math.abs(percentageDiff)}%`,
        message: isOver
          ? `You're ${Math.abs(percentageDiff)}% above today's calorie goal. Review portions to rebalance.`
          : `You're ${Math.abs(percentageDiff)}% below today's calorie goal. Add a nourishing snack to stay on track.`,
        icon: isOver ? 'alert-circle-outline' : 'nutrition-outline',
        tone: isOver ? 'warning' : 'info',
        actionLabel: isOver ? 'Review Portions' : 'Add a Meal',
        action: () => router.push('/(tabs)/log'),
      });
    }

    // Check protein
    const totalProtein = parseMacro(data.today?.nutrition?.totalProtein);
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

    const currentCalories = parseCalories(data.today?.nutrition?.totalCalories);
    const currentWater = parseLiters(data.today?.waterIntakeLiters);
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
      currentProtein: parseMacro(data.today?.nutrition?.totalProtein),
      proteinGoal: parseGoal(data.goals?.proteinG, 150, 20, 500),
      currentHydration: currentWater,
      hydrationGoal: parseGoal(data.goals?.waterLiters, 2.0, 0.5, 10),
      streak: currentStreak,
      timeOfDay: new Date().getHours(),
    });
  }, [data, currentStreak]);

  // Convert smartInsights and dataAnomalies to notification center format
  const dashboardNotifications = useMemo(() => {
    const notifications = [];
    let idCounter = 0;

    // Check for streak risk first (urgent priority)
    const streakValue = currentStreak;
    const bestStreak = parseDecimal(data?.gamification?.bestStreak, 0);
    const hasLoggedToday = data?.userLifecycle?.hasLoggedToday ?? false;

    if (bestStreak > 0 && streakValue === 0 && !hasLoggedToday && !dismissedNotifications.has('streak-risk')) {
      notifications.push({
        id: 'streak-risk',
        type: 'streak_risk',
        title: 'Streak at risk!',
        message: `Log something before midnight to keep your ${bestStreak}-day streak`,
        actionLabel: 'Log Now',
      });
    }

    // Convert smart insights
    smartInsights.forEach((insight) => {
      const notificationId = `insight-${idCounter++}`;
      if (dismissedNotifications.has(notificationId)) return;

      let type = 'insight';
      if (insight.title?.toLowerCase().includes('protein') || insight.message?.toLowerCase().includes('protein')) {
        type = 'low_protein';
      } else if (insight.title?.toLowerCase().includes('calorie') || insight.message?.toLowerCase().includes('calorie')) {
        type = 'low_calories';
      } else if (insight.title?.toLowerCase().includes('hydrat') || insight.message?.toLowerCase().includes('water')) {
        type = 'hydration';
      } else if (insight.type === 'welcome') {
        type = 'meal_reminder';
      }

      notifications.push({
        id: notificationId,
        type,
        title: insight.title || insight.message?.split('.')[0],
        message: insight.message,
        actionLabel: insight.action,
        insightData: insight,
      });
    });

    // Convert data anomalies
    dataAnomalies.forEach((anomaly) => {
      const notificationId = `anomaly-${idCounter++}`;
      if (dismissedNotifications.has(notificationId)) return;

      let type = 'insight';
      if (anomaly.metric === 'Protein') {
        type = 'low_protein';
      } else if (anomaly.metric === 'Calories') {
        type = anomaly.tone === 'warning' ? 'low_calories' : 'insight';
      }

      notifications.push({
        id: notificationId,
        type,
        title: `${anomaly.metric} Check`,
        message: anomaly.message,
        actionLabel: anomaly.actionLabel,
        anomalyData: anomaly,
      });
    });

    return notifications;
  }, [smartInsights, dataAnomalies, dismissedNotifications, data, currentStreak]);

  // Notification count for badge
  const notificationCount = dashboardNotifications.length;

  // Assess macro balance quality
  const macroAssessment = useMemo(() => {
    if (!data?.today?.nutrition) return null;

    return assessMacroBalance({
      protein: parseMacro(data.today?.nutrition?.totalProtein),
      carbs: parseMacro(data.today?.nutrition?.totalCarbs),
      fat: parseMacro(data.today?.nutrition?.totalFats),
    });
  }, [data]);

  // Calculate personalized wellness score for EnhancedMoodCard
  const wellnessScore = useMemo(() => {
    if (!data?.today || !data?.goals) return null;

    const rawScore = calculatePersonalizedWellnessScore({
      today: data.today,
      goals: data.goals,
      historicalData: data.trends?.weekSummaries || [],
      streak: currentStreak,
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
      notify?.error(insightMessages.noInsights());
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
      notify?.error(insightMessages.shareError());
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
        notify?.info(insightMessages.actionTip(insight.action));
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

  // CRITICAL FIX: useMemo MUST be called before any early returns (React hooks rules)
  // Override cold start messaging when user actually has data
  const correctedOrchestratorData = useMemo(() => {
    if (!orchestratorData || !data) return null;

    const userLifecycle = data?.userLifecycle;
    const isNewUser = userLifecycle?.stage === 'brand_new';
    const hasAnyData = !isNewUser;
    const hasLoggedToday = userLifecycle?.hasLoggedToday ?? false;

    const decision = orchestratorData?.decision || orchestratorData?.message;
    const isColdStartMock = decision?.headline === 'Building your health baseline';

    // If user has actual data, override the cold start message
    if (isColdStartMock && hasAnyData && userLifecycle) {
      const totalDays = userLifecycle.totalDaysWithLogs || 0;
      const totalMeals = userLifecycle.totalMealsLogged || 0;

      // Determine appropriate headline based on actual stage
      let newHeadline = decision.headline;
      let newSubtitle = decision.subtitle;
      let newType = decision.type;

      if (totalDays >= 30) {
        newHeadline = 'Welcome back, pattern pro';
        newSubtitle = 'Your health journey continues';
        newType = 'SILENT';
      } else if (totalDays >= 7) {
        newHeadline = 'Building strong habits';
        newSubtitle = `${totalDays} days tracked. Insights are forming.`;
        newType = 'REINFORCE';
      } else if (totalMeals >= 3 || totalDays >= 2) {
        newHeadline = 'Great start!';
        newSubtitle = hasLoggedToday
          ? 'Keep the momentum going today'
          : 'Continue where you left off';
        newType = 'REINFORCE';
      } else if (totalMeals >= 1) {
        newHeadline = 'You\'re on your way';
        newSubtitle = 'A few more logs unlock your patterns';
        newType = 'REINFORCE';
      }

      return {
        ...orchestratorData,
        decision: {
          ...decision,
          type: newType,
          headline: newHeadline,
          subtitle: newSubtitle,
        },
        lifecycle: {
          ...orchestratorData.lifecycle,
          stage: userLifecycle.stage?.toUpperCase() || orchestratorData.lifecycle?.stage,
        },
      };
    }

    return orchestratorData;
  }, [orchestratorData, data]);

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

  const { goals, gamification, trends, recentWeight, userLifecycle } = data;
  // Use displayData (yesterday's data) when today is empty, otherwise use today's data
  const today = showYesterdayFallback && data.yesterday ? data.yesterday : data.today;

  // ============================================================================
  // USER LIFECYCLE DETECTION - Single source of truth from backend
  // Properly distinguishes: brand new user vs returning user who missed a day
  // Multi-billion dollar app approach: lifecycle = LIFETIME engagement, not TODAY
  // ============================================================================
  const isNewUser = userLifecycle?.stage === 'brand_new' && !showYesterdayFallback;
  const isOnboarding = ['brand_new', 'onboarding'].includes(userLifecycle?.stage);
  const isReturning = userLifecycle?.isReturning ?? false;
  const hasLoggedToday = userLifecycle?.hasLoggedToday ?? false;
  const daysSinceLastLog = userLifecycle?.daysSinceLastLog;

  // Legacy compatibility flags (for components still using old names)
  const hasAnyData = !isNewUser;
  const hasTodayData = hasLoggedToday;

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

  return (
    <>
      <LinearGradient
        colors={BOLD_GRADIENTS.dashboard}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <ThemeTransition>
          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* MINIMAL DASHBOARD HEADER - Headspace/Calm pattern */}
        {/* Invitation, not status report - no stats in greeting */}
        {/* Single tappable nudge with smart routing */}
        <MinimalDashboardHeader
          userName={user?.firstName || user?.fullName}
          mealsLogged={parseDecimal(today?.mealCount, 0)}
          waterProgress={Math.round(
            (parseLiters(today?.waterIntakeLiters) / parseGoal(goals?.waterLiters, 2.0, 0.5, 10)) * 100
          )}
          moodLogged={parseDecimal(today?.moodCount, 0) > 0}
          streak={currentStreak}
          bestStreak={parseDecimal(gamification?.bestStreak, 0)}
          notificationCount={notificationCount}
          // NEW: Personalization props for smarter nudges
          level={gamification?.level ?? 1}
          lifecycleStage={userLifecycle?.stage}
          isReturning={isReturning}
          hoursSinceLastMeal={userLifecycle?.hoursSinceLastMeal}
          xpToNextLevel={gamification?.nextLevelXp ? (gamification.nextLevelXp - (gamification?.currentLevelXp ?? 0)) : null}
          // Callbacks
          onMealsPress={() => router.push('/(tabs)/log')}
          onWaterPress={() => router.push('/(tabs)/log?focus=hydration')}
          onMoodPress={() => router.push('/(tabs)/log?focus=mood')}
          onNotificationsPress={() => setNotificationCenterVisible(true)}
          onSettingsPress={() => router.push('/(tabs)/profile')}
        />

        {/* YESTERDAY'S DATA BANNER - Shows when today is empty */}
        {showYesterdayFallback && (
          <TouchableOpacity
            style={styles.yesterdayBanner}
            onPress={() => router.push('/(tabs)/log')}
            activeOpacity={0.8}
          >
            <View style={styles.yesterdayBannerContent}>
              <View style={styles.yesterdayBannerIcon}>
                <Ionicons name="time-outline" size={20} color={BRAND.primary} />
              </View>
              <View style={styles.yesterdayBannerText}>
                <Text style={styles.yesterdayBannerTitle}>Showing yesterday's snapshot</Text>
                <Text style={styles.yesterdayBannerSubtitle}>Tap to start logging today</Text>
              </View>
              <Ionicons name="add-circle" size={28} color={BRAND.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* FIRST-TIME USER ONLY - Brand new users see clean onboarding */}
        {/* Returning users who missed a day see full dashboard, not this */}
        {isNewUser && !showYesterdayFallback && (
          <EmptyState
            icon="scan-outline"
            title="3 meals unlocks your baseline"
            description="Log what you eat. We'll find your patterns—protein timing, energy dips, what actually works for you."
            actionLabel="Log breakfast →"
            onAction={() => {
              router.push('/(tabs)/log');
            }}
          />
        )}

        {/* INLINE INSIGHTS REMOVED - Moved to Notification Center */}
        {/* All smart insights and anomaly nudges now appear in the notification bell icon */}
        {/* This keeps the dashboard clean and focused on data visualization */}

        {/* Premium Calendar Strip - Only show when user has data */}
        {/* Uses fullCalendarData which includes complete water/mood/activity history */}
        {hasAnyData && (
          <PremiumCalendarStrip
            data={fullCalendarData || calendarData}
            selectedDate={null}
            currentStreak={currentStreak}
            onDateSelect={(dateOrObj) => {
              // Handle both Date object and { dateKey } from day detail modal
              const dateKey = dateOrObj?.dateKey || (dateOrObj instanceof Date ? dateOrObj.toISOString().split('T')[0] : null);
              if (dateKey) {
                router.push({ pathname: '/history', params: { date: dateKey } });
              }
            }}
          />
        )}

        {/* ============================================ */}
        {/* HERO CARD - ONE unified wellness + mood display */}
        {/* Only show after first log - Day 0 sees clean EmptyState only */}
        {/* ============================================ */}
        {hasAnyData && (
          <FoodMoodScoreCard
            today={today}
            goals={goals}
            moodLogs={today?.moodLogs || []}
            activityData={{
              minutes: activityTodayData?.totalMinutes || 0,
              intensity: activityTodayData?.primaryIntensity || 'moderate',
              types: activityTodayData?.activityTypes || [],
            }}
            userName={user?.firstName || user?.fullName || ''}
            historicalScores={[]}
            onViewDetails={() => router.push('/insights')}
          />
        )}

        {/* ============================================ */}
        {/* NUTRITION DETAILS - Comprehensive nutrition breakdown */}
        {/* Shows: Progress rings, macro bars, quick stats */}
        {/* Expandable card with all nutrition data integrated */}
        {/* Smart empty state for returning users when no data today */}
        {/* ============================================ */}
        <NutritionDetailsSection
          today={today}
          goals={goals}
          streak={currentStreak}
          userHistory={{
            totalDays: parseDecimal(gamification?.totalLoggingDays, 0),
            yesterdayCalories: data?.trends?.yesterdayCalories || 0,
            yesterdayMeals: data?.trends?.yesterdayMeals || 0,
            avgCalories: data?.trends?.avgCalories || 0,
          }}
          onViewFoodHistory={() => router.push('/insights/food-analytics')}
        />

        {/* ============================================ */}
        {/* ANALYTICS - Link to unified analytics screen */}
        {/* ============================================ */}
        {hasAnyData && (
          <TouchableOpacity
            style={styles.analyticsLinkCard}
            onPress={() => router.push('/analytics')}
            activeOpacity={0.7}
          >
            <View style={styles.analyticsLinkContent}>
              <View style={[styles.analyticsIconContainer, { backgroundColor: '#6B4EFF15' }]}>
                <Ionicons name="stats-chart" size={24} color="#6B4EFF" />
              </View>
              <View style={styles.analyticsLinkText}>
                <Text style={styles.analyticsLinkTitle}>View Analytics</Text>
                <Text style={styles.analyticsLinkSubtitle}>Nutrition, Mood, Activity & Hydration</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A7F78" />
          </TouchableOpacity>
        )}

        {/* ============================================ */}
        {/* BEHAVIORAL HEALTH INTELLIGENCE - Daily insights */}
        {/* Shows decision cards, pattern insights, lifecycle stage */}
        {/* ============================================ */}
        {hasAnyData && !isOnboarding && (
          <DailyIntelligenceErrorBoundary>
            {orchestratorLoading ? (
              // Show placeholder while loading
              <View style={[styles.card, { paddingVertical: 16 }]}>
                <View style={{ paddingHorizontal: 16 }}>
                  <View style={{ height: 16, backgroundColor: '#E5E1DB', borderRadius: 4, marginBottom: 12 }} />
                  <View style={{ height: 12, backgroundColor: '#F0ECEA', borderRadius: 4, width: '70%' }} />
                </View>
              </View>
            ) : correctedOrchestratorData ? (
              <DailyIntelligenceBehaviorSection
                orchestratorData={correctedOrchestratorData}
                gamification={data?.gamification}
                goals={data?.goals}
                todayData={displayData}
                weeklyComplianceDays={data?.trends?.weekSummaries?.filter(d => d.totalCalories > 0)?.length || 0}
                uniqueFoodsThisWeek={uniqueFoodLogs?.length || 0}
                onRequestDismiss={handleDismissRequest}
                onAction={handleIntelligenceAction}
                onViewProgress={() => router.push('/insights')}
              />
            ) : null}
          </DailyIntelligenceErrorBoundary>
        )}

        {/* ============================================ */}
        {/* ACHIEVEMENTS & ENGAGEMENT - Gamification Card */}
        {/* CRITICAL FIX: Show for ANY user with data, not just today's loggers! */}
        {/* Power users need to see their level/streak even before logging today */}
        {/* ============================================ */}
        {hasAnyData && !isOnboarding && (
          <PremiumAchievementsCard
            level={parseDecimal(gamification?.level, 1)}
            xp={parseDecimal(gamification?.xp, 0)}
            streak={currentStreak}
            nextLevelXp={parseDecimal(gamification?.nextLevelXp, 0)}
            streakFreezes={parseDecimal(gamification?.streakFreezes, 0)}
            isReturningUser={isReturning || hasAnyData}
          />
        )}


        {/* ============================================ */}
        {/* PHASE 3: URGENT ALERTS ONLY */}
        {/* Note: DietaryComplianceCard & CuisineDiversityCard moved to Profile > MyInsightsSection */}
        {/* ============================================ */}

        {/* Allergen Warning Card - Urgent alerts stay on Dashboard */}
        {allergenWarnings.length > 0 && (
          <AllergenWarningCard warnings={allergenWarnings} />
        )}

        {/* RemainingBudgetCard & DashboardPrimaryCard removed - redundant with hero + compact tiles */}

        {/* ============================================ */}
        {/* KILLER FEATURES - Premium Differentiators */}
        {/* ALWAYS VISIBLE - Show empty state when no data */}
        {/* ============================================ */}

        {/* NOTE: Wellness Score is now integrated into EnhancedMoodCard in Wellness Section */}

        {/* Smart Meal Suggestion - Context-Aware with AI Recommendations */}
        {uniqueFoodLogs.length > 0 && (
          <SmartMealSuggestionCard
            today={today}
            goals={goals}
            recentMeals={uniqueFoodLogs}
            userProfile={userProfile}
            // AI-powered backend recommendations
            backendRecommendations={recommendations}
            recommendationsLoading={recommendationsLoading}
            onAcceptRecommendation={acceptRecommendationAction}
            onTrackInteraction={trackInteraction}
            // Personalization props for smarter suggestions
            lifecycleStage={userLifecycle?.stage}
            level={gamification?.level ?? 1}
            // Future hooks for pattern-based features (pass null until implemented)
            correlationInsights={correctedOrchestratorData?.correlations ?? null}
            micronutrientDeficits={today?.nutrition?.micros ? {
              low: Object.entries(today.nutrition.micros)
                .filter(([_, val]) => val < 50) // Simplified deficit detection
                .map(([key]) => key)
            } : null}
            moodContext={today?.moodLogs?.[0] ? {
              currentMood: today.moodLogs[0].mood,
              energyLevel: today.moodLogs[0].energyLevel
            } : null}
            onSelectSuggestion={(suggestion) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: '/(tabs)/log',
                params: {
                  focus: 'meal',
                  prefill: suggestion.name || suggestion.foodName
                }
              });
            }}
            onViewMore={() => router.push('/history')}
          />
        )}

        {/* NOTE: PredictiveInsightsCard and PatternDetectiveCard moved to Insights screen */}
        {/* Staff Design: Dashboard = quick glance. Details = separate screen */}

        {/* NOTE: SmartRecommendationsCard removed - consolidated into SmartMealSuggestionCard */}


        {/* ============================================ */}
        {/* OLD NUTRITION SECTION - REMOVED */}
        {/* Now integrated into comprehensive NutritionDetailsSection above */}
        {/* ============================================ */}

        {/* ============================================ */}
        {/* WELLNESS SECTION - Collapsible */}
        {/* ============================================ */}
        <DashboardWellnessSection
          styles={styles}
          expanded={wellnessExpanded}
          onToggle={() => setWellnessExpanded(!wellnessExpanded)}
          today={today}
          goals={goals}
          gamification={gamification}
          streak={currentStreak}
          hydrationEvents={hydrationEvents}
          hydrationLastLoggedAt={hydrationLastLoggedAt}
          hydrationCelebratedKey={hydrationCelebratedKey}
          onCelebrateHydration={handleHydrationCelebration}
          onOpenMoodInsights={() => router.push('/insights/mood')}
          onViewMoodHistory={() => router.push('/insights/mood-history')}
          onOpenHydrationTracker={() => router.push('/(tabs)/log?focus=hydration')}
          onViewHydrationHistory={() => router.push('/insights/hydration-history')}
          moodInsights={moodInsightsData}
          moodInsightsLoading={moodInsightsLoading}
          wellnessScore={wellnessScore}
        />

        {/* ============================================ */}
        {/* PROGRESS SECTION - Collapsible (Calendar moved to top) */}
        {/* ============================================ */}
        <DashboardProgressSection
          styles={styles}
          expanded={progressExpanded}
          onToggle={() => setProgressExpanded(!progressExpanded)}
          trends={trends}
          goals={goals}
          recentWeight={recentWeight}
        />

        {/* ============================================ */}
        {/* LIFECYCLE STAGE FOOTER - User progression */}
        {/* Shows current stage and progress to next milestone */}
        {/* ============================================ */}
        {hasAnyData && !isOnboarding && !orchestratorLoading && correctedOrchestratorData && (
          <LifecycleStageFooter
            orchestratorData={correctedOrchestratorData}
          />
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

      {/* Behavioral Health Intelligence - Dismiss Reason Modal */}
      <DismissReasonSelector
        visible={dismissingCorrelationId !== null}
        headline="Pattern Feedback"
        onDismiss={handleCorrelationDismiss}
        onCancel={handleCorrelationCancel}
      />

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

      <StreakRestoreModal
        visible={streakRestoreVisible}
        onClose={() => setStreakRestoreVisible(false)}
        onRestored={(result) => {
          // Refresh dashboard data to show restored streak
          refetch();
          // Show celebration notification
          notify({
            title: 'Streak Restored!',
            message: result.message,
            type: 'success',
          });
        }}
        previousStreak={gamification?.previousStreak || 0}
        freezesAvailable={gamification?.streakFreezes || 0}
        styles={styles}
      />

      <ThemeSettingsModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      {/* Floating Action Button - Quick Actions */}
      <FloatingActionButton
        currentWater={parseLiters(today?.waterIntakeLiters || 0)}
        waterGoal={parseGoal(goals?.waterLiters, 2.0, 0.5, 10)}
        onWaterLogged={() => refetch()}
        onMoodLogged={handleMoodLogged}
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
          notify?.info(insightMessages.savedForLater());
          setRecommendationModalVisible(false);
        }}
      />

      {/* Notification Center Modal */}
      <NotificationCenter
        visible={notificationCenterVisible}
        onClose={() => setNotificationCenterVisible(false)}
        notifications={dashboardNotifications}
        onNotificationAction={(notification) => {
          setNotificationCenterVisible(false);

          // Route based on notification type for direct navigation
          switch (notification.type) {
            case 'streak_risk':
            case 'meal_reminder':
              router.push('/(tabs)/log');
              break;
            case 'low_protein':
              // Go to log or show protein foods
              if (notification.actionLabel === 'View High-Protein Foods') {
                setProteinModalVisible(true);
              } else {
                router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
              }
              break;
            case 'low_calories':
              router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
              break;
            case 'hydration':
              router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
              break;
            case 'achievement':
              router.push('/(tabs)/profile');
              break;
            default:
              // Fallback to insight/anomaly handlers
              if (notification.insightData) {
                handleInsightAction(notification.insightData);
              } else if (notification.anomalyData?.action) {
                notification.anomalyData.action();
              } else {
                router.push('/(tabs)/log');
              }
          }
        }}
        onNotificationDismiss={(notificationId) => {
          setDismissedNotifications(prev => new Set([...prev, notificationId]));
        }}
        onClearAll={() => {
          const allIds = dashboardNotifications.map(n => n.id);
          setDismissedNotifications(new Set(allIds));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background handled by LinearGradient wrapper
  },
  // Yesterday's data fallback banner
  yesterdayBanner: {
    marginBottom: SPACING[4],
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: BRAND.primaryLight,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  yesterdayBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  yesterdayBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  yesterdayBannerText: {
    flex: 1,
  },
  yesterdayBannerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  yesterdayBannerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
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
    paddingBottom: SPACING[16],
  },
  // Analytics Section - Explore buttons
  analyticsLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginTop: SPACING[3],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    shadowColor: '#3D3633',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  analyticsLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  analyticsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsLinkText: {
    marginLeft: SPACING[3],
    flex: 1,
  },
  analyticsLinkTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  analyticsLinkSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[0.5],
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
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`, // Vibrant emerald
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
  },
  focusModeButtonActive: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}26`, // Vibrant emerald when active
    borderColor: `${SEMANTIC_ACTIONS.success}4D`,
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
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`, // Vibrant emerald tint
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
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

  // Anomaly card (clear warning tone for attention)
  infoCard: {
    marginBottom: SPACING[4],
    backgroundColor: SEMANTIC.warning.bg,
    borderColor: SEMANTIC.warning.light,
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(216, 155, 54, 0.15)',
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
    color: SEMANTIC.warning.dark,
  },
  percentageBadge: {
    backgroundColor: SEMANTIC.warning.base,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
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
    marginTop: SPACING[3],
    alignSelf: 'flex-start',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: SEMANTIC.warning.base,
  },
  anomalyActionButtonWarning: {
    backgroundColor: SEMANTIC.warning.base,
    borderColor: SEMANTIC.warning.base,
  },
  anomalyActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.warning.base,
  },
  anomalyActionTextWarning: {
    color: '#FFFFFF',
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

  // Wellness Vertical Stack - Tightened for compact display
  wellnessStack: {
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  wellnessDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Collapsible Section - Reduced spacing for cleaner look
  collapsibleSection: {
    marginBottom: SPACING[2],
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    ...PREMIUM_SHADOWS.sm,
    marginBottom: SPACING[1],
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
    gap: SPACING[2],
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
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
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
    backgroundColor: `${SEMANTIC_ACTIONS.success}33`,
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
    borderColor: SURFACES.divider,
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
    borderColor: SURFACES.divider,
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
    backgroundColor: SURFACES.divider,
    overflow: 'hidden',
  },
  coverageFill: {
    height: '100%',
    backgroundColor: SEMANTIC.info.base,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: SURFACES.divider,
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
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}4D`,
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
    borderColor: SURFACES.divider,
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
    borderColor: `${SEMANTIC_ACTIONS.success}4D`,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
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
