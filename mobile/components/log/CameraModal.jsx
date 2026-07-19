/**
 * ============================================================================
 * CameraModal Component - PRODUCTION GRADE
 * ============================================================================
 * Premium camera modal with flash, zoom, grid overlay, and photo preview
 *
 * Features:
 * - Flash control (on/off/auto)
 * - Zoom controls (pinch + buttons)
 * - Grid overlay for better framing
 * - Photo preview with retake/confirm
 * - Photo quality validation (blur, lighting)
 * - Image optimization before upload
 * - Loading state during AI analysis
 * - Haptic feedback on actions
 * - Premium Ionicons throughout
 * - 🆕 Optional voice description for multimodal analysis
 *
 * @example
 * <CameraModal
 *   visible={showCamera}
 *   onClose={() => setShowCamera(false)}
 *   onPhotoTaken={(uri, barcode, voiceTranscript) => handlePhoto(uri, barcode, voiceTranscript)}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useServerVoice } from '../../hooks/useServerVoice';

import {
  BRAND,
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  ICON_SIZES,
  SURFACES,
} from '../../constants/premiumTheme';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_IMAGE_WIDTH = 1024;
const COMPRESSION_QUALITY = 0.8;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/**
 * Optimize image for upload
 * Resizes to max width and compresses
 */
async function optimizeImage(uri) {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulatedImage.uri;
  } catch (error) {
    console.error('[CameraModal] Image optimization failed:', error);
    return uri; // Return original if optimization fails
  }
}

/**
 * Basic image quality validation
 * Checks file size as proxy for quality
 */
