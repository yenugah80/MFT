/**
 * ============================================================================
 * VoiceModal Component - PRODUCTION GRADE
 * ============================================================================
 * Premium voice recording modal with transcription preview and confidence display
 *
 * Features:
 * - Animated waveform visualization (30 bars)
 * - Real-time volume metering
 * - Recording duration display with limit (60s)
 * - Transcription preview with edit capability (BEFORE nutrition analysis)
 * - Confidence score indicator
 * - Haptic feedback on actions
 * - Two-step flow: transcribe → user confirms → analyze nutrition
 * - State machine: idle → listening → processing → transcribed → analyzing → success/error
 * - Premium Ionicons (no emojis)
 * - Unified theme integration
 *
 * @example
 * <VoiceModal
 *   visible={showVoiceModal}
 *   onClose={() => setShowVoiceModal(false)}
 *   onComplete={(result) => handleVoiceComplete(result)}
 *   voiceHook={useLiveVoice()}
 * />
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  BRAND,
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
} from '../../constants/premiumTheme';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const WAVEFORM_BARS = 30;
const MAX_RECORDING_DURATION_MS = 60000; // 60 seconds

// ============================================================================
// WAVEFORM VISUALIZER
// ============================================================================

/**
 * Animated waveform visualizer
 * Displays 30 bars that animate based on microphone volume
 */
