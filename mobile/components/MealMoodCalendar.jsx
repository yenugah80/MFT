/**
 * MealMoodCalendar.jsx - Premium Monthly Wellness Calendar
 *
 * Luxurious design with:
 * - Premium glassmorphism styling
 * - Streak-focused hero display
 * - Animated interactions
 * - Rich day details with Lottie mood icons
 * - Share functionality for daily stories
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC,
  SEMANTIC_ACTIONS,
} from '../constants/premiumTheme';
import { generateStoryLine } from '../utils/healthCalculations';
import { formatDateLocal } from '../utils/dateHelpers';

const { width } = Dimensions.get('window');
const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Helper to extract score value from foodMoodScore (can be object with .score or a number)
function getScoreValue(foodMoodScore) {
  if (foodMoodScore && typeof foodMoodScore === 'object' && 'score' in foodMoodScore) {
    return foodMoodScore.score || 0;
  }
  return typeof foodMoodScore === 'number' ? foodMoodScore : 0;
}

// Helper to get color based on score/status
const getDayStatusColor = (day) => {
  if (!day.logged) return SURFACES.background.tertiary; // Gray/Empty

  // Red: Over calorie goal significantly OR very low mood
  const hasCaloricData = day.calories > 0;
  const missedGoal = day.goalReached === false && hasCaloricData;
  const lowMood = day.moodAvg != null && day.moodAvg < 3;

  if (missedGoal || lowMood) {
    return `${SEMANTIC.danger.base}20`; // Low opacity red
  }

  // Amber: Partial data (e.g. only food, no mood)
  if (day.moodAvg == null || day.hydrationPercent == null) {
    return `${SEMANTIC.warning.base}20`;
  }

  // Green: On track
  return `${SEMANTIC.success.base}20`;
};

const getBorderColor = (day) => {
  if (!day.logged) return 'transparent';
  if (day.goalReached) return SEMANTIC.success.base;
  if (day.moodAvg && day.moodAvg < 3) return SEMANTIC.danger.base;
  return 'transparent';
};

export default function MealMoodCalendar({ data = {}, currentStreak = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Memoize story text to avoid regenerating on every render
  const storyText = useMemo(() => {
    return selectedDay?.storyLine || (selectedDay ? generateStoryLine(selectedDay) : '');
  }, [selectedDay]);

  // Generate calendar grid (current month)
  const calendarGrid = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDayIndex = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

    const grid = [];
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;

    // Empty slots for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push({ empty: true, key: `${monthKey}-empty-${i}` });
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      const key = formatDateLocal(date); // Fixed: Use local timezone instead of UTC
      const dayData = data[key] || {
        calories: 0,
        meals: 0,
        goalReached: false,
        moodAvg: null,
        hydrationPercent: null,
        logged: false,
        foodMoodScore: null,
        storyLine: null
      };

      grid.push({
        day: i,
        key,
        isToday: i === today.getDate(),
        ...dayData
      });
    }
    return grid;
  }, [data]);

  const loggedDaysCount = calendarGrid.filter(d => d.logged).length;
  const totalDays = new Date().getDate(); // Days passed in month so far

  const handleShareStory = async () => {
    if (!selectedDay) return;
    try {
      const dateStr = new Date(selectedDay.key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const story = selectedDay.storyLine || (selectedDay.logged ? "Tracked my nutrition and wellness." : "No data logged.");
      const scoreVal = getScoreValue(selectedDay.foodMoodScore);
      const score = scoreVal ? `Daily Score: ${scoreVal}/100` : "";
      
      const message = `📅 My Daily Wellness - ${dateStr}\n\n"${story}"\n\n${score}\n\nTracked with My-Food-Tracker 🥗`;
      
      await Share.share({
        message,
      });
    } catch (error) {
      console.log('Error sharing story:', error);
    }
  };

  const renderDayCell = (dayObj) => {
    if (dayObj.empty) return <View style={styles.dayCell} key={dayObj.key} />;

    const bgColor = getDayStatusColor(dayObj);
    const borderColor = getBorderColor(dayObj);

    return (
      <TouchableOpacity
        key={dayObj.key}
        style={[
          styles.dayCell,
          { backgroundColor: bgColor, borderColor, borderWidth: borderColor !== 'transparent' ? 1 : 0 },
          dayObj.isToday && styles.todayCell
        ]}
        onPress={() => setSelectedDay(dayObj)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dayText, dayObj.isToday && styles.todayText]}>{dayObj.day}</Text>
        
        <View style={styles.cellIndicators}>
          {dayObj.moodAvg && (
            <View style={[styles.dot, { backgroundColor: dayObj.moodAvg >= 3.5 ? SEMANTIC.success.base : SEMANTIC.warning.base }]} />
          )}
          {dayObj.hydrationPercent >= 80 && (
            <View style={[styles.dot, { backgroundColor: SEMANTIC.info.base }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* PREMIUM HEADER - Streak focused */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Monthly Progress</Text>
          <Text style={styles.headerSubtitle}>
            <Text style={styles.streakHighlight}>{loggedDaysCount}</Text> of {totalDays} days logged
          </Text>
        </View>

        {/* Streak Badge - Hero element */}
        {currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#EF4444" />
            <Text style={styles.streakBadgeText}>{currentStreak} day streak</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
        >
          <Ionicons name={expanded ? "chevron-up" : "calendar-outline"} size={16} color={BRAND.primary} />
          <Text style={styles.expandButtonText}>{expanded ? 'Close' : 'View'}</Text>
        </TouchableOpacity>
      </View>

      {/* EXPANDED CALENDAR GRID */}
      {expanded && (
        <View style={styles.calendarContainer}>
          {/* Days Header */}
          <View style={styles.weekHeader}>
            {DAYS_OF_WEEK.map((d, i) => (
              <Text key={i} style={styles.weekDayText}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {calendarGrid.map(renderDayCell)}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SEMANTIC.success.base }]} />
              <Text style={styles.legendText}>On Track</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SEMANTIC.warning.base }]} />
              <Text style={styles.legendText}>Partial</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SEMANTIC.danger.base }]} />
              <Text style={styles.legendText}>Off Track</Text>
            </View>
          </View>
        </View>
      )}

      {/* DAY DETAIL MODAL (Bottom Sheet Simulation) */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedDay(null)} />
          
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            
            {selectedDay && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetDate}>
                      {selectedDay.key ? (() => {
                        // Parse ISO date string (YYYY-MM-DD) in local timezone to avoid off-by-one errors
                        const [year, month, day] = selectedDay.key.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                      })() : 'Unknown Date'}
                    </Text>
                    <Text style={styles.sheetScore}>
                      Daily Score: <Text style={{ color: BRAND.primary }}>{getScoreValue(selectedDay.foodMoodScore) || '-'}/100</Text>
                    </Text>
                  </View>
                  {selectedDay.moodAvg && (
                    <View style={styles.moodBadge}>
                      <Text style={{ fontSize: 24 }}>
                        {selectedDay.moodAvg >= 4 ? '😊' : selectedDay.moodAvg >= 2.5 ? '😐' : '😔'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.storyLine}>
                  <Ionicons name="sparkles" size={16} color={BRAND.primary} />
                  <Text style={styles.storyText}>
                    {storyText}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Calories</Text>
                    <Text style={styles.statValue}>{selectedDay.calories}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Hydration</Text>
                    <Text style={styles.statValue}>{Math.round(selectedDay.hydrationPercent || 0)}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Meals</Text>
                    <Text style={styles.statValue}>{selectedDay.meals}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.shareButton]}
                    onPress={handleShareStory}
                  >
                    <Ionicons name="share-social-outline" size={20} color={BRAND.primary} />
                    <Text style={styles.shareButtonText}>Share Story</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.closeButton]}
                    onPress={() => setSelectedDay(null)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Premium Card Container
  container: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS['2xl'],
    backgroundColor: '#FFFFFF',
    // Luxurious purple shadow
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
    overflow: 'hidden',
  },

  // Header Section - Streak focused
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[3],
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 4,
  },
  streakHighlight: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Streak Badge - Hero element
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  streakBadgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#EF4444',
  },

  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
  },
  expandButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Calendar Grid - Premium styling
  calendarContainer: {
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[4],
    backgroundColor: `${SEMANTIC_ACTIONS.success}05`,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}14`,
    marginBottom: SPACING[2],
  },
  weekDayText: {
    width: (width - 80) / 7,
    textAlign: 'center',
    fontSize: 11,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  dayCell: {
    width: (width - 86) / 7,
    height: (width - 86) / 7,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: BRAND.primary,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  dayText: {
    fontSize: 13,
    color: TEXT.secondary,
    fontWeight: '600',
  },
  todayText: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  cellIndicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Legend - Premium styling
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: `${SEMANTIC_ACTIONS.success}14`,
    marginTop: SPACING[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.sm,
  },
  legendText: {
    fontSize: 11,
    color: TEXT.secondary,
    fontWeight: '500',
  },

  // Bottom Sheet Modal - Premium styling
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING[6],
    // Premium shadow
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: `${SEMANTIC_ACTIONS.success}33`,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: SPACING[5],
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  sheetDate: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  sheetScore: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 4,
  },
  moodBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
  },
  storyLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}0F`,
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[5],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  storyText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[6],
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  actionButton: {
    flex: 1,
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderWidth: 1.5,
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
  },
  shareButtonText: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontSize: TYPOGRAPHY.size.base,
  },
  closeButton: {
    backgroundColor: BRAND.primary,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.bold,
    fontSize: TYPOGRAPHY.size.base,
  },
});
