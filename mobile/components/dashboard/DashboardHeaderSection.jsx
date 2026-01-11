import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

/**
 * Enhanced Dashboard Header Section
 * THEME-AWARE: Works in both light and dark modes
 *
 * Features:
 * - User avatar with initials
 * - Time-of-day personalized greeting
 * - Quick stats summary (calories, water, wellness)
 * - Streak badge with fire animation hint
 * - Notification bell
 * - Theme and focus mode toggles
 */
export default function DashboardHeaderSection({
  styles: parentStyles,
  headerTitle,
  theme,
  focusMode,
  refreshing,
  onOpenTheme,
  onToggleFocusMode,
  // Enhanced props
  userInitials = 'U',
  userImageUrl = null,
  todayCalories = 0,
  calorieGoal = 2000,
  waterProgress = 0, // 0-100 percentage
  waterIntakeLiters = 0, // actual liters consumed
  waterGoalLiters = 2.0, // goal in liters
  streak = 0,
  hasNotifications = false,
  onNotificationPress,
  showQuickStats = true,
  // Contextual intelligence props
  contextualInsight = null, // e.g., "You usually log breakfast by 9:30"
  proteinYesterday = null, // for "Yesterday ended below protein target"
  proteinGoal = null,
  lastMealTime = null, // for timing insights
  userName = null,
  // User lifecycle props - for returning user detection
  isReturning = false,
  daysSinceLastLog = null,
}) {
  const { colors, isDark } = useTheme();

  const handleOpenTheme = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenTheme();
  };

  const handleToggleFocus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleFocusMode();
  };

  const handleNotificationPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onNotificationPress) {
      onNotificationPress();
    }
  };

  // Calculate calorie percentage for progress indicator
  const caloriePercent = Math.min(Math.round((todayCalories / calorieGoal) * 100), 100);

  // Theme-aware colors
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;
  const brandPrimary = colors.brand.primary;
  const brandSecondary = colors.brand.secondary;

  // Get color for calorie progress
  const getCalorieColor = () => {
    if (caloriePercent >= 90 && caloriePercent <= 110) return brandSecondary;
    if (caloriePercent > 110) return brandSecondary;
    return brandPrimary;
  };

  // Get color for water progress
  const getWaterColor = () => {
    if (waterProgress >= 100) return brandSecondary;
    if (waterProgress > 0) return brandPrimary;
    return brandPrimary;
  };

  // Get time-based icon
  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'sunny-outline';
    if (hour < 18) return 'partly-sunny-outline';
    return 'moon-outline';
  };

  // Theme-aware style values
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surface?.card?.primary || '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.surface?.card?.border || 'rgba(0,0,0,0.08)';
  const subtleBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  const focusColor = isDark ? '#60A5FA' : '#3B82F6';

  // Generate contextual intelligence - the key differentiator
  const getContextualIntelligence = () => {
    const hour = new Date().getHours();

    // Priority 0: RETURNING USER - Welcome back message
    // This is the multi-billion dollar app approach: greet returning users warmly
    if (isReturning && daysSinceLastLog !== null && daysSinceLastLog > 0) {
      if (daysSinceLastLog === 1) {
        return { text: 'Welcome back! Ready to continue?', icon: 'hand-right-outline' };
      } else if (daysSinceLastLog <= 3) {
        return { text: `Welcome back! Last active ${daysSinceLastLog} days ago`, icon: 'hand-right-outline' };
      } else if (daysSinceLastLog <= 7) {
        return { text: 'Good to see you! Pick up where you left off', icon: 'heart-outline' };
      } else {
        return { text: 'Welcome back! Your patterns are waiting', icon: 'sparkles-outline' };
      }
    }

    // Priority 1: Explicit insight passed in
    if (contextualInsight) return { text: contextualInsight, icon: 'bulb-outline' };

    // Priority 2: Yesterday's protein gap
    if (proteinYesterday !== null && proteinGoal && proteinYesterday < proteinGoal * 0.8) {
      const gap = Math.round(proteinGoal - proteinYesterday);
      return { text: `Yesterday: ${gap}g below protein target`, icon: 'trending-down-outline' };
    }

    // Priority 3: Time-based actionable insights
    if (hour < 10 && todayCalories === 0) {
      return { text: 'Protein first stabilizes morning energy', icon: 'flash-outline' };
    }
    if (hour >= 10 && hour < 12 && todayCalories === 0) {
      return { text: 'Late start? A balanced meal catches you up', icon: 'time-outline' };
    }
    if (hour >= 12 && hour < 14 && todayCalories < 400) {
      return { text: 'Midday fuel keeps afternoon focus sharp', icon: 'sunny-outline' };
    }
    if (hour >= 17 && hour < 20 && waterProgress < 50) {
      return { text: 'Hydration dips evening energy', icon: 'water-outline' };
    }
    if (hour >= 20 && todayCalories > 0) {
      return { text: 'Light dinner supports better sleep', icon: 'moon-outline' };
    }

    // Priority 4: Progress-based
    if (streak >= 7) {
      return { text: `${streak} days of data. Patterns emerging.`, icon: 'analytics-outline' };
    }
    if (streak >= 3) {
      return { text: 'Building your baseline. Keep logging.', icon: 'pulse-outline' };
    }

    // Default: Functional, not fluffy
    return { text: 'Log to unlock your patterns', icon: 'scan-outline' };
  };

  const intelligence = getContextualIntelligence();

  return (
    <>
      {/* App Branding Row - Subtle & Premium */}
      <View style={[localStyles.brandingRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
        <View style={localStyles.brandingLeft}>
          <View
            style={[
              localStyles.brandIcon,
              { borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.08)' },
            ]}
          >
            <LinearGradient
              colors={isDark ? ['#8FA0E6', '#C8D2F5'] : [brandPrimary, brandSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={localStyles.brandIconInner}
            >
              <Text style={localStyles.brandIconLabel}>Logo</Text>
            </LinearGradient>
          </View>
          <View style={localStyles.brandTextContainer}>
            <Text style={[localStyles.brandName, { color: textPrimary }]}>Nutri</Text>
            <Text style={[localStyles.brandTagline, { color: textTertiary }]}>Food intelligence</Text>
          </View>
        </View>
        {/* PRO badge - TODO: Show only for premium users once payment system is implemented */}
        {/* <View style={[localStyles.premiumBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)', borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)' }]}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={localStyles.premiumText}>PRO</Text>
        </View> */}
      </View>

      {/* Main Header Row */}
      <View style={localStyles.headerContainer}>
        {/* Left: Avatar + Greeting */}
        <View style={localStyles.leftSection}>
          {/* User Avatar */}
          <View style={localStyles.avatarContainer}>
          <LinearGradient
            colors={isDark ? ['#8FA0E6', '#C8D2F5'] : [brandPrimary, brandSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={localStyles.avatar}
          >
              <Text style={localStyles.avatarText}>{userInitials}</Text>
            </LinearGradient>
            {/* Online indicator */}
            <View style={[localStyles.onlineIndicator, { borderColor: isDark ? '#1A1F3A' : '#FFFFFF' }]} />
          </View>

          {/* Intelligence Block - replaces generic greeting */}
          <View style={localStyles.greetingContainer}>
            <View style={localStyles.intelligenceRow}>
              <View style={[localStyles.intelligenceIconBadge, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)' }]}>
                <Ionicons name={intelligence.icon} size={14} color="#8B5CF6" />
              </View>
              <Text style={[localStyles.intelligenceText, { color: textPrimary }]} numberOfLines={2}>
                {intelligence.text}
              </Text>
            </View>
            <Text style={[localStyles.dateText, { color: textTertiary }]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Right: Actions */}
        <View style={localStyles.rightSection}>
          {/* Streak Badge */}
          {streak > 0 && (
            <View style={[localStyles.streakBadge, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)', borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)' }]}>
              <Ionicons name="flame" size={14} color="#F97316" />
              <Text style={[localStyles.streakText, { color: '#F97316' }]}>{streak}</Text>
            </View>
          )}

          {/* Notification Bell */}
          <TouchableOpacity
            style={[localStyles.iconButton, { backgroundColor: subtleBg, borderColor: cardBorder }]}
            onPress={handleNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name={hasNotifications ? 'notifications' : 'notifications-outline'}
              size={20}
              color={hasNotifications ? brandPrimary : textSecondary}
            />
            {hasNotifications && <View style={localStyles.notificationDot} />}
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            style={[localStyles.iconButton, { backgroundColor: subtleBg, borderColor: cardBorder }]}
            onPress={handleOpenTheme}
            accessibilityRole="button"
            accessibilityLabel="Open theme settings"
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats Row */}
      {showQuickStats && (
        <View style={[localStyles.quickStatsRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Calories */}
        <View style={localStyles.quickStat}>
          <View style={[localStyles.quickStatIcon, { backgroundColor: subtleBg }]}>
            <Ionicons name="flame-outline" size={16} color={getCalorieColor()} />
          </View>
          <Text style={[localStyles.quickStatTitle, { color: textSecondary }]}>Calories</Text>
          <View style={localStyles.quickStatContent}>
            <Text style={[localStyles.quickStatValue, { color: getCalorieColor() }]}>
              {Math.round(todayCalories)}
            </Text>
            <Text style={[localStyles.quickStatLabel, { color: textTertiary }]}>/{calorieGoal} cal</Text>
          </View>
          <View style={[localStyles.miniProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)' }]}>
            <View
              style={[
                localStyles.miniProgressFill,
                {
                  width: `${Math.min(caloriePercent, 100)}%`,
                  backgroundColor: getCalorieColor()
                }
              ]}
            />
          </View>
        </View>

        {/* Divider */}
        <View style={[localStyles.statDivider, { backgroundColor: cardBorder }]} />

        {/* Water - Show absolute liters for consistency with calories */}
        <View style={localStyles.quickStat}>
          <View style={[localStyles.quickStatIcon, { backgroundColor: subtleBg }]}>
            <Ionicons name="water-outline" size={16} color={getWaterColor()} />
          </View>
          <Text style={[localStyles.quickStatTitle, { color: textSecondary }]}>Water</Text>
          <View style={localStyles.quickStatContent}>
            <Text style={[localStyles.quickStatValue, { color: getWaterColor() }]}>
              {waterIntakeLiters.toFixed(1)}
            </Text>
            <Text style={[localStyles.quickStatLabel, { color: textTertiary }]}>/{waterGoalLiters.toFixed(1)} L</Text>
          </View>
          <View style={[localStyles.miniProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)' }]}>
            <View
              style={[
                localStyles.miniProgressFill,
                {
                  width: `${Math.min(waterProgress, 100)}%`,
                  backgroundColor: getWaterColor()
                }
              ]}
            />
          </View>
          {waterIntakeLiters <= 0 && (
            <Text style={[localStyles.quickStatHint, { color: textTertiary }]}>Start with a glass</Text>
          )}
        </View>

        </View>
      )}

      {/* Minimal sync indicator - just a subtle dot, no distracting pills */}
      {refreshing && (
        <View style={localStyles.syncingIndicator}>
          <View style={localStyles.syncingDot} />
          <Text style={[localStyles.syncingText, { color: textTertiary }]}>Syncing...</Text>
        </View>
      )}

      {/* Focus Mode Indicator Banner */}
      {focusMode && (
        <View style={[localStyles.focusModeIndicator, { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(59, 130, 246, 0.08)', borderColor: isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.2)' }]}>
          <Ionicons name="eye-off" size={16} color={focusColor} />
          <Text style={[localStyles.focusModeIndicatorText, { color: focusColor }]}>Focus Mode Active</Text>
          <Text style={[localStyles.focusModeIndicatorSubtext, { color: textTertiary }]}>Showing essentials only</Text>
        </View>
      )}
    </>
  );
}

const localStyles = StyleSheet.create({
  // App Branding Row
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  brandingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  brandIconInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  brandTextContainer: {
    gap: 1,
  },
  brandName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.medium,
    letterSpacing: 0.3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F59E0B',
    letterSpacing: 0.5,
  },

  // Main Header Container
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },

  // Left Section (Avatar + Greeting)
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  timeIcon: {
    marginLeft: SPACING[2],
  },
  // Intelligence block styles - signature visual language
  intelligenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  intelligenceIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  intelligenceText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    flex: 1,
    lineHeight: 20,
  },
  dateText: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 4,
    marginLeft: 32, // Aligns with text after icon badge
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Right Section (Actions)
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    borderWidth: 1,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatTitle: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  quickStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  quickStatContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING[1],
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    marginLeft: 2,
  },
  miniProgressContainer: {
    width: '86%',
    height: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickStatHint: {
    fontSize: 10,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING[2],
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  syncDotActive: {
    backgroundColor: '#3B82F6',
  },
  syncText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  focusModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  focusModeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Focus Mode Indicator
  focusModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    marginBottom: SPACING[4],
  },
  focusModeIndicatorText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  focusModeIndicatorSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    marginLeft: 'auto',
  },

  // Minimal syncing indicator
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: SPACING[2],
  },
  syncingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  syncingText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
