/**
 * MealFeelingPrediction Component
 *
 * Shows predicted feeling timeline after logging a meal:
 * - Impact score (-100 to +100)
 * - Timeline: how you'll feel at 30min, 1-2h, 3-4h
 * - Key insights about the meal
 *
 * Key differentiator: "How Will This Make Me Feel?"
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMealFeelingPrediction } from '../../hooks/usePredictions';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { DEPTH_SHADOWS } from '../../constants/modernColorPalette';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

// Timeline item component
function TimelineItem({ item, isLast }) {
  const getEmojiSize = (feeling) => {
    if (feeling === 'crash_risk' || feeling === 'energy_spike') return 20;
    return 18;
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
          <Text style={styles.timelineEmoji}>{item.emoji}</Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{item.timeLabel}</Text>
        <Text style={styles.timelineDescription}>{item.description}</Text>
        <View style={styles.timelineChange}>
          <Ionicons
            name={item.change.startsWith('+') ? 'trending-up' : item.change.startsWith('-') ? 'trending-down' : 'remove'}
            size={12}
            color={item.color}
          />
          <Text style={[styles.changeText, { color: item.color }]}>{item.change} energy</Text>
        </View>
      </View>
    </View>
  );
}

// Insight chip component
function InsightChip({ insight }) {
  const iconColors = {
    warning: '#F59E0B',
    positive: '#22C55E',
    info: '#3B82F6',
    data: '#8B5CF6',
  };

  const bgColors = {
    warning: 'rgba(245, 158, 11, 0.1)',
    positive: 'rgba(34, 197, 94, 0.1)',
    info: 'rgba(59, 130, 246, 0.1)',
    data: 'rgba(139, 92, 246, 0.1)',
  };

  return (
    <View style={[styles.insightChip, { backgroundColor: bgColors[insight.type] || bgColors.info }]}>
      <Ionicons
        name={insight.icon || 'information-circle'}
        size={14}
        color={iconColors[insight.type] || iconColors.info}
      />
      <Text style={styles.insightText}>{insight.text}</Text>
    </View>
  );
}

// Impact meter visualization
function ImpactMeter({ score }) {
  const [animatedWidth] = useState(new Animated.Value(0));

  useEffect(() => {
    // Normalize score from -100 to 100 → 0 to 100 for display
    const normalizedScore = (score + 100) / 2;
    Animated.spring(animatedWidth, {
      toValue: normalizedScore,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [score]);

  // Determine color based on score
  let barColor = '#22C55E';
  if (score < -30) barColor = '#EF4444';
  else if (score < -10) barColor = '#F97316';
  else if (score < 10) barColor = '#F59E0B';
  else if (score < 30) barColor = '#84CC16';

  return (
    <View style={styles.impactMeter}>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            {
              backgroundColor: barColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        {/* Center marker */}
        <View style={styles.centerMarker} />
      </View>
      <View style={styles.meterLabels}>
        <Text style={styles.meterLabelLeft}>Crash</Text>
        <Text style={styles.meterLabelCenter}>Neutral</Text>
        <Text style={styles.meterLabelRight}>Boost</Text>
      </View>
    </View>
  );
}

