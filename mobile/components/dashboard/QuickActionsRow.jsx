/**
 * QuickActionsRow - Premium Quick Action Buttons
 *
 * Design Philosophy: "One Tap to Action"
 * - 3 equal-width gradient buttons for primary actions
 * - Positioned directly after hero card for maximum visibility
 * - Haptic feedback + spring animation for premium feel
 * - Uses CARD_SYSTEM.compact styling
 */

import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, CARD_SYSTEM } from '../../constants/premiumTheme';

// Action configuration - semantic colors for each action type
const ACTIONS = [
  {
    key: 'meal',
    label: 'Log Meal',
    icon: 'restaurant-outline',
    gradient: ['#10B981', '#059669'], // Green - food/nutrition
  },
  {
    key: 'water',
    label: 'Log Water',
    icon: 'water-outline',
    gradient: ['#3B82F6', '#2563EB'], // Blue - hydration
  },
  {
    key: 'mood',
    label: 'Log Mood',
    icon: 'happy-outline',
    gradient: ['#F59E0B', '#D97706'], // Amber - mood/emotion
  },
];

/**
 * Single action button with spring animation
 */
function ActionButton({ action, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    // Haptic feedback first for immediate response
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Spring animation for premium feel
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.(action.key);
  };

  return (
    <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <LinearGradient
          colors={action.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name={action.icon} size={22} color="#FFFFFF" />
          <Text style={styles.buttonText}>{action.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Main QuickActionsRow Component
 */
export default function QuickActionsRow({ onLogMeal, onLogWater, onLogMood, style }) {
  const handleAction = (key) => {
    switch (key) {
      case 'meal':
        onLogMeal?.();
        break;
      case 'water':
        onLogWater?.();
        break;
      case 'mood':
        onLogMood?.();
        break;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {ACTIONS.map((action) => (
        <ActionButton key={action.key} action={action} onPress={handleAction} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    // Subtle shadow for depth
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    paddingVertical: SPACING[3] + 2, // 14px for comfortable touch target
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    letterSpacing: 0.3,
  },
});
