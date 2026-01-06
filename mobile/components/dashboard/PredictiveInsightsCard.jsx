/**
 * PredictiveInsightsCard - Tomorrow's Forecast
 *
 * THE killer feature that no other app has.
 * Predicts how the user will feel tomorrow based on today's choices.
 *
 * "Last 4 times you had pasta + wine at night, you felt sluggish the next morning"
 *
 * Production-grade with:
 * - AI-powered predictions based on historical patterns
 * - Confidence indicators
 * - Actionable suggestions
 * - Beautiful animations
 * - Full accessibility
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SHADOWS } from '../../constants/premiumTheme';
import { predictTomorrowScore } from '../../utils/foodMoodScore';

/**
 * Prediction Factor Card
 */
function PredictionFactor({ factor, index }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  const isPositive = factor.impact > 0;
  const impactColor = isPositive ? '#10B981' : '#F59E0B';
  const impactBg = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';

  return (
    <Animated.View
      style={[
        styles.factorCard,
        { transform: [{ translateX: slideAnim }], opacity: opacityAnim }
      ]}
    >
      <View style={[styles.factorIconContainer, { backgroundColor: impactBg }]}>
        <Ionicons name={factor.icon} size={20} color={impactColor} />
      </View>
      <View style={styles.factorContent}>
        <View style={styles.factorHeader}>
          <Text style={styles.factorTitle}>{factor.factor}</Text>
          <View style={[styles.impactBadge, { backgroundColor: impactBg }]}>
            <Text style={[styles.impactText, { color: impactColor }]}>
              {isPositive ? '+' : ''}{factor.impact} pts
            </Text>
          </View>
        </View>
        <Text style={styles.factorSuggestion}>{factor.suggestion}</Text>
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                { width: `${factor.confidence * 100}%`, backgroundColor: impactColor }
              ]}
            />
          </View>
          <Text style={styles.confidenceText}>
            {Math.round(factor.confidence * 100)}% confident
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Tomorrow's Score Prediction Visual
 */
function ScorePrediction({ currentScore, predictedScore, confidence }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const change = predictedScore - currentScore;
  const isImprovement = change > 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const currentWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, currentScore],
  });

  const predictedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, predictedScore],
  });

  return (
    <View style={styles.predictionVisual}>
      {/* Today's Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Today</Text>
        <View style={styles.scoreBarContainer}>
          <Animated.View
            style={[
              styles.scoreBarFill,
              styles.scoreBarToday,
              { width: currentWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              })}
            ]}
          />
        </View>
        <Text style={styles.scoreValue}>{currentScore}</Text>
      </View>

      {/* Arrow indicator */}
      <View style={styles.arrowContainer}>
        <Ionicons
          name={isImprovement ? 'arrow-forward' : 'arrow-forward'}
          size={16}
          color={TEXT.tertiary}
        />
      </View>

      {/* Tomorrow's Prediction */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreLabel, styles.scoreLabelTomorrow]}>Tomorrow</Text>
        <View style={styles.scoreBarContainer}>
          <Animated.View
            style={[
              styles.scoreBarFill,
              styles.scoreBarTomorrow,
              isImprovement ? styles.scoreBarImprovement : styles.scoreBarDecline,
              { width: predictedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              })}
            ]}
          />
        </View>
        <View style={styles.predictedScoreContainer}>
          <Text style={[
            styles.scoreValue,
            styles.predictedScore,
            isImprovement ? styles.scoreImprovement : styles.scoreDecline
          ]}>
            {predictedScore}
          </Text>
          <Text style={[
            styles.changeText,
            isImprovement ? styles.changeTextUp : styles.changeTextDown
          ]}>
            {isImprovement ? '+' : ''}{change}
          </Text>
        </View>
      </View>

      {/* Confidence indicator */}
      <View style={styles.confidenceIndicator}>
        <Ionicons name="analytics" size={12} color={TEXT.tertiary} />
        <Text style={styles.confidenceLabel}>
          {Math.round(confidence * 100)}% prediction confidence
        </Text>
      </View>
    </View>
  );
}

/**
 * Main PredictiveInsightsCard Component
 */
