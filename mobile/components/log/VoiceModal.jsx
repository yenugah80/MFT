/**
 * VoiceModal Component
 * Modal for voice recording with live waveform visualization
 * States: idle → listening → processing → success/error
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WAVEFORM_BARS = 30;

/**
 * Animated waveform visualizer
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
 * Main VoiceModal Component
 */
export function VoiceModal({
  visible,
  onClose,
  onComplete,
  voiceHook, // useLiveVoice hook instance
}) {
  const {
    isRecording,
    isProcessing,
    volume,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  } = voiceHook;

  const [state, setState] = useState('idle'); // idle | listening | processing | success | error

  // Sync state with hook
  useEffect(() => {
    if (isRecording) {
      setState('listening');
    } else if (isProcessing) {
      setState('processing');
    } else if (error) {
      setState('error');
    } else if (!visible) {
      setState('idle');
    }
  }, [isRecording, isProcessing, error, visible]);

  const handleStart = async () => {
    clearError();
    await startRecording();
  };

  const handleStop = async () => {
    try {
      const result = await stopRecording();
      setState('success');

      // Delay to show success state, then close and return result
      setTimeout(() => {
        onComplete(result);
        handleClose();
      }, 800);
    } catch (err) {
      console.error('[VoiceModal] Stop failed:', err);
      setState('error');
    }
  };

  const handleCancel = async () => {
    await cancelRecording();
    handleClose();
  };

  const handleClose = () => {
    clearError();
    setState('idle');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Voice Logging</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content based on state */}
          <View style={styles.content}>
            {state === 'idle' && (
              <>
                <Text style={styles.instruction}>
                  Tap the microphone to start recording your meal description
                </Text>
                <TouchableOpacity style={styles.micButton} onPress={handleStart}>
                  <Text style={styles.micIcon}>🎤</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>
                  Say something like: "I had a grilled chicken salad with olive oil"
                </Text>
              </>
            )}

            {state === 'listening' && (
              <>
                <Text style={styles.statusText}>Listening...</Text>

                <WaveformVisualizer volume={volume} isActive={true} />

                <Text style={styles.durationText}>{formatDuration(duration)}</Text>

                <View style={styles.recordingActions}>
                  <TouchableOpacity style={styles.cancelRecButton} onPress={handleCancel}>
                    <Text style={styles.cancelRecButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                    <Text style={styles.stopIcon}>⏹</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {state === 'processing' && (
              <>
                <Text style={styles.statusText}>Processing...</Text>
                <View style={styles.processingIndicator}>
                  <Text style={styles.processingIcon}>🔄</Text>
                </View>
                <Text style={styles.hint}>
                  Transcribing and analyzing your meal...
                </Text>
              </>
            )}

            {state === 'success' && (
              <>
                <Text style={styles.statusText}>Success!</Text>
                <View style={styles.successIndicator}>
                  <Text style={styles.successIcon}>✅</Text>
                </View>
                <Text style={styles.hint}>
                  Food log created successfully
                </Text>
              </>
            )}

            {state === 'error' && (
              <>
                <Text style={styles.statusText}>Error</Text>
                <View style={styles.errorIndicator}>
                  <Text style={styles.errorIcon}>❌</Text>
                </View>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleStart}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: Math.min(SCREEN_WIDTH - 40, 400),
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6B4EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micIcon: {
    fontSize: 48,
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 3,
    marginVertical: 24,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#6B4EFF',
    borderRadius: 2,
  },
  durationText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 24,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelRecButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelRecButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    fontSize: 32,
  },
  processingIndicator: {
    marginVertical: 24,
  },
  processingIcon: {
    fontSize: 64,
  },
  successIndicator: {
    marginVertical: 24,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIndicator: {
    marginVertical: 24,
  },
  errorIcon: {
    fontSize: 64,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6B4EFF',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
