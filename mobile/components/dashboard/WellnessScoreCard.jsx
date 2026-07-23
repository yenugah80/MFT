/**
 * WellnessScoreCard - Comprehensive Daily Wellness Score (Hero Card)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WELLNESS COMPONENT ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the PRIMARY wellness visualization on the dashboard.
 * It shows a COMPOSITE score from 4 equal domains (25 points each = 100 total):
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  DOMAIN        │  MAX POINTS  │  DATA SOURCE                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  Food/Nutrition│     25       │  today.nutrition (calories, protein, etc.) │
 * │  Mood          │     25       │  moodLogs array                            │
 * │  Hydration     │     25       │  today.waterIntakeLiters                   │
 * │  Activity      │     25       │  activityData (minutes, intensity)         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED COMPONENTS (no duplication):
 * - WellnessNarrativeCard: Shows server-calculated apiWellnessScore + narrative
 * - EnhancedMoodCard: Mood-only view (showWellnessScore={false} to avoid overlap)
 * - NutritionDetailsSection: Detailed macro/calorie breakdown
 *
 * SCORE CALCULATION:
 * Uses calculateWellnessScore() from utils/wellnessScore.js
 *
 * Design Principles:
 * 1. USER-SPECIFIC - Greets by name, knows their patterns
 * 2. CONTEXTUAL - Time-aware, streak-aware, history-aware
 * 3. ACTIONABLE - Shows what to do next based on their habits
 * 4. CELEBRATORY - Highlights wins and personal bests
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES } from '../../constants/premiumTheme';
import { calculateWellnessScore } from '../../utils/wellnessScore';

/**
 * Pie Chart Score Visual - 4 Wellness Domains
 * Equal segments (25% each): Food, Mood, Hydration, Activity
 * Fill level shows how well each domain is doing (0-100%)
 * Percentages displayed inside each segment
 */
