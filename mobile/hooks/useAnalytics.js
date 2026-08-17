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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import apiClient from '../services/apiClient';
import { mapDecisionBrainInsights } from '../utils/decisionBrainInsights';

const QUERY_KEYS = {
  analyticsRecommendations: (period) => ['analytics-recommendations', period],
  analytics: (period) => ['analytics-unified', period],
};

/**
 * Main unified analytics hook with recommendations
 * @param {string} period - 'today' | 'week' | 'month' | 'all'
 */
export function useAnalytics(period = 'week') {
  const queryClient = useQueryClient();

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

  // Also fetch raw analytics. /nutrition/dashboard's `today`-scoped fields
  // (calorie ring etc.) don't vary by period, but `days` now genuinely
  // rescopes trends.weekSummaries/weeklyAverages (previously always a fixed
  // 7 days regardless of what the UI asked for) — so `period` belongs back
  // in the queryKey now that the response actually varies with it.
  const nutritionQuery = useQuery({
    queryKey: [...QUERY_KEYS.analytics(period), 'nutrition'],
    queryFn: async () => {
      const { days } = getPeriodParams(period);
      const data = await apiClient.get('/nutrition/dashboard', { params: { days } });
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
      // days actually varies the response now (previously always a fixed
      // trailing 7 days regardless of what the UI asked for).
      const { days } = getPeriodParams(period);
      const data = await apiClient.get('/activity/analytics/dashboard', { params: { days } });
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

  // Insight Engine (decision-brain) — see docs/architecture/recommendation-engine.md
  // for why this is a separate source from recommendationsQuery above.
  // recommendationsQuery (the Food Engine) still supplies raw metrics and
  // hasDataInPeriod; these four supply the actual insight/pattern cards each
  // tab renders, so Dashboard and Your Progress read the same narrative
  // instead of two independently-generated ones.
  const moodInsightsQuery = useQuery({
    queryKey: ['decision-brain', 'mood-insights'],
    queryFn: async () => apiClient.get('/decision-brain/mood-insights'),
    staleTime: 5 * 60 * 1000,
  });

  const nutritionInsightsQuery = useQuery({
    queryKey: ['decision-brain', 'nutrition-insights'],
    queryFn: async () => apiClient.get('/decision-brain/nutrition-insights'),
    staleTime: 5 * 60 * 1000,
  });

  const hydrationInsightsQuery = useQuery({
    queryKey: ['decision-brain', 'hydration-insights'],
    queryFn: async () => apiClient.get('/decision-brain/hydration-insights'),
    staleTime: 5 * 60 * 1000,
  });

  const activityInsightsQuery = useQuery({
    queryKey: ['decision-brain', 'activity-insights'],
    queryFn: async () => apiClient.get('/decision-brain/activity-insights'),
    staleTime: 5 * 60 * 1000,
  });

  // Process recommendations data
  const recommendations = useMemo(() => {
    const data = recommendationsQuery.data;

    // The Food Engine still generates 4 static 'action'-type onboarding
    // nudges ("Log Your First Meal" etc., gated on zero logs ever) —
    // Phase 1's migration to decision-brain only replaced the
    // pattern/insight/suggestion cards, not these, so they're merged back
    // in here rather than lost. Their ids are already namespaced by the
    // backend (nudgeRecommendationId) so Done/Later can track them.
    const actionRecs = (domain) => (data?.success ? data.recommendations?.[domain] || [] : [])
      .filter((r) => r.type === 'action');

    return {
      // Insight cards (patterns/correlations/suggestions) now come from the
      // Insight Engine (decision-brain), not the Food Engine's ad hoc
      // generators — see docs/architecture/recommendation-engine.md. Each
      // tab reads this via the `recommendations` prop passed in
      // app/analytics/index.jsx.
      nutrition: [...actionRecs('nutrition'), ...mapDecisionBrainInsights(nutritionInsightsQuery.data, 'nutrition')],
      mood: [...actionRecs('mood'), ...mapDecisionBrainInsights(moodInsightsQuery.data, 'mood')],
      hydration: [...actionRecs('hydration'), ...mapDecisionBrainInsights(hydrationInsightsQuery.data, 'hydration')],
      activity: [...actionRecs('activity'), ...mapDecisionBrainInsights(activityInsightsQuery.data, 'activity')],
      // Wellness tab migration is out of scope for this phase — its
      // "wellness score" gauge needs a shape decision-brain doesn't
      // document the same way (see the ADR's migration-status note), so it
      // still reads from the Food Engine for now.
      wellness: data?.success ? (data.recommendations?.wellness || []) : [],
      stage: data?.stage,
      stats: data?.stats,
      meta: data?.meta,
    };
  }, [
    recommendationsQuery.data,
    nutritionInsightsQuery.data,
    moodInsightsQuery.data,
    hydrationInsightsQuery.data,
    activityInsightsQuery.data,
  ]);

  // Process nutrition data for backward compatibility
  const nutrition = useMemo(() => {
    // Prefer recommendations stats if available
    const recStats = recommendationsQuery.data?.stats?.food;
    const dashData = nutritionQuery.data;

    if (!recStats && !dashData) return null;

    // /nutrition/dashboard has never returned a top-level `calories`/`macros`
    // shape — the real numbers live at `today.nutrition` and `goals`. This
    // fallback only engages when recStats (the preferred source) is
    // unavailable, so it was silently dead until now.
    const todayNutrition = dashData?.today?.nutrition || {};
    const goals = dashData?.goals || {};
    const calories = {
      consumed: todayNutrition.totalCalories || 0,
      budget: goals.dailyCalories || 2000,
    };
    const macros = {
      protein: { consumed: todayNutrition.totalProtein || 0, goal: goals.proteinG || 150 },
      carbs: { consumed: todayNutrition.totalCarbs || 0, goal: goals.carbsG || 250 },
      fat: { consumed: todayNutrition.totalFats || 0, goal: goals.fatsG || 65 },
    };

    return {
      calories: {
        // percentage previously branched on truthiness of the whole
        // recStats object, not recStats.todayCalories specifically — if
        // recStats existed but todayCalories was 0/undefined, this showed
        // "0%" while `consumed` (below) had already correctly fallen back
        // to calories.consumed. Both fields now use the same fallback.
        consumed: recStats?.todayCalories || calories.consumed || 0,
        budget: recommendationsQuery.data?.stats?.goals?.calorieGoal || calories.budget || 2000,
        percentage: recStats?.todayCalories
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
      mealsLogged: recStats?.today || dashData?.today?.foodLogs?.length || 0,
      // Zero-filled calorie/macro trend (oldest -> newest), spanning the
      // selected period now (previously hardcoded to 7 days regardless of
      // Day/Week/Month) — built from the dashboard payload's already-fetched
      // weekSummaries so a day with no logs renders as a real gap instead of
      // skewing the chart's spacing.
      weekData: (() => {
        const { days } = getPeriodParams(period);
        // s.date comes back from Drizzle as "YYYY-MM-DD 00:00:00" (a date
        // column, not a plain date string) — this Map's keys never matched
        // the plain "YYYY-MM-DD" lookups below, so this chart has likely
        // never shown real data for any user. .slice(0,10) normalizes it.
        const summaryByDate = new Map((dashData?.trends?.weekSummaries || []).map((s) => [String(s.date).slice(0, 10), s]));
        return Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          // Local date components, not .toISOString() — that converts to
          // UTC first, which can additionally shift the calendar day for a
          // timezone behind UTC in the evening (or ahead of UTC early
          // morning). Secondary to the key-format bug above, but worth
          // avoiding regardless.
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const summary = summaryByDate.get(dateStr);
          return {
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
            calories: summary?.totalCalories || 0,
          };
        });
      })(),
      // Server-computed averages over days that actually have a summary row
      // (not the zero-filled weekData above), now scoped to the same period
      // as weekData instead of always being a fixed 7-day figure.
      weeklyAverages: dashData?.trends?.weeklyAverages || null,
      // Raw nutritionGoalsTable row already includes this — no separate profile
      // fetch needed to phrase numbers relative to the user's stated goal.
      primaryGoal: dashData?.goals?.primaryGoal || null,
      // Canonical period-scoped "is there anything to show" signal (see
      // backend getUserDataStats). Replaces the old today-only calories>0
      // check, which could disagree with the period-scoped insight cards
      // rendered right below it.
      hasDataInPeriod: recStats?.hasDataInPeriod ?? (calories.consumed || 0) > 0,
      // Note: insight cards are NOT read from this object — NutritionTab
      // gets them via the separate `recommendations` prop (see the top-level
      // `recommendations` memo below and app/analytics/index.jsx).
    };
  }, [nutritionQuery.data, recommendationsQuery.data]);

  // Process mood data
  const mood = useMemo(() => {
    const recStats = recommendationsQuery.data?.stats?.mood;
    const data = moodQuery.data;

    if (!recStats && (!data?.data || data.data.length === 0)) return null;

    const entries = data?.data || [];
    // /mood/trends is already correctly period-scoped (it takes the same
    // day/week/month param useAnalytics passes through) — recStats.avgIntensity
    // is NOT (analyticsRecommendationService's getUserDataStats computes it
    // from all-time mood logs), so preferring it here silently showed the
    // same "Avg Score" under every Day/Week/Month tab. entries is now the
    // source of truth.
    const avgIntensity = entries.length > 0
      ? entries.reduce((sum, e) => sum + (e.intensity || 0), 0) / entries.length
      : (recStats?.avgIntensity || 0);

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
    // /mood/trends returns day-aggregate rows as { date, mood, intensity, ... }
    // — no `loggedDate` field. Reading .loggedDate here produced Invalid Date.
    const bestDay = bestEntry?.date
      ? new Date(bestEntry.date).toLocaleDateString('en-US', { weekday: 'short' })
      : null;

    return {
      avgScore: avgIntensity.toFixed(1),
      dominantMood,
      // recStats.total is mood_log's all-time row count — same bug as
      // avgIntensity above, entries.length is the period-scoped count.
      entriesLogged: entries.length || recStats?.total || 0,
      bestDay,
      // Previously hardcoded to the last 7 entries regardless of the
      // selected period — Month showed the identical 7-point chart as Week.
      // entries is already the full period-scoped series from /mood/trends.
      trend: entries,
      hasDataInPeriod: recStats?.hasDataInPeriod ?? entries.length > 0,
      // Note: insight cards are NOT read from this object — MoodTab gets
      // them via the separate `recommendations` prop.
    };
  }, [moodQuery.data, recommendationsQuery.data]);

  // Process activity data
  const activity = useMemo(() => {
    const recStats = recommendationsQuery.data?.stats?.activity;
    const data = activityQuery.data;

    if (!recStats && !data) return null;

    // weekData now genuinely reflects the requested period (see
    // /activity/analytics/dashboard's ?days= param) instead of always being
    // a fixed trailing 7 days, so this total is correctly period-scoped.
    const weekData = data?.weekData || [];
    const totalMinutes = weekData.reduce((sum, d) => sum + (d.minutes || 0), 0);
    const activeDays = weekData.filter(d => d.minutes > 0).length;
    const cdcGoal = recommendationsQuery.data?.stats?.goals?.activityGoalMinutes || 150;
    // The CDC 150-min/week guideline is inherently weekly — recStats.weeklyMinutes
    // is deliberately pinned to a literal trailing 7 days on the backend
    // regardless of the Week/Month toggle. Kept as its own field (not reused
    // as `totalMinutes`) so the UI can label it "this week" explicitly
    // instead of silently showing a fixed number under every tab.
    const weeklyGoalMinutes = recStats?.weeklyMinutes ?? totalMinutes;

    return {
      totalMinutes,
      weeklyGoalMinutes,
      cdcGoalPercent: Math.round((weeklyGoalMinutes / cdcGoal) * 100),
      activeDays,
      weekData,
      persona: data?.persona,
      streak: calculateStreak(weekData),
      // General profile field (not nutrition-specific), sourced from the same
      // already-fetched nutrition dashboard payload — no separate fetch needed.
      primaryGoal: nutritionQuery.data?.goals?.primaryGoal || null,
      hasDataInPeriod: recStats?.hasDataInPeriod ?? totalMinutes > 0,
      // Note: insight cards are NOT read from this object — ActivityTab
      // gets them via the separate `recommendations` prop.
    };
  }, [activityQuery.data, recommendationsQuery.data, nutritionQuery.data]);

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
      hasDataInPeriod: recStats?.hasDataInPeriod ?? todayWater > 0,
      // Note: insight cards are NOT read from this object — HydrationTab
      // gets them via the separate `recommendations` prop.
    };
  }, [hydrationQuery.data, nutritionQuery.data, recommendationsQuery.data]);

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
      moodInsightsQuery.refetch(),
      nutritionInsightsQuery.refetch(),
      hydrationInsightsQuery.refetch(),
      activityInsightsQuery.refetch(),
    ]);
  };

  // Backs the Done/Later buttons on the 4 engagement-nudge cards (the only
  // recommendation type RecommendationCard renders action buttons for).
  // Hits the same tracking endpoint the food-candidate flow already uses
  // (backend/src/routes/recommendations.js POST /:id/track), which also
  // closes the Thompson Sampling loop for accept/reject.
  const trackRecommendationMutation = useMutation({
    mutationFn: async ({ id, action }) => apiClient.post(`/recommendations/${id}/track`, { action }),
    onSuccess: () => {
      // Backend excludes accepted/rejected nudges from the next fetch (see
      // applyNudgeStatuses), so refetching is what actually makes the card
      // disappear — there's no client-side filtering to do here.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analyticsRecommendations(period) });
    },
  });

  const onCompleteRecommendation = useCallback((id) => {
    return trackRecommendationMutation.mutateAsync({ id, action: 'accept' });
  }, [trackRecommendationMutation]);

  const onDismissRecommendation = useCallback((id) => {
    return trackRecommendationMutation.mutateAsync({ id, action: 'reject' });
  }, [trackRecommendationMutation]);

  return {
    // Domain data with recommendations
    nutrition,
    mood,
    activity,
    hydration,
    wellness,

    // All recommendations grouped
    recommendations,

    // Done/Later handlers for the engagement-nudge action cards
    onCompleteRecommendation,
    onDismissRecommendation,

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
      moodInsights: moodInsightsQuery,
      nutritionInsights: nutritionInsightsQuery,
      hydrationInsights: hydrationInsightsQuery,
      activityInsights: activityInsightsQuery,
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
