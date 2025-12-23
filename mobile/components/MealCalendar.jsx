/**
 * ============================================================================
 * MealCalendar - Monthly Food Logging Tracker
 * ============================================================================
 * Premium calendar view showing:
 * - Daily calorie intake as heat map
 * - Streak visualization
 * - Goal achievement indicators
 * - Tap to see daily details
 *
 * Design Principles:
 * - Tufte: Small multiples for easy comparison
 * - Visual hierarchy: Most important = today + current week
 * - Color coding: Green (under goal) → Yellow (at goal) → Red (over goal)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  BRAND,
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
} from '../constants/premiumTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get days in month
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Get first day of month (0 = Sunday, 6 = Saturday)
 */
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * Get color based on calorie intake vs goal
 */
const getCalorieColor = (calories, goal) => {
  if (!calories || calories === 0) return 'rgba(107, 78, 255, 0.1)'; // No data

  const ratio = calories / goal;

  if (ratio < 0.7) return 'rgba(59, 130, 246, 0.3)'; // Under goal (blue)
  if (ratio < 0.9) return 'rgba(16, 185, 129, 0.5)'; // Close to goal (green)
  if (ratio <= 1.1) return 'rgba(16, 185, 129, 0.8)'; // At goal (strong green)
  if (ratio <= 1.3) return 'rgba(245, 158, 11, 0.6)'; // Slightly over (yellow)
  return 'rgba(239, 68, 68, 0.6)'; // Over goal (red)
};

/**
 * Get intensity based on value
 */
const getIntensity = (value, max) => {
  if (!value || !max) return 0;
  return Math.min(value / max, 1);
};

/**
 * Check if date is today
 */
const isToday = (year, month, day) => {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
};

/**
 * Check if date is in current week
 */
const isCurrentWeek = (year, month, day) => {
  const date = new Date(year, month, day);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week
  weekEnd.setHours(23, 59, 59, 999);

  return date >= weekStart && date <= weekEnd;
};

// ============================================================================
// DAY CELL COMPONENT
// ============================================================================

const DayCell = ({ day, data, goal, isToday, isCurrentWeek, onPress }) => {
  const calories = data?.calories || 0;
  const logged = calories > 0;
  const color = getCalorieColor(calories, goal);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        isToday && styles.dayCellToday,
        isCurrentWeek && styles.dayCellCurrentWeek,
      ]}
      onPress={() => onPress(day, data)}
      activeOpacity={0.7}
    >
      <View style={[styles.dayContent, { backgroundColor: color }]}>
        <Text
          style={[
            styles.dayNumber,
            isToday && styles.dayNumberToday,
            !logged && styles.dayNumberEmpty,
          ]}
        >
          {day}
        </Text>
        {logged && (
          <View style={styles.dayIndicator}>
            <View style={[styles.dayDot, data.goalReached && styles.dayDotSuccess]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MealCalendar({
  data = {},           // { '2025-01-15': { calories: 2000, goalReached: true, meals: 3 } }
  calorieGoal = 2000,
  onDayPress,
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Calculate calendar data
  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    // Create array with empty cells for days before month starts
    const cells = Array(firstDay).fill(null);

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        data: data[dateKey] || null,
        isToday: isToday(currentYear, currentMonth, day),
        isCurrentWeek: isCurrentWeek(currentYear, currentMonth, day),
      });
    }

    return cells;
  }, [currentYear, currentMonth, data]);

  // Statistics
  const stats = useMemo(() => {
    const monthData = Object.entries(data).filter(([dateKey]) => {
      const [year, month] = dateKey.split('-').map(Number);
      return year === currentYear && month === currentMonth + 1;
    });

    const totalDays = monthData.length;
    const goalDays = monthData.filter(([, d]) => d.goalReached).length;
    const avgCalories = totalDays > 0
      ? monthData.reduce((sum, [, d]) => sum + (d.calories || 0), 0) / totalDays
      : 0;

    // Calculate streak
    let streak = 0;
    const sortedDates = monthData.map(([date]) => date).sort().reverse();
    const todayKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (sortedDates[0] === todayKey) {
      for (const dateKey of sortedDates) {
        if (data[dateKey]?.calories > 0) {
          streak++;
        } else {
          break;
        }
      }
    }

    return { totalDays, goalDays, avgCalories, streak };
  }, [data, currentYear, currentMonth]);

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayPress = (day, data) => {
    if (onDayPress) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onDayPress(dateKey, data);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* ──────────────────────────────────────────── */}
      {/* HEADER */}
      {/* ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handlePreviousMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={ICON_SIZES.md} color={BRAND.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.monthName}>{monthName}</Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleNextMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={ICON_SIZES.md} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* ──────────────────────────────────────────── */}
      {/* STATISTICS */}
      {/* ──────────────────────────────────────────── */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalDays}</Text>
          <Text style={styles.statLabel}>Days Logged</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Ionicons name="flame" size={ICON_SIZES.sm} color={SEMANTIC.warning.base} />
          </View>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(stats.avgCalories)}</Text>
          <Text style={styles.statLabel}>Avg Calories</Text>
        </View>
      </View>

      {/* ──────────────────────────────────────────── */}
      {/* WEEKDAY HEADERS */}
      {/* ──────────────────────────────────────────── */}
      <View style={styles.weekdayContainer}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* ──────────────────────────────────────────── */}
      {/* CALENDAR GRID */}
      {/* ──────────────────────────────────────────── */}
      <View style={styles.calendar}>
        {calendarData.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          return (
            <DayCell
              key={`day-${cell.day}`}
              day={cell.day}
              data={cell.data}
              goal={calorieGoal}
              isToday={cell.isToday}
              isCurrentWeek={cell.isCurrentWeek}
              onPress={handleDayPress}
            />
          );
        })}
      </View>

      {/* ──────────────────────────────────────────── */}
      {/* LEGEND */}
      {/* ──────────────────────────────────────────── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(16, 185, 129, 0.8)' }]} />
          <Text style={styles.legendText}>At Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(245, 158, 11, 0.6)' }]} />
          <Text style={styles.legendText}>Over Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(59, 130, 246, 0.3)' }]} />
          <Text style={styles.legendText}>Under Goal</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.md,
  },

  // ──────────────────────────────────────────────
  // HEADER
  // ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  navButton: {
    padding: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },

  // ──────────────────────────────────────────────
  // STATISTICS
  // ──────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.2)',
  },

  // ──────────────────────────────────────────────
  // WEEKDAYS
  // ──────────────────────────────────────────────
  weekdayContainer: {
    flexDirection: 'row',
    marginBottom: SPACING[2],
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  weekdayText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
  },

  // ──────────────────────────────────────────────
  // CALENDAR
  // ──────────────────────────────────────────────
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING[4],
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCellToday: {
    // Today gets special treatment with border
  },
  dayCellCurrentWeek: {
    // Current week gets subtle highlight
  },
  dayContent: {
    flex: 1,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumber: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  dayNumberToday: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.black,
    fontSize: TYPOGRAPHY.size.md,
  },
  dayNumberEmpty: {
    color: TEXT.muted,
  },
  dayIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: BRAND.primary,
  },
  dayDotSuccess: {
    backgroundColor: SEMANTIC.success.base,
  },

  // ──────────────────────────────────────────────
  // LEGEND
  // ──────────────────────────────────────────────
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.sm,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
