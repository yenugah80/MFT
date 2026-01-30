/**
 * PriorityRecommendationCard - What to Change Next
 *
 * Shows the highest-impact, lowest-effort recommendation with 5W2H framework.
 * Impact × Effort two-ring visualization for ROI clarity.
 *
 * Design:
 * - Two side-by-side progress rings (70px each)
 * - Left: Impact (Low=40%, Medium=70%, High=95%)
 * - Right: Effort (Easy=90%, Medium=60%, Hard=30%)
 * - Colors: Emerald (impact), Cyan (effort)
 * - Shows title + subtitle
 * - CTA: Tap to expand 5W2H details
 */

import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PREMIUM_COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumDesignSystem';
import { ConfidenceBadge } from '../ConfidenceIndicator';
import GlassCard from './GlassCard';

/**
 * Convert difficulty/impact strings to percentage scores
 */
const difficultyToScore = (difficulty) => {
  if (difficulty === 'easy') return 90; // Easy = less effort needed
  if (difficulty === 'medium') return 60;
  return 30; // Hard
};

const impactToScore = (impact) => {
  if (impact === 'high') return 95;
  if (impact === 'medium') return 70;
  return 40; // Low
};

/**
 * PriorityRecommendationCard Component
 * Premium-only widget showing top-priority action item
 */
export default function PriorityRecommendationCard({
  title = 'Increase protein intake',
  subtitle = 'Small protein additions can improve energy and mood stability',
  whyMatters = [], // Array of reason strings
  difficulty = 'easy', // 'easy' | 'medium' | 'hard'
  impact = 'high', // 'low' | 'medium' | 'high'
  timeRequired = '2 min prep',
  schedule = [], // Array of { day, task }
  alternatives = [], // Array of alternative recommendations
  confidence = 0.78,
  dataPoints = 45,
  onPress,
  onExpand,
  style,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Convert to visual scores
  const effortScore = difficultyToScore(difficulty);
  const impactScore = impactToScore(impact);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
    onPress?.();
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Recommendation: ${title}. High impact, low effort.`}
        >
          <GlassCard variant="standard">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.label}>What to Change Next</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
              <Ionicons
                name="lightbulb"
                size={24}
                color={PREMIUM_COLORS.functional.insights.primary}
              />
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Impact × Effort Rings */}
            <View style={styles.ringsRow}>
              {/* Impact Ring */}
              <View style={styles.ringContainer}>
                <SmallProgressRing
                  value={impactScore}
                  size={70}
                  gradient={[PREMIUM_COLORS.functional.activity.primary, PREMIUM_COLORS.semantic.success.primary]}
                />
                <View style={styles.ringLabel}>
                  <Text style={styles.ringLabelText}>Impact</Text>
                  <Text style={styles.ringValue}>{impactScore}%</Text>
                </View>
              </View>

              {/* Effort Ring */}
              <View style={styles.ringContainer}>
                <SmallProgressRing
                  value={effortScore}
                  size={70}
                  gradient={[PREMIUM_COLORS.functional.hydration.primary, PREMIUM_COLORS.semantic.success.primary]}
                />
                <View style={styles.ringLabel}>
                  <Text style={styles.ringLabelText}>Effort</Text>
                  <Text style={styles.ringValue}>{effortScore}%</Text>
                </View>
              </View>
            </View>

            {/* Time + Confidence */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={PREMIUM_COLORS.text.tertiary}
                />
                <Text style={styles.metaText}>{timeRequired}</Text>
              </View>
              <View style={styles.metaDivider} />
              <ConfidenceBadge
                mode="badge"
                confidence={confidence}
                dataPoints={dataPoints}
                showLabel={true}
              />
            </View>

            {/* CTA */}
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>See full recommendation</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={PREMIUM_COLORS.text.tertiary}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={handleModalClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={PREMIUM_COLORS.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <View style={styles.modalContent}>
            {/* Why Matters */}
            {whyMatters && whyMatters.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why This Matters</Text>
                {whyMatters.map((reason, i) => (
                  <View key={i} style={styles.bulletPoint}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Schedule */}
            {schedule && schedule.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended Schedule</Text>
                {schedule.map((item, i) => (
                  <View key={i} style={styles.scheduleItem}>
                    <Text style={styles.scheduleDay}>{item.day}</Text>
                    <Text style={styles.scheduleTask}>{item.task}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Alternatives */}
            {alternatives && alternatives.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alternative Options</Text>
                {alternatives.map((alt, i) => (
                  <View key={i} style={styles.altItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={PREMIUM_COLORS.text.tertiary}
                    />
                    <Text style={styles.altText}>{alt}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Difficulty/Impact/Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Effort & Impact</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Difficulty</Text>
                  <Text style={styles.detailValue}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Impact</Text>
                  <Text style={styles.detailValue}>
                    {impact.charAt(0).toUpperCase() + impact.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{timeRequired}</Text>
                </View>
              </View>
            </View>

            {/* Confidence */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Quality</Text>
              <View style={styles.confidenceDetail}>
                <Text style={styles.confidenceText}>
                  Based on {dataPoints} data points with {Math.round(confidence * 100)}% confidence
                </Text>
              </View>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleModalClose}
            >
              <Text style={styles.buttonSecondaryText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => {
                onExpand?.();
                handleModalClose();
              }}
            >
              <Text style={styles.buttonPrimaryText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * SmallProgressRing - Compact circular progress indicator
 */
function SmallProgressRing({ value = 50, size = 70, gradient = ['#4F46E5', '#10B981'] }) {
  const radius = (size - 10) / 2; // strokeWidth = 10
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradient[0]} />
          <Stop offset="100%" stopColor={gradient[1]} />
        </SvgGradient>
      </Defs>

      {/* Background */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0, 0, 0, 0.06)"
        strokeWidth={10}
        fill="none"
      />

      {/* Progress */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#ringGradient)"
        strokeWidth={10}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transform: [{ rotate: '-90deg' }] }}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Card Content
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[1],
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.4,
    marginBottom: SPACING[4],
  },

  // Rings Row
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  ringContainer: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  ringLabel: {
    alignItems: 'center',
  },
  ringLabelText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },
  ringValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  metaText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: PREMIUM_COLORS.border.light,
  },

  // CTA
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    gap: SPACING[1],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.surface.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.text.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
  },

  // Sections
  section: {
    marginBottom: SPACING[6],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[3],
  },

  // Bullet Points
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: SPACING[2],
    gap: SPACING[2],
  },
  bulletDot: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
  },

  // Schedule
  scheduleItem: {
    flexDirection: 'row',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[2],
  },
  scheduleDay: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
    minWidth: 50,
  },
  scheduleTask: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Alternatives
  altItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[2],
    gap: SPACING[2],
  },
  altText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Detail Row
  detailRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    marginBottom: SPACING[1],
  },
  detailValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },

  // Confidence
  confidenceDetail: {
    padding: SPACING[3],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
  },

  // Footer Buttons
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING[3],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: PREMIUM_COLORS.brand.primary,
  },
  buttonPrimaryText: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.medium,
  },
  buttonSecondaryText: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
});
