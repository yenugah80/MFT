/**
 * useLiveVoice Hook
 * Production-ready voice recording with permissions, volume detection, and backend transcription
 * Record-then-upload approach for reliability (not WebSocket streaming)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';
import * as FileSystem from 'expo-file-system';

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
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

/**
 * Hook for live voice recording and analysis
 */
export function useLiveVoice() {
  const { getToken } = useAuth();

  // State management
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [volume, setVolume] = useState(0); // 0-1 for waveform visualization
  const [duration, setDuration] = useState(0); // Recording duration in ms
  const [error, setError] = useState(null);

  // Refs
  const recordingRef = useRef(null);
  const meteringIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);

  /**
   * Request microphone permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      console.log('[useLiveVoice] Requesting audio permissions...');

      const { status } = await Audio.requestPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        console.log('[useLiveVoice] ✅ Permission granted');

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        return true;
      } else {
        setHasPermission(false);
        console.warn('[useLiveVoice] ⚠️ Permission denied');
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in your device settings to use voice logging.'
        );
        return false;
      }
    } catch (err) {
      console.error('[useLiveVoice] Permission error:', err);
      setError('Failed to request microphone permission');
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Start metering (volume monitoring)
   */
  const startMetering = useCallback((recording) => {
    // Clear any existing interval
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
    }

    // Update volume every 100ms
    meteringIntervalRef.current = setInterval(async () => {
      if (recording) {
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Normalize metering value (-160 to 0 dB) to 0-1 range
            const normalized = Math.max(0, Math.min(1, (status.metering + 160) / 160));
            setVolume(normalized);
          }
        } catch (err) {
          console.error('[useLiveVoice] Metering error:', err);
        }
      }
    }, 100);
  }, []);

  /**
   * Start duration tracking
   */
  const startDurationTracking = useCallback(() => {
    const startTime = Date.now();

    durationIntervalRef.current = setInterval(() => {
      setDuration(Date.now() - startTime);
    }, 100);
  }, []);

  /**
   * Stop all intervals
   */
  const stopIntervals = useCallback(() => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setVolume(0);
    setDuration(0);
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check permissions first
      if (hasPermission === null) {
        const granted = await requestPermissions();
        if (!granted) return;
      } else if (hasPermission === false) {
        await requestPermissions();
        return;
      }

      console.log('[useLiveVoice] Starting recording...');

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS[Platform.OS] || RECORDING_OPTIONS.ios,
        (status) => {
          // Optional: status updates callback
        },
        100 // Update interval for metering
      );

      recordingRef.current = recording;
      setIsRecording(true);

      // Start monitoring
      startMetering(recording);
      startDurationTracking();

      console.log('[useLiveVoice] ✅ Recording started');
    } catch (err) {
      console.error('[useLiveVoice] Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
      stopIntervals();
    }
  }, [hasPermission, requestPermissions, startMetering, startDurationTracking, stopIntervals]);

  /**
   * Stop recording and process audio
   * @returns {Promise<FoodLog>} Analyzed food log
   */
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      throw new Error('No active recording');
    }

    try {
      console.log('[useLiveVoice] Stopping recording...');

      stopIntervals();
      setIsRecording(false);
      setIsProcessing(true);

      // Stop and unload recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Recording failed - no audio file generated');
      }

      console.log('[useLiveVoice] ✅ Recording saved:', uri);
      console.log('[useLiveVoice] Uploading for transcription...');

      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Create FormData for file upload
      const formData = new FormData();

      // Append audio file
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: `voice-log-${Date.now()}.m4a`,
      });

      // Upload to backend for transcription + analysis
      const response = await fetch(`${API_URL}/nutrition/voice-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Voice analysis failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useLiveVoice] ✅ Analysis complete:', data);

      // Cleanup audio file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (cleanupErr) {
        console.warn('[useLiveVoice] Failed to cleanup audio file:', cleanupErr);
      }

      // Detect if data looks pre-aggregated
      const aggregationCheck = detectAggregatedData(data);
      if (aggregationCheck.isAggregated) {
        console.warn('[useLiveVoice] AI returned aggregated data:', aggregationCheck.suggestion);
      }

      // Normalize nutrition data (converts strings to numbers, applies sanity bounds)
      const normalized = normalizeNutritionData(data);

      // Transform to canonical FoodLog format
      const foodLog = {
        timestamp: Date.now(),
        source: 'voice',
        status: 'pending',
        foodName: data.foodName || data.name || 'Voice logged food',
        cookingMethod: data.cookingMethod,
        servingSize: data.servingSize || '1 serving',

        // Use normalized macros
        calories: normalized.calories,
        protein: normalized.protein,
        carbs: normalized.carbs,
        fat: normalized.fat,
        fiber: normalized.fiber,
        sugar: normalized.sugar,
        sugarAlcohols: normalized.sugarAlcohols,
        netCarbs: calculateNetCarbs(normalized),

        // Use normalized micros (numeric only)
        micronutrients: normalized.micronutrients,
        micros: normalized.micros,

        ingredients: data.ingredients || [],
        healthScore: data.healthScore || 0,
        nutriscore: data.nutriscore,
        ecoscore: data.ecoscore,
        novaScore: data.novaScore,
        dietLabels: data.dietLabels || [],
        allergens: data.allergens || [],
      };

      return foodLog;
    } catch (err) {
      console.error('[useLiveVoice] Processing failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [getToken, stopIntervals]);

  /**
   * Cancel recording without processing
   */
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        console.log('[useLiveVoice] Cancelling recording...');

        stopIntervals();

        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        // Cleanup audio file
        if (uri) {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (cleanupErr) {
            console.warn('[useLiveVoice] Failed to cleanup audio file:', cleanupErr);
          }
        }

        setIsRecording(false);
        setError(null);
        console.log('[useLiveVoice] ✅ Recording cancelled');
      }
    } catch (err) {
      console.error('[useLiveVoice] Cancel error:', err);
      setIsRecording(false);
    }
  }, [stopIntervals]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopIntervals();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, [stopIntervals]);

  return {
    // State
    hasPermission,
    isRecording,
    isProcessing,
    volume, // 0-1 for waveform visualization
    duration, // in milliseconds
    error,

    // Actions
    requestPermissions,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  };
}
