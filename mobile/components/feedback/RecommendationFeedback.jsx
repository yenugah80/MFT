/**
 * RecommendationFeedback - Premium Feedback UI Component
 *
 * Collects user feedback on recommendations to improve personalization:
 * - Quick reactions (like, save, dismiss)
 * - Detailed feedback with reasons
 * - Animated interactions
 * - Smart follow-up questions
 *
 * Features:
 * - Haptic feedback
 * - Animated state transitions
 * - Contextual dismiss reasons
 * - Thank you animations
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from '../../constants/premiumTheme';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DISMISS_REASONS = [
  { id: 'not_hungry', label: "I'm not hungry", icon: 'cafe-outline' },
  { id: 'dont_like', label: "Don't like this food", icon: 'thumbs-down-outline' },
  { id: 'ate_recently', label: 'Ate this recently', icon: 'time-outline' },
  { id: 'too_complex', label: 'Too complex to make', icon: 'construct-outline' },
  { id: 'dietary', label: "Doesn't fit my diet", icon: 'nutrition-outline' },
  { id: 'not_available', label: "Ingredients not available", icon: 'cart-outline' },
  { id: 'other', label: 'Other reason', icon: 'ellipsis-horizontal' },
];

const FEEDBACK_MESSAGES = {
  liked: [
    "Great choice! We'll show more like this.",
    "Love it! Noted for future recommendations.",
    "Perfect! Finding more similar options.",
  ],
  saved: [
    "Saved! Check your favorites anytime.",
    "Added to your collection!",
    "Bookmarked for later!",
  ],
  dismissed: [
    "Got it! We'll adjust your recommendations.",
    "Thanks for the feedback!",
    "Noted! Improving your suggestions.",
  ],
};

// ============================================================================
// QUICK ACTION BUTTON
// ============================================================================

function QuickActionButton({ icon, label, color, isActive, onPress, disabled }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  }, [disabled, onPress, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.quickAction,
          isActive && { backgroundColor: color + '15', borderColor: color },
          disabled && styles.quickActionDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isActive ? icon : `${icon}-outline`}
          size={20}
          color={isActive ? color : TEXT.tertiary}
        />
        <Text style={[
          styles.quickActionLabel,
          isActive && { color },
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// DISMISS REASON MODAL
// ============================================================================

function DismissReasonModal({ visible, onClose, onSelectReason }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Why not this one?</Text>
            <Text style={styles.modalSubtitle}>
              Help us improve your recommendations
            </Text>
          </View>

          <View style={styles.reasonsList}>
            {DISMISS_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={styles.reasonItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectReason(reason);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.reasonIcon}>
                  <Ionicons name={reason.icon} size={18} color={TEXT.secondary} />
                </View>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// THANK YOU TOAST
// ============================================================================

function ThankYouToast({ visible, message, type }) {
  const colors = {
    liked: '#10B981',
    saved: '#3B82F6',
    dismissed: '#6B7280',
  };

  const icons = {
    liked: 'heart',
    saved: 'bookmark',
    dismissed: 'checkmark-circle',
  };

  if (!visible) return null;

  return (
    <Animated.View style={styles.toastContainer}>
      <LinearGradient
        colors={[colors[type] + '15', colors[type] + '08']}
        style={styles.toast}
      >
        <Ionicons name={icons[type]} size={18} color={colors[type]} />
        <Text style={[styles.toastText, { color: colors[type] }]}>
          {message}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecommendationFeedback({
  recommendationId,
  // Current state
  isLiked = false,
  isSaved = false,
  isDismissed = false,
  // Callbacks
  onLike,
  onSave,
  onDismiss,
  // Display options
  showLabels = true,
  compact = false,
  disabled = false,
}) {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('liked');

  // Show feedback toast
  const showFeedbackToast = useCallback((type) => {
    const messages = FEEDBACK_MESSAGES[type];
    const message = messages[Math.floor(Math.random() * messages.length)];
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  }, []);

  // Handle like
  const handleLike = useCallback(() => {
    onLike?.(recommendationId);
    showFeedbackToast('liked');
  }, [recommendationId, onLike, showFeedbackToast]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(recommendationId);
    showFeedbackToast('saved');
  }, [recommendationId, onSave, showFeedbackToast]);

  // Handle dismiss tap
  const handleDismissTap = useCallback(() => {
    setShowReasonModal(true);
  }, []);

  // Handle dismiss reason selection
  const handleSelectReason = useCallback((reason) => {
    setShowReasonModal(false);
    onDismiss?.(recommendationId, reason.id, reason.label);
    showFeedbackToast('dismissed');
  }, [recommendationId, onDismiss, showFeedbackToast]);

  if (isDismissed) {
    return (
      <View style={styles.dismissedContainer}>
        <Ionicons name="checkmark-circle" size={16} color={TEXT.tertiary} />
        <Text style={styles.dismissedText}>Thanks for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Quick Actions */}
      <View style={[styles.actionsRow, compact && styles.actionsRowCompact]}>
        <QuickActionButton
          icon="heart"
          label={showLabels ? 'Like' : ''}
          color="#EF4444"
          isActive={isLiked}
          onPress={handleLike}
          disabled={disabled}
        />

        <QuickActionButton
          icon="bookmark"
          label={showLabels ? 'Save' : ''}
          color="#3B82F6"
          isActive={isSaved}
          onPress={handleSave}
          disabled={disabled}
        />

        <QuickActionButton
          icon="close-circle"
          label={showLabels ? 'Not for me' : ''}
          color="#6B7280"
          isActive={false}
          onPress={handleDismissTap}
          disabled={disabled}
        />
      </View>

      {/* Thank You Toast */}
      <ThankYouToast
        visible={showToast}
        message={toastMessage}
        type={toastType}
      />

      {/* Dismiss Reason Modal */}
      <DismissReasonModal
        visible={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onSelectReason={handleSelectReason}
      />
    </View>
  );
}

// ============================================================================
// INLINE FEEDBACK (Simplified version for lists)
// ============================================================================

export function InlineFeedback({ onLike, onDismiss, isLiked }) {
  return (
    <View style={styles.inlineContainer}>
      <TouchableOpacity
        style={[styles.inlineButton, isLiked && styles.inlineButtonActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onLike?.();
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={16}
          color={isLiked ? '#EF4444' : TEXT.tertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.inlineButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDismiss?.();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={16} color={TEXT.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  // Actions row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING[2],
    gap: SPACING[2],
  },
  actionsRowCompact: {
    justifyContent: 'flex-start',
  },

  // Quick action button
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: SPACING[1],
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.secondary,
  },

  // Dismissed state
  dismissedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  dismissedText: {
    fontSize: 13,
    color: TEXT.tertiary,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[2],
  },
  toastText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACES.card,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Reasons list
  reasonsList: {
    gap: SPACING[1],
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.md,
    gap: SPACING[3],
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    color: TEXT.primary,
  },

  // Cancel button
  cancelButton: {
    marginTop: SPACING[4],
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.tertiary,
  },

  // Inline feedback
  inlineContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  inlineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonActive: {
    backgroundColor: '#EF444415',
  },
});
