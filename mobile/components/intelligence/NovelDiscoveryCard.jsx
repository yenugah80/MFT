/**
 * NovelDiscoveryCard - Shows auto-discovered unique patterns
 *
 * These are surprising correlations found by pairwise scanning
 * that aren't in the standard rule set.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

export default function NovelDiscoveryCard({
  discovery,
  onPress,
}) {
  if (!discovery) return null;

  const {
    factorA,
    factorB,
    correlation = 0,
    lag = 0,
    noveltyScore = 0,
    pValue,
    sampleSize = 0,
    description,
    direction,
  } = discovery;

  const isPositive = correlation > 0;
  const strengthLabel = Math.abs(correlation) >= 0.7 ? 'Strong' :
    Math.abs(correlation) >= 0.4 ? 'Moderate' : 'Mild';
  const strengthColor = Math.abs(correlation) >= 0.7 ? '#10B981' :
    Math.abs(correlation) >= 0.4 ? '#F59E0B' : '#6B7280';

  const lagLabel = lag === 0 ? 'immediate' :
    lag === 2 ? '2h later' :
    lag === 6 ? '6h later' :
    lag === 12 ? 'half day later' :
    lag === 24 ? 'next day' :
    lag === 48 ? '2 days later' : `${lag}h later`;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(discovery);
  };

  // Generate description if not provided
  const displayDescription = description ||
    `${factorA} ${isPositive ? 'increases' : 'decreases'} ${factorB}${lag > 0 ? ` ${lagLabel}` : ''}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Novelty indicator */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.noveltyBadge}
      >
        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
        <Text style={styles.noveltyText}>
          {Math.round(noveltyScore * 100)}% Novel
        </Text>
      </LinearGradient>

      {/* Main content */}
      <View style={styles.content}>
        {/* Correlation visualization */}
        <View style={styles.correlationViz}>
          <View style={styles.factorBox}>
            <Text style={styles.factorText}>{formatFactorName(factorA)}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <View style={[styles.arrowLine, { backgroundColor: strengthColor }]} />
            <View style={[styles.arrowHead, isPositive ? styles.arrowUp : styles.arrowDown]}>
              <Ionicons
                name={isPositive ? 'arrow-forward' : 'arrow-forward'}
                size={16}
                color={strengthColor}
              />
            </View>
            {lag > 0 && (
              <View style={styles.lagBadge}>
                <Text style={styles.lagText}>{lagLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.factorBox}>
            <Text style={styles.factorText}>{formatFactorName(factorB)}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{displayDescription}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: strengthColor }]}>
              {strengthLabel}
            </Text>
            <Text style={styles.statLabel}>Strength</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(Math.abs(correlation) * 100)}%
            </Text>
            <Text style={styles.statLabel}>Correlation</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{sampleSize}</Text>
            <Text style={styles.statLabel}>Data points</Text>
          </View>
          {pValue && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, pValue < 0.05 ? { color: '#10B981' } : {}]}>
                  {pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}
                </Text>
                <Text style={styles.statLabel}>p-value</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} style={styles.chevron} />
    </TouchableOpacity>
  );
}

// Helper to format factor names
function formatFactorName(name) {
  if (!name) return '';
  // Convert camelCase or snake_case to readable
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    position: 'relative',
    overflow: 'hidden',
  },
  noveltyBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderBottomLeftRadius: RADIUS.md,
  },
  noveltyText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  content: {
    marginRight: SPACING[6],
  },
  correlationViz: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
    marginTop: SPACING[2],
  },
  factorBox: {
    flex: 1,
    backgroundColor: SURFACES.background.tertiary,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  factorText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    textAlign: 'center',
  },
  arrowContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrowLine: {
    height: 2,
    width: '100%',
  },
  arrowHead: {
    position: 'absolute',
    right: 0,
  },
  arrowUp: {},
  arrowDown: {},
  lagBadge: {
    position: 'absolute',
    top: -16,
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: SPACING[1],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  lagText: {
    fontSize: 9,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  description: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 22,
    marginBottom: SPACING[3],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: SURFACES.divider,
  },
  chevron: {
    position: 'absolute',
    right: SPACING[3],
    top: '50%',
    marginTop: -10,
  },
});
