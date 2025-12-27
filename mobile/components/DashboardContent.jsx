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
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import * as Haptics from 'expo-haptics';

// Hooks
import { useDashboard } from "../hooks/useDashboard";
import { useMoodTrends, calculateMoodStats } from "../hooks/useMoodTrends";
import { useWaterLog } from "../hooks/useWaterLog";
import { useFoodLog } from "../hooks/useFoodLog";
import { useNotification } from "../providers/NotificationProvider";
import { useTheme } from "../providers/ThemeProvider";

// Premium components
import ThemeTransition from "./ThemeTransition";
import ThemeSettingsModal from "./ThemeSettingsModal";
import GlassCard from "./dashboard/GlassCard";
import PremiumRing from "./dashboard/PremiumRing";
import NutriScoreDial from "./dashboard/NutriScoreDial";
import EnhancedMoodCard from "./dashboard/EnhancedMoodCard";
import MealMoodCalendar from "./MealMoodCalendar";
import HydrationWellnessDashboard from "./dashboard/HydrationWellnessDashboard";
import EmptyState from "./EmptyState";
import MoodInsightCard from "./MoodTracker/MoodInsightCard";
import NutritionOverviewCard from "./dashboard/NutritionOverviewCard";
import MicronutrientsGrid from "./dashboard/MicronutrientsGrid";
import PremiumAchievementsCard from "./dashboard/PremiumAchievementsCard";
import PremiumWeeklyTrends from "./dashboard/PremiumWeeklyTrends";
import InsightsCard from "./dashboard/InsightsCard";
import MacroBalanceCard from "./dashboard/MacroBalanceCard";
import SkeletonCard, { SkeletonText, SkeletonCircle } from "./dashboard/SkeletonCard";

// Design tokens - using unified premium theme
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, detectDataState } from "../constants/designTokens";
import { BRAND, SURFACES, TEXT, SEMANTIC, ICON_SIZES, ICONS, SHADOWS as PREMIUM_SHADOWS } from "../constants/premiumTheme";
import { LUXURY_BACKGROUNDS, LUXURY_TEXT } from "../constants/luxuryTheme";

