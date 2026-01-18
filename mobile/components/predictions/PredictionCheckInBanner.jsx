/**
 * PredictionCheckInBanner
 *
 * A dismissable banner that appears at the top of the screen
 * when there's a pending prediction check-in.
 *
 * Features:
 * - Slides in from top with animation
 * - Quick response buttons inline
 * - Tap to expand for more options
 * - Auto-dismisses after 30 seconds
 * - Swipe to dismiss
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Domain colors
const DOMAIN_COLORS = {
  food: { primary: '#F59E0B', background: 'rgba(254, 243, 199, 0.95)' },
  hydration: { primary: '#3B82F6', background: 'rgba(219, 234, 254, 0.95)' },
  mood: { primary: '#8B5CF6', background: 'rgba(237, 233, 254, 0.95)' },
  activity: { primary: '#10B981', background: 'rgba(209, 250, 229, 0.95)' },
};

const AUTO_DISMISS_DELAY = 30000; // 30 seconds

export default function PredictionCheckInBanner({
  visible,
  data,
  onDismiss,
  onQuickResponse,
  onExpand,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef(null);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dy) > 10 || Math.abs(gesture.dx) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          // Swiping up - allow it
          translateY.setValue(gesture.dy);
        } else if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          // Swiping horizontally
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -50 || Math.abs(gesture.dx) > 100) {
          // Dismissed by swipe
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          animateOut();
        } else {
          // Spring back
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Animate in
  useEffect(() => {
    if (visible && data) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Start auto-dismiss timer
      autoDismissTimer.current = setTimeout(() => {
        animateOut();
      }, AUTO_DISMISS_DELAY);

      // Haptic to get attention
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, data]);

  const animateOut = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }

    Animated.timing(translateY, {
      toValue: -200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      onDismiss?.();
    });
  };

  const handleQuickResponse = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickResponse?.(data.id, value);
    animateOut();
  };

  const handleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }
    onExpand?.(data);
    animateOut();
  };

  if (!data) return null;

  const domain = data.domain || 'food';
  const colors = DOMAIN_COLORS[domain] || DOMAIN_COLORS.food;

  // Get first 2 buttons for quick response
  const quickButtons = data.buttons?.slice(0, 2) || [];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }, { translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BlurView
        intensity={80}
        tint="light"
        style={[styles.banner, { backgroundColor: colors.background }]}
      >
        {/* Left: Emoji and text */}
        <TouchableOpacity
          style={styles.contentContainer}
          onPress={handleExpand}
          activeOpacity={0.8}
        >
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{data.emoji || '📊'}</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {data.title}
            </Text>
            <Text style={styles.body} numberOfLines={1}>
              {data.body}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Quick response buttons */}
        <View style={styles.buttonsContainer}>
          {quickButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickButton,
                { borderColor: colors.primary },
              ]}
              onPress={() => handleQuickResponse(button.value)}
            >
              <Text style={[styles.quickButtonText, { color: colors.primary }]}>
                {button.label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={animateOut}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={TEXT.tertiary} />
        </TouchableOpacity>
      </BlurView>

      {/* Swipe indicator */}
      <View style={styles.swipeIndicator}>
        <Text style={styles.swipeText}>Swipe up to dismiss</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
  },
  quickButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingTop: 6,
    opacity: 0.5,
  },
  swipeText: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
});
