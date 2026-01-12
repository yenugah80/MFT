/**
 * ModernStatCard - Compact glassmorphic stat card
 * Perfect for quick metrics display with modern aesthetics
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from '../GlassCard';
import FadeInView from '../FadeInView';
import {
  MODERN_TEXT,
  MODERN_SURFACES,
  getSemanticColor,
} from '../../constants/modernColorPalette';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * ModernStatCard Component
 *
 * @param {Object} props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.label - Stat label
 * @param {string|number} props.value - Stat value
 * @param {string} props.unit - Optional unit
 * @param {string} props.trend - Optional trend indicator ('up'|'down')
 * @param {string} props.trendValue - Optional trend value
 * @param {string} props.color - Icon/accent color
 * @param {Function} props.onPress - Optional press handler
 * @param {number} props.delay - Animation delay
 */
export default function ModernStatCard({
  icon,
  label,
  value,
  unit,
  trend,
  trendValue,
  color = MODERN_TEXT.brand,
  onPress,
  delay = 0,
}) {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : null;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : MODERN_TEXT.tertiary;

  return (
    <FadeInView animation="scaleIn" delay={delay}>
      <GlassCard
        variant="compact"
        onPress={onPress ? handlePress : undefined}
        glowType="subtle"
        containerStyle={styles.container}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>

            <View style={styles.valueRow}>
              <Text style={styles.value}>
                {value}
                {unit && <Text style={styles.unit}> {unit}</Text>}
              </Text>

              {/* Trend indicator */}
              {trendIcon && (
                <View style={styles.trendContainer}>
                  <Ionicons name={trendIcon} size={14} color={trendColor} />
                  {trendValue && (
                    <Text style={[styles.trendText, { color: trendColor }]}>
                      {trendValue}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Chevron for clickable cards */}
          {onPress && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={MODERN_TEXT.muted}
              style={styles.chevron}
            />
          )}
        </View>
      </GlassCard>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 150,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },

  stats: {
    flex: 1,
  },

  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: MODERN_TEXT.tertiary,
    marginBottom: SPACING[1],
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  value: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: MODERN_TEXT.primary,
  },

  unit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: MODERN_TEXT.secondary,
  },

  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING[2],
  },

  trendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginLeft: SPACING[1],
  },

  chevron: {
    marginLeft: SPACING[2],
  },
});
