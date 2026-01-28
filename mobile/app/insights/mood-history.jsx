/**
 * Mood History Screen
 *
 * Features:
 * - Vibrant gradient hero card with streak badge
 * - Timeline view of mood entries grouped by date
 * - Time period filters (Week, Month, Year)
 * - Mood type filter chips
 * - Week-over-week comparison card
 * - ML-powered patterns and insights
 * - Edit/Delete mood entries
 * - Export mood data
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

import { useMoodInsights, useDecisionBrainMoodInsights } from '../../hooks/useMoodInsights';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  MOOD_PALETTE,
} from '../../constants/premiumTheme';
import MoodIcon3D from '../../components/MoodTracker/MoodIcon3D';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  gradient: {
    hero: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    success: ['#34D399', '#10B981', '#059669'],
    calm: ['#60A5FA', '#3B82F6', '#2563EB'],
  },
};

// Mood metadata
const MOOD_META = {
  happy: { emoji: '😊', label: 'Happy', color: '#10B981', light: '#D1FAE5', gradient: ['#34D399', '#10B981'] },
  calm: { emoji: '😌', label: 'Calm', color: '#3B82F6', light: '#DBEAFE', gradient: ['#60A5FA', '#3B82F6'] },
  focused: { emoji: '🎯', label: 'Focused', color: '#6366F1', light: '#E0E7FF', gradient: ['#818CF8', '#6366F1'] },
  energized: { emoji: '⚡', label: 'Energized', color: '#F59E0B', light: '#FEF3C7', gradient: ['#FBBF24', '#F59E0B'] },
  neutral: { emoji: '😐', label: 'Neutral', color: '#8B5CF6', light: '#EDE9FE', gradient: ['#A78BFA', '#8B5CF6'] },
  tired: { emoji: '😴', label: 'Tired', color: '#64748B', light: '#F1F5F9', gradient: ['#94A3B8', '#64748B'] },
  stressed: { emoji: '😰', label: 'Stressed', color: '#EF4444', light: '#FEE2E2', gradient: ['#F87171', '#EF4444'] },
  sad: { emoji: '😢', label: 'Sad', color: '#6366F1', light: '#E0E7FF', gradient: ['#818CF8', '#6366F1'] },
};

const TIME_PERIODS = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'year', label: 'Year', days: 365 },
];

// All mood types for filtering
const ALL_MOODS = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];

// ============================================================================
// HELPERS
// ============================================================================

const getLocalDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateHeader = (dateKey) => {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (getLocalDateKey(date) === getLocalDateKey(today)) return 'Today';
  if (getLocalDateKey(date) === getLocalDateKey(yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// ============================================================================
// COMPONENTS
// ============================================================================

const TimePeriodSelector = ({ selected, onSelect }) => (
  <View style={styles.periodSelector}>
    {TIME_PERIODS.map((period) => (
      <TouchableOpacity
        key={period.key}
        style={[
          styles.periodButton,
          selected === period.key && styles.periodButtonActive,
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(period.key);
        }}
      >
        <Text
          style={[
            styles.periodButtonText,
            selected === period.key && styles.periodButtonTextActive,
          ]}
        >
          {period.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Mood Filter Chips - Filter entries by mood type
const MoodFilterChips = ({ selectedMoods, onToggleMood, logs }) => {
  // Count moods in current data
  const moodCounts = useMemo(() => {
    const counts = {};
    (logs || []).forEach((log) => {
      const mood = log.mood || 'neutral';
      counts[mood] = (counts[mood] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const availableMoods = ALL_MOODS.filter((mood) => moodCounts[mood] > 0);

  if (availableMoods.length <= 1) return null;

  return (
    <View style={styles.filterChipsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedMoods.length === 0 && styles.filterChipActive,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onToggleMood(null); // Clear all filters
          }}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMoods.length === 0 && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {availableMoods.map((mood) => {
          const meta = MOOD_META[mood];
          const isSelected = selectedMoods.includes(mood);
          return (
            <TouchableOpacity
              key={mood}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: meta.color },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onToggleMood(mood);
              }}
            >
              <Text style={styles.filterChipEmoji}>{meta.emoji}</Text>
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {meta.label}
              </Text>
              <View style={[styles.filterChipCount, isSelected && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={[styles.filterChipCountText, isSelected && { color: '#FFFFFF' }]}>
                  {moodCounts[mood] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Streak Badge Component
const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null;

  return (
    <View style={styles.streakBadge}>
      <Ionicons name="flame" size={14} color="#F59E0B" />
      <Text style={styles.streakText}>{streak} day streak</Text>
    </View>
  );
};

// Week Comparison Card - Compare this week vs last week
const WeekComparisonCard = ({ logs }) => {
  const comparison = useMemo(() => {
    if (!logs?.length) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekLogs = logs.filter((l) => new Date(l.loggedDate) >= oneWeekAgo);
    const lastWeekLogs = logs.filter(
      (l) => new Date(l.loggedDate) >= twoWeeksAgo && new Date(l.loggedDate) < oneWeekAgo
    );

    if (thisWeekLogs.length < 3 || lastWeekLogs.length < 3) return null;

    const getAvgIntensity = (arr) => {
      const withIntensity = arr.filter((l) => l.intensity);
      return withIntensity.length
        ? withIntensity.reduce((sum, l) => sum + l.intensity, 0) / withIntensity.length
        : 0;
    };

    const getPositiveRate = (arr) => {
      const positive = arr.filter((l) =>
        ['happy', 'calm', 'focused', 'energized'].includes(l.mood)
      );
      return arr.length ? (positive.length / arr.length) * 100 : 0;
    };

    const thisWeekAvg = getAvgIntensity(thisWeekLogs);
    const lastWeekAvg = getAvgIntensity(lastWeekLogs);
    const thisWeekPositive = getPositiveRate(thisWeekLogs);
    const lastWeekPositive = getPositiveRate(lastWeekLogs);

    const avgDiff = thisWeekAvg - lastWeekAvg;
    const positiveDiff = thisWeekPositive - lastWeekPositive;

    return {
      thisWeek: {
        entries: thisWeekLogs.length,
        avgIntensity: thisWeekAvg,
        positiveRate: thisWeekPositive,
      },
      lastWeek: {
        entries: lastWeekLogs.length,
        avgIntensity: lastWeekAvg,
        positiveRate: lastWeekPositive,
      },
      avgDiff,
      positiveDiff,
      improving: avgDiff > 0.5 || positiveDiff > 10,
      declining: avgDiff < -0.5 || positiveDiff < -10,
    };
  }, [logs]);

  if (!comparison) return null;

  const trendColor = comparison.improving
    ? COLORS.success
    : comparison.declining
      ? COLORS.danger
      : COLORS.text.secondary;
  const trendIcon = comparison.improving
    ? 'trending-up'
    : comparison.declining
      ? 'trending-down'
      : 'remove';

  return (
    <View style={styles.comparisonCard}>
      <View style={styles.comparisonHeader}>
        <Ionicons name="git-compare-outline" size={18} color={COLORS.primary} />
        <Text style={styles.comparisonTitle}>Week Comparison</Text>
        <View style={[styles.comparisonTrend, { backgroundColor: `${trendColor}15` }]}>
          <Ionicons name={trendIcon} size={14} color={trendColor} />
          <Text style={[styles.comparisonTrendText, { color: trendColor }]}>
            {comparison.improving ? 'Improving' : comparison.declining ? 'Declining' : 'Stable'}
          </Text>
        </View>
      </View>

      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonColumnLabel}>This Week</Text>
          <Text style={styles.comparisonValue}>{comparison.thisWeek.avgIntensity.toFixed(1)}</Text>
          <Text style={styles.comparisonSubtext}>avg mood</Text>
          <View style={styles.comparisonStat}>
            <Text style={styles.comparisonStatValue}>{Math.round(comparison.thisWeek.positiveRate)}%</Text>
            <Text style={styles.comparisonStatLabel}>positive</Text>
          </View>
        </View>

        <View style={styles.comparisonDivider}>
          <Ionicons name="arrow-forward" size={16} color={COLORS.text.tertiary} />
        </View>

        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonColumnLabel}>Last Week</Text>
          <Text style={[styles.comparisonValue, { color: COLORS.text.secondary }]}>
            {comparison.lastWeek.avgIntensity.toFixed(1)}
          </Text>
          <Text style={styles.comparisonSubtext}>avg mood</Text>
          <View style={styles.comparisonStat}>
            <Text style={[styles.comparisonStatValue, { color: COLORS.text.secondary }]}>
              {Math.round(comparison.lastWeek.positiveRate)}%
            </Text>
            <Text style={styles.comparisonStatLabel}>positive</Text>
          </View>
        </View>

        <View style={styles.comparisonChange}>
          <Text style={[styles.comparisonChangeValue, { color: trendColor }]}>
            {comparison.avgDiff > 0 ? '+' : ''}{comparison.avgDiff.toFixed(1)}
          </Text>
          <Text style={styles.comparisonChangeLabel}>change</Text>
        </View>
      </View>
    </View>
  );
};

const HeroCard = ({ stats, latestMood }) => {
  const moodMeta = latestMood?.mood ? MOOD_META[latestMood.mood] : MOOD_META.neutral;
  const gradient = moodMeta?.gradient || COLORS.gradient.hero;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroHeader}>
        <View style={styles.heroTitleRow}>
          <Text style={styles.heroTitle}>Mood Journey</Text>
          {latestMood?.mood && (
            <View style={styles.currentMoodBadge}>
              <MoodIcon3D
                mood={latestMood.mood}
                size={24}
                showLabel={false}
                autoPlay={true}
                loop={true}
              />
              <Text style={styles.currentMoodLabel}>{moodMeta.label}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.heroStats}>
        <View style={styles.heroStatItem}>
          <Text style={styles.heroStatValue}>
            {stats?.avgMood?.toFixed(1) || '—'}
          </Text>
          <Text style={styles.heroStatLabel}>Avg Mood</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatItem}>
          <Text style={styles.heroStatValue}>{stats?.loggedDays || 0}</Text>
          <Text style={styles.heroStatLabel}>Days Logged</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatItem}>
          <View style={styles.trendIndicator}>
            <Ionicons
              name={
                stats?.trend === 'up'
                  ? 'trending-up'
                  : stats?.trend === 'down'
                    ? 'trending-down'
                    : 'remove'
              }
              size={20}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.heroStatLabel}>
            {stats?.trend === 'up' ? 'Rising' : stats?.trend === 'down' ? 'Falling' : 'Stable'}
          </Text>
        </View>
      </View>

      {latestMood && (
        <View style={styles.heroFooter}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.heroFooterText}>
            Last logged: {formatTime(latestMood.loggedDate)}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const MoodEntryCard = ({ entry, onDelete }) => {
  const moodMeta = MOOD_META[entry.mood] || MOOD_META.neutral;

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Mood Entry',
      `${moodMeta.label} - ${formatTime(entry.loggedDate)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(entry),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.entryCard}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <View style={[styles.entryIconContainer, { backgroundColor: moodMeta.light }]}>
        <MoodIcon3D
          mood={entry.mood || 'neutral'}
          size={36}
          showLabel={false}
          autoPlay={true}
          loop={false}
        />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={[styles.entryMood, { color: moodMeta.color }]}>
            {moodMeta.label}
          </Text>
          <View style={styles.entryHeaderRight}>
            <Text style={styles.entryTime}>{formatTime(entry.loggedDate)}</Text>
            <Ionicons name="ellipsis-vertical" size={14} color={COLORS.text.tertiary} />
          </View>
        </View>
        <View style={styles.entryMeta}>
          {entry.intensity && (
            <View style={[styles.intensityBadge, { backgroundColor: moodMeta.light }]}>
              <Text style={[styles.intensityText, { color: moodMeta.color }]}>
                {entry.intensity}/10
              </Text>
            </View>
          )}
          {entry.energyLevel && (
            <View style={[styles.energyBadge, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="flash" size={10} color={COLORS.warning} />
              <Text style={[styles.energyText, { color: COLORS.warning }]}>
                {entry.energyLevel}/10
              </Text>
            </View>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsBadge}>
              <Ionicons name="pricetags-outline" size={10} color={COLORS.text.tertiary} />
              <Text style={styles.tagsCount}>{entry.tags.length}</Text>
            </View>
          )}
        </View>
        {entry.note && (
          <Text style={styles.entryNote} numberOfLines={2}>
            {entry.note}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ title, count }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCountBadge}>
      <Text style={styles.sectionCount}>{count} entries</Text>
    </View>
  </View>
);

const PatternCard = ({ pattern }) => (
  <View style={styles.patternCard}>
    <View style={[styles.patternIcon, { backgroundColor: pattern.light || COLORS.primaryLight }]}>
      <Ionicons
        name={pattern.icon || 'bulb-outline'}
        size={18}
        color={pattern.color || COLORS.primary}
      />
    </View>
    <View style={styles.patternContent}>
      <Text style={[styles.patternTitle, { color: pattern.color || COLORS.primary }]}>
        {pattern.title}
      </Text>
      <Text style={styles.patternDescription}>{pattern.description}</Text>
      {pattern.confidence && (
        <Text style={styles.patternConfidence}>
          {Math.round(pattern.confidence * 100)}% confidence
        </Text>
      )}
    </View>
  </View>
);

const EmptyState = ({ onLogMood }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <MoodIcon3D
        mood="happy"
        size={80}
        showLabel={false}
        autoPlay={true}
        loop={true}
      />
    </View>
    <Text style={styles.emptyTitle}>No mood entries yet</Text>
    <Text style={styles.emptyText}>
      Start tracking your mood to see your history and discover patterns.
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onLogMood}>
      <Ionicons name="add" size={20} color="#FFFFFF" />
      <Text style={styles.emptyButtonText}>Log Your Mood</Text>
    </TouchableOpacity>
  </View>
);

// Mood Distribution Card - Visual breakdown of mood frequencies
const MoodDistributionCard = ({ logs }) => {
  const distribution = useMemo(() => {
    if (!logs?.length) return [];

    // Count occurrences of each mood
    const counts = {};
    logs.forEach((log) => {
      const mood = log.mood || 'neutral';
      counts[mood] = (counts[mood] || 0) + 1;
    });

    // Convert to array and sort by count descending
    const total = logs.length;
    return Object.entries(counts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: Math.round((count / total) * 100),
        meta: MOOD_META[mood] || MOOD_META.neutral,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 moods
  }, [logs]);

  if (!distribution.length) return null;

  return (
    <View style={styles.distributionCard}>
      <View style={styles.distributionHeader}>
        <Ionicons name="pie-chart-outline" size={18} color={COLORS.primary} />
        <Text style={styles.distributionTitle}>Mood Distribution</Text>
      </View>

      {/* Distribution Bars */}
      <View style={styles.distributionBars}>
        {distribution.map((item, index) => (
          <View key={item.mood} style={styles.distributionRow}>
            <View style={styles.distributionMoodInfo}>
              <MoodIcon3D
                mood={item.mood}
                size={24}
                showLabel={false}
                autoPlay={false}
                loop={false}
              />
              <Text style={styles.distributionMoodLabel}>{item.meta.label}</Text>
            </View>
            <View style={styles.distributionBarContainer}>
              <View
                style={[
                  styles.distributionBar,
                  {
                    width: `${item.percentage}%`,
                    backgroundColor: item.meta.color,
                  }
                ]}
              />
            </View>
            <Text style={[styles.distributionPercent, { color: item.meta.color }]}>
              {item.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Quick Stats Row - Most common mood, best day, total entries
const QuickStatsRow = ({ logs, stats }) => {
  const quickStats = useMemo(() => {
    if (!logs?.length) return null;

    // Most common mood
    const moodCounts = {};
    logs.forEach((log) => {
      const mood = log.mood || 'neutral';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    const mostCommonMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    // Best day (highest average intensity for positive moods)
    const dayStats = {};
    const positiveMoods = ['happy', 'calm', 'focused', 'energized'];
    logs.forEach((log) => {
      const day = new Date(log.loggedDate).toLocaleDateString('en-US', { weekday: 'short' });
      if (!dayStats[day]) {
        dayStats[day] = { total: 0, count: 0 };
      }
      if (positiveMoods.includes(log.mood) && log.intensity) {
        dayStats[day].total += log.intensity;
        dayStats[day].count += 1;
      }
    });
    const bestDay = Object.entries(dayStats)
      .map(([day, data]) => ({ day, avg: data.count ? data.total / data.count : 0 }))
      .sort((a, b) => b.avg - a.avg)[0]?.day || '—';

    return {
      mostCommonMood,
      mostCommonMeta: MOOD_META[mostCommonMood] || MOOD_META.neutral,
      bestDay,
      totalEntries: logs.length,
    };
  }, [logs]);

  if (!quickStats) return null;

  return (
    <View style={styles.quickStatsRow}>
      {/* Most Common Mood */}
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: quickStats.mostCommonMeta.light }]}>
          <MoodIcon3D
            mood={quickStats.mostCommonMood}
            size={28}
            showLabel={false}
            autoPlay={false}
            loop={false}
          />
        </View>
        <Text style={styles.quickStatValue}>{quickStats.mostCommonMeta.label}</Text>
        <Text style={styles.quickStatLabel}>Top Mood</Text>
      </View>

      {/* Best Day */}
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="sunny" size={22} color={COLORS.success} />
        </View>
        <Text style={styles.quickStatValue}>{quickStats.bestDay}</Text>
        <Text style={styles.quickStatLabel}>Best Day</Text>
      </View>

      {/* Total Entries */}
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="list" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.quickStatValue}>{quickStats.totalEntries}</Text>
        <Text style={styles.quickStatLabel}>Entries</Text>
      </View>
    </View>
  );
};

// Insights Section - Always shows patterns from local data analysis
const InsightsSection = ({ logs, mlPatterns, periodLabel }) => {
  const periodText = periodLabel === 'week' ? 'this week' : periodLabel === 'month' ? 'this month' : 'this year';
  const periodTextCap = periodLabel === 'week' ? 'This week' : periodLabel === 'month' ? 'This month' : 'This year';

  const insights = useMemo(() => {
    if (!logs?.length) return [];

    const computed = [];
    const total = logs.length;

    // 1. Time-of-day pattern
    const timeGroups = { morning: [], afternoon: [], evening: [], night: [] };
    logs.forEach((log) => {
      const hour = new Date(log.loggedDate).getHours();
      if (hour >= 5 && hour < 12) timeGroups.morning.push(log);
      else if (hour >= 12 && hour < 17) timeGroups.afternoon.push(log);
      else if (hour >= 17 && hour < 21) timeGroups.evening.push(log);
      else timeGroups.night.push(log);
    });

    const bestTimeSlot = Object.entries(timeGroups)
      .map(([slot, slotLogs]) => {
        const positiveMoods = slotLogs.filter((l) =>
          ['happy', 'calm', 'focused', 'energized'].includes(l.mood)
        );
        return {
          slot,
          count: slotLogs.length,
          positiveRate: slotLogs.length ? positiveMoods.length / slotLogs.length : 0,
        };
      })
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.positiveRate - a.positiveRate)[0];

    if (bestTimeSlot && bestTimeSlot.positiveRate > 0.5) {
      const timeLabels = { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings', night: 'late nights' };
      computed.push({
        icon: 'sunny-outline',
        title: 'Peak Positivity Time',
        description: `${periodTextCap}, you felt best during ${timeLabels[bestTimeSlot.slot]} with ${Math.round(bestTimeSlot.positiveRate * 100)}% positive moods.`,
        color: COLORS.success,
        light: COLORS.successLight,
      });
    }

    // 2. Weekday vs Weekend pattern
    const weekdayLogs = logs.filter((l) => {
      const day = new Date(l.loggedDate).getDay();
      return day !== 0 && day !== 6;
    });
    const weekendLogs = logs.filter((l) => {
      const day = new Date(l.loggedDate).getDay();
      return day === 0 || day === 6;
    });

    const getAvgIntensity = (arr) => {
      const withIntensity = arr.filter((l) => l.intensity);
      return withIntensity.length
        ? withIntensity.reduce((sum, l) => sum + l.intensity, 0) / withIntensity.length
        : 0;
    };

    const weekdayAvg = getAvgIntensity(weekdayLogs);
    const weekendAvg = getAvgIntensity(weekendLogs);

    if (weekdayLogs.length >= 3 && weekendLogs.length >= 2) {
      const diff = Math.abs(weekdayAvg - weekendAvg);
      if (diff > 1) {
        const better = weekendAvg > weekdayAvg ? 'weekends' : 'weekdays';
        const betterAvg = Math.max(weekdayAvg, weekendAvg);
        computed.push({
          icon: better === 'weekends' ? 'cafe-outline' : 'briefcase-outline',
          title: better === 'weekends' ? 'Weekend Warrior' : 'Weekday Thriving',
          description: `${periodTextCap}, your mood averaged ${betterAvg.toFixed(1)}/10 on ${better} — ${diff.toFixed(1)} points higher.`,
          color: COLORS.primary,
          light: COLORS.primaryLight,
        });
      }
    }

    // 3. Energy-Mood correlation
    const withBoth = logs.filter((l) => l.intensity && l.energyLevel);
    if (withBoth.length >= 5) {
      const highEnergy = withBoth.filter((l) => l.energyLevel >= 7);
      const lowEnergy = withBoth.filter((l) => l.energyLevel <= 4);

      const highEnergyMoodAvg = highEnergy.length
        ? highEnergy.reduce((sum, l) => sum + l.intensity, 0) / highEnergy.length
        : 0;
      const lowEnergyMoodAvg = lowEnergy.length
        ? lowEnergy.reduce((sum, l) => sum + l.intensity, 0) / lowEnergy.length
        : 0;

      if (highEnergy.length >= 2 && lowEnergy.length >= 2 && highEnergyMoodAvg - lowEnergyMoodAvg > 1.5) {
        computed.push({
          icon: 'flash-outline',
          title: 'Energy-Mood Connection',
          description: `${periodTextCap}, high energy days boosted your mood by ${(highEnergyMoodAvg - lowEnergyMoodAvg).toFixed(1)} points on average.`,
          color: COLORS.warning,
          light: COLORS.warningLight,
        });
      }
    }

    // 4. Consistency insight
    const uniqueDays = new Set(logs.map((l) => getLocalDateKey(l.loggedDate)));
    const dayCount = uniqueDays.size;
    if (dayCount >= 5) {
      const logsPerDay = total / dayCount;
      if (logsPerDay >= 2) {
        computed.push({
          icon: 'checkmark-circle-outline',
          title: 'Consistent Tracker',
          description: `${periodTextCap}, you logged ${logsPerDay.toFixed(1)} moods per day on average. Great self-awareness!`,
          color: '#10B981',
          light: '#D1FAE5',
        });
      }
    }

    // 5. Dominant mood insight
    const moodCounts = {};
    logs.forEach((l) => {
      moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1;
    });
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sortedMoods[0];
    if (dominant && dominant[1] >= 3) {
      const percentage = Math.round((dominant[1] / total) * 100);
      const moodMeta = MOOD_META[dominant[0]] || MOOD_META.neutral;
      if (percentage >= 30) {
        computed.push({
          icon: 'heart-outline',
          title: `Frequently ${moodMeta.label}`,
          description: `${periodTextCap}, ${moodMeta.label.toLowerCase()} was your top mood at ${percentage}% of entries.`,
          color: moodMeta.color,
          light: moodMeta.light,
        });
      }
    }

    // 6. Mood variety insight
    const uniqueMoods = Object.keys(moodCounts).length;
    if (uniqueMoods >= 5 && total >= 10) {
      computed.push({
        icon: 'color-palette-outline',
        title: 'Emotional Range',
        description: `${periodTextCap}, you experienced ${uniqueMoods} different moods — a healthy emotional palette!`,
        color: '#6366F1',
        light: '#E0E7FF',
      });
    }

    // 7. Stress awareness
    const stressedCount = moodCounts['stressed'] || 0;
    const sadCount = moodCounts['sad'] || 0;
    const negativeRate = (stressedCount + sadCount) / total;
    if (negativeRate > 0.3 && total >= 5) {
      computed.push({
        icon: 'leaf-outline',
        title: 'Self-Care Reminder',
        description: `${periodTextCap}, ${Math.round(negativeRate * 100)}% of logs showed stress or sadness. Consider some relaxation.`,
        color: '#EF4444',
        light: '#FEE2E2',
      });
    } else if (negativeRate < 0.15 && total >= 7) {
      computed.push({
        icon: 'sparkles-outline',
        title: 'Positive Outlook',
        description: `${periodTextCap}, only ${Math.round(negativeRate * 100)}% negative moods — great emotional balance!`,
        color: '#10B981',
        light: '#D1FAE5',
      });
    }

    return computed.slice(0, 4); // Limit to 4 insights
  }, [logs, periodTextCap]);

  // Combine ML patterns with local insights
  const allPatterns = useMemo(() => {
    const ml = (mlPatterns || []).map((p) => ({ ...p, isML: true }));
    // Prioritize ML patterns, then fill with local insights
    const combined = [...ml, ...insights.filter((i) => !ml.some((m) => m.title === i.title))];
    return combined.slice(0, 5);
  }, [mlPatterns, insights]);

  if (!allPatterns.length) return null;

  const periodBadgeLabel = periodLabel === 'week' ? '7 days' : periodLabel === 'month' ? '30 days' : '1 year';

  return (
    <View style={styles.insightsSection}>
      <View style={styles.insightsSectionHeader}>
        <Ionicons name="bulb" size={18} color={COLORS.primary} />
        <Text style={styles.insightsSectionTitle}>Patterns & Insights</Text>
        <View style={styles.periodBadge}>
          <Text style={styles.periodBadgeText}>{periodBadgeLabel}</Text>
        </View>
        {allPatterns.some((p) => p.isML) && (
          <View style={styles.mlBadge}>
            <Text style={styles.mlBadgeText}>ML</Text>
          </View>
        )}
      </View>

      {allPatterns.map((pattern, i) => (
        <View key={i} style={styles.insightCard}>
          <View style={[styles.insightIcon, { backgroundColor: pattern.light || COLORS.primaryLight }]}>
            <Ionicons
              name={pattern.icon || 'bulb-outline'}
              size={18}
              color={pattern.color || COLORS.primary}
            />
          </View>
          <View style={styles.insightContent}>
            <View style={styles.insightTitleRow}>
              <Text style={[styles.insightTitle, { color: pattern.color || COLORS.primary }]}>
                {pattern.title}
              </Text>
              {pattern.isML && (
                <View style={[styles.insightMLChip, { backgroundColor: pattern.light || COLORS.primaryLight }]}>
                  <Text style={[styles.insightMLChipText, { color: pattern.color || COLORS.primary }]}>AI</Text>
                </View>
              )}
            </View>
            <Text style={styles.insightDescription}>{pattern.description}</Text>
            {pattern.confidence && (
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${Math.round(pattern.confidence * 100)}%`, backgroundColor: pattern.color || COLORS.primary }]} />
                <Text style={styles.confidenceText}>{Math.round(pattern.confidence * 100)}% confidence</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

// Weekly Mini Timeline - 7-day mood visualization
const WeeklyMiniTimeline = ({ logs }) => {
  const weekData = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = getLocalDateKey(date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

      // Find moods for this day
      const dayLogs = logs?.filter((log) => getLocalDateKey(log.loggedDate) === dateKey) || [];
      const dominantMood = dayLogs.length > 0
        ? dayLogs.sort((a, b) => (b.intensity || 5) - (a.intensity || 5))[0]?.mood
        : null;

      days.push({
        dayName,
        dateKey,
        isToday: i === 0,
        mood: dominantMood,
        hasEntry: dayLogs.length > 0,
        entryCount: dayLogs.length,
      });
    }

    return days;
  }, [logs]);

  return (
    <View style={styles.weeklyTimeline}>
      <View style={styles.weeklyTimelineHeader}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
        <Text style={styles.weeklyTimelineTitle}>Last 7 Days</Text>
      </View>
      <View style={styles.weeklyTimelineDays}>
        {weekData.map((day, index) => {
          const moodMeta = day.mood ? MOOD_META[day.mood] : null;
          return (
            <View key={day.dateKey} style={styles.weeklyTimelineDay}>
              <View
                style={[
                  styles.weeklyTimelineDot,
                  day.isToday && styles.weeklyTimelineDotToday,
                  day.hasEntry && { backgroundColor: moodMeta?.color || COLORS.border },
                  !day.hasEntry && { backgroundColor: COLORS.border },
                ]}
              >
                {day.hasEntry && moodMeta && (
                  <Text style={styles.weeklyTimelineEmoji}>{moodMeta.emoji}</Text>
                )}
                {!day.hasEntry && (
                  <View style={styles.weeklyTimelineEmpty} />
                )}
              </View>
              <Text style={[
                styles.weeklyTimelineDayLabel,
                day.isToday && styles.weeklyTimelineDayLabelToday,
              ]}>
                {day.dayName}
              </Text>
              {day.entryCount > 1 && (
                <View style={styles.weeklyTimelineCount}>
                  <Text style={styles.weeklyTimelineCountText}>{day.entryCount}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoodHistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Get period days
  const periodDays = TIME_PERIODS.find((p) => p.key === selectedPeriod)?.days || 7;

  // Fetch mood data
  const {
    data: moodInsights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = useMoodInsights({ windowDays: periodDays, trendDays: Math.min(periodDays, 7) });

  // Fetch ML-powered insights
  const {
    data: decisionBrainData,
    isLoading: dbLoading,
    refetch: refetchDB,
  } = useDecisionBrainMoodInsights();

  const isLoading = insightsLoading || dbLoading;

  // Process mood logs into sections grouped by date
  const sections = useMemo(() => {
    const logs = moodInsights?.logs || [];
    if (!logs.length) return [];

    // Group by date
    const grouped = {};
    logs.forEach((log) => {
      const dateKey = getLocalDateKey(log.loggedDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });

    // Sort dates descending, sort entries within each day by time descending
    return Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((dateKey) => ({
        title: formatDateHeader(dateKey),
        data: grouped[dateKey].sort(
          (a, b) => new Date(b.loggedDate) - new Date(a.loggedDate)
        ),
      }));
  }, [moodInsights]);

  // Calculate stats
  const stats = useMemo(() => {
    if (decisionBrainData?.stats && decisionBrainData.hasEnoughData) {
      return decisionBrainData.stats;
    }

    const logs = moodInsights?.logs || [];
    if (!logs.length) return null;

    const intensities = logs.filter((l) => l.intensity).map((l) => l.intensity);
    const avgMood = intensities.length
      ? intensities.reduce((a, b) => a + b, 0) / intensities.length
      : null;

    // Count unique days
    const uniqueDays = new Set(logs.map((l) => getLocalDateKey(l.loggedDate)));

    return {
      avgMood,
      loggedDays: uniqueDays.size,
      trend: moodInsights?.trendSummary?.direction || 'stable',
    };
  }, [moodInsights, decisionBrainData]);

  // Get latest mood
  const latestMood = useMemo(() => {
    const logs = moodInsights?.logs || [];
    return logs[0] || null;
  }, [moodInsights]);

  // Get patterns from Decision Brain
  const patterns = useMemo(() => {
    if (decisionBrainData?.patterns?.length > 0) {
      return decisionBrainData.patterns.slice(0, 3);
    }
    return [];
  }, [decisionBrainData]);

  // Calculate streak (consecutive days with mood logs)
  const streak = useMemo(() => {
    const logs = moodInsights?.logs || [];
    if (!logs.length) return 0;

    const uniqueDays = [...new Set(logs.map((l) => getLocalDateKey(l.loggedDate)))].sort().reverse();
    if (!uniqueDays.length) return 0;

    const today = getLocalDateKey(new Date());
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

    // Check if most recent log is today or yesterday
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

    let count = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prevDate = new Date(uniqueDays[i - 1]);
      const currDate = new Date(uniqueDays[i]);
      const diffDays = Math.round((prevDate - currDate) / 86400000);
      if (diffDays === 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [moodInsights]);

  // Filter sections by selected moods
  const filteredSections = useMemo(() => {
    if (selectedMoods.length === 0) return sections;

    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter((entry) => selectedMoods.includes(entry.mood)),
      }))
      .filter((section) => section.data.length > 0);
  }, [sections, selectedMoods]);

  // Toggle mood filter
  const handleToggleMoodFilter = useCallback((mood) => {
    if (mood === null) {
      setSelectedMoods([]);
    } else {
      setSelectedMoods((prev) =>
        prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
      );
    }
  }, []);

  // Delete mood entry
  const handleDeleteEntry = useCallback(async (entry) => {
    const entryId = entry.id || entry.clientEventId;
    if (!entryId) {
      Alert.alert('Error', 'Cannot delete this entry');
      return;
    }

    try {
      await apiClient.delete(`/mood/${entryId}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['moodInsights'] });
      queryClient.invalidateQueries({ queryKey: ['decisionBrainMoodInsights'] });
    } catch (error) {
      console.error('Failed to delete mood entry:', error);
      Alert.alert('Error', 'Failed to delete mood entry. Please try again.');
    }
  }, [queryClient]);

  // Export mood data
  const handleExport = useCallback(async () => {
    Haptics.selectionAsync();
    const logs = moodInsights?.logs || [];
    if (!logs.length) {
      Alert.alert('No Data', 'No mood entries to export.');
      return;
    }

    const csvHeader = 'Date,Time,Mood,Intensity,Energy,Note,Tags\n';
    const csvRows = logs.map((log) => {
      const date = new Date(log.loggedDate);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.mood || '',
        log.intensity || '',
        log.energyLevel || '',
        `"${(log.note || '').replace(/"/g, '""')}"`,
        `"${(log.tags || []).join(', ')}"`,
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const periodLabel = selectedPeriod === 'week' ? '7 days' : selectedPeriod === 'month' ? '30 days' : '1 year';

    try {
      await Share.share({
        message: csvContent,
        title: `Mood History - ${periodLabel}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [moodInsights, selectedPeriod]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([refetchInsights?.(), refetchDB?.()]);
    setRefreshing(false);
  }, [refetchInsights, refetchDB]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleLogMood = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)/dashboard');
  }, [router]);

  const handleViewInsights = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/insights/mood');
  }, [router]);

  // Render section header
  const renderSectionHeader = useCallback(
    ({ section }) => <SectionHeader title={section.title} count={section.data.length} />,
    []
  );

  // Render item
  const renderItem = useCallback(
    ({ item }) => <MoodEntryCard entry={item} onDelete={handleDeleteEntry} />,
    [handleDeleteEntry]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item, index) => item.id || item.clientEventId || `mood-${index}`,
    []
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mood History',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <TouchableOpacity
                onPress={handleExport}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="share-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleViewInsights}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="analytics-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {isLoading && !moodInsights ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading mood history...</Text>
        </View>
      ) : filteredSections.length === 0 && selectedMoods.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          <EmptyState onLogMood={handleLogMood} />
        </ScrollView>
      ) : (
        <SectionList
          sections={filteredSections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Hero Card with Streak */}
              <HeroCard stats={stats} latestMood={latestMood} />

              {/* Streak Badge */}
              {streak >= 2 && (
                <View style={styles.streakContainer}>
                  <StreakBadge streak={streak} />
                </View>
              )}

              {/* Time Period Selector */}
              <TimePeriodSelector
                selected={selectedPeriod}
                onSelect={setSelectedPeriod}
              />

              {/* Mood Filter Chips */}
              <MoodFilterChips
                selectedMoods={selectedMoods}
                onToggleMood={handleToggleMoodFilter}
                logs={moodInsights?.logs}
              />

              {/* Week Comparison Card */}
              <WeekComparisonCard logs={moodInsights?.logs} />

              {/* Weekly Mini Timeline */}
              <WeeklyMiniTimeline logs={moodInsights?.logs} />

              {/* Quick Stats Row */}
              <QuickStatsRow logs={moodInsights?.logs} stats={stats} />

              {/* Mood Distribution */}
              <MoodDistributionCard logs={moodInsights?.logs} />

              {/* Patterns & Insights Section - Always shows */}
              <InsightsSection logs={moodInsights?.logs} mlPatterns={patterns} periodLabel={selectedPeriod} />

              {/* History Header */}
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderRow}>
                  <View>
                    <Text style={styles.historyTitle}>Your Mood Log</Text>
                    <Text style={styles.historySubtitle}>
                      {selectedMoods.length > 0
                        ? `${filteredSections.reduce((acc, s) => acc + s.data.length, 0)} filtered entries`
                        : `${moodInsights?.logs?.length || 0} entries in ${selectedPeriod}`}
                    </Text>
                  </View>
                  {selectedMoods.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearFilterButton}
                      onPress={() => setSelectedMoods([])}
                    >
                      <Text style={styles.clearFilterText}>Clear filter</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            selectedMoods.length > 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={48} color={COLORS.text.tertiary} />
                <Text style={styles.noResultsText}>No entries match your filter</Text>
                <TouchableOpacity
                  style={styles.clearFilterButtonLarge}
                  onPress={() => setSelectedMoods([])}
                >
                  <Text style={styles.clearFilterTextLarge}>Clear Filter</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.logMoodButton}
              onPress={handleLogMood}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.gradient.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logMoodGradient}
              >
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text style={styles.logMoodText}>Log Your Mood</Text>
              </LinearGradient>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    padding: SPACING[2],
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },

  // Streak Badge
  streakContainer: {
    alignItems: 'center',
    marginBottom: SPACING[3],
    marginTop: -SPACING[2],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: '#92400E',
  },

  // Filter Chips
  filterChipsContainer: {
    marginBottom: SPACING[3],
  },
  filterChipsScroll: {
    paddingHorizontal: 0,
    gap: SPACING[2],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipEmoji: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipCount: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },

  // Week Comparison Card
  comparisonCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  comparisonTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  comparisonTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  comparisonTrendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  comparisonGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonColumn: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonColumnLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginBottom: SPACING[1],
  },
  comparisonValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  comparisonSubtext: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  comparisonStat: {
    marginTop: SPACING[2],
    alignItems: 'center',
  },
  comparisonStatValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.success,
  },
  comparisonStatLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  comparisonDivider: {
    paddingHorizontal: SPACING[2],
  },
  comparisonChange: {
    alignItems: 'center',
    paddingLeft: SPACING[3],
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  comparisonChangeValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  comparisonChangeLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },

  // Entry Card Header Right
  entryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },

  // History Header Row
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearFilterButton: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  clearFilterText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // No Results
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  noResultsText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.secondary,
  },
  clearFilterButtonLarge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.lg,
  },
  clearFilterTextLarge: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  listContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[10],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING[4],
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroHeader: {
    marginBottom: SPACING[4],
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  currentMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingLeft: SPACING[1],
    paddingRight: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  currentMoodLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trendIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  heroFooterText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING[1],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },

  // Weekly Mini Timeline
  weeklyTimeline: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  weeklyTimelineTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  weeklyTimelineDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weeklyTimelineDay: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyTimelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  weeklyTimelineDotToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  weeklyTimelineEmoji: {
    fontSize: 16,
  },
  weeklyTimelineEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  weeklyTimelineDayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  weeklyTimelineDayLabelToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  weeklyTimelineCount: {
    marginTop: 2,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  weeklyTimelineCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Mood Distribution Card
  distributionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  distributionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  distributionBars: {
    gap: SPACING[3],
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  distributionMoodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: SPACING[2],
  },
  distributionMoodLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 4,
  },
  distributionPercent: {
    width: 36,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Insights Section
  insightsSection: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  insightsSectionTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  periodBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING[3],
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
  },
  insightMLChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  insightMLChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  insightDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  confidenceBar: {
    marginTop: SPACING[2],
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    position: 'absolute',
    right: 0,
    top: 6,
    fontSize: 9,
    color: COLORS.text.tertiary,
  },

  // Patterns Section (legacy - can be removed)
  patternsSection: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patternsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  patternsSectionTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  mlBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  mlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING[3],
  },
  patternIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
  },
  patternDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  patternConfidence: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: SPACING[1],
    fontStyle: 'italic',
  },

  // History Header
  historyHeader: {
    marginBottom: SPACING[3],
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  historySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    marginTop: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  sectionCountBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  sectionCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },

  // Entry Card
  entryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: SPACING[3],
  },
  entryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  entryMood: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
  },
  entryTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  intensityBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  intensityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  energyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  energyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    gap: 3,
  },
  tagsCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  entryNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
    marginTop: SPACING[2],
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
  },
  emptyIconContainer: {
    marginBottom: SPACING[4],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING[6],
    marginBottom: SPACING[4],
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },
  emptyButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Log Mood Button
  logMoodButton: {
    marginTop: SPACING[4],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logMoodGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2],
  },
  logMoodText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
