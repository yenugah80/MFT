/**
 * GoalCard - Premium Edition
 * Large, tappable goal selection card with professional icons
 */

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
// Surfaces not currently used but kept for potential styling

const GoalCard = ({
  id,
  iconName, // Ionicon name instead of emoji
  label,
  description,
  gradientStart,
  gradientEnd,
  isSelected = false,
  onPress,
}) => {
  const animScale = React.useRef(new Animated.Value(1)).current;
  const animOpacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 15,
        bounciness: 8,
      }),
      Animated.timing(animOpacity, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 15,
        bounciness: 8,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: animScale }],
          opacity: animOpacity,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress?.(id);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Selection indicator badge */}
          {isSelected && (
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}

          {/* Icon container */}
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={44} color="#FFFFFF" />
          </View>

          {/* Label */}
          <Text style={styles.label}>{label}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>
        </LinearGradient>

        {/* Selection border */}
        {isSelected && <View style={styles.selectionBorder} />}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 160,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectionBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 19,
    flex: 1,
    letterSpacing: 0.2,
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    pointerEvents: 'none',
  },
});

export default GoalCard;
