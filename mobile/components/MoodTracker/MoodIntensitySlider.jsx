/**
 * MoodIntensitySlider - Interactive 1-10 Slider with Haptic Feedback
 *
 * Features:
 * - 10-step intensity scale (1-10)
 * - Haptic feedback at each step
 * - Spring snap animation
 * - Dynamic gradient based on mood color
 * - Labels: Low (1-3), Medium (4-7), High (8-10)
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - (SPACING[5] * 2);
const THUMB_SIZE = 40;

const MoodIntensitySlider = ({
  value = 5,
  onChange,
  moodColor = '#3B82F6',
  disabled = false,
}) => {
  const position = useRef(new Animated.Value(((value - 1) / 9) * (SLIDER_WIDTH - THUMB_SIZE))).current;
  const lastHapticValue = useRef(value);

  useEffect(() => {
    // Update position when value changes externally
    const targetPosition = ((value - 1) / 9) * (SLIDER_WIDTH - THUMB_SIZE);
    Animated.spring(position, {
      toValue: targetPosition,
      tension: 300,
      friction: 20,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, gesture) => {
        if (disabled) return;

        // Calculate new position with boundaries
        const maxPosition = SLIDER_WIDTH - THUMB_SIZE;
        const newPos = Math.max(0, Math.min(gesture.moveX - (SPACING[5] + THUMB_SIZE / 2), maxPosition));

        // Calculate value from position
        const newValue = Math.round((newPos / maxPosition) * 9) + 1;

        // Haptic feedback at each step
        if (newValue !== lastHapticValue.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticValue.current = newValue;

          if (onChange) {
            onChange(newValue);
          }
        }

        // Update position immediately for smooth dragging
        position.setValue(newPos);
      },
      onPanResponderRelease: () => {
        if (disabled) return;

        // Snap to nearest step with spring animation
        const maxPosition = SLIDER_WIDTH - THUMB_SIZE;
        const stepValue = ((value - 1) / 9) * maxPosition;

        Animated.spring(position, {
          toValue: stepValue,
          tension: 300,
          friction: 20,
          useNativeDriver: false,
        }).start();

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  const getIntensityLabel = (val) => {
    if (val <= 3) return 'Low';
    if (val <= 7) return 'Medium';
    return 'High';
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Mood intensity: ${value} out of 10, ${getIntensityLabel(value)}`}
      accessibilityValue={{ min: 1, max: 10, now: value }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Intensity</Text>
        <View style={styles.valueBadge}>
          <Text style={[styles.valueText, { color: moodColor }]}>{value}/10</Text>
        </View>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderContainer}>
        {/* Gradient Track */}
        <LinearGradient
          colors={[`${moodColor}40`, moodColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        />

        {/* Step Indicators */}
        <View style={styles.stepsContainer}>
          {[...Array(10)].map((_, i) => {
            const stepValue = i + 1;
            const isActive = stepValue <= value;

            return (
              <View
                key={i}
                style={[
                  styles.stepIndicator,
                  isActive && {
                    backgroundColor: moodColor,
                    transform: [{ scale: 1.2 }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Draggable Thumb */}
        <Animated.View
          style={[
            styles.thumbContainer,
            {
              transform: [{ translateX: position }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.thumb, { backgroundColor: moodColor, ...SHADOWS.lg }]}>
            <Text style={styles.thumbValue}>{value}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <Text style={styles.label}>Low</Text>
        <Text style={styles.label}>Medium</Text>
        <Text style={styles.label}>High</Text>
      </View>

      {/* Intensity Description */}
      <Text style={styles.description}>
        {getIntensityLabel(value)} intensity
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  valueBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  valueText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sliderContainer: {
    height: 60,
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  track: {
    height: 8,
    borderRadius: RADIUS.sm,
    opacity: 0.3,
  },
  stepsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH - THUMB_SIZE,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    transition: 'all 0.2s',
  },
  thumbContainer: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  thumbValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#FFFFFF',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[2],
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    textAlign: 'center',
  },
});

export default MoodIntensitySlider;
