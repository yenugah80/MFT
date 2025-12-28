/**
 * MealMoodCalendar.jsx
 * 
 * A multi-persona calendar component connecting nutrition, hydration, and mood.
 * Features:
 * - Compact summary view vs Full monthly grid
 * - "Heatmap" style cell coloring based on daily score
 * - Bottom sheet details for specific days
 * - Persona-based insights (Story lines)
 * - Share functionality for daily stories
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './dashboard/GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC,
  SHADOWS
} from '../constants/premiumTheme';
import { generateStoryLine } from '../utils/healthCalculations';
import { formatDateLocal } from '../utils/dateHelpers';

const { width } = Dimensions.get('window');
const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
      const score = selectedDay.foodMoodScore ? `Daily Score: ${selectedDay.foodMoodScore}/100` : "";
      
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
    <GlassCard padding="md" style={styles.container}>
      {/* COMPACT HEADER ROW */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>
            This Month · <Text style={{ color: BRAND.primary }}>{loggedDaysCount}/{totalDays}</Text> logged
          </Text>
          <Text style={styles.headerSubtitle}>
            Current streak: <Text style={{ fontWeight: 'bold' }}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>{expanded ? 'Close' : 'Open Calendar'}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-forward"} size={16} color={BRAND.primary} />
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
                      Daily Score: <Text style={{ color: BRAND.primary }}>{selectedDay.foodMoodScore || '-'}/100</Text>
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
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  expandButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  
  // Calendar Grid
  calendarContainer: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  weekDayText: {
    width: (width - 80) / 7,
    textAlign: 'center',
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 6,
  },
  dayCell: {
    width: (width - 90) / 7,
    height: (width - 90) / 7,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  dayText: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  todayText: {
    color: BRAND.primary,
    fontWeight: 'bold',
  },
  cellIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: TEXT.tertiary,
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: SURFACES.card.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING[6],
    ...SHADOWS.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  sheetDate: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  sheetScore: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  moodBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: `${BRAND.primary}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[5],
  },
  storyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primaryDark,
    flex: 1,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[6],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  actionButton: {
    flex: 1,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
  },
  shareButtonText: {
    color: BRAND.primary,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: SURFACES.background.tertiary,
  },
  closeButtonText: {
    color: TEXT.primary,
    fontWeight: '600',
  },
});
