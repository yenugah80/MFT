/**
 * PersonaCard - Unified persona display component
 *
 * Consolidates duplicate implementations from:
 * - activity.jsx (ActivityPersonaCard)
 * - hydration.jsx (HydrationPersonaCard)
 *
 * Design Principles:
 * - Visual hierarchy with icon, title, description
 * - Gradient accent based on persona type
 * - Action button for recommendations
 * - WCAG 2.1 AA compliant
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// Persona type configurations
const PERSONA_CONFIGS = {
  // Activity Personas
  'Sedentary': {
    icon: 'bed-outline',
    gradient: ['#94A3B8', '#CBD5E1'],
    accentColor: '#64748B',
    encouragement: 'Every step counts. Start small!',
  },
  'Lightly Active': {
    icon: 'walk-outline',
    gradient: ['#22D3EE', '#67E8F9'],
    accentColor: '#06B6D4',
    encouragement: 'Great foundation! Keep moving.',
  },
  'Moderately Active': {
    icon: 'bicycle-outline',
    gradient: ['#34D399', '#6EE7B7'],
    accentColor: '#10B981',
    encouragement: 'Impressive consistency!',
  },
  'Active': {
    icon: 'fitness-outline',
    gradient: VIBRANT_WELLNESS.activity.gradient,
    accentColor: VIBRANT_WELLNESS.activity.solid,
    encouragement: 'You\'re crushing it!',
  },
  'Very Active': {
    icon: 'trophy-outline',
    gradient: ['#FBBF24', '#FCD34D'],
    accentColor: '#F59E0B',
    encouragement: 'Elite performance mode!',
  },

  // Hydration Personas
  'Dehydrated': {
    icon: 'water-outline',
    gradient: ['#F87171', '#FCA5A5'],
    accentColor: '#EF4444',
    encouragement: 'Let\'s boost your hydration!',
  },
  'Light Drinker': {
    icon: 'water-outline',
    gradient: ['#60A5FA', '#93C5FD'],
    accentColor: '#3B82F6',
    encouragement: 'Good start, keep sipping!',
  },
  'Adequate': {
    icon: 'water',
    gradient: VIBRANT_WELLNESS.hydration.gradient,
    accentColor: VIBRANT_WELLNESS.hydration.solid,
    encouragement: 'Well hydrated!',
  },
  'Well Hydrated': {
    icon: 'water',
    gradient: ['#2DD4BF', '#5EEAD4'],
    accentColor: '#14B8A6',
    encouragement: 'Hydration champion!',
  },

  // Mood Personas
  'Stressed': {
    icon: 'thunderstorm-outline',
    gradient: ['#A78BFA', '#C4B5FD'],
    accentColor: '#8B5CF6',
    encouragement: 'Take a breath. You\'ve got this.',
  },
  'Balanced': {
    icon: 'happy-outline',
    gradient: VIBRANT_WELLNESS.mood.gradient,
    accentColor: VIBRANT_WELLNESS.mood.solid,
    encouragement: 'Great emotional balance!',
  },
  'Thriving': {
    icon: 'sunny-outline',
    gradient: ['#FBBF24', '#FDE68A'],
    accentColor: '#F59E0B',
    encouragement: 'You\'re radiating positivity!',
  },

  // Nutrition Personas
  'Needs Improvement': {
    icon: 'nutrition-outline',
    gradient: ['#F87171', '#FCA5A5'],
    accentColor: '#EF4444',
    encouragement: 'Small changes, big impact!',
  },
  'On Track': {
    icon: 'nutrition',
    gradient: VIBRANT_WELLNESS.nutrition.gradient,
    accentColor: VIBRANT_WELLNESS.nutrition.solid,
    encouragement: 'Nourishing your body well!',
  },
  'Optimal': {
    icon: 'ribbon-outline',
    gradient: ['#10B981', '#34D399'],
    accentColor: '#059669',
    encouragement: 'Nutrition master!',
  },

  // Default fallback
  'default': {
    icon: 'person-outline',
    gradient: ['#6B4EFF', '#8B6EFF'],
    accentColor: '#6B4EFF',
    encouragement: 'Keep tracking to discover your patterns!',
  },
};

export default function PersonaCard({
  title,
  description,
  recommendation,
  confidence,
  icon,
  gradient,
  accentColor,
  onAction,
  actionLabel = 'See Recommendations',
  category,
  style,
}) {
  // Get config from title or use provided values
  const config = PERSONA_CONFIGS[title] || PERSONA_CONFIGS.default;
  const finalIcon = icon || config.icon;
  const finalGradient = gradient || config.gradient;
  const finalAccent = accentColor || config.accentColor;

  return (
    <View style={[styles.container, CARD_SYSTEM.standard, style]}>
      {/* Gradient Accent Bar */}
      <LinearGradient
        colors={finalGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${finalAccent}15` }]}>
            <Ionicons name={finalIcon} size={28} color={finalAccent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {confidence !== undefined && (
              <View style={styles.confidenceRow}>
                <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(confidence) }]} />
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}% confidence
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{description || config.encouragement}</Text>

        {/* Recommendation */}
        {recommendation && (
          <View style={styles.recommendationContainer}>
            <Ionicons name="bulb-outline" size={16} color={finalAccent} />
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        )}

        {/* Action Button */}
        {onAction && (
          <TouchableOpacity
            onPress={onAction}
            style={styles.actionButton}
            accessibilityLabel={actionLabel}
          >
            <LinearGradient
              colors={finalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={16} color={TEXT.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Compact persona badge for inline display
 */
export function PersonaBadge({
  title,
  icon,
  gradient,
  accentColor,
  style,
}) {
  const config = PERSONA_CONFIGS[title] || PERSONA_CONFIGS.default;
  const finalIcon = icon || config.icon;
  const finalGradient = gradient || config.gradient;
  const finalAccent = accentColor || config.accentColor;

  return (
    <View style={[styles.badge, style]}>
      <LinearGradient
        colors={[`${finalAccent}20`, `${finalAccent}10`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badgeGradient}
      >
        <Ionicons name={finalIcon} size={14} color={finalAccent} />
        <Text style={[styles.badgeText, { color: finalAccent }]}>{title}</Text>
      </LinearGradient>
    </View>
  );
}

/**
 * Persona progress indicator
 */
export function PersonaProgress({
  currentPersona,
  nextPersona,
  progress,
  gradient,
  style,
}) {
  const currentConfig = PERSONA_CONFIGS[currentPersona] || PERSONA_CONFIGS.default;
  const nextConfig = PERSONA_CONFIGS[nextPersona] || PERSONA_CONFIGS.default;

  return (
    <View style={[styles.progressContainer, style]}>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCurrent}>{currentPersona}</Text>
        <Text style={styles.progressNext}>{nextPersona}</Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={gradient || currentConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
      <Text style={styles.progressText}>
        {Math.round(progress * 100)}% to {nextPersona}
      </Text>
    </View>
  );
}

/**
 * Get confidence indicator color
 */
function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#10B981'; // High - green
  if (confidence >= 0.5) return '#F59E0B'; // Medium - amber
  return '#94A3B8'; // Low - gray
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    padding: 0,
  },
  accentBar: {
    height: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  content: {
    padding: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  description: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    lineHeight: 22,
    marginBottom: SPACING[3],
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.background.tertiary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  recommendationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // Badge styles
  badge: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    gap: SPACING[1],
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Progress styles
  progressContainer: {
    padding: SPACING[3],
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  progressCurrent: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  progressNext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  progressBar: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});
