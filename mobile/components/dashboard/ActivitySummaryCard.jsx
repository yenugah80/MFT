import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useActivityLog } from '../../hooks/useActivityLog';
import { getAdjustedCalorieGoal } from '../../utils/activityNutrition';
import { TEXT, SURFACES, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, SEMANTIC, BRAND } from '../../constants/premiumTheme';

/**
 * Activity Summary Card for Dashboard
 * Shows today's workout stats and weekly progress
 */
export default function ActivitySummaryCard() {
  const router = useRouter();

  // Use the useActivityLog hook to get real activity data from the backend
  const {
    todaySummary,
    activities,
    weeklyProgress,
    isTodayLoading: loading
  } = useActivityLog();

  const handleViewInsights = () => {
    Haptics.selectionAsync();
    router.push('/insights/activity-analytics');
  };

  // Get today's stats from the hook
  const todayCalories = todaySummary.totalCalories || 0;
  const todayDuration = todaySummary.totalMinutes || 0;
  const todayActivityCount = todaySummary.activityCount || 0;

  // Calculate earned food calories from activity
  const calorieAdjustment = useMemo(() => {
    if (!activities || activities.length === 0) return null;

    // Transform activities to format expected by getAdjustedCalorieGoal
    const formattedActivities = activities.map(activity => ({
      type: activity.type || activity.activityType || 'general',
      durationMinutes: activity.durationMinutes || activity.duration || 0,
      intensity: activity.intensity || 'moderate',
    }));

    // Use a base of 2000 cal (this is just for calculation, actual goal comes from user profile)
    const result = getAdjustedCalorieGoal(2000, formattedActivities);
    return result;
  }, [activities]);

  // Calculate weekly progress percentage (minutes-based)
  const weeklyProgressPercent = Math.round((weeklyProgress.progress || 0));
  const weeklyMinutes = weeklyProgress.weeklyMinutes || 0;
  const weeklyTarget = weeklyProgress.target || 150;

  // Get progress color (using brand purple)
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#10B981';
    if (percentage >= 80) return BRAND.primary;
    if (percentage >= 50) return BRAND.primaryLight;
    return TEXT.tertiary;
  };

  const progressColor = getProgressColor(weeklyProgressPercent);

  return (
    <TouchableOpacity style={styles.container} onPress={handleViewInsights} activeOpacity={0.9}>
      <LinearGradient
        colors={['#F5F3FF', '#EEE8FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="fitness" size={20} color={BRAND.primary} />
            <Text style={styles.title}>Activity</Text>
          </View>
          <View style={styles.insightsBadge}>
            <Ionicons name="sparkles" size={12} color={BRAND.primary} />
            <Text style={styles.insightsBadgeText}>Insights</Text>
          </View>
        </View>

        {/* Today's Stats */}
        <View style={styles.todayStats}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{Math.round(todayCalories)}</Text>
            <Text style={styles.statLabel}>kcal today</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{todayDuration}</Text>
            <Text style={styles.statLabel}>min active</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="barbell" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{todayActivityCount}</Text>
            <Text style={styles.statLabel}>workout{todayActivityCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Earned Food Calories Banner - Only show if activity earned extra calories */}
        {calorieAdjustment?.extraCaloriesEarned > 0 && (
          <View style={styles.earnedCaloriesBanner}>
            <View style={styles.earnedCaloriesIcon}>
              <Ionicons name="restaurant" size={18} color="#10B981" />
            </View>
            <View style={styles.earnedCaloriesContent}>
              <Text style={styles.earnedCaloriesTitle}>
                +{calorieAdjustment.extraCaloriesEarned} cal earned
              </Text>
              <Text style={styles.earnedCaloriesSubtitle}>
                Extra food calories from today's activity
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
          </View>
        )}

        {/* Weekly Progress */}
        <View style={styles.weeklySection}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>Week Progress</Text>
            <View style={[styles.progressBadge, { backgroundColor: progressColor + '20' }]}>
              <Text style={[styles.progressPercentage, { color: progressColor }]}>
                {weeklyProgressPercent}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(weeklyProgressPercent, 100)}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {weeklyMinutes} / {weeklyTarget} min
            </Text>
          </View>

          {/* Quick Insight */}
          {weeklyProgressPercent >= 100 ? (
            <View style={styles.insightRow}>
              <Ionicons name="trophy" size={16} color="#F59E0B" />
              <Text style={styles.insightText}>Goal achieved! Keep it up!</Text>
            </View>
          ) : weeklyProgressPercent >= 80 ? (
            <View style={styles.insightRow}>
              <Ionicons name="flame" size={16} color="#F59E0B" />
              <Text style={styles.insightText}>
                {weeklyProgress.remaining || (weeklyTarget - weeklyMinutes)} min to go!
              </Text>
            </View>
          ) : (
            <View style={styles.insightRow}>
              <Ionicons name="trending-up" size={16} color={TEXT.tertiary} />
              <Text style={styles.insightText}>
                {weeklyProgress.onTrack ? 'You\'re on track this week!' : `${weeklyMinutes} min active this week`}
              </Text>
            </View>
          )}
        </View>

      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: `${BRAND.primary}30`,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  insightsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  insightsBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: `${BRAND.primary}30`,
  },
  weeklySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  weeklyTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  progressBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  progressBarContainer: {
    marginBottom: SPACING[2],
  },
  progressBarBg: {
    height: 8,
    backgroundColor: `${BRAND.primary}20`,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: `${BRAND.primary}25`,
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    flex: 1,
  },
  // Earned Calories Banner Styles
  earnedCaloriesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginTop: SPACING[3],
    borderWidth: 1,
    borderColor: '#10B98130',
    gap: SPACING[3],
  },
  earnedCaloriesIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedCaloriesContent: {
    flex: 1,
  },
  earnedCaloriesTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#059669',
  },
  earnedCaloriesSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },
});
