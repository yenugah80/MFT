/**
 * Wellness History Screen - Interactive 4-Domain Design
 *
 * Shows wellness score history with real data and interactive elements:
 * - Insights-first design (recommendations at top)
 * - 4-domain breakdown (Food, Mood, Hydration, Activity - 25 pts each)
 * - Tappable day circles with detail modal
 * - AI-powered patterns and recommendations
 *
 * Data Sources:
 * - useWellnessHistory: Aggregates dashboard + historical data
 * - useWellnessInsights: What-to-change + personalized patterns
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';
import { SPACING, RADIUS } from '../../constants/designTokens';

import { useWellnessHistory } from '../../hooks/useWellnessHistory';
import { useWellnessInsights } from '../../hooks/useWellnessInsights';

import {
  DomainBreakdownGrid,
  DayDetailModal,
  WellnessRecommendationsSection,
} from '../../components/wellness';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Personal Bests - Floating bubble cards
 */
function PersonalBestsSection({ stats }) {
  const bests = [
    {
      key: 'highest',
      value: stats.highestScore,
      label: 'Highest',
      sublabel: stats.highestDate,
      icon: 'trophy',
      color: '#F59E0B',
    },
    {
      key: 'streak',
      value: stats.currentStreak,
      label: 'Streak',
      sublabel: 'days',
      icon: 'flame',
      color: '#EF4444',
    },
    {
      key: 'improved',
      value: stats.improvement,
      label: 'vs Last Week',
      sublabel: stats.improvement > 0 ? 'Improved!' : 'Keep going',
      icon: 'trending-up',
      color: '#10B981',
    },
  ];

  return (
    <View style={bestsStyles.container}>
      <Text style={bestsStyles.sectionTitle}>Personal Bests</Text>
      <View style={bestsStyles.bubblesRow}>
        {bests.map((item) => (
          <View key={item.key} style={[bestsStyles.bubble, { borderColor: `${item.color}30` }]}>
            <View style={[bestsStyles.iconCircle, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[bestsStyles.value, { color: item.color }]}>
              {item.key === 'improved' && item.value > 0 ? '+' : ''}
              {item.value}
              {item.key === 'improved' ? '%' : ''}
            </Text>
            <Text style={bestsStyles.label}>{item.label}</Text>
            <Text style={bestsStyles.sublabel}>{item.sublabel}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const bestsStyles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[3],
  },
  bubble: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.secondary,
    marginTop: 2,
  },
  sublabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 1,
  },
});

/**
 * Weekly Score Visualization - Interactive day circles
 */
function WeeklyScoreSection({ weekData, weekAverage, onDayPress }) {
  const getScoreColor = (score) => {
    if (!score || score === 0) return TEXT.tertiary;
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#8B5CF6';
    if (score >= 40) return '#3B82F6';
    return '#F59E0B';
  };

  const handleDayPress = async (dayData, index) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (dayData.hasData) {
      onDayPress?.(dayData);
    }
  };

  return (
    <View style={weekStyles.container}>
      <LinearGradient
        colors={[SURFACES.card.primary, 'rgba(255,255,255,0.95)']}
        style={weekStyles.card}
      >
        <View style={weekStyles.header}>
          <Text style={weekStyles.title}>This Week</Text>
          <Text style={weekStyles.avgText}>
            Avg: <Text style={weekStyles.avgValue}>{weekAverage || 0}</Text>
          </Text>
        </View>

        <View style={weekStyles.daysRow}>
          {weekData.map((day, index) => {
            const score = day.score || 0;
            const hasData = day.hasData;
            const color = getScoreColor(score);
            const isToday = day.isToday;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDayPress(day, index)}
                activeOpacity={hasData ? 0.7 : 1}
                style={weekStyles.dayColumn}
              >
                <View
                  style={[
                    weekStyles.scoreCircle,
                    {
                      backgroundColor: hasData ? `${color}20` : SURFACES.background.secondary,
                      borderColor: isToday ? color : 'transparent',
                      borderWidth: isToday ? 2 : 0,
                    },
                  ]}
                >
                  {hasData ? (
                    <Text style={[weekStyles.scoreText, { color }]}>{Math.round(score)}</Text>
                  ) : (
                    <Ionicons name="remove" size={14} color={TEXT.tertiary} />
                  )}
                </View>
                <Text style={[weekStyles.dayLabel, isToday && weekStyles.dayLabelToday]}>
                  {day.dayShort}
                </Text>
                {isToday && <View style={[weekStyles.todayDot, { backgroundColor: color }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={weekStyles.tapHint}>Tap a day to see details</Text>
      </LinearGradient>
    </View>
  );
}

const weekStyles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avgText: {
    fontSize: 13,
    color: TEXT.secondary,
  },
  avgValue: {
    fontWeight: '700',
    color: TEXT.primary,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  dayColumn: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  scoreCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  dayLabelToday: {
    color: TEXT.primary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tapHint: {
    fontSize: 11,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WellnessHistoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Fetch wellness history data
  const {
    todayScore,
    weekData,
    weekAverage,
    personalBests,
    hasData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useWellnessHistory({ days: 7 });

  // Fetch insights data
  const {
    whatToChange,
    patterns,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = useWellnessInsights();

  // Calculate domain breakdown from today's score
  const domainBreakdown = useMemo(() => {
    if (!todayScore?.breakdown) {
      return {
        nutrition: { score: 0 },
        mood: { score: 0 },
        hydration: { score: 0 },
        activity: { score: 0 },
      };
    }
    return todayScore.breakdown;
  }, [todayScore]);

  // Handle day press
  const handleDayPress = useCallback((dayData) => {
    setSelectedDay(dayData);
    setShowDayModal(true);
  }, []);

  // Handle domain press (optional drill-down)
  const handleDomainPress = useCallback((domain, data) => {
    // Could navigate to domain-specific insights
    console.log('[WellnessHistory] Domain pressed:', domain, data);
  }, []);

  // Handle pattern press
  const handlePatternPress = useCallback((pattern) => {
    // Could show pattern detail modal
    console.log('[WellnessHistory] Pattern pressed:', pattern);
  }, []);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchHistory(), refetchInsights()]);
    setRefreshing(false);
  };

  // Handle back navigation
  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const isLoading = historyLoading && !hasData;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Your Wellness Journey',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTitleStyle: { color: TEXT.primary, fontWeight: '600' },
          headerTintColor: BRAND.primary,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={BRAND.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Insights First - Recommendations Section */}
        <WellnessRecommendationsSection
          whatToChange={whatToChange}
          patterns={patterns}
          isLoading={insightsLoading}
          onPatternPress={handlePatternPress}
        />

        {/* 2. Domain Breakdown - Interactive 2x2 Grid */}
        <DomainBreakdownGrid
          breakdown={domainBreakdown}
          onDomainPress={handleDomainPress}
        />

        {/* 3. This Week - Interactive Day Circles */}
        <WeeklyScoreSection
          weekData={weekData}
          weekAverage={weekAverage}
          onDayPress={handleDayPress}
        />

        {/* 4. Personal Bests */}
        <PersonalBestsSection stats={personalBests} />

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Day Detail Modal */}
      <DayDetailModal
        visible={showDayModal}
        onClose={() => setShowDayModal(false)}
        dayData={selectedDay}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  content: {
    paddingTop: SPACING[4],
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
});
