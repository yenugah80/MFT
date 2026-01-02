/**
 * Warning Badge Component
 * Displays dietary warning indicators on recommendations
 * Shows visual distinction for non-compliant, allergenic, or non-preferred foods
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BADGE_TYPES = {
  allergen: {
    label: 'Contains Allergen',
    icon: 'alert-circle',
    colors: ['#FEE2E2', '#FECACA'],
    bgColor: '#DC2626',
    textColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  dietary: {
    label: 'Not Preferred',
    icon: 'information-circle',
    colors: ['#FEF3C7', '#FCD34D'],
    bgColor: '#D97706',
    textColor: '#78350F',
    borderColor: '#D97706',
  },
  dislike: {
    label: 'Disliked Item',
    icon: 'close-circle',
    colors: ['#FCE7F3', '#FBCFE8'],
    bgColor: '#BE185D',
    textColor: '#831843',
    borderColor: '#BE185D',
  },
  recommendation: {
    label: 'Recommended',
    icon: 'checkmark-circle',
    colors: ['#DCFCE7', '#BBFBDE'],
    bgColor: '#15803D',
    textColor: '#166534',
    borderColor: '#15803D',
  },
};

export default function WarningBadge({
  type = 'dietary',
  label = null,
  icon = null,
  size = 'medium',
  animated = false,
}) {
  const badgeConfig = BADGE_TYPES[type] || BADGE_TYPES.dietary;
  const displayLabel = label || badgeConfig.label;
  const displayIcon = icon || badgeConfig.icon;

  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          container: styles.badgeSmall,
          text: { fontSize: 11, fontWeight: '600' },
          iconSize: 14,
          paddingHorizontal: 8,
          paddingVertical: 4,
        };
      case 'large':
        return {
          container: styles.badgeLarge,
          text: { fontSize: 14, fontWeight: '600' },
          iconSize: 18,
          paddingHorizontal: 12,
          paddingVertical: 8,
        };
      case 'medium':
      default:
        return {
          container: styles.badgeMedium,
          text: { fontSize: 12, fontWeight: '600' },
          iconSize: 16,
          paddingHorizontal: 10,
          paddingVertical: 6,
        };
    }
  }, [size]);

  return (
    <LinearGradient
      colors={badgeConfig.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        sizeConfig.container,
        {
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          borderColor: badgeConfig.borderColor,
        },
      ]}
    >
      <View style={styles.badgeContent}>
        <Ionicons
          name={displayIcon}
          size={sizeConfig.iconSize}
          color={badgeConfig.bgColor}
        />
        <Text
          style={[
            sizeConfig.text,
            {
              color: badgeConfig.textColor,
              marginLeft: 6,
            },
          ]}
        >
          {displayLabel}
        </Text>
      </View>
    </LinearGradient>
  );
}

/**
 * Multiple Warnings Display
 * Shows multiple warning badges in a compact layout
 */
export function MultipleWarnings({ warnings = [], maxDisplay = 2 }) {
  if (!warnings || warnings.length === 0) return null;

  const displayedWarnings = warnings.slice(0, maxDisplay);
  const remainingCount = Math.max(0, warnings.length - maxDisplay);

  return (
    <View style={styles.warningsContainer}>
      {displayedWarnings.map((warning, index) => (
        <WarningBadge
          key={index}
          type={warning.type}
          label={warning.label}
          size="small"
        />
      ))}
      {remainingCount > 0 && (
        <View style={[styles.badgeSmall, styles.moreWarnings]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#666' }}>
            +{remainingCount} more
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Inline Warning Badge
 * Compact badge for use within recommendation cards
 */
export function InlineWarningBadge({ type = 'dietary', compact = true }) {
  const badgeConfig = BADGE_TYPES[type] || BADGE_TYPES.dietary;

  return (
    <View
      style={[
        styles.inlineBadge,
        {
          backgroundColor: badgeConfig.bgColor,
        },
      ]}
    >
      <Ionicons
        name={badgeConfig.icon}
        size={10}
        color="#FFFFFF"
        style={{ marginRight: 4 }}
      />
      <Text style={styles.inlineBadgeText}>{badgeConfig.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeMedium: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  badgeLarge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  moreWarnings: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  inlineBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
