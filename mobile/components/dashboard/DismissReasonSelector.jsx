import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * DismissReasonSelector
 *
 * Modal that appears when user dismisses a pattern.
 * Captures WHY they dismissed it (feeds into learning & expiry logic).
 *
 * Four reasons:
 * - "Not relevant to me" → Permanent dismiss, confidence → 0
 * - "Just temporary situation" → 7-day revalidation
 * - "Already fixed it" → Mark as resolved, 30-day refresh
 * - "Don't want to see this again" → Permanent deactivation
 *
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {string} props.headline - Pattern headline (e.g., "High-NOVA Mood Crashes")
 * @param {Function} props.onDismiss - Called with reason: (reasonId) => void
 * @param {Function} props.onCancel - Called when user cancels
 * @returns {JSX.Element}
 */
export function DismissReasonSelector({
  visible,
  headline,
  onDismiss,
  onCancel,
}) {
  const [selectedReason, setSelectedReason] = useState(null);

  const DISMISS_REASONS = [
    {
      id: 'not_relevant',
      label: 'Not relevant to me',
      description: "This pattern doesn't apply to me",
    },
    {
      id: 'temporary',
      label: 'Just temporary situation',
      description: 'This was a one-time thing',
    },
    {
      id: 'fixed',
      label: 'Already fixed it',
      description: "I've already resolved this",
    },
    {
      id: 'never_show',
      label: "Don't want to see this again",
      description: 'Permanently dismiss',
    },
  ];

  const handleConfirm = async () => {
    if (!selectedReason) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call callback with selected reason
    onDismiss(selectedReason);

    // Reset for next use
    setSelectedReason(null);
  };

  const handleCancel = async () => {
    // Light haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Call cancel callback
    onCancel();

    // Reset
    setSelectedReason(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headline}>Why dismiss this pattern?</Text>
            <Text style={styles.subtitle}>This helps us improve</Text>
          </View>

          {/* Reason Options */}
          <View style={styles.reasonsContainer}>
            {DISMISS_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.reasonButtonSelected,
                ]}
                onPress={() => {
                  setSelectedReason(reason.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
                accessible
                accessibilityRole="radio"
                accessibilityLabel={reason.label}
                accessibilityState={{ selected: selectedReason === reason.id }}
              >
                {/* Radio Circle */}
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radio,
                      selectedReason === reason.id && styles.radioSelected,
                    ]}
                  >
                    {selectedReason === reason.id && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </View>

                {/* Text Content */}
                <View style={styles.reasonTextContainer}>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  <Text style={styles.reasonDescription}>
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Button Container */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !selectedReason && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Confirm dismiss"
              accessibilityState={{ disabled: !selectedReason }}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: SURFACES.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 32,

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,

    // Shadow for Android
    elevation: 10,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // Reasons List
  reasonsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  reasonButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    minHeight: 44,  // Touch target minimum
  },
  reasonButtonSelected: {
    backgroundColor: '#ECFDF5',
  },

  // Radio Button
  radioContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: BRAND.emerald,
    backgroundColor: BRAND.emerald,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // Reason Text
  reasonTextContainer: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  reasonDescription: {
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 14,
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 0.4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  confirmButton: {
    flex: 0.6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: BRAND.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,

    // Shadow for Android
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
});
