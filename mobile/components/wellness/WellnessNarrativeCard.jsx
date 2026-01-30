/**
 * WellnessNarrativeCard - Personalized wellness storytelling component
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WELLNESS COMPONENT ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This component shows the SERVER-CALCULATED wellness score with narrative context.
 *
 * Score Priority (passed via wellnessScore prop):
 * 1. apiWellnessScore - server-calculated, authoritative
 * 2. wellnessScore?.score - client-calculated fallback
 * 3. 50 - default neutral value
 *
 * RELATED COMPONENTS:
 * - WellnessScoreCard: Client-calculated composite (Food+Mood+Water+Activity)
 * - EnhancedMoodCard: Mood-only (showWellnessScore={false})
 * - This component: Server-calculated + narrative + guidance
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Transforms dry metrics into engaging narratives:
 * - Shows wellness/recovery scores with context
 * - Explains what the numbers mean for THIS user
 * - Provides actionable guidance
 * - Uses visual hierarchy to prioritize information
 *
 * Design principles:
 * - Story first, numbers second
 * - Personalized language ("your", "you")
 * - Actionable insights with clear CTAs
 * - Progressive disclosure (summary → details)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND, SEMANTIC, TYPOGRAPHY } from '../../constants/premiumTheme';

// Score ring component for visual representation
const ScoreRing = ({ score, size = 60, strokeWidth = 6, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.scoreRingBackground, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth }]} />
      <View style={[styles.scoreRingForeground, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        transform: [{ rotate: '-90deg' }],
        borderTopColor: 'transparent',
        borderRightColor: score > 25 ? color : 'transparent',
        borderBottomColor: score > 50 ? color : 'transparent',
        borderLeftColor: score > 75 ? color : 'transparent',
      }]} />
      <Text style={[styles.scoreRingText, { color }]}>{score}</Text>
    </View>
  );
};

// Flag badge component
const FlagBadge = ({ flag, severity, onPress }) => {
  const severityColors = {
    high: SEMANTIC.error,
    medium: SEMANTIC.warning,
    low: BRAND.primary,
  };

  const flagIcons = {
    LOW_RECOVERY: 'bed-outline',
    DEHYDRATED: 'water-outline',
    HIGH_STRESS: 'pulse-outline',
    POST_WORKOUT: 'barbell-outline',
    LOW_MOOD: 'happy-outline',
    LOW_ENERGY: 'flash-outline',
    POOR_SLEEP: 'moon-outline',
    NEW_USER: 'sparkles-outline',
    OPTIMAL_STATE: 'star-outline',
  };

  const flagLabels = {
    LOW_RECOVERY: 'Recovery',
    DEHYDRATED: 'Hydration',
    HIGH_STRESS: 'Stress',
    POST_WORKOUT: 'Post-Workout',
    LOW_MOOD: 'Mood',
    LOW_ENERGY: 'Energy',
    POOR_SLEEP: 'Sleep',
    NEW_USER: 'Welcome',
    OPTIMAL_STATE: 'Peak',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.flagBadge, { backgroundColor: severityColors[severity] + '20' }]}
      activeOpacity={0.7}
    >
      <Ionicons name={flagIcons[flag] || 'alert-circle-outline'} size={14} color={severityColors[severity]} />
      <Text style={[styles.flagBadgeText, { color: severityColors[severity] }]}>
        {flagLabels[flag] || flag}
      </Text>
    </TouchableOpacity>
  );
};

export default function WellnessNarrativeCard({
  wellnessScore = 50,
  recoveryScore = 50,
  headline = 'Balanced',
  emoji = '💚',
  narrative = null,
  flags = [],
  guidance = [],
  correlations = [],
  conflictResolution = null,
  onFlagPress,
  onActionPress,
  onLearnMore,
  style,
}) {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpanded = useCallback(() => {
    Animated.spring(animation, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animation]);

  // Determine score colors
  const wellnessColor = wellnessScore >= 70 ? SEMANTIC.success :
                        wellnessScore >= 50 ? SEMANTIC.warning : SEMANTIC.error;
  const recoveryColor = recoveryScore >= 70 ? SEMANTIC.success :
                        recoveryScore >= 50 ? SEMANTIC.warning : SEMANTIC.error;

  // Get gradient based on wellness state
  const gradientColors = wellnessScore >= 70
    ? ['#E8F5E9', '#C8E6C9'] // Green tint
    : wellnessScore >= 50
    ? ['#FFF8E1', '#FFECB3'] // Yellow tint
    : ['#FFEBEE', '#FFCDD2']; // Red tint

  return (
    <View style={[styles.container, style]}>
      {/* Main Card */}
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        {/* Header: Scores + Headline */}
        <View style={styles.header}>
          <View style={styles.scoresContainer}>
            <View style={styles.scoreItem}>
              <ScoreRing score={wellnessScore} color={wellnessColor} size={56} />
              <Text style={styles.scoreLabel}>Wellness</Text>
            </View>
            <View style={styles.scoreItem}>
              <ScoreRing score={recoveryScore} color={recoveryColor} size={56} />
              <Text style={styles.scoreLabel}>Recovery</Text>
            </View>
          </View>
          <View style={styles.headlineContainer}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.headline}>{headline}</Text>
          </View>
        </View>

        {/* Narrative Summary */}
        {narrative?.summary && (
          <View style={styles.narrativeContainer}>
            <Text style={styles.narrativeText}>{narrative.summary}</Text>
          </View>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <View style={styles.flagsContainer}>
            {flags.slice(0, 3).map((flag, index) => (
              <FlagBadge
                key={index}
                flag={flag.flag}
                severity={flag.severity}
                onPress={() => onFlagPress?.(flag)}
              />
            ))}
          </View>
        )}

        {/* Primary Action */}
        {flags.length > 0 && flags[0].foodImplication && (
          <TouchableOpacity
            style={styles.actionContainer}
            onPress={() => onActionPress?.(flags[0])}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="restaurant-outline" size={20} color={BRAND.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionLabel}>Recommended Action</Text>
              <Text style={styles.actionText} numberOfLines={2}>
                {flags[0].foodImplication}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}

        {/* Expand/Collapse Button */}
        {(correlations.length > 0 || guidance.length > 1 || conflictResolution) && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={toggleExpanded}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonText}>
              {expanded ? 'Show Less' : 'See More Insights'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={BRAND.primary}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Expanded Content */}
      {expanded && (
        <Animated.View style={[styles.expandedContent]}>
          {/* Conflict Resolution */}
          {conflictResolution && (
            <View style={styles.conflictContainer}>
              <View style={styles.conflictHeader}>
                <Ionicons name="git-merge-outline" size={18} color={SEMANTIC.warning} />
                <Text style={styles.conflictTitle}>Conflicting Signals Detected</Text>
              </View>
              <Text style={styles.conflictText}>{conflictResolution.conflict}</Text>
              <Text style={styles.conflictResolution}>
                Resolution: {conflictResolution.adjustedGuidance}
              </Text>
            </View>
          )}

          {/* Correlations */}
          {correlations.length > 0 && (
            <View style={styles.correlationsContainer}>
              <Text style={styles.sectionTitle}>Patterns We've Noticed</Text>
              {correlations.map((corr, index) => (
                <View key={index} style={styles.correlationItem}>
                  <Ionicons name="analytics-outline" size={16} color={BRAND.primary} />
                  <Text style={styles.correlationText}>{corr.insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Additional Guidance */}
          {guidance.length > 1 && (
            <View style={styles.guidanceContainer}>
              <Text style={styles.sectionTitle}>More Guidance</Text>
              {guidance.slice(1).map((g, index) => (
                <View key={index} style={styles.guidanceItem}>
                  <View style={[styles.guidancePriority, {
                    backgroundColor: g.priority === 'high' ? SEMANTIC.error + '30' :
                                     g.priority === 'medium' ? SEMANTIC.warning + '30' :
                                     BRAND.primary + '20'
                  }]}>
                    <Text style={[styles.guidancePriorityText, {
                      color: g.priority === 'high' ? SEMANTIC.error :
                             g.priority === 'medium' ? SEMANTIC.warning :
                             BRAND.primary
                    }]}>
                      {g.priority === 'high' ? 'High' : g.priority === 'medium' ? 'Med' : 'Low'}
                    </Text>
                  </View>
                  <Text style={styles.guidanceText}>{g.guidance || g.action}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Learn More Button */}
          {onLearnMore && (
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={onLearnMore}
              activeOpacity={0.7}
            >
              <Text style={styles.learnMoreText}>Learn More About Your Wellness</Text>
              <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: SURFACES.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoresContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  scoreRingBackground: {
    position: 'absolute',
    borderColor: '#E0E0E0',
  },
  scoreRingForeground: {
    position: 'absolute',
  },
  scoreRingText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  headlineContainer: {
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  headline: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: 4,
  },
  narrativeContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  narrativeText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  flagBadgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    fontFamily: TYPOGRAPHY.family.medium,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 13,
    color: TEXT.primary,
    fontFamily: TYPOGRAPHY.family.medium,
    lineHeight: 18,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 13,
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  expandedContent: {
    padding: 16,
    backgroundColor: SURFACES.elevated,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  conflictContainer: {
    backgroundColor: SEMANTIC.warning + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.warning,
  },
  conflictText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: 6,
  },
  conflictResolution: {
    fontSize: 12,
    color: TEXT.primary,
    fontFamily: TYPOGRAPHY.family.medium,
    fontStyle: 'italic',
  },
  correlationsContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 8,
  },
  correlationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  correlationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  guidanceContainer: {
    marginBottom: 12,
  },
  guidanceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  guidancePriority: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guidancePriorityText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  guidanceText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  learnMoreText: {
    fontSize: 14,
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
