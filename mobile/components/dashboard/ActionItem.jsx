/**
 * ActionItem - World Class Redesign
 *
 * Design Philosophy:
 * - ONLY Ionicons - no emojis, ever
 * - Clear visual feedback on press
 * - Accessible and touch-friendly (44pt minimum)
 * - Consistent with design system
 *
 * Inspired by: Apple Settings, iOS action buttons
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  TEXT,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

// Premium gradient for action buttons
const PREMIUM_GRADIENT = [BRAND.primary, BRAND.secondary];

/**
 * ActionItem Component
 *
 * @param {string} icon - Ionicon name (e.g., 'add-circle-outline')
 * @param {string} text - Primary label
 * @param {string} description - Secondary description
 * @param {Function} onTap - Callback when pressed
 * @param {string} variant - 'primary' | 'secondary' | 'ghost'
 */
export function ActionItem({
  icon = 'arrow-forward-outline',
  text = 'Take action',
  description = '',
  onTap,
  variant = 'primary',
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Ensure icon is always an Ionicon name
  const iconName = typeof icon === 'string' && icon.length > 2 ? icon : 'arrow-forward-outline';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
    onTap?.();
  };

  // Primary variant - gradient background
  if (variant === 'primary') {
    return (
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={text}
          accessibilityHint={description}
        >
          <LinearGradient
            colors={PREMIUM_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContent}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.primaryText}>{text}</Text>
              {description ? (
                <Text style={styles.primaryDescription} numberOfLines={1}>
                  {description}
                </Text>
              ) : null}
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#FFFFFF"
              style={styles.chevron}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Secondary variant - outlined
  if (variant === 'secondary') {
    return (
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.secondaryContent}
          accessibilityRole="button"
          accessibilityLabel={text}
        >
          <View style={styles.secondaryIconContainer}>
            <Ionicons name={iconName} size={22} color={BRAND.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.secondaryText}>{text}</Text>
            {description ? (
              <Text style={styles.secondaryDescription} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={TEXT.tertiary}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Ghost variant - minimal
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.ghostContent}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={text}
    >
      <Ionicons name={iconName} size={20} color={BRAND.primary} />
      <Text style={styles.ghostText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[2],
  },

  // Primary variant (gradient)
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    gap: SPACING[3],
    minHeight: 64, // Ensure touch target > 44px

    // Shadow for depth
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textContainer: {
    flex: 1,
    gap: 2,
  },

  primaryText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },

  primaryDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  chevron: {
    opacity: 0.8,
  },

  // Secondary variant (outlined)
  secondaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    gap: SPACING[3],
    minHeight: 64, // Ensure touch target > 44px
  },

  secondaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },

  secondaryDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Ghost variant (minimal)
  ghostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    minHeight: 44, // Ensure touch target meets minimum
  },

  ghostText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: BRAND.primary,
  },
});

export default ActionItem;
