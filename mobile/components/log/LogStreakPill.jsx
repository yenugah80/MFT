/**
 * LogStreakPill - Compact streak indicator with history access
 *
 * Design based on user reference:
 * - White pill with orange flame icon
 * - Large count number + "logged" text
 * - Floating clock button for history
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../../constants/premiumTheme';

// Colors matching the design
const COLORS = {
  flame: '#F97316', // Orange
  pillBg: '#FFFFFF',
  clockBg: 'rgba(255, 255, 255, 0.3)',
  clockIcon: 'rgba(255, 255, 255, 0.8)',
  text: '#F97316',
  labelText: '#9CA3AF',
};

export default function LogStreakPill({
  loggedCount = 0,
  streak = 0,
  onHistoryPress,
  showHistoryButton = true,
  style,
}) {
  const router = useRouter();

  // Use streak if available, otherwise use logged count
  const displayCount = streak > 0 ? streak : loggedCount;

  const handleHistoryPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onHistoryPress) {
      onHistoryPress();
    } else {
      router.push('/history');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Floating History Button - only show if enabled */}
      {showHistoryButton && (
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleHistoryPress}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={22} color={COLORS.clockIcon} />
        </TouchableOpacity>
      )}

      {/* Main Pill */}
      <View style={styles.pill}>
        {/* Flame Icon */}
        <Ionicons name="flame-outline" size={26} color={COLORS.flame} />

        {/* Count */}
        <Text style={styles.countText}>{displayCount}</Text>

        {/* Label */}
        <Text style={styles.labelText}>meals</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },

  // Floating History Button
  historyButton: {
    position: 'absolute',
    top: -12,
    right: -20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.clockBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Main Pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pillBg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.xl,
    gap: SPACING[2],
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Count Text
  countText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -1,
  },

  // Label Text
  labelText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.labelText,
  },
});
