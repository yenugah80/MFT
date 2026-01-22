/**
 * DailyIntelligenceCard - World Class Redesign
 *
 * Design Philosophy:
 * - ONE clear message - what matters right now
 * - ZERO jargon - no ML metrics, no internal types
 * - EMOTIONAL design - celebrate wins, gentle nudges
 * - ACTIONABLE - always one clear next step
 *
 * Inspired by: Apple Health, Oura Ring, Headspace
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  SEMANTIC,
} from '../../constants/premiumTheme';
import { getInsightColor } from '../../constants/unifiedColors';
import { getDecisionDisplay } from '../../constants/iconSystem';

// Premium gradient for action buttons
const PREMIUM_GRADIENT = [BRAND.primary, BRAND.secondary];

/**
 * InsightBadge - Small colored indicator
 */
function InsightBadge({ type }) {
  const display = getDecisionDisplay(type);
  const colorScheme = getInsightColor(type);

  return (
    <View style={[styles.badge, { backgroundColor: colorScheme.bg }]}>
      <Ionicons name={display.icon} size={14} color={colorScheme.color} />
      <Text style={[styles.badgeText, { color: colorScheme.color }]}>
        {display.label}
      </Text>
    </View>
  );
}

/**
 * ActionButton - Clean, tappable action
 */
function ActionButton({ icon, label, onPress }) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={PREMIUM_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.actionGradient}
      >
        <Ionicons name={icon} size={18} color="#FFFFFF" />
        <Text style={styles.actionLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * Main Card Component
 */
export function DailyIntelligenceCard({
  type = 'SILENT',
  headline,
  subtitle,
  actions = [],
  onAction,
}) {
  // SILENT type = everything is on track, show minimal UI
  if (type === 'SILENT' || !headline) {
    return (
      <View style={styles.quietContainer}>
        <View style={styles.quietContent}>
          <View style={styles.quietIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={SEMANTIC.success}
            />
          </View>
          <View style={styles.quietText}>
            <Text style={styles.quietTitle}>You're on track</Text>
            <Text style={styles.quietSubtitle}>
              Keep doing what you're doing
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const colorScheme = getInsightColor(type);
  const primaryAction = actions[0];

  const handleActionPress = () => {
    if (primaryAction) {
      onAction?.(primaryAction);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: colorScheme.color }]} />

      <View style={styles.content}>
        {/* Header: Badge */}
        <InsightBadge type={type} />

        {/* Main Message */}
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>

        {/* Supporting Text */}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}

        {/* Primary Action */}
        {primaryAction && (
          <ActionButton
            icon={primaryAction.icon || 'arrow-forward-outline'}
            label={primaryAction.text || 'Learn more'}
            onPress={handleActionPress}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SURFACES.card.border,

    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Left accent indicator
  accentBar: {
    width: 4,
  },

  // Content area
  content: {
    flex: 1,
    padding: SPACING[4],
    gap: SPACING[3],
  },

  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Typography
  headline: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Action button
  actionButton: {
    marginTop: SPACING[2],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  actionLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },

  // Quiet state (everything on track)
  quietContainer: {
    backgroundColor: '#10B98115', // Success green with transparency
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: '#10B98130',

    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quietContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  quietIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACES.card.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietText: {
    flex: 1,
  },
  quietTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  quietSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
});

export default DailyIntelligenceCard;
