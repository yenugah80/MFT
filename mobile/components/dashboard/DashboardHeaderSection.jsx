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
  streak = 0,
  todayCalories = 0,
  calorieGoal = 2000,
  waterProgress = 0, // 0-100 percentage
  wellnessScore = null, // 0-100 or null
  hasNotifications = false,
  onNotificationPress,
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

  // Get color for calorie progress
  const getCalorieColor = () => {
    if (caloriePercent >= 90 && caloriePercent <= 110) return isDark ? '#4ADE80' : '#22C55E';
    if (caloriePercent > 110) return isDark ? '#FBBF24' : '#F59E0B';
    return brandPrimary;
  };

  // Get color for water progress
  const getWaterColor = () => {
    if (waterProgress >= 100) return isDark ? '#4ADE80' : '#22C55E';
    if (waterProgress >= 70) return isDark ? '#60A5FA' : '#3B82F6';
    return textTertiary;
  };

  // Get wellness tier color
  const getWellnessColor = () => {
    if (!wellnessScore) return textTertiary;
    if (wellnessScore >= 80) return isDark ? '#4ADE80' : '#22C55E';
    if (wellnessScore >= 60) return isDark ? '#60A5FA' : '#3B82F6';
    if (wellnessScore >= 40) return isDark ? '#FBBF24' : '#F59E0B';
    return isDark ? '#F87171' : '#EF4444';
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
  const onlineColor = '#22C55E';
  const streakColor = '#F97316';
  const focusColor = isDark ? '#60A5FA' : '#3B82F6';

  return (
    <>
      {/* App Branding Row - Subtle & Premium */}
      <View style={[localStyles.brandingRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
        <View style={localStyles.brandingLeft}>
          <LinearGradient
            colors={isDark ? ['#7C66FF', '#A78BFF'] : [brandPrimary, '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={localStyles.brandIcon}
          >
            <Ionicons name="leaf" size={14} color="#FFFFFF" />
          </LinearGradient>
          <View style={localStyles.brandTextContainer}>
            <Text style={[localStyles.brandName, { color: textPrimary }]}>NutriTrack</Text>
            <Text style={[localStyles.brandTagline, { color: textTertiary }]}>Smart Nutrition</Text>
          </View>
        </View>
        <View style={[localStyles.premiumBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)', borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)' }]}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={localStyles.premiumText}>PRO</Text>
        </View>
      </View>

      {/* Main Header Row */}
      <View style={localStyles.headerContainer}>
        {/* Left: Avatar + Greeting */}
        <View style={localStyles.leftSection}>
          {/* User Avatar */}
          <View style={localStyles.avatarContainer}>
            <LinearGradient
              colors={isDark ? ['#7C66FF', '#A78BFF'] : [brandPrimary, colors.brand.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={localStyles.avatar}
            >
              <Text style={localStyles.avatarText}>{userInitials}</Text>
            </LinearGradient>
            {/* Online indicator */}
            <View style={[localStyles.onlineIndicator, { borderColor: isDark ? '#1A1F3A' : '#FFFFFF' }]} />
          </View>

          {/* Greeting + Date */}
          <View style={localStyles.greetingContainer}>
            <View style={localStyles.greetingRow}>
              <Text style={[localStyles.greeting, { color: textPrimary }]}>{headerTitle}</Text>
              <Ionicons
                name={getTimeIcon()}
                size={18}
                color="#F59E0B"
                style={localStyles.timeIcon}
              />
            </View>
            <Text style={[localStyles.dateText, { color: textSecondary }]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
              {streak > 0 && (
                <Text style={[localStyles.streakInline, { color: streakColor }]}> · Day {streak} </Text>
              )}
            </Text>
          </View>
        </View>

        {/* Right: Actions */}
        <View style={localStyles.rightSection}>
          {/* Streak Badge */}
          {streak > 0 && (
            <View style={[localStyles.streakBadge, { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.25)' }]}>
              <Ionicons name="flame" size={14} color={streakColor} />
              <Text style={[localStyles.streakText, { color: streakColor }]}>{streak}</Text>
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
      <View style={[localStyles.quickStatsRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Calories */}
        <View style={localStyles.quickStat}>
          <View style={[localStyles.quickStatIcon, { backgroundColor: subtleBg }]}>
            <Ionicons name="flame-outline" size={16} color={getCalorieColor()} />
          </View>
          <View style={localStyles.quickStatContent}>
            <Text style={[localStyles.quickStatValue, { color: getCalorieColor() }]}>
              {Math.round(todayCalories)}
            </Text>
            <Text style={[localStyles.quickStatLabel, { color: textTertiary }]}>/{calorieGoal} cal</Text>
          </View>
          <View style={[localStyles.miniProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
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

        {/* Water */}
        <View style={localStyles.quickStat}>
          <View style={[localStyles.quickStatIcon, { backgroundColor: subtleBg }]}>
            <Ionicons name="water-outline" size={16} color={getWaterColor()} />
          </View>
          <View style={localStyles.quickStatContent}>
            <Text style={[localStyles.quickStatValue, { color: getWaterColor() }]}>
              {Math.round(waterProgress)}%
            </Text>
            <Text style={[localStyles.quickStatLabel, { color: textTertiary }]}>hydrated</Text>
          </View>
          <View style={[localStyles.miniProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
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
        </View>

        {/* Divider */}
        <View style={[localStyles.statDivider, { backgroundColor: cardBorder }]} />

        {/* Wellness */}
        <View style={localStyles.quickStat}>
          <View style={[localStyles.quickStatIcon, { backgroundColor: subtleBg }]}>
            <Ionicons name="heart-outline" size={16} color={getWellnessColor()} />
          </View>
          <View style={localStyles.quickStatContent}>
            <Text style={[localStyles.quickStatValue, { color: getWellnessColor() }]}>
              {wellnessScore !== null ? Math.round(wellnessScore) : '--'}
            </Text>
            <Text style={[localStyles.quickStatLabel, { color: textTertiary }]}>wellness</Text>
          </View>
          {wellnessScore !== null && (
            <View style={[localStyles.miniProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View
                style={[
                  localStyles.miniProgressFill,
                  {
                    width: `${Math.min(wellnessScore, 100)}%`,
                    backgroundColor: getWellnessColor()
                  }
                ]}
              />
            </View>
          )}
        </View>
      </View>

      {/* Sync Status + Focus Mode Row */}
      <View style={localStyles.statusRow}>
        {/* Sync Status */}
        <View style={[localStyles.syncStatus, { backgroundColor: subtleBg, borderColor: cardBorder }]}>
          <View style={[localStyles.syncDot, refreshing && localStyles.syncDotActive]} />
          <Text style={[localStyles.syncText, { color: textSecondary }]}>
            {refreshing ? 'Syncing...' : 'Synced'}
          </Text>
        </View>

        {/* Focus Mode Toggle */}
        <TouchableOpacity
          style={[
            localStyles.focusModeChip,
            { backgroundColor: subtleBg, borderColor: cardBorder },
            focusMode && { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(107, 78, 255, 0.1)', borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(107, 78, 255, 0.3)' }
          ]}
          onPress={handleToggleFocus}
          accessibilityRole="button"
          accessibilityLabel={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
        >
          <Ionicons
            name={focusMode ? 'eye-off' : 'eye'}
            size={14}
            color={focusMode ? focusColor : textTertiary}
          />
          <Text style={[localStyles.focusModeText, { color: focusMode ? focusColor : textTertiary }]}>
            {focusMode ? 'Focus On' : 'Focus'}
          </Text>
        </TouchableOpacity>
      </View>

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
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  dateText: {
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: 2,
  },
  streakInline: {
    fontWeight: TYPOGRAPHY.weight.semibold,
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
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
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
    width: '80%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
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
});
