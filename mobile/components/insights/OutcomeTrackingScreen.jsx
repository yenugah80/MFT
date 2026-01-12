/**
 * OutcomeTrackingScreen - "Did the Recommendation Work?"
 *
 * This is a KEY DIFFERENTIATOR for MyFoodTracker.
 * Shows users the effectiveness of recommendations with beautiful visualizations.
 *
 * Purpose:
 * 1. Personalize faster - Learn what works for this specific user
 * 2. Prove value - Show tangible results from following recommendations
 * 3. Train future models - Build feedback loop for smarter suggestions
 * 4. Reactive → Adaptive - Transform from static to learning system
 *
 * Design Philosophy: "Show, Don't Tell"
 * - Visualize patterns, don't just list data
 * - Celebrate wins without shaming misses
 * - Make correlations discoverable and explorable
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  CARDS,
  OUTCOME_COLORS,
  CHART_COLORS,
} from '../../constants/premiumDesignSystem';
import { Card } from '../premium/PressableCard';
import { useSlideIn, useFadeIn, EASING, SPRING } from '../../utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING[8];
const CHART_HEIGHT = 200;

// ============================================================================
// MOCK DATA (Replace with real data from API)
// ============================================================================

const MOCK_OUTCOMES = {
  summary: {
    totalRecommendations: 47,
    completed: 32,
    effective: 24,
    partiallyEffective: 5,
    notEffective: 3,
    pending: 8,
    skipped: 7,
  },
  effectivenessRate: 0.75, // 75% of completed recommendations worked
  weeklyTrend: [0.65, 0.68, 0.72, 0.71, 0.75], // Last 5 weeks
  byCategory: [
    { category: 'Nutrition', effective: 12, total: 15, rate: 0.80 },
    { category: 'Hydration', effective: 8, total: 10, rate: 0.80 },
    { category: 'Mood', effective: 3, total: 5, rate: 0.60 },
    { category: 'Activity', effective: 1, total: 2, rate: 0.50 },
  ],
  recentOutcomes: [
    {
      id: '1',
      recommendation: 'Add leafy greens to dinner',
      status: 'effective',
      impact: 'Vitamin K up 45%',
      date: '2 days ago',
    },
    {
      id: '2',
      recommendation: 'Drink water before meals',
      status: 'effective',
      impact: 'Hydration goal met 5/7 days',
      date: '3 days ago',
    },
    {
      id: '3',
      recommendation: 'Morning protein snack',
      status: 'partiallyEffective',
      impact: 'Energy stable 3/5 days',
      date: '5 days ago',
    },
    {
      id: '4',
      recommendation: 'Reduce evening sugar',
      status: 'effective',
      impact: 'Sleep quality improved',
      date: '1 week ago',
    },
    {
      id: '5',
      recommendation: 'Mid-day walk break',
      status: 'notEffective',
      impact: 'No change in energy',
      date: '1 week ago',
    },
  ],
  insights: [
    {
      title: 'Your Sweet Spot',
      description: 'Nutrition recommendations work best for you (80% effective)',
      icon: 'nutrition',
      color: PREMIUM_COLORS.functional.nutrition.primary,
    },
    {
      title: 'Room to Grow',
      description: 'Activity recommendations need adjustment',
      icon: 'fitness',
      color: PREMIUM_COLORS.functional.activity.primary,
    },
    {
      title: 'Trending Up',
      description: 'Effectiveness improved 10% over 5 weeks',
      icon: 'trending-up',
      color: PREMIUM_COLORS.semantic.success.primary,
    },
  ],
};

// ============================================================================
// EFFECTIVENESS RING COMPONENT
// ============================================================================

function EffectivenessRing({ rate, size = 160, strokeWidth = 12 }) {
  const animatedRate = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedRate, {
      toValue: rate,
      duration: 1200,
      easing: EASING.easeOutQuart,
      useNativeDriver: false,
    }).start();
  }, [rate, animatedRate]);

  const strokeDashoffset = animatedRate.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  // Determine color based on rate
  const getColor = () => {
    if (rate >= 0.75) return ['#059669', '#10B981', '#34D399'];
    if (rate >= 0.50) return ['#F59E0B', '#FBBF24', '#FCD34D'];
    return ['#EF4444', '#F87171', '#FCA5A5'];
  };

  const gradientColors = getColor();

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="50%" stopColor={gradientColors[1]} />
            <Stop offset="100%" stopColor={gradientColors[2]} />
          </SvgGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={PREMIUM_COLORS.surface.tertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.ringCenter}>
        <Text style={styles.ringPercentage}>{Math.round(rate * 100)}%</Text>
        <Text style={styles.ringLabel}>Effective</Text>
      </View>
    </View>
  );
}

// ============================================================================
// WEEKLY TREND CHART
// ============================================================================

function WeeklyTrendChart({ data, width = CHART_WIDTH, height = 120 }) {
  const fadeIn = useFadeIn(300);
  const chartWidth = width - 60;
  const chartHeight = height - 40;
  const padding = { top: 20, right: 10, bottom: 20, left: 50 };

  // Generate path
  const points = useMemo(() => {
    const xStep = chartWidth / (data.length - 1);
    return data.map((value, index) => ({
      x: padding.left + index * xStep,
      y: padding.top + chartHeight - (value * chartHeight),
    }));
  }, [data, chartWidth, chartHeight]);

  // Create smooth curve path
  const pathD = useMemo(() => {
    if (points.length < 2) return '';

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return d;
  }, [points]);

  // Area path (for gradient fill)
  const areaPath = useMemo(() => {
    if (!pathD) return '';
    return `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  }, [pathD, points, chartHeight]);

  const weeks = ['4w ago', '3w ago', '2w ago', '1w ago', 'This week'];

  return (
    <Animated.View style={[styles.chartContainer, { opacity: fadeIn }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
          </SvgGradient>
        </Defs>

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((value, i) => (
          <React.Fragment key={i}>
            <Line
              x1={padding.left}
              y1={padding.top + chartHeight - (value * chartHeight)}
              x2={width - padding.right}
              y2={padding.top + chartHeight - (value * chartHeight)}
              stroke={PREMIUM_COLORS.border.light}
              strokeDasharray="4 4"
            />
            <Text
              x={padding.left - 8}
              y={padding.top + chartHeight - (value * chartHeight) + 4}
              fill={PREMIUM_COLORS.text.tertiary}
              fontSize={11}
              textAnchor="end"
            >
              {`${value * 100}%`}
            </Text>
          </React.Fragment>
        ))}

        {/* Area fill */}
        <Path
          d={areaPath}
          fill="url(#areaGradient)"
        />

        {/* Line */}
        <Path
          d={pathD}
          stroke="#10B981"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={5}
            fill="#FFFFFF"
            stroke="#10B981"
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xAxisLabels}>
        {weeks.map((week, index) => (
          <Text
            key={index}
            style={[
              styles.xAxisLabel,
              index === weeks.length - 1 && styles.xAxisLabelActive,
            ]}
          >
            {week}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// CATEGORY BAR CHART
// ============================================================================

function CategoryBars({ data }) {
  const animatedWidths = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((item, index) =>
      Animated.timing(animatedWidths[index], {
        toValue: item.rate,
        duration: 800,
        delay: index * 100,
        easing: EASING.easeOutQuart,
        useNativeDriver: false,
      })
    );
    Animated.parallel(animations).start();
  }, [data, animatedWidths]);

  const getCategoryColor = (category) => {
    switch (category.toLowerCase()) {
      case 'nutrition':
        return PREMIUM_COLORS.functional.nutrition;
      case 'hydration':
        return PREMIUM_COLORS.functional.hydration;
      case 'mood':
        return PREMIUM_COLORS.functional.mood;
      case 'activity':
        return PREMIUM_COLORS.functional.activity;
      default:
        return PREMIUM_COLORS.functional.insights;
    }
  };

  return (
    <View style={styles.categoryBars}>
      {data.map((item, index) => {
        const colors = getCategoryColor(item.category);
        const width = animatedWidths[index].interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', '100%'],
        });

        return (
          <View key={item.category} style={styles.categoryBarRow}>
            <View style={styles.categoryBarHeader}>
              <Text style={styles.categoryBarLabel}>{item.category}</Text>
              <Text style={styles.categoryBarValue}>
                {item.effective}/{item.total} ({Math.round(item.rate * 100)}%)
              </Text>
            </View>
            <View style={styles.categoryBarTrack}>
              <Animated.View
                style={[
                  styles.categoryBarFill,
                  { width, backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// OUTCOME STATUS BADGE
// ============================================================================

function OutcomeStatusBadge({ status }) {
  const outcomeConfig = OUTCOME_COLORS[status] || OUTCOME_COLORS.pending;

  return (
    <View style={[styles.statusBadge, { backgroundColor: outcomeConfig.bg }]}>
      <Ionicons
        name={outcomeConfig.icon}
        size={14}
        color={outcomeConfig.color}
      />
      <Text style={[styles.statusBadgeText, { color: outcomeConfig.color }]}>
        {outcomeConfig.label}
      </Text>
    </View>
  );
}

// ============================================================================
// RECENT OUTCOME ITEM
// ============================================================================

function RecentOutcomeItem({ outcome, index }) {
  const { translateY, opacity } = useSlideIn(index * 80, 15);

  return (
    <Animated.View
      style={[
        styles.outcomeItem,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.outcomeContent}>
        <Text style={styles.outcomeTitle} numberOfLines={1}>
          {outcome.recommendation}
        </Text>
        <Text style={styles.outcomeImpact} numberOfLines={1}>
          {outcome.impact}
        </Text>
        <Text style={styles.outcomeDate}>{outcome.date}</Text>
      </View>
      <OutcomeStatusBadge status={outcome.status} />
    </Animated.View>
  );
}

// ============================================================================
// INSIGHT CARD
// ============================================================================

function InsightCard({ insight, index }) {
  const { translateY, opacity } = useSlideIn(200 + index * 100, 15);

  return (
    <Animated.View
      style={[
        styles.insightCard,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
        <Ionicons name={insight.icon} size={20} color={insight.color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightDescription}>{insight.description}</Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// SUMMARY STAT
// ============================================================================

function SummaryStat({ label, value, color }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OutcomeTrackingScreen({ onClose }) {
  const headerFade = useFadeIn(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  // Use mock data (replace with real API call)
  const data = MOCK_OUTCOMES;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose?.();
          }}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={PREMIUM_COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Outcome Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Did the recommendations work?
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Effectiveness Ring */}
        <Card variant="hero" glow="brand" style={styles.heroCard}>
          <View style={styles.heroContent}>
            <EffectivenessRing rate={data.effectivenessRate} />
            <View style={styles.heroStats}>
              <SummaryStat
                label="Completed"
                value={data.summary.completed}
                color={PREMIUM_COLORS.text.primary}
              />
              <SummaryStat
                label="Worked"
                value={data.summary.effective}
                color={PREMIUM_COLORS.semantic.success.primary}
              />
              <SummaryStat
                label="Partial"
                value={data.summary.partiallyEffective}
                color={PREMIUM_COLORS.semantic.warning.primary}
              />
            </View>
          </View>
        </Card>

        {/* Weekly Trend */}
        <Card variant="standard" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Trend</Text>
            <View style={styles.trendBadge}>
              <Ionicons
                name="trending-up"
                size={14}
                color={PREMIUM_COLORS.semantic.success.primary}
              />
              <Text style={styles.trendBadgeText}>+10%</Text>
            </View>
          </View>
          <WeeklyTrendChart data={data.weeklyTrend} />
        </Card>

        {/* By Category */}
        <Card variant="standard" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <CategoryBars data={data.byCategory} />
        </Card>

        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Personalization Insights</Text>
          {data.insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} index={index} />
          ))}
        </View>

        {/* Recent Outcomes */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Outcomes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>See All</Text>
            </TouchableOpacity>
          </View>
          {data.recentOutcomes.map((outcome, index) => (
            <RecentOutcomeItem key={outcome.id} outcome={outcome} index={index} />
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.surface.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  closeButton: {
    padding: SPACING[2],
    marginRight: SPACING[3],
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: SPACING[0.5],
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
  },

  // Hero Card
  heroCard: {
    marginBottom: SPACING[4],
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStats: {
    flex: 1,
    marginLeft: SPACING[6],
  },

  // Ring
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringPercentage: {
    fontSize: TYPOGRAPHY.size.largeTitle,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
  },
  ringLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: SPACING[0.5],
  },

  // Summary Stat
  summaryStat: {
    marginBottom: SPACING[4],
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: SPACING[0.5],
  },

  // Section Card
  sectionCard: {
    marginBottom: SPACING[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  seeAllLink: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.brand.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Trend Badge
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.semantic.success.light,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  trendBadgeText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.semantic.success.dark,
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING[4],
    marginTop: SPACING[2],
  },
  xAxisLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },
  xAxisLabelActive: {
    color: PREMIUM_COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Category Bars
  categoryBars: {
    gap: SPACING[4],
  },
  categoryBarRow: {
    gap: SPACING[2],
  },
  categoryBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBarLabel: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.primary,
  },
  categoryBarValue: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
  },
  categoryBarTrack: {
    height: 8,
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Insights
  insightsSection: {
    marginBottom: SPACING[4],
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginTop: SPACING[3],
    ...SHADOWS.sm,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  insightDescription: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: SPACING[0.5],
  },

  // Recent Outcomes
  recentSection: {
    marginBottom: SPACING[4],
  },
  outcomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginTop: SPACING[3],
    ...SHADOWS.sm,
  },
  outcomeContent: {
    flex: 1,
    marginRight: SPACING[3],
  },
  outcomeTitle: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.primary,
  },
  outcomeImpact: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.semantic.success.primary,
    marginTop: SPACING[1],
  },
  outcomeDate: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginTop: SPACING[0.5],
  },

  // Bottom
  bottomSpacer: {
    height: SPACING[10],
  },
});
