/**
 * Preference Strength Selector
 * Slider component for selecting how important a preference is (1-5 scale)
 * Shows visual hearts, smooth animations, and haptic feedback
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SHADOWS } from '../../constants/premiumTheme';

const STRENGTH_LABELS = {
  1: 'Open to it',
  2: 'Prefer it',
  3: 'Like it',
  4: 'Really like it',
  5: 'Essential'
};

const STRENGTH_COLORS = {
  1: TEXT.tertiary,
  2: TEXT.tertiary,
  3: '#FCD34D',
  4: '#FBBF24',
  5: '#F97316',
};

export default function PreferenceStrengthSelector({
  preferenceId = '',
  preferenceLabel = '',
  currentStrength = 3,
  onStrengthChange = () => {},
  showDescription = true
}) {
  const [animatedValue] = useState(new Animated.Value(currentStrength));
  const [displayStrength, setDisplayStrength] = useState(currentStrength);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: currentStrength,
      useNativeDriver: false,
      speed: 10,
      bounciness: 5
    }).start();
    setDisplayStrength(currentStrength);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStrength]);

  const handleStrengthSelect = async (strength) => {
    if (strength !== displayStrength) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onStrengthChange(strength);
    }
  };

  const getGradientColors = (strength) => {
    const colorMap = {
      1: [SURFACES.background.secondary, TEXT.tertiary],
      2: ['#F0F9FF', '#BFDBFE'],
      3: ['#FFFBF0', '#FED7AA'],
      4: ['#FEF3C7', '#FBBF24'],
      5: ['#FEF3C7', '#F97316']
    };
    return colorMap[strength] || colorMap[3];
  };

  return (
    <View style={styles.container}>
      {/* Preference Label */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: TEXT.primary }]}>
          {preferenceLabel}
        </Text>
        <Text
          style={[
            styles.strengthValue,
            { color: STRENGTH_COLORS[displayStrength] }
          ]}
        >
          {STRENGTH_LABELS[displayStrength]}
        </Text>
      </View>

      {/* Strength Selector Buttons */}
      <View style={styles.selectorContainer}>
        {[1, 2, 3, 4, 5].map((strength) => {
          const isSelected = displayStrength === strength;
          const gradientColors = getGradientColors(strength);

          return (
            <TouchableOpacity
              key={strength}
              onPress={() => handleStrengthSelect(strength)}
              style={styles.strengthButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSelected ? gradientColors : ['#F3F4F6', SURFACES.divider]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.strengthButtonGradient,
                  isSelected && {
                    borderColor: STRENGTH_COLORS[strength],
                    borderWidth: 2,
                    ...SHADOWS.md
                  }
                ]}
              >
                {/* Heart indicators */}
                <View style={styles.heartsContainer}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.heart,
                        {
                          opacity: idx < strength ? 1 : 0.2,
                          fontSize: isSelected ? 16 : 14
                        }
                      ]}
                    >
                      ❤️
                    </Text>
                  ))}
                </View>

                {/* Number label */}
                <Text
                  style={[
                    styles.strengthNumber,
                    {
                      color: isSelected ? STRENGTH_COLORS[strength] : TEXT.secondary
                    }
                  ]}
                >
                  {strength}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Optional Description */}
      {showDescription && (
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: TEXT.tertiary }]}>
            {['Never interested', 'Sometimes', 'Often', 'Very often', 'Always prefer'][displayStrength - 1]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 0
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    minWidth: 100,
    textAlign: 'center'
  },
  selectorContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  strengthButton: {
    flex: 1,
    aspectRatio: 1
  },
  strengthButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 6
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 1,
    justifyContent: 'center'
  },
  heart: {
    fontSize: 12,
    lineHeight: 16
  },
  strengthNumber: {
    fontSize: 12,
    fontWeight: '700'
  },
  descriptionContainer: {
    marginTop: 12,
    paddingHorizontal: 4
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center'
  }
});
