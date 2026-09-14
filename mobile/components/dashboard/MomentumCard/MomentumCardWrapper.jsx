/**
 * MomentumCardWrapper - Smart Dashboard Integration
 *
 * This wrapper component:
 * 1. Extracts relevant metrics from dashboard data
 * 2. Decides whether to show the MomentumCard (using MomentumEngine)
 * 3. Handles dismissal state persistence
 *
 * Usage in DashboardContent:
 * <MomentumCardWrapper dashboardData={data} gamification={data.gamification} />
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MomentumCard from './MomentumCard';
import { shouldShowMomentumCard, getLastMomentumShown } from './MomentumEngine';
import { getItem, setItem, STORAGE_KEYS } from '../../../utils/storage';
import { DEFAULT_WATER_GOAL_LITERS } from '../../../constants/beverageConstants';

const DISMISSED_KEY = 'momentumCardDismissed';
const DISMISS_DURATION_HOURS = 24;

/**
 * Calculate weekly compliance days from trends data
 */
function calculateWeeklyComplianceDays(weekSummaries, goals) {
  if (!weekSummaries || !goals) return 0;

  const targetCalories = goals.dailyCalories || 2000;
  const tolerance = 0.15; // 15% tolerance

  return weekSummaries.filter((day) => {
    if (!day.totalCalories) return false;
    const ratio = day.totalCalories / targetCalories;
    return ratio >= 1 - tolerance && ratio <= 1 + tolerance;
  }).length;
}

/**
 * Calculate hydration streak from calendar data
 */
