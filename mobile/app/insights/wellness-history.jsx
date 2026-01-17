/**
 * Wellness History Screen - "Glass Bubbles" Design
 *
 * Shows wellness score history with:
 * - AI-powered key insight at top (speech bubble style)
 * - Personal bests in floating bubble cards
 * - Weekly score visualization with day circles
 * - Pattern detection and recommendations
 *
 * Research-based: Uses 4-domain wellness model (Food, Mood, Hydration, Activity)
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  SEMANTIC,
} from '../../constants/premiumTheme';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';

import { useDashboard } from '../../hooks/useDashboard';
import { calculateFoodMoodScore, detectPatterns } from '../../utils/foodMoodScore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Key Insight Card - Speech bubble style with gradient glass effect
 */
function KeyInsightCard({ insight, isLoading }) {
  if (isLoading) {
    return (
      <View style={insightStyles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
          style={insightStyles.gradient}
        >
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={insightStyles.loadingText}>Analyzing your patterns...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={insightStyles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
        style={insightStyles.gradient}
      >
        <View style={insightStyles.speechBubble}>
          <Text style={insightStyles.quoteText}>
            "{insight || 'Keep logging to discover your wellness patterns!'}"
          </Text>
          <View style={insightStyles.aiTag}>
            <Ionicons name="sparkles" size={12} color={BRAND.primary} />
            <Text style={insightStyles.aiTagText}>AI Insight</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: SPACING[4],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING[2],
    fontSize: 14,
    color: TEXT.secondary,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND.primary,
  },
});

/**
 * Personal Bests - Floating bubble cards
 */
function PersonalBestsSection({ stats }) {
  const bests = [
    { key: 'highest', value: stats.highestScore, label: 'Highest', sublabel: stats.highestDate, icon: 'trophy', color: '#F59E0B' },
    { key: 'streak', value: stats.currentStreak, label: 'Streak', sublabel: 'days', icon: 'flame', color: '#EF4444' },
    { key: 'improved', value: stats.improvement, label: 'vs Last Week', sublabel: stats.improvement > 0 ? 'Improved!' : 'Keep going', icon: 'trending-up', color: '#10B981' },
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
              {item.key === 'improved' && item.value > 0 ? '+' : ''}{item.value}{item.key === 'improved' ? '%' : ''}
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
 * Weekly Score Visualization - Score circles for each day
 */
function WeeklyScoreSection({ weekData, weekAverage, bestDay }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getScoreColor = (score) => {
    if (!score) return TEXT.tertiary;
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#8B5CF6';
    if (score >= 40) return '#3B82F6';
    return '#F59E0B';
  };

  return (
    <View style={weekStyles.container}>
      <LinearGradient
        colors={[SURFACES.card.primary, 'rgba(255,255,255,0.95)']}
        style={weekStyles.card}
      >
        <View style={weekStyles.header}>
          <Text style={weekStyles.title}>This Week</Text>
        </View>

        <View style={weekStyles.daysRow}>
          {weekData.map((dayScore, index) => {
            const isBest = dayScore === bestDay.score && dayScore > 0;
            const color = getScoreColor(dayScore);
            const hasData = dayScore > 0;

            return (
              <View key={index} style={weekStyles.dayColumn}>
                <View
                  style={[
                    weekStyles.scoreCircle,
                    {
                      backgroundColor: hasData ? `${color}20` : SURFACES.background.secondary,
                      borderColor: isBest ? color : 'transparent',
                      borderWidth: isBest ? 2 : 0,
                    },
                  ]}
                >
                  {hasData ? (
                    <Text style={[weekStyles.scoreText, { color }]}>{dayScore}</Text>
                  ) : (
                    <Ionicons name="remove" size={14} color={TEXT.tertiary} />
                  )}
                </View>
                <Text style={weekStyles.dayLabel}>{days[index]}</Text>
              </View>
            );
          })}
        </View>

        <View style={weekStyles.statsRow}>
          <Text style={weekStyles.statText}>
            Avg: <Text style={weekStyles.statValue}>{weekAverage}</Text>
          </Text>
          <View style={weekStyles.statDot} />
          <Text style={weekStyles.statText}>
            Best: <Text style={weekStyles.statValue}>{bestDay.score}</Text>
            <Text style={weekStyles.statDetail}> ({bestDay.day})</Text>
          </Text>
        </View>
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
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  dayColumn: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  scoreCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  statText: {
    fontSize: 13,
    color: TEXT.secondary,
  },
  statValue: {
    fontWeight: '700',
    color: TEXT.primary,
  },
  statDetail: {
    color: TEXT.tertiary,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT.tertiary,
    marginHorizontal: SPACING[3],
  },
});

/**
 * Patterns Detected - What we noticed section
 */
function PatternsSection({ patterns }) {
  if (!patterns || patterns.length === 0) {
    return (
      <View style={patternsStyles.container}>
        <Text style={patternsStyles.sectionTitle}>What We Noticed</Text>
        <View style={patternsStyles.emptyCard}>
          <Ionicons name="sparkles-outline" size={24} color={TEXT.tertiary} />
          <Text style={patternsStyles.emptyText}>Keep logging to discover patterns</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={patternsStyles.container}>
      <Text style={patternsStyles.sectionTitle}>What We Noticed</Text>
      <View style={patternsStyles.card}>
        {patterns.map((pattern, index) => (
          <View
            key={pattern.id || index}
            style={[
              patternsStyles.patternRow,
              index < patterns.length - 1 && patternsStyles.patternRowBorder,
            ]}
          >
            <View style={[patternsStyles.iconDot, { backgroundColor: `${getPatternColor(pattern.type)}20` }]}>
              <Ionicons name={pattern.icon || 'bulb-outline'} size={16} color={getPatternColor(pattern.type)} />
            </View>
            <View style={patternsStyles.patternContent}>
              <Text style={patternsStyles.patternTitle}>{pattern.title}</Text>
              <Text style={patternsStyles.patternMessage}>{pattern.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function getPatternColor(type) {
  switch (type) {
    case 'positive': return '#10B981';
    case 'insight': return '#8B5CF6';
    case 'warning': return '#F59E0B';
    default: return BRAND.primary;
  }
}

const patternsStyles = StyleSheet.create({
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
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
  },
  patternRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
    marginBottom: SPACING[2],
    paddingBottom: SPACING[3],
  },
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  patternMessage: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WellnessHistoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const { data: dashboard, isLoading, error, refetch } = useDashboard();

  // Calculate wellness stats from dashboard data
  const wellnessStats = useMemo(() => {
    if (!dashboard) {
      return {
        highestScore: 0,
        highestDate: '--',
        currentStreak: 0,
        improvement: 0,
        weekData: [0, 0, 0, 0, 0, 0, 0],
        weekAverage: 0,
        bestDay: { score: 0, day: '--' },
        keyInsight: null,
        patterns: [],
      };
    }

    // Get today's data for current score
    const today = dashboard.today || {};
    const goals = dashboard.goals || {};
    const trends = dashboard.trends || {};

    // Calculate today's score
    const todayScore = calculateFoodMoodScore({
      calories: today.nutrition?.totalCalories || 0,
      calorieGoal: goals.dailyCalories || 2000,
      protein: today.nutrition?.totalProtein || 0,
      proteinGoal: goals.proteinG || 150,
      carbs: today.nutrition?.totalCarbs || 0,
      carbsGoal: goals.carbsG || 250,
      fats: today.nutrition?.totalFats || 0,
      fatsGoal: goals.fatsG || 65,
      fiber: today.nutrition?.totalFiber || 0,
      fiberGoal: 30,
      waterIntake: today.waterIntakeLiters || 0,
      waterGoal: goals.waterLiters || 2.5,
      moodLogs: today.moodLogs || [],
      meals: today.foodLogs || [],
      activityMinutes: today.activity?.totalMinutes || 0,
      activityGoal: goals.activityMinutes || 30,
    });

    // Mock week data (in production, fetch from API)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = new Date().getDay() - 1; // 0 = Monday
    const weekData = Array(7).fill(0).map((_, i) => {
      if (i === (todayIndex >= 0 ? todayIndex : 6)) return todayScore.score;
      if (i < todayIndex) return Math.floor(Math.random() * 30) + 50; // Mock past days
      return 0; // Future days
    });

    const validScores = weekData.filter(s => s > 0);
    const weekAverage = validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;

    const bestScore = Math.max(...weekData);
    const bestDayIndex = weekData.indexOf(bestScore);

    // Detect patterns from data
    const patterns = detectPatterns({
      foodLogs: today.foodLogs || [],
      moodLogs: today.moodLogs || [],
      waterLogs: [], // Would need water log history
      days: 30,
    });

    // Generate key insight based on patterns
    let keyInsight = null;
    if (patterns.length > 0 && patterns[0].type === 'positive') {
      keyInsight = patterns[0].message;
    } else if (todayScore.score >= 70) {
      keyInsight = "You're on a roll! Keep up the balanced approach.";
    } else if (todayScore.weakestDomain) {
      const domainMessages = {
        nutrition: "Focus on balanced meals to boost your score",
        hydration: "Staying hydrated can improve your energy and mood",
        mood: "Regular mood check-ins help spot what lifts your spirits",
        activity: "Even a short walk can make a big difference",
      };
      keyInsight = domainMessages[todayScore.weakestDomain];
    }

    return {
      highestScore: Math.max(bestScore, todayScore.score),
      highestDate: bestScore === todayScore.score ? 'Today' : dayNames[bestDayIndex],
      currentStreak: trends.currentStreak || 0,
      improvement: Math.round((todayScore.score - (weekAverage || todayScore.score)) * 10) / 10,
      weekData,
      weekAverage,
      bestDay: { score: bestScore, day: dayNames[bestDayIndex] || 'Today' },
      keyInsight,
      patterns: patterns.slice(0, 3),
    };
  }, [dashboard]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  // Handle back navigation
  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

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
        {/* Key Insight - Speech bubble at top */}
        <KeyInsightCard insight={wellnessStats.keyInsight} isLoading={isLoading} />

        {/* Personal Bests - Floating bubbles */}
        <PersonalBestsSection stats={wellnessStats} />

        {/* This Week - Score circles */}
        <WeeklyScoreSection
          weekData={wellnessStats.weekData}
          weekAverage={wellnessStats.weekAverage}
          bestDay={wellnessStats.bestDay}
        />

        {/* Patterns Detected */}
        <PatternsSection patterns={wellnessStats.patterns} />

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
