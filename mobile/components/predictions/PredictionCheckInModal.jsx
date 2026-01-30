/**
 * PredictionCheckInModal
 *
 * A bottom sheet modal for collecting user feedback on predictions.
 * This is the key UI for the closed-loop learning system.
 *
 * Features:
 * - Quick emoji buttons for fast feedback
 * - Optional detailed feedback mode
 * - Haptic feedback on selection
 * - Toast confirmation after submission
 * - Domain-specific theming
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Domain colors for theming
const DOMAIN_COLORS = {
  food: { primary: '#F59E0B', background: '#FEF3C7' },
  hydration: { primary: '#3B82F6', background: '#DBEAFE' },
  mood: { primary: '#8B5CF6', background: '#EDE9FE' },
  activity: { primary: '#10B981', background: '#D1FAE5' },
};

// Domain emojis
const DOMAIN_EMOJIS = {
  food: '🍎',
  hydration: '💧',
  mood: '😊',
  activity: '🏃',
};

// Submit outcome to API
async function submitOutcome(data) {
  const response = await apiClient.post('/predictions/outcome', data);
  return response.data;
}

export default function PredictionCheckInModal({
  visible,
  onClose,
  prediction,
  onComplete,
}) {
  const [selectedValue, setSelectedValue] = useState(null);
  const [showDetailedMode, setShowDetailedMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [contextFactors, setContextFactors] = useState({});
  const queryClient = useQueryClient();

  // Animation for modal entrance
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Mutation for submitting outcome
  const mutation = useMutation({
    mutationFn: submitOutcome,
    onSuccess: (data) => {
      // Invalidate predictions to refresh
      queryClient.invalidateQueries(['time-aware-prediction']);
      queryClient.invalidateQueries(['morning-prediction']);

      // Haptic success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Call completion callback with result
      if (onComplete) {
        onComplete({
          wasAccurate: data.wasAccurate,
          message: data.message,
        });
      }

      // Close modal
      handleClose();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('[CheckIn] Error submitting outcome:', error);
    },
  });

  const handleClose = useCallback(() => {
    setSelectedValue(null);
    setShowDetailedMode(false);
    setNotes('');
    setContextFactors({});
    onClose();
  }, [onClose]);

  const handleQuickResponse = useCallback(
    (value) => {
      setSelectedValue(value);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Auto-submit after short delay for quick responses
      setTimeout(() => {
        mutation.mutate({
          predictionId: prediction.id,
          value,
          method: 'quick_emoji',
        });
      }, 300);
    },
    [prediction, mutation]
  );

  const handleDetailedSubmit = useCallback(() => {
    if (!selectedValue) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    mutation.mutate({
      predictionId: prediction.id,
      value: selectedValue,
      method: 'detailed_form',
      notes,
      contextFactors,
    });
  }, [prediction, selectedValue, notes, contextFactors, mutation]);

  if (!prediction) return null;

  const domain = prediction.domain || 'food';
  const colors = DOMAIN_COLORS[domain] || DOMAIN_COLORS.food;
  const domainEmoji = DOMAIN_EMOJIS[domain] || '📊';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <BlurView intensity={100} tint="light" style={styles.blurContainer}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={styles.domainEmoji}>{prediction.emoji || domainEmoji}</Text>
              </View>
              <Text style={styles.title}>{prediction.title}</Text>
              <Text style={styles.subtitle}>{prediction.body}</Text>
            </View>

            {/* Quick response buttons */}
            {!showDetailedMode && (
              <View style={styles.buttonsContainer}>
                {prediction.buttons?.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.responseButton,
                      selectedValue === button.value && styles.selectedButton,
                      selectedValue === button.value && {
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleQuickResponse(button.value)}
                    disabled={mutation.isPending}
                  >
                    <Text
                      style={[
                        styles.responseButtonText,
                        selectedValue === button.value &&
                          styles.selectedButtonText,
                        selectedValue === button.value && {
                          color: colors.primary,
                        },
                      ]}
                    >
                      {button.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Loading indicator */}
            {mutation.isPending && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Saving your feedback...</Text>
              </View>
            )}

            {/* Add more detail link */}
            {!showDetailedMode && !mutation.isPending && (
              <TouchableOpacity
                style={styles.detailLink}
                onPress={() => {
                  setShowDetailedMode(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color={TEXT.tertiary} />
                <Text style={styles.detailLinkText}>Add more context</Text>
              </TouchableOpacity>
            )}

            {/* Skip button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleClose}
              disabled={mutation.isPending}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  blurContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  domainEmoji: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  title: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  responseButton: {
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  responseButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  selectedButtonText: {
    fontFamily: TYPOGRAPHY.family.bold,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  detailLinkText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
