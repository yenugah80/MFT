/**
 * ============================================================================
 * PremiumHydrationCard - Ultra-Premium Hydration Experience
 * ============================================================================
 *
 * Design Philosophy:
 * - Glass morphism with subtle depth and layering
 * - Liquid-inspired animations that feel alive
 * - Primary action (logging water) is THE hero
 * - Minimal, focused interface - no feature bloat
 * - Delightful micro-interactions that reward engagement
 * - No pseudoscience - honest, useful feedback only
 *
 * Inspired by: Apple Watch, Oura Ring, Eight Sleep, Linear
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Rect, ClipPath } from 'react-native-svg';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

import {
  getTimeBasedRecommendation,
  getCurrentTimePeriod,
  BEVERAGE_TYPES,
} from '../../constants/beverageConstants';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// ============================================================================
// LIQUID WAVE PROGRESS - Premium animated fill effect
// ============================================================================
function LiquidProgress({ progress, size = 120 }) {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  useEffect(() => {
    // Continuous wave animation
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fill level animation
    Animated.spring(fillAnim, {
      toValue: normalizedProgress,
      tension: 20,
      friction: 8,
      useNativeDriver: false,
    }).start();

    // Glow pulse when near goal
    if (normalizedProgress >= 80) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedProgress]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [size, 0],
  });

  const getWaveColors = () => {
    if (normalizedProgress >= 100) return ['#10B981', '#059669'];
    if (normalizedProgress >= 75) return ['#0EA5E9', '#0284C7'];
    if (normalizedProgress >= 50) return ['#3B82F6', '#2563EB'];
    if (normalizedProgress >= 25) return ['#60A5FA', '#3B82F6'];
    return ['#93C5FD', '#60A5FA'];
  };

  const [colorTop, colorBottom] = getWaveColors();

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.liquidContainer, { width: size, height: size }]}>
      {/* Glow effect for near-goal state */}
      {normalizedProgress >= 80 && (
        <Animated.View
          style={[
            styles.progressGlow,
            {
              opacity: glowOpacity,
              backgroundColor: normalizedProgress >= 100 ? '#10B981' : '#3B82F6',
            },
          ]}
        />
      )}

      <View style={styles.liquidMask}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colorTop} stopOpacity="0.95" />
              <Stop offset="100%" stopColor={colorBottom} stopOpacity="1" />
            </SvgGradient>
            <ClipPath id="circleClip">
              <Circle cx={size / 2} cy={size / 2} r={size / 2 - 6} />
            </ClipPath>
          </Defs>

          {/* Background circle with subtle gradient */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            fill={`${SURFACES.background.tertiary}`}
            stroke={`${TEXT.tertiary}15`}
            strokeWidth={1}
          />

          {/* Liquid fill */}
          <AnimatedRect
            x={0}
            y={fillHeight}
            width={size}
            height={size}
            fill="url(#liquidGradient)"
            clipPath="url(#circleClip)"
          />

          {/* Inner highlight ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={2}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.liquidCenter}>
          <Text style={[
            styles.liquidPercent,
            normalizedProgress >= 40 && styles.liquidPercentLight,
          ]}>
            {Math.round(normalizedProgress)}%
          </Text>
          <Text style={[
            styles.liquidLabel,
            normalizedProgress >= 40 && styles.liquidLabelLight,
          ]}>
            {normalizedProgress >= 100 ? 'Complete' : 'of goal'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// QUICK ADD BUTTON - Premium tactile feedback
// ============================================================================
function QuickAddButton({ amount, label, onPress, isPrimary = false, icon }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 400,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 400,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(
      isPrimary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    onPress(amount);
  };

  return (
    <Animated.View
      style={[
        styles.quickAddWrapper,
        isPrimary && styles.quickAddWrapperPrimary,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Add ${label} of water`}
        accessibilityRole="button"
        style={styles.quickAddTouchable}
      >
        {isPrimary ? (
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickAddPrimaryGradient}
          >
            <Ionicons name={icon || 'water'} size={20} color="#FFF" />
            <Text style={styles.quickAddPrimaryText}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.quickAddSecondary, isPressed && styles.quickAddSecondaryPressed]}>
            <Text style={styles.quickAddSecondaryText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// SUCCESS TOAST - Elegant confirmation
// ============================================================================
function SuccessToast({ visible, amount }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Enter animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Exit animation after delay
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -60,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.successToast,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.successToastGradient}
      >
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark" size={16} color="#FFF" />
        </View>
        <Text style={styles.successToastText}>+{amount}ml added</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// WATER DROP ICON - Animated header icon
// ============================================================================
function WaterDropIcon() {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      <LinearGradient
        colors={['#60A5FA', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconGradient}
      >
        <Ionicons name="water" size={18} color="#FFF" />
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// SMART TIP COMPONENT - Contextual recommendations
// ============================================================================
function SmartTip({ tip }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  if (!tip) return null;

  return (
    <Animated.View style={[styles.tipContainer, { opacity: fadeAnim }]}>
      <View style={styles.tipIconContainer}>
        <Ionicons name={tip.icon} size={14} color={tip.color} />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipText}>{tip.text}</Text>
        {tip.beverage && (
          <Text style={styles.tipBeverage}>{tip.beverage}</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// SMART RECOMMENDATION ENGINE - Uses centralized beverage constants
// ============================================================================
const getSmartRecommendation = (progress, currentMl, goalMl) => {
  const remaining = goalMl - currentMl;
  const timeTips = getTimeBasedRecommendation();
  const period = getCurrentTimePeriod();

  // Get recommended beverage info
  const primaryBeverage = BEVERAGE_TYPES[timeTips.primary] || BEVERAGE_TYPES.water;
  const alternatives = (timeTips.alternatives || [])
    .map(t => BEVERAGE_TYPES[t]?.label)
    .filter(Boolean)
    .join(', ');

  // Period-specific icons and colors
  const periodStyles = {
    earlyMorning: { icon: 'sunny-outline', color: '#F59E0B' },
    morning: { icon: 'cafe-outline', color: '#92400E' },
    midday: { icon: 'restaurant-outline', color: '#3B82F6' },
    afternoon: { icon: 'flash-outline', color: '#0EA5E9' },
    evening: { icon: 'moon-outline', color: '#8B5CF6' },
    night: { icon: 'bed-outline', color: '#6366F1' },
  };

  const style = periodStyles[period] || periodStyles.morning;

  // Goal achieved - celebration mode
  if (progress >= 100) {
    return {
      text: "Goal achieved! Maintain with small sips if thirsty",
      beverage: period === 'night'
        ? "Chamomile or herbal tea is perfect for winding down"
        : `Great options now: ${alternatives || 'water, herbal tea'}`,
      icon: "trophy-outline",
      color: "#10B981",
    };
  }

  // Progress-based recommendations
  if (currentMl === 0) {
    return {
      text: timeTips.suggestion,
      beverage: `Best choice: ${primaryBeverage.emoji} ${primaryBeverage.label} - ${primaryBeverage.tip}`,
      icon: style.icon,
      color: style.color,
    };
  }

  if (progress < 25) {
    return {
      text: "You're just getting started - build momentum!",
      beverage: `Try: ${primaryBeverage.emoji} ${primaryBeverage.label}${alternatives ? ` or ${alternatives}` : ''}`,
      icon: "trending-up-outline",
      color: "#3B82F6",
    };
  }

  if (progress < 50) {
    return {
      text: timeTips.suggestion,
      beverage: primaryBeverage.tip,
      icon: style.icon,
      color: style.color,
    };
  }

  if (progress < 75) {
    return {
      text: "Halfway there! Keep the rhythm going",
      beverage: `${primaryBeverage.emoji} ${primaryBeverage.label}: ${primaryBeverage.description}`,
      icon: "checkmark-circle-outline",
      color: "#10B981",
    };
  }

  // Almost there (75-99%)
  if (remaining > 500) {
    return {
      text: `About ${Math.round(remaining / 250)} glasses left for today`,
      beverage: period === 'night'
        ? "Space them out - too much before bed disrupts sleep"
        : "Small, consistent sips are more effective than gulping",
      icon: "water-outline",
      color: "#3B82F6",
    };
  }

  return {
    text: "Almost there - one more glass!",
    beverage: period === 'evening' || period === 'night'
      ? "Finish early to avoid nighttime bathroom trips"
      : `${primaryBeverage.emoji} ${primaryBeverage.label} will get you there`,
    icon: "star-outline",
    color: "#10B981",
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PremiumHydrationCard({
  currentIntake = 0,
  dailyGoal = 2.0,
  onQuickAdd,
  onOpenFullTracker,
}) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Convert to ml for display
  const currentMl = Math.round(currentIntake * 1000);
  const goalMl = Math.round(dailyGoal * 1000);
  const progress = Math.min((currentMl / goalMl) * 100, 100);
  const remaining = Math.max(goalMl - currentMl, 0);

  // Get smart recommendation
  const recommendation = getSmartRecommendation(progress, currentMl, goalMl);

  // Card entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smart contextual message
  const getMessage = useCallback(() => {
    const hour = new Date().getHours();

    if (progress >= 100) return { text: "Goal achieved!", emoji: "🎉" };
    if (progress >= 80) return { text: "Almost there", emoji: "💪" };
    if (progress >= 50) return { text: "Halfway to goal", emoji: "👍" };

    if (hour < 10) return { text: "Start your day right", emoji: "🌅" };
    if (hour < 14) return { text: "Stay focused", emoji: "💧" };
    if (hour < 18) return { text: "Keep it up", emoji: "⚡" };
    return { text: "Evening hydration", emoji: "🌙" };
  }, [progress]);

  const handleQuickAdd = useCallback((amountLiters) => {
    if (onQuickAdd) {
      onQuickAdd(amountLiters);
      setLastAdded(Math.round(amountLiters * 1000));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
  }, [onQuickAdd]);

  const message = getMessage();

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: cardScale }], opacity: cardAnim },
      ]}
    >
      {/* Success Toast */}
      <SuccessToast visible={showSuccess} amount={lastAdded} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <WaterDropIcon />
          <Text style={styles.title}>Hydration</Text>
        </View>
        <TouchableOpacity
          onPress={onOpenFullTracker}
          style={styles.detailsButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Open full hydration tracker"
          accessibilityRole="button"
        >
          <Text style={styles.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={TEXT.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Liquid Progress */}
        <View
          accessible={true}
          accessibilityLabel={`Hydration progress: ${Math.round(progress)}% of daily goal. ${currentMl} milliliters of ${goalMl} milliliters consumed.`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
        >
          <LiquidProgress progress={progress} size={110} />
        </View>

        {/* Stats Panel */}
        <View style={styles.statsPanel}>
          <View style={styles.messageRow}>
            <Text style={styles.messageEmoji}>{message.emoji}</Text>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentMl}</Text>
              <Text style={styles.statLabel}>Current</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, remaining === 0 && styles.statValueComplete]}>
                {remaining}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            <Ionicons name="flag" size={12} color={TEXT.tertiary} />
            <Text style={styles.goalText}>Goal: {goalMl}ml</Text>
          </View>
        </View>
      </View>

      {/* Smart Tip - Contextual Recommendation */}
      <TouchableOpacity
        onPress={() => setShowTip(!showTip)}
        style={styles.tipToggle}
        activeOpacity={0.7}
        accessibilityLabel={showTip ? "Hide hydration tip" : "Show hydration tip"}
        accessibilityRole="button"
      >
        <View style={styles.tipToggleLeft}>
          <Ionicons name="bulb-outline" size={16} color={BRAND.primary} />
          <Text style={styles.tipToggleText}>
            {showTip ? "Hide tip" : "Smart tip"}
          </Text>
        </View>
        <Ionicons
          name={showTip ? "chevron-up" : "chevron-down"}
          size={16}
          color={TEXT.tertiary}
        />
      </TouchableOpacity>

      {showTip && <SmartTip tip={recommendation} />}

      {/* Quick Add Section */}
      <View style={styles.quickAddSection}>
        <Text style={styles.quickAddTitle}>Quick Add</Text>
        <View style={styles.quickAddRow}>
          <QuickAddButton amount={0.25} label="250ml" onPress={handleQuickAdd} />
          <QuickAddButton amount={0.5} label="500ml" onPress={handleQuickAdd} isPrimary icon="add" />
          <QuickAddButton amount={0.75} label="750ml" onPress={handleQuickAdd} />
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// STYLES - Ultra-premium, refined
// ============================================================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    ...SHADOWS.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconWrapper: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: `${TEXT.tertiary}10`,
    borderRadius: RADIUS.full,
  },
  detailsText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },

  // Main Content
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[5],
    marginBottom: SPACING[5],
  },

  // Liquid Progress
  liquidContainer: {
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 100,
    opacity: 0.4,
  },
  liquidMask: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  liquidCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidPercent: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.primary,
    letterSpacing: -1,
  },
  liquidPercentLight: {
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liquidLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginTop: -2,
  },
  liquidLabelLight: {
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Stats Panel
  statsPanel: {
    flex: 1,
    gap: SPACING[3],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  messageEmoji: {
    fontSize: 18,
  },
  messageText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  statValueComplete: {
    color: SEMANTIC.success.base,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: `${TEXT.tertiary}25`,
    marginHorizontal: SPACING[3],
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  goalText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Quick Add Section
  quickAddSection: {
    borderTopWidth: 1,
    borderTopColor: `${TEXT.tertiary}12`,
    paddingTop: SPACING[4],
  },
  quickAddTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[3],
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  quickAddWrapper: {
    flex: 1,
  },
  quickAddWrapperPrimary: {
    flex: 1.4,
  },
  quickAddTouchable: {
    flex: 1,
  },
  quickAddPrimaryGradient: {
    height: 52,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.md,
  },
  quickAddPrimaryText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
    letterSpacing: -0.2,
  },
  quickAddSecondary: {
    height: 52,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${BRAND.primary}08`,
    borderWidth: 1.5,
    borderColor: `${BRAND.primary}20`,
  },
  quickAddSecondaryPressed: {
    backgroundColor: `${BRAND.primary}15`,
    borderColor: `${BRAND.primary}35`,
  },
  quickAddSecondaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Success Toast
  successToast: {
    position: 'absolute',
    top: SPACING[3],
    left: SPACING[4],
    right: SPACING[4],
    zIndex: 100,
    ...SHADOWS.lg,
  },
  successToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.xl,
  },
  successIconContainer: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successToastText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
    letterSpacing: -0.2,
  },

  // Smart Tip Toggle
  tipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: `${BRAND.primary}06`,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
  },
  tipToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  tipToggleText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: BRAND.primary,
  },

  // Smart Tip Content
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    padding: SPACING[4],
    backgroundColor: `${SURFACES.background.secondary}`,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${TEXT.tertiary}10`,
  },
  tipIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
    gap: SPACING[1],
  },
  tipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    lineHeight: 20,
  },
  tipBeverage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: SPACING[1],
  },
});
