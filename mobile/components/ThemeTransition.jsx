/**
 * ThemeTransition Component
 *
 * Provides smooth animated transitions when theme switches
 * Prevents jarring instant color changes
 *
 * Usage:
 * <ThemeTransition>
 *   <YourContent />
 * </ThemeTransition>
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

export default function ThemeTransition({ children, duration = 300 }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const previousTheme = useRef(theme);

  useEffect(() => {
    // Only animate if theme actually changed
    if (previousTheme.current !== theme) {
      // Fade out, then fade in
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.95,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();

      previousTheme.current = theme;
    }
  }, [theme, duration, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
