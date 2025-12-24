/**
 * MoodIcon3D - 3D Lottie Animation Wrapper for Mood Icons
 *
 * Features:
 * - Lottie animation playback
 * - Selection state with scale animation
 * - Haptic feedback on interaction
 * - Graceful fallback to gradient emoji if Lottie fails
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import {
  MOOD_PALETTE,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from '../../constants/premiumTheme';

// Lottie animation sources for 8 core moods
// Moved to constants/lottie for Metro bundler compatibility
const MOOD_LOTTIE_SOURCES = {
  happy: require('../../constants/lottie/mood-happy.json'),
  calm: require('../../constants/lottie/mood-calm.json'),
  focused: require('../../constants/lottie/mood-focused.json'),
  energized: require('../../constants/lottie/mood-energized.json'),
  neutral: require('../../constants/lottie/mood-neutral.json'),
  tired: require('../../constants/lottie/mood-tired.json'),
  stressed: require('../../constants/lottie/mood-stressed.json'),
  sad: require('../../constants/lottie/mood-sad.json'),
};

// Emoji fallbacks if Lottie files are missing
const MOOD_EMOJI_FALLBACKS = {
  happy: '😊',
  calm: '😌',
  focused: '🎯',
  energized: '⚡',
  neutral: '😐',
  tired: '😴',
  stressed: '😰',
  sad: '😢',
};

const MoodIcon3D = ({
  mood,
  selected = false,
  onSelect,
  size = 80,
  showLabel = true,
}) => {
  const animationRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (selected) {
      // Play animation when selected
      if (animationRef.current && !useFallback) {
        animationRef.current.play();
      }

      // Scale up animation
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    } else {
      // Scale back to normal
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    }
  }, [selected]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSelect) {
      onSelect(mood);
    }
  };

  const handleLottieError = (error) => {
    console.warn(`Lottie failed to load for mood: ${mood}`, error);
    setUseFallback(true);
  };

  const moodColors = MOOD_PALETTE[mood];
  const label = mood.charAt(0).toUpperCase() + mood.slice(1);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={styles.container}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Select ${label} mood`}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[
        styles.iconWrapper,
        selected && styles.iconWrapperSelected,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        {/* Selection glow effect */}
        {selected && (
          <View style={[
            styles.selectionGlow,
            {
              backgroundColor: moodColors.base,
              ...SHADOWS.lg,
            },
          ]} />
        )}

        {/* Lottie animation or emoji fallback */}
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          {!useFallback ? (
            <LottieView
              ref={animationRef}
              source={MOOD_LOTTIE_SOURCES[mood]}
              style={{ width: size, height: size }}
              loop={selected}
              autoPlay={false}
              onAnimationFailure={handleLottieError}
            />
          ) : (
            // Gradient emoji fallback
            <LinearGradient
              colors={moodColors.gradient}
              style={styles.fallbackContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.fallbackEmoji, { fontSize: size * 0.6 }]}>
                {MOOD_EMOJI_FALLBACKS[mood]}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Selection indicator */}
        {selected && (
          <View style={[styles.selectionDot, { backgroundColor: moodColors.base }]} />
        )}
      </Animated.View>

      {/* Mood label */}
      {showLabel && (
        <Text style={[
          styles.label,
          selected && {
            color: moodColors.base,
            fontWeight: TYPOGRAPHY.weight.bold,
          },
        ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: SPACING[2],
  },
  iconWrapper: {
    position: 'relative',
    padding: SPACING[2],
    borderRadius: RADIUS.xl,
    backgroundColor: 'transparent',
  },
  iconWrapperSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  selectionGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: RADIUS.xl,
    opacity: 0.3,
  },
  selectionDot: {
    position: 'absolute',
    bottom: SPACING[1],
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#6B7280',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  fallbackEmoji: {
    textAlign: 'center',
  },
});

export default MoodIcon3D;
