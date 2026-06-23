/**
 * InsightDetailsSheet - Full Narrative Detail View
 *
 * Design Philosophy:
 * - Story-first: Full narrative before structure
 * - 5W2H lives in logic/data, surfaces as context + rationale
 * - Feels like reading a personalized health story
 * - Expandable chips for drill-down, not primary focus
 *
 * Layout Pattern:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ [Handle]                                                        │
 * │ ─────────────────────────────────────────────────────────────── │
 * │ [Type Icon] MAIN ACTION TITLE           [Close]                │
 * │ Category • Timing • Urgency                                     │
 * │                                                                  │
 * │ ─────────────────────────────────────────────────────────────── │
 * │                                                                  │
 * │ 📖 THE STORY                                                    │
 * │                                                                  │
 * │ Full narrative paragraph explaining the recommendation          │
 * │ in a natural, conversational way...                             │
 * │                                                                  │
 * │ ─────────────────────────────────────────────────────────────── │
 * │                                                                  │
 * │ 🎯 WHAT TO DO                                                   │
 * │ • Step 1...                                                     │
 * │ • Step 2...                                                     │
 * │                                                                  │
 * │ ─────────────────────────────────────────────────────────────── │
 * │                                                                  │
 * │ 📊 THE EVIDENCE                                                 │
 * │ [Data visualization / chart placeholder]                        │
 * │                                                                  │
 * │ ─────────────────────────────────────────────────────────────── │
 * │                                                                  │
 * │ 🧩 FULL BREAKDOWN (5W2H Chips)                                  │
 * │ [Goal & Action] [Context] [Impact]                              │
 * │                                                                  │
 * │ ─────────────────────────────────────────────────────────────── │
 * │                                                                  │
 * │ [✓ Mark as Done]  [Not Now]  [Share]                           │
 * │                                                                  │
 * └─────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Share,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// ============================================================================
// TYPE & URGENCY CONFIGURATIONS
// ============================================================================

const TYPE_CONFIG = {
  food: {
    icon: 'nutrition',
    label: 'Nutrition',
    gradient: PREMIUM_COLORS.functional.nutrition.gradient,
    color: PREMIUM_COLORS.functional.nutrition.primary,
  },
  hydration: {
    icon: 'water',
    label: 'Hydration',
    gradient: PREMIUM_COLORS.functional.hydration.gradient,
    color: PREMIUM_COLORS.functional.hydration.primary,
  },
  mood: {
    icon: 'happy',
    label: 'Mood & Energy',
    gradient: PREMIUM_COLORS.functional.mood.gradient,
    color: PREMIUM_COLORS.functional.mood.primary,
  },
  activity: {
    icon: 'fitness',
    label: 'Activity',
    gradient: PREMIUM_COLORS.functional.activity.gradient,
    color: PREMIUM_COLORS.functional.activity.primary,
  },
  habit: {
    icon: 'repeat',
    label: 'Habit',
    gradient: PREMIUM_COLORS.functional.progress.gradient,
    color: PREMIUM_COLORS.functional.progress.primary,
  },
};

const URGENCY_CONFIG = {
  high: { label: 'Act now', color: PREMIUM_COLORS.semantic.error.primary },
  medium: { label: 'Soon', color: PREMIUM_COLORS.semantic.warning.primary },
  low: { label: 'When ready', color: PREMIUM_COLORS.text.tertiary },
};

// ============================================================================
// CHIP COMPONENT
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

function InsightChip({ type, text, isAccent = false }) {
  const config = CHIP_CONFIG[type];
  if (!text || !config) return null;

  return (
    <View style={[styles.chip, isAccent && styles.chipAccent]}>
      <Ionicons
        name={config.icon}
        size={16}
        color={isAccent ? PREMIUM_COLORS.brand.primary : PREMIUM_COLORS.text.tertiary}
      />
      <View style={styles.chipContent}>
        <Text style={styles.chipLabel}>{config.label}</Text>
        <Text style={[styles.chipText, isAccent && styles.chipTextAccent]} numberOfLines={3}>
          {text}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// DATA POINT ROW
// ============================================================================

function DataPointRow({ label, value, highlight = false }) {
  return (
    <View style={[styles.dataPointRow, highlight && styles.dataPointRowHighlight]}>
      <Text style={styles.dataPointLabel}>{label}</Text>
      <Text style={[styles.dataPointValue, highlight && styles.dataPointValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

// ============================================================================
// INSTRUCTION STEP
// ============================================================================

function InstructionStep({ step, index }) {
  return (
    <View style={styles.instructionStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <Text style={styles.stepText}>{step}</Text>
    </View>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function Section({ title, icon, children, style }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={PREMIUM_COLORS.brand.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InsightDetailsSheet({
  visible,
  recommendation,
  onClose,
  onComplete,
  onDismiss,
  onShare,
}) {
  const { height: screenHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isCompleting, setIsCompleting] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, screenHeight]);

  // Extract data BEFORE early return to use in hooks
  // (React hooks must be called unconditionally)
  const { who, what, when, where, why, how, howMuch, confidence, status } = recommendation || {};

  const typeConfig = TYPE_CONFIG[what?.type] || TYPE_CONFIG.food;
  const urgencyConfig = URGENCY_CONFIG[when?.urgency] || URGENCY_CONFIG.low;

  // Build full narrative - the story, not the framework
  const narrative = useMemo(() => {
    if (!recommendation) return '';
    const paragraphs = [];

    // Opening: The observation/problem
    if (why?.primaryReason) {
      paragraphs.push(why.primaryReason);
    }

    // Middle: The recommendation with context
    if (what?.action) {
      let actionText = what.action;
      if (when?.specificTime) {
        actionText += ` ${when.specificTime.toLowerCase()}.`;
      }
      if (where?.preparation) {
        actionText += ` ${where.preparation}`;
      }
      paragraphs.push(actionText);
    }

    // Closing: The expected benefit
    if (why?.healthBenefit) {
      paragraphs.push(`This ${why.healthBenefit.toLowerCase()}.`);
    }

    // Additional context from personalization
    if (who?.personalization) {
      paragraphs.push(`This recommendation is ${who.personalization.toLowerCase()}.`);
    }

    return paragraphs.join('\n\n');
  }, [recommendation, who, what, when, where, why]);

  // Build chips content
  const chips = useMemo(() => {
    if (!recommendation) return {};
    return {
      what: what?.action || null,
      why: why?.healthBenefit || why?.primaryReason || null,
      who: who?.personalization || `For you (${who?.persona || 'personalized'})`,
      where: where?.context
        ? `${where.context.charAt(0).toUpperCase()}${where.context.slice(1)}`
        : where?.preparation || null,
      when: when?.specificTime || when?.timing || null,
      how: how?.instructions?.[0] ||
           (how?.difficulty ? `${how.difficulty} (${how.timeRequired})` : null),
      howMuch: howMuch?.quantity ||
               (howMuch?.nutritionImpact?.[0]
                 ? `${howMuch.nutritionImpact[0].nutrient}: ${howMuch.nutritionImpact[0].percentDV}% DV`
                 : null),
    };
  }, [recommendation, who, what, when, where, why, how, howMuch]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.(recommendation);
    setIsCompleting(false);
    onClose();
  }, [recommendation, onComplete, onClose]);

  // Handle dismiss
  const handleDismiss = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.(recommendation);
    onClose();
  }, [recommendation, onDismiss, onClose]);

  // Handle share
  const handleShare = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const shareText = [
      `📋 Health Recommendation`,
      ``,
      `${what?.action}`,
      ``,
      `Why: ${why?.primaryReason}`,
      ``,
      `Benefit: ${why?.healthBenefit}`,
      ``,
      confidence?.score ? `Confidence: ${confidence.score}%` : null,
      confidence?.source ? `Source: ${confidence.source}` : null,
      ``,
      `Shared from MFT`,
    ].filter(Boolean).join('\n');

    if (onShare) {
      onShare(shareText);
    } else {
      try {
        await Share.share({
          message: shareText,
          title: 'Health Recommendation',
        });
      } catch (error) {
        // Fallback to clipboard if Share fails
        try {
          if (Clipboard?.setStringAsync) {
            await Clipboard.setStringAsync(shareText);
          }
        } catch (clipboardError) {
          console.log('[InsightDetailsSheet] Clipboard not available');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [what, why, confidence, onShare]);

  // Handle copy reasoning
  const handleCopyReasoning = useCallback(async () => {
    const reasoningText = [
      `Recommendation: ${what?.action}`,
      ``,
      `Why: ${why?.primaryReason}`,
      ``,
      `What: ${chips.what}`,
      chips.how ? `How: ${chips.how}` : null,
      chips.when ? `When: ${chips.when}` : null,
      chips.where ? `Where: ${chips.where}` : null,
      chips.howMuch ? `Impact: ${chips.howMuch}` : null,
      ``,
      `Benefit: ${why?.healthBenefit}`,
      ``,
      confidence?.score ? `Confidence: ${confidence.score}%` : null,
      confidence?.source ? `Source: ${confidence.source}` : null,
    ].filter(Boolean).join('\n');

    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(reasoningText);
      }
    } catch (e) {
      console.log('[InsightDetailsSheet] Clipboard not available:', e.message);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [what, why, chips, confidence]);

  // Early return AFTER all hooks
  if (!recommendation) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.typeIcon, { backgroundColor: `${typeConfig.color}15` }]}>
              <Ionicons name={typeConfig.icon} size={22} color={typeConfig.color} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.actionTitle} numberOfLines={2}>{what?.action}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{when?.specificTime || when?.timing}</Text>
                {when?.urgency && when.urgency !== 'low' && (
                  <>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={[styles.metaText, { color: urgencyConfig.color }]}>
                      {urgencyConfig.label}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={24} color={PREMIUM_COLORS.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Gradient accent */}
        <LinearGradient
          colors={typeConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientAccent}
        />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* The Story Section */}
          <Section title="The Story" icon="book-outline">
            <Text style={styles.narrative}>{narrative}</Text>
          </Section>

          {/* What To Do Section */}
          {how?.instructions && how.instructions.length > 0 && (
            <Section title="What To Do" icon="checkmark-done-outline">
              <View style={styles.instructionsList}>
                {how.instructions.map((instruction, idx) => (
                  <InstructionStep key={idx} step={instruction} index={idx} />
                ))}
              </View>
              {how.tips && how.tips.length > 0 && (
                <View style={styles.tipsContainer}>
                  <Ionicons name="bulb-outline" size={16} color={PREMIUM_COLORS.semantic.warning.primary} />
                  <Text style={styles.tipsText}>{how.tips[0]}</Text>
                </View>
              )}
            </Section>
          )}

          {/* The Evidence Section */}
          {(why?.dataPoints?.length > 0 || confidence) && (
            <Section title="The Evidence" icon="analytics-outline">
              <View style={styles.evidenceCard}>
                {why?.dataPoints?.map((dp, idx) => (
                  <DataPointRow
                    key={idx}
                    label={dp.label}
                    value={dp.value}
                    highlight={idx === 0}
                  />
                ))}
                {confidence?.score && (
                  <View style={styles.confidenceRow}>
                    <View style={styles.confidenceLeft}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={PREMIUM_COLORS.semantic.success.primary}
                      />
                      <Text style={styles.confidenceLabel}>Confidence</Text>
                    </View>
                    <View style={styles.confidenceRight}>
                      <Text style={styles.confidenceValue}>{confidence.score}%</Text>
                      {confidence.dataPoints && (
                        <Text style={styles.confidenceDataPoints}>
                          • {confidence.dataPoints} data points
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                {(confidence?.source || why?.scienceSource) && (
                  <Text style={styles.sourceText}>
                    Source: {confidence?.source || why?.scienceSource}
                  </Text>
                )}
              </View>
            </Section>
          )}

          {/* Full Breakdown (5W2H Chips) */}
          <Section title="Full Breakdown" icon="layers-outline">
            {/* Goal & Action */}
            <View style={styles.chipGroup}>
              <Text style={styles.chipGroupLabel}>Goal & Action</Text>
              <View style={styles.chipRow}>
                <InsightChip type="what" text={chips.what} />
                <InsightChip type="how" text={chips.how} />
              </View>
            </View>

            {/* Context */}
            <View style={styles.chipGroup}>
              <Text style={styles.chipGroupLabel}>Context</Text>
              <View style={styles.chipRow}>
                <InsightChip type="who" text={chips.who} />
                <InsightChip type="where" text={chips.where} />
                <InsightChip type="when" text={chips.when} />
              </View>
            </View>

            {/* Impact */}
            <View style={styles.chipGroup}>
              <Text style={styles.chipGroupLabel}>Impact</Text>
              <View style={styles.chipRow}>
                <InsightChip type="why" text={chips.why} isAccent />
                <InsightChip type="howMuch" text={chips.howMuch} isAccent />
              </View>
            </View>

            {/* Copy reasoning button */}
            <TouchableOpacity
              style={styles.copyReasoningButton}
              onPress={handleCopyReasoning}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={16} color={PREMIUM_COLORS.brand.primary} />
              <Text style={styles.copyReasoningText}>Copy reasoning for coaches/clinicians</Text>
            </TouchableOpacity>
          </Section>

          {/* Nutrition Impact (if available) */}
          {howMuch?.nutritionImpact && howMuch.nutritionImpact.length > 0 && (
            <Section title="Nutrition Impact" icon="nutrition-outline">
              <View style={styles.nutritionGrid}>
                {howMuch.nutritionImpact.map((impact, idx) => (
                  <View key={idx} style={styles.nutritionCard}>
                    <Text style={styles.nutritionNutrient}>{impact.nutrient}</Text>
                    <Text style={styles.nutritionAmount}>
                      {impact.amount}{impact.unit || 'g'}
                    </Text>
                    <View style={styles.nutritionDVContainer}>
                      <View
                        style={[
                          styles.nutritionDVBar,
                          { width: `${Math.min(impact.percentDV, 100)}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.nutritionDVText}>{impact.percentDV}% DV</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Bottom spacing for actions */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed Action Buttons */}
        {status === 'pending' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color={PREMIUM_COLORS.text.secondary} />
              <Text style={styles.dismissButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={PREMIUM_COLORS.brand.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.completeButton, isCompleting && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={isCompleting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[PREMIUM_COLORS.brand.primary, PREMIUM_COLORS.brand.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completeButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Mark as Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '92%',
    ...SHADOWS.xl,
  },

  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: PREMIUM_COLORS.border.medium,
    borderRadius: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING[3],
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: SPACING[2],
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.size.title3 * 1.2,
    marginBottom: SPACING[1],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
  },
  metaDot: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.muted,
    marginHorizontal: SPACING[1.5],
  },
  closeButton: {
    padding: SPACING[2],
    marginTop: -SPACING[1],
    marginRight: -SPACING[2],
  },

  gradientAccent: {
    height: 3,
    marginHorizontal: SPACING[5],
    borderRadius: 2,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[5],
  },

  // Section
  section: {
    marginBottom: SPACING[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
  },

  // Narrative
  narrative: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.6,
  },

  // Instructions
  instructionsList: {
    gap: SPACING[3],
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${PREMIUM_COLORS.brand.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.brand.primary,
  },
  stepText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
    paddingTop: 4,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: `${PREMIUM_COLORS.semantic.warning.primary}10`,
    borderRadius: RADIUS.md,
  },
  tipsText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // Evidence
  evidenceCard: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  dataPointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  dataPointRowHighlight: {
    backgroundColor: `${PREMIUM_COLORS.brand.primary}08`,
    marginHorizontal: -SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.sm,
  },
  dataPointLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
  },
  dataPointValue: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  dataPointValueHighlight: {
    color: PREMIUM_COLORS.brand.primary,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },
  confidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1.5],
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
  },
  confidenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.semantic.success.primary,
  },
  confidenceDataPoints: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginLeft: SPACING[1],
  },
  sourceText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginTop: SPACING[2],
  },

  // Chips
  chipGroup: {
    marginBottom: SPACING[4],
  },
  chipGroupLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
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

  copyReasoningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    borderStyle: 'dashed',
    marginTop: SPACING[2],
  },
  copyReasoningText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.brand.primary,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  nutritionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  nutritionNutrient: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    marginBottom: SPACING[1],
  },
  nutritionAmount: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  nutritionDVContainer: {
    height: 6,
    backgroundColor: PREMIUM_COLORS.border.light,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  nutritionDVBar: {
    height: '100%',
    backgroundColor: PREMIUM_COLORS.brand.primary,
    borderRadius: 3,
  },
  nutritionDVText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Actions
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    paddingBottom: Platform.OS === 'ios' ? SPACING[8] : SPACING[4],
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.sm,
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  dismissButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.secondary,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PREMIUM_COLORS.brand.primary}15`,
    borderWidth: 1,
    borderColor: `${PREMIUM_COLORS.brand.primary}30`,
  },
  completeButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3.5],
  },
  completeButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
