/**
 * MomentumCard - Premium "Keep it up" Component
 *
 * Architecture inspired by:
 * - Oura Ring: Hero metric with meaningful context
 * - Noom: Variable reinforcement (rotates highlights)
 * - Headspace: Calming animations, no aggressive celebration
 * - Fitbit: Personal bests, not generic praise
 *
 * Features:
 * - Data-driven highlights (streak, consistency, macros, hydration, variety)
 * - Personal comparisons (no social proof per user preference)
 * - Gradient backgrounds with premium feel
 * - Swipe-to-dismiss gesture
 * - Subtle entry animations
 * - Secondary metric chips for supporting context
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import {
  selectHighlight,
  getSecondaryMetrics,
  recordMomentumShown,
  HIGHLIGHT_TYPES,
} from './MomentumEngine';

import { SPACING, RADIUS, TYPOGRAPHY, TEXT, BRAND, SURFACES, SHADOWS } from '../../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_WIDTH * 0.3;

/**
 * Main MomentumCard Component
 */
export default function MomentumCard({
  // Gamification metrics
  streak = 0,
  level = 1,
  xp = 0,
  justLeveledUp = false,
  newLevel = null,

  // Nutrition metrics
  calorieProgress = 0,
  macroBalance = null,
  weeklyComplianceDays = 0,
  complianceImprovement = 0,

  // Hydration metrics
  hydrationProgress = 0,
  hydrationStreak = 0,

  // Variety metrics
  uniqueFoodsThisWeek = 0,

  // Pattern discovery
  patternsDiscovered = 0,
  newPatternToday = false,

  // Trends
  vsLastWeekChange = 0,

  // Callbacks
  onDismiss,
  onViewProgress,
}) {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  // Calculate highlight and secondary metrics
  const metrics = useMemo(
    () => ({
      streak,
      weeklyComplianceDays,
      macroBalance,
      hydrationStreak,
      hydrationProgress,
      uniqueFoodsThisWeek,
      vsLastWeekChange,
      complianceImprovement,
      patternsDiscovered,
      newPatternToday,
      justLeveledUp,
      newLevel,
    }),
    [
      streak,
      weeklyComplianceDays,
      macroBalance,
      hydrationStreak,
      hydrationProgress,
      uniqueFoodsThisWeek,
      vsLastWeekChange,
      complianceImprovement,
      patternsDiscovered,
      newPatternToday,
      justLeveledUp,
      newLevel,
    ]
  );

  const highlight = useMemo(() => selectHighlight(metrics), [metrics]);
  const secondaryMetrics = useMemo(() => getSecondaryMetrics(metrics), [metrics]);

  // Entry animation
  useEffect(() => {
    // Record that we showed the card
    recordMomentumShown();

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // Dismiss animation
  const animateDismiss = useCallback(
    (direction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: direction * SCREEN_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss?.();
      });
    },
    [translateX, fadeAnim, onDismiss]
  );

  // Pan responder for swipe-to-dismiss
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 15,
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > DISMISS_THRESHOLD) {
            animateDismiss(gestureState.dx > 0 ? 1 : -1);
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [translateX, animateDismiss]
  );

  // Handle CTA press
  const handleViewProgress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewProgress) {
      onViewProgress();
    } else {
      router.push('/insights');
    }
  }, [onViewProgress, router]);

  // Render hero metric based on highlight type
  const renderHeroMetric = () => {
    const { value, isPercentage, maxValue } = highlight;

    if (value === null || value === 'balanced') {
      return (
        <View style={styles.heroContainer}>
          <View style={[styles.heroIconBadge, { backgroundColor: `${highlight.iconColor}15` }]}>
            <Ionicons name={highlight.icon} size={32} color={highlight.iconColor} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.heroContainer}>
        <Text style={styles.heroValue}>
          {isPercentage ? `+${value}%` : value}
        </Text>
        {maxValue && (
          <Text style={styles.heroMaxValue}>/ {maxValue}</Text>
        )}
        <Text style={styles.heroLabel}>
          {getHeroLabel(highlight.type)}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={highlight.gradientColors || ['#ECFDF5', '#D1FAE5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header badge */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${highlight.iconColor}20` }]}>
            <Ionicons name={highlight.icon} size={18} color={highlight.iconColor} />
          </View>
          <Text style={styles.headerLabel}>BUILDING MOMENTUM</Text>
        </View>

        {/* Hero metric */}
        {renderHeroMetric()}

        {/* Personalized message */}
        <Text style={styles.message}>{highlight.message}</Text>

        {/* Secondary metrics chips */}
        {secondaryMetrics.length > 0 && (
          <View style={styles.chipsRow}>
            {secondaryMetrics.map((chip, index) => (
              <View key={index} style={styles.chip}>
                <Ionicons name={chip.icon} size={14} color={chip.color} />
                <Text style={[styles.chipValue, { color: chip.color }]}>
                  {chip.value}
                </Text>
                <Text style={styles.chipLabel}>{chip.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.cta}
          onPress={handleViewProgress}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>View your progress</Text>
          <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
        </TouchableOpacity>

        {/* Dismiss hint */}
        <Text style={styles.dismissHint}>Swipe to dismiss</Text>
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * Get label text for hero metric based on highlight type
 */
function getHeroLabel(type) {
  const labels = {
    [HIGHLIGHT_TYPES.STREAK_MILESTONE]: 'day streak',
    [HIGHLIGHT_TYPES.CONSISTENCY_WIN]: 'days this week',
    [HIGHLIGHT_TYPES.HYDRATION_CHAMPION]: 'days hydrated',
    [HIGHLIGHT_TYPES.VARIETY_EXPLORER]: 'unique foods',
    [HIGHLIGHT_TYPES.PERSONAL_BEST]: 'improvement',
    [HIGHLIGHT_TYPES.LEVEL_UP]: 'new level',
    [HIGHLIGHT_TYPES.PATTERN_DISCOVERY]: 'patterns found',
  };
  return labels[type] || '';
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  gradient: {
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[5],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },

  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[2],
  },

  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.secondary,
    letterSpacing: 1,
  },

  heroContainer: {
    alignItems: 'center',
    marginBottom: SPACING[3],
  },

  heroIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroValue: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    lineHeight: 56,
  },

  heroMaxValue: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    marginTop: -8,
  },

  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginTop: 4,
  },

  message: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING[4],
    paddingHorizontal: SPACING[2],
  },

  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: 4,
  },

  chipValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },

  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },

  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  dismissHint: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[3],
    opacity: 0.6,
  },
});
