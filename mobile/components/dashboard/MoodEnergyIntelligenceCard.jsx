/**
 * MoodEnergyIntelligenceCard - Tier 5: Dedicated Deep Dive for Mood & Energy
 *
 * Premium card showing:
 * - Current mood and energy levels
 * - Food-mood correlations (THE KILLER FEATURE)
 * - Pattern discoveries
 * - Weekly trends
 *
 * Design: Premium glassmorphic card highlighting unique insights
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

/**
 * Get mood icon and color
 */
function getMoodDisplay(score) {
  if (score >= 8) return { icon: 'happy', color: '#10B981', label: 'Great' };
  if (score >= 6) return { icon: 'happy-outline', color: '#3B82F6', label: 'Good' };
  if (score >= 4) return { icon: 'sad-outline', color: '#F59E0B', label: 'Okay' };
  return { icon: 'sad', color: '#EF4444', label: 'Low' };
}

/**
 * Generate food-mood pattern insight (KILLER FEATURE)
 */
function generateMoodPattern({ moodLogs, foodLogs, trends }) {
  // Check for breakfast-mood correlation
  if (trends?.breakfastMoodCorrelation > 0.3) {
    return {
      type: 'pattern_discovered',
      icon: 'bulb',
      title: 'PATTERN DISCOVERED',
      message: `Your mood is ${Math.round(trends.breakfastMoodCorrelation * 100)}% higher on days you eat breakfast before 9am`,
      confidence: 'High',
      sample: `Based on ${trends.breakfastDaysAnalyzed || 14} days of data`,
    };
  }

  // Check for lunch-energy correlation
  if (trends?.lunchEnergyCorrelation > 0.25) {
    return {
      type: 'pattern_discovered',
      icon: 'flash',
      title: 'ENERGY PATTERN',
      message: 'Your energy drops at 5pm when you skip lunch',
      confidence: 'Medium',
      sample: 'This pattern appeared 4/7 days last week',
    };
  }

  // Check for protein-mood correlation
  if (trends?.proteinMoodCorrelation > 0.2) {
    return {
      type: 'pattern_discovered',
      icon: 'trending-up',
      title: 'NUTRITION LINK',
      message: 'Higher protein intake correlates with better mood scores',
      confidence: 'Medium',
      sample: 'Discovered over the past 2 weeks',
    };
  }

  // Default: Encourage more logging
  return {
    type: 'info',
    icon: 'information-circle',
    title: 'UNLOCK INSIGHTS',
    message: 'Log meals and mood for 7 days to discover your patterns',
    confidence: null,
    sample: null,
  };
}

export default function MoodEnergyIntelligenceCard({
  moodLogs = [],
  foodLogs = [],
  trends = {},
  onViewFullInsights,
  onLogMood,
}) {
  const [expanded, setExpanded] = useState(false);

  // Get latest mood
  const latestMood = moodLogs?.[0];
  const currentScore = latestMood?.score || latestMood?.moodScore || 5;
  const currentEnergy = latestMood?.energy || 5;
  const moodDisplay = getMoodDisplay(currentScore);
  const energyDisplay = getMoodDisplay(currentEnergy);

  // Calculate weekly average
  const moodSum = moodLogs?.reduce((sum, log) => sum + (Number(log.score || log.moodScore) || 5), 0) || 0;
  const moodCount = moodLogs?.length || 1;
  const weekAvg = Number(moodSum / moodCount) || 5;

  const pattern = generateMoodPattern({ moodLogs, foodLogs, trends });

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleLogMood = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLogMood) {
      onLogMood();
    }
  };

  const handleViewFull = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewFullInsights) {
      onViewFullInsights();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleToggle}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="brain" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>MOOD & ENERGY INTELLIGENCE</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </View>

        {/* Current Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Ionicons name={moodDisplay.icon} size={32} color={moodDisplay.color} />
            <Text style={[styles.statusLabel, { color: moodDisplay.color }]}>
              {moodDisplay.label}
            </Text>
            <Text style={styles.statusValue}>{currentScore}/10</Text>
            <Text style={styles.statusSubtext}>Mood</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Ionicons name={energyDisplay.icon} size={32} color={energyDisplay.color} />
            <Text style={[styles.statusLabel, { color: energyDisplay.color }]}>
              {energyDisplay.label}
            </Text>
            <Text style={styles.statusValue}>{currentEnergy}/10</Text>
            <Text style={styles.statusSubtext}>Energy</Text>
          </View>
        </View>

        {/* Expandable Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Pattern Discovery (KILLER FEATURE) */}
            <View style={[styles.patternBox, pattern.type === 'pattern_discovered' && styles.patternHighlight]}>
              <View style={styles.patternHeader}>
                <Ionicons
                  name={pattern.icon}
                  size={20}
                  color={pattern.type === 'pattern_discovered' ? '#F59E0B' : BRAND.primary}
                />
                <Text style={[styles.patternTitle, pattern.type === 'pattern_discovered' && styles.patternTitleHighlight]}>
                  {pattern.title}
                </Text>
                {pattern.confidence && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>{pattern.confidence} confidence</Text>
                  </View>
                )}
              </View>
              <Text style={styles.patternMessage}>{pattern.message}</Text>
              {pattern.sample && (
                <Text style={styles.patternSample}>{pattern.sample}</Text>
              )}
            </View>

            {/* Weekly Trend */}
            <View style={styles.trendSection}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.trendRow}>
                <View style={styles.trendItem}>
                  <Text style={styles.trendValue}>{weekAvg.toFixed(1)}/10</Text>
                  <Text style={styles.trendLabel}>Average mood</Text>
                </View>
                <View style={styles.trendDivider} />
                <View style={styles.trendItem}>
                  <View style={styles.trendBadge}>
                    {weekAvg > 6.5 ? (
                      <Ionicons name="trending-up" size={16} color="#10B981" />
                    ) : weekAvg > 5 ? (
                      <Ionicons name="remove" size={16} color="#F59E0B" />
                    ) : (
                      <Ionicons name="trending-down" size={16} color="#EF4444" />
                    )}
                    <Text
                      style={[
                        styles.trendChangeText,
                        {
                          color: weekAvg > 6.5 ? '#10B981' : weekAvg > 5 ? '#F59E0B' : '#EF4444',
                        },
                      ]}
                    >
                      {weekAvg > 6.5 ? 'Improving' : weekAvg > 5 ? 'Stable' : 'Declining'}
                    </Text>
                  </View>
                  <Text style={styles.trendLabel}>Trend</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogMood}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="happy" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Log Mood</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleViewFull}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>View Full Insights</Text>
                <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: SURFACES.card.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
    marginTop: 2,
  },
  statusSubtext: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 60,
    backgroundColor: SURFACES.card.border,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  patternBox: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  patternHighlight: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  patternTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  patternTitleHighlight: {
    color: '#D97706',
  },
  confidenceBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  patternMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  patternSample: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  trendSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: SPACING.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  trendLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  trendDivider: {
    width: 1,
    height: 40,
    backgroundColor: SURFACES.card.border,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  trendChangeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actions: {
    gap: SPACING.sm,
  },
  primaryButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: SPACING.xs,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginRight: 6,
  },
});
