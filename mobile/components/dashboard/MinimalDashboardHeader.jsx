/**
 * MinimalDashboardHeader - Headspace/Calm Pattern
 *
 * Design Philosophy: "Invitation, not status report"
 * - Brand identity: Logo + app name for recognition
 * - Time-aware greeting: Personal, contextual hello
 * - Single focus: ONE tappable nudge, not multiple stats
 * - Streak badge: Duolingo-inspired loss aversion
 * - No stats in header: Stats belong in dashboard body
 *
 * Why this works:
 * - Users don't see "0/3, 0%, –" as first thing (feels like failure)
 * - Single nudge = one clear action to take
 * - Smart routing: water nudge → water section, meal nudge → log
 * - Headspace/Calm approach: invite to action, don't report status
 */

import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../../constants/premiumTheme';

// Lottie Animation Assets
const LOTTIE_ANIMATIONS = {
  streak: require('../../assets/animations/streak.json'),
};

// ============================================================================
// CONSTANTS - Muted colors for nudges and streak
// ============================================================================

const STAT_COLORS = {
  water: '#0E7490',    // Muted cyan for water nudge
  streak: '#DC2626',   // Red for lost streak (loss aversion)
  streakActive: '#F97316', // Orange when streak is active
};

// ============================================================================
// HELPERS
// ============================================================================

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getDateDisplay = () => {
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return now.toLocaleDateString('en-US', options);
};

/**
 * Get contextual nudge - ONE LINE only
 * Based on time of day + current progress + streak status + user context
 * Returns: { text, icon, color, route: 'meals'|'water'|'mood' }
 */
const getNudge = ({
  mealsLogged,
  waterProgress,
  moodLogged,
  streak,
  bestStreak,
  hour,
  // NEW: Personalization parameters
  level = 1,
  lifecycleStage = null,
  isReturning = false,
  hoursSinceLastMeal = null,
  xpToNextLevel = null,
}) => {
  // Priority 0: Returning user who lost streak (personalized fresh start)
  if (isReturning && bestStreak > 0 && streak === 0) {
    return {
      text: `Welcome back! Your new streak starts now.`,
      icon: 'refresh-outline',
      color: STAT_COLORS.streakActive,
      route: 'meals',
    };
  }

  // Priority 1: Streak loss (Duolingo psychology)
  if (bestStreak > 0 && streak === 0) {
    return {
      text: `Your ${bestStreak}-day streak ended. Start fresh today.`,
      icon: 'flame-outline',
      color: STAT_COLORS.streak,
      route: 'meals',
    };
  }

  // Priority 2: Streak milestone celebration (subtle, not screaming)
  if (streak === 7 || streak === 14 || streak === 30 || streak === 100) {
    const emoji = streak >= 30 ? '🎯' : '🔥';
    // Level-aware celebration
    const message = level >= 8
      ? `${streak} days! You're unstoppable. ${emoji}`
      : `${streak} days strong. ${emoji}`;
    return {
      text: message,
      icon: 'flame',
      color: STAT_COLORS.streakActive,
      route: 'meals',
    };
  }

  // Priority 2.5: Near level-up nudge (gamification hook)
  if (xpToNextLevel !== null && xpToNextLevel <= 30 && mealsLogged === 0) {
    return {
      text: `Just ${xpToNextLevel} XP to level up! Log a meal.`,
      icon: 'trending-up-outline',
      color: STAT_COLORS.streakActive,
      route: 'meals',
    };
  }

  // Priority 2.7: Time gap nudge (been too long since eating)
  if (hoursSinceLastMeal !== null && hoursSinceLastMeal >= 6 && hour < 21) {
    return {
      text: `${hoursSinceLastMeal}h since your last meal. Time to eat?`,
      icon: 'time-outline',
      color: TEXT.secondary,
      route: 'meals',
    };
  }

  // Priority 3: Time-based nudges (meal timing) - with lifecycle awareness
  if (hour < 10 && mealsLogged === 0) {
    // Lifecycle-aware breakfast nudge
    const message = lifecycleStage === 'brand_new'
      ? 'Start your journey—log breakfast!'
      : lifecycleStage === 'onboarding'
        ? 'Day by day! Log breakfast to build your habit.'
        : 'Log breakfast to start your day right.';
    return {
      text: message,
      icon: 'sunny-outline',
      color: TEXT.tertiary,
      route: 'meals',
    };
  }

  if (hour >= 12 && hour < 14 && mealsLogged <= 1) {
    return {
      text: 'Lunch time—track what you eat.',
      icon: 'restaurant-outline',
      color: TEXT.tertiary,
      route: 'meals',
    };
  }

  if (hour >= 18 && hour < 21 && mealsLogged <= 2) {
    return {
      text: 'Don\'t forget to log dinner.',
      icon: 'moon-outline',
      color: TEXT.tertiary,
      route: 'meals',
    };
  }

  // Priority 4: Progress encouragement
  if (mealsLogged >= 3 && waterProgress >= 80 && moodLogged) {
    // Level-aware completion message
    const message = level >= 10
      ? 'Perfect tracking. Elite consistency.'
      : 'Great tracking today. You\'re all set.';
    return {
      text: message,
      icon: 'checkmark-circle-outline',
      color: '#059669', // Muted green
      route: 'meals',
    };
  }

  if (waterProgress < 50 && hour > 14) {
    return {
      text: 'Stay hydrated—you\'re behind on water.',
      icon: 'water-outline',
      color: STAT_COLORS.water,
      route: 'water',
    };
  }

  // Priority 5: Power user streak encouragement
  if (lifecycleStage === 'power_user' && streak >= 7 && mealsLogged === 0) {
    return {
      text: `${streak} days strong. Keep the momentum!`,
      icon: 'flame',
      color: STAT_COLORS.streakActive,
      route: 'meals',
    };
  }

  // Default: No nudge needed (clean state)
  return null;
};