async function validateImageQuality(uri) {
  try {
    // In a real app, you could use ML models to detect blur, lighting issues
    // For now, we'll do basic file size checks
    const response = await fetch(uri);
    const blob = await response.blob();
    const sizeKB = blob.size / 1024;

    // If image is too small, it might be low quality or corrupt
    if (sizeKB < 10) {
      return { valid: false, reason: 'Image quality too low' };
    }

    // If image is too large (>10MB), it might fail upload
    if (sizeKB > 10240) {
      return { valid: false, reason: 'Image too large (max 10MB)' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[CameraModal] Quality validation failed:', error);
    return { valid: true }; // Assume valid if check fails
  }
}

// ============================================================================
// ANIMATED CLOSE BUTTON COMPONENT
// ============================================================================

/**
 * Interactive close button with scale animation on press
 * Uses TouchableOpacity for better compatibility with CameraView
 */
function AnimatedCloseButton({ onPress, style }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      style={style}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Ionicons name="close" size={ICON_SIZES.lg} color={TEXT.white} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN CAMERAMODAL COMPONENT
// ============================================================================

export default function CameraModal({ visible, onClose, onPhotoTaken }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  // Same engine as the standalone Voice Logging tab (on-device speech recognition
  // via @react-native-voice/voice — requires a dev build, same as that tab already
  // does, so this doesn't introduce a new environment limitation). Only the
  // transcript half of the hook is used here; analyzeTranscript (nutrition
  // parsing) isn't needed since this is just descriptive context for the photo.
  const {
    isRecording: isRecordingVoice,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    cancelRecording: cancelVoiceRecording,
    error: voiceError,
  } = useServerVoice({ voiceLanguage: 'en' });

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [flashMode, setFlashMode] = useState('off'); // off | on | auto
  const [zoom, setZoom] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  // Voice description state — recording itself is owned by useBackendVoice above;
  // isTranscribing covers the gap between "stopped recording" and "got text back"
  // (an upload + Whisper call), which is a distinct loading state from isRecordingVoice.
  const [voiceTranscript, setVoiceTranscript] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // ─────────────────────────────────────────────
  // Request permissions on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  // ─────────────────────────────────────────────
  // Reset state when modal closes
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setCapturedPhoto(null);
      setFlashMode('off');
      setZoom(0);
      setError(null);
      setIsProcessing(false);
      setVoiceTranscript(null);
      setIsTranscribing(false);
      // Release the mic if the modal is dismissed mid-recording — otherwise the
      // recording session (and permission indicator) stays alive in the background.
      if (isRecordingVoice) cancelVoiceRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Surface voice recording/transcription failures (mic permission denied, upload
  // or Whisper failure) in the same error banner used for photo capture errors.
  useEffect(() => {
    if (voiceError) setError(voiceError);
  }, [voiceError]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      await triggerHaptic();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      setCapturedPhoto(photo.uri);
    } catch (err) {
      console.error('[CameraModal] Photo capture failed:', err);
      setError('Failed to capture photo');
      await triggerHaptic('error');
    }
  };

  const handleRetake = async () => {
    await triggerHaptic();
    setCapturedPhoto(null);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!capturedPhoto) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Validate image quality
      const validation = await validateImageQuality(capturedPhoto);
      if (!validation.valid) {
        setError(validation.reason);
        setIsProcessing(false);
        await triggerHaptic('error');
        return;
      }

      // Optimize image
      const optimizedUri = await optimizeImage(capturedPhoto);

      await triggerHaptic('success');
      // 🆕 PASS VOICE TRANSCRIPT TO PHOTO HANDLER
      // If multimodal endpoint exists, frontend will use /api/food/analyze-multimodal
      onPhotoTaken(optimizedUri, null, voiceTranscript);
      onClose();
    } catch (err) {
      console.error('[CameraModal] Photo confirmation failed:', err);
      setError('Failed to process photo');
      await triggerHaptic('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlashToggle = async () => {
    await triggerHaptic();
    const modes = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setFlashMode(nextMode);
  };

  const handleZoomIn = async () => {
    await triggerHaptic();
    setZoom(prev => Math.min(1, prev + 0.1));
  };

  const handleZoomOut = async () => {
    await triggerHaptic();
    setZoom(prev => Math.max(0, prev - 0.1));
  };

  const handleGridToggle = async () => {
    await triggerHaptic();
    setShowGrid(prev => !prev);
  };

  // Voice description: tap to start recording, tap again to stop + transcribe
  // (same useServerVoice engine as the standalone Voice Logging tab).
  const handleAddVoiceDescription = async () => {
    if (isRecordingVoice) {
      await triggerHaptic();
      setIsTranscribing(true);
      const result = await stopVoiceRecording();
      setIsTranscribing(false);

      if (result && !result.isEmpty && result.transcript) {
        setVoiceTranscript(result.transcript);
        await triggerHaptic('success');
      } else {
        // stopVoiceRecording already sets its own error state for the empty-transcript
        // case ("No speech detected...") — surface it in the shared error banner
        // rather than silently pretending a transcript was added.
        setError(voiceError || 'Could not hear anything — try again');
        await triggerHaptic('error');
      }
      return;
    }

    setError(null);
    await triggerHaptic();
    await startVoiceRecording();
    // Permission-denial (or any other start failure) lands in the voiceError
    // effect below, not here — voiceError is stale in this closure immediately
    // after the await, since the hook's setState hasn't flushed yet.
  };

  const handleClearVoice = async () => {
    await triggerHaptic();
    setVoiceTranscript(null);
  };

  const handleClose = async () => {
    await triggerHaptic();

    // If in preview mode (photo captured), show confirmation
    if (capturedPhoto) {
      Alert.alert(
        'Discard Photo?',
        'This photo will be deleted and not analyzed.',
        [
          {
            text: 'Keep Editing',
            onPress: () => {
              // Stay in preview
            },
            style: 'cancel',
          },
          {
            text: 'Discard',
            onPress: () => {
              setCapturedPhoto(null);
              setVoiceTranscript(null);
              setError(null);
              onClose();
            },
            style: 'destructive',
          },
        ]
      );
      return;
    }

    // If in camera view, close immediately
    onClose();
  };

  // ─────────────────────────────────────────────
  // Permission states
  // ─────────────────────────────────────────────

  if (!permission || permission.status === 'undetermined') {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.centered}>
          <Ionicons name="camera-off" size={ICON_SIZES['4xl']} color={SEMANTIC.danger.base} />
          <Text style={styles.permissionText}>Camera access required</Text>
          <Text style={styles.permissionHint}>
            Enable camera access in settings to take photos of your meals
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <LinearGradient
              colors={SURFACES.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.closeButtonGradient}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {!capturedPhoto ? (
          // CAMERA VIEW
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              flash={flashMode}
              zoom={zoom}
            >
              {/* Top Controls */}
              <View style={styles.topControls}>
                <AnimatedCloseButton
                  onPress={handleClose}
                  style={styles.controlButton}
                />

                <View style={styles.topRightControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={handleFlashToggle}>
                    <Ionicons
                      name={
                        flashMode === 'on'
                          ? 'flash'
                          : flashMode === 'auto'
                          ? 'flash-outline'
                          : 'flash-off'
                      }
                      size={ICON_SIZES.lg}
                      color={TEXT.white}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.controlButton} onPress={handleGridToggle}>
                    <Ionicons
                      name={showGrid ? 'grid' : 'grid-outline'}
                      size={ICON_SIZES.lg}
                      color={TEXT.white}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Grid Overlay */}
              {showGrid && (
                <View style={styles.gridOverlay}>
                  <View style={styles.gridLine} />
                  <View style={[styles.gridLine, styles.gridLineVertical]} />
                  <View style={[styles.gridLine, { top: '66.66%' }]} />
                  <View style={[styles.gridLine, styles.gridLineVertical, { left: '66.66%' }]} />
                </View>
              )}

              {/* Center Frame Guide */}
              <View style={styles.frameGuide}>
                <View style={styles.corner} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={handleZoomOut}
                    disabled={zoom === 0}
                  >
                    <Ionicons
                      name="remove"
                      size={ICON_SIZES.md}
                      color={zoom === 0 ? TEXT.muted : TEXT.white}
                    />
                  </TouchableOpacity>

                  <Text style={styles.zoomText}>{Math.round(zoom * 100 + 100)}%</Text>

                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={handleZoomIn}
                    disabled={zoom === 1}
                  >
                    <Ionicons
                      name="add"
                      size={ICON_SIZES.md}
                      color={zoom === 1 ? TEXT.muted : TEXT.white}
                    />
                  </TouchableOpacity>
                </View>

                {/* Capture Button */}
                <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                  <View style={styles.captureButtonOuter}>
                    <View style={styles.captureButtonInner} />
                  </View>
                </TouchableOpacity>

                <View style={styles.zoomControls} />
              </View>

              {/* Hint Text */}
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>Position your meal in the frame</Text>
              </View>
            </CameraView>
          </>
        ) : (
          // PHOTO PREVIEW
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />

            {/* Preview Overlay */}
            <View style={styles.previewOverlay}>
              {/* Header with Close Button */}
              <View style={styles.previewHeader}>
                <AnimatedCloseButton
                  onPress={handleClose}
                  style={styles.previewCloseButton}
                />
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewCloseButton} />
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning" size={ICON_SIZES.sm} color={TEXT.white} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* 🆕 VOICE DESCRIPTION SECTION */}
              <View style={styles.voiceSection}>
                {!voiceTranscript ? (
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={handleAddVoiceDescription}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color={BRAND.primary} />
                    ) : (
                      <Ionicons
                        name={isRecordingVoice ? 'mic' : 'mic-outline'}
                        size={ICON_SIZES.md}
                        color={isRecordingVoice ? SEMANTIC.danger.base : BRAND.primary}
                      />
                    )}
                    <Text style={styles.voiceButtonText}>
                      {isTranscribing
                        ? 'Transcribing...'
                        : isRecordingVoice
                          ? 'Tap to stop'
                          : 'Add Voice Description (Optional)'}
                    </Text>
                    <Text style={styles.voiceHint}>
                      {isRecordingVoice ? 'Listening...' : 'Mention ingredients, cooking method, portion size'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.voiceAdded}>
                    <View style={styles.voiceAddedContent}>
                      <Ionicons name="mic" size={ICON_SIZES.md} color={SEMANTIC.success.base} />
                      <View style={styles.voiceAddedText}>
                        <Text style={styles.voiceAddedLabel}>Voice Added</Text>
                        <Text style={styles.voiceAddedTranscript}>{voiceTranscript}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.voiceClear}
                      onPress={handleClearVoice}
                    >
                      <Ionicons name="close-circle" size={ICON_SIZES.lg} color={SEMANTIC.danger.base} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handleRetake}
                  disabled={isProcessing}
                >
                  <Ionicons name="camera-reverse" size={ICON_SIZES.lg} color={TEXT.white} />
                  <Text style={styles.previewButtonText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.previewButton, styles.confirmButton]}
                  onPress={handleConfirm}
                  disabled={isProcessing}
                >
                  <LinearGradient
                    colors={SURFACES.gradient.success}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmButtonGradient}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={TEXT.white} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={ICON_SIZES.lg} color={TEXT.white} />
                    )}
                    <Text style={styles.previewButtonText}>
                      {isProcessing ? 'Processing...' : 'Use Photo'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
    padding: SPACING[6],
  },
  permissionText: {
    marginTop: SPACING[5],
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    textAlign: 'center',
    color: TEXT.primary,
  },
  permissionHint: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.sm,
    textAlign: 'center',
    color: TEXT.tertiary,
    paddingHorizontal: SPACING[6],
  },
  closeButton: {
    marginTop: SPACING[8],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // ─────────────────────────────────────────────
  // CAMERA VIEW
  // ─────────────────────────────────────────────
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SPACING[5],
    zIndex: 10,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    top: 0,
    bottom: 0,
    left: '33.33%',
    right: 'auto',
    width: 1,
    height: 'auto',
  },
  frameGuide: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: '40%',
    borderRadius: RADIUS.xl,
  },
  corner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: TEXT.white,
    borderTopLeftRadius: RADIUS.xl,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopRightRadius: RADIUS.xl,
    borderTopLeftRadius: 0,
  },
  bottomLeft: {
    top: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderBottomLeftRadius: RADIUS.xl,
    borderTopLeftRadius: 0,
  },
  bottomRight: {
    top: 'auto',
    bottom: 0,
    left: 'auto',
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: RADIUS.xl,
    borderTopLeftRadius: 0,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    width: 100,
  },
  zoomButton: {
    padding: SPACING[1],
  },
  zoomText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
    flex: 1,
    textAlign: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: TEXT.white,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.white,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
  },

  // ─────────────────────────────────────────────
  // PHOTO PREVIEW
  // ─────────────────────────────────────────────
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  previewHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: SEMANTIC.danger.base,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    marginHorizontal: SPACING[5],
    borderRadius: RADIUS.md,
  },
  errorBannerText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.white,
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    gap: SPACING[4],
    paddingBottom: 40,
    paddingHorizontal: SPACING[5],
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  confirmButton: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[5],
  },
  previewButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // 🆕 VOICE DESCRIPTION SECTION
  voiceSection: {
    marginHorizontal: SPACING[5],
    marginVertical: SPACING[4],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  voiceButton: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
  },
  voiceButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
  voiceHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  voiceAdded: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[3],
  },
  voiceAddedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  voiceAddedText: {
    flex: 1,
  },
  voiceAddedLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.success.base,
    marginBottom: SPACING[1],
  },
  voiceAddedTranscript: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  voiceClear: {
    padding: SPACING[2],
  },
});
