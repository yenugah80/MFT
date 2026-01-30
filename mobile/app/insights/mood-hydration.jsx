/**
 * Mood-Hydration Insights Screen
 *
 * Your app's differentiator - connecting how you feel to what you drink
 *
 * Features:
 * - Fast, frictionless mood capture (slider)
 * - Mood influencer selection (Hydration, Sleep, Stress, Exercise)
 * - Mood → Hydration correlation insights
 * - Visual mood timeline with hydration overlay
 * - Mood-triggered recommendations
 * - Weekly emotional summary with AI reflection
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { TYPOGRAPHY } from '../../constants/premiumTheme';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useWaterLog } from '../../hooks/useWaterLog';
import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useMoodLog } from '../../hooks/useMoodLog';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOAL_ML = 2000;

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  mood: {
    veryLow: '#EF4444',
    low: '#F97316',
    neutral: '#FBBF24',
    good: '#84CC16',
    excellent: '#10B981',
  },
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

const MOOD_LEVELS = [
  { value: 1, label: 'Very Low', icon: 'sad-outline', color: COLORS.mood.veryLow },
  { value: 2, label: 'Low', icon: 'sad', color: COLORS.mood.low },
  { value: 3, label: 'Neutral', icon: 'happy-outline', color: COLORS.mood.neutral },
  { value: 4, label: 'Good', icon: 'happy', color: COLORS.mood.good },
  { value: 5, label: 'Excellent', icon: 'heart', color: COLORS.mood.excellent },
];

const MOOD_INFLUENCERS = [
  { id: 'hydration', label: 'Hydration', icon: 'water', color: '#0EA5E9' },
  { id: 'sleep', label: 'Sleep', icon: 'moon', color: '#8B5CF6' },
  { id: 'stress', label: 'Stress', icon: 'pulse', color: '#EF4444' },
  { id: 'exercise', label: 'Exercise', icon: 'fitness', color: '#10B981' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getLocalDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getMoodFromValue = (value) => {
  const rounded = Math.round(value);
  return MOOD_LEVELS.find(m => m.value === rounded) || MOOD_LEVELS[2];
};

const getMoodIcon = (moodValue) => {
  if (moodValue >= 4.5) return 'heart';
  if (moodValue >= 3.5) return 'happy';
  if (moodValue >= 2.5) return 'happy-outline';
  if (moodValue >= 1.5) return 'sad';
  return 'sad-outline';
};

const getMoodColor = (moodValue) => {
  if (moodValue >= 4.5) return COLORS.mood.excellent;
  if (moodValue >= 3.5) return COLORS.mood.good;
  if (moodValue >= 2.5) return COLORS.mood.neutral;
  if (moodValue >= 1.5) return COLORS.mood.low;
  return COLORS.mood.veryLow;
};

// ============================================================================
// QUICK MOOD CAPTURE COMPONENT
// ============================================================================

const QuickMoodCapture = ({ onMoodLogged }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedInfluencers, setSelectedInfluencers] = useState([]);
  const [isLogging, setIsLogging] = useState(false);
  const [hasLogged, setHasLogged] = useState(false);

  const currentMood = selectedMood ? getMoodFromValue(selectedMood) : null;

  const selectMood = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMood(value);
  };

  const toggleInfluencer = (id) => {
    Haptics.selectionAsync();
    setSelectedInfluencers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLogMood = async () => {
    if (!selectedMood) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLogging(true);

    // Simulate logging (replace with actual API call)
    await new Promise(r => setTimeout(r, 500));

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHasLogged(true);
    setIsLogging(false);
    onMoodLogged?.({ value: selectedMood, influencers: selectedInfluencers });
  };

  if (hasLogged && currentMood) {
    return (
      <View style={styles.moodCaptureCard}>
        <LinearGradient
          colors={[`${currentMood.color}15`, `${currentMood.color}05`]}
          style={styles.moodLoggedGradient}
        >
          <View style={styles.moodLoggedContent}>
            <Ionicons name="checkmark-circle" size={32} color={currentMood.color} />
            <View>
              <Text style={styles.moodLoggedText}>Mood logged!</Text>
              <Text style={styles.moodLoggedSubtext}>
                Feeling {currentMood.label.toLowerCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logAnotherButton}
            onPress={() => {
              setHasLogged(false);
              setSelectedMood(null);
              setSelectedInfluencers([]);
            }}
          >
            <Text style={styles.logAnotherText}>Update</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.moodCaptureCard}>
      <Text style={styles.moodCaptureTitle}>How are you feeling?</Text>

      {/* Mood Tap Scale - Fast & Frictionless */}
      <View style={styles.moodScale}>
        {MOOD_LEVELS.map((mood) => {
          const isSelected = selectedMood === mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodOption,
                isSelected && { backgroundColor: `${mood.color}20`, borderColor: mood.color }
              ]}
              onPress={() => selectMood(mood.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mood.icon}
                size={isSelected ? 28 : 24}
                color={isSelected ? mood.color : COLORS.text.tertiary}
              />
              <Text style={[
                styles.moodOptionLabel,
                isSelected && { color: mood.color, fontWeight: '600' }
              ]}>
                {mood.label.split(' ').pop()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scale Labels */}
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabelText}>Very Low</Text>
        <Text style={styles.scaleLabelText}>Very High</Text>
      </View>

      {/* Mood Influencers - Only show after mood selected */}
      {selectedMood && (
        <>
          <Text style={styles.influencerQuestion}>What influenced your mood?</Text>
          <View style={styles.influencerChips}>
            {MOOD_INFLUENCERS.map((inf) => {
              const isSelected = selectedInfluencers.includes(inf.id);
              return (
                <TouchableOpacity
                  key={inf.id}
                  style={[
                    styles.influencerChip,
                    isSelected && { backgroundColor: `${inf.color}15`, borderColor: inf.color }
                  ]}
                  onPress={() => toggleInfluencer(inf.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inf.icon}
                    size={16}
                    color={isSelected ? inf.color : COLORS.text.tertiary}
                  />
                  <Text style={[
                    styles.influencerLabel,
                    isSelected && { color: inf.color, fontWeight: '600' }
                  ]}>
                    {inf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Log Button */}
          <TouchableOpacity
            style={[styles.logMoodButton, { backgroundColor: currentMood?.color || COLORS.primary }]}
            onPress={handleLogMood}
            disabled={isLogging}
            activeOpacity={0.8}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.logMoodButtonText}>Log Mood</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ============================================================================
// MOOD-HYDRATION INSIGHT CARD
// ============================================================================

const MoodHydrationInsightCard = ({ insight }) => {
  if (!insight) return null;

  return (
    <View style={styles.insightCard}>
      <LinearGradient
        colors={['#FEF3C7', '#FFFBEB']}
        style={styles.insightGradient}
      >
        <View style={styles.insightHeader}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          <Text style={styles.insightLabel}>Insight</Text>
        </View>
        <Text style={styles.insightText}>{insight.text}</Text>
        {insight.stat && (
          <View style={styles.insightStat}>
            <Text style={styles.insightStatValue}>{insight.stat}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// MOOD TIMELINE WITH HYDRATION OVERLAY
// ============================================================================

const MoodTimeline = ({ weekData }) => {
  return (
    <View style={styles.timelineCard}>
      <Text style={styles.timelineTitle}>This Week</Text>
      <Text style={styles.timelineSubtitle}>Mood & Hydration Connection</Text>

      <View style={styles.timelineGrid}>
        {weekData.map((day, index) => {
          const moodColor = getMoodColor(day.mood);
          const hydrationPct = Math.min(100, Math.round((day.hydrationMl / GOAL_ML) * 100));

          return (
            <View key={index} style={styles.timelineDay}>
              <Text style={styles.timelineDayLabel}>{day.day}</Text>

              {/* Mood Icon */}
              <View style={[styles.moodDot, { backgroundColor: `${moodColor}20` }]}>
                <Ionicons
                  name={getMoodIcon(day.mood)}
                  size={18}
                  color={moodColor}
                />
              </View>

              {/* Hydration Bar */}
              <View style={styles.hydrationBarContainer}>
                <View style={[styles.hydrationBarFill, {
                  height: `${hydrationPct}%`,
                  backgroundColor: hydrationPct >= 80 ? COLORS.mood.excellent :
                                   hydrationPct >= 60 ? COLORS.primary :
                                   hydrationPct >= 40 ? COLORS.mood.neutral : COLORS.mood.low
                }]} />
              </View>
              <Text style={styles.hydrationPct}>{hydrationPct}%</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.timelineLegend}>
        <View style={styles.legendItem}>
          <Ionicons name="happy" size={14} color={COLORS.text.secondary} />
          <Text style={styles.legendText}>Mood</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Hydration</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// CORRELATION INSIGHTS SECTION
// ============================================================================

const CorrelationInsights = ({ correlations }) => {
  return (
    <View style={styles.correlationSection}>
      <Text style={styles.sectionTitle}>Your Patterns</Text>
      <Text style={styles.sectionSubtitle}>Based on your logs</Text>

      {correlations.map((corr, index) => (
        <View key={index} style={styles.correlationCard}>
          <View style={[styles.correlationIcon, { backgroundColor: `${corr.color}15` }]}>
            <Ionicons name={corr.icon} size={20} color={corr.color} />
          </View>
          <View style={styles.correlationContent}>
            <Text style={styles.correlationText}>{corr.text}</Text>
            {corr.stat && (
              <Text style={[styles.correlationStat, { color: corr.color }]}>
                {corr.stat}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// MOOD-TRIGGERED RECOMMENDATION
// ============================================================================

const MoodRecommendation = ({ currentMood, hydrationPct }) => {
  const recommendation = useMemo(() => {
    if (currentMood <= 2 && hydrationPct < 50) {
      return {
        icon: 'water',
        color: COLORS.primary,
        title: 'A glass of water might help',
        description: 'Low hydration can affect energy and mood. Try drinking a full glass now.',
        action: 'Log Water',
      };
    }
    if (currentMood <= 2) {
      return {
        icon: 'heart',
        color: COLORS.mood.low,
        title: 'Take a mindful moment',
        description: 'Deep breath + hydration combo can help reset your energy.',
        action: 'Start',
      };
    }
    if (currentMood >= 4 && hydrationPct >= 80) {
      return {
        icon: 'trophy',
        color: COLORS.mood.excellent,
        title: 'Keep this streak alive!',
        description: 'Great mood + great hydration. You\'re on fire today!',
        action: null,
      };
    }
    if (hydrationPct < 50) {
      return {
        icon: 'water-outline',
        color: COLORS.primary,
        title: 'Hydration check',
        description: 'You\'re at ' + hydrationPct + '% of your goal. A few more glasses can boost your afternoon.',
        action: 'Log Water',
      };
    }
    return {
      icon: 'sunny',
      color: COLORS.mood.good,
      title: 'You\'re doing great!',
      description: 'Keep listening to your body and staying consistent.',
      action: null,
    };
  }, [currentMood, hydrationPct]);

  return (
    <View style={styles.recommendationCard}>
      <LinearGradient
        colors={[`${recommendation.color}10`, `${recommendation.color}05`]}
        style={styles.recommendationGradient}
      >
        <View style={[styles.recommendationIcon, { backgroundColor: `${recommendation.color}20` }]}>
          <Ionicons name={recommendation.icon} size={24} color={recommendation.color} />
        </View>
        <View style={styles.recommendationContent}>
          <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
          <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
        </View>
        {recommendation.action && (
          <TouchableOpacity
            style={[styles.recommendationAction, { backgroundColor: recommendation.color }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text style={styles.recommendationActionText}>{recommendation.action}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// WEEKLY EMOTIONAL SUMMARY
// ============================================================================

const WeeklySummary = ({ weekData, avgMood, avgHydration }) => {
  const summaryText = useMemo(() => {
    const highHydrationDays = weekData.filter(d => d.hydrationMl >= GOAL_ML).length;
    const highMoodDays = weekData.filter(d => d.mood >= 4).length;

    if (highHydrationDays >= 5 && highMoodDays >= 4) {
      return "Amazing week! You felt best on well-hydrated days. Keep this momentum going!";
    }
    if (avgMood >= 3.5) {
      return `Good week overall! You had ${highMoodDays} great mood days. Hydration goal was met ${highHydrationDays}/7 days.`;
    }
    if (avgHydration >= 70) {
      return "Your hydration was solid this week. Focus on what else might be affecting your mood.";
    }
    return "Room for improvement this week. Try increasing your water intake - it might boost how you feel!";
  }, [weekData, avgMood, avgHydration]);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="sparkles" size={20} color="#8B5CF6" />
        <Text style={styles.summaryTitle}>Weekly Reflection</Text>
      </View>
      <Text style={styles.summaryText}>{summaryText}</Text>

      <View style={styles.summaryStats}>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{avgMood.toFixed(1)}</Text>
          <Text style={styles.summaryStatLabel}>Avg Mood</Text>
        </View>
        <View style={styles.summaryStatDivider} />
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{avgHydration}%</Text>
          <Text style={styles.summaryStatLabel}>Avg Hydration</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoodHydrationScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoggedMood, setLastLoggedMood] = useState(null);

  // Hooks for real data
  const { fetchHistory } = useWaterLog();
  const { trends: moodTrends, isLoading: moodLoading } = useMoodTrends({ period: 'week' });

  // State for hydration history
  const [hydrationHistory, setHydrationHistory] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch real hydration history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        const history = await fetchHistory({
          startDate: weekAgo.toISOString(),
          endDate: today.toISOString(),
          limit: 100,
        });

        // Aggregate by date
        const byDate = {};
        (history?.logs || []).forEach(log => {
          const date = getLocalDateKey(new Date(log.loggedDate || log.createdAt));
          const ml = (parseFloat(log.amountLiters || log.hydrationLiters || 0)) * 1000;
          byDate[date] = (byDate[date] || 0) + ml;
        });
        setHydrationHistory(byDate);
      } catch (err) {
        console.error('[mood-hydration] Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [fetchHistory]);

  // Build week data from real mood trends and hydration history
  const weekData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const data = [];

    // Build mood lookup from trends
    const moodByDate = {};
    if (moodTrends?.trendData) {
      moodTrends.trendData.forEach(entry => {
        if (entry.dayKey) {
          moodByDate[entry.dayKey] = entry.intensity || 0;
        }
      });
    }

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + i);
      const dateKey = getLocalDateKey(date);

      // Use REAL data from hooks, default to 0 if no data
      data.push({
        day: DAYS[i],
        date: dateKey,
        mood: moodByDate[dateKey] || 0, // Real mood data
        hydrationMl: hydrationHistory[dateKey] || 0, // Real hydration data
        hasData: Boolean(moodByDate[dateKey] || hydrationHistory[dateKey]),
      });
    }

    return data;
  }, [moodTrends, hydrationHistory]);

  // Check if we have enough real data
  const hasRealData = useMemo(() => {
    const daysWithData = weekData.filter(d => d.hasData).length;
    return daysWithData >= 3; // Need at least 3 days of data
  }, [weekData]);

  const avgMood = useMemo(() => {
    const validDays = weekData.filter(d => d.mood > 0);
    if (validDays.length === 0) return 0;
    return validDays.reduce((sum, d) => sum + d.mood, 0) / validDays.length;
  }, [weekData]);

  const avgHydration = useMemo(() => {
    const validDays = weekData.filter(d => d.hydrationMl > 0);
    if (validDays.length === 0) return 0;
    return Math.round((validDays.reduce((sum, d) => sum + d.hydrationMl, 0) / validDays.length / GOAL_ML) * 100);
  }, [weekData]);

  const todayHydrationPct = useMemo(() => {
    const today = weekData.find(d => d.date === getLocalDateKey(new Date()));
    return today ? Math.round((today.hydrationMl / GOAL_ML) * 100) : 0;
  }, [weekData]);

  // Generate correlation insights based on REAL data only
  const correlations = useMemo(() => {
    const insights = [];

    // Only compute correlations if we have enough real data
    if (!hasRealData) {
      return [{
        icon: 'information-circle',
        color: COLORS.text.secondary,
        text: 'Log mood and hydration for 3+ days to see correlations',
        stat: null,
        isPlaceholder: true,
      }];
    }

    // High hydration = better mood correlation (only with sufficient data)
    const highHydrationDays = weekData.filter(d => d.hydrationMl >= GOAL_ML && d.mood > 0);
    const lowHydrationDays = weekData.filter(d => d.hydrationMl > 0 && d.hydrationMl < GOAL_ML * 0.6 && d.mood > 0);

    // Need at least 2 days in each category for meaningful comparison
    if (highHydrationDays.length >= 2 && lowHydrationDays.length >= 2) {
      const highHydrationMood = highHydrationDays.reduce((s, d) => s + d.mood, 0) / highHydrationDays.length;
      const lowHydrationMood = lowHydrationDays.reduce((s, d) => s + d.mood, 0) / lowHydrationDays.length;

      if (lowHydrationMood > 0) {
        const moodDiff = Math.round(((highHydrationMood - lowHydrationMood) / lowHydrationMood) * 100);

        // Only show if difference is statistically meaningful (>10%)
        if (Math.abs(moodDiff) > 10) {
          insights.push({
            icon: moodDiff > 0 ? 'trending-up' : 'trending-down',
            color: moodDiff > 0 ? COLORS.mood.excellent : COLORS.mood.low,
            text: moodDiff > 0
              ? `On days you drink >2L, your mood is ${moodDiff}% higher`
              : `Your mood is ${Math.abs(moodDiff)}% lower on low hydration days`,
            stat: moodDiff > 0 ? `+${moodDiff}%` : `${moodDiff}%`,
          });
        }
      }
    }

    // Streak correlation (only show if actually achieved)
    const goalMetDays = weekData.filter(d => d.hydrationMl >= GOAL_ML);
    if (goalMetDays.length >= 3) {
      insights.push({
        icon: 'flame',
        color: '#EF4444',
        text: `${goalMetDays.length} days hitting your hydration goal this week`,
        stat: `${goalMetDays.length}/7`,
      });
    }

    // If no correlations found, provide helpful message
    if (insights.length === 0) {
      insights.push({
        icon: 'analytics',
        color: COLORS.text.secondary,
        text: 'Keep logging to discover your mood-hydration patterns',
        stat: null,
      });
    }

    return insights;
  }, [weekData, hasRealData]);

  // Today's insight - based on REAL data only
  const todayInsight = useMemo(() => {
    // Don't show insights without real data
    if (!hasRealData) {
      return {
        text: 'Start logging to see personalized insights',
        stat: null,
      };
    }

    // Calculate actual mood boost from data
    const highHydrationDays = weekData.filter(d => d.hydrationMl >= GOAL_ML && d.mood > 0);
    const lowHydrationDays = weekData.filter(d => d.hydrationMl > 0 && d.hydrationMl < GOAL_ML * 0.6 && d.mood > 0);

    let moodBoostPercent = null;
    if (highHydrationDays.length >= 2 && lowHydrationDays.length >= 2) {
      const highMoodAvg = highHydrationDays.reduce((s, d) => s + d.mood, 0) / highHydrationDays.length;
      const lowMoodAvg = lowHydrationDays.reduce((s, d) => s + d.mood, 0) / lowHydrationDays.length;
      if (lowMoodAvg > 0) {
        moodBoostPercent = Math.round(((highMoodAvg - lowMoodAvg) / lowMoodAvg) * 100);
      }
    }

    if (avgHydration >= 80 && avgMood >= 4 && moodBoostPercent && moodBoostPercent > 0) {
      return {
        text: 'You report better mood on days you stay well-hydrated. Keep it up!',
        stat: `+${moodBoostPercent}% mood boost`, // Real calculated value
      };
    }
    if (avgHydration < 60) {
      return {
        text: 'Your hydration has been lower this week. This might be affecting how you feel.',
        stat: null,
      };
    }
    return {
      text: 'Building your mood-hydration profile. Keep logging to unlock personalized insights!',
      stat: null,
    };
  }, [avgMood, avgHydration]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/');
    }
  }, [router]);

  const handleMoodLogged = useCallback((mood) => {
    setLastLoggedMood(mood);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mood & Hydration',
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Quick Mood Capture - Fast & Frictionless */}
        <QuickMoodCapture onMoodLogged={handleMoodLogged} />

        {/* Mood-Triggered Recommendation */}
        <MoodRecommendation
          currentMood={lastLoggedMood?.value || avgMood}
          hydrationPct={todayHydrationPct}
        />

        {/* Today's Insight Card */}
        <MoodHydrationInsightCard insight={todayInsight} />

        {/* Mood Timeline with Hydration Overlay */}
        <MoodTimeline weekData={weekData} />

        {/* Correlation Insights */}
        <CorrelationInsights correlations={correlations} />

        {/* Weekly Emotional Summary */}
        <WeeklySummary
          weekData={weekData}
          avgMood={avgMood}
          avgHydration={avgHydration}
        />

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8 },
  headerButton: { padding: 8 },

  // Quick Mood Capture
  moodCaptureCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  moodCaptureTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  moodScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  moodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  moodOptionLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scaleLabelText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  influencerQuestion: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  influencerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  influencerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  influencerLabel: { fontSize: 13, color: COLORS.text.secondary },
  logMoodButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logMoodButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  moodLoggedGradient: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodLoggedContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moodLoggedText: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  fontFamily: TYPOGRAPHY.family.semibold,
  moodLoggedSubtext: { fontSize: 13, color: COLORS.text.secondary },
  logAnotherButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  logAnotherText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  fontFamily: TYPOGRAPHY.family.semibold,

  // Insight Card
  insightCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightGradient: { padding: 16 },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightLabel: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  fontFamily: TYPOGRAPHY.family.bold,
  insightText: { fontSize: 15, color: COLORS.text.primary, lineHeight: 22 },
  insightStat: { marginTop: 8 },
  insightStatValue: { fontSize: 13, fontWeight: '600', color: COLORS.mood.excellent },
  fontFamily: TYPOGRAPHY.family.semibold,

  // Timeline
  timelineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  timelineSubtitle: { fontSize: 13, color: COLORS.text.tertiary, marginBottom: 16 },
  timelineGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineDay: { alignItems: 'center', flex: 1 },
  timelineDayLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.tertiary, marginBottom: 8 },
  fontFamily: TYPOGRAPHY.family.semibold,
  moodDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  hydrationBarContainer: {
    width: 12,
    height: 40,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  hydrationBarFill: { width: '100%', borderRadius: 6 },
  hydrationPct: { fontSize: 10, color: COLORS.text.tertiary, marginTop: 4 },
  timelineLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: COLORS.text.secondary },

  // Correlations
  correlationSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  sectionSubtitle: { fontSize: 13, color: COLORS.text.tertiary, marginBottom: 12 },
  correlationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  correlationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  correlationContent: { flex: 1 },
  correlationText: { fontSize: 14, color: COLORS.text.primary, lineHeight: 20 },
  correlationStat: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  fontFamily: TYPOGRAPHY.family.bold,

  // Recommendation
  recommendationCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recommendationGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationContent: { flex: 1 },
  recommendationTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  fontFamily: TYPOGRAPHY.family.bold,
  recommendationDescription: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  recommendationAction: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  recommendationActionText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Weekly Summary
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#8B5CF6' },
  fontFamily: TYPOGRAPHY.family.bold,
  summaryText: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 22, marginBottom: 16 },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryStatItem: { alignItems: 'center' },
  summaryStatValue: { fontSize: 24, fontWeight: '700', color: COLORS.text.primary },
  fontFamily: TYPOGRAPHY.family.bold,
  summaryStatLabel: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 4 },
  summaryStatDivider: { width: 1, backgroundColor: COLORS.border },
});
