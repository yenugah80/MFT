/**
 * CorrelationCard - Displays a discovered pattern with real evidence
 *
 * Shows:
 * - Pattern description with strength indicator
 * - Real evidence examples with dates
 * - Statistical comparison (with vs without)
 * - Confidence level and occurrence count
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const IMPACT_COLORS = {
  positive: { gradient: ['#10B981', '#34D399'], icon: 'trending-up', iconColor: '#10B981' },
  negative: { gradient: ['#EF4444', '#F87171'], icon: 'trending-down', iconColor: '#EF4444' },
  neutral: { gradient: ['#6B7280', '#9CA3AF'], icon: 'remove', iconColor: '#6B7280' },
};

const STRENGTH_LABELS = {
  strong: { label: 'Strong', color: '#10B981', min: 0.7 },
  moderate: { label: 'Moderate', color: '#F59E0B', min: 0.4 },
  weak: { label: 'Weak', color: '#6B7280', min: 0 },
};

const CONFIDENCE_LABELS = {
  high: { label: 'High confidence', color: '#10B981', min: 0.8 },
  medium: { label: 'Moderate confidence', color: '#F59E0B', min: 0.6 },
  low: { label: 'Limited data', color: '#6B7280', min: 0 },
};

export default function CorrelationCard({ correlation, onPress, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!correlation) return null;

  const {
    ruleName,
    signalA,
    signalB,
    strength = 0,
    confidence = 0,
    occurrences = 0,
    expectedOutcome,
    evidenceJson,
    healthImpactSeverity,
    affectedDomains = [],
    windowType,
  } = correlation;

  // Determine impact type
  const impactType = expectedOutcome?.toLowerCase().includes('improve') ||
    expectedOutcome?.toLowerCase().includes('better') ||
    expectedOutcome?.toLowerCase().includes('boost')
      ? 'positive'
      : expectedOutcome?.toLowerCase().includes('worse') ||
        expectedOutcome?.toLowerCase().includes('crash') ||
        expectedOutcome?.toLowerCase().includes('lower')
        ? 'negative'
        : 'neutral';

  const impact = IMPACT_COLORS[impactType];

  // Get strength label
  const strengthInfo = strength >= 0.7 ? STRENGTH_LABELS.strong :
    strength >= 0.4 ? STRENGTH_LABELS.moderate : STRENGTH_LABELS.weak;

  // Get confidence label
  const confidenceInfo = confidence >= 0.8 ? CONFIDENCE_LABELS.high :
    confidence >= 0.6 ? CONFIDENCE_LABELS.medium : CONFIDENCE_LABELS.low;

  // Parse evidence
  const evidence = evidenceJson || {};
  const examples = evidence.examples || [];
  const avgWith = evidence.avgMoodWith;
  const avgWithout = evidence.avgMoodWithout;
  const hasComparison = avgWith !== undefined && avgWithout !== undefined;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress(correlation);
    } else {
      setExpanded(!expanded);
    }
  };

  // Format the pattern statement
  const formatPatternStatement = () => {
    if (expectedOutcome) return expectedOutcome;
    return `${signalA} affects ${signalB}`;
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handlePress} activeOpacity={0.7}>
        <View style={[styles.impactIndicator, { backgroundColor: impact.iconColor + '20' }]}>
          <Ionicons name={impact.icon} size={16} color={impact.iconColor} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactStatement} numberOfLines={2}>
            {formatPatternStatement()}
          </Text>
          <View style={styles.compactMeta}>
            <Text style={[styles.strengthBadge, { color: strengthInfo.color }]}>
              {strengthInfo.label}
            </Text>
            <Text style={styles.occurrences}>{occurrences} times</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Header with strength indicator */}
      <View style={styles.header}>
        <LinearGradient
          colors={impact.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.strengthBar}
        >
          <View style={[styles.strengthFill, { width: `${strength * 100}%` }]} />
        </LinearGradient>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.impactBadge, { backgroundColor: impact.iconColor + '15' }]}>
              <Ionicons name={impact.icon} size={18} color={impact.iconColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                {strengthInfo.label} Pattern
              </Text>
              <Text style={styles.windowLabel}>{windowType || '7d'} window</Text>
            </View>
          </View>
          <View style={styles.confidenceBadge}>
            <Text style={[styles.confidenceText, { color: confidenceInfo.color }]}>
              {Math.round(confidence * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Main statement */}
      <Text style={styles.statement}>{formatPatternStatement()}</Text>

      {/* Evidence section */}
      {expanded && (
        <View style={styles.evidenceSection}>
          {/* Statistical comparison */}
          {hasComparison && (
            <View style={styles.comparisonContainer}>
              <Text style={styles.evidenceTitle}>Statistical Evidence</Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>With trigger</Text>
                  <Text style={[styles.comparisonValue, { color: impactType === 'positive' ? '#10B981' : '#EF4444' }]}>
                    {avgWith?.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.comparisonDivider} />
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Without</Text>
                  <Text style={styles.comparisonValue}>{avgWithout?.toFixed(1)}</Text>
                </View>
                <View style={styles.comparisonDivider} />
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Difference</Text>
                  <Text style={[styles.comparisonValue, { color: impact.iconColor }]}>
                    {avgWith > avgWithout ? '+' : ''}{(avgWith - avgWithout).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent examples */}
          {examples.length > 0 && (
            <View style={styles.examplesContainer}>
              <Text style={styles.evidenceTitle}>Recent Examples</Text>
              {examples.slice(0, 3).map((example, index) => (
                <View key={index} style={styles.exampleRow}>
                  <View style={styles.exampleDate}>
                    <Text style={styles.exampleDateText}>
                      {new Date(example.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.exampleContent}>
                    <Text style={styles.exampleTrigger}>{example.trigger}</Text>
                    <View style={styles.exampleOutcome}>
                      <Ionicons
                        name={example.outcomeDelta > 0 ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={example.outcomeDelta > 0 ? '#10B981' : '#EF4444'}
                      />
                      <Text style={[
                        styles.exampleOutcomeText,
                        { color: example.outcomeDelta > 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {example.outcome}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Affected domains */}
          {affectedDomains.length > 0 && (
            <View style={styles.domainsContainer}>
              <Text style={styles.evidenceTitle}>Affects</Text>
              <View style={styles.domainTags}>
                {affectedDomains.map((domain, index) => (
                  <View key={index} style={styles.domainTag}>
                    <Text style={styles.domainTagText}>{domain}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="analytics" size={14} color={TEXT.tertiary} />
          <Text style={styles.footerText}>{occurrences} occurrences</Text>
        </View>
        <View style={styles.footerRight}>
          <Text style={[styles.footerConfidence, { color: confidenceInfo.color }]}>
            {confidenceInfo.label}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={TEXT.tertiary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...CARD_SYSTEM.standard,
    padding: 0,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  strengthBar: {
    height: 4,
    width: '100%',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  impactBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: 2,
  },
  strengthLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  windowLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  confidenceBadge: {
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  statement: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 22,
    padding: SPACING[4],
    paddingTop: SPACING[3],
  },
  evidenceSection: {
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    padding: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
  },
  evidenceTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  comparisonContainer: {
    marginBottom: SPACING[4],
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  comparisonValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  comparisonDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider,
  },
  examplesContainer: {
    marginBottom: SPACING[3],
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    gap: SPACING[3],
  },
  exampleDate: {
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  exampleDateText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  exampleContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exampleTrigger: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
  },
  exampleOutcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  exampleOutcomeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  domainsContainer: {},
  domainTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  domainTag: {
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  domainTagText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  footerConfidence: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    gap: SPACING[3],
  },
  impactIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactStatement: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    lineHeight: 18,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[1],
  },
  strengthBadge: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  occurrences: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
});
