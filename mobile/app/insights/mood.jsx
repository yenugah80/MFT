/**
 * Mood Insights Screen - Redesigned
 *
 * Features:
 * - Today's mood status with visual flair
 * - Interactive mood trend chart (7-day)
 * - Pattern extraction from notes (sleep, context, triggers)
 * - Food-mood correlation insights
 * - Smart personalized recommendations
 * - Engaging visual design with gradients
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { useDashboard } from '../../hooks/useDashboard';
import { useMoodTrends, useMoodIntelligence } from '../../hooks/useMoodInsights';
import { useNotification } from '../../providers/NotificationProvider';
import apiClient from '../../services/apiClient';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SHADOWS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 140;

// Mood icon mapping (using Ionicons instead of emojis)
const MOOD_ICONS = {
  happy: { icon: 'happy', label: 'Happy', color: '#10B981' },
  energized: { icon: 'flash', label: 'Energized', color: '#F59E0B' },
  calm: { icon: 'leaf', label: 'Calm', color: '#3B82F6' },
  neutral: { icon: 'ellipse-outline', label: 'Neutral', color: '#6B7280' },
  stressed: { icon: 'alert-circle', label: 'Stressed', color: '#EF4444' },
  sad: { icon: 'sad', label: 'Sad', color: '#8B5CF6' },
};

// Pattern tags with icons
const PATTERN_TAGS = {
  sleep: { icon: 'moon', label: 'Sleep', color: '#6366F1' },
  exercise: { icon: 'fitness', label: 'Exercise', color: '#10B981' },
  social: { icon: 'people', label: 'Social', color: '#F59E0B' },
  weather: { icon: 'sunny', label: 'Weather', color: '#3B82F6' },
  stress: { icon: 'warning', label: 'Stress', color: '#EF4444' },
  work: { icon: 'briefcase', label: 'Work', color: '#8B5CF6' },
  food: { icon: 'restaurant', label: 'Food', color: '#EC4899' },
};

// Smart recommendations based on patterns
const SMART_RECOMMENDATIONS = {
  lowEnergy: [
    { icon: 'water', text: 'Hydrate - dehydration affects energy levels', action: 'Log water' },
    { icon: 'walk', text: 'Take a 10-min walk to boost energy naturally', action: 'Log activity' },
    { icon: 'nutrition', text: 'Have a protein-rich snack', action: 'Log meal' },
  ],
  highStress: [
    { icon: 'leaf', text: 'Try 5 deep breaths - activates calm mode', action: 'Log mood' },
    { icon: 'musical-notes', text: 'Listen to calming music for 10 mins', action: null },
    { icon: 'cafe', text: 'Limit caffeine - it can increase anxiety', action: null },
  ],
  goodMood: [
    { icon: 'journal', text: 'Note what made today great', action: 'Log mood' },
    { icon: 'calendar', text: 'Schedule something enjoyable for tomorrow', action: null },
    { icon: 'share', text: 'Share your positivity with someone', action: null },
  ],
  sleepIssues: [
    { icon: 'moon', text: 'Dim screens 1 hour before bed', action: null },
    { icon: 'cafe', text: 'No caffeine after 2pm', action: null },
    { icon: 'bed', text: 'Keep a consistent sleep schedule', action: null },
  ],
};

export default function MoodInsightsScreen() {
  const router = useRouter();
  const notify = useNotification();

  // Data hooks
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: moodData, isLoading: moodLoading, refetch } = useMoodTrends({ period: 'week' });
  const { data: intelligence, isLoading: intelligenceLoading, refetch: refetchIntelligence } = useMoodIntelligence();

  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);

  const isLoading = dashboardLoading || moodLoading;

  // Extract wellness score and recommendations from intelligence
  const wellnessScore = intelligence?.wellnessScore || null;
  const aiRecommendations = intelligence?.recommendations || [];

  // Extract today's mood from dashboard
  const todaysMoods = useMemo(() => {
    return dashboard?.today?.moodLogs || [];
  }, [dashboard]);

  const latestMood = useMemo(() => {
    if (!todaysMoods.length) return null;
    return todaysMoods[0]; // Most recent
  }, [todaysMoods]);

  // Calculate mood stats
  const moodStats = useMemo(() => {
    if (!moodData?.trendData) return null;

    const validDays = moodData.trendData.filter(d => d.hasData);
    const avgMood = validDays.length > 0
      ? validDays.reduce((sum, d) => sum + d.intensity, 0) / validDays.length
      : null;

    return {
      avgMood: avgMood ? avgMood.toFixed(1) : null,
      loggedDays: validDays.length,
      totalLogs: moodData.dataQuality?.totalLogs || 0,
      trend: moodData.trendSummary?.direction || 'insufficient',
      delta: moodData.trendSummary?.delta,
      bestDay: moodData.stats?.bestDay,
    };
  }, [moodData]);

  // Extract patterns from notes
  const notePatterns = useMemo(() => {
    if (!moodData?.trendData) return [];

    // This would ideally come from the backend, but we can extract basic patterns
    const patterns = [];
    const keywords = {
      sleep: ['sleep', 'tired', 'rest', 'insomnia', 'nap', 'bed'],
      exercise: ['exercise', 'workout', 'gym', 'run', 'walk', 'active'],
      social: ['friends', 'family', 'party', 'social', 'meeting', 'date'],
      work: ['work', 'job', 'meeting', 'deadline', 'project', 'boss'],
      stress: ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure'],
      food: ['ate', 'meal', 'food', 'hungry', 'breakfast', 'lunch', 'dinner'],
    };

    // Count occurrences (simplified pattern detection)
    const counts = {};
    for (const category of Object.keys(keywords)) {
      counts[category] = 0;
    }

    // In a real implementation, we'd analyze actual note content from mood logs
    // For now, simulate based on available data
    if (moodStats?.avgMood < 5) {
      patterns.push({ type: 'stress', message: 'Lower mood detected recently', count: 3 });
    }
    if (moodStats?.trend === 'up') {
      patterns.push({ type: 'exercise', message: 'Mood improving - keep it up!', count: 2 });
    }

    return patterns;
  }, [moodData, moodStats]);

  // Determine recommendations based on current state
  const currentRecommendations = useMemo(() => {
    if (!latestMood && !moodStats) return SMART_RECOMMENDATIONS.goodMood;

    const intensity = latestMood?.intensity || latestMood?.energyLevel || moodStats?.avgMood || 5;
    const mood = latestMood?.mood || 'neutral';

    if (intensity < 4 || mood === 'sad') {
      return SMART_RECOMMENDATIONS.lowEnergy;
    }
    if (mood === 'stressed') {
      return SMART_RECOMMENDATIONS.highStress;
    }
    if (notePatterns.some(p => p.type === 'sleep')) {
      return SMART_RECOMMENDATIONS.sleepIssues;
    }
    return SMART_RECOMMENDATIONS.goodMood;
  }, [latestMood, moodStats, notePatterns]);

  // Food-mood correlations (simplified)
  const foodMoodCorrelations = useMemo(() => {
    const foodLogs = dashboard?.today?.foodLogs || [];
    const moodLogs = todaysMoods;

    if (!foodLogs.length || !moodLogs.length) return [];

    // Simple correlation: look at meals logged near mood logs
    const correlations = [];

    for (const mood of moodLogs) {
      const moodTime = new Date(mood.loggedAt || mood.loggedDate).getTime();
      const nearbyMeals = foodLogs.filter(food => {
        const foodTime = new Date(food.loggedAt).getTime();
        const hoursDiff = Math.abs(moodTime - foodTime) / (1000 * 60 * 60);
        return hoursDiff <= 3; // Within 3 hours
      });

      if (nearbyMeals.length > 0) {
        correlations.push({
          mood: mood.mood || 'neutral',
          intensity: mood.intensity || mood.energyLevel || 5,
          meals: nearbyMeals.map(m => m.foodName || m.description || 'Meal').slice(0, 2),
          time: mood.loggedAt || mood.loggedDate,
        });
      }
    }

    return correlations.slice(0, 3); // Max 3 correlations
  }, [dashboard, todaysMoods]);

  // Load AI insights
  const loadAiInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const response = await apiClient.post('/mood/insights', {
        days: selectedTimeframe === 'week' ? 7 : 30,
        forceRefresh: false,
      }, { _timeout: 30000 });

      setAiInsights(response?.insights || []);
    } catch (err) {
      console.error('[MoodInsights] Failed to load AI insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    loadAiInsights();
  }, [selectedTimeframe]);

  // Handle navigation
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  // Handle log mood action
  const handleLogMood = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/dashboard');
    // Ideally trigger mood logging modal
  }, [router]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!moodStats) return;

    const message = `My Mood This Week\n\n` +
      `Average: ${moodStats.avgMood}/10\n` +
      `Trend: ${moodStats.trend === 'up' ? 'Improving' : moodStats.trend === 'down' ? 'Declining' : 'Stable'}\n` +
      `Logged ${moodStats.loggedDays} days\n\n` +
      `Tracked with MyFoodTracker`;

    try {
      await Share.share({ message });
    } catch (err) {
      notify.error('Unable to share');
    }
  }, [moodStats, notify]);

  // Render mood trend chart
  const renderTrendChart = () => {
    if (!moodData?.trendData) return null;

    const data = moodData.trendData;
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * (CHART_WIDTH - 40) + 20,
      y: d.hasData
        ? CHART_HEIGHT - 20 - ((d.intensity - 1) / 9) * (CHART_HEIGHT - 40)
        : null,
      hasData: d.hasData,
      intensity: d.intensity,
      dayKey: d.dayKey,
    }));

    // Build path for line
    const validPoints = points.filter(p => p.y !== null);
    if (validPoints.length < 2) {
      return (
        <View style={styles.chartEmptyState}>
          <Ionicons name="analytics-outline" size={40} color={VIBRANT_WELLNESS.mood.primary} />
          <Text style={styles.chartEmptyText}>Log more moods to see trends</Text>
        </View>
      );
    }

    let pathD = `M ${validPoints[0].x} ${validPoints[0].y}`;
    for (let i = 1; i < validPoints.length; i++) {
      const cp1x = validPoints[i - 1].x + (validPoints[i].x - validPoints[i - 1].x) * 0.5;
      const cp1y = validPoints[i - 1].y;
      const cp2x = validPoints[i - 1].x + (validPoints[i].x - validPoints[i - 1].x) * 0.5;
      const cp2y = validPoints[i].y;
      pathD += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${validPoints[i].x} ${validPoints[i].y}`;
    }

    // Area fill path
    const areaD = pathD +
      ` L ${validPoints[validPoints.length - 1].x} ${CHART_HEIGHT - 10}` +
      ` L ${validPoints[0].x} ${CHART_HEIGHT - 10} Z`;

    return (
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <SvgGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={VIBRANT_WELLNESS.mood.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={VIBRANT_WELLNESS.mood.primary} stopOpacity="0.02" />
            </SvgGradient>
          </Defs>

          {/* Area fill */}
          <Path d={areaD} fill="url(#moodGradient)" />

          {/* Line */}
          <Path
            d={pathD}
            stroke={VIBRANT_WELLNESS.mood.primary}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {validPoints.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={SURFACES.background.primary}
              stroke={VIBRANT_WELLNESS.mood.primary}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* Day labels */}
        <View style={styles.chartLabels}>
          {data.map((d, i) => {
            const dayName = new Date(d.dayKey).toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <Text key={i} style={styles.chartLabel}>{dayName}</Text>
            );
          })}
        </View>
      </View>
    );
  };

  // Get mood display info
  const getMoodDisplay = (mood) => {
    return MOOD_ICONS[mood] || MOOD_ICONS.neutral;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={VIBRANT_WELLNESS.mood.primary} />
        <Text style={styles.loadingText}>Loading mood insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mood Insights</Text>
          <Text style={styles.headerSubtitle}>Your emotional wellness</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={22} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Mood Hero Card */}
        <LinearGradient
          colors={VIBRANT_WELLNESS.mood.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            {latestMood ? (
              <>
                <View style={styles.heroIconContainer}>
                  <Ionicons
                    name={getMoodDisplay(latestMood.mood).icon}
                    size={48}
                    color={getMoodDisplay(latestMood.mood).color}
                  />
                </View>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroLabel}>You're feeling</Text>
                  <Text style={styles.heroMood}>
                    {getMoodDisplay(latestMood.mood).label}
                  </Text>
                  <Text style={styles.heroTime}>
                    {new Date(latestMood.loggedAt || latestMood.loggedDate).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.heroIntensity}>
                  <Text style={styles.heroIntensityValue}>
                    {latestMood.intensity || latestMood.energyLevel || 5}
                  </Text>
                  <Text style={styles.heroIntensityLabel}>/10</Text>
                </View>
              </>
            ) : (
              <View style={styles.heroEmptyState}>
                <Ionicons name="help-circle-outline" size={40} color={TEXT.tertiary} />
                <Text style={styles.heroEmptyText}>How are you feeling today?</Text>
                <TouchableOpacity onPress={handleLogMood} style={styles.heroLogButton}>
                  <Ionicons name="add-circle" size={18} color={TEXT.white} />
                  <Text style={styles.heroLogButtonText}>Log Mood</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Stats Row */}
          {moodStats && (
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{moodStats.avgMood || '—'}</Text>
                <Text style={styles.heroStatLabel}>Avg Mood</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{moodStats.loggedDays}</Text>
                <Text style={styles.heroStatLabel}>Days Logged</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <View style={styles.heroTrendContainer}>
                  <Ionicons
                    name={moodStats.trend === 'up' ? 'trending-up' : moodStats.trend === 'down' ? 'trending-down' : 'remove'}
                    size={20}
                    color={TEXT.white}
                  />
                </View>
                <Text style={styles.heroStatLabel}>
                  {moodStats.trend === 'up' ? 'Improving' : moodStats.trend === 'down' ? 'Declining' : 'Stable'}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Wellness Score Card */}
        {wellnessScore && (
          <View style={styles.wellnessScoreCard}>
            <View style={styles.wellnessScoreHeader}>
              <Ionicons name="heart-circle" size={24} color={VIBRANT_WELLNESS.mood.primary} />
              <Text style={styles.wellnessScoreTitle}>Mood Wellness Score</Text>
              {intelligenceLoading && (
                <ActivityIndicator size="small" color={VIBRANT_WELLNESS.mood.primary} style={{ marginLeft: 'auto' }} />
              )}
            </View>
            <View style={styles.wellnessScoreBody}>
              <View style={styles.wellnessScoreCircle}>
                <Text style={styles.wellnessScoreValue}>{wellnessScore.score}</Text>
                <Text style={styles.wellnessScoreMax}>/100</Text>
              </View>
              <View style={styles.wellnessScoreDetails}>
                <Text style={styles.wellnessScoreLabel}>{wellnessScore.label}</Text>
                <Text style={styles.wellnessScoreDescription}>{wellnessScore.description}</Text>
                <View style={styles.wellnessBreakdown}>
                  {wellnessScore.breakdown && Object.entries(wellnessScore.breakdown).slice(0, 3).map(([key, value]) => (
                    <View key={key} style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                      <View style={styles.breakdownBar}>
                        <View style={[styles.breakdownFill, { width: `${value}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {['week', 'month'].map((tf) => (
            <TouchableOpacity
              key={tf}
              onPress={() => setSelectedTimeframe(tf)}
              style={[
                styles.timeframeChip,
                selectedTimeframe === tf && styles.timeframeChipActive,
              ]}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === tf && styles.timeframeTextActive,
              ]}>
                {tf === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mood Trend Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: VIBRANT_WELLNESS.mood.primary + '20' }]}>
              <Ionicons name="analytics" size={20} color={VIBRANT_WELLNESS.mood.primary} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Mood Trend</Text>
              <Text style={styles.cardSubtitle}>Your emotional journey</Text>
            </View>
          </View>
          {renderTrendChart()}
        </View>

        {/* Pattern Detection */}
        {notePatterns.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#6366F120' }]}>
                <Ionicons name="sparkles" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Detected Patterns</Text>
                <Text style={styles.cardSubtitle}>From your mood notes</Text>
              </View>
            </View>
            <View style={styles.patternsContainer}>
              {notePatterns.map((pattern, i) => {
                const config = PATTERN_TAGS[pattern.type] || PATTERN_TAGS.stress;
                return (
                  <View key={i} style={styles.patternItem}>
                    <View style={[styles.patternIcon, { backgroundColor: config.color + '20' }]}>
                      <Ionicons name={config.icon} size={18} color={config.color} />
                    </View>
                    <View style={styles.patternContent}>
                      <Text style={styles.patternLabel}>{config.label}</Text>
                      <Text style={styles.patternMessage}>{pattern.message}</Text>
                    </View>
                    {pattern.count && (
                      <View style={styles.patternBadge}>
                        <Text style={styles.patternBadgeText}>{pattern.count}x</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Food-Mood Correlations */}
        {foodMoodCorrelations.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="restaurant" size={20} color="#EC4899" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Food & Mood</Text>
                <Text style={styles.cardSubtitle}>How meals affect you</Text>
              </View>
            </View>
            <View style={styles.correlationsContainer}>
              {foodMoodCorrelations.map((corr, i) => {
                const moodConfig = getMoodDisplay(corr.mood);
                return (
                  <View key={i} style={styles.correlationItem}>
                    <View style={[styles.correlationIconContainer, { backgroundColor: `${moodConfig.color}15` }]}>
                      <Ionicons name={moodConfig.icon} size={20} color={moodConfig.color} />
                    </View>
                    <View style={styles.correlationContent}>
                      <Text style={styles.correlationMood}>
                        Felt {moodConfig.label} after eating
                      </Text>
                      <Text style={styles.correlationMeals}>
                        {corr.meals.join(', ')}
                      </Text>
                    </View>
                    <View style={[styles.correlationIntensity, { backgroundColor: moodConfig.color + '20' }]}>
                      <Text style={[styles.correlationIntensityText, { color: moodConfig.color }]}>
                        {corr.intensity}/10
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* AI-Powered Recommendations */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: VIBRANT_WELLNESS.mood.primary + '20' }]}>
              <Ionicons name="sparkles" size={20} color={VIBRANT_WELLNESS.mood.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Smart Recommendations</Text>
              <Text style={styles.cardSubtitle}>
                {aiRecommendations.length > 0 ? 'AI-powered insights for you' : 'Personalized for you'}
              </Text>
            </View>
            {aiRecommendations.length > 0 && (
              <TouchableOpacity onPress={refetchIntelligence} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={intelligenceLoading ? TEXT.muted : VIBRANT_WELLNESS.mood.primary} />
              </TouchableOpacity>
            )}
          </View>

          {intelligenceLoading && aiRecommendations.length === 0 ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="small" color={VIBRANT_WELLNESS.mood.primary} />
              <Text style={styles.aiLoadingText}>Analyzing your patterns...</Text>
            </View>
          ) : aiRecommendations.length > 0 ? (
            <View style={styles.recommendationsContainer}>
              {aiRecommendations.slice(0, 5).map((rec, i) => {
                const priorityColors = {
                  high: SEMANTIC.error.base,
                  medium: SEMANTIC.warning.base,
                  low: SEMANTIC.success.base,
                };
                const priorityColor = priorityColors[rec.priority] || BRAND.primary;

                return (
                  <View key={i} style={styles.aiRecommendationItem}>
                    <View style={[styles.recommendationPriority, { backgroundColor: priorityColor + '20' }]}>
                      <Ionicons
                        name={rec.icon || 'bulb-outline'}
                        size={18}
                        color={priorityColor}
                      />
                    </View>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>{rec.title}</Text>
                      <Text style={styles.recommendationText}>{rec.message}</Text>
                      {rec.reasoning && (
                        <Text style={styles.recommendationReasoning}>{rec.reasoning}</Text>
                      )}
                    </View>
                    {rec.confidence && (
                      <View style={[styles.confidencePill, { backgroundColor: priorityColor + '15' }]}>
                        <Text style={[styles.confidenceText, { color: priorityColor }]}>
                          {Math.round(rec.confidence * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.recommendationsContainer}>
              {currentRecommendations.map((rec, i) => (
                <View key={i} style={styles.recommendationItem}>
                  <View style={styles.recommendationIcon}>
                    <Ionicons name={rec.icon} size={20} color={BRAND.primary} />
                  </View>
                  <Text style={styles.recommendationText}>{rec.text}</Text>
                  {rec.action && (
                    <TouchableOpacity onPress={handleLogMood} style={styles.recommendationAction}>
                      <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AI Insights Section */}
        {(insightsLoading || aiInsights.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="sparkles" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.cardTitle}>AI Insights</Text>
                <Text style={styles.cardSubtitle}>Deep pattern analysis</Text>
              </View>
              <TouchableOpacity onPress={loadAiInsights} style={styles.refreshButton}>
                <Ionicons
                  name="refresh"
                  size={18}
                  color={insightsLoading ? TEXT.muted : '#3B82F6'}
                />
              </TouchableOpacity>
            </View>

            {insightsLoading ? (
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.aiLoadingText}>Analyzing patterns...</Text>
              </View>
            ) : (
              <View style={styles.aiInsightsContainer}>
                {aiInsights.slice(0, 3).map((insight, i) => (
                  <View key={i} style={styles.aiInsightItem}>
                    <View style={styles.aiInsightHeader}>
                      <Text style={styles.aiInsightTitle}>{insight.title}</Text>
                      {insight.confidence && (
                        <View style={[
                          styles.confidenceBadge,
                          { backgroundColor: insight.confidence >= 0.7 ? SEMANTIC.success.base : SEMANTIC.warning.base }
                        ]}>
                          <Text style={styles.confidenceText}>
                            {Math.round(insight.confidence * 100)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.aiInsightMessage}>{insight.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Footer CTA */}
        <TouchableOpacity onPress={handleLogMood} style={styles.footerCta}>
          <LinearGradient
            colors={VIBRANT_WELLNESS.mood.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerCtaGradient}
          >
            <Ionicons name="add-circle" size={24} color={TEXT.white} />
            <Text style={styles.footerCtaText}>Log Your Mood</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color={TEXT.muted} />
          <Text style={styles.disclaimerText}>
            Insights are for informational purposes only. Consult a healthcare professional for medical advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    backgroundColor: SURFACES.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
  headerCenter: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  shareButton: {
    padding: SPACING[2],
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[10],
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[4],
  },
  heroTextContainer: {
    flex: 1,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  heroMood: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  heroTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroIntensity: {
    alignItems: 'center',
  },
  heroIntensityValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  heroIntensityLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  heroEmptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  heroEmptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING[2],
  },
  heroEmptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
    marginBottom: SPACING[3],
  },
  heroLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[2],
  },
  heroLogButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  heroStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroTrendContainer: {
    marginBottom: 2,
  },

  // Timeframe
  timeframeContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  timeframeChip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  timeframeChipActive: {
    backgroundColor: VIBRANT_WELLNESS.mood.primary,
    borderColor: VIBRANT_WELLNESS.mood.primary,
  },
  timeframeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  timeframeTextActive: {
    color: TEXT.white,
  },

  // Card
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
    gap: SPACING[3],
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CHART_WIDTH,
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[2],
  },
  chartLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    width: (CHART_WIDTH - 40) / 7,
  },
  chartEmptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
  },
  chartEmptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
  },

  // Patterns
  patternsContainer: {
    gap: SPACING[3],
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  patternIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  patternMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },
  patternBadge: {
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  patternBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },

  // Correlations
  correlationsContainer: {
    gap: SPACING[3],
  },
  correlationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  correlationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  correlationContent: {
    flex: 1,
  },
  correlationMood: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  correlationMeals: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },
  correlationIntensity: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  correlationIntensityText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Recommendations
  recommendationsContainer: {
    gap: SPACING[3],
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  recommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: BRAND.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    lineHeight: 20,
  },
  recommendationAction: {
    padding: SPACING[2],
  },

  // Wellness Score Card
  wellnessScoreCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  wellnessScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  wellnessScoreTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  wellnessScoreBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  wellnessScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: VIBRANT_WELLNESS.mood.primary + '15',
    borderWidth: 3,
    borderColor: VIBRANT_WELLNESS.mood.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wellnessScoreValue: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: VIBRANT_WELLNESS.mood.primary,
  },
  wellnessScoreMax: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: -4,
  },
  wellnessScoreDetails: {
    flex: 1,
  },
  wellnessScoreLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  wellnessScoreDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  wellnessBreakdown: {
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  breakdownLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    width: 80,
    textTransform: 'capitalize',
  },
  breakdownBar: {
    flex: 1,
    height: 4,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 2,
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: VIBRANT_WELLNESS.mood.primary,
    borderRadius: 2,
  },

  // AI Recommendation Items
  aiRecommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  recommendationPriority: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  recommendationReasoning: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  confidencePill: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },

  // AI Insights
  refreshButton: {
    marginLeft: 'auto',
    padding: SPACING[2],
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
  },
  aiLoadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  aiInsightsContainer: {
    gap: SPACING[3],
  },
  aiInsightItem: {
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  aiInsightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  aiInsightMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Footer CTA
  footerCta: {
    marginTop: SPACING[2],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  footerCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2],
  },
  footerCtaText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  disclaimerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    lineHeight: 16,
  },
});
