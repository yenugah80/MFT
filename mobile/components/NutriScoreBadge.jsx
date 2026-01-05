/**
 * NutriScoreBadge - Premium Compact NutriScore Display
 *
 * Multiple visual styles for different contexts:
 * - Pill: Compact gradient pill with letter (for lists)
 * - Ring: Circular with glow effect (for cards)
 * - Mini: Ultra-compact dot indicator (for tight spaces)
 * - Tag: Horizontal tag with label (for details)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NUTRISCORE, TYPOGRAPHY, SPACING, RADIUS } from '../constants/premiumTheme';

// Get NutriScore label
const getLabel = (grade) => {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Poor';
    case 'E': return 'Low';
    default: return 'Unknown';
  }
};

/**
 * NutriScorePill - Compact horizontal pill with gradient
 * Perfect for list items and compact spaces
 */
export function NutriScorePill({ grade = 'C', size = 'md', style }) {
  const g = (grade || 'C').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : 'C';
  const colors = NUTRISCORE[validGrade];

  const sizes = {
    sm: { height: 20, paddingH: 8, fontSize: 11 },
    md: { height: 24, paddingH: 10, fontSize: 12 },
    lg: { height: 28, paddingH: 12, fontSize: 14 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.pill,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          borderRadius: s.height / 2,
        },
        style
      ]}
    >
      <Text style={[styles.pillText, { fontSize: s.fontSize }]}>
        {validGrade}
      </Text>
    </LinearGradient>
  );
}

/**
 * NutriScoreGlow - Circular badge with soft glow effect
 * Great for cards and highlighted displays
 */
export function NutriScoreGlow({ grade = 'C', size = 'md', showLabel = false, style }) {
  const g = (grade || 'C').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : 'C';
  const colors = NUTRISCORE[validGrade];

  const sizes = {
    sm: { outer: 32, inner: 24, fontSize: 14 },
    md: { outer: 44, inner: 34, fontSize: 18 },
    lg: { outer: 56, inner: 44, fontSize: 24 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <View style={[styles.glowContainer, style]}>
      {/* Outer glow ring */}
      <View style={[
        styles.glowOuter,
        {
          width: s.outer,
          height: s.outer,
          borderRadius: s.outer / 2,
          backgroundColor: colors.bg,
        }
      ]}>
        {/* Inner gradient circle */}
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.glowInner,
            {
              width: s.inner,
              height: s.inner,
              borderRadius: s.inner / 2,
            }
          ]}
        >
          <Text style={[styles.glowText, { fontSize: s.fontSize }]}>
            {validGrade}
          </Text>
        </LinearGradient>
      </View>

      {showLabel && (
        <Text style={[styles.glowLabel, { color: colors.text }]}>
          {getLabel(validGrade)}
        </Text>
      )}
    </View>
  );
}

/**
 * NutriScoreDot - Ultra-compact colored dot indicator
 * For space-constrained areas
 */
export function NutriScoreDot({ grade = 'C', size = 8, style }) {
  const g = (grade || 'C').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : 'C';
  const colors = NUTRISCORE[validGrade];

  return (
    <View style={[
      styles.dot,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.base,
      },
      style
    ]} />
  );
}

/**
 * NutriScoreTag - Horizontal tag with icon and text
 * For detail views and expanded displays
 */
export function NutriScoreTag({ grade = 'C', style }) {
  const g = (grade || 'C').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : 'C';
  const colors = NUTRISCORE[validGrade];

  return (
    <View style={[styles.tag, { backgroundColor: colors.bg }, style]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tagBadge}
      >
        <Text style={styles.tagGrade}>{validGrade}</Text>
      </LinearGradient>
      <View style={styles.tagContent}>
        <Text style={[styles.tagLabel, { color: colors.text }]}>NutriScore</Text>
        <Text style={[styles.tagValue, { color: colors.text }]}>{getLabel(validGrade)}</Text>
      </View>
    </View>
  );
}

/**
 * NutriScoreCompact - Grade letter with background highlight
 * Minimal footprint for tight UIs
 */
export function NutriScoreCompact({ grade = 'C', style }) {
  const g = (grade || 'C').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : 'C';
  const colors = NUTRISCORE[validGrade];

  return (
    <View style={[styles.compact, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.compactGrade, { color: colors.text }]}>{validGrade}</Text>
    </View>
  );
}

/**
 * HealthScoreBadge - Numeric health score (0-100) display
 */
export function HealthScoreBadge({ score = 50, size = 'md', showLabel = false, style }) {
  const getHealthColor = (s) => {
    if (s >= 80) return { gradient: ['#4CAF50', '#66BB6A'], bg: '#E8F5E9', text: '#1B5E20', label: 'Excellent' };
    if (s >= 60) return { gradient: ['#8BC34A', '#9CCC65'], bg: '#F1F8E9', text: '#33691E', label: 'Good' };
    if (s >= 40) return { gradient: ['#FFC107', '#FFCA28'], bg: '#FFFDE7', text: '#F57F17', label: 'Average' };
    if (s >= 20) return { gradient: ['#FF9800', '#FFB74D'], bg: '#FFF3E0', text: '#E65100', label: 'Poor' };
    return { gradient: ['#F44336', '#EF5350'], bg: '#FFEBEE', text: '#B71C1C', label: 'Low' };
  };

  const colors = getHealthColor(score);
  const sizes = {
    sm: { size: 36, fontSize: 12 },
    md: { size: 48, fontSize: 16 },
    lg: { size: 64, fontSize: 20 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <View style={[styles.healthContainer, style]}>
      <View style={[styles.healthOuter, { backgroundColor: colors.bg, width: s.size, height: s.size, borderRadius: s.size / 2 }]}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.healthInner, { width: s.size - 6, height: s.size - 6, borderRadius: (s.size - 6) / 2 }]}
        >
          <Text style={[styles.healthScore, { fontSize: s.fontSize }]}>{Math.round(score)}</Text>
        </LinearGradient>
      </View>
      {showLabel && (
        <Text style={[styles.healthLabel, { color: colors.text }]}>{colors.label}</Text>
      )}
    </View>
  );
}

// Default export - most commonly used variant
export default function NutriScoreBadge({ grade, size, style, variant = 'pill' }) {
  switch (variant) {
    case 'glow': return <NutriScoreGlow grade={grade} size={size} style={style} />;
    case 'dot': return <NutriScoreDot grade={grade} style={style} />;
    case 'tag': return <NutriScoreTag grade={grade} style={style} />;
    case 'compact': return <NutriScoreCompact grade={grade} style={style} />;
    default: return <NutriScorePill grade={grade} size={size} style={style} />;
  }
}

const styles = StyleSheet.create({
  // Pill styles
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Glow styles
  glowContainer: {
    alignItems: 'center',
  },
  glowOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  glowInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  glowLabel: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Dot styles
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },

  // Tag styles
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },
  tagBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGrade: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagContent: {
    gap: 1,
  },
  tagLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    opacity: 0.8,
  },
  tagValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Compact styles
  compact: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  compactGrade: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Health score styles
  healthContainer: {
    alignItems: 'center',
  },
  healthOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScore: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  healthLabel: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
