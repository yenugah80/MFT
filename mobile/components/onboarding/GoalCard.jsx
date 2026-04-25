/**
 * GoalCard — Horizontal card for goal selection
 * Keeps per-goal gradient colors as "hero" elements.
 * Spring animation: Stiffness 300, Damping 20 (per design spec).
 */

import React from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const GoalCard = ({
  id,
  iconName,
  label,
  description,
  gradientStart,
  gradientEnd,
  isSelected = false,
  onPress,
}) => {
  const animScale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(animScale, {
      toValue: 0.97,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animScale, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: animScale }] }}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress?.(id);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
      >
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            isSelected && {
              shadowColor: gradientStart,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.42,
              shadowRadius: 22,
              elevation: 16,
            },
          ]}
        >
          {/* Depth circles — bleed off edge for asymmetry */}
          <View style={styles.decorCircleLarge} />
          <View style={styles.decorCircleSmall} />

          {/* Frosted icon bubble */}
          <View style={styles.iconBubble}>
            <Ionicons name={iconName} size={30} color="#FFFFFF" />
          </View>

          {/* Text */}
          <View style={styles.textContent}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Selection indicator */}
          <View style={styles.rightSide}>
            {isSelected ? (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-sharp" size={15} color={gradientStart} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.50)" />
            )}
          </View>

          {/* Selected border shimmer */}
          {isSelected && <View style={styles.selectedBorder} />}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  decorCircleLarge: {
    position: 'absolute',
    top: -50,
    right: -32,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.09)',
    pointerEvents: 'none',
  },
  decorCircleSmall: {
    position: 'absolute',
    bottom: -36,
    right: 56,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    pointerEvents: 'none',
  },
  iconBubble: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  rightSide: {
    flexShrink: 0,
    width: 28,
    alignItems: 'center',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.50)',
    pointerEvents: 'none',
  },
});

export default GoalCard;
