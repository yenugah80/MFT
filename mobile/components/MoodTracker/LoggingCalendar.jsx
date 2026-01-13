/**
 * Logging Calendar - Visual calendar showing mood and meal logging patterns
 *
 * Features:
 * - Heat map visualization of mood intensity
 * - Indicators for meal and water logs
 * - Pattern recognition (streaks, gaps)
 * - Interactive day selection
 * - Supports 7, 30, 60-day views
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SHADOWS, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

/**
 * Mood color mapping (aligned with MoodIcon3D)
 */
const MOOD_COLORS = {
  energized: { base: '#FF6B35', light: '#FFE5DD' },
  happy: { base: '#FFD23F', light: '#FFF6D9' },
  calm: { base: '#06D6A0', light: '#D4F8EF' },
  neutral: { base: '#9E9E9E', light: '#F0F0F0' },
  anxious: { base: '#8338EC', light: '#F0E6FF' },
  sad: { base: '#4A90E2', light: '#E6F2FF' },
  frustrated: { base: '#EF476F', light: '#FFE6EC' },
};

/**
 * Day status types
 */
const DayStatus = {
  EMPTY: 'empty',
  MOOD_ONLY: 'mood_only',
  MEAL_ONLY: 'meal_only',
  COMPLETE: 'complete', // Both mood and meal
  FUTURE: 'future',
};

/**
 * Generate calendar data structure
 */
