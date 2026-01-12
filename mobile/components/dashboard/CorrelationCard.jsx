import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { ProgressBar } from './ProgressBar';
import { DismissReasonSelector } from './DismissReasonSelector';

/**
 * CorrelationCard
 *
 * Displays a discovered pattern (correlation).
 * Compact view shows headline + confidence.
 * Tap to expand and see full details.
 *
 * @param {Object} props
 * @param {string} props.id - Unique correlation ID
 * @param {string} props.icon - Emoji icon (e.g., "🔗")
 * @param {string} props.headline - Pattern headline
 * @param {string} props.pattern - Pattern description (e.g., "High-NOVA meals → mood dips")
 * @param {number} props.confidence - Confidence 0-1
 * @param {number} props.occurrences - Times seen
 * @param {Array<string>} props.affectedDomains - ["mood", "energy"]
 * @param {string} props.whatHappens - "When you eat..."
 * @param {string} props.whyHappens - "Because blood sugar..."
 * @param {string} props.whenSeeIt - "Every time after..."
 * @param {string} props.healthImpact - "This affects your focus"
 * @param {Array<string>} props.recommendations - ["Add protein", "Include fiber"]
 * @param {Function} props.onDismiss - Called with (correlationId, reason)
 * @param {Function} [props.onKeepWatching] - Called when user keeps pattern active
 * @returns {JSX.Element}
 */
export function CorrelationCard({
  id,
  icon = '🔗',
  headline,
  pattern,
  confidence,
  occurrences,
  affectedDomains = [],
  whatHappens,
  whyHappens,
  whenSeeIt,
  healthImpact,
  recommendations = [],
  onDismiss,
  onKeepWatching,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);

  const handleDismiss = async (reason) => {
    setShowDismissModal(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.(id, reason);
  };

  const handleKeepWatching = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeepWatching?.(id);
  };

  return (
    <>
      {/* Compact View */}
      {!isExpanded && (
        <TouchableOpacity
          style={styles.compactCard}
          onPress={() => {
            setIsExpanded(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={headline}
          accessibilityHint="Double tap to expand pattern details"
        >
          <View style={styles.compactContent}>
            {/* Icon + Headline */}
            <View style={styles.compactHeader}>
              <Text style={styles.icon}>{icon}</Text>
              <Text style={styles.compactHeadline}>{headline}</Text>
            </View>

            {/* Pattern Description */}
            <Text style={styles.patternText} numberOfLines={2}>
              {pattern}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <ProgressBar
                current={confidence}
                goal={1}
                showPercent={false}
                unit=""
                height={6}
              />
            </View>

            {/* Footer */}
            <View style={styles.compactFooter}>
              <Text style={styles.occurrences}>
                {occurrences}x seen
              </Text>
              <View style={styles.domainBadges}>
                {affectedDomains.slice(0, 2).map((domain) => (
                  <Text key={domain} style={styles.domainBadge}>
                    {domain}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Expand Indicator */}
          <Text style={styles.expandIndicator}>→</Text>
        </TouchableOpacity>
      )}

      {/* Expanded View (Bottom Sheet) */}
      {isExpanded && (
        <View style={styles.expandedCard}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setIsExpanded(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close details"
          >
            <Text style={styles.closeIcon}>←</Text>
            <Text style={styles.expandedHeadline}>{headline}</Text>
          </TouchableOpacity>

          {/* Details Sections */}
          <View style={styles.detailsContainer}>
            {/* WHAT'S HAPPENING */}
            {whatHappens && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WHAT'S HAPPENING</Text>
                <Text style={styles.sectionContent}>{whatHappens}</Text>
              </View>
            )}

            {/* WHY THIS HAPPENS */}
            {whyHappens && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WHY THIS HAPPENS</Text>
                <Text style={styles.sectionContent}>{whyHappens}</Text>
              </View>
            )}

            {/* WHEN WE SEE IT */}
            {whenSeeIt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WHEN WE SEE IT</Text>
                <Text style={styles.sectionContent}>{whenSeeIt}</Text>
              </View>
            )}

            {/* HOW IT AFFECTS YOUR HEALTH */}
            {healthImpact && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>HOW IT AFFECTS YOUR HEALTH</Text>
                <Text style={styles.sectionContent}>{healthImpact}</Text>
              </View>
            )}

            {/* WHAT'S RECOMMENDED */}
            {recommendations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WHAT'S RECOMMENDED</Text>
                {recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendation}>
                    {index + 1}. {rec}
                  </Text>
                ))}
              </View>
            )}

            {/* Confidence Display */}
            <View style={styles.confidenceSection}>
              <ProgressBar
                current={confidence}
                goal={1}
                label="Confidence"
                showPercent
                height={8}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => {
                setShowDismissModal(true);
              }}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Dismiss pattern"
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepButton}
              onPress={handleKeepWatching}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Keep watching pattern"
            >
              <Text style={styles.keepButtonText}>Keep Watching</Text>
            </TouchableOpacity>
          </View>

          {/* Close expanded view when user dismisses */}
          <TouchableOpacity
            style={styles.collapseOverlay}
            onPress={() => setIsExpanded(false)}
          />
        </View>
      )}

      {/* Dismiss Modal */}
      <DismissReasonSelector
        visible={showDismissModal}
        headline={headline}
        onDismiss={handleDismiss}
        onCancel={() => setShowDismissModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Compact View
  compactCard: {
    backgroundColor: SURFACES.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    // Shadow iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,

    // Shadow Android
    elevation: 1,
  },
  compactContent: {
    flex: 1,
    gap: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  compactHeadline: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  patternText: {
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 16,
  },
  progressContainer: {
    marginVertical: 4,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occurrences: {
    fontSize: 11,
    color: TEXT.tertiary,
  },
  domainBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  domainBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    color: TEXT.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  expandIndicator: {
    fontSize: 18,
    color: TEXT.tertiary,
  },

  // Expanded View
  expandedCard: {
    backgroundColor: SURFACES.background,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',

    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
    gap: 8,
  },
  closeIcon: {
    fontSize: 18,
    color: TEXT.secondary,
  },
  expandedHeadline: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },

  // Details Container
  detailsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 14,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  recommendation: {
    fontSize: 14,
    color: TEXT.secondary,
    lineHeight: 20,
    marginVertical: 2,
  },
  confidenceSection: {
    paddingVertical: 8,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dismissButton: {
    flex: 0.4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  keepButton: {
    flex: 0.6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: BRAND.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,

    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  keepButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Collapse Overlay (behind expanded card)
  collapseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
