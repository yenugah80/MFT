import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  calculateWeeklyGoalProgress,
  getActivityBreakdown,
  getSevenDayTrend,
  getTopExercises,
  generateActivityRecommendations,
  calculateActivityStreak,
} from '../utils/activityAnalytics';

const { width } = Dimensions.get('window');

/**
 * Activity Insights View
 * Shows comprehensive analytics, trends, and recommendations for activities
 */
export default function ActivityInsightsView({ activities, onLogWorkout }) {
  // Calculate all insights
  const weeklyProgress = calculateWeeklyGoalProgress(activities);
  const breakdown = getActivityBreakdown(activities);
  const trend = getSevenDayTrend(activities);
  const topExercises = getTopExercises(activities, 5);
  const streak = calculateActivityStreak(activities);
  const recommendations = generateActivityRecommendations(activities);

  // Helper to get percentage color
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#10B981'; // Success Green
    if (percentage >= 80) return '#F59E0B'; // Almost There Orange
    if (percentage >= 50) return '#8B5CF6'; // Motivated Purple
    return '#3B82F6'; // Let's Go Blue - Universal energy
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Weekly Summary Card */}
      <LinearGradient
        colors={[getProgressColor(weeklyProgress.percentage), getProgressColor(weeklyProgress.percentage) + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>This Week's Performance</Text>

        {/* Progress Ring */}
        <View style={styles.progressRing}>
          <View style={styles.progressRingInner}>
            <Text style={styles.progressPercentage}>{Math.round(weeklyProgress.percentage)}%</Text>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatRow}>
            <Ionicons name="flame" size={20} color="#fff" />
            <Text style={styles.summaryStatText}>
              {weeklyProgress.calories} / {weeklyProgress.goal} kcal
            </Text>
          </View>
          <View style={styles.summaryStatRow}>
            <Ionicons name="fitness" size={20} color="#fff" />
            <Text style={styles.summaryStatText}>
              {weeklyProgress.workoutCount} / {weeklyProgress.workoutGoal} workouts
            </Text>
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationBadge}>
          <Ionicons
            name={weeklyProgress.percentage >= 100 ? 'trophy' : weeklyProgress.percentage >= 80 ? 'flame' : 'trending-up'}
            size={16}
            color="#fff"
          />
          <Text style={styles.motivationText}>
            {weeklyProgress.percentage >= 100
              ? 'Amazing! Goal achieved! 🎉'
              : weeklyProgress.percentage >= 80
              ? 'Almost there! Keep pushing!'
              : weeklyProgress.percentage >= 50
              ? 'Great progress this week!'
              : 'Let\'s boost your activity!'}
          </Text>
        </View>
      </LinearGradient>

      {/* Activity Streak */}
      {streak.current > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="flame" size={24} color="#EF4444" />
              <Text style={styles.cardTitle}>Activity Streak</Text>
            </View>
          </View>
          <View style={styles.streakContent}>
            <View style={styles.streakBox}>
              <Text style={styles.streakNumber}>{streak.current}</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakBox}>
              <Text style={styles.streakNumber}>{streak.longest}</Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
            </View>
          </View>
          {streak.current >= 3 && (
            <Text style={styles.streakCongrats}>
              🔥 {streak.current} days in a row! Keep it up!
            </Text>
          )}
        </View>
      )}

      {/* Activity Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Calories by Category</Text>
          </View>
          <View style={styles.breakdownList}>
            {Object.entries(breakdown).map(([category, data], index) => (
              <View key={category} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: getCategoryColor(index) }]} />
                  <Text style={styles.breakdownCategory}>{category}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownCalories}>{Math.round(data.calories)} kcal</Text>
                  <Text style={styles.breakdownPercentage}>{data.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 7-Day Trend */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>7-Day Activity Trend</Text>
          <View style={[styles.trendBadge, { backgroundColor: trend.trend === 'up' ? '#10B98120' : trend.trend === 'down' ? '#EF444420' : '#94A3B820' }]}>
            <Ionicons
              name={trend.trend === 'up' ? 'trending-up' : trend.trend === 'down' ? 'trending-down' : 'remove'}
              size={16}
              color={trend.trend === 'up' ? '#10B981' : trend.trend === 'down' ? '#EF4444' : '#94A3B8'}
            />
            <Text style={[styles.trendText, { color: trend.trend === 'up' ? '#10B981' : trend.trend === 'down' ? '#EF4444' : '#94A3B8' }]}>
              {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage}%
            </Text>
          </View>
        </View>

        {/* Simple Bar Chart */}
        <View style={styles.chartContainer}>
          {trend.days.map((day, index) => {
            const maxCalories = Math.max(...trend.days.map(d => d.calories), 1);
            const heightPercentage = (day.calories / maxCalories) * 100;
            // Vibrant color coding based on activity level
            const barColor = day.isToday
              ? '#3B82F6' // Today - Electric Blue (universal energy)
              : day.calories > 300
              ? '#10B981' // High - Green
              : day.calories > 150
              ? '#F59E0B' // Medium - Orange
              : day.calories > 0
              ? '#8B5CF6' // Light - Purple
              : '#E5E7EB'; // Rest - Gray

            return (
              <View key={index} style={styles.chartBar}>
                <View style={styles.chartBarInner}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${heightPercentage}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.chartBarLabel,
                  day.isToday && { color: '#3B82F6', fontWeight: '800' }
                ]}>
                  {day.dayName}
                </Text>
                <Text style={styles.chartBarValue}>{day.calories}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.trendComparison}>
          {trend.thisWeekTotal} kcal this week vs {trend.prevWeekTotal} kcal last week
        </Text>
      </View>

      {/* Top Exercises */}
      {topExercises.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top Exercises</Text>
          </View>
          <View style={styles.exerciseList}>
            {topExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={styles.exerciseRank}>
                  <Text style={styles.exerciseRankText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseIconContainer}>
                  <Ionicons name={exercise.icon} size={20} color="#6366F1" />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseStats}>
                    {exercise.count}x • {Math.round(exercise.totalDuration)} min • {Math.round(exercise.totalCalories)} kcal
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
              <Text style={styles.cardTitle}>Personalized Insights</Text>
            </View>
          </View>
          <View style={styles.recommendationsList}>
            {recommendations.map((rec, index) => (
              <View key={index} style={[styles.recommendationCard, { borderLeftColor: rec.color || '#6366F1' }]}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name={rec.icon} size={20} color={rec.color || '#6366F1'} />
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                </View>
                <Text style={styles.recommendationMessage}>{rec.message}</Text>
                {rec.action && onLogWorkout && (
                  <TouchableOpacity
                    style={styles.recommendationButton}
                    onPress={onLogWorkout}
                  >
                    <Text style={styles.recommendationButtonText}>{rec.action}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#6366F1" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {activities.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Activity Data Yet</Text>
          <Text style={styles.emptyText}>
            Start logging your workouts to see insights and trends!
          </Text>
          {onLogWorkout && (
            <TouchableOpacity style={styles.emptyButton} onPress={onLogWorkout}>
              <Text style={styles.emptyButtonText}>Log Your First Workout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// Helper function to get category colors - vibrant fitness palette
const getCategoryColor = (index) => {
  const colors = [
    '#10B981', // Emerald Green - Cardio
    '#F59E0B', // Amber - Strength
    '#8B5CF6', // Purple - Yoga
    '#EC4899', // Pink - Sports
    '#3B82F6', // Blue - Swimming
    '#EF4444', // Red - HIIT
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Lighter, brighter background
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  progressRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressRingInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  summaryStats: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  summaryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summaryStatText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  motivationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  motivationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  streakBox: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#EF4444',
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  streakCongrats: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    backgroundColor: '#10B98110',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  breakdownPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 40,
    textAlign: 'right',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    marginBottom: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBarInner: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  trendComparison: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseRankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6366F1',
  },
  exerciseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  exerciseStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  recommendationMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  recommendationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
