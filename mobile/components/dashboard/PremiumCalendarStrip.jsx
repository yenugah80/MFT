/**
 * PremiumCalendarStrip - Unified Calendar with Day Details
 *
 * Features:
 * - Horizontal scrolling week view
 * - Month/Year navigation with swipe gestures
 * - Visual data indicators (food, mood, water dots)
 * - "View All" to see full month grid
 * - Day detail bottom sheet with full stats
 * - Streak display
 * - Premium glassmorphism design
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { generateStoryLine } from '../../utils/healthCalculations';

// Lottie mood animation sources
const MOOD_LOTTIE_SOURCES = {
  happy: require('../../constants/lottie/mood-happy.json'),
  calm: require('../../constants/lottie/mood-calm.json'),
  focused: require('../../constants/lottie/mood-focused.json'),
  energized: require('../../constants/lottie/mood-energized.json'),
  neutral: require('../../constants/lottie/mood-neutral.json'),
  tired: require('../../constants/lottie/mood-tired.json'),
  stressed: require('../../constants/lottie/mood-stressed.json'),
  sad: require('../../constants/lottie/mood-sad.json'),
};

import {
  BRAND,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 48) / 7;

// Helper to extract score value from foodMoodScore (can be object with .score or a number)
function getScoreValue(foodMoodScore) {
  if (foodMoodScore && typeof foodMoodScore === 'object' && 'score' in foodMoodScore) {
    return foodMoodScore.score || 0;
  }
  return typeof foodMoodScore === 'number' ? foodMoodScore : 0;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Get dates for a month
function getMonthDates(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];

  // Add empty slots for days before the first day
  for (let i = 0; i < firstDay.getDay(); i++) {
    dates.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

// Format date key for data lookup
function formatDateKey(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

// Single day cell
function DayCell({ date, isToday, isSelected, data, onPress, compact = false }) {
  // Hooks must be called unconditionally before any early returns
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!date) {
    return <View style={[styles.dayCell, compact && styles.dayCellCompact]} />;
  }

  const dateKey = formatDateKey(date);
  const dayData = data?.[dateKey] || {};

  // Support all field name variants from different data sources
  const hasFood = (dayData.meals > 0) || (dayData.foodCount > 0) || (dayData.calories > 0);
  const hasMood = (dayData.moodCount > 0) || (dayData.avgMood > 0) || (dayData.moodAvg > 0);
  const hasWater = (dayData.water > 0) || (dayData.hydrationPercent > 0);
  const hasAnyData = hasFood || hasMood || hasWater;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress?.(date);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.dayCell,
          compact && styles.dayCellCompact,
          isToday && styles.dayCellToday,
          isSelected && styles.dayCellSelected,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dayNumber,
          compact && styles.dayNumberCompact,
          isToday && styles.dayNumberToday,
          isSelected && styles.dayNumberSelected,
        ]}>
          {date.getDate()}
        </Text>

        {/* Data indicators - max 2 dots, or single combined for all 3 */}
        {hasAnyData && (
          <View style={styles.indicators}>
            {hasFood && hasMood && hasWater ? (
              // All 3 activities logged - show single combined indicator
              <View style={[styles.indicator, styles.indicatorCombined]} />
            ) : (
              // Show individual dots (max 2)
              <>
                {hasFood && <View style={[styles.indicator, styles.indicatorFood]} />}
                {hasMood && <View style={[styles.indicator, styles.indicatorMood]} />}
                {hasWater && <View style={[styles.indicator, styles.indicatorWater]} />}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Full month grid modal
function MonthGridModal({ visible, onClose, year, month, data, onDateSelect, onMonthChange }) {
  const dates = useMemo(() => getMonthDates(year, month), [year, month]);
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(null);

  const handlePrevMonth = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(year, month - 1, 1);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  const handleNextMonth = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(year, month + 1, 1);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header with month navigation */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {MONTHS[month]} {year}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={styles.dayLabels}>
            {DAYS.map((day, i) => (
              <Text key={i} style={styles.dayLabel}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.monthGrid}>
            {dates.map((date, index) => {
              const isToday = date &&
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

              return (
                <DayCell
                  key={index}
                  date={date}
                  isToday={isToday}
                  isSelected={selectedDate && date && formatDateKey(selectedDate) === formatDateKey(date)}
                  data={data}
                  onPress={(d) => {
                    setSelectedDate(d);
                    onDateSelect?.(d);
                  }}
                />
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.indicatorFood]} />
              <Text style={styles.legendText}>Food</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.indicatorMood]} />
              <Text style={styles.legendText}>Mood</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.indicatorWater]} />
              <Text style={styles.legendText}>Water</Text>
            </View>
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Comprehensive Wellness Stats Modal - Full day/period stats
function DayDetailModal({ visible, onClose, dayData, dateKey, allData = {} }) {
  const [selectedPeriod, setSelectedPeriod] = useState('day');

  if (!visible) return null;

  // Get Lottie source for mood display
  const getMoodLottie = (moodType, avgMood) => {
    if (moodType && MOOD_LOTTIE_SOURCES[moodType]) return MOOD_LOTTIE_SOURCES[moodType];
    if (avgMood >= 4) return MOOD_LOTTIE_SOURCES.happy;
    if (avgMood >= 2.5) return MOOD_LOTTIE_SOURCES.neutral;
    return MOOD_LOTTIE_SOURCES.sad;
  };

  const periods = [
    { key: 'day', label: 'Day' },
    { key: '30d', label: '30D' },
    { key: '60d', label: '60D' },
    { key: '90d', label: '90D' },
  ];

  // Format date for display
  const formatDate = (key) => {
    if (!key) return 'Today';
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  };

  // Calculate period stats
  const getPeriodStats = (days) => {
    const today = new Date();
    const stats = {
      totalCalories: 0, totalMeals: 0, avgMood: 0, avgHydration: 0,
      daysLogged: 0, totalDays: days, bestDay: null, moodEntries: 0,
      avgWellnessScore: 0, streakDays: 0
    };

    let moodSum = 0, hydrationSum = 0, wellnessSum = 0;
    let moodCount = 0, hydrationCount = 0, wellnessCount = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const data = allData[key];

      if (data && (data.logged || data.calories > 0)) {
        stats.daysLogged++;
        stats.totalCalories += data.calories || 0;
        stats.totalMeals += data.meals || data.foodCount || 0;

        if (data.avgMood) { moodSum += data.avgMood; moodCount++; }
        if (data.hydrationPercent || data.water) {
          hydrationSum += data.hydrationPercent || data.water || 0;
          hydrationCount++;
        }
        const scoreVal = getScoreValue(data.foodMoodScore);
        if (scoreVal > 0) { wellnessSum += scoreVal; wellnessCount++; }
        if (!stats.bestDay || scoreVal > (stats.bestDay.score || 0)) {
          stats.bestDay = { date: key, score: scoreVal };
        }
      }
    }

    stats.avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '-';
    stats.avgHydration = hydrationCount > 0 ? Math.round(hydrationSum / hydrationCount) : 0;
    stats.avgWellnessScore = wellnessCount > 0 ? Math.round(wellnessSum / wellnessCount) : 0;
    stats.avgCalories = stats.daysLogged > 0 ? Math.round(stats.totalCalories / stats.daysLogged) : 0;

    return stats;
  };

  // Get display data based on period
  const periodDays = selectedPeriod === 'day' ? 1 : selectedPeriod === '30d' ? 30 : selectedPeriod === '60d' ? 60 : 90;
  const periodStats = selectedPeriod === 'day' ? null : getPeriodStats(periodDays);

  const hasData = selectedPeriod === 'day'
    ? (dayData?.logged || dayData?.calories > 0)
    : (periodStats?.daysLogged > 0);

  // Share functionality
  const handleShare = async () => {
    try {
      let message = '';
      if (selectedPeriod === 'day') {
        const dateStr = formatDate(dateKey);
        const story = dayData?.storyLine || generateStoryLine(dayData) || 'Fresh start';
        message = `📅 ${dateStr}\n\n"${story}"\n\n🏆 Wellness: ${getScoreValue(dayData?.foodMoodScore) || '-'}/100\n🍽️ ${dayData?.calories || 0} cal\n💧 ${Math.round(dayData?.hydrationPercent || 0)}%\n😊 Mood: ${dayData?.avgMood?.toFixed(1) || '-'}/5`;
      } else {
        message = `📊 My ${periodDays}-Day Wellness Summary\n\n🏆 Avg Score: ${periodStats.avgWellnessScore}/100\n🍽️ Avg Calories: ${periodStats.avgCalories}\n💧 Avg Hydration: ${periodStats.avgHydration}%\n😊 Avg Mood: ${periodStats.avgMood}/5\n📈 ${periodStats.daysLogged}/${periodStats.totalDays} days logged`;
      }
      message += '\n\nTracked with MyFoodTracker 🥗';
      await Share.share({ message });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dayDetailStyles.overlay}>
        <TouchableOpacity style={dayDetailStyles.backdrop} onPress={onClose} />

        <ScrollView style={dayDetailStyles.sheet} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={dayDetailStyles.handle} />

          {/* Header with Close */}
          <View style={dayDetailStyles.headerRow}>
            <Text style={dayDetailStyles.title}>
              {selectedPeriod === 'day' ? formatDate(dateKey) : `Last ${periodDays} Days`}
            </Text>
            <TouchableOpacity onPress={onClose} style={dayDetailStyles.closeBtn}>
              <Ionicons name="close" size={24} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>

          {/* Period Tabs */}
          <View style={dayDetailStyles.periodTabs}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[dayDetailStyles.periodTab, selectedPeriod === p.key && dayDetailStyles.periodTabActive]}
                onPress={() => setSelectedPeriod(p.key)}
              >
                <Text style={[dayDetailStyles.periodTabText, selectedPeriod === p.key && dayDetailStyles.periodTabTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasData ? (
            <>
              {/* Wellness Score Hero */}
              <View style={dayDetailStyles.scoreHero}>
                <View style={dayDetailStyles.scoreRing}>
                  <Text style={dayDetailStyles.scoreValue}>
                    {selectedPeriod === 'day' ? getScoreValue(dayData?.foodMoodScore) : periodStats.avgWellnessScore}
                  </Text>
                  <Text style={dayDetailStyles.scoreLabel}>
                    {selectedPeriod === 'day' ? 'Wellness' : 'Avg Score'}
                  </Text>
                </View>
                {selectedPeriod !== 'day' && (
                  <View style={dayDetailStyles.periodSummary}>
                    <Text style={dayDetailStyles.periodSummaryText}>
                      <Text style={{ fontWeight: '700', color: BRAND.primary }}>{periodStats.daysLogged}</Text> of {periodStats.totalDays} days logged
                    </Text>
                  </View>
                )}
              </View>

              {/* Stats Cards */}
              <View style={dayDetailStyles.statsSection}>
                {/* Food Card */}
                <View style={dayDetailStyles.statCard}>
                  <View style={dayDetailStyles.statCardHeader}>
                    <View style={[dayDetailStyles.statCardIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <Ionicons name="restaurant" size={18} color="#10B981" />
                    </View>
                    <Text style={dayDetailStyles.statCardTitle}>Food</Text>
                  </View>
                  <View style={dayDetailStyles.statCardBody}>
                    <View style={dayDetailStyles.statCardItem}>
                      <Text style={dayDetailStyles.statCardValue}>
                        {selectedPeriod === 'day' ? (dayData?.calories || 0) : periodStats.avgCalories}
                      </Text>
                      <Text style={dayDetailStyles.statCardLabel}>
                        {selectedPeriod === 'day' ? 'Calories' : 'Avg Cal/Day'}
                      </Text>
                    </View>
                    <View style={dayDetailStyles.statCardDivider} />
                    <View style={dayDetailStyles.statCardItem}>
                      <Text style={dayDetailStyles.statCardValue}>
                        {selectedPeriod === 'day' ? (dayData?.meals || dayData?.foodCount || 0) : periodStats.totalMeals}
                      </Text>
                      <Text style={dayDetailStyles.statCardLabel}>
                        {selectedPeriod === 'day' ? 'Meals' : 'Total Meals'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Mood Card */}
                <View style={dayDetailStyles.statCard}>
                  <View style={dayDetailStyles.statCardHeader}>
                    <View style={[dayDetailStyles.statCardIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <Ionicons name="happy" size={18} color="#F59E0B" />
                    </View>
                    <Text style={dayDetailStyles.statCardTitle}>Mood</Text>
                  </View>
                  <View style={dayDetailStyles.statCardBody}>
                    <View style={dayDetailStyles.statCardItem}>
                      <Text style={dayDetailStyles.statCardValue}>
                        {selectedPeriod === 'day'
                          ? (dayData?.avgMood ? dayData.avgMood.toFixed(1) : '-')
                          : periodStats.avgMood}
                      </Text>
                      <Text style={dayDetailStyles.statCardLabel}>
                        {selectedPeriod === 'day' ? 'Average' : 'Avg Mood'}/5
                      </Text>
                    </View>
                    <View style={dayDetailStyles.statCardDivider} />
                    <View style={dayDetailStyles.statCardItem}>
                      <LottieView
                        source={selectedPeriod === 'day'
                          ? getMoodLottie(dayData?.moodType, dayData?.avgMood)
                          : getMoodLottie(null, parseFloat(periodStats.avgMood))}
                        autoPlay
                        loop
                        style={{ width: 32, height: 32 }}
                      />
                      <Text style={dayDetailStyles.statCardLabel}>Feeling</Text>
                    </View>
                  </View>
                </View>

                {/* Hydration Card */}
                <View style={dayDetailStyles.statCard}>
                  <View style={dayDetailStyles.statCardHeader}>
                    <View style={[dayDetailStyles.statCardIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="water" size={18} color="#3B82F6" />
                    </View>
                    <Text style={dayDetailStyles.statCardTitle}>Hydration</Text>
                  </View>
                  <View style={dayDetailStyles.statCardBody}>
                    <View style={dayDetailStyles.statCardItem}>
                      <Text style={dayDetailStyles.statCardValue}>
                        {selectedPeriod === 'day'
                          ? Math.round(dayData?.hydrationPercent || dayData?.water || 0)
                          : periodStats.avgHydration}%
                      </Text>
                      <Text style={dayDetailStyles.statCardLabel}>
                        {selectedPeriod === 'day' ? 'Of Goal' : 'Avg/Day'}
                      </Text>
                    </View>
                    <View style={dayDetailStyles.statCardDivider} />
                    <View style={dayDetailStyles.statCardItem}>
                      <View style={dayDetailStyles.hydrationBar}>
                        <View style={[dayDetailStyles.hydrationFill, {
                          width: `${Math.min(100, selectedPeriod === 'day'
                            ? (dayData?.hydrationPercent || dayData?.water || 0)
                            : periodStats.avgHydration)}%`
                        }]} />
                      </View>
                      <Text style={dayDetailStyles.statCardLabel}>Progress</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Story Line (Day view only) */}
              {selectedPeriod === 'day' && (
                <View style={dayDetailStyles.storyContainer}>
                  <Ionicons name="sparkles" size={18} color={BRAND.primary} />
                  <Text style={dayDetailStyles.storyText}>
                    {dayData?.storyLine || generateStoryLine(dayData) || 'Start logging to get personalized insights!'}
                  </Text>
                </View>
              )}

              {/* Best Day (Period view) */}
              {selectedPeriod !== 'day' && periodStats.bestDay && (
                <View style={dayDetailStyles.bestDayCard}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                  <View style={{ flex: 1, marginLeft: SPACING[3] }}>
                    <Text style={dayDetailStyles.bestDayTitle}>Best Day</Text>
                    <Text style={dayDetailStyles.bestDayText}>
                      {formatDate(periodStats.bestDay.date)} • Score: {periodStats.bestDay.score}/100
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={dayDetailStyles.emptyState}>
              <Ionicons name="calendar-outline" size={56} color={TEXT.muted} />
              <Text style={dayDetailStyles.emptyTitle}>Your stats</Text>
              <Text style={dayDetailStyles.emptyText}>
                {selectedPeriod === 'day'
                  ? 'Stats appear as you log food, mood & water'
                  : `Stats will populate as you log`}
              </Text>
            </View>
          )}

          {/* Share Button */}
          <TouchableOpacity style={dayDetailStyles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={BRAND.primary} />
            <Text style={dayDetailStyles.shareBtnText}>Share {selectedPeriod === 'day' ? 'Day' : 'Summary'}</Text>
          </TouchableOpacity>

          <View style={{ height: SPACING[6] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const dayDetailStyles = StyleSheet.create({
  // Modal overlay and backdrop
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING[5],
    paddingBottom: SPACING[8],
    maxHeight: '90%',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: `${SEMANTIC_ACTIONS.success}33`,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },

  // Header row with title and close button
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Period tabs (Day, 30D, 60D, 90D)
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: `${SEMANTIC_ACTIONS.success}0F`,
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: SPACING[5],
  },
  periodTab: {
    flex: 1,
    paddingVertical: SPACING[2] + 2,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  periodTabTextActive: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Score hero section
  scoreHero: {
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderWidth: 4,
    borderColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '800',
    color: TEXT.primary,
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodSummary: {
    marginTop: SPACING[2],
  },
  periodSummaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Stats cards section
  statsSection: {
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}14`,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  statCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  statCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  statCardDivider: {
    width: 1,
    height: 40,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    marginHorizontal: SPACING[3],
  },

  // Hydration progress bar
  hydrationBar: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  hydrationFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },

  // Story container
  storyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}0F`,
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  storyText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Best day card (for period view)
  bestDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  bestDayTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bestDayText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
  },

  // Action buttons
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING[4],
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
  },
  shareBtnText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
});

export default function PremiumCalendarStrip({
  data = {},
  onDateSelect,
  selectedDate,
  currentStreak = 0,
  style,
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showMonthGrid, setShowMonthGrid] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Handle day tap - show detail modal
  const handleDayPress = useCallback((date) => {
    const dateKey = formatDateKey(date);
    const dayData = data?.[dateKey] || {};
    setSelectedDayDetail({ date, dateKey, dayData });
  }, [data]);

  // Get current week dates (centered on today)
  const weekDates = useMemo(() => {
    const dates = [];
    const dayOfWeek = today.getDay();

    for (let i = -dayOfWeek; i < 7 - dayOfWeek; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewAll = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMonthGrid(true);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.monthText}>
            {MONTHS[today.getMonth()]} {today.getFullYear()}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Streak Badge */}
          {currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#EF4444" />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Ionicons name="calendar-outline" size={16} color={BRAND.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day labels */}
      <View style={styles.weekDayLabels}>
        {DAYS.map((day, i) => (
          <Text key={i} style={styles.weekDayLabel}>{day}</Text>
        ))}
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        {weekDates.map((date, index) => {
          const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth();

          return (
            <DayCell
              key={index}
              date={date}
              isToday={isToday}
              isSelected={selectedDayDetail && formatDateKey(selectedDayDetail.date) === formatDateKey(date)}
              data={data}
              onPress={handleDayPress}
              compact
            />
          );
        })}
      </View>

      {/* Month Grid Modal */}
      <MonthGridModal
        visible={showMonthGrid}
        onClose={() => setShowMonthGrid(false)}
        year={currentYear}
        month={currentMonth}
        data={data}
        onDateSelect={(date) => {
          handleDayPress(date);
          setShowMonthGrid(false);
        }}
        onMonthChange={(y, m) => {
          setCurrentYear(y);
          setCurrentMonth(m);
        }}
      />

      {/* Day Detail Bottom Sheet */}
      <DayDetailModal
        visible={!!selectedDayDetail}
        onClose={() => setSelectedDayDetail(null)}
        dayData={selectedDayDetail?.dayData}
        dateKey={selectedDayDetail?.dateKey}
        onViewHistory={(dateKey) => onDateSelect?.({ dateKey })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  monthText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#EF4444',
  },
  viewAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BRAND.primary}10`,
  },
  weekDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[2],
  },
  weekDayLabel: {
    width: DAY_WIDTH,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  // Day cell styles
  dayCell: {
    width: DAY_WIDTH - 4,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    marginHorizontal: 2,
  },
  dayCellCompact: {
    height: 48,
  },
  dayCellToday: {
    backgroundColor: `${BRAND.primary}15`,
    borderWidth: 1.5,
    borderColor: BRAND.primary,
  },
  dayCellSelected: {
    backgroundColor: BRAND.primary,
    borderWidth: 2,
    borderColor: BRAND.primaryDark,
    shadowColor: BRAND.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  dayNumber: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  dayNumberCompact: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  dayNumberToday: {
    color: BRAND.primary,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.15)',
  },
  indicatorFood: {
    backgroundColor: '#10B981', // Green
  },
  indicatorMood: {
    backgroundColor: '#F59E0B', // Amber
  },
  indicatorWater: {
    backgroundColor: '#3B82F6', // Blue
  },
  indicatorCombined: {
    backgroundColor: '#6B4EFF', // Brand purple - indicates complete logging
    width: 12,
    height: 6,
    borderRadius: 3,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[5],
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[3],
  },
  dayLabel: {
    width: (SCREEN_WIDTH - 40) / 7,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[5],
    marginTop: SPACING[5],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  closeButton: {
    marginTop: SPACING[5],
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING[4],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
});