function generateCalendarData(moodLogs, foodLogs, waterLogs, days) {
  const calendarData = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create date map for efficient lookup
  const moodMap = new Map();
  const foodMap = new Map();
  const waterMap = new Map();

  moodLogs.forEach(log => {
    const date = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!moodMap.has(date)) moodMap.set(date, []);
    moodMap.get(date).push(log);
  });

  foodLogs.forEach(log => {
    const date = new Date(log.timestamp || log.loggedDate).toISOString().split('T')[0];
    if (!foodMap.has(date)) foodMap.set(date, []);
    foodMap.get(date).push(log);
  });

  waterLogs.forEach(log => {
    const date = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!waterMap.has(date)) waterMap.set(date, []);
    waterMap.get(date).push(log);
  });

  // Generate day objects
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayMoods = moodMap.get(dateStr) || [];
    const dayMeals = foodMap.get(dateStr) || [];
    const dayWater = waterMap.get(dateStr) || [];

    // Get primary mood (most recent if multiple)
    const primaryMood = dayMoods[0] || null;
    const moodIntensity = primaryMood?.intensity || 0;
    const moodType = primaryMood?.type || primaryMood?.moodType || 'neutral';

    // Determine status
    let status;
    if (date > today) {
      status = DayStatus.FUTURE;
    } else if (dayMoods.length > 0 && dayMeals.length > 0) {
      status = DayStatus.COMPLETE;
    } else if (dayMoods.length > 0) {
      status = DayStatus.MOOD_ONLY;
    } else if (dayMeals.length > 0) {
      status = DayStatus.MEAL_ONLY;
    } else {
      status = DayStatus.EMPTY;
    }

    calendarData.push({
      date,
      dateStr,
      dayOfMonth: date.getDate(),
      dayOfWeek: date.getDay(),
      status,
      moodCount: dayMoods.length,
      mealCount: dayMeals.length,
      waterCount: dayWater.length,
      moodIntensity,
      moodType,
      isToday: dateStr === today.toISOString().split('T')[0],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  return calendarData;
}

/**
 * Calculate streak statistics
 */
function calculateStreaks(calendarData) {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate from most recent backwards
  for (let i = calendarData.length - 1; i >= 0; i--) {
    const day = calendarData[i];

    if (day.status === DayStatus.COMPLETE || day.status === DayStatus.MOOD_ONLY || day.status === DayStatus.MEAL_ONLY) {
      tempStreak++;
      if (i === calendarData.length - 1 || calendarData[i + 1].status !== DayStatus.EMPTY) {
        currentStreak++;
      }
    } else {
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      tempStreak = 0;
      if (i < calendarData.length - 1) currentStreak = 0;
    }
  }

  if (tempStreak > longestStreak) longestStreak = tempStreak;

  // Count days with data
  const daysWithData = calendarData.filter(d => d.status !== DayStatus.EMPTY && d.status !== DayStatus.FUTURE).length;
  const totalDays = calendarData.filter(d => d.status !== DayStatus.FUTURE).length;
  const completionRate = totalDays > 0 ? (daysWithData / totalDays) * 100 : 0;

  return { currentStreak, longestStreak, completionRate, daysWithData, totalDays };
}

/**
 * Individual Day Cell Component
 */
function DayCell({ day, onPress, index }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 10,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(day);
  };

  const { status, moodIntensity, moodType, isToday } = day;

  // Determine colors based on status
  let backgroundColor, borderColor, textColor;

  if (status === DayStatus.FUTURE) {
    backgroundColor = 'transparent';
    borderColor = TEXT.tertiary + '20';
    textColor = TEXT.tertiary;
  } else if (status === DayStatus.EMPTY) {
    backgroundColor = SURFACES.background.tertiary;
    borderColor = 'transparent';
    textColor = TEXT.muted;
  } else if (status === DayStatus.COMPLETE) {
    // Full color based on mood intensity
    const color = MOOD_COLORS[moodType] || MOOD_COLORS.neutral;
    const intensity = Math.min(Math.max(moodIntensity / 10, 0.3), 1);
    backgroundColor = color.base + Math.round(intensity * 255).toString(16).padStart(2, '0');
    borderColor = color.base;
    textColor = TEXT.white;
  } else if (status === DayStatus.MOOD_ONLY) {
    const color = MOOD_COLORS[moodType] || MOOD_COLORS.neutral;
    backgroundColor = color.light;
    borderColor = color.base + '80';
    textColor = TEXT.primary;
  } else if (status === DayStatus.MEAL_ONLY) {
    backgroundColor = BRAND.primary + '20';
    borderColor = BRAND.primary + '60';
    textColor = TEXT.primary;
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.dayCell,
          { backgroundColor, borderColor, borderWidth: isToday ? 2 : 1 },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.dayText, { color: textColor, fontWeight: isToday ? '700' : '600' }]}>
          {day.dayOfMonth}
        </Text>

        {/* Indicator dots */}
        {(status === DayStatus.COMPLETE || status === DayStatus.MOOD_ONLY || status === DayStatus.MEAL_ONLY) && (
          <View style={styles.indicatorRow}>
            {day.moodCount > 0 && (
              <View style={[styles.indicator, { backgroundColor: textColor === TEXT.white ? TEXT.white + '80' : MOOD_COLORS[moodType]?.base || BRAND.primary }]} />
            )}
            {day.mealCount > 0 && (
              <View style={[styles.indicator, { backgroundColor: textColor === TEXT.white ? TEXT.white + '80' : BRAND.primary }]} />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Main Logging Calendar Component
 */
export default function LoggingCalendar({
  moodLogs = [],
  foodLogs = [],
  waterLogs = [],
  days = 30,
  onDayPress,
}) {
  const [selectedDay, setSelectedDay] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const calendarData = useMemo(() => {
    return generateCalendarData(moodLogs, foodLogs, waterLogs, days);
  }, [moodLogs, foodLogs, waterLogs, days]);

  const streaks = useMemo(() => {
    return calculateStreaks(calendarData);
  }, [calendarData]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDayPress = (day) => {
    setSelectedDay(day);
    if (onDayPress) onDayPress(day);
  };

  // Group days into weeks for layout
  const weeks = [];
  let currentWeek = [];

  // Add empty cells for days before first day of period
  const firstDay = calendarData[0];
  if (firstDay) {
    const dayOfWeek = firstDay.dayOfWeek;
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push(null);
    }
  }

  calendarData.forEach((day, index) => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6 || index === calendarData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header with stats */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={24} color={BRAND.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Logging Activity</Text>
            <Text style={styles.headerSubtitle}>{days} days view</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="flame" size={18} color={SEMANTIC_ACTIONS.success} />
          </View>
          <Text style={styles.statValue}>{streaks.currentStreak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="trophy" size={18} color={SEMANTIC_ACTIONS.warning} />
          </View>
          <Text style={styles.statValue}>{streaks.longestStreak}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={18} color={BRAND.primary} />
          </View>
          <Text style={styles.statValue}>{Math.round(streaks.completionRate)}%</Text>
          <Text style={styles.statLabel}>Completion</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS.happy.base }]} />
          <Text style={styles.legendText}>Mood</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BRAND.primary }]} />
          <Text style={styles.legendText}>Meals</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SURFACES.background.tertiary }]} />
          <Text style={styles.legendText}>Empty</Text>
        </View>
      </View>

      {/* Calendar grid */}
      <View style={styles.calendar}>
        {/* Day of week headers */}
        <View style={styles.weekHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} style={styles.weekHeaderCell}>
              <Text style={styles.weekHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Weeks */}
        <ScrollView
          style={styles.weeksContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.weeksContent}
        >
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((day, dayIndex) => (
                day ? (
                  <DayCell
                    key={day.dateStr}
                    day={day}
                    onPress={handleDayPress}
                    index={weekIndex * 7 + dayIndex}
                  />
                ) : (
                  <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.dayCell} />
                )
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Selected day detail */}
      {selectedDay && selectedDay.status !== DayStatus.FUTURE && selectedDay.status !== DayStatus.EMPTY && (
        <View style={styles.selectedDayCard}>
          <View style={styles.selectedDayHeader}>
            <View>
              <Text style={styles.selectedDayDate}>
                {selectedDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={styles.selectedDayStatus}>
                {selectedDay.status === DayStatus.COMPLETE && '✓ Complete day'}
                {selectedDay.status === DayStatus.MOOD_ONLY && 'Mood logged'}
                {selectedDay.status === DayStatus.MEAL_ONLY && 'Meals logged'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDay(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.selectedDayStats}>
            {selectedDay.moodCount > 0 && (
              <View style={styles.selectedDayStat}>
                <Ionicons name="happy-outline" size={16} color={MOOD_COLORS[selectedDay.moodType]?.base || BRAND.primary} />
                <Text style={styles.selectedDayStatText}>
                  {selectedDay.moodCount} mood • Intensity {selectedDay.moodIntensity}/10
                </Text>
              </View>
            )}
            {selectedDay.mealCount > 0 && (
              <View style={styles.selectedDayStat}>
                <Ionicons name="restaurant-outline" size={16} color={BRAND.primary} />
                <Text style={styles.selectedDayStatText}>{selectedDay.mealCount} meals logged</Text>
              </View>
            )}
            {selectedDay.waterCount > 0 && (
              <View style={styles.selectedDayStat}>
                <Ionicons name="water-outline" size={16} color={SEMANTIC_ACTIONS.info} />
                <Text style={styles.selectedDayStatText}>{selectedDay.waterCount} water logs</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Encouragement for empty days */}
      {streaks.completionRate < 50 && (
        <View style={styles.encouragementCard}>
          <Ionicons name="bulb-outline" size={20} color={SEMANTIC_ACTIONS.warning} />
          <Text style={styles.encouragementText}>
            Log daily to unlock deeper insights! {Math.round(50 - streaks.completionRate)}% more to reach 50%.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING[4],
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  calendar: {
    gap: SPACING[2],
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: SPACING[2],
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekHeaderText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  weeksContainer: {
    maxHeight: 320,
  },
  weeksContent: {
    gap: SPACING[2],
  },
  week: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  indicatorRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 2,
  },
  indicator: {
    width: 3,
    height: 3,
    borderRadius: 999,
  },
  selectedDayCard: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: SPACING[2],
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedDayDate: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  selectedDayStatus: {
    fontSize: TYPOGRAPHY.size.xs,
    color: SEMANTIC_ACTIONS.success,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING[1],
  },
  selectedDayStats: {
    gap: SPACING[2],
  },
  selectedDayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  selectedDayStatText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.warning}10`,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.warning}30`,
  },
  encouragementText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    lineHeight: 16,
  },
});