// Utility functions
import { calculateFoodMoodScore, generateStoryLine, generateInsights, assessMacroBalance } from "../utils/healthCalculations";
import { parseDecimal, parseLiters, parseGoal, parseCalories, parseMacro, calculatePercentage } from "../utils/safeNumbers";
import { formatDateLocal, getTodayKey } from "../utils/dateHelpers";
import apiClient from "../services/apiClient";
import storage, { STORAGE_KEYS } from "../utils/storage";

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

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================
const CollapsibleSection = ({ title, icon, expanded, onToggle, children, badge }) => {
  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title} section`}
        accessibilityHint={`${expanded ? 'Collapse' : 'Expand'} to ${expanded ? 'hide' : 'show'} ${title} details`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.collapsibleLeft}>
          <LinearGradient
            colors={expanded ? SURFACES.gradient.primary : SURFACES.gradient.softPurple}
            style={styles.collapsibleIconContainer}
          >
            <Ionicons name={icon} size={20} color={expanded ? '#FFF' : BRAND.primary} />
          </LinearGradient>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {badge && (
            <View style={styles.collapsibleBadge}>
              <Text style={styles.collapsibleBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={TEXT.secondary}
        />
      </TouchableOpacity>

      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
};

// ============================================================================
// STREAK SAVED MODAL
// ============================================================================
const StreakSavedModal = ({ visible, onClose, freezesLeft }) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.streakSavedCard}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.streakSavedGradient}
          >
            <View style={styles.freezeIconContainer}>
              <Ionicons name="snow" size={48} color="#3B82F6" />
            </View>
            
            <Text style={styles.streakSavedTitle}>Streak Saved!</Text>
            <Text style={styles.streakSavedDesc}>
              You missed a day, but your Streak Freeze kicked in to save your progress.
            </Text>

            <View style={styles.freezeCountBadge}>
              <Ionicons name="snow" size={14} color="#2563EB" />
              <Text style={styles.freezeCountText}>
                {freezesLeft} {freezesLeft === 1 ? 'freeze' : 'freezes'} remaining
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.savedButton}>
              <LinearGradient
                colors={SURFACES.gradient.blue}
                style={styles.savedButtonGradient}
              >
                <Text style={styles.savedButtonText}>Keep Going</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

export default function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { logs: localFoodLogs } = useFoodLog(); // Get local SQLite logs
  const [refreshing, setRefreshing] = useState(false);
  const [streakSavedVisible, setStreakSavedVisible] = useState(false);
  const notify = useNotification();
  const router = useRouter();
  const { user } = useUser();
  const { theme, toggleTheme, colors } = useTheme();

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

  // Mood tracking hooks
  const { data: trendData } = useMoodTrends({ period: 'week' });

  // Water tracking hook
  const { markHydrationCelebration } = useWaterLog();

  // Calculate mood stats from trend data
  const moodStats = useMemo(() => {
    if (!trendData?.data) return null;
    return calculateMoodStats(trendData.data);
  }, [trendData]);

  useEffect(() => {
    let isActive = true;
    const loadSavedFilter = async () => {
      const savedDays = await storage.getItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS);
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
    storage.setItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS, insightsDays);
  }, [insightsDays]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // ============================================================================
  // GAMIFICATION LOGIC
  // ============================================================================
  
  // Track previous streak to detect increments
  const prevStreakRef = useRef(data?.gamification?.streak);

  const checkStreakReward = useCallback(async (currentStreak) => {
    try {
      // Use apiClient for proper authentication
      const response = await fetch('https://myfoodtracker.onrender.com/api/gamification/check-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: Add auth token from your auth context/provider when available
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({ currentStreak })
      });

      if (!response.ok) {
        throw new Error('Failed to check streak reward');
      }

      const result = await response.json();
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

  const hydrationEvents = useMemo(() => {
    if (!data?.today?.waterLogs) return [];
    return data.today.waterLogs.map((log) => {
      const hydrationLiters = parseLiters(log.hydrationLiters || log.amountLiters);
      return {
        timestamp: log.loggedDate,
        amountMl: Math.round(hydrationLiters * 1000),
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
          const numValue = parseDecimal(value, 0);
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
  }, [data, trendData]);

  // Detect anomalies in data
  const dataAnomalies = useMemo(() => {
    if (!data?.today || !data?.goals) return [];

    const anomalies = [];

    // Check calories
    const totalCalories = parseCalories(data.today.nutrition.totalCalories);
    const calorieGoal = parseGoal(data.goals.dailyCalories, 2000, 800, 10000);
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
    const proteinGoal = parseGoal(data.goals.proteinG, 150, 20, 500);
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

    return generateInsights({
      currentCalories: parseCalories(data.today.nutrition.totalCalories),
      calorieGoal: parseGoal(data.goals.dailyCalories, 2000, 800, 10000),
      currentProtein: parseMacro(data.today.nutrition.totalProtein),
      proteinGoal: parseGoal(data.goals.proteinG, 150, 20, 500),
      currentHydration: parseLiters(data.today.waterIntakeLiters),
      hydrationGoal: parseGoal(data.goals.waterLiters, 2.0, 0.5, 10),
      streak: parseDecimal(data.gamification?.streak, 0),
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

  // Handlers
  const handleLogMood = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
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

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <SkeletonCircle size={44} />
              <View>
                <SkeletonText width={200} height={28} marginBottom={8} />
                <SkeletonText width={150} height={14} marginBottom={0} />
              </View>
            </View>
          </View>

          {/* Main card skeleton */}
          <SkeletonCard height={240} />

          {/* Section skeletons */}
          <View style={{ marginTop: SPACING[4] }}>
            <SkeletonCard height={180} />
          </View>

          <View style={{ marginTop: SPACING[4] }}>
            <SkeletonCard height={180} />
          </View>

          <View style={{ marginTop: SPACING[4] }}>
            <SkeletonCard height={120} />
          </View>
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
          <Ionicons name={errorDetails.icon} size={64} color={COLORS.text.tertiary} />
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

  // Check if user has any data (first-time user detection)
  const hasAnyData = uniqueFoodLogs.length > 0 ||
                      parseLiters(today.waterIntakeLiters) > 0 ||
                      today.moodLogs?.length > 0 ||
                      parseDecimal(gamification?.streak, 0) > 0;

  const displayName = user?.firstName
    || user?.fullName?.split(' ')?.[0]
    || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface.background.primary }]}>
        <ThemeTransition>
          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(tabs)/profile');
              }}
              accessibilityLabel="Go to Profile tab"
              accessibilityRole="button"
            >
              <Ionicons name={ICONS.profile} size={20} color={TEXT.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>
                {getGreeting()}, {displayName}
              </Text>
              <Text style={styles.headerSubtitle}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · Today
              </Text>
            </View>
          </View>

          {/* Right side controls */}
          <View style={styles.headerRight}>
            {/* Theme Toggle */}
            <TouchableOpacity
              style={styles.focusModeButton}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setThemeModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open theme settings"
              accessibilityHint="Choose between light, dark, and auto themes"
            >
              <Ionicons
                name={theme === 'light' ? "moon" : "sunny"}
                size={18}
                color={TEXT.primary}
              />
            </TouchableOpacity>

            {/* Focus Mode Toggle */}
            <TouchableOpacity
              style={[styles.focusModeButton, focusMode && styles.focusModeButtonActive]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const newFocusMode = !focusMode;
                setFocusMode(newFocusMode);

                // Collapse all sections in focus mode
                if (newFocusMode) {
                  setNutritionExpanded(false);
                  setWellnessExpanded(false);
                  setProgressExpanded(false);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={focusMode ? "Exit focus mode" : "Enter focus mode"}
              accessibilityHint="Toggles simplified view to reduce information overload"
            >
              <Ionicons
                name={focusMode ? "eye-off" : "eye"}
                size={18}
                color={focusMode ? TEXT.primary : TEXT.secondary}
              />
            </TouchableOpacity>

            {/* Sync Status Indicator */}
            <View style={styles.syncStatus}>
              <View style={[styles.syncDot, refreshing && styles.syncDotActive]} />
              <Text style={styles.syncText}>
                {refreshing ? 'Syncing...' : 'Synced'}
              </Text>
            </View>
          </View>
        </View>

        {/* FOCUS MODE INDICATOR */}
        {focusMode && (
          <View style={styles.focusModeIndicator}>
            <Ionicons name="eye-off" size={16} color="#3B82F6" />
            <Text style={styles.focusModeText}>Focus Mode Active</Text>
            <Text style={styles.focusModeSubtext}>Showing essentials only</Text>
          </View>
        )}

        {/* FIRST-TIME USER EMPTY STATE */}
        {!hasAnyData && (
          <EmptyState
            icon="rocket"
            title="Welcome to Your Health Journey!"
            description="Start tracking your meals, water intake, and mood to unlock powerful insights and build healthy habits."
            actionLabel="Start Logging"
            onAction={() => {
              router.push('/(tabs)/log');
            }}
          />
        )}

        {/* SMART INSIGHTS - Contextual recommendations */}
        {smartInsights.length > 0 && (
          <InsightsCard
            insights={smartInsights}
            onActionPress={handleInsightAction}
          />
        )}

        {/* DATA INSIGHT (calm tone, not warning) */}
        {dataAnomalies.length > 0 && (
          <GlassCard style={styles.infoCard} padding="md">
            <View style={styles.anomalyHeader}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={dataAnomalies[0].icon || ICONS.info}
                  size={ICON_SIZES.lg}
                  color={BRAND.primary}
                />
              </View>
              <View style={styles.anomalyTextContainer}>
                <View style={styles.anomalyTitleRow}>
                  <Text style={styles.infoTitle}>{dataAnomalies[0].metric} Check</Text>
                  {dataAnomalies[0].percentageDiff !== undefined && (
                    <View style={styles.percentageBadge}>
                      <Text style={styles.percentageText}>
                        {dataAnomalies[0].percentageDiff}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.infoMessage}>
                  {dataAnomalies[0].message}
                </Text>
                {dataAnomalies[0].actionLabel && dataAnomalies[0].action && (
                  <TouchableOpacity
                    style={styles.anomalyActionButton}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      dataAnomalies[0].action();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={dataAnomalies[0].actionLabel}
                  >
                    <Text style={styles.anomalyActionText}>
                      {dataAnomalies[0].actionLabel}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={BRAND.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </GlassCard>
        )}

        {/* PRIMARY KPI - Always visible */}
        <GlassCard style={styles.primaryCard} padding="lg">
          {today.foodLogs && today.foodLogs.length > 0 ? (
            <View style={styles.primaryContent}>
              <NutriScoreDial data={data} size={180} />
              <Text style={styles.primaryHint}>
                Based on calories, protein, hydration, and consistency
              </Text>
            </View>
          ) : (
            <View style={styles.primaryContent}>
              <PremiumRing
                value={parseCalories(today.nutrition.totalCalories)}
                goal={parseGoal(goals?.dailyCalories, 2000, 800, 10000)}
                label="Calories"
                unit="kcal"
                size={180}
                strokeWidth={16}
              />
              {trends.weeklyAverages ? (
                <Text style={styles.primaryHint}>
                  {`Weekly avg: ${Math.round(parseCalories(trends.weeklyAverages.avgCalories))} kcal/day`}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.primaryHintCta}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
                  }}
                  accessibilityLabel="Log your first meal"
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle-outline" size={14} color={TEXT.secondary} />
                  <Text style={styles.primaryHintCtaText}>Log your first meal to unlock your score</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </GlassCard>

        {/* ============================================ */}
        {/* NUTRITION SECTION - Collapsible */}
        {/* ============================================ */}
        <CollapsibleSection
          title="Nutrition"
          icon="nutrition"
          expanded={nutritionExpanded}
          onToggle={() => setNutritionExpanded(!nutritionExpanded)}
        >
          {/* PROFESSIONAL NUTRITION OVERVIEW - Compact macros + calories */}
          <View style={styles.sectionCard}>
            <NutritionOverviewCard
              calories={parseCalories(today.nutrition.totalCalories)}
              calorieGoal={parseGoal(goals?.dailyCalories, 2000, 800, 10000)}
              protein={parseMacro(today.nutrition.totalProtein)}
              proteinGoal={parseGoal(goals?.proteinG, 150, 20, 500)}
              carbs={parseMacro(today.nutrition.totalCarbs)}
              carbsGoal={parseGoal(goals?.carbsG, 250, 50, 600)}
              fat={parseMacro(today.nutrition.totalFats)}
              fatGoal={parseGoal(goals?.fatsG, 65, 20, 200)}
              fiber={parseDecimal(aggregatedMicros.fiber, 0)}
              fiberGoal={30}
              sugar={parseMacro(today.nutrition.totalSugars)}
              sugarGoal={50}
            />
          </View>

          {/* MACRO BALANCE ASSESSMENT */}
          {macroAssessment && macroAssessment.quality !== 'none' && (
            <MacroBalanceCard assessment={macroAssessment} />
          )}

          {/* PROFESSIONAL MICRONUTRIENTS GRID */}
          <View style={styles.sectionCard}>
            <MicronutrientsGrid micros={aggregatedMicros} showAll={false} />
          </View>

          {/* RECENT MEALS */}
          {uniqueFoodLogs.length > 0 ? (
            <GlassCard style={styles.sectionCard} padding="md">
              <Text style={styles.sectionTitle}>Recent Meals</Text>
              {uniqueFoodLogs.slice(0, 3).map((log) => (
                <View key={log.id} style={styles.mealItem}>
                  <View style={styles.mealDot} />
                  <View style={styles.mealContent}>
                    <Text style={styles.mealName}>{log.foodName}</Text>
                    <Text style={styles.mealMeta}>
                      {log.mealType} · {Math.round(parseCalories(log.calories))} kcal
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          ) : (
            <EmptyState
              icon="restaurant"
              title="No meals logged yet"
              description="Track your first meal to start building your nutrition insights and discover patterns in your eating habits"
              actionLabel="Log Your First Meal"
              onAction={() => {
                router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
              }}
              variant="compact"
            />
          )}
        </CollapsibleSection>

        {/* ============================================ */}
        {/* WELLNESS SECTION - Collapsible */}
        {/* ============================================ */}
        <CollapsibleSection
          title="Wellness"
          icon="heart"
          expanded={wellnessExpanded}
          onToggle={() => setWellnessExpanded(!wellnessExpanded)}
        >
          {/* CONSOLIDATED WELLNESS SNAPSHOT - Vertical Stack */}
          <View style={styles.wellnessStack}>
            {/* HYDRATION */}
            <HydrationWellnessDashboard
              currentIntake={today.waterIntakeLiters || 0}
              dailyGoal={goals?.waterLiters || 2.0}
              streak={gamification?.streak || 0}
              intakeEvents={hydrationEvents}
              lastLoggedAt={hydrationLastLoggedAt}
              celebratedTodayKey={hydrationCelebratedKey}
              onCelebrate={handleHydrationCelebration}
              onOpenFullTracker={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } })}
              compact={true}
            />

            <View style={styles.wellnessDivider} />

            {/* MOOD */}
              <EnhancedMoodCard
                moodLogs={today.moodLogs}
                trendData={trendData?.data || []}
                stats={moodStats}
                loading={false}
                onLogMood={handleLogMood}
                onViewInsights={handleViewInsights}
                onPreviewInsights={handlePreviewInsights}
                compact={true}
              />
          </View>
        </CollapsibleSection>

        {/* ============================================ */}
        {/* PROGRESS SECTION - Collapsible */}
        {/* ============================================ */}
        <CollapsibleSection
          title="Progress & Tracking"
          icon="analytics"
          expanded={progressExpanded}
          onToggle={() => setProgressExpanded(!progressExpanded)}
        >
          {/* WEEKLY TRENDS */}
          {trends.weeklyAverages && (
            <View style={styles.sectionCard}>
              <PremiumWeeklyTrends trends={trends} goals={goals} />
            </View>
          )}

          {/* GAMIFICATION */}
          <PremiumAchievementsCard
            level={gamification?.level || 1}
            xp={gamification?.xp || 0}
            nextLevelXp={gamification?.nextLevelXp} // Let component calculate if not provided
            streak={gamification?.streak || 0}
            streakFreezes={gamification?.streakFreezes || 0}
          />

          {/* MEAL MOOD CALENDAR */}
          <MealMoodCalendar
            data={calendarData}
            currentStreak={gamification?.streak || 0}
          />

          {/* RECENT WEIGHT */}
          {recentWeight.length > 0 && (
            <GlassCard style={styles.sectionCard} padding="md">
              <Text style={styles.sectionTitle}>Weight Tracking</Text>
              <View style={styles.weightContainer}>
                <View style={styles.weightIconContainer}>
                  <Ionicons name={ICONS.weight} size={ICON_SIZES['2xl']} color={BRAND.primary} />
                </View>
                <View style={styles.weightInfo}>
                  <Text style={styles.weightValue}>{recentWeight[0].weightKg} kg</Text>
                  <Text style={styles.weightDate}>
                    {new Date(recentWeight[0].recordedDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}
        </CollapsibleSection>
      </ScrollView>
        </ThemeTransition>
      </View>

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
      />

      <ThemeSettingsModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F4', // Warm off-white background for consistency with log screen
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107, 78, 255, 0.08)', // Soft brand purple tint (was white glass)
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.15)',
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
    color: COLORS.text.secondary,
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
    color: COLORS.text.tertiary,
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
    color: COLORS.text.primary,
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
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  waterValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.semantic.info,
    marginBottom: SPACING[1],
  },
  waterPercent: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
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
    borderBottomColor: COLORS.glass.border,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.semantic.good,
    marginRight: SPACING[3],
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  mealMeta: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
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
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.muted,
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
    color: COLORS.text.muted,
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
    color: COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  weightDate: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
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
    color: COLORS.text.tertiary,
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
