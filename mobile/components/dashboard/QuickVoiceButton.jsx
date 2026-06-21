/**
 * QuickVoiceButton - Floating action button for instant voice logging
 *
 * Premium floating button that appears on the dashboard for quick voice logging.
 * One tap to start recording - no navigation required.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import {
  BRAND,
  TEXT,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

// Pulse animation for the recording indicator
function PulseRing({ isRecording }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.4,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.2,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.6);
    }
  }, [isRecording, pulseAnim, opacityAnim]);

  if (!isRecording) return null;

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

export default function QuickVoiceButton({
  onPress,
  isRecording = false,
  disabled = false,
  style,
}) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef(null);
  const hideTimeout = useRef(null);

  // Show tooltip on first render for 3 seconds
  useEffect(() => {
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(true);
      hideTimeout.current = setTimeout(() => setShowTooltip(false), 3000);
    }, 1000);

    return () => {
      clearTimeout(tooltipTimeout.current);
      clearTimeout(hideTimeout.current);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTooltip(false);

    if (onPress) {
      onPress();
    } else {
      // Default: Navigate to log screen with voice mode
      router.push({
        pathname: '/(tabs)/log',
        params: { focus: 'voice' }
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Tooltip */}
      {showTooltip && (
        <Animated.View style={styles.tooltip}>
          <View style={styles.tooltipContent}>
            <Ionicons name="mic" size={14} color={TEXT.white} />
            <Text style={styles.tooltipText}>Tap to log with voice</Text>
          </View>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}

      {/* Pulse ring for recording state */}
      <PulseRing isRecording={isRecording} />

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
          accessibilityLabel={isRecording ? "Stop recording" : "Start voice logging"}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={isRecording
              ? ['#EF4444', '#DC2626']
              : [BRAND.primary, BRAND.primaryDark || '#5B3FD9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={28}
              color={TEXT.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Recording indicator text */}
      {isRecording && (
        <View style={styles.recordingBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  buttonWrapper: {
    ...SHADOWS.lg,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND.primary,
    zIndex: -1,
  },
  tooltip: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    alignItems: 'flex-end',
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },
  tooltipText: {
    color: TEXT.white,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
    marginRight: 20,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
    gap: SPACING[1],
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEXT.white,
  },
  recordingText: {
    color: TEXT.white,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