function calculateHydrationStreak(calendarData, waterGoal) {
  if (!calendarData || !waterGoal) return 0;

  let streak = 0;
  const sortedDays = Object.entries(calendarData)
    .sort(([a], [b]) => new Date(b) - new Date(a)); // Most recent first

  for (const [_, dayData] of sortedDays) {
    const waterIntake = dayData?.water?.total || 0;
    if (waterIntake >= waterGoal * 0.9) {
      // 90% of goal counts
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate unique foods this week
 */
function calculateUniqueFoods(weekSummaries, foodLogs) {
  if (!foodLogs || !Array.isArray(foodLogs)) return 0;

  const uniqueNames = new Set(
    foodLogs
      .filter((log) => log.foodName)
      .map((log) => log.foodName.toLowerCase().trim())
  );

  return uniqueNames.size;
}

/**
 * Calculate macro balance from today's data
 */
function calculateMacroBalance(todayNutrition, goals) {
  if (!todayNutrition || !goals) return null;

  const { totalProtein = 0, totalCarbs = 0, totalFats = 0 } = todayNutrition;
  const { proteinG = 50, carbsG = 250, fatsG = 65 } = goals;

  return {
    protein: {
      current: totalProtein,
      goal: proteinG,
      progress: proteinG > 0 ? (totalProtein / proteinG) * 100 : 0,
    },
    carbs: {
      current: totalCarbs,
      goal: carbsG,
      progress: carbsG > 0 ? (totalCarbs / carbsG) * 100 : 0,
    },
    fats: {
      current: totalFats,
      goal: fatsG,
      progress: fatsG > 0 ? (totalFats / fatsG) * 100 : 0,
    },
  };
}

/**
 * Calculate hydration progress
 */
function calculateHydrationProgress(waterIntake, waterGoal) {
  if (!waterGoal || waterGoal <= 0) return 0;
  return (waterIntake / waterGoal) * 100;
}

export default function MomentumCardWrapper({
  // Dashboard data
  dashboardData,
  gamification,
  goals,
  calendarData,
  weeklyFoodLogs,

  // Callbacks
  onViewProgress,
}) {
  const [isDismissed, setIsDismissed] = useState(true); // Start dismissed until we verify
  const [shouldShow, setShouldShow] = useState(false);

  // In-app level-up detection. This is the primary way an active user
  // learns about a level-up — immediate, unaffected by quiet hours, no
  // network round trip. The equivalent push notification
  // (gamificationRewardService.js's sendGatedCelebration) exists only as a
  // backup for when the user is NOT looking (backgrounded/closed app) and
  // does respect quiet hours; the two are deliberately not the same
  // channel with the same rules.
  //
  // previousLevelRef starts undefined (baseline not yet loaded this
  // session). On the first render where a real level value is available,
  // it's seeded from AsyncStorage — or, if nothing was ever persisted
  // (fresh install, or first run after this feature shipped for an
  // existing user), seeded to the CURRENT level so a pre-existing level
  // is never retroactively flagged as "just" earned. Only a later INCREASE
  // over that baseline sets justLeveledUp, and it stays true for the rest
  // of this mounted session (dismissal is MomentumCard's own 24h mechanism
  // below, unrelated to this flag) — the persisted baseline itself is
  // updated immediately, so a fresh app launch after this won't re-detect
  // the same level-up.
  const previousLevelRef = useRef(undefined);
  const [levelUpInfo, setLevelUpInfo] = useState({ justLeveledUp: false, newLevel: null });

  useEffect(() => {
    const currentLevel = gamification?.level;
    if (currentLevel == null) return;

    let cancelled = false;
    (async () => {
      if (previousLevelRef.current === undefined) {
        const stored = await getItem(STORAGE_KEYS.LAST_KNOWN_LEVEL);
        if (cancelled) return;
        if (stored != null) {
          previousLevelRef.current = parseInt(stored, 10);
        } else {
          previousLevelRef.current = currentLevel;
          await setItem(STORAGE_KEYS.LAST_KNOWN_LEVEL, String(currentLevel));
        }
      }

      if (!cancelled && currentLevel > previousLevelRef.current) {
        previousLevelRef.current = currentLevel;
        setLevelUpInfo({ justLeveledUp: true, newLevel: currentLevel });
        await setItem(STORAGE_KEYS.LAST_KNOWN_LEVEL, String(currentLevel));
      }
    })();

    return () => { cancelled = true; };
  }, [gamification?.level]);

  // Extract metrics from dashboard data
  const metrics = useMemo(() => {
    if (!dashboardData) return null;

    const todayData = dashboardData.today || dashboardData;
    const trends = dashboardData.trends || {};
    const waterGoal = parseFloat(goals?.waterLiters || DEFAULT_WATER_GOAL_LITERS);

    return {
      // Gamification
      streak: gamification?.streak || trends?.currentStreak || 0,
      level: gamification?.level || 1,
      xp: gamification?.xp || 0,
      streakFreezes: gamification?.streakFreezes || 0,
      justLeveledUp: levelUpInfo.justLeveledUp,
      newLevel: levelUpInfo.newLevel,

      // Nutrition
      calorieProgress:
        goals?.dailyCalories > 0
          ? ((todayData.nutrition?.totalCalories || 0) / goals.dailyCalories) * 100
          : 0,
      macroBalance: calculateMacroBalance(todayData.nutrition, goals),
      weeklyComplianceDays: calculateWeeklyComplianceDays(
        trends?.weekSummaries,
        goals
      ),
      complianceImprovement: 0, // Would need previous week data

      // Hydration
      hydrationProgress: calculateHydrationProgress(
        todayData.waterIntakeLiters || 0,
        waterGoal
      ),
      hydrationStreak: calculateHydrationStreak(calendarData, waterGoal),

      // Variety
      uniqueFoodsThisWeek: calculateUniqueFoods(
        trends?.weekSummaries,
        weeklyFoodLogs || todayData.foodLogs
      ),

      // Patterns (would need orchestrator data)
      patternsDiscovered: 0,
      newPatternToday: false,

      // Trends
      vsLastWeekChange: 0,

      // Context for shouldShow check
      goalProgress:
        goals?.dailyCalories > 0
          ? ((todayData.nutrition?.totalCalories || 0) / goals.dailyCalories) * 100
          : 50,
      justLostStreak: false,
    };
  }, [dashboardData, gamification, goals, calendarData, weeklyFoodLogs, levelUpInfo]);

  // Check dismissal state and determine if we should show
  useEffect(() => {
    const checkShowState = async () => {
      // Check if user dismissed recently
      const dismissedAt = await getItem(DISMISSED_KEY);
      if (dismissedAt) {
        const hoursSinceDismiss =
          (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (hoursSinceDismiss < DISMISS_DURATION_HOURS) {
          setIsDismissed(true);
          setShouldShow(false);
          return;
        }
      }

      setIsDismissed(false);

      // Check if we should show based on metrics
      if (!metrics) {
        setShouldShow(false);
        return;
      }

      const lastShown = await getLastMomentumShown();
      const shouldDisplay = await shouldShowMomentumCard({
        ...metrics,
        lastMomentumShown: lastShown,
      });

      setShouldShow(shouldDisplay);
    };

    checkShowState();
  }, [metrics]);

  // Handle dismissal
  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    setShouldShow(false);
    await setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  // Don't render if conditions not met
  if (!metrics || isDismissed || !shouldShow) {
    return null;
  }

  return (
    <MomentumCard
      // Gamification
      streak={metrics.streak}
      level={metrics.level}
      xp={metrics.xp}
      justLeveledUp={metrics.justLeveledUp}
      newLevel={metrics.newLevel}
      // Nutrition
      calorieProgress={metrics.calorieProgress}
      macroBalance={metrics.macroBalance}
      weeklyComplianceDays={metrics.weeklyComplianceDays}
      complianceImprovement={metrics.complianceImprovement}
      // Hydration
      hydrationProgress={metrics.hydrationProgress}
      hydrationStreak={metrics.hydrationStreak}
      // Variety
      uniqueFoodsThisWeek={metrics.uniqueFoodsThisWeek}
      // Patterns
      patternsDiscovered={metrics.patternsDiscovered}
      newPatternToday={metrics.newPatternToday}
      // Trends
      vsLastWeekChange={metrics.vsLastWeekChange}
      // Callbacks
      onDismiss={handleDismiss}
      onViewProgress={onViewProgress}
    />
  );
}
