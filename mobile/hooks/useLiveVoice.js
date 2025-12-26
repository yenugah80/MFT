/**
 * ============================================================================
 * useLiveVoice Hook - PRODUCTION GRADE
 * ============================================================================
 * Professional voice recording with GPT-4o transcription and nutrition analysis
 *
 * Architecture:
 * - High-quality audio capture (44.1kHz, AAC, 128kbps)
 * - Whisper API for speech-to-text transcription
 * - GPT-4o for nutrition extraction from transcript
 * - Retry logic with exponential backoff
 * - Audio quality validation before upload
 * - Network timeout handling
 *
 * Flow:
 * 1. Record audio → 2. Validate quality → 3. Upload to backend
 * 4. Whisper transcribes → 5. GPT-4o analyzes → 6. Return nutrition data
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '@clerk/clerk-expo';
import * as FileSystem from 'expo-file-system';

import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Optimal audio settings for Whisper API */
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,      // 44.1kHz - industry standard
    numberOfChannels: 1,    // Mono - sufficient for speech, smaller file
    bitRate: 128000,        // 128kbps - optimal for speech quality
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/** Minimum recording duration (ms) */
const MIN_RECORDING_DURATION_MS = 500;

/** Maximum recording duration (ms) - exported for use in VoiceModal */
export const MAX_RECORDING_DURATION_MS = 60000;

/** Minimum audio file size (bytes) - prevents corrupt/silent recordings */
const MIN_AUDIO_FILE_SIZE_BYTES = 5000;

/** Maximum audio file size (bytes) - 5MB limit */
const MAX_AUDIO_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Network request timeout (ms) */
const NETWORK_TIMEOUT_MS = 30000;

/** Maximum retry attempts for network errors */
const MAX_RETRY_ATTEMPTS = 2;

