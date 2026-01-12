import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

/**
 * InsightNudge - A subtle, non-intrusive insight banner
 *
 * THEME-AWARE: Works in both light and dark modes
 *
 * Design principles:
 * - Compact single-line design
 * - Soft colors that don't alarm
 * - Dismissible by user
 * - Positioned inline, doesn't block content
 * - Gentle nudge, not a warning
 */
export default function InsightNudge({
  icon = 'sparkles',
  message,
  actionLabel,
  onAction,
  onDismiss,
  type = 'default', // default, welcome, reminder, success
}) {
  const [dismissed, setDismissed] = useState(false);
  const { colors, isDark } = useTheme();

  if (dismissed || !message) return null;

  const handleDismiss = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    onDismiss?.();
  };

  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction?.();
  };

  // Theme-aware color schemes based on type
  const getColors = () => {
    const textPrimary = colors.text.primary;
    const textSecondary = colors.text.secondary;
    const textMuted = colors.text.muted;

    if (isDark) {
      // Dark mode colors - brighter for visibility
      switch (type) {
        case 'welcome':
          return {
            bg: 'rgba(124, 102, 255, 0.15)',
            border: 'rgba(124, 102, 255, 0.25)',
            icon: '#A78BFF',
            text: textPrimary,
            actionText: '#A78BFF',
          };
        case 'reminder':
          return {
            bg: 'rgba(96, 165, 250, 0.15)',
            border: 'rgba(96, 165, 250, 0.25)',
            icon: '#60A5FA',
            text: textPrimary,
            actionText: '#60A5FA',
          };
        case 'success':
          return {
            bg: 'rgba(74, 222, 128, 0.15)',
            border: 'rgba(74, 222, 128, 0.25)',
            icon: '#4ADE80',
            text: textPrimary,
            actionText: '#4ADE80',
          };
        default:
          return {
            bg: 'rgba(255, 255, 255, 0.08)',
            border: 'rgba(255, 255, 255, 0.12)',
            icon: textSecondary,
            text: textPrimary,
            actionText: textSecondary,
          };
      }
    } else {
      // Light mode colors
      switch (type) {
        case 'welcome':
          return {
            bg: `${SEMANTIC_ACTIONS.success}14`,
            border: `${SEMANTIC_ACTIONS.success}26`,
            icon: colors.brand.primary,
            text: textSecondary,
            actionText: colors.brand.primary,
          };
        case 'reminder':
          return {
            bg: 'rgba(59, 130, 246, 0.08)',
            border: 'rgba(59, 130, 246, 0.15)',
            icon: '#3B82F6',
            text: textSecondary,
            actionText: '#3B82F6',
          };
        case 'success':
          return {
            bg: 'rgba(34, 197, 94, 0.08)',
            border: 'rgba(34, 197, 94, 0.15)',
            icon: '#22C55E',
            text: textSecondary,
            actionText: '#22C55E',
          };
        default:
          return {
            bg: colors.surface?.card?.secondary || 'rgba(0,0,0,0.03)',
            border: colors.surface?.card?.border || 'rgba(0,0,0,0.08)',
            icon: textMuted,
            text: textSecondary,
            actionText: textMuted,
          };
      }
    }
  };

  const themeColors = getColors();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: themeColors.bg,
        borderColor: themeColors.border,
      }
    ]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${themeColors.icon}20` }]}>
        <Ionicons name={icon} size={14} color={themeColors.icon} />
      </View>

      {/* Message */}
      <Text
        style={[styles.message, { color: themeColors.text }]}
        numberOfLines={1}
      >
        {message}
      </Text>

      {/* Action Button (optional) */}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAction}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          <Text style={[styles.actionText, { color: themeColors.actionText }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}

      {/* Dismiss Button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
        accessibilityLabel="Dismiss"
      >
        <Ionicons
          name="close"
          size={14}
          color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  actionButton: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  dismissButton: {
    padding: SPACING[1],
    marginLeft: SPACING[1],
  },
});
