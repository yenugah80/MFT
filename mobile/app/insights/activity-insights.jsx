/**
 * Activity Insights Screen
 *
 * AI-powered personalized activity recommendations featuring:
 * - Recovery Score (WHOOP-style gauge)
 * - Personalized Strain Target
 * - Context-aware activity recommendations with explainability
 * - Weekly progress insights
 *
 * Based on research from:
 * - PERFECT Framework (ACM)
 * - Nature Scientific Reports ML fitness recommendations
 * - WHOOP recovery/strain algorithms
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';

import apiClient from '../../services/apiClient';
import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  BRAND,
  SEMANTIC,
} from '../../constants/premiumTheme';

// ============================================================================
// RECOVERY GAUGE COMPONENT
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RecoveryGauge({ score, label, color, factors }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score / 100,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const getGradientColors = () => {
    if (score >= 80) return ['#10B981', '#059669'];
    if (score >= 60) return ['#84CC16', '#65A30D'];
    if (score >= 40) return ['#F59E0B', '#D97706'];
    if (score >= 20) return ['#F97316', '#EA580C'];
    return ['#EF4444', '#DC2626'];
  };

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="recoveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={getGradientColors()[0]} />
            <Stop offset="100%" stopColor={getGradientColors()[1]} />
          </SvgLinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#recoveryGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, circumference * 0.25],
          })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
        <Text style={styles.gaugeLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// STRAIN TARGET COMPONENT
// ============================================================================

function StrainTarget({ strainTarget }) {
  const { target, min, max, zone, recommendation } = strainTarget;

  return (
    <View style={styles.strainCard}>
      <View style={styles.strainHeader}>
        <View style={styles.strainIcon}>
          <Ionicons name="fitness" size={24} color={BRAND.primary} />
        </View>
        <View style={styles.strainHeaderText}>
          <Text style={styles.strainTitle}>Today's Strain Target</Text>
          <Text style={styles.strainZone}>{zone.name}</Text>
        </View>
      </View>

      <View style={styles.strainNumbers}>
        <View style={styles.strainRange}>
          <Text style={styles.strainMin}>{min}</Text>
          <View style={styles.strainTargetCircle}>
            <Text style={styles.strainTargetValue}>{target}</Text>
          </View>
          <Text style={styles.strainMax}>{max}</Text>
        </View>
        <View style={styles.strainBar}>
          <View
            style={[
              styles.strainBarFill,
              { width: `${(target / 21) * 100}%` },
            ]}
          />
          <View
            style={[
              styles.strainBarMarker,
              { left: `${(target / 21) * 100}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.strainRecommendation}>{recommendation}</Text>
    </View>
  );
}

// ============================================================================
// RECOMMENDATION CARD COMPONENT
// ============================================================================

function RecommendationCard({ recommendation, index }) {
  const [expanded, setExpanded] = useState(index === 0);

  const getActivityIcon = (type) => {
    const icons = {
      walking: 'walk',
      running: 'walk',
      cycling: 'bicycle',
      strength: 'barbell',
      yoga: 'leaf',
      hiit: 'flash',
      swimming: 'water',
      pilates: 'body',
    };
    return icons[type] || 'fitness';
  };

  const getReasonIcon = (type) => {
    const icons = {
      goal: 'target',
      recovery: 'battery-full',
      timing: 'time',
      preference: 'heart',
      variety: 'shuffle',
    };
    return icons[type] || 'information-circle';
  };

  return (
    <TouchableOpacity
      style={[
        styles.recommendationCard,
        recommendation.isPrimary && styles.recommendationCardPrimary,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
      }}
      activeOpacity={0.9}
    >
      {recommendation.isPrimary && (
        <View style={styles.primaryBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.primaryBadgeText}>Top Pick</Text>
        </View>
      )}

      <View style={styles.recommendationHeader}>
        <View style={styles.recommendationIcon}>
          <Ionicons
            name={getActivityIcon(recommendation.type)}
            size={28}
            color={BRAND.primary}
          />
        </View>
        <View style={styles.recommendationInfo}>
          <Text style={styles.recommendationName}>{recommendation.name}</Text>
          <View style={styles.recommendationMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={TEXT.secondary} />
              <Text style={styles.metaText}>{recommendation.duration.minutes} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={14} color={SEMANTIC.warning.base} />
              <Text style={styles.metaText}>{recommendation.calories.estimated} cal</Text>
            </View>
            <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(recommendation.intensity) + '20' }]}>
              <Text style={[styles.intensityText, { color: getIntensityColor(recommendation.intensity) }]}>
                {recommendation.intensity}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{recommendation.score}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.recommendationExpanded}>
          {/* Reasons (Explainability) */}
          <View style={styles.reasonsSection}>
            <Text style={styles.reasonsTitle}>Why this activity?</Text>
            {recommendation.reasons.map((reason, i) => (
              <View key={i} style={styles.reasonRow}>
                <View style={styles.reasonIcon}>
                  <Ionicons name={getReasonIcon(reason.type)} size={16} color={BRAND.primary} />
                </View>
                <Text style={styles.reasonText}>{reason.text}</Text>
              </View>
            ))}
          </View>

          {/* Timing Suggestion */}
          <View style={styles.timingSection}>
            <Ionicons name="calendar-outline" size={18} color={TEXT.secondary} />
            <Text style={styles.timingText}>
              Best time: <Text style={styles.timingHighlight}>{recommendation.timing.range}</Text>
              {recommendation.timing.isNow && (
                <Text style={styles.timingNow}> • Now is great!</Text>
              )}
            </Text>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          >
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDark]}
              style={styles.startButtonGradient}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start {recommendation.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getIntensityColor(intensity) {
  const colors = {
    light: '#10B981',
    moderate: '#F59E0B',
    vigorous: '#EF4444',
  };
  return colors[intensity] || colors.moderate;
}

// ============================================================================
// WEEKLY INSIGHT CARD
// ============================================================================

function WeeklyInsightCard({ insight }) {
  const getInsightColor = () => {
    const colors = {
      achievement: '#10B981',
      goal_met: '#10B981',
      encouragement: '#F59E0B',
      motivation: BRAND.primary,
      progress: '#3B82F6',
      suggestion: '#8B5CF6',
    };
    return colors[insight.type] || BRAND.primary;
  };

  return (
    <View style={[styles.insightCard, { borderLeftColor: getInsightColor() }]}>
      <View style={[styles.insightIcon, { backgroundColor: getInsightColor() + '20' }]}>
        <Ionicons name={insight.icon} size={20} color={getInsightColor()} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightMessage}>{insight.message}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// RECOVERY FACTOR ROW
// ============================================================================

function RecoveryFactorRow({ factor }) {
  const getFactorIcon = () => {
    const icons = {
      sleep: 'moon',
      stress: 'pulse',
      activity_load: 'barbell',
      hydration: 'water',
      mood: 'happy',
    };
    return icons[factor.factor] || 'information-circle';
  };

  const getImpactColor = () => {
    const colors = {
      positive: '#10B981',
      neutral: '#F59E0B',
      negative: '#EF4444',
      caution: '#F97316',
      unknown: TEXT.tertiary,
    };
    return colors[factor.impact] || TEXT.secondary;
  };

  return (
    <View style={styles.factorRow}>
      <View style={[styles.factorIcon, { backgroundColor: getImpactColor() + '15' }]}>
        <Ionicons name={getFactorIcon()} size={18} color={getImpactColor()} />
      </View>
      <View style={styles.factorContent}>
        <Text style={styles.factorName}>{factor.factor.replace('_', ' ')}</Text>
        <Text style={styles.factorDetail}>{factor.detail}</Text>
      </View>
      {factor.value !== null && (
        <View style={[styles.factorValue, { backgroundColor: getImpactColor() + '15' }]}>
          <Text style={[styles.factorValueText, { color: getImpactColor() }]}>
            {Math.round(factor.value)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function ActivityInsightsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: intelligence,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activityIntelligence'],
    queryFn: async () => {
      const response = await apiClient.get('/activity/intelligence');
      return response;
    },
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Analyzing your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !intelligence?.success) {
    console.log('[ActivityInsights] Error:', error?.message || 'No success flag', intelligence);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header with back button */}
        <View style={styles.errorHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </TouchableOpacity>
          <Text style={styles.errorHeaderTitle}>Activity Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={SEMANTIC.danger.base} />
          <Text style={styles.errorText}>Unable to load recommendations</Text>
          <Text style={styles.errorSubtext}>
            {error?.message || 'Please check your connection and try again'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { recovery, strainTarget, recommendations, weeklyInsights, activityStats, userContext } = intelligence;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Activity Intelligence</Text>
            <Text style={styles.headerSubtitle}>Personalized for you</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.contextBadge}>
              <Text style={styles.contextText}>{userContext?.timeSlot}</Text>
            </View>
          </View>
        </View>

        {/* Recovery Section */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#FAFAFA', '#F5F5F5']}
            style={styles.recoverySection}
          >
            <Text style={styles.sectionTitle}>Recovery Status</Text>

            <View style={styles.recoveryContent}>
              <RecoveryGauge
                score={recovery.score}
                label={recovery.label}
                color={recovery.color}
                factors={recovery.factors}
              />

              <View style={styles.factorsList}>
                {recovery.factors.map((factor, i) => (
                  <RecoveryFactorRow key={i} factor={factor} />
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Strain Target */}
        <View style={styles.section}>
          <StrainTarget strainTarget={strainTarget} />
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your recovery, goals, and preferences
          </Text>

          {recommendations.map((rec, i) => (
            <RecommendationCard key={rec.type} recommendation={rec} index={i} />
          ))}
        </View>

        {/* Weekly Insights */}
        {weeklyInsights && weeklyInsights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Insights</Text>

            {weeklyInsights.map((insight, i) => (
              <WeeklyInsightCard key={i} insight={insight} />
            ))}
          </View>
        )}

        {/* Activity Stats Summary */}
        {activityStats && (
          <View style={styles.section}>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Your Activity Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{activityStats.weeklyMinutes || 0}</Text>
                  <Text style={styles.statLabel}>min/week</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{activityStats.consistency || 0}%</Text>
                  <Text style={styles.statLabel}>consistency</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{activityStats.totalActivities || 0}</Text>
                  <Text style={styles.statLabel}>activities</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
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
    backgroundColor: SURFACES.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[6],
    gap: SPACING[4],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  errorHeaderTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  errorSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: -SPACING[2],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACES.card.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  headerRight: {},
  contextBadge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: `${BRAND.primary}15`,
    borderRadius: RADIUS.full,
  },
  contextText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
    textTransform: 'capitalize',
  },

  // Sections
  section: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: SPACING[4],
  },

  // Recovery Section
  recoverySection: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    ...SHADOWS.md,
  },
  recoveryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[4],
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 42,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  gaugeLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: -4,
  },
  factorsList: {
    flex: 1,
    gap: SPACING[2],
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  factorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorContent: {
    flex: 1,
  },
  factorName: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    textTransform: 'capitalize',
  },
  factorDetail: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  factorValue: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  factorValueText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  // Strain Card
  strainCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    ...SHADOWS.md,
  },
  strainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  strainIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strainHeaderText: {
    flex: 1,
  },
  strainTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  strainZone: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  strainNumbers: {
    marginBottom: SPACING[4],
  },
  strainRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  strainMin: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  strainMax: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  strainTargetCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  strainTargetValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
  strainBar: {
    height: 8,
    backgroundColor: `${BRAND.primary}20`,
    borderRadius: 4,
    marginTop: SPACING[2],
    position: 'relative',
  },
  strainBarFill: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 4,
  },
  strainBarMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 16,
    backgroundColor: BRAND.primaryDark,
    borderRadius: 2,
    marginLeft: -2,
  },
  strainRecommendation: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Recommendation Card
  recommendationCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  recommendationCardPrimary: {
    borderWidth: 2,
    borderColor: BRAND.primary,
    ...SHADOWS.md,
  },
  primaryBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING[3],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  primaryBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  recommendationIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${BRAND.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  intensityBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  intensityText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    textTransform: 'capitalize',
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },

  // Expanded Section
  recommendationExpanded: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.secondary,
  },
  reasonsSection: {
    marginBottom: SPACING[4],
  },
  reasonsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  reasonIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: `${BRAND.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    lineHeight: 20,
  },
  timingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.secondary,
  },
  timingText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  timingHighlight: {
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  timingNow: {
    color: SEMANTIC.success.base,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  startButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  startButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },

  // Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Stats Card
  statsCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    ...SHADOWS.sm,
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
  },

  bottomPadding: {
    height: 100,
  },
});
