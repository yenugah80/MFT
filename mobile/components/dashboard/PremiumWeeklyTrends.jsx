import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../../constants/premiumTheme';

// Soft color palette
const COLORS = {
  success: '#10B981',   // Green - hit goal
  warning: '#F59E0B',   // Amber - close
  neutral: '#E5E7EB',   // Gray - no data
  primary: '#6366F1',   // Indigo - accent
  streak: '#F59E0B',    // Amber - streak
};

/**
 * DayBar - Mini bar for daily performance
 */
const DayBar = ({ day, percentage, isToday }) => {
  const height = Math.max(4, Math.min(percentage, 100) * 0.4); // Scale to max 40px
  const getBarColor = () => {
    if (percentage === 0) return COLORS.neutral;
    if (percentage >= 90 && percentage <= 110) return COLORS.success;
    if (percentage >= 70) return COLORS.warning;
    return '#94A3B8'; // Slate for under
  };

  return (
    <View style={styles.dayBarContainer}>
      <View style={styles.dayBarWrapper}>
        <View
          style={[
            styles.dayBar,
            {
              height,
              backgroundColor: getBarColor(),
            },
            isToday && styles.dayBarToday,
          ]}
        />
      </View>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{day}</Text>
    </View>
  );
};

/**
 * TrendIndicator - Shows up/down trend with percentage
 */
const TrendIndicator = ({ current, previous, label }) => {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isUp = diff > 0;
  const isFlat = Math.abs(diff) < 5;

  return (
    <View style={styles.trendItem}>
      <Text style={styles.trendLabel}>{label}</Text>
      <View style={styles.trendValue}>
        {!isFlat && (
          <Ionicons
            name={isUp ? 'trending-up' : 'trending-down'}
            size={14}
            color={isUp ? COLORS.success : COLORS.warning}
          />
        )}
        <Text style={[
          styles.trendPercent,
          { color: isFlat ? '#78716C' : (isUp ? COLORS.success : COLORS.warning) }
        ]}>
          {isFlat ? 'Stable' : `${Math.abs(Math.round(diff))}%`}
        </Text>
      </View>
    </View>
  );
};

/**
 * StatBadge - Compact stat display
 */
const StatBadge = ({ icon, value, label, color }) => (
  <View style={styles.statBadge}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

export default function PremiumWeeklyTrends({ trends, goals }) {
  const weekSummaries = trends?.weekSummaries || [];
  const weeklyAvg = trends?.weeklyAverages || {};
  const streak = trends?.currentStreak || 0;

  // Calculate daily percentages for the week chart
  const dailyData = useMemo(() => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDay();
    const calorieGoal = goals?.dailyCalories || 2000;

    // Build last 7 days data
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      const summary = weekSummaries[6 - i];
      const percentage = summary
        ? (summary.totalCalories / calorieGoal) * 100
        : 0;

      result.push({
        day: days[dayIndex],
        percentage,
        isToday: i === 0,
      });
    }
    return result;
  }, [weekSummaries, goals?.dailyCalories]);

  // Calculate consistency (days within 90-110% of goal)
  const consistency = useMemo(() => {
    const calorieGoal = goals?.dailyCalories || 2000;
    let daysHitGoal = 0;
    let totalDays = 0;

    weekSummaries.forEach(summary => {
      if (summary.totalCalories > 0) {
        totalDays++;
        const pct = (summary.totalCalories / calorieGoal) * 100;
        if (pct >= 80 && pct <= 120) daysHitGoal++;
      }
    });

    return totalDays > 0 ? Math.round((daysHitGoal / totalDays) * 100) : 0;
  }, [weekSummaries, goals?.dailyCalories]);

  // Average calories for comparison
  const avgCalories = weeklyAvg.avgCalories || 0;
  const avgProtein = weeklyAvg.avgProtein || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Weekly Insights</Text>
          <Text style={styles.badge}>Last 7 Days</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatBadge
          icon="checkmark-circle"
          value={`${consistency}%`}
          label="Consistency"
          color={COLORS.success}
        />
        <StatBadge
          icon="flash"
          value={Math.round(avgCalories)}
          label="Avg cal/day"
          color={COLORS.primary}
        />
      </View>

      {/* Week Chart */}
      <View style={styles.weekChart}>
        <Text style={styles.chartLabel}>Daily Progress</Text>
        <View style={styles.barsContainer}>
          {dailyData.map((data, index) => (
            <DayBar
              key={index}
              day={data.day}
              percentage={data.percentage}
              isToday={data.isToday}
            />
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Goal hit</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Close</Text>
          </View>
        </View>
      </View>

      {/* Footer insight */}
      <View style={styles.footer}>
        <Ionicons name="bulb-outline" size={14} color="#78716C" />
        <Text style={styles.footerText}>
          {consistency >= 80
            ? 'Great consistency! Keep it up.'
            : consistency >= 50
              ? 'Building momentum. Stay focused!'
              : 'Track daily to build consistency'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  header: {
    marginBottom: SPACING[3],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: TEXT.primary,
  },
  badge: {
    fontSize: 11,
    color: '#78716C',
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    color: '#78716C',
  },

  // Week Chart
  weekChart: {
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  chartLabel: {
    fontSize: 11,
    color: '#78716C',
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 50,
    paddingHorizontal: SPACING[1],
  },
  dayBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayBarWrapper: {
    height: 40,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  dayBar: {
    width: 16,
    borderRadius: 4,
    minHeight: 4,
  },
  dayBarToday: {
    width: 20,
    borderRadius: 5,
  },
  dayLabel: {
    fontSize: 10,
    color: '#A8A29E',
    marginTop: 4,
  },
  dayLabelToday: {
    color: TEXT.primary,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#78716C',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  footerText: {
    fontSize: 12,
    color: '#78716C',
  },
});
