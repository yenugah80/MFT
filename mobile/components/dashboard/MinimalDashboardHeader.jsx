/**
 * MinimalDashboardHeader - Clean Analytics Header
 *
 * Shows greeting with mini analytics indicators.
 * Includes visual progress rings and streak indicator.
 *
 * Design Principles:
 * - Minimal: Only essential info at a glance
 * - Visual: Mini progress indicators for quick status
 * - Non-judgmental: No shame for missed days
 * - Premium: Staff-level polish with subtle animations
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
} from '../../constants/premiumTheme';
import { BOLD_GRADIENTS } from '../../constants/modernColorPalette';

// Get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Get date display
const getDateDisplay = () => {
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return now.toLocaleDateString('en-US', options);
};

// Mini Progress Ring for header analytics
const MiniRing = ({ progress, color, size = 32, strokeWidth = 3 }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: Math.min(progress, 100),
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${color}30`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </View>
  );
};

// Quick Stat Pill
const QuickStat = ({ icon, value, label, color, progress, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    if (!onPress) return;
    await Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.quickStat}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <MiniRing progress={progress} color={color} size={32} />
        <View style={styles.quickStatInfo}>
          <Text style={styles.quickStatValue}>{value}</Text>
          <Text style={styles.quickStatLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Streak Badge
const StreakBadge = ({ streak }) => {
  if (streak < 2) return null;

  return (
    <View style={styles.streakBadge}>
      <Ionicons name="flame" size={14} color="#F97316" />
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
};

/**
 * MinimalDashboardHeader Component
 */
export default function MinimalDashboardHeader({
  userName,
  mealsLogged = 0,
  mealGoal = 3,
  waterProgress = 0,
  moodLogged = false,
  streak = 0,
  onSettingsPress,
  onNotificationsPress,
  onMealsPress,
  onWaterPress,
  onMoodPress,
  style,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const greeting = getGreeting();
  const dateDisplay = getDateDisplay();
  const firstName = userName?.split(' ')[0] || '';

  // Calculate progress percentages
  const mealProgress = Math.min((mealsLogged / mealGoal) * 100, 100);
  const moodProgress = moodLogged ? 100 : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      {/* Top Row: Greeting + Actions */}
      <View style={styles.topRow}>
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>
              {greeting}{firstName ? `, ${firstName}` : ''}
            </Text>
            <StreakBadge streak={streak} />
          </View>
          <Text style={styles.date}>{dateDisplay}</Text>
        </View>

        <View style={styles.actions}>
          {onNotificationsPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onNotificationsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications-outline" size={22} color={TEXT.secondary} />
            </TouchableOpacity>
          )}
          {onSettingsPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color={TEXT.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.quickStatsRow}>
        <QuickStat
          icon="restaurant"
          value={`${mealsLogged}/${mealGoal}`}
          label="Meals"
          color="#F97316"
          progress={mealProgress}
          onPress={onMealsPress}
        />
        <QuickStat
          icon="water"
          value={`${Math.round(waterProgress)}%`}
          label="Water"
          color="#0891B2"
          progress={waterProgress}
          onPress={onWaterPress}
        />
        <QuickStat
          icon="happy"
          value={moodLogged ? '✓' : '−'}
          label="Mood"
          color="#9333EA"
          progress={moodProgress}
          onPress={onMoodPress}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[4],
  },
  greetingSection: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  greeting: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Streak Badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F97316',
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  quickStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: SURFACES.elevated,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickStatInfo: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
});
