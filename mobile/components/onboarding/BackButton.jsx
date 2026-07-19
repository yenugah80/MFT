/**
 * BackButton - Premium Edition
 * Enhanced back button with visual feedback and haptics
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AUTH_COLORS } from '../auth/constants';

const BackButton = ({ onPress, enabled = true }) => {
  const animScale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(animScale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 15,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 15,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (enabled) {
      Haptics.selectionAsync();
      onPress?.();
    }
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: animScale }],
      }}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, !enabled && styles.buttonDisabled]}
        disabled={!enabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back to previous step"
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={enabled ? AUTH_COLORS.ink : AUTH_COLORS.muted}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: 'rgba(35, 20, 65, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
});

export default BackButton;
