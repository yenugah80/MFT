/**
 * Hydration Insights Screen - Full Screen View
 * Personalized hydration insights derived from user logs.
 * Includes patterns, persona, predictions, and weekly trends.
 *
 * Design Philosophy: Calm Luxury (Oura Ring aesthetic)
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Line, Path } from 'react-native-svg';

import { useNotification } from '../../providers/NotificationProvider';
import { useDashboard } from '../../hooks/useDashboard';
import { useHydrationAnalytics } from '../../hooks/useHydrationAnalytics';
import { useWaterLog } from '../../hooks/useWaterLog';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';
import {
  HYDRATION_ACCENT,
  HYDRATION_BASE,
  HYDRATION_PREDICTION,
  HYDRATION_EFFECTS,
  HYDRATION_SEMANTIC,
} from '../../constants/hydrationTheme';

// ============================================================================
// HYDRATION WEEK CHART
// ============================================================================

function HydrationWeekChart({ data = [], goalMl = 2000 }) {
  const chartWidth = 280;
  const chartHeight = 120;
  const barWidth = 28;
  const barGap = 12;

  const maxValue = Math.max(goalMl, ...data.map(d => d.total || 0));

  if (!data || data.length === 0) {
    return (
      <View style={chartStyles.emptyChart}>
        <Text style={chartStyles.emptyText}>Log water to see your weekly trend</Text>
      </View>
    );
  }

  return (
    <View style={chartStyles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight + 30}>
        <Defs>
          <SvgGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={HYDRATION_ACCENT.primary} />
            <Stop offset="100%" stopColor={HYDRATION_ACCENT.primaryLight} />
          </SvgGradient>
        </Defs>

        {/* Goal line */}
        <Line
          x1={0}
          y1={chartHeight - (goalMl / maxValue) * chartHeight}
          x2={chartWidth}
          y2={chartHeight - (goalMl / maxValue) * chartHeight}
          stroke={HYDRATION_SEMANTIC.success.base}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Bars */}
        {data.map((day, index) => {
          const barHeight = ((day.total || 0) / maxValue) * chartHeight;
          const x = index * (barWidth + barGap) + 10;
          const y = chartHeight - barHeight;
          const isGoalMet = (day.total || 0) >= goalMl;

          return (
            <React.Fragment key={day.date || index}>
              <Circle
                cx={x + barWidth / 2}
                cy={y}
                r={barWidth / 2}
                fill={isGoalMet ? HYDRATION_SEMANTIC.success.base : 'url(#barGradient)'}
              />
              <Line
                x1={x + barWidth / 2}
                y1={y}
                x2={x + barWidth / 2}
                y2={chartHeight}
                stroke={isGoalMet ? HYDRATION_SEMANTIC.success.base : 'url(#barGradient)'}
                strokeWidth={barWidth}
                strokeLinecap="round"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Day labels */}
      <View style={chartStyles.dayLabels}>
        {data.map((day, index) => (
          <Text key={index} style={chartStyles.dayLabel}>
            {day.label || getDayLabel(day.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const getDayLabel = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
};

const chartStyles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    paddingHorizontal: 10,
    marginTop: SPACING[2],
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    width: 28,
    textAlign: 'center',
  },
  emptyChart: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[6],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
});

// ============================================================================
// PERSONA CARD
// ============================================================================

function PersonaCard({ persona, confidence }) {
  if (!persona) return null;

  const confidencePercent = Math.round((confidence || 0) * 100);

  return (
    <View style={personaStyles.card}>
      <View style={personaStyles.header}>
        <View style={personaStyles.iconContainer}>
          <Ionicons name={persona.icon || 'water'} size={24} color={HYDRATION_ACCENT.primary} />
        </View>
        <View style={personaStyles.headerText}>
          <Text style={personaStyles.title}>{persona.title}</Text>
          <Text style={personaStyles.confidence}>{confidencePercent}% confidence</Text>
        </View>
      </View>
      <Text style={personaStyles.description}>{persona.description}</Text>
      {persona.recommendation && (
        <View style={personaStyles.recommendationBox}>
          <Ionicons name="bulb-outline" size={16} color={HYDRATION_SEMANTIC.success.base} />
          <Text style={personaStyles.recommendation}>{persona.recommendation}</Text>
        </View>
      )}
    </View>
  );
}

const personaStyles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: `${HYDRATION_ACCENT.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  confidence: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recommendation: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    lineHeight: 18,
  },
});

// ============================================================================
// PREDICTION DETAIL CARD
// ============================================================================

function PredictionDetailCard({ prediction }) {
  if (!prediction?.hasPrediction) return null;

  const { predictedNeedLiters, baseGoalLiters, typicalIntakeLiters, factors, confidence } = prediction;

  return (
    <View style={predictionStyles.card}>
      <View style={predictionStyles.header}>
        <View style={predictionStyles.dot} />
        <Text style={predictionStyles.label}>Tomorrow's Prediction</Text>
      </View>

      <View style={predictionStyles.mainValue}>
        <Text style={predictionStyles.value}>{(predictedNeedLiters * 1000).toFixed(0)}</Text>
        <Text style={predictionStyles.unit}>ml</Text>
      </View>

      <View style={predictionStyles.breakdown}>
        <View style={predictionStyles.breakdownRow}>
          <Text style={predictionStyles.breakdownLabel}>Your typical intake</Text>
          <Text style={predictionStyles.breakdownValue}>{(typicalIntakeLiters * 1000).toFixed(0)}ml</Text>
        </View>

        {factors?.map((factor, index) => (
          <View key={index} style={predictionStyles.breakdownRow}>
            <View style={predictionStyles.factorLabel}>
              <Ionicons
                name={factor.type === 'meetings' ? 'calendar-outline' : 'sunny-outline'}
                size={14}
                color={HYDRATION_PREDICTION.primary}
              />
              <Text style={predictionStyles.breakdownLabel}>{factor.description}</Text>
            </View>
            <Text style={predictionStyles.factorValue}>+{(factor.adjustment * 1000).toFixed(0)}ml</Text>
          </View>
        ))}

        <View style={[predictionStyles.breakdownRow, predictionStyles.totalRow]}>
          <Text style={predictionStyles.totalLabel}>Estimated total</Text>
          <Text style={predictionStyles.totalValue}>{(predictedNeedLiters * 1000).toFixed(0)}ml</Text>
        </View>
      </View>

      <Text style={predictionStyles.footnote}>
        Confidence: {Math.round((confidence || 0.6) * 100)}% • Based on your patterns
      </Text>
    </View>
  );
}

const predictionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderLeftWidth: 3,
    borderLeftColor: HYDRATION_PREDICTION.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HYDRATION_PREDICTION.primary,
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    color: HYDRATION_PREDICTION.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  value: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  unit: {
    fontSize: TYPOGRAPHY.size.lg,
    color: TEXT.secondary,
  },
  breakdown: {
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: SPACING[2],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  factorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  factorValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: HYDRATION_PREDICTION.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  totalRow: {
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  totalValue: {
    fontSize: TYPOGRAPHY.size.lg,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  footnote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },
});

// ============================================================================
// PATTERN INSIGHTS CARD
// ============================================================================

function PatternInsightsCard({ patterns }) {
  if (!patterns) return null;

  const {
    avgDaily,
    avgWeekday,
    avgWeekend,
    weekendDrop,
    peakHour,
    periodDistribution,
    coffeeToWaterRatio,
  } = patterns;

  const formatTime = (hour) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}${ampm}`;
  };

  const insights = [];

  // Peak hydration hour
  if (peakHour !== undefined) {
    insights.push({
      icon: 'time-outline',
      title: 'Peak Hydration',
      value: formatTime(peakHour),
      description: 'Your most active hydration hour',
    });
  }

  // Weekend pattern
  if (weekendDrop > 0.1) {
    insights.push({
      icon: 'calendar-outline',
      title: 'Weekend Drop',
      value: `-${Math.round(weekendDrop * 100)}%`,
      description: 'You drink less on weekends',
    });
  }

  // Time distribution
  if (periodDistribution) {
    const dominantPeriod =
      periodDistribution.morning > periodDistribution.afternoon &&
      periodDistribution.morning > periodDistribution.evening
        ? 'Morning'
        : periodDistribution.afternoon > periodDistribution.evening
        ? 'Afternoon'
        : 'Evening';

    insights.push({
      icon: 'sunny-outline',
      title: 'Best Time',
      value: dominantPeriod,
      description: 'When you hydrate most',
    });
  }

  // Coffee ratio
  if (coffeeToWaterRatio > 0.2) {
    insights.push({
      icon: 'cafe-outline',
      title: 'Coffee Balance',
      value: `${Math.round(coffeeToWaterRatio * 100)}%`,
      description: 'Coffee to water ratio',
    });
  }

  return (
    <View style={patternStyles.card}>
      <Text style={patternStyles.title}>Your Patterns</Text>

      <View style={patternStyles.statsRow}>
        <View style={patternStyles.statItem}>
          <Text style={patternStyles.statValue}>{(avgDaily * 1000).toFixed(0)}</Text>
          <Text style={patternStyles.statLabel}>Daily avg (ml)</Text>
        </View>
        <View style={patternStyles.statDivider} />
        <View style={patternStyles.statItem}>
          <Text style={patternStyles.statValue}>{(avgWeekday * 1000).toFixed(0)}</Text>
          <Text style={patternStyles.statLabel}>Weekday (ml)</Text>
        </View>
        <View style={patternStyles.statDivider} />
        <View style={patternStyles.statItem}>
          <Text style={patternStyles.statValue}>{(avgWeekend * 1000).toFixed(0)}</Text>
          <Text style={patternStyles.statLabel}>Weekend (ml)</Text>
        </View>
      </View>

      {insights.length > 0 && (
        <View style={patternStyles.insightsList}>
          {insights.map((insight, index) => (
            <View key={index} style={patternStyles.insightRow}>
              <View style={patternStyles.insightIcon}>
                <Ionicons name={insight.icon} size={18} color={HYDRATION_ACCENT.primary} />
              </View>
              <View style={patternStyles.insightContent}>
                <View style={patternStyles.insightHeader}>
                  <Text style={patternStyles.insightTitle}>{insight.title}</Text>
                  <Text style={patternStyles.insightValue}>{insight.value}</Text>
                </View>
                <Text style={patternStyles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const patternStyles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F5',
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING[2],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  insightsList: {
    gap: SPACING[3],
  },
  insightRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: `${HYDRATION_ACCENT.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: HYDRATION_ACCENT.primary,
  },
  insightDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function HydrationInsightsScreen() {
  const router = useRouter();
  const notify = useNotification();

  const { data: dashboardData } = useDashboard();
  const { analytics, isLoading, isFetching, refetch } = useHydrationAnalytics();
  const { fetchHistory: fetchWaterHistory } = useWaterLog();

  const weekData = dashboardData?.trends?.hydrationWeekData || [];
  const goalMl = (dashboardData?.goals?.waterLiters || 2.0) * 1000;

  const handleShare = async () => {
    if (!analytics) {
      notify.error('No insights to share yet.');
      return;
    }

    const persona = analytics.persona?.title || 'Hydration Tracker';
    const avgDaily = analytics.patterns?.avgDaily
      ? `${(analytics.patterns.avgDaily * 1000).toFixed(0)}ml daily average`
      : '';

    const message = `My Hydration Profile\n\n${persona}\n${avgDaily}\n\nTracked with MyFoodTracker`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('[HydrationInsightsScreen] Failed to share:', error);
      notify.error('Unable to share insights right now.');
    }
  };

  // Cold start check
  const isColdStart = ['day0', 'days1-3', 'days4-7'].includes(analytics?.coldStart?.stage);
  const daysWithData = analytics?.coldStart?.distinctDays || 0;
  const daysRemaining = Math.max(0, 7 - daysWithData);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Hydration Insights</Text>
          <Text style={styles.headerSubtitle}>Your hydration intelligence</Text>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButton}
          disabled={isLoading || isColdStart}
        >
          <Ionicons name="share-outline" size={20} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={HYDRATION_ACCENT.primary} />
            <Text style={styles.loadingText}>Analyzing your patterns...</Text>
          </View>
        )}

        {/* Cold Start State */}
        {!isLoading && isColdStart && (
          <View style={styles.coldStartCard}>
            <View style={styles.coldStartIcon}>
              <Ionicons name="hourglass-outline" size={32} color={HYDRATION_ACCENT.primary} />
            </View>
            <Text style={styles.coldStartTitle}>Building Your Profile</Text>
            <Text style={styles.coldStartMessage}>
              We need {daysRemaining} more days of data to generate personalized insights.
            </Text>

            {/* Progress bar */}
            <View style={styles.coldStartProgressTrack}>
              <View
                style={[
                  styles.coldStartProgressFill,
                  { width: `${(daysWithData / 7) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.coldStartProgress}>Day {daysWithData + 1} of 7</Text>

            <Text style={styles.coldStartHint}>
              Keep logging your hydration to unlock patterns, predictions, and personalized recommendations.
            </Text>
          </View>
        )}

        {/* Established User Content */}
        {!isLoading && !isColdStart && (
          <>
            {/* Weekly Overview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <HydrationWeekChart data={weekData} goalMl={goalMl} />
            </View>

            {/* Persona */}
            {analytics?.persona && (
              <PersonaCard
                persona={analytics.persona}
                confidence={analytics.personaConfidence}
              />
            )}

            {/* Prediction */}
            {analytics?.prediction?.hasPrediction && (
              <PredictionDetailCard prediction={analytics.prediction} />
            )}

            {/* Patterns */}
            {analytics?.patterns && (
              <PatternInsightsCard patterns={analytics.patterns} />
            )}

            {/* Tips Section */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Hydration Tips</Text>
              <View style={styles.tipRow}>
                <Ionicons name="sunny-outline" size={18} color={HYDRATION_SEMANTIC.warning.base} />
                <Text style={styles.tipText}>Start your day with a glass of water</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="cafe-outline" size={18} color={HYDRATION_SEMANTIC.warning.base} />
                <Text style={styles.tipText}>Pair each coffee with a glass of water</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="alarm-outline" size={18} color={HYDRATION_SEMANTIC.warning.base} />
                <Text style={styles.tipText}>Set reminders for consistent hydration</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACES.background.primary,
  },
  backButton: {
    padding: SPACING[2],
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
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
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },

  // Cold Start
  coldStartCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOWS.md,
  },
  coldStartIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${HYDRATION_ACCENT.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  coldStartTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  coldStartMessage: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },
  coldStartProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  coldStartProgressFill: {
    height: '100%',
    backgroundColor: HYDRATION_ACCENT.primary,
    borderRadius: 3,
  },
  coldStartProgress: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginBottom: SPACING[4],
  },
  coldStartHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section Card
  sectionCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },

  // Tips
  tipsCard: {
    backgroundColor: `${HYDRATION_ACCENT.primary}08`,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  tipsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
});
