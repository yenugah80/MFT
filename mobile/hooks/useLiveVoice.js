/**
 * useLiveVoice Hook
 * Production-ready voice recording with permissions, metering, and backend transcription
 * Expo AV compliant (FIXED recording options shape)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '@clerk/clerk-expo';
import * as FileSystem from 'expo-file-system';

import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

/**
 * ⚠️ IMPORTANT
 * Expo requires the FULL object (android + ios),
 * NOT platform-specific slices.
 */
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
          'Microphone Permission Required',
          'Enable microphone access to use voice logging.'
        );
        setHasPermission(false);
        return false;
      }

      const interruptionIOS = Audio.InterruptionModeIOS
        ? Audio.InterruptionModeIOS.DoNotMix
        : Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX;
      const interruptionAndroid = Audio.InterruptionModeAndroid
        ? Audio.InterruptionModeAndroid.DoNotMix
        : Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: interruptionIOS,
        interruptionModeAndroid: interruptionAndroid,
        shouldDuckAndroid: true,
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
  // Metering (volume)
  // ─────────────────────────────────────────────
  const startMetering = useCallback((recording) => {
    clearInterval(meteringIntervalRef.current);

    meteringIntervalRef.current = setInterval(async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording && typeof status.metering === 'number') {
          const normalized = Math.max(0, Math.min(1, (status.metering + 160) / 160));
          setVolume(normalized);
        }
      } catch {
        // silent
      }
    }, 100);
  }, []);

  // ─────────────────────────────────────────────
  // Duration
  // ─────────────────────────────────────────────
  const startDurationTracking = useCallback(() => {
    const start = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setDuration(Date.now() - start);
    }, 100);
  }, []);

  const stopIntervals = useCallback(() => {
    clearInterval(meteringIntervalRef.current);
    clearInterval(durationIntervalRef.current);
    meteringIntervalRef.current = null;
    durationIntervalRef.current = null;
    setVolume(0);
    setDuration(0);
  }, []);

  // ─────────────────────────────────────────────
  // Start Recording (FIXED)
  // ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      if (hasPermission !== true) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS, // ✅ MUST PASS FULL OBJECT
        () => {},
        100
      );

      recordingRef.current = recording;
      setIsRecording(true);

      startMetering(recording);
      startDurationTracking();
    } catch (err) {
      console.error('[useLiveVoice] Start failed:', err);
      setError('Failed to start recording');
      setIsRecording(false);
      stopIntervals();
    }
  }, [
    hasPermission,
    requestPermissions,
    startMetering,
    startDurationTracking,
    stopIntervals,
  ]);

  // ─────────────────────────────────────────────
  // Stop Recording + Upload
  // ─────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      throw new Error('No active recording');
    }

    try {
      stopIntervals();
      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('Recording failed');

      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: `voice-log-${Date.now()}.m4a`,
      });

      const response = await fetch(`${API_URL}/nutrition/voice-log`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Voice analysis failed');
      }

      const data = await response.json();

      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (detectAggregatedData(data).isAggregated) {
        console.warn('[useLiveVoice] Aggregated AI output detected');
      }

      const normalized = normalizeNutritionData(data);

      return {
        timestamp: Date.now(),
        source: 'voice',
        foodName: data.foodName || 'Voice logged food',
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
      };
    } finally {
      setIsProcessing(false);
    }
  }, [getToken, stopIntervals]);

  // ─────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────
  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        stopIntervals();
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
        setIsRecording(false);
      }
    } catch {
      // noop
    }
  }, [stopIntervals]);

  // ─────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopIntervals();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, [stopIntervals]);

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