function WaveformVisualizer({ volume, isActive }) {
  const [bars] = useState(() =>
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(0.2))
  );

  useEffect(() => {
    if (!isActive) {
      // Reset bars
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Animate bars based on volume
    const animations = bars.map((bar, index) => {
      // Create wave effect with varying heights
      const baseHeight = 0.2 + volume * 0.8;
      const variation = Math.sin((index / WAVEFORM_BARS) * Math.PI) * 0.3;
      const targetHeight = Math.max(0.1, Math.min(1, baseHeight + variation));

      return Animated.timing(bar, {
        toValue: targetHeight,
        duration: 100,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [volume, isActive, bars]);

  return (
    <View style={styles.waveformContainer}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveformBar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: ['10%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration in MM:SS
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get confidence color based on score
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} Color hex
 */
function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return SEMANTIC.success.base;
  if (confidence >= 0.6) return SEMANTIC.warning.base;
  return SEMANTIC.danger.base;
}

/**
 * Get confidence label
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'High Confidence';
  if (confidence >= 0.6) return 'Medium Confidence';
  return 'Low Confidence';
}

/**
 * Trigger haptic feedback (safe cross-platform)
 */
async function triggerHaptic(type = 'light') {
  try {
    if (Platform.OS === 'ios') {
      if (type === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available
  }
}

// ============================================================================
// MAIN VOICEMODAL COMPONENT
// ============================================================================

export function VoiceModal({
  visible,
  onClose,
  onComplete,
  voiceHook,
}) {
  const {
    isRecording,
    isProcessing,
    volume,
    duration,
    error,
    startRecording,
    stopRecording,
    analyzeTranscript,
    cancelRecording,
    clearError,
  } = voiceHook;

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  const [state, setState] = useState('idle'); // idle | listening | processing | transcribed | success | error
  const [transcription, setTranscription] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // ─────────────────────────────────────────────
  // Handlers (Production-grade memoization)
  // ─────────────────────────────────────────────

  // Define handleClose FIRST (used by handleCancel and handleConfirm)
  const handleClose = useCallback(() => {
    clearError();
    setState('idle');
    setTranscription('');
    setConfidence(null);
    setIsEditing(false);
    onClose();
  }, [clearError, onClose]);

  const handleStart = useCallback(async () => {
    clearError();
    await triggerHaptic();
    await startRecording();
  }, [clearError, startRecording]);

  const handleStop = useCallback(async () => {
    try {
      await triggerHaptic();
      const result = await stopRecording();

      // Step 1 complete: Got transcription only (NO nutrition data yet!)
      setTranscription(result.transcript || 'Unknown food');
      setConfidence(result.confidence ?? 0.9);
      setState('transcribed');
    } catch (err) {
      console.error('[VoiceModal] Stop failed:', err);
      setState('error');
    }
  }, [stopRecording]);

  const handleCancel = useCallback(async () => {
    await triggerHaptic();
    await cancelRecording();
    handleClose();
  }, [cancelRecording, handleClose]);

  const handleConfirm = useCallback(async () => {
    try {
      // Show analyzing state
      setState('analyzing');
      await triggerHaptic();

      // Step 2: Analyze the confirmed/edited transcript
      const nutritionResult = await analyzeTranscript(transcription);

      // Show success state
      setState('success');
      await triggerHaptic('success');

      // Delay to show success state, then close and return result
      setTimeout(() => {
        onComplete(nutritionResult);
        handleClose();
      }, 800);
    } catch (err) {
      console.error('[VoiceModal] Analysis failed:', err);
      setState('error');
    }
  }, [analyzeTranscript, transcription, onComplete, handleClose]);

  const handleEditTranscription = useCallback(() => {
    setIsEditing(true);
    triggerHaptic();
  }, []);

  const handleSaveEdit = useCallback(() => {
    setIsEditing(false);
    triggerHaptic();
  }, []);

  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────

  // Sync state with hook
  useEffect(() => {
    if (isRecording) {
      setState('listening');
    } else if (isProcessing) {
      setState('processing');
    } else if (error) {
      setState('error');
      triggerHaptic('error');
    } else if (!visible) {
      setState('idle');
      setTranscription('');
      setConfidence(null);
      setIsEditing(false);
    }
  }, [isRecording, isProcessing, error, visible]);

  // Auto-stop at max duration (PRODUCTION FIX: handleStop now in deps)
  useEffect(() => {
    if (duration >= MAX_RECORDING_DURATION_MS && isRecording) {
      handleStop();
    }
  }, [duration, isRecording, handleStop]);

  // ─────────────────────────────────────────────
  // Render duration with warning at 50s
  // ─────────────────────────────────────────────
  const durationColor = duration >= 50000 ? SEMANTIC.danger.base : TEXT.primary;
  const remainingSeconds = Math.ceil((MAX_RECORDING_DURATION_MS - duration) / 1000);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* ─────────────────────────────────────────── */}
          {/* Header */}
          {/* ─────────────────────────────────────────── */}
          <View style={styles.header}>
            <Ionicons name="mic" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.title}>Voice Logging</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
            </TouchableOpacity>
          </View>

          {/* ─────────────────────────────────────────── */}
          {/* Content based on state */}
          {/* ─────────────────────────────────────────── */}
          <View style={styles.content}>

            {/* IDLE STATE */}
            {state === 'idle' && (
              <>
                <Text style={styles.instruction}>
                  Tap the microphone to start recording your meal description
                </Text>
                <TouchableOpacity style={styles.micButton} onPress={handleStart}>
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.micButtonGradient}
                  >
                    <Ionicons name="mic" size={ICON_SIZES['4xl']} color={TEXT.white} />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.hint}>
                  Example: "I had a grilled chicken salad with olive oil"
                </Text>
                <View style={styles.limitBadge}>
                  <Ionicons name="time-outline" size={ICON_SIZES.xs} color={TEXT.muted} />
                  <Text style={styles.limitText}>Max 60 seconds</Text>
                </View>
              </>
            )}

            {/* LISTENING STATE */}
            {state === 'listening' && (
              <>
                <View style={styles.statusBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.statusText}>Recording...</Text>
                </View>

                <WaveformVisualizer volume={volume} isActive={true} />

                <Text style={[styles.durationText, { color: durationColor }]}>
                  {formatDuration(duration)}
                </Text>
                {duration >= 50000 && (
                  <Text style={styles.warningText}>
                    {remainingSeconds}s remaining
                  </Text>
                )}

                <View style={styles.recordingActions}>
                  <TouchableOpacity style={styles.cancelRecButton} onPress={handleCancel}>
                    <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
                    <Text style={styles.cancelRecButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                    <LinearGradient
                      colors={SURFACES.gradient.danger}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.stopButtonGradient}
                    >
                      <Ionicons name="stop" size={ICON_SIZES.xl} color={TEXT.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* PROCESSING STATE */}
            {state === 'processing' && (
              <>
                <View style={styles.processingIndicator}>
                  <Animated.View style={styles.spinningIcon}>
                    <Ionicons name="sync" size={ICON_SIZES['4xl']} color={BRAND.primary} />
                  </Animated.View>
                </View>
                <Text style={styles.statusText}>Processing...</Text>
                <Text style={styles.hint}>
                  Transcribing and analyzing your meal...
                </Text>
              </>
            )}

            {/* TRANSCRIBED STATE */}
            {state === 'transcribed' && (
              <>
                <Text style={styles.statusText}>Transcription</Text>

                {/* Confidence Indicator */}
                {confidence !== null && (
                  <View style={styles.confidenceContainer}>
                    <Ionicons
                      name={confidence >= 0.8 ? 'checkmark-circle' : confidence >= 0.6 ? 'alert-circle' : 'warning'}
                      size={ICON_SIZES.sm}
                      color={getConfidenceColor(confidence)}
                    />
                    <Text style={[styles.confidenceText, { color: getConfidenceColor(confidence) }]}>
                      {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
                    </Text>
                  </View>
                )}

                {/* Transcription Text */}
                {isEditing ? (
                  <TextInput
                    style={styles.transcriptionInput}
                    value={transcription}
                    onChangeText={setTranscription}
                    multiline
                    autoFocus
                    placeholder="Refine transcription (optional)"
                  />
                ) : (
                  <View style={styles.transcriptionContainer}>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.transcriptionActions}>
                  {isEditing ? (
                    <>
                      <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveEdit}>
                        <Ionicons name="checkmark" size={ICON_SIZES.md} color={BRAND.primary} />
                        <Text style={styles.secondaryButtonText}>Save</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.secondaryButton} onPress={handleEditTranscription}>
                        <Ionicons name="create-outline" size={ICON_SIZES.md} color={BRAND.primary} />
                        <Text style={styles.secondaryButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
                        <LinearGradient
                          colors={SURFACES.gradient.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.primaryButtonGradient}
                        >
                          <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color={TEXT.white} />
                          <Text style={styles.primaryButtonText}>Confirm</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}

            {/* ANALYZING STATE (NEW - Step 2) */}
            {state === 'analyzing' && (
              <>
                <View style={styles.processingIndicator}>
                  <Animated.View style={styles.spinningIcon}>
                    <Ionicons name="nutrition" size={ICON_SIZES['4xl']} color={BRAND.primary} />
                  </Animated.View>
                </View>
                <Text style={styles.statusText}>Analyzing Nutrition...</Text>
                <Text style={styles.hint}>
                  Calculating calories, protein, carbs, and more...
                </Text>
              </>
            )}

            {/* SUCCESS STATE */}
            {state === 'success' && (
              <>
                <View style={styles.successIndicator}>
                  <Ionicons name="checkmark-circle" size={ICON_SIZES['5xl']} color={SEMANTIC.success.base} />
                </View>
                <Text style={styles.statusText}>Success!</Text>
                <Text style={styles.hint}>
                  Food log created successfully
                </Text>
              </>
            )}

            {/* ERROR STATE */}
            {state === 'error' && (
              <>
                <View style={styles.errorIndicator}>
                  <Ionicons name="close-circle" size={ICON_SIZES['5xl']} color={SEMANTIC.danger.base} />
                </View>
                <Text style={[styles.statusText, { color: SEMANTIC.danger.base }]}>Error</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleStart}>
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.retryButtonGradient}
                  >
                    <Ionicons name="refresh" size={ICON_SIZES.md} color={TEXT.white} />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[5],
  },
  modal: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS['2xl'],
    width: Math.min(SCREEN_WIDTH - 40, 400),
    maxHeight: '80%',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 78, 255, 0.1)',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING[5],
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING[6],
    alignItems: 'center',
    minHeight: 340,
    justifyContent: 'center',
  },

  // ─────────────────────────────────────────────
  // IDLE STATE
  // ─────────────────────────────────────────────
  instruction: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[8],
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.size.md,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    marginBottom: SPACING[6],
    ...SHADOWS.xl,
  },
  micButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: SPACING[4],
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  limitText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // ─────────────────────────────────────────────
  // LISTENING STATE
  // ─────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[6],
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.danger.base,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 3,
    marginVertical: SPACING[6],
  },
  waveformBar: {
    width: 4,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.sm,
  },
  durationText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[6],
  },
  warningText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: SEMANTIC.danger.base,
    marginBottom: SPACING[4],
  },
  recordingActions: {
    flexDirection: 'row',
    gap: SPACING[4],
    alignItems: 'center',
  },
  cancelRecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
  },
  cancelRecButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    ...SHADOWS.danger,
  },
  stopButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────
  // PROCESSING STATE
  // ─────────────────────────────────────────────
  processingIndicator: {
    marginVertical: SPACING[6],
  },
  spinningIcon: {
    // Animation would be applied via Animated API
  },

  // ─────────────────────────────────────────────
  // TRANSCRIBED STATE
  // ─────────────────────────────────────────────
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  transcriptionContainer: {
    width: '100%',
    padding: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING[4],
    minHeight: 80,
  },
  transcriptionText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.size.md,
  },
  transcriptionInput: {
    width: '100%',
    padding: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING[4],
    minHeight: 80,
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  transcriptionActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[4],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.lg,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },

  // ─────────────────────────────────────────────
  // SUCCESS STATE
  // ─────────────────────────────────────────────
  successIndicator: {
    marginVertical: SPACING[6],
  },

  // ─────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────
  errorIndicator: {
    marginVertical: SPACING[6],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.danger.base,
    textAlign: 'center',
    marginBottom: SPACING[6],
    marginTop: SPACING[3],
  },
  retryButton: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.lg,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
});
