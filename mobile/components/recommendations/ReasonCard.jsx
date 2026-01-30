/**
 * ReasonCard - Story-First 5W2H Explanation Component
 *
 * Design Philosophy:
 * - Feels like a "decision receipt", not a questionnaire
 * - Story-first: narrative before structure
 * - 5W2H lives in logic/data, surfaces as context + rationale
 * - Default: 2-3 key lines (What + Why summary)
 * - Expanded: narrative paragraph + compact chips
 *
 * Layout Pattern:
 * ┌─────────────────────────────────────────────────────┐
 * │ "Why this?" ──────────────────── [Evidence badge]  │
 * │ One-sentence summary (What + Why fused)            │
 * │ ────────────────────────────────────────────────── │
 * │ [Expanded: Narrative paragraph]                    │
 * │                                                    │
 * │ [Goal & Action]                                    │
 * │ 🎯 What chip    🔧 How chip                        │
 * │                                                    │
 * │ [Context]                                          │
 * │ 👤 Who chip    📍 Where chip    ⏰ When chip       │
 * │                                                    │
 * │ [Impact]                                           │
 * │ 💡 Why chip    📊 How much chip                    │
 * └─────────────────────────────────────────────────── │
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
// Clipboard with graceful fallback
let Clipboard = null;
try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  // expo-clipboard not available - will fallback gracefully
}

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// CHIP ICONS - Subtle, not prominent
// ============================================================================

const CHIP_CONFIG = {
  what: { icon: 'flag-outline', label: 'What' },
  why: { icon: 'bulb-outline', label: 'Why' },
  who: { icon: 'person-outline', label: 'Who' },
  where: { icon: 'location-outline', label: 'Where' },
  when: { icon: 'time-outline', label: 'When' },
  how: { icon: 'construct-outline', label: 'How' },
  howMuch: { icon: 'trending-up-outline', label: 'Impact' },
};

// ============================================================================
// EVIDENCE BADGE
// ============================================================================

function EvidenceBadge({ type = 'personalized' }) {
  const badges = {
    personalized: { label: 'Personalized', color: PREMIUM_COLORS.brand.primary },
    evidenceBased: { label: 'Evidence-based', color: PREMIUM_COLORS.semantic.success.primary },
    correlation: { label: 'Pattern detected', color: PREMIUM_COLORS.functional.insights.primary },
  };

  const badge = badges[type] || badges.personalized;

  return (
    <View style={[styles.badge, { backgroundColor: `${badge.color}15` }]}>
      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

// ============================================================================
// REASON CHIP - Compact, icon + short text
// ============================================================================

function ReasonChip({ type, text, isAccent = false }) {
  const config = CHIP_CONFIG[type];
  if (!text || !config) return null;

  // Truncate to max 40 chars for chips
  const displayText = text.length > 40 ? `${text.slice(0, 37)}...` : text;

  return (
    <View style={[styles.chip, isAccent && styles.chipAccent]}>
      <Ionicons
        name={config.icon}
        size={14}
        color={isAccent ? PREMIUM_COLORS.brand.primary : PREMIUM_COLORS.text.tertiary}
      />
      <View style={styles.chipContent}>
        <Text style={styles.chipLabel}>{config.label}</Text>
        <Text style={[styles.chipText, isAccent && styles.chipTextAccent]} numberOfLines={2}>
          {displayText}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// CHIP ROW - Horizontal group of chips
// ============================================================================

function ChipRow({ chips, accentKey }) {
  return (
    <View style={styles.chipRow}>
      {chips.map(({ type, text }) => (
        <ReasonChip
          key={type}
          type={type}
          text={text}
          isAccent={type === accentKey}
        />
      ))}
    </View>
  );
}

// ============================================================================
// MAIN REASON CARD COMPONENT
// ============================================================================

export default function ReasonCard({
  // Summary (What + Why fused) - shown in collapsed state
  summary,
  // Narrative paragraph - shown in expanded state
  narrative,
  // 5W2H chips content
  chips = {},
  // Badge type
  evidenceType = 'personalized',
  // Confidence score (0-100)
  confidence,
  // Data points count
  dataPoints,
  // Source citation
  source,
  // Style overrides
  style,
  // Initially expanded
  defaultExpanded = false,
  // Callbacks
  onExpand,
  onCopyReasoning,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Toggle expansion with animation
  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });

    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();

    setIsExpanded(!isExpanded);
    onExpand?.(!isExpanded);
  }, [isExpanded, rotateAnim, onExpand]);

  // Copy reasoning as text
  const handleCopyReasoning = useCallback(async () => {
    const reasoningText = [
      `Summary: ${summary}`,
      '',
      narrative,
      '',
      chips.what && `What: ${chips.what}`,
      chips.why && `Why: ${chips.why}`,
      chips.how && `How: ${chips.how}`,
      chips.who && `Who: ${chips.who}`,
      chips.where && `Where: ${chips.where}`,
      chips.when && `When: ${chips.when}`,
      chips.howMuch && `Impact: ${chips.howMuch}`,
      '',
      source && `Source: ${source}`,
      confidence && `Confidence: ${confidence}%`,
    ].filter(Boolean).join('\n');

    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(reasoningText);
      }
    } catch (e) {
      // Clipboard not available - continue with callback
      console.log('[ReasonCard] Clipboard not available:', e.message);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopyReasoning?.(reasoningText);
  }, [summary, narrative, chips, source, confidence, onCopyReasoning]);

  // Chevron rotation
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Organize chips into rows
  const goalActionChips = [
    { type: 'what', text: chips.what },
    { type: 'how', text: chips.how },
  ].filter(c => c.text);

  const contextChips = [
    { type: 'who', text: chips.who },
    { type: 'where', text: chips.where },
    { type: 'when', text: chips.when },
  ].filter(c => c.text);

  const impactChips = [
    { type: 'why', text: chips.why },
    { type: 'howMuch', text: chips.howMuch },
  ].filter(c => c.text);

  return (
    <View style={[styles.container, style]}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Collapse reasoning' : 'Expand reasoning'}
        accessibilityHint="Shows detailed explanation for this recommendation"
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={PREMIUM_COLORS.brand.primary}
            />
          </View>
          <Text style={styles.headerTitle}>Why this?</Text>
        </View>

        <View style={styles.headerRight}>
          <EvidenceBadge type={evidenceType} />
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons
              name="chevron-down"
              size={18}
              color={PREMIUM_COLORS.text.tertiary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Summary - Always visible */}
      <Text style={styles.summary}>{summary}</Text>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Narrative Paragraph */}
          {narrative && (
            <View style={styles.narrativeSection}>
              <Text style={styles.narrative}>{narrative}</Text>
            </View>
          )}

          {/* Chips Section */}
          <View style={styles.chipsSection}>
            {/* Goal & Action Row */}
            {goalActionChips.length > 0 && (
              <View style={styles.chipGroup}>
                <Text style={styles.chipGroupLabel}>Goal & Action</Text>
                <ChipRow chips={goalActionChips} />
              </View>
            )}

            {/* Context Row */}
            {contextChips.length > 0 && (
              <View style={styles.chipGroup}>
                <Text style={styles.chipGroupLabel}>Context</Text>
                <ChipRow chips={contextChips} />
              </View>
            )}

            {/* Impact Row */}
            {impactChips.length > 0 && (
              <View style={styles.chipGroup}>
                <Text style={styles.chipGroupLabel}>Impact</Text>
                <ChipRow chips={impactChips} accentKey="howMuch" />
              </View>
            )}
          </View>

          {/* Footer - Confidence & Source */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {confidence && (
                <View style={styles.confidenceRow}>
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={PREMIUM_COLORS.text.muted}
                  />
                  <Text style={styles.footerText}>
                    {confidence}% confident
                    {dataPoints && ` • ${dataPoints} data points`}
                  </Text>
                </View>
              )}
              {source && (
                <Text style={styles.sourceText}>Source: {source}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyReasoning}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="copy-outline" size={16} color={PREMIUM_COLORS.text.muted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: `${PREMIUM_COLORS.brand.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.secondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },

  // Badge
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[0.5],
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Summary
  summary: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.size.body * 1.4,
  },

  // Expanded Content
  expandedContent: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },

  // Narrative
  narrativeSection: {
    marginBottom: SPACING[4],
  },
  narrative: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.subhead * 1.6,
  },

  // Chips Section
  chipsSection: {
    gap: SPACING[4],
  },
  chipGroup: {
    gap: SPACING[2],
  },
  chipGroupLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },

  // Individual Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[2.5],
    gap: SPACING[2],
    flex: 1,
    minWidth: 140,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  chipAccent: {
    backgroundColor: `${PREMIUM_COLORS.brand.primary}08`,
    borderColor: `${PREMIUM_COLORS.brand.primary}20`,
  },
  chipContent: {
    flex: 1,
  },
  chipLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginBottom: 2,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.3,
  },
  chipTextAccent: {
    color: PREMIUM_COLORS.brand.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },
  footerLeft: {
    flex: 1,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },
  sourceText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginTop: SPACING[1],
  },
  copyButton: {
    padding: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
  },
});