export default function PredictiveInsightsCard({
  todaysMeals = [],
  todaysMood = null,
  currentScore = 50,
  historicalPatterns = [],
  onViewHistory,
  onDismiss,
}) {
  const [expanded, setExpanded] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Calculate predictions
  const prediction = useMemo(() => {
    return predictTomorrowScore({
      todaysMeals,
      todaysMood,
      currentScore,
      historicalPatterns,
    });
  }, [todaysMeals, todaysMood, currentScore, historicalPatterns]);

  // Entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  // Expand animation
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [expanded, expandAnim]);

  const handleToggleExpand = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const { predictedScore, change, confidence, predictions, summary } = prediction;
  const hasPredictions = predictions.length > 0;
  const isPositiveOutlook = change >= 0;

  // Don't show if no predictions
  if (!hasPredictions && todaysMeals.length < 2) {
    return (
      <Animated.View
        style={[
          styles.emptyCard,
          { transform: [{ scale: cardAnim }], opacity: cardAnim }
        ]}
      >
        <LinearGradient
          colors={['rgba(107, 78, 255, 0.05)', 'rgba(59, 130, 246, 0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="sparkles" size={32} color={BRAND.primary} />
          </View>
          <Text style={styles.emptyTitle}>Tomorrow's Forecast</Text>
          <Text style={styles.emptyText}>
            Log more meals today to unlock predictions about how you'll feel tomorrow
          </Text>
          <View style={styles.emptyProgress}>
            <View style={styles.emptyProgressBar}>
              <View
                style={[
                  styles.emptyProgressFill,
                  { width: `${Math.min(100, (todaysMeals.length / 3) * 100)}%` }
                ]}
              />
            </View>
            <Text style={styles.emptyProgressText}>
              {todaysMeals.length}/3 meals logged
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: cardAnim }], opacity: cardAnim }
      ]}
    >
      <LinearGradient
        colors={
          isPositiveOutlook
            ? ['rgba(16, 185, 129, 0.08)', 'rgba(107, 78, 255, 0.05)']
            : ['rgba(245, 158, 11, 0.08)', 'rgba(107, 78, 255, 0.05)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={handleToggleExpand}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Tomorrow's forecast: ${predictedScore} points`}
          accessibilityHint="Tap to expand details"
        >
          <View style={styles.headerLeft}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: isPositiveOutlook ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
            ]}>
              <Ionicons
                name={isPositiveOutlook ? 'sunny' : 'partly-sunny'}
                size={24}
                color={isPositiveOutlook ? '#10B981' : '#F59E0B'}
              />
            </View>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Tomorrow's Forecast</Text>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={10} color={BRAND.primary} />
                  <Text style={styles.aiText}>AI</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{summary}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[
              styles.predictionBadge,
              { backgroundColor: isPositiveOutlook ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
            ]}>
              <Text style={[
                styles.predictionValue,
                { color: isPositiveOutlook ? '#10B981' : '#F59E0B' }
              ]}>
                {change >= 0 ? '+' : ''}{change}
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </View>
        </TouchableOpacity>

        {/* Score Prediction Visual */}
        <ScorePrediction
          currentScore={currentScore}
          predictedScore={predictedScore}
          confidence={confidence}
        />

        {/* Expanded Content - Prediction Factors */}
        {expanded && hasPredictions && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.divider} />
            <Text style={styles.factorsTitle}>What's affecting tomorrow</Text>
            {predictions.map((factor, index) => (
              <PredictionFactor key={factor.factor} factor={factor} index={index} />
            ))}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={16} color={BRAND.primary} />
                <Text style={styles.historyButtonText}>View History</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Quick tip */}
        {!expanded && hasPredictions && predictions[0] && (
          <View style={styles.quickTip}>
            <Ionicons name="bulb-outline" size={14} color={TEXT.secondary} />
            <Text style={styles.quickTipText} numberOfLines={1}>
              {predictions[0].suggestion}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Main Card
  card: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: SURFACES.background.primary,
    ...SHADOWS.md,
  },
  cardGradient: {
    padding: SPACING[4],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  aiText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  predictionBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  predictionValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Score Prediction Visual
  predictionVisual: {
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: RADIUS.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  scoreLabel: {
    width: 70,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  scoreLabelTomorrow: {
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: SPACING[2],
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarToday: {
    backgroundColor: 'rgba(107, 78, 255, 0.4)',
  },
  scoreBarTomorrow: {
    backgroundColor: BRAND.primary,
  },
  scoreBarImprovement: {
    backgroundColor: '#10B981',
  },
  scoreBarDecline: {
    backgroundColor: '#F59E0B',
  },
  scoreValue: {
    width: 40,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textAlign: 'right',
  },
  predictedScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: 60,
    justifyContent: 'flex-end',
  },
  predictedScore: {
    color: TEXT.primary,
  },
  scoreImprovement: {
    color: '#10B981',
  },
  scoreDecline: {
    color: '#F59E0B',
  },
  changeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginLeft: 4,
  },
  changeTextUp: {
    color: '#10B981',
  },
  changeTextDown: {
    color: '#F59E0B',
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: SPACING[1],
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 78, 255, 0.1)',
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Expanded Content
  expandedContent: {
    marginTop: SPACING[3],
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    marginBottom: SPACING[3],
  },
  factorsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Factor Card
  factorCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
  },
  factorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  factorContent: {
    flex: 1,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  factorTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  impactText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  factorSuggestion: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
    lineHeight: 18,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING[3],
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    backgroundColor: `${BRAND.primary}10`,
  },
  historyButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Quick Tip
  quickTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 78, 255, 0.08)',
  },
  quickTipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Empty State
  emptyCard: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  emptyGradient: {
    padding: SPACING[5],
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  emptyProgress: {
    width: '100%',
    alignItems: 'center',
  },
  emptyProgressBar: {
    width: '60%',
    height: 6,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  emptyProgressFill: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 3,
  },
  emptyProgressText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
