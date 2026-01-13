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
import { View, TouchableOpacity, Animated, StyleSheet, Text, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import {
  MOOD_PALETTE,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  TEXT,
  SURFACES,
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

const FORCE_FALLBACK_MOODS = new Set();
const ANDROID_LOTTIE_ALLOWLIST = new Set([
  'happy',
  'calm',
  'focused',
  'energized',
  'neutral',
  'tired',
  'stressed',
  'sad',
]);

const getLottieDurationMs = (source) => {
  if (!source || typeof source !== 'object') return null;
  if (typeof source.fr !== 'number' || typeof source.ip !== 'number' || typeof source.op !== 'number') {
    return null;
  }
  const frameCount = source.op - source.ip;
  if (frameCount <= 0 || source.fr <= 0) return null;
  return Math.round((frameCount / source.fr) * 1000);
};

const MoodIcon3D = ({
  mood,
  selected = false,
  onSelect,
  size = 80,
  showLabel = true,
  autoPlay = true,
  loop = true,
}) => {
  const animationRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [useFallback, setUseFallback] = useState(false);
  const wasSelectedRef = useRef(selected);
  const animationFinishedRef = useRef(false);
  const fallbackTimerRef = useRef(null);

  // Define lottieSource and moodColors early so they can be used in useEffect
  const lottieSource = MOOD_LOTTIE_SOURCES[mood];
  const moodColors = MOOD_PALETTE[mood];
  const label = mood.charAt(0).toUpperCase() + mood.slice(1);
  const forceFallback =
    FORCE_FALLBACK_MOODS.has(mood) || (Platform.OS === 'android' && !ANDROID_LOTTIE_ALLOWLIST.has(mood));
  const renderMode = Platform.OS === 'android' ? 'SOFTWARE' : 'AUTOMATIC';

  useEffect(() => {
    if (autoPlay) return;
    if (wasSelectedRef.current === selected) return;
    wasSelectedRef.current = selected;
    if (selected) {
      // Play animation immediately when selected
      if (animationRef.current && !useFallback) {
        try {
          animationRef.current.reset();
          animationRef.current.play();
          if (Platform.OS === 'android') {
            const durationMs = getLottieDurationMs(lottieSource) || 1200;
            animationFinishedRef.current = false;
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = setTimeout(() => {
              if (!animationFinishedRef.current) {
                setUseFallback(true);
              }
            }, durationMs + 200);
          }
        } catch (error) {
          console.warn(`Failed to play ${mood} animation:`, error);
          setUseFallback(true);
        }
      }

      // Scale up animation
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    } else {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      animationFinishedRef.current = false;
      // Scale back to normal
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();

      // Pause animation when not selected
      if (animationRef.current && !useFallback) {
        try {
          animationRef.current.pause();
        } catch (_error) {
          // Ignore pause errors
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, useFallback, mood, scaleAnim, lottieSource]);

  useEffect(() => {
    if (!autoPlay) return;
    if (animationRef.current && !useFallback) {
      try {
        animationRef.current.play();
      } catch (error) {
        console.warn(`Failed to autoplay ${mood} animation:`, error);
        setUseFallback(true);
      }
    }
  }, [autoPlay, useFallback, mood]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handlePress = async () => {
    if (selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSelect) {
      onSelect(mood);
    }
  };

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
          {!forceFallback && !useFallback && lottieSource ? (
            <LottieView
              ref={animationRef}
              source={lottieSource}
              style={{ width: size, height: size }}
              loop={loop}
              autoPlay={autoPlay}
              speed={1.2}
              resizeMode="cover"
              renderMode={renderMode}
              onAnimationFinish={() => {
                animationFinishedRef.current = true;
              }}
            />
          ) : (
            // Gradient emoji fallback
            <LinearGradient
              colors={moodColors.gradient}
              style={styles.fallbackContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.fallbackEmoji, { fontSize: size * 0.65 }]}>
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
    backgroundColor: SURFACES.card.primary,
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
    color: TEXT.primary,
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