function PieChartScore({ score, tier, breakdown, size = 160 }) {
  // 4 wellness domains - each worth 25 points (equal visual weight)
  const factors = [
    { key: 'nutrition', label: 'Food', color: '#34D399', colorDark: '#059669', max: 25 },
    { key: 'mood', label: 'Mood', color: '#A78BFA', colorDark: '#7C3AED', max: 25 },
    { key: 'hydration', label: 'Water', color: '#60A5FA', colorDark: '#2563EB', max: 25 },
    { key: 'activity', label: 'Activity', color: '#F59E0B', colorDark: '#D97706', max: 25 },
  ];

  const outerRadius = size / 2;
  const innerRadius = size / 2 - 35; // Donut hole for score
  const center = size / 2;
  const totalMax = 100; // 4 × 25 = 100

  // Calculate wedge path (filled pie slice) with validation
  const getWedgePath = (startAngle, endAngle, outerR, innerR) => {
    // Validate inputs - return null for invalid paths
    const angleDiff = endAngle - startAngle;
    if (angleDiff < 1 || !isFinite(angleDiff)) {
      return null; // Too small angle or invalid
    }

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    // Calculate points with rounding to avoid floating-point precision issues
    const round = (n) => Math.round(n * 1000) / 1000;

    // Outer arc points
    const x1 = round(center + outerR * Math.cos(startRad));
    const y1 = round(center + outerR * Math.sin(startRad));
    const x2 = round(center + outerR * Math.cos(endRad));
    const y2 = round(center + outerR * Math.sin(endRad));

    // Inner arc points
    const x3 = round(center + innerR * Math.cos(endRad));
    const y3 = round(center + innerR * Math.sin(endRad));
    const x4 = round(center + innerR * Math.cos(startRad));
    const y4 = round(center + innerR * Math.sin(startRad));

    // Validate all coordinates are finite numbers
    if ([x1, y1, x2, y2, x3, y3, x4, y4].some(v => !isFinite(v))) {
      return null;
    }

    const largeArc = angleDiff > 180 ? 1 : 0;

    // Path: outer arc, line to inner, inner arc (reverse), close
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Build segments with equal 90° angles (4 domains × 90° = 360°)
  let currentAngle = 0;
  const segments = factors.map((factor) => {
    const segmentAngle = 90; // Equal segments
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    const value = breakdown?.[factor.key] || 0;
    const fillPercent = factor.max > 0 ? Math.min(1, value / factor.max) : 0;
    const displayPercent = Math.round(fillPercent * 100);

    // Calculate label position - center of the FILLED portion, not full segment
    // Only position meaningfully if fill is substantial (>30%)
    const fillEndAngle = startAngle + segmentAngle * fillPercent;
    const labelAngle = fillPercent >= 0.3
      ? (startAngle + fillEndAngle) / 2  // Middle of filled area
      : (startAngle + endAngle) / 2;     // Middle of full segment (for legend reference)

    // Position label closer to inner edge for better visibility
    const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.45;
    const labelRad = (labelAngle - 90) * (Math.PI / 180);
    const labelX = center + labelRadius * Math.cos(labelRad);
    const labelY = center + labelRadius * Math.sin(labelRad);

    currentAngle = endAngle;

    return { ...factor, startAngle, endAngle, fillPercent, displayPercent, value, labelX, labelY };
  });

  // Score color and label based on actual score value
  const getTierDisplay = (s) => {
    if (s >= 80) return { color: '#10B981', label: 'Excellent' };
    if (s >= 60) return { color: '#8B5CF6', label: 'Good' };
    if (s >= 40) return { color: '#3B82F6', label: 'Okay' };
    if (s >= 20) return { color: '#F59E0B', label: 'Fair' };
    if (s > 0) return { color: '#94A3B8', label: 'Low' };
    return { color: '#94A3B8', label: 'No data' };
  };

  const tierDisplay = getTierDisplay(score);

  return (
    <View style={pieStyles.container}>
      <View style={pieStyles.chartWrapper}>
        <Svg width={size} height={size}>
          <G>
            {/* 4 domain segments - always visible with clear boundaries */}
            {segments.map((seg) => {
              const path = getWedgePath(seg.startAngle, seg.endAngle, outerRadius - 2, innerRadius);
              if (!path) return null;
              // FIXED: Higher minimum opacity (50%) so empty segments are always visible
              // Fill level: 50% base + up to 50% more based on fill
              const opacity = 0.50 + (seg.fillPercent * 0.50);
              return (
                <Path
                  key={`seg-${seg.key}`}
                  d={path}
                  fill={seg.color}
                  fillOpacity={opacity}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
              );
            })}
            {/* Percentage labels inside each segment - always show with better contrast */}
            {segments.map((seg) => {
              if (!isFinite(seg.labelX) || !isFinite(seg.labelY)) return null;
              // FIXED: Always use dark color for text to ensure readability
              // Dark text is readable on both light (low fill) and saturated (high fill) backgrounds
              const textColor = seg.colorDark;
              return (
                <SvgText
                  key={`label-${seg.key}`}
                  x={seg.labelX}
                  y={seg.labelY + 4}
                  fill={textColor}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {seg.displayPercent}%
                </SvgText>
              );
            })}
          </G>
        </Svg>

        {/* Score in center */}
        <View style={pieStyles.scoreCenter}>
          <Text style={[pieStyles.scoreValue, { color: tierDisplay.color }]}>{score}</Text>
          <Text style={[pieStyles.tierLabel, { color: tierDisplay.color }]}>{tierDisplay.label}</Text>
        </View>
      </View>

      {/* Legend below - just labels, percentages already shown in pie segments */}
      <View style={pieStyles.legend}>
        {segments.map((seg) => (
          <View key={seg.key} style={pieStyles.legendItem}>
            <View style={[pieStyles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={pieStyles.legendLabel}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -1,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    letterSpacing: 0.3,
    marginTop: -2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  legendItem: {
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 10,
    color: TEXT.secondary,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});

/**
 * Achievement Badge - Celebrates wins
 */
function AchievementBadge({ achievement }) {
  if (!achievement) return null;

  return (
    <View style={[achievementStyles.badge, { backgroundColor: `${achievement.color}15`, borderColor: `${achievement.color}30` }]}>
      <Ionicons name={achievement.icon} size={12} color={achievement.color} />
      <Text style={[achievementStyles.text, { color: achievement.color }]}>{achievement.text}</Text>
    </View>
  );
}

const achievementStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});

/**
 * Main Wellness Score Card Component
 * Displays wellness score based on 4 domains: Food, Mood, Hydration, Activity
 */
export default function WellnessScoreCard({
  today = {},
  goals = {},
  moodLogs = [],
  activityData = {}, // NEW: Activity data { minutes, intensity, types }
  yesterday = {},
  userName = '',
  historicalScores = [],
  isYesterdayFallback = false, // NEW: True when showing yesterday's fallback data elsewhere
  onViewDetails,
}) {
  // Check if today has any actual data logged
  const hasTodayData = useMemo(() => {
    const hasMeals = (today?.foodLogs || []).length > 0;
    const hasWater = (today?.waterIntakeLiters || 0) > 0;
    const hasMood = (moodLogs || []).length > 0;
    const hasActivity = (activityData?.minutes || today?.activity?.totalMinutes || 0) > 0;
    const hasNutrition = (today?.nutrition?.totalCalories || 0) > 0;
    return hasMeals || hasWater || hasMood || hasActivity || hasNutrition;
  }, [today, moodLogs, activityData]);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Calculate the wellness score from 4 domains
  const scoreData = useMemo(() => {
    const nutrition = today?.nutrition || {};
    const meals = today?.foodLogs || [];
    const water = today?.waterIntakeLiters || 0;

    // Activity data - support both direct prop and today object
    const activity = activityData || today?.activity || {};
    const activityMinutes = activity?.totalMinutes || activity?.minutes || 0;
    const activityIntensity = activity?.intensity || 'moderate';
    const activityTypes = activity?.types || [];

    return calculateWellnessScore({
      // Nutrition
      calories: nutrition.totalCalories || 0,
      calorieGoal: goals?.dailyCalories || 2000,
      protein: nutrition.totalProtein || 0,
      proteinGoal: goals?.proteinG || 150,
      carbs: nutrition.totalCarbs || 0,
      carbsGoal: goals?.carbsG || 250,
      fats: nutrition.totalFats || 0,
      fatsGoal: goals?.fatsG || 65,
      fiber: nutrition.totalFiber || 0,
      fiberGoal: 30,
      // Hydration
      waterIntake: water,
      waterGoal: goals?.waterLiters || 2.5,
      // Mood
      moodLogs,
      meals,
      // Activity (NEW)
      activityMinutes,
      activityGoal: goals?.activityMinutes || 30,
      activityIntensity,
      activityTypes,
    });
  }, [today, goals, moodLogs, activityData]);

  // Status indicator - only show when all 4 domains are logged
  const statusIndicator = useMemo(() => {
    const hasMeals = (today?.foodLogs || []).length > 0;
    const hasWater = (today?.waterIntakeLiters || 0) > 0;
    const hasMood = (moodLogs || []).length > 0;
    const hasActivity = (activityData?.minutes || today?.activity?.totalMinutes || 0) > 0;
    const logged = [hasMeals, hasWater, hasMood, hasActivity].filter(Boolean).length;

    // Only show badge when all 4 are complete
    if (logged === 4) return { icon: 'checkmark-circle', color: '#10B981', text: 'All logged' };
    return null; // Don't show partial progress - pie chart shows that
  }, [today, moodLogs, activityData]);

  // Get achievement if any (no streaks - those are shown elsewhere)
  const achievement = useMemo(() => {
    const { score } = scoreData;
    const nutrition = today?.nutrition || {};
    const protein = nutrition.totalProtein || 0;
    const proteinGoal = goals?.proteinG || 150;
    const calories = nutrition.totalCalories || 0;
    const calorieGoal = goals?.dailyCalories || 2000;
    const yesterdayScore = yesterday?.score || 0;

    // Score improvements vs yesterday
    if (yesterdayScore > 0 && score > yesterdayScore + 10) {
      return { icon: 'trending-up', color: '#10B981', text: `+${score - yesterdayScore} vs yesterday` };
    }

    // Goal achievements
    if (protein >= proteinGoal) return { icon: 'fitness', color: '#8B5CF6', text: 'Protein goal hit!' };
    if (calories >= calorieGoal * 0.9 && calories <= calorieGoal * 1.1) {
      return { icon: 'checkmark-circle', color: '#10B981', text: 'Calories on target' };
    }

    // High score
    if (score >= 80) return { icon: 'star', color: '#F59E0B', text: 'Great day!' };

    return null;
  }, [scoreData, today, goals, yesterday]);

  // Header content - Today's Wellness Score
  const headerContent = useMemo(() => {
    const hasMeals = (today?.foodLogs || []).length > 0;
    const { tier } = scoreData;

    if (!hasMeals) {
      return {
        title: "Today's Wellness",
        subtitle: 'Log meals to build your score',
      };
    }

    // Has data - show tier label
    const tierLabels = {
      excellent: 'Thriving today!',
      good: 'Strong day so far',
      okay: 'On track today',
      fair: 'Building momentum',
      low: 'Getting started',
    };

    return {
      title: "Today's Wellness",
      subtitle: tierLabels[tier] || 'Your daily score',
    };
  }, [today, scoreData]);

  // Cross-domain completeness nudge — this card's job is the composite score
  // across all 4 domains, so its message should only ever say WHICH domains
  // are still missing (by name), never restate a domain's own numbers.
  // Nutrition/Hydration cards already own showing "306 cal" / "3 of 8 glasses"
  // etc. — repeating those here was the root of the dashboard duplication.
  const personalizedMessage = useMemo(() => {
    const hasMeals = (today?.foodLogs || []).length > 0;
    const hasWater = (today?.waterIntakeLiters || 0) > 0;
    const hasMood = (moodLogs || []).length > 0;
    const hasActivity = (activityData?.minutes || today?.activity?.totalMinutes || 0) > 0;

    const missing = [];
    if (!hasMeals) missing.push('meals');
    if (!hasWater) missing.push('water');
    if (!hasMood) missing.push('mood');
    if (!hasActivity) missing.push('activity');

    // Nothing logged: header subtitle already handles it.
    // Everything logged: the achievement badge + tier subtitle already say
    // enough — a third stacked message here would be redundant, not helpful.
    if (missing.length === 0 || missing.length === 4) {
      return null;
    }

    const missingText = missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} & ${missing[missing.length - 1]}`;
    return `Add ${missingText} to complete today`;
  }, [today, moodLogs, activityData]);

  // Entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewDetails?.();
  };

  const { score } = scoreData;

  // Show empty state when no data logged today (prevents showing stale/yesterday's data)
  const showEmptyState = !hasTodayData || isYesterdayFallback;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ scale: cardAnim }],
          opacity: cardAnim,
        },
      ]}
    >
      <LinearGradient
        colors={SURFACES.gradient.pastelLavender}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={16} color={BRAND.primaryDark} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{"Today's Wellness"}</Text>
              <Text style={styles.headerSubtitle}>
                {showEmptyState ? 'Log meals to build your score' : headerContent.subtitle}
              </Text>
            </View>
          </View>
          {!showEmptyState && statusIndicator && (
            <View style={styles.headerRight}>
              <View style={[styles.statusPill, { borderColor: `${statusIndicator.color}30`, backgroundColor: `${statusIndicator.color}12` }]}>
                <Ionicons name={statusIndicator.icon} size={14} color={statusIndicator.color} />
                <Text style={[styles.statusText, { color: statusIndicator.color }]}>{statusIndicator.text}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Main content - Show empty state or pie chart */}
        <View style={styles.content}>
          {showEmptyState ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyRingPlaceholder}>
                <Ionicons name="nutrition-outline" size={40} color={TEXT.tertiary} />
              </View>
              <Text style={styles.emptyStateTitle}>No activity yet today</Text>
              <Text style={styles.emptyStateText}>
                Log your first meal, water, or mood to see your wellness score
              </Text>
            </View>
          ) : (
            <PieChartScore
              score={score}
              tier={scoreData.tier}
              breakdown={scoreData.breakdown}
              maxBreakdown={scoreData.maxBreakdown}
            />
          )}
        </View>

        {/* Achievement & personalized message - only show when we have data */}
        {!showEmptyState && (achievement || personalizedMessage) && (
          <View style={styles.messageSection}>
            {achievement && <AchievementBadge achievement={achievement} />}
            {personalizedMessage && (
              <Text style={styles.message}>{personalizedMessage}</Text>
            )}
          </View>
        )}

        {/* Action button - navigates to wellness score history */}
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.actionRow}>
          <Text style={styles.actionText}>View score history</Text>
          <Ionicons name="chevron-forward" size={14} color={TEXT.secondary} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING[3],
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    backgroundColor: SURFACES.card.primary,
    shadowColor: BRAND.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
  },
  gradient: {
    padding: SPACING[5],
    backgroundColor: SURFACES.card.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(143, 163, 199, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  content: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  messageSection: {
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[5],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  actionText: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Empty state styles
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  emptyRingPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(143, 163, 199, 0.1)',
    borderWidth: 3,
    borderColor: 'rgba(143, 163, 199, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[1],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 220,
  },
});