// ============================================================================
// STREAK INDICATOR - Duolingo-inspired with loss awareness
// ============================================================================

const StreakIndicator = ({ streak, bestStreak, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef(null);

  // Subtle pulse for milestone streaks
  useEffect(() => {
    let loop;
    if (streak === 7 || streak === 14 || streak === 30 || streak === 100) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
    }
    return () => {
      loop?.stop();
      pulseAnim.setValue(1);
    };
  }, [streak, pulseAnim]);

  // Auto-play Lottie when streak is active
  useEffect(() => {
    if (streak > 0 && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [streak]);

  const handlePress = async () => {
    if (!onPress) return;
    await Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  // Lost streak state (Duolingo style)
  const isLostStreak = bestStreak > 0 && streak === 0;

  // No streak to show
  if (streak === 0 && bestStreak === 0) return null;

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
      <TouchableOpacity
        style={[
          styles.streakBadge,
          isLostStreak && styles.streakBadgeLost,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {isLostStreak ? (
          <Ionicons
            name="flame-outline"
            size={14}
            color={STAT_COLORS.streak}
          />
        ) : (
          <LottieView
            ref={lottieRef}
            source={LOTTIE_ANIMATIONS.streak}
            autoPlay
            loop
            speed={0.8}
            style={styles.streakLottie}
          />
        )}
        <Text style={[
          styles.streakText,
          isLostStreak && styles.streakTextLost,
        ]}>
          {isLostStreak ? '0' : streak}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MinimalDashboardHeader({
  userName,
  mealsLogged = 0,
  waterProgress = 0,
  moodLogged = false,
  streak = 0,
  bestStreak = 0,
  notificationCount = 0,
  // NEW: Personalization props
  level = 1,
  lifecycleStage = null,
  isReturning = false,
  hoursSinceLastMeal = null,
  xpToNextLevel = null,
  // Callbacks
  onSettingsPress,
  onNotificationsPress,
  onMealsPress,
  onWaterPress,
  onMoodPress,
  onStreakPress,
  style,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const greeting = getGreeting();
  const dateDisplay = getDateDisplay();
  const firstName = userName?.split(' ')[0] || '';
  const hour = new Date().getHours();

  // Get contextual nudge with personalization
  const nudge = useMemo(() => getNudge({
    mealsLogged,
    waterProgress,
    moodLogged,
    streak,
    bestStreak,
    hour,
    // Personalization
    level,
    lifecycleStage,
    isReturning,
    hoursSinceLastMeal,
    xpToNextLevel,
  }), [mealsLogged, waterProgress, moodLogged, streak, bestStreak, hour, level, lifecycleStage, isReturning, hoursSinceLastMeal, xpToNextLevel]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      {/* Row 0: Brand Header - Logo + App Name + Notifications + Profile */}
      <View style={styles.brandHeader}>
        <View style={styles.brandLeft}>
          <Image
            source={require('../../assets/images/app-logo.png')}
            style={styles.logoImage}
          />
          <Text style={styles.brandName}>MyFoodTracker</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={24} color={TEXT.secondary} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Profile */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onSettingsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="person-circle-outline" size={28} color={TEXT.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 1: Greeting + Streak */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </Text>
          <StreakIndicator
            streak={streak}
            bestStreak={bestStreak}
            onPress={onStreakPress}
          />
        </View>
        <Text style={styles.date}>{dateDisplay}</Text>
      </View>

      {/* Row 2: Contextual Nudge - tappable, single focus */}
      {/* No stats here - stats belong in dashboard body, not greeting area */}
      {/* This follows Headspace/Calm pattern: invitation, not status report */}
      {nudge && (
        <TouchableOpacity
          style={styles.nudgeTouchable}
          onPress={() => {
            // Smart routing based on nudge type
            if (nudge.route === 'water' && onWaterPress) {
              onWaterPress();
            } else if (nudge.route === 'mood' && onMoodPress) {
              onMoodPress();
            } else if (onMealsPress) {
              onMealsPress();
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.nudgeContainer}>
            <Ionicons name={nudge.icon} size={16} color={nudge.color} />
            <Text style={[styles.nudgeText, { color: nudge.color }]}>
              {nudge.text}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={TEXT.tertiary} />
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[3],
  },

  // Brand Header
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
  },
  brandName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButton: {
    padding: 4,
  },

  // Greeting Section
  greetingSection: {
    marginBottom: SPACING[2],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  greeting: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Streak Badge - Duolingo inspired
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF7ED',
    paddingLeft: SPACING[1],
    paddingRight: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  streakBadgeLost: {
    backgroundColor: '#FEF2F2', // Red tint for lost streak
    paddingLeft: SPACING[2],
  },
  streakLottie: {
    width: 24,
    height: 24,
    marginLeft: -2,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: STAT_COLORS.streakActive,
  },
  streakTextLost: {
    color: STAT_COLORS.streak,
  },

  // Contextual Nudge (tappable)
  nudgeTouchable: {
    marginTop: SPACING[1],
  },
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    paddingLeft: 2,
  },
  nudgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    flex: 1,
  },
});
