/**
 * PatternDetectiveCard - Your Body Patterns
 *
 * Discovers YOUR unique food-mood correlations that you wouldn't find yourself.
 * "Your mood averages 7.2 when you have protein at breakfast vs 5.1 without"
 *
 * Features:
 * - Personal pattern detection from YOUR historical data
 * - Progressive learning that gets smarter over time
 * - Visual confidence indicators
 * - Actionable recommendations
 * - Beautiful animations
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SHADOWS, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';
import { getDiscoveredPatterns } from '../../utils/bodyIntelligenceEngine';

/**
 * Confidence Stars
 */
function ConfidenceStars({ confidence }) {
  const fullStars = Math.floor(confidence * 5);
  const hasHalfStar = (confidence * 5) % 1 >= 0.5;

  return (
    <View style={styles.starsContainer}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons
          key={i}
          name={
            i < fullStars
              ? 'star'
              : i === fullStars && hasHalfStar
                ? 'star-half'
                : 'star-outline'
          }
          size={12}
          color={i < fullStars || (i === fullStars && hasHalfStar) ? SEMANTIC_ACTIONS.warning : TEXT.muted}
        />
      ))}
    </View>
  );
}

/**
 * Single Pattern Card
 */
function PatternCard({ pattern, index, onPress, isActive }) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 150,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.02 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isActive, scaleAnim]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(pattern);
  };

  const isPositive = pattern.type === 'positive';
  const isInfo = pattern.type === 'info';
  const typeColor = isPositive ? SEMANTIC_ACTIONS.success : isInfo ? BRAND.primary : SEMANTIC_ACTIONS.warning;
  const typeBg = isPositive
    ? `${SEMANTIC_ACTIONS.success}1A`
    : isInfo
      ? `${BRAND.primary}1A`
      : `${SEMANTIC_ACTIONS.warning}1A`;

  return (
    <Animated.View
      style={[
        styles.patternCardWrapper,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.patternCard, isActive && styles.patternCardActive]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={pattern.title}
        accessibilityHint={pattern.message}
      >
        {/* Pattern Icon */}
        <View style={[styles.patternIcon, { backgroundColor: typeBg }]}>
          <Ionicons name={pattern.icon} size={24} color={typeColor} />
        </View>

        {/* Pattern Content */}
        <View style={styles.patternContent}>
          <View style={styles.patternHeader}>
            <Text style={styles.patternTitle}>{pattern.title}</Text>
            <ConfidenceStars confidence={pattern.confidence} />
          </View>

          <Text style={styles.patternMessage}>{pattern.message}</Text>

          {/* Stats if available */}
          {pattern.stats && (
            <View style={styles.statsRow}>
              {pattern.stats.improvement && (
                <View style={[styles.statBadge, { backgroundColor: typeBg }]}>
                  <Ionicons
                    name={isPositive ? 'trending-up' : 'analytics'}
                    size={12}
                    color={typeColor}
                  />
                  <Text style={[styles.statText, { color: typeColor }]}>
                    {pattern.stats.improvement} improvement
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action */}
          {pattern.action && (
            <View style={styles.actionRow}>
              <Ionicons name="bulb" size={14} color={BRAND.primary} />
              <Text style={styles.actionText}>{pattern.action}</Text>
            </View>
          )}
        </View>

        {/* Expand indicator */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={TEXT.tertiary}
          style={styles.chevron}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Pattern Detail Modal Content
 */
function PatternDetail({ pattern, onClose, onTryAction }) {
  if (!pattern) return null;

  const isPositive = pattern.type === 'positive';
  const typeColor = isPositive ? SEMANTIC_ACTIONS.success : SEMANTIC_ACTIONS.warning;

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailIcon, { backgroundColor: `${typeColor}15` }]}>
          <Ionicons name={pattern.icon} size={32} color={typeColor} />
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.detailTitle}>{pattern.title}</Text>
      <Text style={styles.detailMessage}>{pattern.message}</Text>

      {/* Confidence */}
      <View style={styles.detailConfidence}>
        <Text style={styles.detailConfidenceLabel}>Pattern Confidence</Text>
        <View style={styles.detailConfidenceBar}>
          <View
            style={[
              styles.detailConfidenceFill,
              { width: `${pattern.confidence * 100}%`, backgroundColor: typeColor }
            ]}
          />
        </View>
        <Text style={styles.detailConfidenceValue}>
          {Math.round(pattern.confidence * 100)}%
        </Text>
      </View>

      {/* Stats */}
      {pattern.stats && (
        <View style={styles.detailStats}>
          {pattern.stats.withProtein && (
            <View style={styles.detailStatItem}>
              <Text style={styles.detailStatValue}>{pattern.stats.withProtein}</Text>
              <Text style={styles.detailStatLabel}>With pattern</Text>
            </View>
          )}
          {pattern.stats.withoutProtein && (
            <View style={styles.detailStatItem}>
              <Text style={styles.detailStatValue}>{pattern.stats.withoutProtein}</Text>
              <Text style={styles.detailStatLabel}>Without</Text>
            </View>
          )}
          {pattern.stats.hydrated && (
            <View style={styles.detailStatItem}>
              <Text style={[styles.detailStatValue, { color: SEMANTIC_ACTIONS.success }]}>
                {pattern.stats.hydrated}
              </Text>
              <Text style={styles.detailStatLabel}>Well hydrated</Text>
            </View>
          )}
          {pattern.stats.dehydrated && (
            <View style={styles.detailStatItem}>
              <Text style={[styles.detailStatValue, { color: SEMANTIC_ACTIONS.warning }]}>
                {pattern.stats.dehydrated}
              </Text>
              <Text style={styles.detailStatLabel}>Low water</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Button */}
      {pattern.action && (
        <TouchableOpacity
          style={styles.detailActionButton}
          onPress={() => onTryAction?.(pattern)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.detailActionGradient}
          >
            <Ionicons name="flash" size={18} color="#FFF" />
            <Text style={styles.detailActionText}>{pattern.action}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Main PatternDetectiveCard Component
 */
export default function PatternDetectiveCard({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  days = 30,
  onPatternPress,
  onTryAction,
}) {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Detect patterns using ML-powered Body Intelligence Engine
  const patterns = useMemo(() => {
    return getDiscoveredPatterns({ foodLogs, moodLogs, waterLogs, days });
  }, [foodLogs, moodLogs, waterLogs, days]);

  // Entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const handlePatternPress = (pattern) => {
    setSelectedPattern(pattern.id === selectedPattern?.id ? null : pattern);
    onPatternPress?.(pattern);
  };

  // Determine display state based on pattern types
  const noDataAtAll = patterns.length > 0 && patterns[0].id === 'no-data';
  const hasSummaryOnly = patterns.length > 0 && patterns.some(p => p.id === 'data-summary');
  const hasRealPatterns = patterns.length > 0 && patterns.some(p =>
    !['no-data', 'data-summary', 'encourage-logging', 'need-data'].includes(p.id)
  );
  // Show patterns if we have real patterns OR summary data (always show something useful)
  const hasPatterns = patterns.length > 0 && patterns[0].id !== 'no-data';
  const needsMoreData = noDataAtAll;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: cardAnim }], opacity: cardAnim }
      ]}
    >
      <LinearGradient
        colors={[SURFACES.card.primary, `${BRAND.primary}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="pulse" size={22} color={BRAND.primary} />
            </View>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Your Body Patterns</Text>
                <View style={styles.aiBadge}>
                  <Ionicons name="analytics" size={10} color={BRAND.primary} />
                  <Text style={styles.aiText}>Learning</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {hasRealPatterns
                  ? `${patterns.filter(p => !['data-summary', 'encourage-logging'].includes(p.id)).length} unique pattern${patterns.filter(p => !['data-summary', 'encourage-logging'].includes(p.id)).length !== 1 ? 's' : ''} found in your data`
                  : hasSummaryOnly
                    ? 'Building your personal profile'
                    : 'Ready to learn your patterns'}
              </Text>
            </View>
          </View>
        </View>

        {/* Needs More Data State */}
        {needsMoreData && (
          <View style={styles.needsDataContainer}>
            <View style={styles.needsDataIcon}>
              <Ionicons name="analytics-outline" size={40} color={BRAND.primary} />
            </View>
            <Text style={styles.needsDataTitle}>{patterns[0].title}</Text>
            <Text style={styles.needsDataText}>{patterns[0].message}</Text>
            <View style={styles.needsDataProgress}>
              <View style={styles.progressItem}>
                <Ionicons
                  name={foodLogs.length >= 5 ? "checkmark-circle" : "restaurant-outline"}
                  size={16}
                  color={foodLogs.length >= 5 ? SEMANTIC_ACTIONS.success : TEXT.secondary}
                />
                <Text style={[
                  styles.progressText,
                  foodLogs.length >= 5 && { color: SEMANTIC_ACTIONS.success }
                ]}>
                  {foodLogs.length >= 5 ? `${foodLogs.length} meals ✓` : `${foodLogs.length}/5 meals`}
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Ionicons
                  name={moodLogs.length >= 3 ? "checkmark-circle" : "happy-outline"}
                  size={16}
                  color={moodLogs.length >= 3 ? SEMANTIC_ACTIONS.success : TEXT.secondary}
                />
                <Text style={[
                  styles.progressText,
                  moodLogs.length >= 3 && { color: SEMANTIC_ACTIONS.success }
                ]}>
                  {moodLogs.length >= 3 ? `${moodLogs.length} moods ✓` : `${moodLogs.length}/3 moods`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Pattern List */}
        {hasPatterns && (
          <View style={styles.patternList}>
            {patterns.map((pattern, index) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                index={index}
                onPress={handlePatternPress}
                isActive={selectedPattern?.id === pattern.id}
              />
            ))}
          </View>
        )}

        {/* Selected Pattern Detail */}
        {selectedPattern && (
          <PatternDetail
            pattern={selectedPattern}
            onClose={() => setSelectedPattern(null)}
            onTryAction={onTryAction}
          />
        )}

        {/* Footer */}
        {hasPatterns && (
          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={14} color={TEXT.muted} />
            <Text style={styles.footerText}>
              Patterns update as you log more data
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Main Card
  card: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: SURFACES.background.primary,
    ...SHADOWS.md,
  },
  cardGradient: {
    padding: SPACING[4],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${BRAND.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  aiText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Needs Data State
  needsDataContainer: {
    alignItems: 'center',
    padding: SPACING[4],
  },
  needsDataIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  needsDataTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  needsDataText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  needsDataProgress: {
    flexDirection: 'row',
    gap: SPACING[6],
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Pattern List
  patternList: {
    gap: SPACING[2],
  },

  // Pattern Card
  patternCardWrapper: {
    // Wrapper for animation
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  patternCardActive: {
    borderColor: `${BRAND.primary}30`,
    backgroundColor: `${SEMANTIC_ACTIONS.success}0D`,
  },
  patternIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  patternContent: {
    flex: 1,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  patternTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    flex: 1,
    marginRight: SPACING[2],
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  patternMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 18,
    marginBottom: SPACING[2],
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  chevron: {
    marginLeft: SPACING[2],
  },

  // Pattern Detail
  detailContainer: {
    marginTop: SPACING[4],
    padding: SPACING[4],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: SPACING[1],
  },
  detailTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  detailMessage: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    lineHeight: 22,
    marginBottom: SPACING[4],
  },
  detailConfidence: {
    marginBottom: SPACING[4],
  },
  detailConfidenceLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginBottom: SPACING[2],
  },
  detailConfidenceBar: {
    height: 8,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  detailConfidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailConfidenceValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'right',
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}0D`,
    borderRadius: RADIUS.lg,
  },
  detailStatItem: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  detailStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  detailActionButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  detailActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  detailActionText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: `${SEMANTIC_ACTIONS.success}14`,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
});
