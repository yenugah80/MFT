import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Assuming fonts are defined globally or passed as props
const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

export function VoiceModal({ visible, onClose, onComplete, voiceHook }) {
  const pulseAnim = useRef(new Animated.Value(0)).current; // For pulsing effect

  // Pulsing animation effect for microphone
  useEffect(() => {
    if (visible && voiceHook.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800, // Faster pulse for mic
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0); // Reset opacity when not recording
    }
  }, [visible, voiceHook.isRecording, pulseAnim]);

  const handleStartRecording = async () => {
    try {
      await voiceHook.startRecording();
    } catch (error) {
      console.error('[VoiceModal] Error starting recording:', error);
      // Optionally show a notification
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await voiceHook.stopRecording();
      if (result) {
        onComplete(result); // Pass the transcribed text or analysis result
      }
    } catch (error) {
      console.error('[VoiceModal] Error stopping recording:', error);
      // Optionally show a notification
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Log Meal</Text>
        </View>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.micButtonContainer,
              voiceHook.isRecording && {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
                transform: [{
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1], // Slight scale effect
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.micButton}
              onPress={voiceHook.isRecording ? handleStopRecording : handleStartRecording}
              disabled={voiceHook.isAnalyzing}
            >
              {voiceHook.isAnalyzing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <Ionicons name="mic" size={64} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>

          {voiceHook.isRecording && (
            <Text style={styles.recordingStatus}>Recording... Tap to stop</Text>
          )}
          {voiceHook.isAnalyzing && (
            <Text style={styles.recordingStatus}>Analyzing voice input...</Text>
          )}
          {!voiceHook.isRecording && !voiceHook.isAnalyzing && (
            <Text style={styles.recordingStatus}>Tap microphone to start recording</Text>
          )}

          {voiceHook.transcribedText && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>Transcription:</Text>
              <Text style={styles.transcribedText}>{voiceHook.transcribedText}</Text>
            </View>
          )}

          {voiceHook.error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{voiceHook.error}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937', // Dark background for voice modal
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#2D3748',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  micButtonContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6B4EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B6EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingStatus: {
    fontSize: 18,
    color: '#E0E7FF',
    marginBottom: 20,
    fontFamily: fonts.strong,
  },
  transcriptionContainer: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginTop: 20,
  },
  transcriptionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 5,
    fontFamily: fonts.regular,
  },
  transcribedText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: fonts.regular,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    padding: 10,
    marginTop: 20,
  },
  errorText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontFamily: fonts.regular,
  },
});