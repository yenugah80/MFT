/**
 * CorrelationCard - World Class Redesign
 *
 * Design Philosophy:
 * - VISUAL FIRST - show the pattern, not describe it
 * - ONE tap = ONE action - no modal inception
 * - 3 pieces of info MAX in compact view
 * - Expandable details are OPTIONAL, not required
 *
 * Inspired by: Oura Ring insights, Apple Health trends
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SPACING, RADIUS, TYPOGRAPHY, TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { getDomainColor } from '../../constants/unifiedColors';
import { getDomainIcon, PATTERN_ICONS } from '../../constants/iconSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Format domain name: snake_case → Title Case
 * "Goal_compliance" → "Goal Compliance"
 */
function formatDomainName(domain) {
  if (!domain) return '';
  return domain
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * DomainPill - Small colored tag for affected areas
 */
function DomainPill({ domain }) {
  const { color, bg } = getDomainColor(domain);
  const icon = getDomainIcon(domain);

  return (
    <View style={[styles.domainPill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.domainText, { color }]}>{formatDomainName(domain)}</Text>
    </View>
  );
}

/**
 * StrengthIndicator - Visual dots showing pattern strength
 */
function StrengthIndicator({ strength = 0 }) {
  // Convert 0-1 to 1-5 dots
  const filledDots = Math.min(Math.round(strength * 5), 5);

  return (
    <View style={styles.strengthContainer}>
      {[1, 2, 3, 4, 5].map((dot) => (
        <View
          key={dot}
          style={[
            styles.strengthDot,
            dot <= filledDots && styles.strengthDotFilled,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Main CorrelationCard Component
 */
export function CorrelationCard({
  id,
  pattern,
  confidence = 0,
  occurrences = 0,
  affectedDomains = [],
  whatHappens,
  onDismiss,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Get primary domain for accent color
  const primaryDomain = affectedDomains[0] || 'energy';
  const { color: accentColor } = getDomainColor(primaryDomain);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss?.(id, 'not_relevant');
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={pattern}
        accessibilityHint={isExpanded ? 'Tap to collapse' : 'Tap to see details'}
      >
        {/* Left accent */}
        <View style={[styles.accent, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Main row: Icon + Pattern + Expand */}
          <View style={styles.mainRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
              <Ionicons
                name={PATTERN_ICONS.correlation}
                size={20}
                color={accentColor}
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.pattern} numberOfLines={2}>
                {pattern}
              </Text>
              <View style={styles.metaRow}>
                <StrengthIndicator strength={confidence} />
                <Text style={styles.occurrences}>
                  {occurrences}× observed
                </Text>
              </View>
            </View>

            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </View>

          {/* Domain pills */}
          {affectedDomains.length > 0 && (
            <View style={styles.domainsRow}>
              {affectedDomains.slice(0, 3).map((domain) => (
                <DomainPill key={domain} domain={domain} />
              ))}
            </View>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              {/* What happens explanation */}
              {whatHappens && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>{whatHappens}</Text>
                </View>
              )}

              {/* Action row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleDismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss this pattern"
                >
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color={TEXT.secondary}
                  />
                  <Text style={styles.dismissText}>Not relevant</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[3],
    overflow: 'hidden',
    flexDirection: 'row',

    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  accent: {
    width: 4,
  },

  content: {
    flex: 1,
    padding: SPACING[4],
    gap: SPACING[3],
  },

  // Main row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textContainer: {
    flex: 1,
    gap: SPACING[1],
  },

  pattern: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    lineHeight: 22,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginTop: SPACING[1],
  },

  // Strength dots
  strengthContainer: {
    flexDirection: 'row',
    gap: 4,
  },

  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SURFACES.card.border,
  },

  strengthDotFilled: {
    backgroundColor: BRAND.primary,
  },

  occurrences: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Domain pills
  domainsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },

  domainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },

  domainText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    textTransform: 'capitalize',
  },

  // Expanded content
  expandedContent: {
    paddingTop: SPACING[2],
    gap: SPACING[3],
  },

  explanationBox: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },

  explanationText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },

  dismissText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});

export default CorrelationCard;
