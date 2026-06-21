/**
 * MoodIcon - Beautiful Mood Icon Component
 *
 * Uses Ionicons with gradient backgrounds for polished mood visualization.
 * Can optionally use custom Flaticon PNGs when available.
 */

import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MOOD_PALETTE, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

// ============================================================================
// MOOD CONFIGURATION
// ============================================================================

// Beautiful Ionicons mapped to each mood with matching colors
const MOOD_CONFIG = {
  happy: {
    icon: 'happy',
    label: 'Happy',
    gradient: ['#34D399', '#10B981'],
    iconColor: '#FFFFFF',
    light: '#D1FAE5',
    base: '#10B981',
  },
  calm: {
    icon: 'water',
    label: 'Calm',
    gradient: ['#60A5FA', '#3B82F6'],
    iconColor: '#FFFFFF',
    light: '#DBEAFE',
    base: '#3B82F6',
  },
  focused: {
    icon: 'eye',
    label: 'Focused',
    gradient: ['#818CF8', '#6366F1'],
    iconColor: '#FFFFFF',
    light: '#E0E7FF',
    base: '#6366F1',
  },
  energized: {
    icon: 'flash',
    label: 'Energized',
    gradient: ['#FBBF24', '#F59E0B'],
    iconColor: '#FFFFFF',
    light: '#FEF3C7',
    base: '#F59E0B',
  },
  neutral: {
    icon: 'remove-circle',
    label: 'Neutral',
    gradient: ['#A78BFA', '#8B5CF6'],
    iconColor: '#FFFFFF',
    light: '#EDE9FE',
    base: '#8B5CF6',
  },
  tired: {
    icon: 'moon',
    label: 'Tired',
    gradient: ['#94A3B8', '#64748B'],
    iconColor: '#FFFFFF',
    light: '#F1F5F9',
    base: '#64748B',
  },
  stressed: {
    icon: 'alert-circle',
    label: 'Stressed',
    gradient: ['#F87171', '#EF4444'],
    iconColor: '#FFFFFF',
    light: '#FEE2E2',
    base: '#EF4444',
  },
  sad: {
    icon: 'sad',
    label: 'Sad',
    gradient: ['#818CF8', '#6366F1'],
    iconColor: '#FFFFFF',
    light: '#E0E7FF',
    base: '#6366F1',
  },
};

// ============================================================================
// OPTIONAL: FLATICON PNG SUPPORT
// ============================================================================

// To use custom Flaticon PNGs:
// 1. Download icons to: mobile/assets/images/moods/mood-{name}.png
// 2. Uncomment the MOOD_ICONS require statements below
// 3. Set USE_PNG_ICONS = true

const USE_PNG_ICONS = false;

// Uncomment after adding PNG files:
// const MOOD_ICONS = {
//   happy: require('../../assets/images/moods/mood-happy.png'),
//   calm: require('../../assets/images/moods/mood-calm.png'),
//   focused: require('../../assets/images/moods/mood-focused.png'),
//   energized: require('../../assets/images/moods/mood-energized.png'),
//   neutral: require('../../assets/images/moods/mood-neutral.png'),
//   tired: require('../../assets/images/moods/mood-tired.png'),
//   stressed: require('../../assets/images/moods/mood-stressed.png'),
//   sad: require('../../assets/images/moods/mood-sad.png'),
// };

const MOOD_ICONS = null;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MoodIcon Component
 *
 * @param {string} mood - One of: happy, calm, focused, energized, neutral, tired, stressed, sad
 * @param {number} size - Icon size in pixels (default: 48)
 * @param {boolean} showLabel - Show mood label below icon
 * @param {boolean} selected - Whether this mood is currently selected
 * @param {function} onSelect - Callback when mood is tapped
 * @param {boolean} showBackground - Show light background behind icon
 * @param {string} variant - 'gradient' (default) | 'flat' | 'outline'
 */
const MoodIcon = ({
  mood = 'neutral',
  size = 48,
  showLabel = false,
  selected = false,
  onSelect,
  showBackground = false,
  variant = 'gradient',
}) => {
  const config = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
  const iconSize = Math.round(size * 0.55);

  const handlePress = async () => {
    if (onSelect) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(mood);
    }
  };

  const renderIcon = () => {
    // Option 1: Use custom PNG if available
    if (USE_PNG_ICONS && MOOD_ICONS?.[mood]) {
      return (
        <Image
          source={MOOD_ICONS[mood]}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      );
    }

    // Option 2: Gradient icon (default - looks beautiful)
    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={config.gradient}
          style={[styles.gradientCircle, { width: size, height: size, borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={config.icon} size={iconSize} color={config.iconColor} />
        </LinearGradient>
      );
    }

    // Option 3: Flat colored icon
    if (variant === 'flat') {
      return (
        <View
          style={[
            styles.flatCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: config.light,
            },
          ]}
        >
          <Ionicons name={config.icon} size={iconSize} color={config.base} />
        </View>
      );
    }

    // Option 4: Outline icon
    return (
      <View
        style={[
          styles.outlineCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: config.base,
          },
        ]}
      >
        <Ionicons name={`${config.icon}-outline`} size={iconSize} color={config.base} />
      </View>
    );
  };

  const content = (
    <View style={[styles.container, showLabel && styles.containerWithLabel]}>
      <View
        style={[
          styles.iconWrapper,
          selected && styles.iconWrapperSelected,
          showBackground && { backgroundColor: config.light, borderRadius: size / 2 + 4, padding: 4 },
        ]}
      >
        {renderIcon()}

        {/* Selection ring */}
        {selected && (
          <View
            style={[
              styles.selectionRing,
              {
                borderColor: config.base,
                borderRadius: size / 2 + 6,
              },
            ]}
          />
        )}
      </View>

      {/* Label */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            selected && { color: config.base, fontWeight: '700' },
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );

  if (onSelect) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select ${config.label} mood`}
        accessibilityState={{ selected }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerWithLabel: {
    marginHorizontal: SPACING[1],
  },
  iconWrapper: {
    position: 'relative',
  },
  iconWrapperSelected: {
    transform: [{ scale: 1.08 }],
  },
  gradientCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  flatCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  selectionRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2.5,
  },
  label: {
    marginTop: SPACING[1],
    fontSize: 11,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default MoodIcon;

// Export config for use in other components
export { MOOD_CONFIG };
