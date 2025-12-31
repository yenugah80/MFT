/**
 * ============================================================================
 * VoiceModalElderly - SENIOR-FRIENDLY VERSION
 * ============================================================================
 * Simplified voice interface optimized for elderly users (60+)
 *
 * Features:
 * - VERY LARGE buttons and text (easy to tap, easy to read)
 * - Simple 3-step process: Tap → Speak → Done
 * - NO editing or complex options
 * - High contrast colors for visibility
 * - Audio feedback ("Listening...", "Processing...")
 * - Plain language instructions
 * - Automatic processing (no manual confirmation needed for some actions)
 * - Big visual feedback (animations, icons)
 *
 * Accessibility:
 * - Font size: 20-32pt (vs normal 14-18pt)
 * - Button size: 70-120px (vs normal 40-60px)
 * - Touch target: 60x60px minimum (vs normal 44x44px)
 * - High contrast: Dark text on light, bright colors
 * - No small UI elements or complex gestures
 *
 * @example
 * <VoiceModalElderly
 *   visible={showVoiceModal}
 *   onClose={() => setShowVoiceModal(false)}
 *   onComplete={(result) => handleVoiceComplete(result)}
 *   voiceHook={useServerVoice()}
 * />
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-tts';

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ============================================================================
// AUDIO GUIDE - Speak instructions to user
// ============================================================================

async function speakInstruction(text) {
  try {
    if (Platform.OS === 'ios') {
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9, // Slower for elderly
      });
    }
  } catch (err) {
    console.warn('Text-to-speech failed:', err);
  }
}

// ============================================================================
// VIBRATION FEEDBACK
// ============================================================================

async function hapticFeedback(type = 'light') {
  try {
    if (type === 'start') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available
  }
}

// ============================================================================
// LARGE WAVEFORM FOR ELDERLY
// ============================================================================

function LargeWaveformVisualizer({ volume, isActive }) {
  const [bars] = useState(() =>
    Array.from({ length: 15 }, () => new Animated.Value(0.3))
  );

  useEffect(() => {
    if (!isActive) {
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const animations = bars.map((bar, index) => {
      const baseHeight = 0.3 + volume * 0.7;
      const variation = Math.sin((index / bars.length) * Math.PI) * 0.2;
      const targetHeight = Math.max(0.2, Math.min(1, baseHeight + variation));

      return Animated.timing(bar, {
        toValue: targetHeight,
        duration: 150,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [volume, isActive, bars]);

  return (
    <View style={styles.largeWaveformContainer}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.largeWaveformBar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: ['20%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VoiceModalElderly({ visible, onClose, onComplete, voiceHook }) {
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

  const [state, setState] = useState('idle');
  const [transcription, setTranscription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successTimeoutRef = useRef(null);

  // Audio guidance effects
  useEffect(() => {
    if (state === 'idle' && visible) {
      speakInstruction('Tap the big microphone button to start speaking');
    }
  }, [state, visible]);

  useEffect(() => {
    if (state === 'listening') {
      speakInstruction('I am listening');
    }
  }, [state]);

  const handleStart = useCallback(async () => {
    await hapticFeedback('start');
    clearError();
    await startRecording();
    setState('listening');
  }, [startRecording, clearError]);

  const handleStop = useCallback(async () => {
    await hapticFeedback('light');
    try {
      const result = await stopRecording();
      setTranscription(result.transcript || 'Unknown food');
      setState('analyzing');

      // Auto-analyze (no confirmation needed for elderly)
      const nutritionResult = await analyzeTranscript(result.transcript);

      setState('success');
      await hapticFeedback('success');
      await speakInstruction('Food logged successfully');

      // Auto-close after success
      successTimeoutRef.current = setTimeout(() => {
        onComplete(nutritionResult);
        handleClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setState('error');
      await hapticFeedback('error');
    }
  }, [stopRecording, analyzeTranscript, onComplete]);

  const handleCancel = useCallback(async () => {
    await hapticFeedback('light');
    await cancelRecording();
    handleClose();
  }, [cancelRecording]);

  const handleClose = useCallback(() => {
    clearError();
    setState('idle');
    setTranscription('');
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    onClose();
  }, [clearError, onClose]);

  // Sync state with hook
  useEffect(() => {
    if (isRecording) {
      setState('listening');
    } else if (isProcessing && state !== 'analyzing') {
      setState('processing');
    } else if (error) {
      setState('error');
      hapticFeedback('error');
    }
  }, [isRecording, isProcessing, error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* ─────────────────────────────────────── */}
          {/* IDLE - Welcome Screen */}
          {/* ─────────────────────────────────────── */}
          {state === 'idle' && (
            <>
              <View style={styles.header}>
                <Text style={styles.titleLarge}>Tell Me What You Ate</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={40} color={SEMANTIC.danger.base} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Ionicons
                  name="mic"
                  size={80}
                  color={BRAND.primary}
                  style={styles.largeIcon}
                />

                <Text style={styles.instructionLarge}>
                  Tap the big button below and tell me what you ate
                </Text>

                <TouchableOpacity
                  style={styles.gigaButton}
                  onPress={handleStart}
                >
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gigaButtonGradient}
                  >
                    <Ionicons name="mic" size={60} color={TEXT.white} />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.exampleText}>
                  Example: "I had two eggs and toast"
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────── */}
          {/* LISTENING - Recording Screen */}
          {/* ─────────────────────────────────────── */}
          {state === 'listening' && (
            <>
              <View style={styles.header}>
                <Text style={styles.titleLarge}>I'm Listening...</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.recordingStatus}>
                  <View style={styles.recordingDotLarge} />
                  <Text style={styles.recordingText}>Recording</Text>
                </View>

                <LargeWaveformVisualizer volume={volume} isActive={true} />

                <Text style={styles.durationLarge}>
                  {Math.floor(duration / 1000)}s
                </Text>

                <View style={styles.largeButtonGroup}>
                  <TouchableOpacity
                    style={styles.largeSecondaryButton}
                    onPress={handleCancel}
                  >
                    <Ionicons name="close" size={40} color={SEMANTIC.danger.base} />
                    <Text style={styles.largeButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.largeStopButton}
                    onPress={handleStop}
                  >
                    <Ionicons name="stop" size={50} color={TEXT.white} />
                    <Text style={styles.largeButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────── */}
          {/* PROCESSING/ANALYZING */}
          {/* ─────────────────────────────────────── */}
          {(state === 'processing' || state === 'analyzing') && (
            <>
              <View style={styles.header}>
                <Text style={styles.titleLarge}>Processing...</Text>
              </View>

              <View style={styles.content}>
                <Animated.View style={styles.spinnerLarge}>
                  <Ionicons
                    name="nutrition"
                    size={80}
                    color={BRAND.primary}
                  />
                </Animated.View>

                <Text style={styles.messageLarge}>
                  Calculating nutrition facts...
                </Text>
                <Text style={styles.hintLarge}>
                  This usually takes a few seconds
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────── */}
          {/* SUCCESS */}
          {/* ─────────────────────────────────────── */}
          {state === 'success' && (
            <>
              <View style={styles.header}>
                <Text style={styles.titleLarge}>Perfect!</Text>
              </View>

              <View style={styles.content}>
                <Ionicons
                  name="checkmark-circle"
                  size={100}
                  color={SEMANTIC.success.base}
                  style={styles.largeIcon}
                />

                <Text style={styles.messageLarge}>
                  Food logged successfully
                </Text>

                <Text style={styles.transcriptionLarge}>
                  "{transcription}"
                </Text>

                <Text style={styles.hintLarge}>
                  Closing in a moment...
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────── */}
          {/* ERROR */}
          {/* ─────────────────────────────────────── */}
          {state === 'error' && (
            <>
              <View style={styles.header}>
                <Text style={[styles.titleLarge, { color: SEMANTIC.danger.base }]}>
                  Oops!
                </Text>
              </View>

              <View style={styles.content}>
                <Ionicons
                  name="close-circle"
                  size={100}
                  color={SEMANTIC.danger.base}
                  style={styles.largeIcon}
                />

                <Text style={styles.errorMessageLarge}>{error}</Text>

                <TouchableOpacity
                  style={styles.largeRetryButton}
                  onPress={handleStart}
                >
                  <Ionicons name="refresh" size={40} color={TEXT.white} />
                  <Text style={styles.largeButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.largeSecondaryButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={40} color={SEMANTIC.danger.base} />
                  <Text style={styles.largeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES - ELDERLY FRIENDLY
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS['2xl'],
    width: Math.min(SCREEN_WIDTH - 30, 500),
    maxHeight: '90%',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[7],
    borderBottomWidth: 3,
    borderBottomColor: BRAND.primary,
    backgroundColor: SURFACES.background.secondary,
  },
  titleLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: TEXT.primary,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING[5],
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────
  // CONTENT
  // ─────────────────────────────────────────────
  content: {
    padding: SPACING[8],
    alignItems: 'center',
    minHeight: 450,
    justifyContent: 'center',
  },

  largeIcon: {
    marginBottom: SPACING[8],
  },

  // ─────────────────────────────────────────────
  // IDLE STATE
  // ─────────────────────────────────────────────
  instructionLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: SPACING[8],
    lineHeight: 36,
  },

  exampleText: {
    fontSize: 18,
    color: TEXT.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: SPACING[6],
  },

  // ─────────────────────────────────────────────
  // BUTTONS - VERY LARGE
  // ─────────────────────────────────────────────
  gigaButton: {
    width: 160,
    height: 160,
    borderRadius: RADIUS.full,
    marginVertical: SPACING[6],
    ...SHADOWS.xl,
  },
  gigaButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  largeButtonGroup: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginTop: SPACING[8],
    width: '100%',
  },

  largeStopButton: {
    flex: 1,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
    backgroundColor: SEMANTIC.danger.base,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.lg,
  },

  largeSecondaryButton: {
    flex: 1,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    borderWidth: 2,
    borderColor: TEXT.tertiary,
  },

  largeRetryButton: {
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[6],
    backgroundColor: SEMANTIC.success.base,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[3],
    width: '100%',
    marginVertical: SPACING[4],
    ...SHADOWS.lg,
  },

  largeButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.white,
  },

  // ─────────────────────────────────────────────
  // TEXT & STATUS
  // ─────────────────────────────────────────────
  messageLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },

  errorMessageLarge: {
    fontSize: 22,
    color: SEMANTIC.danger.base,
    textAlign: 'center',
    marginVertical: SPACING[6],
    lineHeight: 32,
  },

  hintLarge: {
    fontSize: 18,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[4],
  },

  transcriptionLarge: {
    fontSize: 20,
    color: TEXT.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
  },

  // ─────────────────────────────────────────────
  // RECORDING STATE
  // ─────────────────────────────────────────────
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[8],
  },

  recordingDotLarge: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.danger.base,
  },

  recordingText: {
    fontSize: 24,
    fontWeight: '600',
    color: SEMANTIC.danger.base,
  },

  durationLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: TEXT.primary,
    marginVertical: SPACING[6],
  },

  // ─────────────────────────────────────────────
  // WAVEFORM
  // ─────────────────────────────────────────────
  largeWaveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 6,
    marginVertical: SPACING[8],
  },

  largeWaveformBar: {
    width: 12,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.sm,
  },

  // ─────────────────────────────────────────────
  // ANIMATIONS
  // ─────────────────────────────────────────────
  spinnerLarge: {
    marginBottom: SPACING[6],
  },
});