/** Initial retry delay (ms) */
const INITIAL_RETRY_DELAY_MS = 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate audio file quality before upload
 * @param {string} uri - Audio file URI
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function validateAudioQuality(uri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });

    if (!fileInfo.exists) {
      return { valid: false, reason: 'Recording file not found' };
    }

    const fileSizeBytes = fileInfo.size;

    // Check minimum size (prevents corrupt/silent recordings)
    if (fileSizeBytes < MIN_AUDIO_FILE_SIZE_BYTES) {
      return { valid: false, reason: 'Recording too short or silent. Please try again.' };
    }

    // Check maximum size
    if (fileSizeBytes > MAX_AUDIO_FILE_SIZE_BYTES) {
      return { valid: false, reason: 'Recording too large. Please keep under 60 seconds.' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[useLiveVoice] Audio validation failed:', error);
    return { valid: true }; // Assume valid if validation fails
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create fetch with timeout
 */
async function fetchWithTimeout(url, options, timeout = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useLiveVoice() {
  const { getToken } = useAuth();

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────
  const recordingRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const meteringIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // ─────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────
  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in settings to use voice logging.'
        );
        setHasPermission(false);
        return false;
      }

      // Configure audio session for optimal recording
      // Expo AV v16+ simplified API - removed deprecated interruptionMode properties
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      setHasPermission(true);
      return true;
    } catch (err) {
      console.error('[useLiveVoice] Permission error:', err);
      setError('Failed to access microphone');
      setHasPermission(false);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────
  // Metering (volume visualization)
  // ─────────────────────────────────────────────
  const startMetering = useCallback((recording) => {
    clearInterval(meteringIntervalRef.current);

    meteringIntervalRef.current = setInterval(async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording && typeof status.metering === 'number') {
          // Normalize metering value from dB (-160 to 0) to 0-1 scale
          const normalized = Math.max(0, Math.min(1, (status.metering + 160) / 160));
          setVolume(normalized);
        }
      } catch {
        // Ignore metering errors
      }
    }, 100);
  }, []);

  // ─────────────────────────────────────────────
  // Duration tracking
  // ─────────────────────────────────────────────
  const startDurationTracking = useCallback(() => {
    recordingStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setDuration(Date.now() - recordingStartTimeRef.current);
    }, 100);
  }, []);

  const stopIntervals = useCallback(() => {
    clearInterval(meteringIntervalRef.current);
    clearInterval(durationIntervalRef.current);
    meteringIntervalRef.current = null;
    durationIntervalRef.current = null;
    recordingStartTimeRef.current = null;
    setVolume(0);
    setDuration(0);
  }, []);

  // ─────────────────────────────────────────────
  // Start Recording
  // ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request permissions if needed
      if (hasPermission !== true) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      // Create recording with optimal settings
      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        undefined, // Status update callback (not needed)
        100        // Metering interval (ms)
      );

      recordingRef.current = recording;
      setIsRecording(true);

      startMetering(recording);
      startDurationTracking();

      console.log('[useLiveVoice] Recording started');
    } catch (err) {
      console.error('[useLiveVoice] Start recording failed:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
      stopIntervals();
    }
  }, [hasPermission, requestPermissions, startMetering, startDurationTracking, stopIntervals]);

  // ─────────────────────────────────────────────
  // Stop Recording + Upload with Retry
  // ─────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      throw new Error('No active recording');
    }

    try {
      stopIntervals();
      setIsRecording(false);
      setIsProcessing(true);

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Recording failed to save');
      }

      console.log(`[useLiveVoice] Recording stopped. Duration: ${recordingDuration}ms`);

      // Validate recording duration
      if (recordingDuration < MIN_RECORDING_DURATION_MS) {
        throw new Error('Recording too short. Please speak for at least 1 second.');
      }

      // Validate audio quality
      const validation = await validateAudioQuality(uri);
      if (!validation.valid) {
        await FileSystem.deleteAsync(uri);
        throw new Error(validation.reason);
      }

      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: `voice-${Date.now()}.m4a`,
      });

      console.log('[useLiveVoice] Uploading to backend for transcription and analysis...');

      // Upload with retry logic (using new gpt-4o-transcribe endpoint)
      let lastError = null;
      for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await fetchWithTimeout(
            `${API_URL}/food/analyze-voice`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                // Note: Don't set Content-Type for FormData - browser sets it with boundary
              },
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }

          const data = await response.json();
          console.log('[useLiveVoice] ✅ Voice analysis successful');

          // Clean up audio file
          await FileSystem.deleteAsync(uri);

          // Validate response data
          if (!data.foodName && !data.transcript) {
            throw new Error('Could not understand the recording. Please try again.');
          }

          // Detect if AI returned aggregated data (anti-pattern)
          if (detectAggregatedData(data).isAggregated) {
            console.warn('[useLiveVoice] ⚠️ Aggregated data detected from backend');
          }

          // Normalize nutrition data
          const normalized = normalizeNutritionData(data);

          // Return structured result
          return {
            timestamp: Date.now(),
            source: 'voice',
            transcript: data.transcript || data.foodName || 'Voice input',
            foodName: data.foodName || data.transcript || 'Voice logged food',
            servingSize: data.servingSize || '1 serving',
            calories: normalized.calories,
            protein: normalized.protein,
            carbs: normalized.carbs,
            fat: normalized.fat,
            fiber: normalized.fiber,
            sugar: normalized.sugar,
            netCarbs: calculateNetCarbs(normalized),
            ingredients: data.ingredients || [],
            confidence: data.confidence ?? 0.7,
            model: data.model || 'gpt-4o', // Track which model was used
          };
        } catch (err) {
          lastError = err;

          // Don't retry on client errors (4xx)
          if (err.message.includes('400') || err.message.includes('401') || err.message.includes('403')) {
            throw err;
          }

          // Retry on network/server errors
          if (attempt < MAX_RETRY_ATTEMPTS) {
            const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
            console.log(`[useLiveVoice] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }

      // All retries failed
      throw lastError || new Error('Upload failed after multiple attempts');

    } catch (err) {
      console.error('[useLiveVoice] Stop recording error:', err);
      setError(err.message || 'Voice analysis failed');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [getToken, stopIntervals]);

  // ─────────────────────────────────────────────
  // Cancel Recording
  // ─────────────────────────────────────────────
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        stopIntervals();
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        // Delete recording file
        if (uri) {
          await FileSystem.deleteAsync(uri);
        }

        setIsRecording(false);
        console.log('[useLiveVoice] Recording cancelled');
      }
    } catch (err) {
      console.error('[useLiveVoice] Cancel recording error:', err);
    }
  }, [stopIntervals]);

  // ─────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopIntervals();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [stopIntervals]);

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────
  return {
    hasPermission,
    isRecording,
    isProcessing,
    volume,
    duration,
    error,
    requestPermissions,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setError(null),
  };
}