export default function MealFeelingPrediction({ mealData, onDismiss, style }) {
  const {
    predictFeeling,
    feeling,
    isLoading,
    impactScore,
    impactLabel,
    timeline,
    insights,
  } = useMealFeelingPrediction();

  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch prediction when meal data changes
  useEffect(() => {
    if (mealData && (mealData.calories || mealData.protein || mealData.carbs)) {
      predictFeeling({
        calories: parseInt(mealData.calories) || 0,
        protein: parseInt(mealData.protein) || 0,
        carbs: parseInt(mealData.carbs) || 0,
        sugar: parseInt(mealData.sugar || mealData.micros?.sugar) || 0,
        fiber: parseInt(mealData.fiber || mealData.micros?.fiber) || 0,
        novaScore: parseInt(mealData.novaScore) || 2,
        mealType: mealData.mealType || 'snack',
      });
    }
  }, [mealData]);

  // Don't render if no meal data or loading
  if (!mealData) return null;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <LinearGradient
          colors={['rgba(249,250,251,0.98)', 'rgba(255,255,255,0.98)']}
          style={styles.loadingCard}
        >
          <View style={styles.loadingDot} />
          <Text style={styles.loadingText}>Analyzing how this will make you feel...</Text>
        </LinearGradient>
      </View>
    );
  }

  // No prediction yet
  if (!feeling) return null;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={
          impactScore >= 10
            ? ['rgba(240,253,244,0.98)', 'rgba(255,255,255,0.98)']
            : impactScore <= -10
            ? ['rgba(254,242,242,0.98)', 'rgba(255,255,255,0.98)']
            : ['rgba(254,252,232,0.98)', 'rgba(255,255,255,0.98)']
        }
        style={styles.card}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsExpanded(!isExpanded);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color="#8B5CF6" />
              <Text style={styles.headerBadgeText}>HOW YOU'LL FEEL</Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={[styles.impactLabel, { color: feeling?.impactColor || TEXT.primary }]}>
                {impactLabel}
              </Text>
              {feeling?.characteristics?.crashRisk && (
                <View style={[
                  styles.crashBadge,
                  { backgroundColor: `${feeling.characteristics.crashRisk.color}15` }
                ]}>
                  <Text style={[
                    styles.crashBadgeText,
                    { color: feeling.characteristics.crashRisk.color }
                  ]}>
                    {feeling.characteristics.crashRisk.label}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </View>
        </TouchableOpacity>

        {/* Impact meter - always visible */}
        <ImpactMeter score={impactScore ?? 0} />

        {/* Expanded content */}
        {isExpanded && (
          <>
            {/* Timeline */}
            {timeline.length > 0 && (
              <View style={styles.timelineSection}>
                <Text style={styles.sectionTitle}>Energy Timeline</Text>
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={index}
                    item={item}
                    isLast={index === timeline.length - 1}
                  />
                ))}
              </View>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <View style={styles.insightsSection}>
                {insights.map((insight, index) => (
                  <InsightChip key={index} insight={insight} />
                ))}
              </View>
            )}

            {/* Energy profile */}
            {feeling?.characteristics?.energyProfile && (
              <View style={styles.profileSection}>
                <Text style={styles.profileIcon}>
                  {feeling.characteristics.energyProfile.icon}
                </Text>
                <Text style={styles.profileLabel}>
                  {feeling.characteristics.energyProfile.label}
                </Text>
              </View>
            )}

            {/* Confidence note */}
            {feeling?.basedOnMeals > 0 && (
              <Text style={styles.confidenceNote}>
                Based on {feeling.basedOnMeals} similar meals in your history
              </Text>
            )}
          </>
        )}

        {/* Dismiss button */}
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...DEPTH_SHADOWS.medium,
  },
  loadingCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    opacity: 0.7,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  headerBadgeText: {
    ...TYPOGRAPHY.overline,
    color: '#7C3AED',
    letterSpacing: 1,
    fontSize: 10,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  impactLabel: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  crashBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  crashBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  headerRight: {
    padding: SPACING.xs,
  },
  dismissButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    padding: SPACING.xs,
  },

  // Impact meter
  impactMeter: {
    marginBottom: SPACING.md,
  },
  meterTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  centerMarker: {
    position: 'absolute',
    left: '50%',
    top: -2,
    width: 2,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginLeft: -1,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meterLabelLeft: {
    ...TYPOGRAPHY.caption,
    color: '#EF4444',
    fontSize: 9,
  },
  meterLabelCenter: {
    ...TYPOGRAPHY.caption,
    color: TEXT.tertiary,
    fontSize: 9,
  },
  meterLabelRight: {
    ...TYPOGRAPHY.caption,
    color: '#22C55E',
    fontSize: 9,
  },

  // Timeline
  timelineSection: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.overline,
    color: TEXT.secondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmoji: {
    fontSize: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: SPACING.sm,
  },
  timelineLabel: {
    ...TYPOGRAPHY.caption,
    color: TEXT.tertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  timelineDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: TEXT.primary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  timelineChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  changeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Insights
  insightsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  insightText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    fontSize: 11,
  },

  // Profile section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  profileIcon: {
    fontSize: 16,
  },
  profileLabel: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
  },

  // Confidence note
  confidenceNote: {
    ...TYPOGRAPHY.caption,
    color: TEXT.quaternary,
    fontSize: 10,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
