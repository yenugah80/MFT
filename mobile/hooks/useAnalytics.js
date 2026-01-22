/**
 * useAnalytics - Unified Analytics Hook with Smart Recommendations
 *
 * Combines data from all wellness domains with personalized recommendations
 * powered by the analytics recommendation engine.
 *
 * Features:
 * - Analytics from Day 1
 * - Recommendations from Day 2
 * - Cross-domain insights (food-mood, hydration-energy, activity-mood)
 * - Evidence-anchored suggestions
 * - Netflix/LinkedIn-style personalization
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import apiClient from '../services/apiClient';

const QUERY_KEYS = {
  analyticsRecommendations: (period) => ['analytics-recommendations', period],
  analytics: (period) => ['analytics-unified', period],
};

/**
 * Main unified analytics hook with recommendations
 * @param {string} period - 'today' | 'week' | 'month' | 'all'
 */
export function useAnalytics(period = 'week') {
  // Fetch comprehensive analytics with recommendations
  const recommendationsQuery = useQuery({
    queryKey: QUERY_KEYS.analyticsRecommendations(period),
    queryFn: async () => {
      const data = await apiClient.get('/analytics/recommendations', {
        params: { period },
      });
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Also fetch raw analytics for backward compatibility
  const nutritionQuery = useQuery({
    queryKey: [...QUERY_KEYS.analytics(period), 'nutrition'],
    queryFn: async () => {
      const data = await apiClient.get('/nutrition/dashboard');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const moodQuery = useQuery({
    queryKey: [...QUERY_KEYS.analytics(period), 'mood'],
    queryFn: async () => {
      const params = getPeriodParams(period);
      const data = await apiClient.get('/mood/trends', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const activityQuery = useQuery({
    queryKey: [...QUERY_KEYS.analytics(period), 'activity'],
    queryFn: async () => {
      const data = await apiClient.get('/activity/analytics/dashboard');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const hydrationQuery = useQuery({
    queryKey: [...QUERY_KEYS.analytics(period), 'hydration'],
    queryFn: async () => {
      const data = await apiClient.get('/hydration/analytics/dashboard');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Process recommendations data
  const recommendations = useMemo(() => {
    const data = recommendationsQuery.data;
    if (!data || !data.success) return null;

    return {
      nutrition: data.recommendations?.nutrition || [],
      mood: data.recommendations?.mood || [],
      hydration: data.recommendations?.hydration || [],
      activity: data.recommendations?.activity || [],
      wellness: data.recommendations?.wellness || [],
      stage: data.stage,
      stats: data.stats,
      meta: data.meta,
    };
  }, [recommendationsQuery.data]);

  // Process nutrition data for backward compatibility
  const nutrition = useMemo(() => {
    // Prefer recommendations stats if available
    const recStats = recommendationsQuery.data?.stats?.food;
    const dashData = nutritionQuery.data;

    if (!recStats && !dashData) return null;

    const calories = dashData?.calories || {};
    const macros = dashData?.macros || {};

    return {
      calories: {
        consumed: recStats?.todayCalories || calories.consumed || 0,
        budget: recommendationsQuery.data?.stats?.goals?.calorieGoal || calories.budget || 2000,
        percentage: recStats
          ? Math.round((recStats.todayCalories / (recommendationsQuery.data?.stats?.goals?.calorieGoal || 2000)) * 100)
          : (calories.budget ? Math.round((calories.consumed / calories.budget) * 100) : 0),
      },
      macros: {
        protein: {
          consumed: recStats?.todayProtein || macros.protein?.consumed || 0,
          goal: recommendationsQuery.data?.stats?.goals?.proteinGoal || macros.protein?.goal || 150,
          percentage: (() => {
            const consumed = recStats?.todayProtein || macros.protein?.consumed || 0;
            const goal = recommendationsQuery.data?.stats?.goals?.proteinGoal || macros.protein?.goal || 150;
            return goal > 0 ? Math.round((consumed / goal) * 100) : 0;
          })(),
        },
        carbs: {
          consumed: recStats?.todayCarbs || macros.carbs?.consumed || 0,
          goal: recommendationsQuery.data?.stats?.goals?.carbsGoal || macros.carbs?.goal || 250,
          percentage: (() => {
            const consumed = recStats?.todayCarbs || macros.carbs?.consumed || 0;
            const goal = recommendationsQuery.data?.stats?.goals?.carbsGoal || macros.carbs?.goal || 250;
            return goal > 0 ? Math.round((consumed / goal) * 100) : 0;
          })(),
        },
        fat: {
          consumed: recStats?.todayFat || macros.fat?.consumed || 0,
          goal: recommendationsQuery.data?.stats?.goals?.fatGoal || macros.fat?.goal || 65,
          percentage: (() => {
            const consumed = recStats?.todayFat || macros.fat?.consumed || 0;
            const goal = recommendationsQuery.data?.stats?.goals?.fatGoal || macros.fat?.goal || 65;
            return goal > 0 ? Math.round((consumed / goal) * 100) : 0;
          })(),
        },
      },
      mealsLogged: recStats?.today || dashData?.recentMeals?.length || 0,
      // Add recommendations
      recommendations: recommendations?.nutrition || [],
    };
  }, [nutritionQuery.data, recommendationsQuery.data, recommendations]);

  // Process mood data
  const mood = useMemo(() => {
    const recStats = recommendationsQuery.data?.stats?.mood;
    const data = moodQuery.data;

    if (!recStats && (!data?.data || data.data.length === 0)) return null;

    const entries = data?.data || [];
    const avgIntensity = recStats?.avgIntensity || (
      entries.length > 0
        ? entries.reduce((sum, e) => sum + (e.intensity || 0), 0) / entries.length
        : 0
    );

    // Find dominant mood
    const moodCounts = {};
    entries.forEach(e => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });
    const dominantMood = Object.keys(moodCounts).sort((a, b) => moodCounts[b] - moodCounts[a])[0] || 'neutral';

    // Find best day
    const bestEntry = entries.reduce((best, current) => {
      return (current.intensity || 0) > (best?.intensity || 0) ? current : best;
    }, null);
    const bestDay = bestEntry?.loggedDate
      ? new Date(bestEntry.loggedDate).toLocaleDateString('en-US', { weekday: 'short' })
      : null;

    return {
      avgScore: avgIntensity.toFixed(1),
      dominantMood,
      entriesLogged: recStats?.total || entries.length,
      bestDay,
      trend: entries.slice(-7),
      // Add recommendations
      recommendations: recommendations?.mood || [],
    };
  }, [moodQuery.data, recommendationsQuery.data, recommendations]);

  // Process activity data
  const activity = useMemo(() => {
    const recStats = recommendationsQuery.data?.stats?.activity;
    const data = activityQuery.data;

    if (!recStats && !data) return null;

    const weekData = data?.weekData || [];
    const totalMinutes = recStats?.weeklyMinutes || weekData.reduce((sum, d) => sum + (d.minutes || 0), 0);
    const activeDays = weekData.filter(d => d.minutes > 0).length;
    const cdcGoal = recommendationsQuery.data?.stats?.goals?.activityGoalMinutes || 150;

    return {
      totalMinutes,
      cdcGoalPercent: Math.round((totalMinutes / cdcGoal) * 100),
      activeDays,
      weekData,
      persona: data?.persona,
      streak: calculateStreak(weekData),
      // Add recommendations
      recommendations: recommendations?.activity || [],
    };
  }, [activityQuery.data, recommendationsQuery.data, recommendations]);

  // Process hydration data
  const hydration = useMemo(() => {
    const recStats = recommendationsQuery.data?.stats?.water;
    const data = hydrationQuery.data;
    const dashData = nutritionQuery.data;

    // Get today's water
    const todayWater = recStats?.todayMl || dashData?.water?.consumed || 0;
    const waterGoal = recommendationsQuery.data?.stats?.goals?.waterGoalMl || dashData?.water?.goal || 2000;

    return {
      todayMl: todayWater,
      goalMl: waterGoal,
      goalPercent: waterGoal ? Math.round((todayWater / waterGoal) * 100) : 0,
      streak: data?.patterns?.streak || 0,
      avgDaily: recStats?.avgDailyMl || data?.patterns?.avgDailyMl || todayWater,
      // Add recommendations
      recommendations: recommendations?.hydration || [],
    };
  }, [hydrationQuery.data, nutritionQuery.data, recommendationsQuery.data, recommendations]);

  // Overall wellness recommendations
  const wellness = useMemo(() => {
    return {
      recommendations: recommendations?.wellness || [],
      stage: recommendations?.stage,
      stats: recommendations?.stats,
    };
  }, [recommendations]);

  const isLoading = recommendationsQuery.isLoading || nutritionQuery.isLoading ||
    moodQuery.isLoading || activityQuery.isLoading || hydrationQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      recommendationsQuery.refetch(),
      nutritionQuery.refetch(),
      moodQuery.refetch(),
      activityQuery.refetch(),
      hydrationQuery.refetch(),
    ]);
  };

  return {
    // Domain data with recommendations
    nutrition,
    mood,
    activity,
    hydration,
    wellness,

    // All recommendations grouped
    recommendations,

    // Loading & control
    isLoading,
    refetch,
    period,

    // Raw queries for granular control
    queries: {
      recommendations: recommendationsQuery,
      nutrition: nutritionQuery,
      mood: moodQuery,
      activity: activityQuery,
      hydration: hydrationQuery,
    },
  };
}

// Helper to convert period to API params
function getPeriodParams(period) {
  switch (period) {
    case 'today':
      return { days: 1, period: 'day' };
    case 'week':
      return { days: 7, period: 'week' };
    case 'month':
      return { days: 30, period: 'month' };
    case 'year':
      return { days: 365, period: 'year' };
    default:
      return { days: 7, period: 'week' };
  }
}

// Helper to calculate activity streak
function calculateStreak(weekData = []) {
  let streak = 0;
  const sorted = [...weekData].sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const day of sorted) {
    if (day.minutes > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default useAnalytics;
