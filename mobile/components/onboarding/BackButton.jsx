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
import { TEXT, SURFACES } from '../../constants/premiumTheme';

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
          color={enabled ? TEXT.primary : TEXT.muted}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F5F2',
  },
  buttonDisabled: {
    backgroundColor: '#F0F5F2',
    opacity: 0.45,
  },
});

export default BackButton;
