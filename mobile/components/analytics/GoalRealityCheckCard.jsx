/**
 * GoalRealityCheckCard - closes the loop between logged calorie intake and
 * actual weight change, framed against the user's stated goal.
 *
 * Both data sources already exist and are already wired elsewhere — this is
 * assembly, not new intelligence:
 * - weeklyAverages.avgCalories (useAnalytics.js's nutrition memo, sourced
 *   from nutrition.js's trends.weeklyAverages)
 * - GET /nutrition/weight-history (already used by app/profile/body.jsx,
 *   returns trend/changeKg computed server-side)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';
import { TEXT, SPACING, TYPOGRAPHY, CARD_SYSTEM, SEMANTIC } from '../../constants/premiumTheme';

export default function GoalRealityCheckCard({ weeklyAverages, primaryGoal, calorieGoal }) {
  const { data: weightHistory } = useQuery({
    queryKey: ['weight-history-reality-check'],
    queryFn: () => apiClient.get('/nutrition/weight-history', { params: { limit: 30 } }),
    staleTime: 5 * 60 * 1000,
  });

  // Only 'lose'/'gain' have a clear expected pace to check against — for
  // 'maintain' (or no goal set) there's no directional prediction to make.
  if (primaryGoal !== 'lose' && primaryGoal !== 'gain') return null;
  if (!weeklyAverages || !weightHistory || (weightHistory.entries || []).length < 2) return null;

  const avgCalories = weeklyAverages.avgCalories || 0;
  const changeKg = weightHistory.changeKg || 0;
  const trend = weightHistory.trend; // 'gaining' | 'losing' | 'stable'
  const isLose = primaryGoal === 'lose';
  const underBudget = avgCalories < calorieGoal;
  const behaviorMatchesGoal = isLose ? underBudget : !underBudget;
  const weightMatchesGoal = isLose ? trend === 'losing' : trend === 'gaining';

  let icon = 'analytics-outline';
  let color = SEMANTIC.info.base;
  let message;

  if (behaviorMatchesGoal && weightMatchesGoal) {
    icon = 'checkmark-circle';
    color = SEMANTIC.success.base;
    message = `You're averaging ${Math.round(avgCalories).toLocaleString()} cal/day ${isLose ? 'under' : 'over'} budget and ${isLose ? 'down' : 'up'} ${Math.abs(changeKg).toFixed(1)}kg this month — right on pace.`;
  } else if (behaviorMatchesGoal && trend === 'stable') {
    icon = 'time-outline';
    color = SEMANTIC.warning.base;
    message = `You're ${isLose ? 'under' : 'over'} budget, but weight hasn't moved yet — that's normal in the first couple weeks.`;
  } else if (behaviorMatchesGoal) {
    icon = 'help-circle-outline';
    color = SEMANTIC.warning.base;
    message = `Your weight is moving opposite to what your logged ${isLose ? 'deficit' : 'surplus'} suggests — could be water weight, worth watching.`;
  } else {
    icon = 'alert-circle-outline';
    color = SEMANTIC.warning.base;
    message = `You're averaging ${Math.round(avgCalories).toLocaleString()} cal/day, ${isLose ? 'over' : 'under'} your ${isLose ? 'lose-weight' : 'gain'} budget — that's likely why the scale hasn't matched your goal yet.`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.title}>Goal Reality Check</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
});
